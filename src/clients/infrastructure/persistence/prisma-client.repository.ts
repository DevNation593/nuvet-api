import { Injectable } from '@nestjs/common';
import { UserRole } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import { IClientRepository, CreateClientData } from '../../domain/client.repository';
import { ClientEntity } from '../../domain/client.entity';

const CLIENT_SELECT = {
    id: true,
    tenantId: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
} as const;

@Injectable()
export class PrismaClientRepository implements IClientRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        query: { skip: number; take: number },
    ): Promise<{ data: ClientEntity[]; total: number }> {
        const where = { tenantId, role: UserRole.CLIENT };
        const [clients, total] = await Promise.all([
            this.prisma.user.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createdAt: 'desc' },
                select: CLIENT_SELECT,
            }),
            this.prisma.user.count({ where }),
        ]);
        return { data: clients as ClientEntity[], total };
    }

    async findOne(tenantId: string, id: string): Promise<(ClientEntity & { pets?: unknown[] }) | null> {
        const client = await this.prisma.user.findFirst({
            where: { id, tenantId, role: UserRole.CLIENT },
            select: CLIENT_SELECT,
        });
        return client as ClientEntity | null;
    }

    async findByEmail(tenantId: string, email: string): Promise<ClientEntity | null> {
        const client = await this.prisma.user.findUnique({
            where: { tenantId_email: { tenantId, email } },
        });
        return client as unknown as ClientEntity | null;
    }

    async create(data: CreateClientData): Promise<ClientEntity> {
        const client = await this.prisma.user.create({
            data: { ...data, role: UserRole.CLIENT },
            select: {
                id: true,
                tenantId: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return client as unknown as ClientEntity;
    }

    async update(
        id: string,
        data: Partial<CreateClientData & { isActive: boolean }>,
    ): Promise<ClientEntity> {
        const client = await this.prisma.user.update({
            where: { id },
            data,
            select: CLIENT_SELECT,
        });
        return client as unknown as ClientEntity;
    }

    async remove(id: string): Promise<void> {
        await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    }
}
