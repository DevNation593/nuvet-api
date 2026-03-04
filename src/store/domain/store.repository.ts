import { OrderStatus } from '@nuvet/types';

export interface ProductData {
    id: string;
    name: string;
    sku: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
    category: string;
    isActive: boolean;
    tenantId: string;
    [key: string]: unknown;
}

export interface CreateProductData {
    tenantId: string;
    sku: string;
    name: string;
    price: number;
    stock?: number;
    lowStockThreshold?: number;
    category?: string;
    [key: string]: unknown;
}

export interface StockAdjustmentData {
    tenantId: string;
    productId: string;
    type: string;
    quantity: number;
    reason?: string;
    userId: string;
}

export interface OrderItemInput {
    tenantId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface CreateOrderData {
    tenantId: string;
    clientId: string;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    notes?: string;
    items: OrderItemInput[];
}

export interface DiscountUsageRecord {
    tenantId: string;
    discountId: string;
    orderId: string;
    savedAmount: number;
}

export interface IStoreRepository {
    findAllProducts(
        tenantId: string,
        skip: number,
        take: number,
        category?: string,
    ): Promise<{ data: unknown[]; total: number }>;

    findProductById(tenantId: string, id: string): Promise<ProductData | null>;

    findProductBySku(tenantId: string, sku: string): Promise<ProductData | null>;

    findProductsByIds(
        tenantId: string,
        ids: string[],
    ): Promise<ProductData[]>;

    createProduct(data: CreateProductData): Promise<unknown>;

    updateProduct(id: string, data: Record<string, unknown>): Promise<unknown>;

    deactivateProduct(id: string): Promise<unknown>;

    adjustStock(data: StockAdjustmentData, newStock: number): Promise<unknown>;

    getLowStockProducts(tenantId: string): Promise<ProductData[]>;

    findAllOrders(
        tenantId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }>;

    findClientOrders(
        tenantId: string,
        clientId: string,
        skip: number,
        take: number,
    ): Promise<{ data: unknown[]; total: number }>;

    createOrderWithItems(
        data: CreateOrderData,
        discountUsages: DiscountUsageRecord[],
        discountIds: string[],
    ): Promise<unknown>;

    updateOrderStatus(tenantId: string, id: string, status: OrderStatus): Promise<unknown>;

    findOrderById(tenantId: string, id: string): Promise<unknown | null>;
}

export const STORE_REPOSITORY = Symbol('IStoreRepository');
