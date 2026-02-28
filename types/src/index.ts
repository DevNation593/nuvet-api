// ─── Enums ───────────────────────────────────────────────────────────────────

export enum UserRole {
  CLINIC_ADMIN = 'CLINIC_ADMIN',
  VET = 'VET',
  RECEPTIONIST = 'RECEPTIONIST',
  GROOMER = 'GROOMER',
  INVENTORY = 'INVENTORY',
  ADOPTION_MANAGER = 'ADOPTION_MANAGER',
  CLIENT = 'CLIENT',
}

export enum PermissionModule {
  APPOINTMENTS = 'appointments',
  PETS = 'pets',
  CLIENTS = 'clients',
  MEDICAL_RECORDS = 'medical_records',
  VACCINATIONS = 'vaccinations',
  AESTHETICS = 'aesthetics',
  SURGERIES = 'surgeries',
  STORE = 'store',
  INVENTORY = 'inventory',
  ADOPTIONS = 'adoptions',
  USERS = 'users',
  TENANT_SETTINGS = 'tenant_settings',
  NOTIFICATIONS = 'notifications',
  REPORTS = 'reports',
  FILES = 'files',
}

export enum PermissionAction {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export type AppPermission = `${PermissionModule}:${PermissionAction}`;

const allActions = Object.values(PermissionAction);

const permissionsForModule = (module: PermissionModule): AppPermission[] =>
  allActions.map((action) => `${module}:${action}` as AppPermission);

const ALL_PERMISSIONS: AppPermission[] = Object.values(PermissionModule).flatMap(permissionsForModule);

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  [UserRole.CLINIC_ADMIN]: ALL_PERMISSIONS,
  [UserRole.VET]: [
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.CREATE}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.UPDATE}`,
    `${PermissionModule.PETS}:${PermissionAction.READ}`,
    `${PermissionModule.PETS}:${PermissionAction.CREATE}`,
    `${PermissionModule.PETS}:${PermissionAction.UPDATE}`,
    ...permissionsForModule(PermissionModule.MEDICAL_RECORDS),
    `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.VACCINATIONS}:${PermissionAction.CREATE}`,
    `${PermissionModule.VACCINATIONS}:${PermissionAction.UPDATE}`,
    ...permissionsForModule(PermissionModule.SURGERIES),
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.REPORTS}:${PermissionAction.READ}`,
    `${PermissionModule.FILES}:${PermissionAction.READ}`,
    `${PermissionModule.FILES}:${PermissionAction.CREATE}`,
  ],
  [UserRole.RECEPTIONIST]: [
    ...permissionsForModule(PermissionModule.APPOINTMENTS),
    `${PermissionModule.PETS}:${PermissionAction.READ}`,
    `${PermissionModule.PETS}:${PermissionAction.CREATE}`,
    `${PermissionModule.PETS}:${PermissionAction.UPDATE}`,
    ...permissionsForModule(PermissionModule.CLIENTS),
    `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.VACCINATIONS}:${PermissionAction.CREATE}`,
    `${PermissionModule.AESTHETICS}:${PermissionAction.READ}`,
    `${PermissionModule.AESTHETICS}:${PermissionAction.CREATE}`,
    `${PermissionModule.STORE}:${PermissionAction.READ}`,
    `${PermissionModule.STORE}:${PermissionAction.CREATE}`,
    `${PermissionModule.STORE}:${PermissionAction.UPDATE}`,
    `${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.DELETE}`,
    `${PermissionModule.USERS}:${PermissionAction.READ}`,
  ],
  [UserRole.GROOMER]: [
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.UPDATE}`,
    ...permissionsForModule(PermissionModule.AESTHETICS),
    `${PermissionModule.PETS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
  ],
  [UserRole.INVENTORY]: [
    ...permissionsForModule(PermissionModule.STORE),
    `${PermissionModule.INVENTORY}:${PermissionAction.READ}`,
    `${PermissionModule.INVENTORY}:${PermissionAction.UPDATE}`,
    `${PermissionModule.REPORTS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
  ],
  [UserRole.ADOPTION_MANAGER]: [
    ...permissionsForModule(PermissionModule.ADOPTIONS),
    `${PermissionModule.PETS}:${PermissionAction.READ}`,
    `${PermissionModule.CLIENTS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.CREATE}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`,
  ],
  [UserRole.CLIENT]: [
    `${PermissionModule.PETS}:${PermissionAction.READ}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.CREATE}`,
    `${PermissionModule.APPOINTMENTS}:${PermissionAction.DELETE}`,
    `${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.READ}`,
    `${PermissionModule.STORE}:${PermissionAction.READ}`,
    `${PermissionModule.STORE}:${PermissionAction.CREATE}`,
    `${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`,
    `${PermissionModule.ADOPTIONS}:${PermissionAction.CREATE}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
    `${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`,
  ],
};

export function getRolePermissions(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  roleOrPermissions: UserRole | AppPermission[],
  requiredPermission: AppPermission,
): boolean {
  const permissions = Array.isArray(roleOrPermissions)
    ? roleOrPermissions
    : getRolePermissions(roleOrPermissions);
  return permissions.includes(requiredPermission);
}

export function hasAnyPermission(
  roleOrPermissions: UserRole | AppPermission[],
  requiredPermissions: AppPermission[],
): boolean {
  const permissions = Array.isArray(roleOrPermissions)
    ? roleOrPermissions
    : getRolePermissions(roleOrPermissions);
  return requiredPermissions.some((permission) => permissions.includes(permission));
}

export enum AppointmentType {
  CONSULTATION = 'CONSULTATION',
  VACCINATION = 'VACCINATION',
  AESTHETICS = 'AESTHETICS',
  SURGERY = 'SURGERY',
  CHECKUP = 'CHECKUP',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum VaccinationStatus {
  SCHEDULED = 'SCHEDULED',
  ADMINISTERED = 'ADMINISTERED',
  OVERDUE = 'OVERDUE',
}

export enum SurgeryStatus {
  SCHEDULED = 'SCHEDULED',
  PRE_OP = 'PRE_OP',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AestheticStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum AdoptionStatus {
  AVAILABLE = 'AVAILABLE',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADOPTED = 'ADOPTED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum StockMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

export enum PetSpecies {
  DOG = 'DOG',
  CAT = 'CAT',
  BIRD = 'BIRD',
  RABBIT = 'RABBIT',
  HAMSTER = 'HAMSTER',
  REPTILE = 'REPTILE',
  OTHER = 'OTHER',
}

export enum PetSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum TenantPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export const PLAN_MODULES: Record<TenantPlan, PermissionModule[]> = {
  [TenantPlan.FREE]: [
    PermissionModule.APPOINTMENTS,
    PermissionModule.PETS,
    PermissionModule.CLIENTS,
    PermissionModule.NOTIFICATIONS,
  ],
  [TenantPlan.STARTER]: [
    PermissionModule.APPOINTMENTS,
    PermissionModule.PETS,
    PermissionModule.CLIENTS,
    PermissionModule.MEDICAL_RECORDS,
    PermissionModule.VACCINATIONS,
    PermissionModule.NOTIFICATIONS,
    PermissionModule.REPORTS,
  ],
  [TenantPlan.PRO]: [
    PermissionModule.APPOINTMENTS,
    PermissionModule.PETS,
    PermissionModule.CLIENTS,
    PermissionModule.MEDICAL_RECORDS,
    PermissionModule.VACCINATIONS,
    PermissionModule.AESTHETICS,
    PermissionModule.SURGERIES,
    PermissionModule.STORE,
    PermissionModule.INVENTORY,
    PermissionModule.ADOPTIONS,
    PermissionModule.USERS,
    PermissionModule.TENANT_SETTINGS,
    PermissionModule.NOTIFICATIONS,
    PermissionModule.REPORTS,
    PermissionModule.FILES,
  ],
  [TenantPlan.ENTERPRISE]: Object.values(PermissionModule),
};

export function filterPermissionsByPlan(
  permissions: AppPermission[],
  plan: TenantPlan,
): AppPermission[] {
  const allowedModules = new Set(PLAN_MODULES[plan] ?? []);
  return permissions.filter((permission) => {
    const [module] = permission.split(':');
    return allowedModules.has(module as PermissionModule);
  });
}

export function getEffectivePermissions(role: UserRole, plan: TenantPlan): AppPermission[] {
  return filterPermissionsByPlan(getRolePermissions(role), plan);
}

// ─── Shared Interfaces ───────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  logoUrl?: string;
  phone?: string;
  address?: string;
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

// ─── Pagination ───────────────────────────────────────────────────────────────

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

// ─── API Response ─────────────────────────────────────────────────────────────

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

// ─── JWT Payload ─────────────────────────────────────────────────────────────

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
