import {
    Injectable,
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AppPermission, TenantPlan, UserRole, getEffectivePermissions } from '@nuvet/types';
import { ChangePasswordDto, LoginDto, RefreshTokenDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';

@Injectable()
export class AuthService {
    constructor(
        @Inject(AUTH_REPOSITORY)
        private readonly authRepo: IAuthRepository,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {}

    async register(_dto: RegisterDto) {
        throw new ForbiddenException(
            'El registro publico esta deshabilitado. Solicita tus credenciales al administrador.',
        );
    }

    async login(dto: LoginDto) {
        const normalizedEmail = dto.email.trim().toLowerCase();
        const normalizedTenantSlug = dto.tenantSlug?.trim().toLowerCase() || undefined;
        const users = await this.authRepo.findUsersByEmailActive(
            normalizedEmail,
            normalizedTenantSlug,
        );

        if (users.length === 0) {
            throw new UnauthorizedException('Invalid credentials');
        }

        let user = users[0];
        let isPasswordValid = false;

        if (users.length > 1 && !normalizedTenantSlug) {
            const matchingUsers: typeof users = [];
            for (const candidate of users) {
                const isCandidateMatch = await bcrypt.compare(dto.password, candidate.passwordHash);
                if (isCandidateMatch) matchingUsers.push(candidate);
            }

            if (matchingUsers.length === 0) {
                throw new UnauthorizedException('Invalid credentials');
            }

            if (matchingUsers.length > 1) {
                throw new BadRequestException(
                    'Multiple accounts match these credentials. Include tenantSlug in login payload.',
                );
            }

            user = matchingUsers[0];
            isPasswordValid = true;
        }

        if (!user.tenant.isActive) {
            throw new UnauthorizedException('Tenant account is suspended');
        }

        if (!isPasswordValid) {
            isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        }
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const activeSessions = await this.authRepo.countUserRefreshTokens(user.id);
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
            typedPlan ?? TenantPlan.FREE,
            permissions,
        );

        return {
            user: this.sanitizeUser(user as unknown as Record<string, unknown>),
            tenant: user.tenant,
            recommendPasswordChange: activeSessions === 0,
            ...tokens,
        };
    }

    async refreshToken(dto: RefreshTokenDto) {
        const stored = await this.authRepo.findRefreshToken(dto.refreshToken);

        if (!stored || stored.expiresAt < new Date()) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        await this.authRepo.deleteRefreshToken(stored.id);

        const typedRole = this.toUserRole(stored.user.role);
        const typedPlan = this.toTenantPlan(stored.user.tenant.plan);
        const tokens = await this.generateTokens(
            stored.user.id,
            stored.user.tenantId,
            stored.user.role,
            stored.user.email,
            typedPlan ?? TenantPlan.FREE,
            typedRole && typedPlan
                ? this.getEffectivePermissionsForUser(typedRole, typedPlan)
                : [],
        );

        return {
            user: this.sanitizeUser(stored.user as unknown as Record<string, unknown>),
            ...tokens,
        };
    }

    async logout(userId: string, refreshToken?: string) {
        await this.authRepo.deleteUserRefreshTokens(userId, refreshToken);
        return { message: 'Logged out successfully' };
    }

    async getProfile(userId: string) {
        const user = await this.authRepo.findUserByIdWithTenant(userId);
        if (!user) throw new NotFoundException('User not found');
        return this.sanitizeUser(user as unknown as Record<string, unknown>);
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        const existing = await this.authRepo.findUserById(userId);
        if (!existing) throw new NotFoundException('User not found');

        const updated = await this.authRepo.updateUser(userId, {
            firstName: dto.firstName ?? existing.firstName,
            lastName: dto.lastName ?? existing.lastName,
            phone: dto.phone ?? (existing as any).phone,
        });

        return this.sanitizeUser(updated as unknown as Record<string, unknown>);
    }

    async changePassword(userId: string, dto: ChangePasswordDto) {
        const user = await this.authRepo.findUserById(userId);
        if (!user) throw new NotFoundException('User not found');

        const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
        if (!isCurrentValid) {
            throw new BadRequestException('La contrasena actual es incorrecta');
        }
        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException('La nueva contrasena debe ser diferente');
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.authRepo.changePasswordAndInvalidateSessions(userId, passwordHash);

        return { message: 'Contrasena actualizada. Inicia sesion nuevamente.' };
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
            expiresIn: this.configService.get<string>(
                'jwt.accessExpiresIn',
                '15m',
            ) as JwtSignOptions['expiresIn'],
        });

        const refreshTokenValue = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await this.authRepo.createRefreshToken({
            userId,
            token: refreshTokenValue,
            expiresAt,
        });

        return { accessToken, refreshToken: refreshTokenValue };
    }

    private sanitizeUser(user: Record<string, unknown>) {
        const { passwordHash, ...rest } = user;
        void passwordHash;
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
        return Object.values(UserRole).includes(role as UserRole) ? (role as UserRole) : null;
    }

    private toTenantPlan(plan: unknown): TenantPlan | null {
        if (typeof plan !== 'string') return null;
        return Object.values(TenantPlan).includes(plan as TenantPlan) ? (plan as TenantPlan) : null;
    }
}
