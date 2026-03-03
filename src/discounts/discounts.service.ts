import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscountType, DiscountTargetType } from '@nuvet/types';
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';
import {
    PaginationQueryDto,
    buildPaginatedResponse,
    buildPaginationArgs,
} from '../common/dto/pagination.dto';

@Injectable()
export class DiscountsService {
    constructor(private prisma: PrismaService) {}

    // ── CRUD ─────────────────────────────────────────────────────────────────────

    async create(tenantId: string, dto: CreateDiscountDto) {
        this.validateDiscountDto(dto);

        const existing = await this.prisma.discount.findFirst({
            where: { tenantId, name: dto.name, isActive: true },
        });
        if (existing) {
            throw new ConflictException(`Ya existe un descuento activo con el nombre "${dto.name}"`);
        }

        return this.prisma.discount.create({
            data: {
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
            },
        });
    }

    async findAll(tenantId: string, query: PaginationQueryDto, onlyActive?: boolean) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const now = new Date();

        const where: any = {
            tenantId,
            ...(onlyActive !== undefined ? { isActive: onlyActive } : {}),
        };

        const [discounts, total] = await Promise.all([
            this.prisma.discount.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.discount.count({ where }),
        ]);

        return buildPaginatedResponse(discounts, total, page, limit);
    }

    async findAllActive(tenantId: string) {
        const now = new Date();
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
            },
            orderBy: { startAt: 'asc' },
        });
    }

    async findOne(tenantId: string, id: string) {
        const discount = await this.prisma.discount.findFirst({
            where: { id, tenantId },
            include: {
                orderItems: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
        });
        if (!discount) throw new NotFoundException('Descuento no encontrado');
        return discount;
    }

    async update(tenantId: string, id: string, dto: UpdateDiscountDto) {
        await this.findOne(tenantId, id);

        const data: any = { ...dto };
        if (dto.startAt) data.startAt = new Date(dto.startAt);
        if (dto.endAt) data.endAt = new Date(dto.endAt);
        delete data.type; // no permitir cambiar el tipo para evitar inconsistencias

        return this.prisma.discount.update({ where: { id }, data });
    }

    async remove(tenantId: string, id: string) {
        await this.findOne(tenantId, id);
        return this.prisma.discount.update({
            where: { id },
            data: { isActive: false },
        });
    }

    // ── Lógica de aplicación ─────────────────────────────────────────────────────

    /**
     * Calcula el monto de descuento para un producto específico dado los descuentos
     * activos del tenant.
     */
    async computeProductDiscount(
        tenantId: string,
        productId: string,
        category: string,
        unitPrice: number,
        quantity: number,
    ): Promise<{ discountId: string | null; savedAmount: number; finalPrice: number }> {
        const lineTotal = unitPrice * quantity;
        const activeDiscounts = await this.getApplicableProductDiscounts(
            tenantId,
            productId,
            category,
            lineTotal,
        );

        if (activeDiscounts.length === 0) {
            return { discountId: null, savedAmount: 0, finalPrice: lineTotal };
        }

        // Aplicar el descuento con mayor ahorro
        let bestDiscount = activeDiscounts[0];
        let bestSaving = this.calculateSaving(bestDiscount.type, bestDiscount.value, lineTotal, {
            unitPrice,
            quantity,
            buyQuantity: bestDiscount.buyQuantity ?? undefined,
            getQuantity: bestDiscount.getQuantity ?? undefined,
        });

        for (const d of activeDiscounts.slice(1)) {
            const saving = this.calculateSaving(d.type, d.value, lineTotal, {
                unitPrice,
                quantity,
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

    /**
     * Devuelve los descuentos activos aplicables a un tipo de servicio (AppointmentType).
     */
    async getActiveServiceDiscounts(tenantId: string, serviceType: string) {
        const now = new Date();
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: [
                    {
                        OR: [
                            { targetType: DiscountTargetType.ALL_SERVICES },
                            {
                                targetType: DiscountTargetType.SERVICE,
                                serviceType,
                            },
                        ],
                    },
                ],
            },
        });
    }

    /**
     * Simula cuánto se ahorraría al aplicar un descuento específico sobre un monto.
     */
    async previewDiscount(tenantId: string, discountId: string, amount: number) {
        const discount = await this.findOne(tenantId, discountId);

        const now = new Date();
        if (!discount.isActive) {
            throw new BadRequestException('El descuento no está activo');
        }
        if (discount.startAt > now) {
            throw new BadRequestException('El descuento aún no está vigente');
        }
        if (discount.endAt && discount.endAt < now) {
            throw new BadRequestException('El descuento ha expirado');
        }
        if (discount.minAmount && amount < discount.minAmount) {
            throw new BadRequestException(
                `El monto mínimo para este descuento es ${discount.minAmount}`,
            );
        }
        if (discount.maxUses && discount.usedCount >= discount.maxUses) {
            throw new BadRequestException('El descuento ha alcanzado su límite de usos');
        }

        if (discount.type === DiscountType.BUY_X_GET_Y) {
            throw new BadRequestException(
                'Para previsualizar un descuento BUY_X_GET_Y usa el endpoint de cálculo de carrito, ya que este tipo requiere precio unitario y cantidad.',
            );
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

    // ── Helpers privados ──────────────────────────────────────────────────────────

    calculateSaving(
        type: string,
        value: number,
        amount: number,
        opts?: { unitPrice?: number; quantity?: number; buyQuantity?: number; getQuantity?: number },
    ): number {
        if (type === DiscountType.BUY_X_GET_Y) {
            const { unitPrice = 0, quantity = 1, buyQuantity = 1, getQuantity = 1 } = opts ?? {};
            // Cuántos sets completos "compra X paga X" caben en la cantidad solicitada
            const setSize = buyQuantity + getQuantity;
            const freeSets = Math.floor(quantity / setSize);
            return freeSets * getQuantity * unitPrice;
        }
        if (type === DiscountType.PERCENTAGE) {
            return (amount * Math.min(value, 100)) / 100;
        }
        // FIXED
        return Math.min(value, amount);
    }

    private async getApplicableProductDiscounts(
        tenantId: string,
        productId: string,
        category: string,
        lineTotal: number,
    ) {
        const now = new Date();
        return this.prisma.discount.findMany({
            where: {
                tenantId,
                isActive: true,
                startAt: { lte: now },
                OR: [{ endAt: null }, { endAt: { gte: now } }],
                AND: [
                    {
                        OR: [
                            { targetType: DiscountTargetType.ALL_PRODUCTS },
                            { targetType: DiscountTargetType.PRODUCT, targetId: productId },
                            { targetType: DiscountTargetType.PRODUCT_CATEGORY, category },
                        ],
                    },
                    {
                        OR: [
                            { minAmount: null },
                            { minAmount: { lte: lineTotal } },
                        ],
                    },
                ],
            },
        });
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
