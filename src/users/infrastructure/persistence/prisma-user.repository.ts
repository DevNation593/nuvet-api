import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IUserRepository, CreateUserData } from '../../domain/user.repository';

const USER_SELECT = {
    id: true,
    tenantId: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    phone: true,
    avatarUrl: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class PrismaUserRepository implements IUserRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number; sortBy?: string; sortOrder?: string },
    ): Promise<{ data: unknown[]; total: number }> {
        const [data, total] = await Promise.all([
            this.prisma.user.findMany({
                where: { tenantId },
                skip: query.skip,
                take: query.take,
                orderBy: { [query.sortBy || 'createdAt']: query.sortOrder || 'desc' },
                select: USER_SELECT,
            }),
            this.prisma.user.count({ where: { tenantId } }),
        ]);
        return { data, total };
    }

    async findOne(tenantId: string, id: string): Promise<unknown | null> {
        return this.prisma.user.findFirst({
            where: { id, tenantId },
            select: USER_SELECT,
        });
    }

    async findByEmail(tenantId: string, email: string): Promise<unknown | null> {
        return this.prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email } },
        });
    }

    async create(data: CreateUserData): Promise<unknown> {
        return this.prisma.user.create({
            data,
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                isActive: true,
                createdAt: true,
            },
        });
    }

    async update(
        id: string,
        data: Partial<CreateUserData & { isActive: boolean; avatarUrl: string }>,
    ): Promise<unknown> {
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                isActive: true,
                updatedAt: true,
            },
        });
    }

    async softDelete(id: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    }
}
