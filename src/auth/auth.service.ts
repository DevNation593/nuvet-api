import {
    Injectable,
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppPermission, TenantPlan, UserRole, getEffectivePermissions } from '@nuvet/types';
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async register(_dto: RegisterDto) {
        throw new ForbiddenException(
            'El registro público está deshabilitado. Solicita tus credenciales al administrador.',
        );
    }

    async login(dto: LoginDto) {
        const where: { email: string; isActive: boolean } = {
            email: dto.email.toLowerCase(),
            isActive: true,
        };
        const user = await this.prisma.user.findFirst({
            where,
            include: { tenant: true },
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        if (!user.tenant.isActive) {
            throw new UnauthorizedException('Tenant account is suspended');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const activeSessions = await this.prisma.refreshToken.count({ where: { userId: user.id } });
        const typedRole = this.toUserRole(user.role);
        const typedPlan = this.toTenantPlan(user.tenant.plan);
        const permissions =
            typedRole && typedPlan
                ? this.getEffectivePermissionsForUser(typedRole, typedPlan)
                : [];
        const tokens = await this.generateTokens(
            user.id,
            user.tenantId,
            user.role,
            user.email,
            (typedPlan ?? TenantPlan.FREE),
            permissions,
        );

        return {
            user: this.sanitizeUser(user),
            tenant: user.tenant,
            recommendPasswordChange: activeSessions === 0,
            ...tokens,
        };
    }

    async refreshToken(dto: RefreshTokenDto) {
        const stored = await this.prisma.refreshToken.findUnique({
            where: { token: dto.refreshToken },
            include: { user: { include: { tenant: true } } },
        });

        if (!stored || stored.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        // Rotate token: delete old, create new
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });

        const typedRole = this.toUserRole(stored.user.role);
        const typedPlan = this.toTenantPlan(stored.user.tenant.plan);
        const tokens = await this.generateTokens(
            stored.user.id,
            stored.user.tenantId,
            stored.user.role,
            stored.user.email,
            (typedPlan ?? TenantPlan.FREE),
            typedRole && typedPlan
                ? this.getEffectivePermissionsForUser(typedRole, typedPlan)
                : [],
        );

        return { user: this.sanitizeUser(stored.user), ...tokens };
    }

    async logout(userId: string, refreshToken?: string) {
        if (refreshToken) {
            await this.prisma.refreshToken.deleteMany({
                where: { userId, token: refreshToken },
            });
        } else {
            // Invalidate all sessions
            await this.prisma.refreshToken.deleteMany({ where: { userId } });
        }
        return { message: 'Logged out successfully' };
    }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { tenant: { select: { id: true, name: true, slug: true, plan: true, logoUrl: true } } },
        });
        if (!user) throw new NotFoundException('User not found');
        return this.sanitizeUser(user);
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const existing = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!existing) throw new NotFoundException('User not found');

        const updated = await this.prisma.user.update({
            where: { id: userId },
            data: {
                firstName: dto.firstName ?? existing.firstName,
                lastName: dto.lastName ?? existing.lastName,
                phone: dto.phone ?? existing.phone,
            },
            include: { tenant: { select: { id: true, name: true, slug: true, plan: true, logoUrl: true } } },
        });

        return this.sanitizeUser(updated);
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!isCurrentValid) {
            throw new BadRequestException('La contraseña actual es incorrecta');
        }
        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException('La nueva contraseña debe ser diferente');
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: userId },
                data: { passwordHash },
            });
            await tx.refreshToken.deleteMany({ where: { userId } });
        });

        return { message: 'Contraseña actualizada. Inicia sesión nuevamente.' };
    }

    private async generateTokens(
        userId: string,
        tenantId: string,
        role: string,
        email: string,
        tenantPlan: TenantPlan,
        permissions: AppPermission[],
    ) {
        const payload = { sub: userId, tenantId, role, tenantPlan, permissions, email };

        const accessToken = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('jwt.accessSecret'),
            expiresIn: this.configService.get<string>('jwt.accessExpiresIn', '15m') as JwtSignOptions['expiresIn'],
        });

        const refreshTokenValue = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: refreshTokenValue,
                expiresAt,
            },
        });

        return { accessToken, refreshToken: refreshTokenValue };
    }

    private sanitizeUser(user: Record<string, unknown>) {
        const { passwordHash, ...rest } = user;
        const role = this.toUserRole(rest.role);
        const plan = this.toTenantPlan(
            (rest as { tenant?: { plan?: unknown }; tenantPlan?: unknown }).tenant?.plan ??
            (rest as { tenant?: { plan?: unknown }; tenantPlan?: unknown }).tenantPlan,
        );
        const permissions: AppPermission[] =
            role && plan ? this.getEffectivePermissionsForUser(role, plan) : [];
        return { ...rest, permissions };
    }

    private getEffectivePermissionsForUser(role: UserRole, plan: TenantPlan): AppPermission[] {
        return getEffectivePermissions(role, plan);
    }

    private toUserRole(role: unknown): UserRole | null {
        if (typeof role !== 'string') return null;
        return Object.values(UserRole).includes(role as UserRole)
            ? (role as UserRole)
            : null;
    }

    private toTenantPlan(plan: unknown): TenantPlan | null {
        if (typeof plan !== 'string') return null;
        return Object.values(TenantPlan).includes(plan as TenantPlan)
            ? (plan as TenantPlan)
            : null;
    }
}

