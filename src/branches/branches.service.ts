import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, onlyActive = false) {
        return this.prisma.branch.findMany({
            where: { tenantId, ...(onlyActive && { isActive: true }) },
            orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }],
            include: {
                _count: {
                    select: { users: true, appointments: true },
                },
            },
        });
    }

    async findOne(tenantId: string, id: string) {
        const branch = await this.prisma.branch.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { users: true, appointments: true },
                },
                clinicHours: { orderBy: { dayOfWeek: 'asc' } },
            },
        });
        if (!branch) throw new NotFoundException('Branch not found');
        return branch;
    }

    async create(tenantId: string, dto: CreateBranchDto) {
        // Si se marca como principal, verificar que no haya otra
        if (dto.isMain) {
            await this.ensureSingleMain(tenantId);
        }

        return this.prisma.branch.create({
            data: {
                tenantId,
                name: dto.name,
                address: dto.address,
                phone: dto.phone,
                email: dto.email,
                logoUrl: dto.logoUrl,
                website: dto.website,
                isMain: dto.isMain ?? false,
            },
        });
    }

    async update(tenantId: string, id: string, dto: UpdateBranchDto) {
        const branch = await this.findOne(tenantId, id);

        // Si se quiere marcar como principal y no es la actual, verificar
        if (dto.isMain && !branch.isMain) {
            await this.ensureSingleMain(tenantId, id);
        }

        // No permitir desactivar la sucursal principal
        if (dto.isActive === false && branch.isMain) {
            throw new BadRequestException('Cannot deactivate the main branch');
        }

        return this.prisma.branch.update({
            where: { id },
            data: dto,
        });
    }

    async remove(tenantId: string, id: string) {
        const branch = await this.findOne(tenantId, id);

        if (branch.isMain) {
            throw new BadRequestException('Cannot delete the main branch');
        }

        const hasAppointments = await this.prisma.appointment.count({
            where: { branchId: id },
        });
        if (hasAppointments > 0) {
            throw new ConflictException(
                'Cannot delete a branch that has appointments. Deactivate it instead.',
            );
        }

        return this.prisma.branch.delete({ where: { id } });
    }

    async transferUsers(tenantId: string, fromBranchId: string, toBranchId: string) {
        await this.findOne(tenantId, fromBranchId);
        await this.findOne(tenantId, toBranchId);

        const { count } = await this.prisma.user.updateMany({
            where: { tenantId, branchId: fromBranchId },
            data: { branchId: toBranchId },
        });

        return { transferred: count };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private async ensureSingleMain(tenantId: string, excludeId?: string) {
        const existing = await this.prisma.branch.findFirst({
            where: { tenantId, isMain: true, ...(excludeId && { id: { not: excludeId } }) },
        });
        if (existing) {
            throw new ConflictException(
                `Branch "${existing.name}" is already marked as main. Unset it first.`,
            );
        }
    }
}
