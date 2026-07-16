import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IAuthRepository,
    UserWithTenant,
    RefreshTokenWithUser,
    CreateRefreshTokenData,
    PasswordResetTokenRecord,
    EmailVerificationTokenRecord,
    TenantSummary,
    CreateUserData,
} from '../../domain/auth.repository';

@Injectable()
export class PrismaAuthRepository implements IAuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findUsersByEmailActive(email: string, tenantSlug?: string): Promise<UserWithTenant[]> {
        return this.prisma.user.findMany({
            where: {
                email: { equals: email, mode: 'insensitive' },
                isActive: true,
                ...(tenantSlug ? { tenant: { slug: tenantSlug } } : {}),
            },
            include: { tenant: true },
        }) as Promise<UserWithTenant[]>;
    }

    async findUserById(userId: string): Promise<UserWithTenant | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
        }) as Promise<UserWithTenant | null>;
    }

    async findUserByIdWithTenant(userId: string): Promise<UserWithTenant | null> {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: { select: { id: true, name: true, slug: true, plan: true, logoUrl: true } },
            },
        }) as Promise<UserWithTenant | null>;
    }

    async updateUser(userId: string, data: Record<string, unknown>): Promise<UserWithTenant> {
        return this.prisma.user.update({
            where: { id: userId },
            data: data as any,
            include: {
                tenant: { select: { id: true, name: true, slug: true, plan: true, logoUrl: true } },
            },
        }) as unknown as Promise<UserWithTenant>;
    }

    async createRefreshToken(data: CreateRefreshTokenData): Promise<void> {
        await this.prisma.refreshToken.create({ data });
    }

    async findRefreshToken(token: string): Promise<RefreshTokenWithUser | null> {
        return this.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: { include: { tenant: true } } },
        }) as Promise<RefreshTokenWithUser | null>;
    }

    async deleteRefreshToken(id: string): Promise<void> {
        await this.prisma.refreshToken.delete({ where: { id } });
    }

    async deleteUserRefreshTokens(userId: string, token?: string): Promise<void> {
        if (token) {
            await this.prisma.refreshToken.deleteMany({ where: { userId, token } });
        } else {
            await this.prisma.refreshToken.deleteMany({ where: { userId } });
        }
    }

    async countUserRefreshTokens(userId: string): Promise<number> {
        return this.prisma.refreshToken.count({ where: { userId } });
    }

    async changePasswordAndInvalidateSessions(userId: string, passwordHash: string): Promise<void> {
        await this.prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id: userId }, data: { passwordHash } });
            await tx.refreshToken.deleteMany({ where: { userId } });
        });
    }

    async findUserByEmail(email: string): Promise<UserWithTenant | null> {
        return this.prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
            include: { tenant: true },
        }) as Promise<UserWithTenant | null>;
    }

    async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        await this.prisma.passwordResetToken.create({
            data: { userId, token, expiresAt },
        });
    }

    async findPasswordResetToken(token: string): Promise<PasswordResetTokenRecord | null> {
        return this.prisma.passwordResetToken.findUnique({
            where: { token },
            include: { user: { include: { tenant: true } } },
        }) as Promise<PasswordResetTokenRecord | null>;
    }

    async markPasswordResetTokenUsed(id: string): Promise<void> {
        await this.prisma.passwordResetToken.update({
            where: { id },
            data: { usedAt: new Date() },
        });
    }

    async createEmailVerificationToken(userId: string, token: string, expiresAt: Date): Promise<void> {
        await this.prisma.emailVerificationToken.create({
            data: { userId, token, expiresAt },
        });
    }

    async findEmailVerificationToken(token: string): Promise<EmailVerificationTokenRecord | null> {
        return this.prisma.emailVerificationToken.findUnique({
            where: { token },
            include: { user: { include: { tenant: true } } },
        }) as Promise<EmailVerificationTokenRecord | null>;
    }

    async markEmailVerificationTokenUsed(id: string): Promise<void> {
        await this.prisma.emailVerificationToken.update({
            where: { id },
            data: { usedAt: new Date() },
        });
    }

    async markEmailVerified(userId: string): Promise<void> {
        await this.prisma.user.update({
            where: { id: userId },
            data: { emailVerified: true },
        });
    }

    async findActiveTenantBySlug(slug: string): Promise<TenantSummary | null> {
        const tenant = await this.prisma.tenant.findFirst({
            where: { slug, isActive: true },
            select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                isActive: true,
                logoUrl: true,
                address: true,
                phone: true,
                email: true,
                website: true,
            },
        });
        return tenant;
    }

    async findFirstActiveTenant(): Promise<TenantSummary | null> {
        const tenant = await this.prisma.tenant.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                isActive: true,
                logoUrl: true,
                address: true,
                phone: true,
                email: true,
                website: true,
            },
        });
        return tenant;
    }

    async countUsersByEmailInTenant(email: string, tenantId: string): Promise<number> {
        return this.prisma.user.count({
            where: {
                email: { equals: email, mode: 'insensitive' },
                tenantId,
            },
        });
    }

    async createUser(data: CreateUserData): Promise<UserWithTenant> {
        return this.prisma.user.create({
            data: {
                tenantId: data.tenantId,
                email: data.email.trim().toLowerCase(),
                passwordHash: data.passwordHash,
                role: data.role as UserRole,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone ?? null,
                isActive: data.isActive ?? true,
            },
            include: {
                tenant: { select: { id: true, name: true, slug: true, plan: true, logoUrl: true } },
            },
        }) as unknown as UserWithTenant;
    }
}
