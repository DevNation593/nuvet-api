import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Inject,
} from '@nestjs/common';
import { IBranchRepository, BRANCH_REPOSITORY } from '../domain/branch.repository';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
    constructor(
        @Inject(BRANCH_REPOSITORY) private readonly branchRepo: IBranchRepository,
    ) {}

    async findAll(tenantId: string, onlyActive = false) {
        return this.branchRepo.findAll(tenantId, onlyActive);
    }

    async findOne(tenantId: string, id: string) {
        const branch = await this.branchRepo.findOne(tenantId, id);
        if (!branch) throw new NotFoundException('Branch not found');
        return branch;
    }

    async create(tenantId: string, dto: CreateBranchDto) {
        if (dto.isMain) {
            await this.ensureSingleMain(tenantId);
        }
        return this.branchRepo.create({ tenantId, ...dto });
    }

    async update(tenantId: string, id: string, dto: UpdateBranchDto) {
        const branch = await this.findOne(tenantId, id);

        if (dto.isMain && !branch.isMain) {
            await this.ensureSingleMain(tenantId, id);
        }
        if (dto.isActive === false && branch.isMain) {
            throw new BadRequestException('Cannot deactivate the main branch');
        }
        return this.branchRepo.update(id, dto);
    }

    async remove(tenantId: string, id: string) {
        const branch = await this.findOne(tenantId, id);

        if (branch.isMain) {
            throw new BadRequestException('Cannot delete the main branch');
        }
        const appointmentCount = await this.branchRepo.countAppointments(id);
        if (appointmentCount > 0) {
            throw new ConflictException(
                'Cannot delete a branch that has appointments. Deactivate it instead.',
            );
        }
        return this.branchRepo.delete(id);
    }

    async transferUsers(tenantId: string, fromBranchId: string, toBranchId: string) {
        await this.findOne(tenantId, fromBranchId);
        await this.findOne(tenantId, toBranchId);
        const result = await this.branchRepo.transferUsers(tenantId, fromBranchId, toBranchId);
        return { transferred: result.count };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private async ensureSingleMain(tenantId: string, excludeId?: string) {
        const existing = await this.branchRepo.findMain(tenantId, excludeId);
        if (existing) {
            throw new ConflictException(
                `Branch "${existing.name}" is already marked as main. Unset it first.`,
            );
        }
    }
}
