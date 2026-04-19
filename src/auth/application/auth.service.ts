import {
    Injectable,
    ForbiddenException,
    UnauthorizedException,
    NotFoundException,
    BadRequestException,
    Inject,
    Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { AppPermission, TenantPlan, UserRole, getEffectivePermissions, PosTicketStatus } from '@nuvet/types';
import {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    RefreshTokenDto,
    RegisterDto,
    ResetPasswordDto,
    UpdateProfileDto,
    VerifyEmailDto,
} from './dto/auth.dto';
import { IAuthRepository, AUTH_REPOSITORY } from '../domain/auth.repository';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../common/services/email.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @Inject(AUTH_REPOSITORY)
        private readonly authRepo: IAuthRepository,
        private readonly prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private readonly emailService: EmailService,
    ) {}

    async getHomeSummary(
        tenantId: string,
        input?: {
            date?: string;
            includeAppointments?: boolean;
            includePos?: boolean;
            includeStore?: boolean;
            includeDiscounts?: boolean;
        },
    ) {
        const base = input?.date ? new Date(`${input.date}T00:00:00.000Z`) : new Date();
        if (Number.isNaN(base.getTime())) {
            throw new BadRequestException('Formato de fecha inválido. Usa YYYY-MM-DD');
        }

        const from = new Date(base);
        from.setUTCHours(0, 0, 0, 0);
        const to = new Date(base);
        to.setUTCHours(23, 59, 59, 999);

        const monthStart = new Date(base);
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        const includeAppointments = input?.includeAppointments === true;
        const includePos = input?.includePos === true;
        const includeStore = input?.includeStore === true;
        const includeDiscounts = input?.includeDiscounts === true;

        const [
            appointmentsToday,
            posMetrics,
            posMonthMetrics,
            lowStockCount,
            activeDiscounts,
            recentTransactions,
            upcomingAppointments,
            topProducts,
            totalClients,
            totalPets,
        ] = await Promise.all([
            includeAppointments
                ? this.prisma.appointment.count({
                    where: { tenantId, scheduledAt: { gte: from, lte: to } },
                })
                : Promise.resolve(0),
            includePos
                ? this.prisma.posTicket.aggregate({
                    _count: { id: true },
                    _sum: { total: true, discount: true },
                    where: {
                        tenantId,
                        createdAt: { gte: from, lte: to },
                        status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
                    },
                })
                : Promise.resolve(null),
            includePos
                ? this.prisma.posTicket.aggregate({
                    _count: { id: true },
                    _sum: { total: true },
                    where: {
                        tenantId,
                        createdAt: { gte: monthStart, lte: to },
                        status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
                    },
                })
                : Promise.resolve(null),
            includeStore
                ? this.prisma.product.count({
                    where: {
                        tenantId,
                        isActive: true,
                        stock: { lte: this.prisma.product.fields.lowStockThreshold },
                    } as any,
                })
                : Promise.resolve(0),
            includeDiscounts
                ? this.prisma.discount.count({
                    where: {
                        tenantId,
                        isActive: true,
                        startAt: { lte: to },
                        OR: [{ endAt: null }, { endAt: { gte: from } }],
                    },
                })
                : Promise.resolve(0),
            includePos
                ? this.prisma.posTicket.findMany({
                    where: {
                        tenantId,
                        status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                    select: {
                        id: true,
                        total: true,
                        status: true,
                        createdAt: true,
                        client: { select: { firstName: true, lastName: true } },
                        payments: { select: { method: true }, take: 1 },
                    },
                })
                : Promise.resolve([]),
            includeAppointments
                ? this.prisma.appointment.findMany({
                    where: {
                        tenantId,
                        scheduledAt: { gte: from },
                        status: { in: ['SCHEDULED', 'CONFIRMED'] as any },
                    },
                    orderBy: { scheduledAt: 'asc' },
                    take: 5,
                    select: {
                        id: true,
                        scheduledAt: true,
                        type: true,
                        status: true,
                        pet: { select: { name: true, species: true, owner: { select: { firstName: true, lastName: true } } } },
                    },
                })
                : Promise.resolve([]),
            includePos
                ? this.prisma.posTicketItem.groupBy({
                    by: ['productId'],
                    _sum: { quantity: true, total: true },
                    where: {
                        ticket: {
                            tenantId,
                            createdAt: { gte: monthStart, lte: to },
                            status: { in: ['COMPLETED', 'PARTIAL_REFUND'] as any },
                        },
                        productId: { not: null },
                    },
                    orderBy: { _sum: { quantity: 'desc' } },
                    take: 5,
                })
                : Promise.resolve([]),
            this.prisma.user.count({ where: { tenantId, role: UserRole.CLIENT } }),
            this.prisma.pet.count({ where: { tenantId, isActive: true } }),
        ]);

        let topProductsWithNames: Array<{
            productId: string;
            name: string;
            quantitySold: number;
            revenue: number;
        }> = [];

        if (topProducts.length > 0) {
            const productIds = topProducts
                .map((p: any) => p.productId)
                .filter(Boolean) as string[];
            const products = await this.prisma.product.findMany({
                where: { id: { in: productIds } },
                select: { id: true, name: true },
            });
            const nameMap = new Map(products.map((p) => [p.id, p.name]));

            topProductsWithNames = topProducts.map((p: any) => ({
                productId: p.productId as string,
                name: nameMap.get(p.productId as string) ?? 'Producto eliminado',
                quantitySold: Number(p._sum?.quantity ?? 0),
                revenue: Number(p._sum?.total ?? 0),
            }));
        }

        return {
            date: from.toISOString().slice(0, 10),
            appointmentsToday,
            pos: {
                totalTransactions: Number(posMetrics?._count?.id ?? 0),
                totalRevenue: Number(posMetrics?._sum?.total ?? 0),
                totalDiscount: Number(posMetrics?._sum?.discount ?? 0),
            },
            posMonth: {
                totalTransactions: Number(posMonthMetrics?._count?.id ?? 0),
                totalRevenue: Number(posMonthMetrics?._sum?.total ?? 0),
            },
            store: {
                lowStockCount,
            },
            discounts: {
                activeCount: activeDiscounts,
            },
            recentTransactions: (recentTransactions as any[]).map((t) => ({
                id: t.id,
                total: Number(t.total ?? 0),
                status: t.status,
                createdAt: t.createdAt,
                clientName: t.client
                    ? `${t.client.firstName ?? ''} ${t.client.lastName ?? ''}`.trim()
                    : 'Mostrador',
                paymentMethod: t.payments?.[0]?.method ?? 'OTHER',
            })),
            upcomingAppointments: (upcomingAppointments as any[]).map((a) => ({
                id: a.id,
                scheduledAt: a.scheduledAt,
                type: a.type,
                status: a.status,
                petName: a.pet?.name ?? 'N/D',
                petSpecies: a.pet?.species ?? null,
                clientName: a.pet?.owner
                    ? `${a.pet.owner.firstName ?? ''} ${a.pet.owner.lastName ?? ''}`.trim()
                    : 'N/D',
            })),
            topProducts: topProductsWithNames,
            totalClients,
            totalPets,
        };
    }

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

    async forgotPassword(dto: ForgotPasswordDto) {
        const user = await this.authRepo.findUserByEmail(dto.email.trim().toLowerCase());

        // Always return success to prevent email enumeration
        if (!user) {
            return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.' };
        }

        const token = randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await this.authRepo.createPasswordResetToken(user.id, token, expiresAt);

        try {
            await this.emailService.sendPasswordReset(user.email, token);
        } catch (err) {
            this.logger.error(`Failed to send password reset email to ${user.email}`, err);
        }

        return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña.' };
    }

    async resetPassword(dto: ResetPasswordDto) {
        const record = await this.authRepo.findPasswordResetToken(dto.token);

        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new BadRequestException('El enlace de restablecimiento es inválido o ha expirado.');
        }

        const passwordHash = await bcrypt.hash(dto.newPassword, 12);
        await this.authRepo.changePasswordAndInvalidateSessions(record.userId, passwordHash);
        await this.authRepo.markPasswordResetTokenUsed(record.id);

        return { message: 'Contraseña restablecida exitosamente. Inicia sesión con tu nueva contraseña.' };
    }

    async verifyEmail(dto: VerifyEmailDto) {
        const record = await this.authRepo.findEmailVerificationToken(dto.token);

        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new BadRequestException('El enlace de verificación es inválido o ha expirado.');
        }

        await this.authRepo.markEmailVerified(record.userId);
        await this.authRepo.markEmailVerificationTokenUsed(record.id);

        return { message: 'Correo verificado exitosamente.' };
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
