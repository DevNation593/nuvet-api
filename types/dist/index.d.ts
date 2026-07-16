export declare enum UserRole {
    CLINIC_ADMIN = "CLINIC_ADMIN",
    VET = "VET",
    RECEPTIONIST = "RECEPTIONIST",
    GROOMER = "GROOMER",
    INVENTORY = "INVENTORY",
    ADOPTION_MANAGER = "ADOPTION_MANAGER",
    CLIENT = "CLIENT"
}
export declare enum PermissionModule {
    APPOINTMENTS = "appointments",
    PETS = "pets",
    CLIENTS = "clients",
    MEDICAL_RECORDS = "medical_records",
    VACCINATIONS = "vaccinations",
    AESTHETICS = "aesthetics",
    SURGERIES = "surgeries",
    STORE = "store",
    INVENTORY = "inventory",
    ADOPTIONS = "adoptions",
    USERS = "users",
    TENANT_SETTINGS = "tenant_settings",
    NOTIFICATIONS = "notifications",
    REPORTS = "reports",
    FILES = "files",
    DISCOUNTS = "discounts",
    BRANCHES = "branches",
    POS = "pos",
    BILLING = "billing",
    PASSPORT = "passport",
    CONSENT = "consent",
    MEMBERSHIPS = "memberships",
    HOME_VET = "home_vet",
    POSTOP = "postop"
}
export declare enum PermissionAction {
    READ = "read",
    CREATE = "create",
    UPDATE = "update",
    DELETE = "delete"
}
export type AppPermission = `${PermissionModule}:${PermissionAction}`;
export declare const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]>;
export declare function getRolePermissions(role: UserRole): AppPermission[];
export declare function hasPermission(roleOrPermissions: UserRole | AppPermission[], requiredPermission: AppPermission): boolean;
export declare function hasAnyPermission(roleOrPermissions: UserRole | AppPermission[], requiredPermissions: AppPermission[]): boolean;
export declare enum AppointmentType {
    CONSULTATION = "CONSULTATION",
    VACCINATION = "VACCINATION",
    AESTHETICS = "AESTHETICS",
    SURGERY = "SURGERY",
    CHECKUP = "CHECKUP"
}
export declare enum AppointmentStatus {
    SCHEDULED = "SCHEDULED",
    CONFIRMED = "CONFIRMED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    NO_SHOW = "NO_SHOW"
}
export declare enum VaccinationStatus {
    SCHEDULED = "SCHEDULED",
    ADMINISTERED = "ADMINISTERED",
    OVERDUE = "OVERDUE"
}
export declare enum SurgeryStatus {
    SCHEDULED = "SCHEDULED",
    PRE_OP = "PRE_OP",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum AestheticStatus {
    SCHEDULED = "SCHEDULED",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED"
}
export declare enum AdoptionStatus {
    AVAILABLE = "AVAILABLE",
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    ADOPTED = "ADOPTED"
}
export declare enum OrderStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED"
}
export declare enum StockMovementType {
    IN = "IN",
    OUT = "OUT",
    ADJUSTMENT = "ADJUSTMENT"
}
export declare enum DiscountType {
    PERCENTAGE = "PERCENTAGE",
    FIXED = "FIXED",
    BUY_X_GET_Y = "BUY_X_GET_Y"
}
export declare enum DiscountTargetType {
    PRODUCT = "PRODUCT",
    PRODUCT_CATEGORY = "PRODUCT_CATEGORY",
    SERVICE = "SERVICE",
    ALL_PRODUCTS = "ALL_PRODUCTS",
    ALL_SERVICES = "ALL_SERVICES"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CARD = "CARD",
    TRANSFER = "TRANSFER",
    OTHER = "OTHER"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare enum CashRegisterStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED"
}
export declare enum PosTicketStatus {
    OPEN = "OPEN",
    COMPLETED = "COMPLETED",
    REFUNDED = "REFUNDED",
    PARTIAL_REFUND = "PARTIAL_REFUND",
    CANCELLED = "CANCELLED"
}
export declare enum PosItemType {
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE"
}
export declare enum NotificationChannel {
    EMAIL = "EMAIL",
    PUSH = "PUSH",
    SMS = "SMS",
    IN_APP = "IN_APP"
}
export declare enum PetSpecies {
    DOG = "DOG",
    CAT = "CAT",
    BIRD = "BIRD",
    RABBIT = "RABBIT",
    HAMSTER = "HAMSTER",
    REPTILE = "REPTILE",
    OTHER = "OTHER"
}
export declare enum PetSex {
    MALE = "MALE",
    FEMALE = "FEMALE"
}
export declare enum TenantPlan {
    FREE = "FREE",
    STARTER = "STARTER",
    PRO = "PRO",
    ENTERPRISE = "ENTERPRISE"
}
export declare const PLAN_MODULES: Record<TenantPlan, PermissionModule[]>;
export declare function filterPermissionsByPlan(permissions: AppPermission[], plan: TenantPlan): AppPermission[];
export declare function getEffectivePermissions(role: UserRole, plan: TenantPlan): AppPermission[];
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    logoUrl?: string;
    phone?: string;
    address?: string;
    email?: string;
    website?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface User {
    id: string;
    tenantId: string;
    tenantPlan?: TenantPlan;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions?: AppPermission[];
    phone?: string;
    avatarUrl?: string;
    isActive: boolean;
    createdAt: Date;
}
export interface Pet {
    id: string;
    tenantId: string;
    ownerId: string;
    name: string;
    species: PetSpecies;
    breed?: string;
    sex: PetSex;
    birthDate?: Date;
    weight?: number;
    photoUrl?: string;
    microchip?: string;
    isNeutered: boolean;
    isActive: boolean;
    createdAt: Date;
}
export interface Appointment {
    id: string;
    tenantId: string;
    petId: string;
    vetId?: string;
    groomerId?: string;
    type: AppointmentType;
    status: AppointmentStatus;
    scheduledAt: Date;
    durationMinutes: number;
    notes?: string;
    createdAt: Date;
}
export interface MedicalRecord {
    id: string;
    tenantId: string;
    petId: string;
    vetId: string;
    appointmentId?: string;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    prescriptions?: string;
    notes?: string;
    attachments: string[];
    weight?: number;
    temperature?: number;
    createdAt: Date;
}
export interface Vaccination {
    id: string;
    tenantId: string;
    petId: string;
    vetId: string;
    vaccineName: string;
    manufacturer?: string;
    batchNumber?: string;
    dose: number;
    administeredAt: Date;
    nextDueAt?: Date;
    status: VaccinationStatus;
    notes?: string;
}
export interface AestheticService {
    id: string;
    tenantId: string;
    petId: string;
    groomerId: string;
    appointmentId?: string;
    serviceName: string;
    status: AestheticStatus;
    scheduledAt: Date;
    price?: number;
    notes?: string;
}
export interface Surgery {
    id: string;
    tenantId: string;
    petId: string;
    vetId: string;
    type: string;
    status: SurgeryStatus;
    scheduledAt: Date;
    consentSignedAt?: Date;
    consentSignedBy?: string;
    preInstructions?: string;
    postInstructions?: string;
    postOpNotes?: string;
    notes?: string;
    anesthesiaType?: string;
    durationMinutes?: number;
}
export interface Product {
    id: string;
    tenantId: string;
    name: string;
    sku: string;
    description?: string;
    category: string;
    price: number;
    stock: number;
    lowStockThreshold: number;
    imageUrl?: string;
    isActive: boolean;
}
export interface Order {
    id: string;
    tenantId: string;
    clientId: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: OrderStatus;
    notes?: string;
    createdAt: Date;
}
export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    total: number;
}
export interface Adoption {
    id: string;
    tenantId: string;
    petId: string;
    applicantId?: string;
    status: AdoptionStatus;
    applicantName?: string;
    applicantEmail?: string;
    applicantPhone?: string;
    notes?: string;
    createdAt: Date;
}
export interface Notification {
    id: string;
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    data?: Record<string, unknown>;
    readAt?: Date;
    createdAt: Date;
}
export interface NotificationTemplate {
    id: string;
    tenantId?: string;
    key: string;
    channel: NotificationChannel;
    subject?: string;
    bodyTemplate: string;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}
export interface PaginatedResult<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    meta?: PaginatedResult<T>['meta'];
}
export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown[];
    };
}
export interface JwtPayload {
    sub: string;
    tenantId: string;
    tenantPlan?: TenantPlan;
    role: UserRole;
    permissions?: AppPermission[];
    email: string;
    iat?: number;
    exp?: number;
}
export * from './api-contract';
