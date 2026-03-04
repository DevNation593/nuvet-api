import { DiscountType, DiscountTargetType } from '@nuvet/types';

export interface CreateDiscountData {
    tenantId: string;
    name: string;
    description?: string;
    type: DiscountType;
    value: number;
    buyQuantity?: number;
    getQuantity?: number;
    targetType: DiscountTargetType;
    targetId?: string;
    category?: string;
    serviceType?: string;
    minAmount?: number;
    maxUses?: number;
    startAt: Date;
    endAt?: Date | null;
}

export interface IDiscountRepository {
    findAll(
        tenantId: string,
        query: { skip: number; take: number },
        onlyActive?: boolean,
    ): Promise<{ data: unknown[]; total: number }>;
    findAllActive(tenantId: string, now: Date): Promise<unknown[]>;
    findOne(tenantId: string, id: string): Promise<unknown | null>;
    findByName(tenantId: string, name: string): Promise<unknown | null>;
    findApplicableProductDiscounts(
        tenantId: string,
        productId: string,
        category: string,
        lineTotal: number,
        now: Date,
    ): Promise<unknown[]>;
    findActiveServiceDiscounts(tenantId: string, serviceType: string, now: Date): Promise<unknown[]>;
    create(data: CreateDiscountData): Promise<unknown>;
    update(id: string, data: Partial<Omit<CreateDiscountData, 'tenantId'>>): Promise<unknown>;
    softDelete(id: string): Promise<unknown>;
}

export const DISCOUNT_REPOSITORY = Symbol('IDiscountRepository');
