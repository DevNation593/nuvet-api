import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus } from '@nuvet/types';
import { CreateProductDto, UpdateProductDto, StockAdjustmentDto, CreateOrderDto } from './dto/store.dto';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';

@Injectable()
export class StoreService {
    constructor(private prisma: PrismaService) { }

    // ── Products ────────────────────────────────────────────────────────────────

    async findAllProducts(tenantId: string, query: PaginationQueryDto, category?: string) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, isActive: true, ...(category ? { category } : {}) };
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
            this.prisma.product.count({ where }),
        ]);
        return buildPaginatedResponse(products, total, page, limit);
    }

    async findOneProduct(tenantId: string, id: string) {
        const p = await this.prisma.product.findFirst({ where: { id, tenantId } });
        if (!p) throw new NotFoundException('Product not found');
        return p;
    }

    async createProduct(tenantId: string, dto: CreateProductDto) {
        const exists = await this.prisma.product.findFirst({ where: { tenantId, sku: dto.sku } });
        if (exists) throw new ConflictException('SKU already exists');
        return this.prisma.product.create({
            data: { ...dto, tenantId, stock: dto.stock ?? 0, lowStockThreshold: dto.lowStockThreshold ?? 5 },
        });
    }

    async updateProduct(tenantId: string, id: string, dto: UpdateProductDto) {
        await this.findOneProduct(tenantId, id);
        return this.prisma.product.update({ where: { id }, data: dto });
    }

    async deleteProduct(tenantId: string, id: string) {
        await this.findOneProduct(tenantId, id);
        return this.prisma.product.update({ where: { id }, data: { isActive: false } });
    }

    // ── Inventory ───────────────────────────────────────────────────────────────

    async adjustStock(tenantId: string, userId: string, dto: StockAdjustmentDto) {
        const product = await this.findOneProduct(tenantId, dto.productId);

        const newStock =
            dto.type === 'IN' ? product.stock + dto.quantity :
                dto.type === 'OUT' ? product.stock - dto.quantity :
                    dto.quantity;

        if (newStock < 0) throw new BadRequestException('Stock cannot go below 0');

        const [updated] = await this.prisma.$transaction([
            this.prisma.product.update({ where: { id: dto.productId }, data: { stock: newStock } }),
            this.prisma.stockMovement.create({
                data: {
                    tenantId,
                    productId: dto.productId,
                    type: dto.type,
                    quantity: dto.quantity,
                    reason: dto.reason,
                    userId,
                },
            }),
        ]);
        return updated;
    }

    async getLowStockProducts(tenantId: string) {
        const products = await this.prisma.product.findMany({
            where: { tenantId, isActive: true },
            orderBy: { stock: 'asc' },
        });
        return products.filter((p) => p.stock <= p.lowStockThreshold);
    }

    // ── Orders ──────────────────────────────────────────────────────────────────

    async findAllOrders(tenantId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where: { tenantId }, skip, take, orderBy: { createdAt: 'desc' },
                include: { items: { include: { product: { select: { id: true, name: true } } } }, client: { select: { id: true, firstName: true, lastName: true } } },
            }),
            this.prisma.order.count({ where: { tenantId } }),
        ]);
        return buildPaginatedResponse(orders, total, page, limit);
    }

    async findClientOrders(tenantId: string, clientId: string, query: PaginationQueryDto) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = { tenantId, clientId };
        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
                    items: { include: { product: { select: { id: true, name: true } } } },
                    client: { select: { id: true, firstName: true, lastName: true } },
                },
            }),
            this.prisma.order.count({ where }),
        ]);
        return buildPaginatedResponse(orders, total, page, limit);
    }

    async createOrder(tenantId: string, clientId: string, dto: CreateOrderDto) {
        const products = await this.prisma.product.findMany({
            where: { id: { in: dto.items.map((i) => i.productId) }, tenantId, isActive: true },
        });

        if (products.length !== dto.items.length) throw new NotFoundException('One or more products not found');

        const items = dto.items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            if (product.stock < item.quantity) throw new BadRequestException(`Insufficient stock for: ${product.name}`);
            return {
                tenantId,
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: product.price,
                total: product.price * item.quantity,
            };
        });

        const subtotal = items.reduce((s, i) => s + i.total, 0);
        const total = subtotal;

        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    tenantId, clientId, subtotal, tax: 0, total, notes: dto.notes,
                    items: { create: items },
                },
                include: { items: true },
            });
            // Deduct stock
            for (const item of items) {
                await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
            }
            return order;
        });
    }

    async updateOrderStatus(tenantId: string, id: string, status: OrderStatus) {
        const order = await this.prisma.order.findFirst({ where: { id, tenantId } });
        if (!order) throw new NotFoundException('Order not found');
        return this.prisma.order.update({ where: { id }, data: { status } });
    }
}
