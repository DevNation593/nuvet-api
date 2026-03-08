import type {
    AdoptionStatus,
    AestheticStatus,
    AppPermission,
    SurgeryStatus,
    TenantPlan,
    UserRole,
    VaccinationStatus,
} from './index';

export type ApiAppointmentType = 'CONSULTATION' | 'VACCINATION' | 'AESTHETICS' | 'SURGERY' | 'CHECKUP';
export type ApiAppointmentStatus =
    | 'SCHEDULED'
    | 'CONFIRMED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'NO_SHOW';
export type ApiOrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type ApiPetSpecies = 'DOG' | 'CAT' | 'BIRD' | 'RABBIT' | 'HAMSTER' | 'REPTILE' | 'OTHER';
export type ApiPetSex = 'MALE' | 'FEMALE';
export type ApiNotificationChannel = 'EMAIL' | 'PUSH' | 'SMS' | 'IN_APP';
export type ApiTenantPlan = TenantPlan;
export type ApiUserRole = UserRole;
export type ApiVaccinationStatus = VaccinationStatus;
export type ApiAestheticStatus = AestheticStatus;
export type ApiSurgeryStatus = SurgeryStatus;
export type ApiAdoptionStatus = AdoptionStatus;

export interface ApiEnvelope<T> {
    success: boolean;
    data: T;
    meta?: {
        page?: number;
        limit?: number;
        total?: number;
        totalPages?: number;
        hasNextPage?: boolean;
        hasPrevPage?: boolean;
    };
}

export interface LoginRequest {
    email: string;
    tenantSlug?: string;
    password: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface RegisterRequest {
    clinicName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
}

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
}

export interface UpdateTenantRequest {
    name?: string;
    phone?: string;
    address?: string;
    email?: string;
    website?: string;
}

export interface CreateUserRequest {
    email: string;
    firstName: string;
    lastName: string;
    role: ApiUserRole;
    password: string;
    phone?: string;
}

export interface UpdateUserRequest {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: ApiUserRole;
    password?: string;
    phone?: string;
    isActive?: boolean;
}

export interface CreateClientRequest {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
}

export interface UpdateClientRequest {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    phone?: string;
    isActive?: boolean;
}

export interface CreatePetRequest {
    ownerId: string;
    name: string;
    species: ApiPetSpecies;
    sex: ApiPetSex;
    breed?: string;
    birthDate?: string;
    weight?: number;
    notes?: string;
    microchip?: string;
    color?: string;
    isNeutered?: boolean;
    allergies?: string;
}

export type UpdatePetRequest = Partial<CreatePetRequest>;

export interface CreateAppointmentRequest {
    petId: string;
    type: ApiAppointmentType;
    scheduledAt: string;
    durationMinutes?: number;
    vetId?: string;
    groomerId?: string;
    notes?: string;
}

export interface UpdateAppointmentStatusRequest {
    status?: ApiAppointmentStatus;
    scheduledAt?: string;
    cancelReason?: string;
}

export interface CreateMedicalRecordRequest {
    petId: string;
    appointmentId?: string;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    prescriptions?: string;
    notes?: string;
    weight?: number;
    temperature?: number;
    heartRate?: number;
}

export type UpdateMedicalRecordRequest = Partial<CreateMedicalRecordRequest>;

export interface PresignUploadRequest {
    filename: string;
    contentType: string;
    folder: string;
}

export interface PresignUploadResponse {
    url: string;
    key: string;
}

export interface RegisterMedicalRecordAttachmentRequest {
    key: string;
    filename: string;
    contentType: string;
    size: number;
}

export interface CreateVaccinationRequest {
    petId: string;
    appointmentId?: string;
    vaccineName: string;
    manufacturer?: string;
    batchNumber?: string;
    dose: number;
    administeredAt: string;
    nextDueAt?: string;
    notes?: string;
}

export interface UpdateVaccinationRequest extends Partial<CreateVaccinationRequest> {
    status?: ApiVaccinationStatus;
}

export interface CreateAestheticRequest {
    petId: string;
    groomerId: string;
    appointmentId?: string;
    serviceName: string;
    scheduledAt: string;
    price?: number;
    notes?: string;
}

export interface UpdateAestheticRequest extends Partial<CreateAestheticRequest> {
    status?: ApiAestheticStatus;
}

export interface CreateSurgeryRequest {
    petId: string;
    vetId: string;
    appointmentId?: string;
    type: string;
    scheduledAt: string;
    consentSignedAt?: string;
    consentSignedBy?: string;
    preInstructions?: string;
    postInstructions?: string;
    postOpNotes?: string;
    anesthesiaType?: string;
    durationMinutes?: number;
    notes?: string;
}

export interface UpdateSurgeryRequest extends Partial<CreateSurgeryRequest> {
    status?: ApiSurgeryStatus;
}

export interface CreateAdoptionRequest {
    petId: string;
    notes?: string;
}

export interface ApplyAdoptionRequest {
    applicantName: string;
    applicantEmail: string;
    applicantPhone?: string;
    notes?: string;
}

export interface UpdateAdoptionStatusRequest {
    status: Extract<ApiAdoptionStatus, 'APPROVED' | 'REJECTED'>;
    rejectionReason?: string;
}

export interface CreateOrderItemRequest {
    productId: string;
    quantity: number;
}

export interface CreateProductRequest {
    name: string;
    sku: string;
    description?: string;
    category: string;
    price: number;
    stock?: number;
    lowStockThreshold?: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
    isActive?: boolean;
}

export interface StockAdjustmentRequest {
    type: 'IN' | 'OUT' | 'ADJUSTMENT';
    productId: string;
    quantity: number;
    reason?: string;
}

export interface CreateOrderRequest {
    items: CreateOrderItemRequest[];
    notes?: string;
}

export interface UpdateOrderStatusRequest {
    status: ApiOrderStatus;
}

export interface CreateNotificationTemplateRequest {
    key: string;
    channel: ApiNotificationChannel;
    subject?: string;
    bodyTemplate: string;
}

export interface TriggerNotificationRequest {
    key: string;
    userId: string;
    channel?: ApiNotificationChannel;
    data?: Record<string, unknown>;
}

export interface ApiAuthTenant {
    id: string;
    name: string;
    slug: string;
    plan: ApiTenantPlan;
    logoUrl?: string | null;
}

export interface AuthUser {
    id: string;
    tenantId: string;
    email: string;
    role: ApiUserRole;
    firstName: string;
    lastName: string;
    tenantPlan?: ApiTenantPlan;
    permissions?: AppPermission[];
    tenant?: ApiAuthTenant;
}

export interface AuthSession {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    recommendPasswordChange?: boolean;
}

export interface LoginResponse extends AuthSession {
    tenant?: ApiAuthTenant;
}
