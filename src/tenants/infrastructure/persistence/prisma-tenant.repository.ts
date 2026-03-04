import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ITenantRepository, UpdateTenantData } from '../../domain/tenant.repository';

@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOne(id: string): Promise<unknown | null> {
        return this.prisma.tenant.findUnique({
            where: { id },
            include: { _count: { select: { users: true, pets: true } } },
        });
    }

    async update(id: string, data: UpdateTenantData): Promise<unknown> {
        return this.prisma.tenant.update({ where: { id }, data });
    }
}
