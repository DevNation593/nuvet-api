import {
    AdoptionStatus,
    AppointmentStatus,
    AppointmentType,
    CashRegisterStatus,
    DiscountTargetType,
    DiscountType,
    NotificationChannel,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    PetSex,
    PetSpecies,
    PosItemType,
    PosTicketStatus,
    PrismaClient,
    TenantPlan,
    UserRole,
    VaccinationStatus,
    AestheticStatus,
    SurgeryStatus,
    StockMovementType,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PermissionModule, UserRole as SharedUserRole } from '@nuvet/types';

const prisma = new PrismaClient();
const SHARED_PASSWORD = 'Demo12345!';

type SeedTenant = { name: string; slug: string; plan: TenantPlan; email: string; phone: string; address: string };
type SeedUser = { email: string; firstName: string; lastName: string; role: UserRole; password: string; phone?: string };
type BasicUser = { id: string; email: string; role: UserRole; phone: string | null };
type UsersMap = Partial<Record<'owner' | 'client1' | 'client2' | 'vet' | 'receptionist' | 'groomer' | 'inventory' | 'adoptionManager', BasicUser>>;

const tenantsToSeed: SeedTenant[] = [
    { name: 'NuVet Free Demo', slug: 'demo-free', plan: TenantPlan.FREE, email: 'contacto@demo-free.com', phone: '+15550001001', address: '101 Free Avenue' },
    { name: 'NuVet Starter Demo', slug: 'demo-starter', plan: TenantPlan.STARTER, email: 'contacto@demo-starter.com', phone: '+15550001002', address: '202 Starter Street' },
    { name: 'NuVet Pro Demo', slug: 'demo-pro', plan: TenantPlan.PRO, email: 'contacto@demo-pro.com', phone: '+15550001003', address: '303 Pro Boulevard' },
    { name: 'NuVet Enterprise Demo', slug: 'demo-enterprise', plan: TenantPlan.ENTERPRISE, email: 'contacto@demo-enterprise.com', phone: '+15550001004', address: '404 Enterprise Road' },
];

const ownerUserByPlan: Record<TenantPlan, SeedUser> = {
    [TenantPlan.FREE]: { email: 'owner@demo-free.com', firstName: 'Owner', lastName: 'Free', role: UserRole.CLINIC_ADMIN, password: 'OwnerFree123!' },
    [TenantPlan.STARTER]: { email: 'owner@demo-starter.com', firstName: 'Owner', lastName: 'Starter', role: UserRole.CLINIC_ADMIN, password: 'OwnerStarter123!' },
    [TenantPlan.PRO]: { email: 'owner@demo-pro.com', firstName: 'Owner', lastName: 'Pro', role: UserRole.CLINIC_ADMIN, password: 'OwnerPro123!' },
    [TenantPlan.ENTERPRISE]: { email: 'owner@demo-enterprise.com', firstName: 'Owner', lastName: 'Enterprise', role: UserRole.CLINIC_ADMIN, password: 'OwnerEnterprise123!' },
};

const modulesByPlan: Record<TenantPlan, PermissionModule[]> = {
    [TenantPlan.FREE]: [PermissionModule.APPOINTMENTS, PermissionModule.PETS, PermissionModule.CLIENTS, PermissionModule.NOTIFICATIONS],
    [TenantPlan.STARTER]: [PermissionModule.APPOINTMENTS, PermissionModule.PETS, PermissionModule.CLIENTS, PermissionModule.MEDICAL_RECORDS, PermissionModule.VACCINATIONS, PermissionModule.NOTIFICATIONS, PermissionModule.REPORTS],
    [TenantPlan.PRO]: [PermissionModule.APPOINTMENTS, PermissionModule.PETS, PermissionModule.CLIENTS, PermissionModule.MEDICAL_RECORDS, PermissionModule.VACCINATIONS, PermissionModule.AESTHETICS, PermissionModule.SURGERIES, PermissionModule.STORE, PermissionModule.INVENTORY, PermissionModule.NOTIFICATIONS, PermissionModule.REPORTS, PermissionModule.FILES, PermissionModule.DISCOUNTS, PermissionModule.BRANCHES, PermissionModule.POS],
    [TenantPlan.ENTERPRISE]: Object.values(PermissionModule),
};

const featuresByPlan = {
    [TenantPlan.FREE]: { medical: false, vaccines: false, aesthetics: false, surgery: false, store: false, adoptions: false, discounts: false, branches: false, pos: false },
    [TenantPlan.STARTER]: { medical: true, vaccines: true, aesthetics: false, surgery: false, store: false, adoptions: false, discounts: false, branches: false, pos: false },
    [TenantPlan.PRO]: { medical: true, vaccines: true, aesthetics: true, surgery: true, store: true, adoptions: false, discounts: true, branches: true, pos: true },
    [TenantPlan.ENTERPRISE]: { medical: true, vaccines: true, aesthetics: true, surgery: true, store: true, adoptions: true, discounts: true, branches: true, pos: true },
} as const;

const days = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};
const at = (base: Date, h: number, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);

async function resetDatabase() {
    await prisma.posRefund.deleteMany();
    await prisma.posPayment.deleteMany();
    await prisma.posTicketItem.deleteMany();
    await prisma.posTicket.deleteMany();
    await prisma.cashRegister.deleteMany();
    await prisma.discountUsage.deleteMany();
    await prisma.discount.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.appointmentAuditLog.deleteMany();
    await prisma.medicalRecordAttachment.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.productBatch.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.notificationTemplate.deleteMany();
    await prisma.medicalRecord.deleteMany();
    await prisma.vaccination.deleteMany();
    await prisma.aestheticService.deleteMany();
    await prisma.surgery.deleteMany();
    await prisma.adoption.deleteMany();
    await prisma.order.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.product.deleteMany();
    await prisma.block.deleteMany();
    await prisma.staffSchedule.deleteMany();
    await prisma.holiday.deleteMany();
    await prisma.clinicHours.deleteMany();
    await prisma.pet.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.tenant.deleteMany();
}

async function createUser(tenantId: string, u: SeedUser): Promise<BasicUser> {
    return prisma.user.create({
        data: {
            tenantId,
            email: u.email,
            passwordHash: await bcrypt.hash(u.password, 12),
            firstName: u.firstName,
            lastName: u.lastName,
            role: u.role,
            phone: u.phone,
        },
        select: { id: true, email: true, role: true, phone: true },
    });
}

function buildUsersByPlan(tenant: SeedTenant, idx: number): Record<string, SeedUser> {
    const n = `+15550004${idx + 1}`;
    const users: Record<string, SeedUser> = {
        owner: ownerUserByPlan[tenant.plan],
        client1: { email: `client.one@${tenant.slug}.com`, firstName: 'Cliente', lastName: 'Uno', role: UserRole.CLIENT, password: SHARED_PASSWORD, phone: `${n}01` },
    };
    if (tenant.plan !== TenantPlan.FREE) {
        users.vet = { email: `vet@${tenant.slug}.com`, firstName: 'Victor', lastName: 'Vet', role: UserRole.VET, password: SHARED_PASSWORD, phone: `${n}02` };
        users.receptionist = { email: `reception@${tenant.slug}.com`, firstName: 'Rita', lastName: 'Front', role: UserRole.RECEPTIONIST, password: SHARED_PASSWORD, phone: `${n}03` };
    }
    if (tenant.plan === TenantPlan.PRO || tenant.plan === TenantPlan.ENTERPRISE) {
        users.groomer = { email: `groomer@${tenant.slug}.com`, firstName: 'Gina', lastName: 'Groomer', role: UserRole.GROOMER, password: SHARED_PASSWORD, phone: `${n}04` };
        users.inventory = { email: `inventory@${tenant.slug}.com`, firstName: 'Ivan', lastName: 'Stock', role: UserRole.INVENTORY, password: SHARED_PASSWORD, phone: `${n}05` };
    }
    if (tenant.plan === TenantPlan.ENTERPRISE) {
        users.adoptionManager = { email: `adoptions@${tenant.slug}.com`, firstName: 'Ada', lastName: 'Adoption', role: UserRole.ADOPTION_MANAGER, password: SHARED_PASSWORD, phone: `${n}06` };
        users.client2 = { email: `client.two@${tenant.slug}.com`, firstName: 'Cliente', lastName: 'Dos', role: UserRole.CLIENT, password: SHARED_PASSWORD, phone: `${n}07` };
    }
    return users;
}

async function seedCommonTenantData(tenantId: string, users: UsersMap) {
    await prisma.refreshToken.createMany({
        data: [
            { userId: users.owner!.id, token: `seed-refresh-${users.owner!.id}`, expiresAt: days(30) },
            { userId: users.client1!.id, token: `seed-refresh-${users.client1!.id}`, expiresAt: days(15) },
        ],
    });
    await prisma.clinicHours.createMany({
        data: [
            { tenantId, dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
            { tenantId, dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId, dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId, dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId, dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId, dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId, dayOfWeek: 6, openTime: '09:00', closeTime: '14:00', isClosed: false },
        ],
    });
    if (users.vet) {
        await prisma.staffSchedule.createMany({ data: [1, 2, 3, 4, 5].map((d) => ({ tenantId, userId: users.vet!.id, dayOfWeek: d, startTime: '08:00', endTime: '17:00' })) });
    }
    if (users.groomer) {
        await prisma.staffSchedule.createMany({ data: [1, 3, 5].map((d) => ({ tenantId, userId: users.groomer!.id, dayOfWeek: d, startTime: '09:00', endTime: '16:00' })) });
    }
    await prisma.block.create({ data: { tenantId, userId: users.vet?.id, startAt: at(days(1), 12), endAt: at(days(1), 13), reason: 'Bloque demo' } });
    await prisma.holiday.create({ data: { tenantId, date: at(days(20), 0), name: 'Feriado demo' } });
}

async function seedPetsAndAppointments(tenantId: string, users: UsersMap, plan: TenantPlan) {
    const pet1 = await prisma.pet.create({
        data: { tenantId, ownerId: users.client1!.id, name: 'Luna', species: PetSpecies.DOG, breed: 'Mestizo', sex: PetSex.FEMALE, birthDate: days(-700), weight: 12.4, isNeutered: true },
        select: { id: true, name: true },
    });
    const pet2 = await prisma.pet.create({
        data: { tenantId, ownerId: users.client1!.id, name: 'Max', species: PetSpecies.CAT, breed: 'Mestizo', sex: PetSex.MALE, birthDate: days(-400), weight: 4.2, isNeutered: false },
        select: { id: true, name: true },
    });
    const rescueA = plan === TenantPlan.ENTERPRISE ? await prisma.pet.create({ data: { tenantId, ownerId: (users.adoptionManager ?? users.owner)!.id, name: 'Nala', species: PetSpecies.DOG, sex: PetSex.FEMALE, breed: 'Mestiza', birthDate: days(-500), weight: 10.1 }, select: { id: true, name: true } }) : null;
    const rescueB = plan === TenantPlan.ENTERPRISE ? await prisma.pet.create({ data: { tenantId, ownerId: (users.adoptionManager ?? users.owner)!.id, name: 'Simba', species: PetSpecies.CAT, sex: PetSex.MALE, breed: 'Mestizo', birthDate: days(-300), weight: 3.1 }, select: { id: true, name: true } }) : null;

    const consult = await prisma.appointment.create({
        data: { tenantId, petId: pet1.id, vetId: users.vet?.id, type: AppointmentType.CONSULTATION, status: AppointmentStatus.COMPLETED, scheduledAt: at(days(-2), 10), durationMinutes: 30, notes: 'Consulta demo' },
        select: { id: true, scheduledAt: true },
    });
    const checkup = await prisma.appointment.create({
        data: { tenantId, petId: pet2.id, vetId: users.vet?.id, type: AppointmentType.CHECKUP, status: AppointmentStatus.SCHEDULED, scheduledAt: at(days(1), 15, 30), durationMinutes: 30, notes: 'Chequeo demo' },
        select: { id: true, scheduledAt: true },
    });
    const aestheticAppointment = users.groomer
        ? await prisma.appointment.create({
              data: { tenantId, petId: pet2.id, groomerId: users.groomer.id, type: AppointmentType.AESTHETICS, status: AppointmentStatus.CONFIRMED, scheduledAt: at(days(2), 11), durationMinutes: 45 },
              select: { id: true, scheduledAt: true },
          })
        : null;
    const surgeryAppointment = plan === TenantPlan.ENTERPRISE && users.vet
        ? await prisma.appointment.create({
              data: { tenantId, petId: pet1.id, vetId: users.vet.id, type: AppointmentType.SURGERY, status: AppointmentStatus.CONFIRMED, scheduledAt: at(days(4), 9), durationMinutes: 90, notes: 'Cirugía demo' },
              select: { id: true, scheduledAt: true },
          })
        : null;

    await prisma.appointmentAuditLog.createMany({
        data: [
            { appointmentId: consult.id, fromStatus: AppointmentStatus.SCHEDULED, toStatus: AppointmentStatus.COMPLETED, changedBy: (users.vet ?? users.owner)!.id },
            { appointmentId: checkup.id, fromStatus: AppointmentStatus.SCHEDULED, toStatus: AppointmentStatus.SCHEDULED, changedBy: (users.receptionist ?? users.owner)!.id },
        ],
    });

    return { pet1, pet2, rescueA, rescueB, consult, checkup, aestheticAppointment, surgeryAppointment, appointmentsCount: 2 + (aestheticAppointment ? 1 : 0) + (surgeryAppointment ? 1 : 0) };
}

async function seedMedicalAndVaccines(tenantId: string, users: UsersMap, refs: Awaited<ReturnType<typeof seedPetsAndAppointments>>) {
    const vetId = (users.vet ?? users.owner)!.id;
    const mr = await prisma.medicalRecord.create({
        data: {
            tenantId, petId: refs.pet1.id, vetId, appointmentId: refs.consult.id,
            chiefComplaint: 'Chequeo', diagnosis: 'Estable', treatment: 'Control anual', prescriptions: 'Vitaminas', notes: 'Registro demo',
            attachments: ['https://files.example.com/demo/checkup.pdf'], weight: 12.1, temperature: 38.2, heartRate: 95,
        },
        select: { id: true },
    });
    await prisma.medicalRecordAttachment.create({ data: { tenantId, medicalRecordId: mr.id, key: `tenants/${tenantId}/medical-records/${mr.id}/checkup.pdf`, filename: 'checkup.pdf', contentType: 'application/pdf', size: 120000, uploadedBy: vetId } });
    await prisma.vaccination.createMany({
        data: [
            { tenantId, petId: refs.pet2.id, vetId, appointmentId: refs.checkup.id, vaccineName: 'Vacuna anual', manufacturer: 'VetPharma', batchNumber: 'VAC-001', dose: 1, administeredAt: refs.checkup.scheduledAt, nextDueAt: days(365), status: VaccinationStatus.SCHEDULED, notes: 'Pendiente' },
            { tenantId, petId: refs.pet1.id, vetId, vaccineName: 'Antirrábica', manufacturer: 'CaniVac', batchNumber: 'RAB-001', dose: 1, administeredAt: days(-120), nextDueAt: days(30), status: VaccinationStatus.ADMINISTERED, notes: 'OK' },
        ],
    });
}

async function seedAestheticsAndSurgery(tenantId: string, users: UsersMap, refs: Awaited<ReturnType<typeof seedPetsAndAppointments>>) {
    if (users.groomer && refs.aestheticAppointment) {
        await prisma.aestheticService.create({ data: { tenantId, petId: refs.pet2.id, groomerId: users.groomer.id, appointmentId: refs.aestheticAppointment.id, serviceName: 'Baño + corte', status: AestheticStatus.SCHEDULED, scheduledAt: refs.aestheticAppointment.scheduledAt, price: 25 } });
    }
    if (users.vet && refs.surgeryAppointment) {
        await prisma.surgery.create({ data: { tenantId, petId: refs.pet1.id, vetId: users.vet.id, appointmentId: refs.surgeryAppointment.id, type: 'Cirugía menor', status: SurgeryStatus.SCHEDULED, scheduledAt: refs.surgeryAppointment.scheduledAt, preInstructions: 'Ayuno 8 horas', postInstructions: 'Reposo 24h', anesthesiaType: 'General', durationMinutes: 60 } });
    }
}

async function seedStore(tenantId: string, users: UsersMap) {
    const p1 = await prisma.product.create({ data: { tenantId, name: 'Alimento Premium 5kg', sku: `FOOD-${tenantId.slice(0, 6)}-001`, category: 'Alimentos', price: 29.9, stock: 12, lowStockThreshold: 4 }, select: { id: true, price: true } });
    const p2 = await prisma.product.create({ data: { tenantId, name: 'Shampoo Hipoalergénico', sku: `GROOM-${tenantId.slice(0, 6)}-001`, category: 'Estética', price: 14.5, stock: 3, lowStockThreshold: 5 }, select: { id: true, price: true } });
    await prisma.productBatch.createMany({ data: [{ tenantId, productId: p1.id, batchNumber: `B-${tenantId.slice(0, 4)}-1`, quantity: 12, expiryDate: days(180) }, { tenantId, productId: p2.id, batchNumber: `B-${tenantId.slice(0, 4)}-2`, quantity: 3, expiryDate: days(120) }] });
    await prisma.stockMovement.createMany({ data: [{ tenantId, productId: p1.id, type: StockMovementType.IN, quantity: 12, reason: 'Carga inicial', userId: (users.inventory ?? users.owner)!.id }, { tenantId, productId: p2.id, type: StockMovementType.IN, quantity: 3, reason: 'Carga inicial', userId: (users.inventory ?? users.owner)!.id }] });
    const subtotal = Number((p1.price + p2.price).toFixed(2)); const tax = Number((subtotal * 0.12).toFixed(2)); const total = Number((subtotal + tax).toFixed(2));
    const order = await prisma.order.create({ data: { tenantId, clientId: users.client1!.id, subtotal, tax, total, status: OrderStatus.COMPLETED, notes: 'Pedido demo' }, select: { id: true } });
    await prisma.orderItem.createMany({ data: [{ tenantId, orderId: order.id, productId: p1.id, quantity: 1, unitPrice: p1.price, total: p1.price }, { tenantId, orderId: order.id, productId: p2.id, quantity: 1, unitPrice: p2.price, total: p2.price }] });
    await prisma.payment.create({ data: { tenantId, orderId: order.id, amount: total, method: PaymentMethod.CARD, status: PaymentStatus.COMPLETED, externalId: `seed-${order.id}` } });
    return 2;
}

async function seedAdoptions(tenantId: string, users: UsersMap, refs: Awaited<ReturnType<typeof seedPetsAndAppointments>>) {
    if (!refs.rescueA || !refs.rescueB) return 0;
    await prisma.adoption.createMany({
        data: [
            { tenantId, petId: refs.rescueA.id, status: AdoptionStatus.AVAILABLE, notes: 'Disponible' },
            { tenantId, petId: refs.rescueB.id, applicantId: users.client2?.id, status: AdoptionStatus.PENDING, applicantName: 'Cliente Dos', applicantEmail: users.client2?.email, applicantPhone: users.client2?.phone ?? undefined, notes: 'Solicitud demo' },
        ],
    });
    return 2;
}

async function seedBranches(tenantId: string, plan: TenantPlan): Promise<{ main: string; secondary?: string }> {
    const main = await prisma.branch.create({
        data: { tenantId, name: 'Sede Principal', address: 'Calle Principal 100', phone: '+15550009001', email: `principal@${plan.toLowerCase()}.nuvet.local`, isMain: true },
        select: { id: true },
    });
    if (plan === TenantPlan.ENTERPRISE) {
        const secondary = await prisma.branch.create({
            data: { tenantId, name: 'Sucursal Norte', address: 'Av. Norte 200', phone: '+15550009002', email: `norte@${plan.toLowerCase()}.nuvet.local`, isMain: false },
            select: { id: true },
        });
        return { main: main.id, secondary: secondary.id };
    }
    return { main: main.id };
}

async function seedDiscounts(tenantId: string, plan: TenantPlan, productIds: string[]) {
    const now = new Date();
    const discounts = [
        {
            tenantId, name: '10% en consultas', description: 'Descuento del 10% en consultas veterinarias',
            type: DiscountType.PERCENTAGE, value: 10, targetType: DiscountTargetType.SERVICE,
            serviceType: 'CONSULTATION', startAt: now, endAt: days(90), isActive: true,
        },
        {
            tenantId, name: '$5 descuento en alimentos', description: 'Descuento fijo de $5 en categoría Alimentos',
            type: DiscountType.FIXED, value: 5, targetType: DiscountTargetType.PRODUCT_CATEGORY,
            category: 'Alimentos', minAmount: 20, startAt: now, endAt: days(60), isActive: true,
        },
    ];
    if (plan === TenantPlan.ENTERPRISE && productIds.length > 0) {
        discounts.push({
            tenantId, name: '2x1 en Shampoo', description: 'Compra 2, lleva 1 gratis',
            type: DiscountType.BUY_X_GET_Y, value: 0, targetType: DiscountTargetType.PRODUCT,
            startAt: now, endAt: days(45), isActive: true,
            buyQuantity: 2, getQuantity: 1, targetId: productIds[1],
        } as any);
        discounts.push({
            tenantId, name: '15% en todos los servicios', description: 'Descuento del 15% en todos los servicios',
            type: DiscountType.PERCENTAGE, value: 15, targetType: DiscountTargetType.ALL_SERVICES,
            startAt: now, endAt: days(30), isActive: true, maxUses: 50,
        } as any);
    }
    for (const d of discounts) await prisma.discount.create({ data: d });
    return discounts.length;
}

async function seedPOS(tenantId: string, users: UsersMap, branchIds: { main: string; secondary?: string }, productIds: string[]) {
    const cashier = users.receptionist ?? users.owner;
    const register = await prisma.cashRegister.create({
        data: { tenantId, branchId: branchIds.main, openedById: cashier!.id, status: CashRegisterStatus.OPEN, openingBalance: 100 },
        select: { id: true },
    });

    // Ticket completado
    const ticket1 = await prisma.posTicket.create({
        data: {
            tenantId, branchId: branchIds.main, registerId: register.id, clientId: users.client1?.id,
            subtotal: 44.4, tax: 5.33, total: 49.73, status: PosTicketStatus.COMPLETED, createdById: cashier!.id,
        },
        select: { id: true },
    });
    if (productIds.length >= 2) {
        await prisma.posTicketItem.createMany({
            data: [
                { ticketId: ticket1.id, type: PosItemType.PRODUCT, productId: productIds[0], description: 'Alimento Premium 5kg', quantity: 1, unitPrice: 29.9, total: 29.9 },
                { ticketId: ticket1.id, type: PosItemType.PRODUCT, productId: productIds[1], description: 'Shampoo Hipoalergénico', quantity: 1, unitPrice: 14.5, total: 14.5 },
            ],
        });
    }
    await prisma.posPayment.create({ data: { ticketId: ticket1.id, method: PaymentMethod.CARD, amount: 49.73 } });

    // Ticket abierto
    const ticket2 = await prisma.posTicket.create({
        data: {
            tenantId, branchId: branchIds.main, registerId: register.id,
            subtotal: 25, tax: 3, total: 28, status: PosTicketStatus.OPEN, createdById: cashier!.id,
        },
        select: { id: true },
    });
    await prisma.posTicketItem.create({
        data: { ticketId: ticket2.id, type: PosItemType.SERVICE, description: 'Baño básico', quantity: 1, unitPrice: 25, total: 25 },
    });

    // Ticket con reembolso (solo Enterprise)
    if (branchIds.secondary && users.client2) {
        const ticket3 = await prisma.posTicket.create({
            data: {
                tenantId, branchId: branchIds.secondary, registerId: register.id, clientId: users.client2.id,
                subtotal: 29.9, tax: 3.59, total: 33.49, status: PosTicketStatus.REFUNDED, createdById: cashier!.id,
            },
            select: { id: true },
        });
        if (productIds.length > 0) {
            await prisma.posTicketItem.create({ data: { ticketId: ticket3.id, type: PosItemType.PRODUCT, productId: productIds[0], description: 'Alimento Premium 5kg', quantity: 1, unitPrice: 29.9, total: 29.9 } });
        }
        await prisma.posPayment.create({ data: { ticketId: ticket3.id, method: PaymentMethod.CASH, amount: 33.49 } });
        await prisma.posRefund.create({ data: { ticketId: ticket3.id, tenantId, amount: 33.49, reason: 'Producto en mal estado', refundedById: cashier!.id } });
    }
}

async function seedNotificationsAndLogs(tenantId: string, users: UsersMap, plan: TenantPlan) {
    await prisma.notificationTemplate.create({ data: { tenantId, key: 'appointment_reminder', channel: NotificationChannel.EMAIL, subject: 'Recordatorio de cita', bodyTemplate: `Template ${plan} {{clientName}} {{date}}`, isSystem: false } });
    await prisma.notification.createMany({ data: [{ tenantId, userId: users.owner!.id, title: 'Seed completada', body: `Plan ${plan}`, channel: NotificationChannel.IN_APP, data: { plan } }, { tenantId, userId: users.client1!.id, title: 'Bienvenido', body: 'Datos demo cargados', channel: NotificationChannel.EMAIL, data: { role: 'CLIENT' } }] });
    await prisma.auditLog.create({ data: { tenantId, userId: users.owner!.id, action: 'SEED', entity: 'TENANT', entityId: tenantId, newData: { plan }, ipAddress: '127.0.0.1', userAgent: 'seed.full.ts' } });
}

async function createTenantDataset(tenant: SeedTenant, idx: number) {
    const t = await prisma.tenant.create({ data: { ...tenant, website: `https://${tenant.slug}.nuvet.local` }, select: { id: true, slug: true, plan: true } });
    const userSeeds = buildUsersByPlan(tenant, idx);
    const users: UsersMap = {};
    const creds: Array<{ email: string; role: UserRole; password: string }> = [];
    for (const key of Object.keys(userSeeds)) {
        const created = await createUser(t.id, userSeeds[key]);
        (users as Record<string, BasicUser>)[key] = created;
        creds.push({ email: userSeeds[key].email, role: userSeeds[key].role, password: userSeeds[key].password });
    }

    // Crear sucursales antes de seedCommonTenantData para poder asignar branchId
    const features = featuresByPlan[tenant.plan];
    let branchIds: { main: string; secondary?: string } | null = null;
    if (features.branches) {
        branchIds = await seedBranches(t.id, tenant.plan);
        // Asignar usuarios a la sucursal principal
        for (const key of Object.keys(users)) {
            await prisma.user.update({ where: { id: (users as Record<string, BasicUser>)[key].id }, data: { branchId: branchIds.main } });
        }
        // En Enterprise, mover client2 y adoptionManager a sucursal secundaria
        if (branchIds.secondary) {
            if (users.client2) await prisma.user.update({ where: { id: users.client2.id }, data: { branchId: branchIds.secondary } });
            if (users.adoptionManager) await prisma.user.update({ where: { id: users.adoptionManager.id }, data: { branchId: branchIds.secondary } });
        }
    }

    await seedCommonTenantData(t.id, users);
    const refs = await seedPetsAndAppointments(t.id, users, tenant.plan);
    if (features.medical || features.vaccines) await seedMedicalAndVaccines(t.id, users, refs);
    if (features.aesthetics || features.surgery) await seedAestheticsAndSurgery(t.id, users, refs);
    const products = features.store ? await seedStore(t.id, users) : 0;
    const adoptions = features.adoptions ? await seedAdoptions(t.id, users, refs) : 0;

    // Recopilar IDs de productos para descuentos y POS
    const productRecords = await prisma.product.findMany({ where: { tenantId: t.id }, select: { id: true }, orderBy: { createdAt: 'asc' } });
    const productIds = productRecords.map((p) => p.id);

    const discountsCount = features.discounts ? await seedDiscounts(t.id, tenant.plan, productIds) : 0;
    if (features.pos && branchIds) await seedPOS(t.id, users, branchIds, productIds);

    await seedNotificationsAndLogs(t.id, users, tenant.plan);

    return { tenant: t, users: creds, counts: { users: creds.length, pets: tenant.plan === TenantPlan.ENTERPRISE ? 4 : 2, appointments: refs.appointmentsCount, products, adoptions, discounts: discountsCount, branches: branchIds ? (branchIds.secondary ? 2 : 1) : 0 } };
}

async function main() {
    console.log('Iniciando seed completa por planes (reset total)...');
    await resetDatabase();
    await prisma.notificationTemplate.createMany({
        data: [
            { tenantId: null, key: 'appointment_reminder', channel: NotificationChannel.EMAIL, subject: 'Recordatorio', bodyTemplate: 'Hola {{clientName}}, recuerda tu cita {{date}}', isSystem: true },
            { tenantId: null, key: 'low_stock_alert', channel: NotificationChannel.IN_APP, subject: null, bodyTemplate: 'Stock bajo de {{productName}}', isSystem: true },
        ],
    });

    const results: Array<Awaited<ReturnType<typeof createTenantDataset>>> = [];
    for (const [idx, tenant] of tenantsToSeed.entries()) results.push(await createTenantDataset(tenant, idx));

    console.log('Seed completa finalizada.');
    console.log({
        notes: {
            sharedPasswordForNonOwners: SHARED_PASSWORD,
            ownerPasswords: Object.fromEntries(Object.entries(ownerUserByPlan).map(([plan, user]) => [plan, { email: user.email, password: user.password }])),
        },
        tenants: results.map((r) => ({ ...r.tenant, counts: r.counts, users: r.users })),
        planProfiles: Object.values(TenantPlan).map((plan) => ({ plan, ownerRole: SharedUserRole.CLINIC_ADMIN, modules: modulesByPlan[plan], modulesCount: modulesByPlan[plan].length, features: featuresByPlan[plan] })),
    });
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => prisma.$disconnect());
