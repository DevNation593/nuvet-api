import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    IBranchRepository,
    CreateBranchData,
    UpdateBranchData,
    BranchWithCount,
} from '../../domain/branch.repository';
import { BranchEntity } from '../../domain/branch.entity';

@Injectable()
export class PrismaBranchRepository implements IBranchRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(tenantId: string, onlyActive = false): Promise<BranchWithCount[]> {
        const rows = await this.prisma.branch.findMany({
            where: { tenantId, ...(onlyActive && { isActive: true }) },
            orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
            include: { _count: { select: { users: true, appointments: true } } },
        });
        return rows as unknown as BranchWithCount[];
    }

    async findOne(tenantId: string, id: string) {
        const row = await this.prisma.branch.findFirst({
            where: { id, tenantId },
            include: {
                _count: { select: { users: true, appointments: true } },
                clinicHours: { orderBy: { dayOfWeek: 'asc' } },
            },
        });
        return row as unknown as (BranchWithCount & { clinicHours: unknown[] }) | null;
    }

    async findMain(tenantId: string, excludeId?: string): Promise<BranchEntity | null> {
        return this.prisma.branch.findFirst({
            where: { tenantId, isMain: true, ...(excludeId && { id: { not: excludeId } }) },
        }) as unknown as BranchEntity | null;
    }

    async create(data: CreateBranchData): Promise<BranchEntity> {
        return this.prisma.branch.create({ data }) as unknown as BranchEntity;
    }

    async update(id: string, data: UpdateBranchData): Promise<BranchEntity> {
        return this.prisma.branch.update({ where: { id }, data }) as unknown as BranchEntity;
    }

    async delete(id: string): Promise<void> {
        await this.prisma.branch.delete({ where: { id } });
    }

    async countAppointments(branchId: string): Promise<number> {
        return this.prisma.appointment.count({ where: { branchId } });
    }

    async transferUsers(tenantId: string, fromBranchId: string, toBranchId: string): Promise<{ count: number }> {
        return this.prisma.user.updateMany({
            where: { tenantId, branchId: fromBranchId },
            data: { branchId: toBranchId },
        });
    }
}
