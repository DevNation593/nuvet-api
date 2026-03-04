import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IAuthRepository,
    UserWithTenant,
    RefreshTokenWithUser,
    CreateRefreshTokenData,
} from '../../domain/auth.repository';

@Injectable()
export class PrismaAuthRepository implements IAuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findUserByEmailActive(email: string): Promise<UserWithTenant | null> {
        return this.prisma.user.findFirst({
            where: { email, isActive: true },
            include: { tenant: true },
        }) as Promise<UserWithTenant | null>;
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
}
