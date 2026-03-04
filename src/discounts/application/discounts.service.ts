import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
    Inject,
} from '@nestjs/common';
import { DiscountType, DiscountTargetType } from '@nuvet/types';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../../common/dto/pagination.dto';
import { IDiscountRepository, DISCOUNT_REPOSITORY } from '../domain/discount.repository';

@Injectable()
export class DiscountsService {
    constructor(
        @Inject(DISCOUNT_REPOSITORY) private readonly discountRepo: IDiscountRepository,
    ) {}

    async create(tenantId: string, dto: CreateDiscountDto) {
        this.validateDiscountDto(dto);
        const existing = await this.discountRepo.findByName(tenantId, dto.name);
        if (existing) {
            throw new ConflictException(`Ya existe un descuento activo con el nombre "${dto.name}"`);
        }
        return this.discountRepo.create({
            tenantId,
            name: dto.name,
            description: dto.description,
            type: dto.type,
            value: dto.value ?? 0,
            buyQuantity: dto.buyQuantity,
            getQuantity: dto.getQuantity,
            targetType: dto.targetType,
            targetId: dto.targetId,
            category: dto.category,
            serviceType: dto.serviceType,
            minAmount: dto.minAmount,
            maxUses: dto.maxUses,
            startAt: new Date(dto.startAt),
            endAt: dto.endAt ? new Date(dto.endAt) : null,
        });
    }

    async findAll(tenantId: string, query: PaginationQueryDto, onlyActive?: boolean) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.discountRepo.findAll(tenantId, { skip, take }, onlyActive);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findAllActive(tenantId: string) {
        return this.discountRepo.findAllActive(tenantId, new Date());
    }

    async findOne(tenantId: string, id: string) {
        const discount = await this.discountRepo.findOne(tenantId, id);
        if (!discount) throw new NotFoundException('Descuento no encontrado');
        return discount;
    }

    async update(tenantId: string, id: string, dto: UpdateDiscountDto) {
        await this.findOne(tenantId, id);
        const data: any = { ...dto };
        if (dto.startAt) data.startAt = new Date(dto.startAt);
        if (dto.endAt) data.endAt = new Date(dto.endAt);
        delete data.type;
        return this.discountRepo.update(id, data);
    }

    async remove(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        return this.discountRepo.softDelete(id);
    }

    async computeProductDiscount(
        tenantId: string,
        productId: string,
        category: string,
        unitPrice: number,
        quantity: number,
    ): Promise<{ discountId: string | null; savedAmount: number; finalPrice: number }> {
        const lineTotal = unitPrice * quantity;
        const activeDiscounts = await this.discountRepo.findApplicableProductDiscounts(
            tenantId, productId, category, lineTotal, new Date(),
        ) as any[];

        if (activeDiscounts.length === 0) {
            return { discountId: null, savedAmount: 0, finalPrice: lineTotal };
        }

        let bestDiscount = activeDiscounts[0];
        let bestSaving = this.calculateSaving(bestDiscount.type, bestDiscount.value, lineTotal, {
            unitPrice, quantity,
            buyQuantity: bestDiscount.buyQuantity ?? undefined,
            getQuantity: bestDiscount.getQuantity ?? undefined,
        });

        for (const d of activeDiscounts.slice(1)) {
            const saving = this.calculateSaving(d.type, d.value, lineTotal, {
                unitPrice, quantity,
                buyQuantity: d.buyQuantity ?? undefined,
                getQuantity: d.getQuantity ?? undefined,
            });
            if (saving > bestSaving) {
                bestSaving = saving;
                bestDiscount = d;
            }
        }

        return {
            discountId: bestDiscount.id,
            savedAmount: Math.min(bestSaving, lineTotal),
            finalPrice: Math.max(0, lineTotal - bestSaving),
        };
    }

    async getActiveServiceDiscounts(tenantId: string, serviceType: string) {
        return this.discountRepo.findActiveServiceDiscounts(tenantId, serviceType, new Date());
    }

    async previewDiscount(tenantId: string, discountId: string, amount: number) {
        const discount = await this.findOne(tenantId, discountId) as any;
        const now = new Date();
        if (!discount.isActive) throw new BadRequestException('El descuento no esta activo');
        if (discount.startAt > now) throw new BadRequestException('El descuento aun no esta vigente');
        if (discount.endAt && discount.endAt < now) throw new BadRequestException('El descuento ha expirado');
        if (discount.minAmount && amount < discount.minAmount) {
            throw new BadRequestException(`El monto minimo para este descuento es ${discount.minAmount}`);
        }
        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            throw new BadRequestException('El descuento ha alcanzado su limite de usos');
        }
        if (discount.type === DiscountType.BUY_X_GET_Y) {
            throw new BadRequestException('Para previsualizar un descuento BUY_X_GET_Y usa el endpoint de calculo de carrito.');
        }
        const saved = this.calculateSaving(discount.type, discount.value, amount);
        return {
            discountId: discount.id,
            name: discount.name,
            type: discount.type,
            value: discount.value,
            originalAmount: amount,
            savedAmount: Math.min(saved, amount),
            finalAmount: Math.max(0, amount - saved),
        };
    }

    calculateSaving(
        type: string,
        value: number,
        amount: number,
        opts?: { unitPrice?: number; quantity?: number; buyQuantity?: number; getQuantity?: number },
    ): number {
        if (type === DiscountType.BUY_X_GET_Y) {
            const { unitPrice = 0, quantity = 1, buyQuantity = 1, getQuantity = 1 } = opts ?? {};
            const setSize = buyQuantity + getQuantity;
            const freeSets = Math.floor(quantity / setSize);
            return freeSets * getQuantity * unitPrice;
        }
        if (type === DiscountType.PERCENTAGE) {
            return (amount * Math.min(value, 100)) / 100;
        }
        return Math.min(value, amount);
    }

    private validateDiscountDto(dto: CreateDiscountDto) {
        if (dto.targetType === DiscountTargetType.PRODUCT && !dto.targetId) {
            throw new BadRequestException('targetId es requerido cuando targetType = PRODUCT');
        }
        if (dto.targetType === DiscountTargetType.PRODUCT_CATEGORY && !dto.category) {
            throw new BadRequestException('category es requerida cuando targetType = PRODUCT_CATEGORY');
        }
        if (dto.targetType === DiscountTargetType.SERVICE && !dto.serviceType) {
            throw new BadRequestException('serviceType es requerido cuando targetType = SERVICE');
        }
        if (dto.type === DiscountType.BUY_X_GET_Y) {
            if (!dto.buyQuantity || dto.buyQuantity < 1) {
                throw new BadRequestException('buyQuantity es requerido y debe ser >= 1 para BUY_X_GET_Y');
            }
            if (!dto.getQuantity || dto.getQuantity < 1) {
                throw new BadRequestException('getQuantity es requerido y debe ser >= 1 para BUY_X_GET_Y');
            }
            if (dto.targetType === DiscountTargetType.ALL_SERVICES) {
                throw new BadRequestException('BUY_X_GET_Y solo aplica a productos, no a servicios');
            }
        }
        if (dto.type === DiscountType.PERCENTAGE && (dto.value ?? 0) > 100) {
            throw new BadRequestException('El valor del descuento porcentual no puede superar 100');
        }
        if ([DiscountType.PERCENTAGE, DiscountType.FIXED].includes(dto.type as DiscountType) && !dto.value) {
            throw new BadRequestException('value es requerido para descuentos de tipo PERCENTAGE o FIXED');
        }
        if (dto.endAt && new Date(dto.endAt) <= new Date(dto.startAt)) {
            throw new BadRequestException('endAt debe ser posterior a startAt');
        }
    }
}