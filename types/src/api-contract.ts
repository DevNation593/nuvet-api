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

// ─── Fase 1 · Pasaporte médico + consentimiento interclínico ──────────────────

/**
 * Los nombres de los enums coinciden con los valores que produce el cliente
 * Prisma del backend (`@prisma/client`). Usar los literales aquí garantiza
 * que web/mobile consuman exactamente lo que la API serializa, sin
 * dependencia de runtime del Prisma client.
 */
export type ApiConsentStatus = 'PENDING' | 'GRANTED' | 'REVOKED' | 'EXPIRED';
export type ApiConsentScope = 'PASSPORT_READ' | 'MEDICAL_RECORDS_READ';
export type ApiConsentAuditAction =
    | 'CREATED'
    | 'GRANTED'
    | 'REVOKED'
    | 'ACCESSED'
    | 'SHARE_CREATED'
    | 'SHARE_REVOKED'
    | 'SHARE_ACCESSED'
    | 'EXPIRED';

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
    issuedBy: { tenantId: string; tenantName: string };
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

// ─── Fase 2 · Membresías (Slice 1) ────────────────────────────────────────────

export type ApiMembershipBillingPeriod = 'MONTHLY' | 'ANNUAL';

export type ApiMembershipSubscriptionStatus =
    | 'PENDING'
    | 'ACTIVE'
    | 'PAUSED'
    | 'CANCELLED'
    | 'EXPIRED'
    | 'PAST_DUE';

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
    applicableSpecies: string[]; // serializamos como strings; el cliente los valida si quiere
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
    // Expandidos opcionales cuando el backend los incluye:
    plan?: Pick<MembershipPlan, 'id' | 'name' | 'slug' | 'priceCents' | 'currency' | 'billingPeriod'>;
    pet?: { id: string; name: string };
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

// ─── Fase 2 · Membresías (Slice 2 — Reportes de Billing) ─────────────────────

export type ApiBillingAttemptStatus = 'SUCCESS' | 'FAILED';

export interface BillingAttempt {
    id: string;
    tenantId: string;
    subscriptionId: string;
    provider: ApiBillingProviderKind;
    transactionId: string | null;
    status: ApiBillingAttemptStatus;
    amountCents: number;
    currency: string;
    failureCode: string | null;
    failureMessage: string | null;
    createdAt: string;
    /** Join opcional (solo en endpoints de reporte). */
    subscription?: {
        id: string;
        status: ApiMembershipSubscriptionStatus;
        ownerId: string;
        owner?: { id: string; firstName: string; lastName: string; email: string };
        plan?: { id: string; name: string; priceCents: number; currency: string };
        pet?: { id: string; name: string };
    };
}

export interface BillingFailureCodeCount {
    failureCode: string;
    failureMessage: string | null;
    count: number;
}

/**
 * Resumen agregado de intentos de cobro fallidos — alimenta la card
 * superior del dashboard `/clinic/billing-attempts`.
 */
export interface BillingFailureReportSummary {
    failuresLast24Hours: number;
    failuresLast7Days: number;
    failuresLast30Days: number;
    /** Suscripciones que actualmente están en `PAST_DUE` (impacto vivo). */
    pastDueSubscriptions: number;
    /** Top 5 códigos de fallo más frecuentes con su descripción humana. */
    topFailureCodes: BillingFailureCodeCount[];
    /** Total recuperado = intentos SUCCESS que ocurrieron después de un FAILED
     *  para la misma suscripción (heurística: la suscripción volvió a pago). */
    totalRecoveredAfterFailure: number;
}

export interface BillingFailureReport {
    summary: BillingFailureReportSummary;
    attempts: BillingAttempt[];
    total: number;
    page: number;
    pageSize: number;
}

export interface ListBillingFailureAttemptsParams {
    /** ISO date — filtra por `createdAt >= since`. Default: hace 30 días. */
    since?: string;
    page?: number;
    pageSize?: number;
}

// ─── Fase 2 · Consent tokens emitidos por email a terceros ───────────────────

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
