import type { AdoptionStatus, AestheticStatus, AppPermission, SurgeryStatus, TenantPlan, UserRole, VaccinationStatus } from './index';
export type ApiAppointmentType = 'CONSULTATION' | 'VACCINATION' | 'AESTHETICS' | 'SURGERY' | 'CHECKUP';
export type ApiAppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
    password?: string;
    phone?: string;
    identification?: string;
    billingAddress?: string;
}
export interface UpdateClientRequest {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    phone?: string;
    identification?: string;
    billingAddress?: string;
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
    branchId?: string;
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
    petId?: string;
    adoptionAnimalId?: string;
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
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
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
/**
 * Los nombres de los enums coinciden con los valores que produce el cliente
 * Prisma del backend (`@prisma/client`). Usar los literales aquí garantiza
 * que web/mobile consuman exactamente lo que la API serializa, sin
 * dependencia de runtime del Prisma client.
 */
export type ApiConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';
export type ApiConsentScope = 'PASSPORT_READ' | 'MEDICAL_RECORDS_READ';
export type ApiConsentAuditAction = 'CREATED' | 'GRANTED' | 'REVOKED' | 'ACCESSED' | 'SHARE_CREATED' | 'SHARE_REVOKED' | 'SHARE_ACCESSED' | 'EXPIRED';
export interface Consent {
    id: string;
    petId: string;
    ownerId: string;
    sourceTenantId: string;
    targetTenantId: string;
    targetClinicName: string | null;
    status: ApiConsentStatus;
    scopes: ApiConsentScope[];
    message: string | null;
    grantedAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
    revokeReason: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface GrantConsentRequest {
    petId: string;
    targetTenantId: string;
    targetClinicName?: string;
    scopes?: ApiConsentScope[];
    message?: string;
    expiresAt?: string;
}
export interface RevokeConsentRequest {
    reason?: string;
}
export interface ListConsentsQuery {
    petId?: string;
    targetTenantId?: string;
    status?: ApiConsentStatus;
    page?: number;
    limit?: number;
}
export interface PassportVaccine {
    id: string;
    vaccineName: string;
    manufacturer: string | null;
    batchNumber: string | null;
    administeredAt: string;
    nextDueAt: string | null;
    status: string;
}
export interface PassportMedicalRecord {
    id: string;
    date: string;
    chiefComplaint: string;
    diagnosis: string;
    treatment: string;
    vetName: string | null;
}
export interface PassportSurgery {
    id: string;
    scheduledAt: string;
    completedAt: string | null;
    type: string;
    status: string;
    postInstructions: string | null;
}
export interface PassportWeightEntry {
    date: string;
    weight: number;
}
export interface PassportPet {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    sex: string;
    birthDate: string | null;
    color: string | null;
    microchip: string | null;
    photoUrl: string | null;
    weight: number | null;
    allergies: string | null;
    isNeutered: boolean;
    issuedBy: {
        tenantId: string;
        tenantName: string;
    };
    vaccines: PassportVaccine[];
    medicalRecords: PassportMedicalRecord[];
    surgeries: PassportSurgery[];
    weightHistory: PassportWeightEntry[];
    generatedAt: string;
}
export interface PassportShare {
    id: string;
    petId: string;
    token: string;
    expiresAt: string;
    revokedAt: string | null;
    accessCount: number;
    lastAccessedAt: string | null;
    createdAt: string;
    shareUrl: string;
}
export interface CreatePassportShareRequest {
    petId: string;
    ttlDays?: number;
}
export interface PassportLookupResult {
    petId: string;
    petName: string;
    sourceTenantId: string;
    sourceTenantName: string;
    microchip: string;
}
export type ApiMembershipBillingPeriod = 'MONTHLY' | 'ANNUAL';
export type ApiMembershipSubscriptionStatus = 'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED' | 'PAST_DUE';
export type ApiBillingProviderKind = 'MOCK' | 'STRIPE' | 'PAYPHONE';
export interface MembershipPlan {
    id: string;
    tenantId: string;
    slug: string;
    name: string;
    description: string | null;
    priceCents: number;
    currency: string;
    billingPeriod: ApiMembershipBillingPeriod;
    includedBenefits: string[];
    applicableSpecies: string[];
    isActive: boolean;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
}
export interface MembershipSubscription {
    id: string;
    tenantId: string;
    sourceTenantId: string;
    petId: string;
    ownerId: string;
    planId: string;
    status: ApiMembershipSubscriptionStatus;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    nextBillingAt: string;
    autoRenew: boolean;
    lastChargedAt: string | null;
    lastChargeTxId: string | null;
    canceledAt: string | null;
    cancelReason: string | null;
    providerKind: ApiBillingProviderKind;
    createdAt: string;
    updatedAt: string;
    plan?: Pick<MembershipPlan, 'id' | 'name' | 'slug' | 'priceCents' | 'currency' | 'billingPeriod'>;
    pet?: {
        id: string;
        name: string;
    };
}
export interface CreateMembershipPlanRequest {
    name: string;
    slug: string;
    description?: string;
    priceCents: number;
    currency?: string;
    billingPeriod?: ApiMembershipBillingPeriod;
    includedBenefits?: string[];
    applicableSpecies?: string[];
    isActive?: boolean;
    displayOrder?: number;
}
export type UpdateMembershipPlanRequest = Partial<CreateMembershipPlanRequest>;
export interface SubscribeToPlanRequest {
    petId: string;
    planId: string;
    paymentMethodToken?: string;
}
export interface CancelMembershipSubscriptionRequest {
    reason?: string;
}
export interface MembershipPlanListResponse {
    data: MembershipPlan[];
    total: number;
}
export interface MembershipSubscriptionListResponse {
    data: MembershipSubscription[];
    total: number;
}
/**
 * Literales que coinciden 1:1 con los enums `ConsentTokenScope` /
 * `ConsentTokenStatus` / `ConsentAccessAction` del schema Prisma.
 * Mantener sincronizados para que web/mobile consuman exactamente lo que la
 * API serializa (sin dependencia de runtime del Prisma client).
 */
export type ApiConsentTokenScope = 'READ' | 'FULL';
export type ApiConsentTokenStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ApiConsentAccessAction = 'VALIDATE' | 'READ' | 'REVOKE';
/**
 * Payload de creación de un token de consentimiento.
 * El emisor debe ser el dueño (CLIENT) o staff del mismo tenant que custodia
 * el expediente; el backend valida la membresía de cada `petId` al tenant.
 */
export interface CreateConsentTokenInput {
    granteeEmail: string;
    granteeTenantId?: string | null;
    scope?: ApiConsentTokenScope;
    petIds: string[];
    expiresAt: string;
    auditReason?: string | null;
}
/**
 * Payload de actualización parcial (revocación). Cualquier subset de campos
 * actualizables puede enviarse; `status` se forzará a REVOKED si no se
 * especifica, ya que el endpoint principal es revocación.
 */
export interface UpdateConsentTokenInput {
    scope?: ApiConsentTokenScope;
    expiresAt?: string;
    auditReason?: string | null;
}
/**
 * Payload para validar/canjear un token. Devuelve la entidad si está
 * vigente, lanza error en caso contrario.
 */
export interface ValidateConsentTokenInput {
    tokenId: string;
}
export interface ConsentTokenView {
    id: string;
    tenantId: string;
    ownerUserId: string;
    granteeEmail: string;
    granteeTenantId: string | null;
    scope: ApiConsentTokenScope;
    petIds: string[];
    status: ApiConsentTokenStatus;
    expiresAt: string;
    createdAt: string;
    revokedAt: string | null;
    auditReason: string | null;
}
export interface ConsentAccessLogView {
    id: string;
    tenantId: string;
    consentTokenId: string;
    accessedByUserId: string;
    accessedByTenantId: string | null;
    action: ApiConsentAccessAction;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
}
export interface ConsentAccessLogListResponse {
    success: true;
    data: ConsentAccessLogView[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}
export type ApiVaccinationCampaignStatus = 'DRAFT' | 'OPEN' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
export type ApiVaccinationRegistrationStatus = 'REGISTERED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED';
export interface VaccinationCampaign {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    vaccineName: string;
    startsAt: string;
    endsAt: string;
    location: string | null;
    capacity: number | null;
    priceCents: number;
    currency: string;
    status: ApiVaccinationCampaignStatus;
    notes: string | null;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    registrationCount?: number;
}
export interface VaccinationRegistration {
    id: string;
    tenantId: string;
    campaignId: string;
    petId: string;
    ownerId: string;
    status: ApiVaccinationRegistrationStatus;
    attendedAt: string | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
    pet?: {
        id: string;
        name: string;
        species: string;
    };
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}
export interface CreateVaccinationCampaignRequest {
    name: string;
    description?: string;
    vaccineName: string;
    startsAt: string;
    endsAt: string;
    location?: string;
    capacity?: number;
    priceCents?: number;
    currency?: string;
    notes?: string;
}
export interface UpdateVaccinationCampaignRequest {
    name?: string;
    description?: string;
    vaccineName?: string;
    startsAt?: string;
    endsAt?: string;
    location?: string;
    capacity?: number;
    priceCents?: number;
    currency?: string;
    notes?: string;
    status?: ApiVaccinationCampaignStatus;
}
export interface RegisterPetToCampaignRequest {
    petId: string;
    notes?: string;
}
export interface MarkRegistrationAttendedRequest {
    attendedAt?: string;
    notes?: string;
}
export type ApiHomeVetBookingStatus = 'REQUESTED' | 'CONFIRMED' | 'EN_ROUTE' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export interface HomeVetBooking {
    id: string;
    tenantId: string;
    ownerId: string;
    petId: string;
    vetId: string | null;
    scheduledAt: string;
    address: string;
    addressNotes: string | null;
    reason: string;
    status: ApiHomeVetBookingStatus;
    visitFeeCents: number;
    travelFeeCents: number;
    totalCents: number;
    currency: string;
    visitNotes: string | null;
    diagnosis: string | null;
    internalNotes: string | null;
    cancelReason: string | null;
    cancelledAt: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
    pet?: {
        id: string;
        name: string;
        species: string;
    };
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    vet?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
}
export interface CreateHomeVetBookingRequest {
    petId: string;
    scheduledAt: string;
    address: string;
    addressNotes?: string;
    reason: string;
    visitFeeCents?: number;
    travelFeeCents?: number;
    totalCents?: number;
    currency?: string;
    ownerId?: string;
}
export interface UpdateHomeVetBookingRequest {
    scheduledAt?: string;
    address?: string;
    addressNotes?: string;
    reason?: string;
    visitFeeCents?: number;
    travelFeeCents?: number;
    totalCents?: number;
    currency?: string;
    visitNotes?: string;
    diagnosis?: string;
    internalNotes?: string;
}
export interface AssignVetRequest {
    vetId: string;
}
export interface CancelHomeVetBookingRequest {
    reason?: string;
}
export interface CompleteHomeVetBookingRequest {
    visitNotes?: string;
    diagnosis?: string;
}
export interface ListHomeVetBookingsParams {
    status?: ApiHomeVetBookingStatus;
    fromDate?: string;
    toDate?: string;
    ownerId?: string;
    vetId?: string;
    petId?: string;
    page?: number;
    pageSize?: number;
}
export type ApiPostOpPlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ApiPostOpCheckinStatus = 'SUBMITTED' | 'REVIEWED' | 'FLAGGED';
export interface PostOpPlan {
    id: string;
    tenantId: string;
    petId: string;
    ownerId: string;
    surgeryId: string | null;
    vetId: string;
    title: string;
    instructions: string;
    startDate: string;
    endDate: string;
    checkinIntervalDays: number;
    status: ApiPostOpPlanStatus;
    completedAt: string | null;
    cancelledAt: string | null;
    cancelReason: string | null;
    createdAt: string;
    updatedAt: string;
    pet?: {
        id: string;
        name: string;
        species: string;
    };
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    vet?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    checkins?: PostOpCheckin[];
}
export interface PostOpCheckin {
    id: string;
    tenantId: string;
    planId: string;
    ownerId: string;
    submittedAt: string;
    ownerNote: string | null;
    photoUrls: string[];
    weightKg: number | null;
    appetite: string | null;
    energyLevel: string | null;
    concernsFlag: boolean;
    vetNote: string | null;
    reviewedAt: string | null;
    reviewedById: string | null;
    status: ApiPostOpCheckinStatus;
    createdAt: string;
    updatedAt: string;
    owner?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    reviewedBy?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
}
export interface CreatePostOpPlanRequest {
    petId: string;
    ownerId: string;
    surgeryId?: string;
    vetId: string;
    title: string;
    instructions: string;
    startDate: string;
    endDate: string;
    checkinIntervalDays?: number;
}
export interface UpdatePostOpPlanRequest {
    title?: string;
    instructions?: string;
    startDate?: string;
    endDate?: string;
    checkinIntervalDays?: number;
}
export interface CancelPostOpPlanRequest {
    reason?: string;
}
export interface CreatePostOpCheckinRequest {
    ownerNote?: string;
    photoUrls?: string[];
    weightKg?: number;
    appetite?: string;
    energyLevel?: string;
    concernsFlag?: boolean;
}
export interface ReviewPostOpCheckinRequest {
    vetNote?: string;
    flagged?: boolean;
}
export interface ListPostOpPlansParams {
    status?: ApiPostOpPlanStatus;
    petId?: string;
    ownerId?: string;
    vetId?: string;
    surgeryId?: string;
    page?: number;
    pageSize?: number;
}
