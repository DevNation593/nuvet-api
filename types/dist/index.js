"use strict";
// ─── Enums ───────────────────────────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAN_MODULES = exports.TenantPlan = exports.PetSex = exports.PetSpecies = exports.NotificationChannel = exports.PosItemType = exports.PosTicketStatus = exports.CashRegisterStatus = exports.PaymentStatus = exports.PaymentMethod = exports.DiscountTargetType = exports.DiscountType = exports.StockMovementType = exports.OrderStatus = exports.AdoptionStatus = exports.AestheticStatus = exports.SurgeryStatus = exports.VaccinationStatus = exports.AppointmentStatus = exports.AppointmentType = exports.ROLE_PERMISSIONS = exports.PermissionAction = exports.PermissionModule = exports.UserRole = void 0;
exports.getRolePermissions = getRolePermissions;
exports.hasPermission = hasPermission;
exports.hasAnyPermission = hasAnyPermission;
exports.filterPermissionsByPlan = filterPermissionsByPlan;
exports.getEffectivePermissions = getEffectivePermissions;
var UserRole;
(function (UserRole) {
    UserRole["CLINIC_ADMIN"] = "CLINIC_ADMIN";
    UserRole["VET"] = "VET";
    UserRole["RECEPTIONIST"] = "RECEPTIONIST";
    UserRole["GROOMER"] = "GROOMER";
    UserRole["INVENTORY"] = "INVENTORY";
    UserRole["ADOPTION_MANAGER"] = "ADOPTION_MANAGER";
    UserRole["CLIENT"] = "CLIENT";
})(UserRole || (exports.UserRole = UserRole = {}));
var PermissionModule;
(function (PermissionModule) {
    PermissionModule["APPOINTMENTS"] = "appointments";
    PermissionModule["PETS"] = "pets";
    PermissionModule["CLIENTS"] = "clients";
    PermissionModule["MEDICAL_RECORDS"] = "medical_records";
    PermissionModule["VACCINATIONS"] = "vaccinations";
    PermissionModule["AESTHETICS"] = "aesthetics";
    PermissionModule["SURGERIES"] = "surgeries";
    PermissionModule["STORE"] = "store";
    PermissionModule["INVENTORY"] = "inventory";
    PermissionModule["ADOPTIONS"] = "adoptions";
    PermissionModule["USERS"] = "users";
    PermissionModule["TENANT_SETTINGS"] = "tenant_settings";
    PermissionModule["NOTIFICATIONS"] = "notifications";
    PermissionModule["REPORTS"] = "reports";
    PermissionModule["FILES"] = "files";
    PermissionModule["DISCOUNTS"] = "discounts";
    PermissionModule["BRANCHES"] = "branches";
    PermissionModule["POS"] = "pos";
    PermissionModule["BILLING"] = "billing";
    // Fase 1: pasaporte médico digital + consentimiento entre clínicas.
    PermissionModule["PASSPORT"] = "passport";
    PermissionModule["CONSENT"] = "consent";
    // Fase 2: planes de membresía y suscripciones.
    PermissionModule["MEMBERSHIPS"] = "memberships";
    // Fase 3 Slice 2: veterinario a domicilio.
    PermissionModule["HOME_VET"] = "home_vet";
    // Fase 3 Slice 3: seguimiento postoperatorio.
    PermissionModule["POSTOP"] = "postop";
})(PermissionModule || (exports.PermissionModule = PermissionModule = {}));
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["READ"] = "read";
    PermissionAction["CREATE"] = "create";
    PermissionAction["UPDATE"] = "update";
    PermissionAction["DELETE"] = "delete";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
const allActions = Object.values(PermissionAction);
const permissionsForModule = (module) => allActions.map((action) => `${module}:${action}`);
const ALL_PERMISSIONS = Object.values(PermissionModule).flatMap(permissionsForModule);
exports.ROLE_PERMISSIONS = {
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
        `${PermissionModule.BRANCHES}:${PermissionAction.READ}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
        `${PermissionModule.REPORTS}:${PermissionAction.READ}`,
        `${PermissionModule.FILES}:${PermissionAction.READ}`,
        `${PermissionModule.FILES}:${PermissionAction.CREATE}`,
        // Fase 2: vets validan tokens de consentimiento al atender cross-clinic.
        `${PermissionModule.CONSENT}:${PermissionAction.READ}`,
        `${PermissionModule.CONSENT}:${PermissionAction.UPDATE}`,
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
        `${PermissionModule.BRANCHES}:${PermissionAction.READ}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.DELETE}`,
        `${PermissionModule.USERS}:${PermissionAction.READ}`,
        ...permissionsForModule(PermissionModule.POS),
        `${PermissionModule.BILLING}:${PermissionAction.READ}`,
        `${PermissionModule.BILLING}:${PermissionAction.CREATE}`,
    ],
    [UserRole.GROOMER]: [
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`,
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.UPDATE}`,
        ...permissionsForModule(PermissionModule.AESTHETICS),
        `${PermissionModule.PETS}:${PermissionAction.READ}`,
        `${PermissionModule.BRANCHES}:${PermissionAction.READ}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
    ],
    [UserRole.INVENTORY]: [
        ...permissionsForModule(PermissionModule.STORE),
        `${PermissionModule.INVENTORY}:${PermissionAction.READ}`,
        `${PermissionModule.INVENTORY}:${PermissionAction.UPDATE}`,
        `${PermissionModule.REPORTS}:${PermissionAction.READ}`,
        `${PermissionModule.POS}:${PermissionAction.READ}`,
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
        `${PermissionModule.PETS}:${PermissionAction.CREATE}`,
        `${PermissionModule.PETS}:${PermissionAction.UPDATE}`,
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`,
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.CREATE}`,
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.UPDATE}`,
        `${PermissionModule.APPOINTMENTS}:${PermissionAction.DELETE}`,
        `${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.READ}`,
        `${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.CREATE}`,
        `${PermissionModule.STORE}:${PermissionAction.READ}`,
        `${PermissionModule.STORE}:${PermissionAction.CREATE}`,
        `${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`,
        `${PermissionModule.ADOPTIONS}:${PermissionAction.CREATE}`,
        `${PermissionModule.MEMBERSHIPS}:${PermissionAction.READ}`,
        `${PermissionModule.HOME_VET}:${PermissionAction.READ}`,
        `${PermissionModule.HOME_VET}:${PermissionAction.CREATE}`,
        `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
        `${PermissionModule.POSTOP}:${PermissionAction.READ}`,
        `${PermissionModule.POSTOP}:${PermissionAction.CREATE}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.READ}`,
        `${PermissionModule.NOTIFICATIONS}:${PermissionAction.UPDATE}`,
        // Fase 1: pasaporte médico. Los controllers de passport y consent
        // requieren permisos del módulo PASSPORT (no CONSENT), así que el
        // cliente necesita los cuatro para ver/crear/revocar su propio
        // pasaporte y consentimientos cross-clinic.
        ...permissionsForModule(PermissionModule.PASSPORT),
        // Fase 2: el dueño de la mascota emite/revoca/consulta sus propios
        // tokens de consent (módulo independiente que también usa el cliente).
        ...permissionsForModule(PermissionModule.CONSENT),
    ],
};
function getRolePermissions(role) {
    return exports.ROLE_PERMISSIONS[role] ?? [];
}
function hasPermission(roleOrPermissions, requiredPermission) {
    const permissions = Array.isArray(roleOrPermissions)
        ? roleOrPermissions
        : getRolePermissions(roleOrPermissions);
    return permissions.includes(requiredPermission);
}
function hasAnyPermission(roleOrPermissions, requiredPermissions) {
    const permissions = Array.isArray(roleOrPermissions)
        ? roleOrPermissions
        : getRolePermissions(roleOrPermissions);
    return requiredPermissions.some((permission) => permissions.includes(permission));
}
var AppointmentType;
(function (AppointmentType) {
    AppointmentType["CONSULTATION"] = "CONSULTATION";
    AppointmentType["VACCINATION"] = "VACCINATION";
    AppointmentType["AESTHETICS"] = "AESTHETICS";
    AppointmentType["SURGERY"] = "SURGERY";
    AppointmentType["CHECKUP"] = "CHECKUP";
})(AppointmentType || (exports.AppointmentType = AppointmentType = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AppointmentStatus["COMPLETED"] = "COMPLETED";
    AppointmentStatus["CANCELLED"] = "CANCELLED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
var VaccinationStatus;
(function (VaccinationStatus) {
    VaccinationStatus["SCHEDULED"] = "SCHEDULED";
    VaccinationStatus["ADMINISTERED"] = "ADMINISTERED";
    VaccinationStatus["OVERDUE"] = "OVERDUE";
})(VaccinationStatus || (exports.VaccinationStatus = VaccinationStatus = {}));
var SurgeryStatus;
(function (SurgeryStatus) {
    SurgeryStatus["SCHEDULED"] = "SCHEDULED";
    SurgeryStatus["PRE_OP"] = "PRE_OP";
    SurgeryStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SurgeryStatus["COMPLETED"] = "COMPLETED";
    SurgeryStatus["CANCELLED"] = "CANCELLED";
})(SurgeryStatus || (exports.SurgeryStatus = SurgeryStatus = {}));
var AestheticStatus;
(function (AestheticStatus) {
    AestheticStatus["SCHEDULED"] = "SCHEDULED";
    AestheticStatus["IN_PROGRESS"] = "IN_PROGRESS";
    AestheticStatus["COMPLETED"] = "COMPLETED";
    AestheticStatus["CANCELLED"] = "CANCELLED";
})(AestheticStatus || (exports.AestheticStatus = AestheticStatus = {}));
var AdoptionStatus;
(function (AdoptionStatus) {
    AdoptionStatus["AVAILABLE"] = "AVAILABLE";
    AdoptionStatus["PENDING"] = "PENDING";
    AdoptionStatus["APPROVED"] = "APPROVED";
    AdoptionStatus["REJECTED"] = "REJECTED";
    AdoptionStatus["ADOPTED"] = "ADOPTED";
})(AdoptionStatus || (exports.AdoptionStatus = AdoptionStatus = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["PROCESSING"] = "PROCESSING";
    OrderStatus["COMPLETED"] = "COMPLETED";
    OrderStatus["CANCELLED"] = "CANCELLED";
    OrderStatus["REFUNDED"] = "REFUNDED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var StockMovementType;
(function (StockMovementType) {
    StockMovementType["IN"] = "IN";
    StockMovementType["OUT"] = "OUT";
    StockMovementType["ADJUSTMENT"] = "ADJUSTMENT";
})(StockMovementType || (exports.StockMovementType = StockMovementType = {}));
var DiscountType;
(function (DiscountType) {
    DiscountType["PERCENTAGE"] = "PERCENTAGE";
    DiscountType["FIXED"] = "FIXED";
    DiscountType["BUY_X_GET_Y"] = "BUY_X_GET_Y";
})(DiscountType || (exports.DiscountType = DiscountType = {}));
var DiscountTargetType;
(function (DiscountTargetType) {
    DiscountTargetType["PRODUCT"] = "PRODUCT";
    DiscountTargetType["PRODUCT_CATEGORY"] = "PRODUCT_CATEGORY";
    DiscountTargetType["SERVICE"] = "SERVICE";
    DiscountTargetType["ALL_PRODUCTS"] = "ALL_PRODUCTS";
    DiscountTargetType["ALL_SERVICES"] = "ALL_SERVICES";
})(DiscountTargetType || (exports.DiscountTargetType = DiscountTargetType = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["TRANSFER"] = "TRANSFER";
    PaymentMethod["OTHER"] = "OTHER";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var CashRegisterStatus;
(function (CashRegisterStatus) {
    CashRegisterStatus["OPEN"] = "OPEN";
    CashRegisterStatus["CLOSED"] = "CLOSED";
})(CashRegisterStatus || (exports.CashRegisterStatus = CashRegisterStatus = {}));
var PosTicketStatus;
(function (PosTicketStatus) {
    PosTicketStatus["OPEN"] = "OPEN";
    PosTicketStatus["COMPLETED"] = "COMPLETED";
    PosTicketStatus["REFUNDED"] = "REFUNDED";
    PosTicketStatus["PARTIAL_REFUND"] = "PARTIAL_REFUND";
    PosTicketStatus["CANCELLED"] = "CANCELLED";
})(PosTicketStatus || (exports.PosTicketStatus = PosTicketStatus = {}));
var PosItemType;
(function (PosItemType) {
    PosItemType["PRODUCT"] = "PRODUCT";
    PosItemType["SERVICE"] = "SERVICE";
})(PosItemType || (exports.PosItemType = PosItemType = {}));
var NotificationChannel;
(function (NotificationChannel) {
    NotificationChannel["EMAIL"] = "EMAIL";
    NotificationChannel["PUSH"] = "PUSH";
    NotificationChannel["SMS"] = "SMS";
    NotificationChannel["IN_APP"] = "IN_APP";
})(NotificationChannel || (exports.NotificationChannel = NotificationChannel = {}));
var PetSpecies;
(function (PetSpecies) {
    PetSpecies["DOG"] = "DOG";
    PetSpecies["CAT"] = "CAT";
    PetSpecies["BIRD"] = "BIRD";
    PetSpecies["RABBIT"] = "RABBIT";
    PetSpecies["HAMSTER"] = "HAMSTER";
    PetSpecies["REPTILE"] = "REPTILE";
    PetSpecies["OTHER"] = "OTHER";
})(PetSpecies || (exports.PetSpecies = PetSpecies = {}));
var PetSex;
(function (PetSex) {
    PetSex["MALE"] = "MALE";
    PetSex["FEMALE"] = "FEMALE";
})(PetSex || (exports.PetSex = PetSex = {}));
var TenantPlan;
(function (TenantPlan) {
    TenantPlan["FREE"] = "FREE";
    TenantPlan["STARTER"] = "STARTER";
    TenantPlan["PRO"] = "PRO";
    TenantPlan["ENTERPRISE"] = "ENTERPRISE";
})(TenantPlan || (exports.TenantPlan = TenantPlan = {}));
exports.PLAN_MODULES = {
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
        PermissionModule.POS,
        PermissionModule.DISCOUNTS,
        PermissionModule.BRANCHES,
        PermissionModule.USERS,
        PermissionModule.TENANT_SETTINGS,
        PermissionModule.NOTIFICATIONS,
        PermissionModule.REPORTS,
        PermissionModule.FILES,
        PermissionModule.BILLING,
        PermissionModule.PASSPORT,
        PermissionModule.CONSENT,
        PermissionModule.MEMBERSHIPS,
        PermissionModule.HOME_VET,
        PermissionModule.POSTOP,
    ],
    [TenantPlan.ENTERPRISE]: Object.values(PermissionModule),
};
function filterPermissionsByPlan(permissions, plan) {
    const allowedModules = new Set(exports.PLAN_MODULES[plan] ?? []);
    return permissions.filter((permission) => {
        const [module] = permission.split(':');
        return allowedModules.has(module);
    });
}
function getEffectivePermissions(role, plan) {
    return filterPermissionsByPlan(getRolePermissions(role), plan);
}
__exportStar(require("./api-contract"), exports);
