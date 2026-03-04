import { BranchEntity } from './branch.entity';

export interface CreateBranchData {
    tenantId: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    website?: string;
    isMain?: boolean;
}

export interface UpdateBranchData {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
    website?: string;
    isMain?: boolean;
    isActive?: boolean;
}

export interface BranchWithCount extends BranchEntity {
    _count: { users: number; appointments: number };
}

export interface IBranchRepository {
    findAll(tenantId: string, onlyActive?: boolean): Promise<BranchWithCount[]>;
    findOne(tenantId: string, id: string): Promise<(BranchWithCount & { clinicHours: unknown[] }) | null>;
    findMain(tenantId: string, excludeId?: string): Promise<BranchEntity | null>;
    create(data: CreateBranchData): Promise<BranchEntity>;
    update(id: string, data: UpdateBranchData): Promise<BranchEntity>;
    delete(id: string): Promise<void>;
    countAppointments(branchId: string): Promise<number>;
    transferUsers(tenantId: string, fromBranchId: string, toBranchId: string): Promise<{ count: number }>;
}

export const BRANCH_REPOSITORY = Symbol('IBranchRepository');
