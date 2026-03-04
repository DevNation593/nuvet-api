import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { OrderStatus } from '@nuvet/types';
import { CreateProductDto, UpdateProductDto, StockAdjustmentDto, CreateOrderDto } from './dto/store.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { DiscountsService } from '../../discounts/application/discounts.service';
import { IStoreRepository, STORE_REPOSITORY } from '../domain/store.repository';

@Injectable()
export class StoreService {
    constructor(
        @Inject(STORE_REPOSITORY)
        private readonly storeRepo: IStoreRepository,
        private discountsService: DiscountsService,
    ) {}

    // Products
    async findAllProducts(tenantId: string, query: PaginationQueryDto, category?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.storeRepo.findAllProducts(tenantId, skip, take, category);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findOneProduct(tenantId: string, id: string) {
        const p = await this.storeRepo.findProductById(tenantId, id);
        if (!p) throw new NotFoundException('Product not found');
        return p;
    }

    async createProduct(tenantId: string, dto: CreateProductDto) {
        const exists = await this.storeRepo.findProductBySku(tenantId, dto.sku);
        if (exists) throw new ConflictException('SKU already exists');
        return this.storeRepo.createProduct({
            ...dto,
            tenantId,
            stock: dto.stock ?? 0,
            lowStockThreshold: dto.lowStockThreshold ?? 5,
        });
    }

    async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
        await this.findOneProduct(tenantId, id);
        return this.storeRepo.updateProduct(id, dto as Record<string, unknown>);
    }

    async deleteProduct(tenantId: string, id: string) {
        await this.findOneProduct(tenantId, id);
        return this.storeRepo.deactivateProduct(id);
    }

    // Inventory
    async adjustStock(tenantId: string, userId: string, dto: StockAdjustmentDto) {
        const product = await this.findOneProduct(tenantId, dto.productId);

        const newStock =
            dto.type === 'IN' ? product.stock + dto.quantity :
            dto.type === 'OUT' ? product.stock - dto.quantity :
            dto.quantity;

        if (newStock < 0) throw new BadRequestException('Stock cannot go below 0');

        return this.storeRepo.adjustStock(
            { tenantId, productId: dto.productId, type: dto.type, quantity: dto.quantity, reason: dto.reason, userId },
            newStock,
        );
    }

    async getLowStockProducts(tenantId: string) {
        return this.storeRepo.getLowStockProducts(tenantId);
    }

    // Orders
    async findAllOrders(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.storeRepo.findAllOrders(tenantId, skip, take);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async findClientOrders(tenantId: string, clientId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.storeRepo.findClientOrders(tenantId, clientId, skip, take);
        return buildPaginatedResponse(data, total, page, limit);
    }

    async createOrder(tenantId: string, clientId: string, dto: CreateOrderDto) {
        const products = await this.storeRepo.findProductsByIds(tenantId, dto.items.map((i) => i.productId));

        if (products.length !== dto.items.length)
            throw new NotFoundException('One or more products not found');

        const itemsWithDiscount = await Promise.all(
            dto.items.map(async (item) => {
                const product = products.find((p) => p.id === item.productId)!;
                if (product.stock < item.quantity)
                    throw new BadRequestException(`Insufficient stock for: ${product.name}`);

                const { discountId, savedAmount, finalPrice } =
                    await this.discountsService.computeProductDiscount(
                        tenantId,
                        product.id,
                        product.category,
                        product.price,
                        item.quantity,
                    );

                return {
                    tenantId,
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: product.price,
                    total: finalPrice,
                    _discountId: discountId,
                    _savedAmount: savedAmount,
                };
            }),
        );

        const subtotal = itemsWithDiscount.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

        let orderLevelDiscount = 0;
        let orderDiscountId: string | null = null;

        if (dto.discountId) {
            const preview = await this.discountsService.previewDiscount(tenantId, dto.discountId, subtotal);
            orderLevelDiscount = preview.savedAmount;
            orderDiscountId = dto.discountId;
        }

        const lineDiscount = itemsWithDiscount.reduce((s, i) => s + i._savedAmount, 0);
        const totalDiscount = lineDiscount + orderLevelDiscount;
        const total = Math.max(0, subtotal - totalDiscount);

        const items = itemsWithDiscount.map(({ _discountId, _savedAmount, ...rest }) => rest);

        const discountUsages = [
            ...itemsWithDiscount
                .filter((i) => i._discountId && i._savedAmount > 0)
                .map((i) => ({
                    tenantId,
                    discountId: i._discountId!,
                    orderId: '',
                    savedAmount: i._savedAmount,
                })),
            ...(orderDiscountId && orderLevelDiscount > 0
                ? [{ tenantId, discountId: orderDiscountId, orderId: '', savedAmount: orderLevelDiscount }]
                : []),
        ];

        const discountIds = [...new Set(discountUsages.map((u) => u.discountId))];

        const order = await this.storeRepo.createOrderWithItems(
            { tenantId, clientId, subtotal, discount: totalDiscount, tax: 0, total, notes: dto.notes, items },
            discountUsages,
            discountIds,
        );

        return { ...(order as object), totalDiscount, lineDiscount, orderLevelDiscount };
    }

    async updateOrderStatus(tenantId: string, id: string, status: OrderStatus) {
        const order = await this.storeRepo.findOrderById(tenantId, id);
        if (!order) throw new NotFoundException('Order not found');
        return this.storeRepo.updateOrderStatus(tenantId, id, status);
    }
}