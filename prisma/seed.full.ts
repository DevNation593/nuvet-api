import {
    AdoptionStatus,
    AppointmentStatus,
    AppointmentType,
    CashRegisterStatus,
    DiscountTargetType,
    DiscountType,
    NotificationChannel,
    PaymentMethod,
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

type BasicUser = { id: string; email: string; role: UserRole; phone: string | null };

const days = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d;
};
const at = (base: Date, h: number, m = 0) => new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];

// ── Datos maestros ───────────────────────────────────────────────────────────

const PRODUCTS = [
    { name: 'Alimento Premium Perro 5kg', sku: 'FOOD-DOG-5KG', category: 'Alimentos', price: 29.90, stock: 25, lowStockThreshold: 5 },
    { name: 'Alimento Premium Gato 3kg', sku: 'FOOD-CAT-3KG', category: 'Alimentos', price: 22.50, stock: 18, lowStockThreshold: 4 },
    { name: 'Alimento Cachorro 2kg', sku: 'FOOD-PUP-2KG', category: 'Alimentos', price: 18.75, stock: 15, lowStockThreshold: 3 },
    { name: 'Snacks Dentales x12', sku: 'SNACK-DENT-12', category: 'Alimentos', price: 8.50, stock: 40, lowStockThreshold: 10 },
    { name: 'Shampoo Hipoalergénico 500ml', sku: 'GROOM-SHAMP-500', category: 'Estética', price: 14.50, stock: 12, lowStockThreshold: 3 },
    { name: 'Acondicionador Pelaje Largo', sku: 'GROOM-COND-500', category: 'Estética', price: 12.00, stock: 8, lowStockThreshold: 2 },
    { name: 'Antipulgas Collar 60cm', sku: 'MED-COLLAR-60', category: 'Medicamentos', price: 16.00, stock: 20, lowStockThreshold: 5 },
    { name: 'Desparasitante Oral 10kg', sku: 'MED-DESP-10KG', category: 'Medicamentos', price: 9.80, stock: 30, lowStockThreshold: 8 },
    { name: 'Vitaminas Multivitamínico 60 tabs', sku: 'MED-VITA-60', category: 'Medicamentos', price: 15.00, stock: 22, lowStockThreshold: 5 },
    { name: 'Juguete Hueso Dental', sku: 'ACC-HUESO-01', category: 'Accesorios', price: 6.50, stock: 35, lowStockThreshold: 8 },
    { name: 'Cama Ortopédica Mediana', sku: 'ACC-CAMA-MED', category: 'Accesorios', price: 45.00, stock: 5, lowStockThreshold: 2 },
    { name: 'Correa Retráctil 5m', sku: 'ACC-CORREA-5M', category: 'Accesorios', price: 19.90, stock: 10, lowStockThreshold: 3 },
    { name: 'Arena Sanitaria 10L', sku: 'CAT-ARENA-10L', category: 'Gatos', price: 11.50, stock: 28, lowStockThreshold: 6 },
    { name: 'Rascador Torre 3 niveles', sku: 'CAT-RASCADOR-3', category: 'Gatos', price: 38.00, stock: 3, lowStockThreshold: 2 },
    { name: 'Transportador Plástico M', sku: 'ACC-TRANSP-M', category: 'Accesorios', price: 32.00, stock: 7, lowStockThreshold: 2 },
];

const CLIENTS = [
    { firstName: 'María', lastName: 'González', email: 'maria.gonzalez', phone: '+593991000001', identification: '0912345678' },
    { firstName: 'Carlos', lastName: 'Rodríguez', email: 'carlos.rodriguez', phone: '+593991000002', identification: '0923456789' },
    { firstName: 'Ana', lastName: 'Martínez', email: 'ana.martinez', phone: '+593991000003', identification: '0934567890' },
    { firstName: 'Luis', lastName: 'Pérez', email: 'luis.perez', phone: '+593991000004', identification: '0945678901' },
    { firstName: 'Sofía', lastName: 'López', email: 'sofia.lopez', phone: '+593991000005', identification: '0956789012' },
    { firstName: 'Diego', lastName: 'Herrera', email: 'diego.herrera', phone: '+593991000006', identification: '0967890123' },
    { firstName: 'Valentina', lastName: 'Torres', email: 'valentina.torres', phone: '+593991000007', identification: '0978901234' },
    { firstName: 'Andrés', lastName: 'Morales', email: 'andres.morales', phone: '+593991000008', identification: '0989012345' },
];

const PETS: Array<{ name: string; species: PetSpecies; breed: string; sex: PetSex; birthDaysAgo: number; weight: number; isNeutered: boolean }> = [
    { name: 'Luna', species: PetSpecies.DOG, breed: 'Golden Retriever', sex: PetSex.FEMALE, birthDaysAgo: 730, weight: 28.5, isNeutered: true },
    { name: 'Max', species: PetSpecies.DOG, breed: 'Pastor Alemán', sex: PetSex.MALE, birthDaysAgo: 1095, weight: 34.2, isNeutered: true },
    { name: 'Milo', species: PetSpecies.CAT, breed: 'Siamés', sex: PetSex.MALE, birthDaysAgo: 400, weight: 4.1, isNeutered: false },
    { name: 'Coco', species: PetSpecies.DOG, breed: 'French Bulldog', sex: PetSex.MALE, birthDaysAgo: 540, weight: 11.8, isNeutered: true },
    { name: 'Bella', species: PetSpecies.CAT, breed: 'Persa', sex: PetSex.FEMALE, birthDaysAgo: 900, weight: 3.8, isNeutered: true },
    { name: 'Rocky', species: PetSpecies.DOG, breed: 'Rottweiler', sex: PetSex.MALE, birthDaysAgo: 1460, weight: 42.0, isNeutered: false },
    { name: 'Nina', species: PetSpecies.DOG, breed: 'Poodle', sex: PetSex.FEMALE, birthDaysAgo: 365, weight: 6.2, isNeutered: false },
    { name: 'Simba', species: PetSpecies.CAT, breed: 'Bengalí', sex: PetSex.MALE, birthDaysAgo: 300, weight: 5.5, isNeutered: false },
    { name: 'Toby', species: PetSpecies.DOG, breed: 'Labrador', sex: PetSex.MALE, birthDaysAgo: 820, weight: 30.1, isNeutered: true },
    { name: 'Mía', species: PetSpecies.CAT, breed: 'Maine Coon', sex: PetSex.FEMALE, birthDaysAgo: 600, weight: 6.8, isNeutered: true },
    { name: 'Thor', species: PetSpecies.DOG, breed: 'Husky Siberiano', sex: PetSex.MALE, birthDaysAgo: 500, weight: 24.0, isNeutered: false },
    { name: 'Nala', species: PetSpecies.DOG, breed: 'Mestiza', sex: PetSex.FEMALE, birthDaysAgo: 700, weight: 15.3, isNeutered: true },
    { name: 'Oliver', species: PetSpecies.CAT, breed: 'British Shorthair', sex: PetSex.MALE, birthDaysAgo: 450, weight: 5.0, isNeutered: true },
    { name: 'Lola', species: PetSpecies.DOG, breed: 'Chihuahua', sex: PetSex.FEMALE, birthDaysAgo: 1200, weight: 2.3, isNeutered: true },
    { name: 'Kira', species: PetSpecies.RABBIT, breed: 'Mini Lop', sex: PetSex.FEMALE, birthDaysAgo: 200, weight: 1.8, isNeutered: false },
];

// ── Reset ────────────────────────────────────────────────────────────────────

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
    await prisma.tenantConfig.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.tenant.deleteMany();
}

// ── Seed principal para un tenant PRO/Enterprise ─────────────────────────────

async function seedFullTenant() {
    const hash = await bcrypt.hash('Admin12345!', 12);
    const clientHash = await bcrypt.hash(SHARED_PASSWORD, 12);

    // Tenant
    const tenant = await prisma.tenant.create({
        data: {
            name: 'Clínica Veterinaria NuVet Tech',
            slug: 'nuvet-clinic',
            plan: TenantPlan.PRO,
            email: 'admin@nuvet-clinic.com',
            phone: '+593991234567',
            address: 'Av. de los Shyris N34-152, Quito, Ecuador',
            website: 'https://nuvet-clinic.com',
        },
    });

    // Configuración del tenant (facturación)
    await prisma.tenantConfig.create({
        data: {
            tenantId: tenant.id,
            billingApiKey: null,
            billingApiSecret: null,
            billingEstablishmentCode: '001',
            billingEmissionPointCode: '001',
        },
    });

    // Sucursales
    const mainBranch = await prisma.branch.create({
        data: { tenantId: tenant.id, name: 'Sede Principal - Quito Norte', address: 'Av. de los Shyris N34-152', phone: '+593991234567', email: 'norte@nuvet-clinic.com', isMain: true },
    });
    const secondBranch = await prisma.branch.create({
        data: { tenantId: tenant.id, name: 'Sucursal Sur', address: 'Av. Maldonado S12-45', phone: '+593991234568', email: 'sur@nuvet-clinic.com', isMain: false },
    });

    // Staff
    const admin = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: mainBranch.id, email: 'admin@nuvet-clinic.com', passwordHash: hash, firstName: 'Stiwar', lastName: 'Saltos', role: UserRole.CLINIC_ADMIN, phone: '+593991234567', identification: '1712345678' },
    });
    const vet1 = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: mainBranch.id, email: 'dr.garcia@nuvet-clinic.com', passwordHash: hash, firstName: 'Roberto', lastName: 'García', role: UserRole.VET, phone: '+593992000001', identification: '1723456789' },
    });
    const vet2 = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: secondBranch.id, email: 'dra.mendez@nuvet-clinic.com', passwordHash: hash, firstName: 'Patricia', lastName: 'Méndez', role: UserRole.VET, phone: '+593992000002', identification: '1734567890' },
    });
    const receptionist = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: mainBranch.id, email: 'recepcion@nuvet-clinic.com', passwordHash: hash, firstName: 'Camila', lastName: 'Vega', role: UserRole.RECEPTIONIST, phone: '+593992000003' },
    });
    const groomer = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: mainBranch.id, email: 'estetica@nuvet-clinic.com', passwordHash: hash, firstName: 'Daniela', lastName: 'Ramos', role: UserRole.GROOMER, phone: '+593992000004' },
    });
    const inventoryUser = await prisma.user.create({
        data: { tenantId: tenant.id, branchId: mainBranch.id, email: 'inventario@nuvet-clinic.com', passwordHash: hash, firstName: 'Fernando', lastName: 'Ortiz', role: UserRole.INVENTORY, phone: '+593992000005' },
    });

    // Clientes
    const clients: BasicUser[] = [];
    for (const c of CLIENTS) {
        const user = await prisma.user.create({
            data: {
                tenantId: tenant.id,
                email: `${c.email}@nuvet-clinic.com`,
                passwordHash: clientHash,
                firstName: c.firstName,
                lastName: c.lastName,
                role: UserRole.CLIENT,
                phone: c.phone,
                identification: c.identification,
            },
            select: { id: true, email: true, role: true, phone: true },
        });
        clients.push(user);
    }

    // Mascotas
    const pets: Array<{ id: string; name: string; ownerId: string }> = [];
    for (let i = 0; i < PETS.length; i++) {
        const p = PETS[i];
        const owner = clients[i % clients.length];
        const pet = await prisma.pet.create({
            data: {
                tenantId: tenant.id,
                ownerId: owner.id,
                name: p.name,
                species: p.species,
                breed: p.breed,
                sex: p.sex,
                birthDate: days(-p.birthDaysAgo),
                weight: p.weight,
                isNeutered: p.isNeutered,
            },
            select: { id: true, name: true, ownerId: true },
        });
        pets.push(pet);
    }

    // Horarios globales del tenant (fallback cuando no hay horario de branch)
    await prisma.clinicHours.createMany({
        data: [
            { tenantId: tenant.id, dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
            { tenantId: tenant.id, dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, dayOfWeek: 6, openTime: '09:00', closeTime: '14:00', isClosed: false },
        ],
    });

    // Horarios por sucursal
    await prisma.clinicHours.createMany({
        data: [
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 1, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 2, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 3, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 4, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 5, openTime: '08:00', closeTime: '18:00', isClosed: false },
            { tenantId: tenant.id, branchId: mainBranch.id, dayOfWeek: 6, openTime: '09:00', closeTime: '14:00', isClosed: false },
        ],
    });
    await prisma.clinicHours.createMany({
        data: [
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 0, openTime: '00:00', closeTime: '00:00', isClosed: true },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 5, openTime: '09:00', closeTime: '17:00', isClosed: false },
            { tenantId: tenant.id, branchId: secondBranch.id, dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', isClosed: true },
        ],
    });

    // Horarios del personal por sucursal
    await prisma.staffSchedule.createMany({
        data: [1, 2, 3, 4, 5].map((d) => ({ tenantId: tenant.id, userId: vet1.id, branchId: mainBranch.id, dayOfWeek: d, startTime: '08:00', endTime: '17:00' })),
    });
    await prisma.staffSchedule.createMany({
        data: [1, 2, 3, 4, 5].map((d) => ({ tenantId: tenant.id, userId: vet2.id, branchId: secondBranch.id, dayOfWeek: d, startTime: '09:00', endTime: '17:00' })),
    });
    await prisma.staffSchedule.createMany({
        data: [1, 2, 3, 4, 5].map((d) => ({ tenantId: tenant.id, userId: groomer.id, branchId: mainBranch.id, dayOfWeek: d, startTime: '09:00', endTime: '16:00' })),
    });

    // ── Productos ────────────────────────────────────────────────────────────
    const productRecords: Array<{ id: string; name: string; price: number; stock: number }> = [];
    for (const p of PRODUCTS) {
        const product = await prisma.product.create({
            data: { tenantId: tenant.id, ...p },
            select: { id: true, name: true, price: true, stock: true },
        });
        productRecords.push(product);
        await prisma.stockMovement.create({
            data: { tenantId: tenant.id, productId: product.id, type: StockMovementType.IN, quantity: p.stock, reason: 'Inventario inicial', userId: inventoryUser.id },
        });
        await prisma.productBatch.create({
            data: { tenantId: tenant.id, productId: product.id, batchNumber: `LOTE-${p.sku}-001`, quantity: p.stock, expiryDate: days(rand(90, 365)) },
        });
    }

    // ── Citas (pasadas, hoy y futuras) ───────────────────────────────────────
    const appointmentTypes = [AppointmentType.CONSULTATION, AppointmentType.CHECKUP, AppointmentType.VACCINATION, AppointmentType.SURGERY];
    const completedAppointments: Array<{ id: string; petId: string }> = [];

    // Citas completadas en los últimos 30 días
    for (let d = -30; d < 0; d++) {
        const numAppts = rand(1, 3);
        for (let a = 0; a < numAppts; a++) {
            const pet = pick(pets);
            const vet = pick([vet1, vet2]);
            const hour = rand(8, 16);
            const appt = await prisma.appointment.create({
                data: {
                    tenantId: tenant.id,
                    branchId: pick([mainBranch.id, secondBranch.id]),
                    petId: pet.id,
                    vetId: vet.id,
                    type: pick(appointmentTypes),
                    status: AppointmentStatus.COMPLETED,
                    scheduledAt: at(days(d), hour, rand(0, 3) * 15),
                    durationMinutes: pick([15, 30, 45]),
                    notes: pick(['Control general', 'Revisión rutinaria', 'Seguimiento tratamiento', 'Vacunación', 'Chequeo anual']),
                },
                select: { id: true, petId: true },
            });
            completedAppointments.push(appt);
        }
    }

    // Citas de hoy
    for (let a = 0; a < 4; a++) {
        const pet = pets[a];
        const vet = a % 2 === 0 ? vet1 : vet2;
        const hour = 9 + a * 2;
        await prisma.appointment.create({
            data: {
                tenantId: tenant.id,
                branchId: mainBranch.id,
                petId: pet.id,
                vetId: vet.id,
                type: pick(appointmentTypes),
                status: pick([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
                scheduledAt: at(days(0), hour, 0),
                durationMinutes: 30,
                notes: pick(['Consulta programada', 'Vacunación pendiente', 'Control post-operatorio']),
            },
        });
    }

    // Citas futuras (próximos 7 días)
    for (let d = 1; d <= 7; d++) {
        const numAppts = rand(2, 5);
        for (let a = 0; a < numAppts; a++) {
            const pet = pick(pets);
            const vet = pick([vet1, vet2]);
            const hour = rand(8, 16);
            await prisma.appointment.create({
                data: {
                    tenantId: tenant.id,
                    branchId: pick([mainBranch.id, secondBranch.id]),
                    petId: pet.id,
                    vetId: vet.id,
                    type: pick(appointmentTypes),
                    status: pick([AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]),
                    scheduledAt: at(days(d), hour, pick([0, 15, 30, 45])),
                    durationMinutes: pick([15, 30, 45]),
                },
            });
        }
    }

    // Cita de estética hoy
    await prisma.appointment.create({
        data: {
            tenantId: tenant.id, branchId: mainBranch.id, petId: pets[1].id, groomerId: groomer.id,
            type: AppointmentType.AESTHETICS, status: AppointmentStatus.CONFIRMED,
            scheduledAt: at(days(0), 11, 0), durationMinutes: 60,
        },
    });

    // ── Registros médicos ────────────────────────────────────────────────────
    for (const appt of completedAppointments.slice(0, 15)) {
        await prisma.medicalRecord.create({
            data: {
                tenantId: tenant.id,
                petId: appt.petId,
                vetId: pick([vet1, vet2]).id,
                appointmentId: appt.id,
                chiefComplaint: pick(['Inapetencia', 'Cojera', 'Vómito', 'Control anual', 'Tos persistente', 'Prurito']),
                diagnosis: pick(['Gastritis leve', 'Esguince grado I', 'Dermatitis alérgica', 'Sano', 'Infección respiratoria']),
                treatment: pick(['Dieta blanda 3 días', 'Reposo y antiinflamatorio', 'Shampoo medicado', 'Sin tratamiento', 'Antibiótico 7 días']),
                prescriptions: pick(['Omeprazol 10mg/día x5', 'Meloxicam 0.1mg/kg x7', 'Cefalexina 500mg c/12h x10', null, 'Vitaminas diarias']),
                weight: +(rand(20, 400) / 10).toFixed(1),
                temperature: +(rand(375, 395) / 10).toFixed(1),
                heartRate: rand(70, 130),
            },
        });
    }

    // ── Vacunaciones ─────────────────────────────────────────────────────────
    const vaccines = ['Rabia', 'Parvovirus', 'Moquillo', 'Hepatitis', 'Triple Felina', 'Leptospirosis'];
    for (let i = 0; i < 10; i++) {
        const pet = pick(pets);
        const administered = rand(0, 1) === 1;
        await prisma.vaccination.create({
            data: {
                tenantId: tenant.id,
                petId: pet.id,
                vetId: pick([vet1, vet2]).id,
                vaccineName: pick(vaccines),
                manufacturer: pick(['Zoetis', 'MSD', 'Boehringer', 'Virbac']),
                batchNumber: `VAC-${rand(1000, 9999)}`,
                dose: rand(1, 3),
                administeredAt: administered ? days(-rand(10, 180)) : days(rand(1, 30)),
                nextDueAt: days(rand(30, 365)),
                status: administered ? VaccinationStatus.ADMINISTERED : VaccinationStatus.SCHEDULED,
            },
        });
    }

    // ── Estética ─────────────────────────────────────────────────────────────
    const groomingServices = ['Baño completo', 'Baño + corte', 'Corte de uñas', 'Limpieza de oídos', 'Baño medicado'];
    for (let i = 0; i < 6; i++) {
        const pet = pick(pets.filter(p => p.name !== 'Kira'));
        const completed = i < 4;
        await prisma.aestheticService.create({
            data: {
                tenantId: tenant.id, petId: pet.id, groomerId: groomer.id,
                serviceName: pick(groomingServices),
                status: completed ? AestheticStatus.COMPLETED : AestheticStatus.SCHEDULED,
                scheduledAt: completed ? days(-rand(1, 25)) : days(rand(1, 10)),
                price: pick([15, 20, 25, 30, 35]),
                notes: completed ? 'Sin observaciones' : undefined,
            },
        });
    }

    // ── Cirugías ─────────────────────────────────────────────────────────────
    await prisma.surgery.create({
        data: {
            tenantId: tenant.id, petId: pets[0].id, vetId: vet1.id,
            type: 'Esterilización', status: SurgeryStatus.COMPLETED,
            scheduledAt: days(-15), preInstructions: 'Ayuno 12 horas',
            postInstructions: 'Reposo 7 días, collar isabelino', anesthesiaType: 'General', durationMinutes: 45,
        },
    });
    await prisma.surgery.create({
        data: {
            tenantId: tenant.id, petId: pets[5].id, vetId: vet2.id,
            type: 'Extracción dental', status: SurgeryStatus.SCHEDULED,
            scheduledAt: days(5), preInstructions: 'Ayuno 8 horas',
            postInstructions: 'Dieta blanda 5 días', anesthesiaType: 'Sedación', durationMinutes: 30,
        },
    });

    // ── Descuentos ───────────────────────────────────────────────────────────
    const discount1 = await prisma.discount.create({
        data: {
            tenantId: tenant.id, name: '10% en consultas', description: 'Descuento del 10% en consultas veterinarias',
            type: DiscountType.PERCENTAGE, value: 10, targetType: DiscountTargetType.SERVICE,
            serviceType: 'CONSULTATION', startAt: days(-30), endAt: days(60), isActive: true,
        },
    });
    const discount2 = await prisma.discount.create({
        data: {
            tenantId: tenant.id, name: '$5 en Alimentos', description: '$5 de descuento en compras de alimentos mayores a $20',
            type: DiscountType.FIXED, value: 5, targetType: DiscountTargetType.PRODUCT_CATEGORY,
            category: 'Alimentos', minAmount: 20, startAt: days(-15), endAt: days(45), isActive: true,
        },
    });
    await prisma.discount.create({
        data: {
            tenantId: tenant.id, name: '15% accesorios', description: '15% en accesorios por temporada',
            type: DiscountType.PERCENTAGE, value: 15, targetType: DiscountTargetType.PRODUCT_CATEGORY,
            category: 'Accesorios', startAt: days(-7), endAt: days(30), isActive: true, maxUses: 50,
        },
    });

    // ── POS: Caja registradora y transacciones ──────────────────────────────

    // Caja cerrada de ayer
    const closedRegister = await prisma.cashRegister.create({
        data: {
            tenantId: tenant.id, branchId: mainBranch.id, openedById: receptionist.id, closedById: receptionist.id,
            status: CashRegisterStatus.CLOSED, openingBalance: 100, closingBalance: 485.30,
            openedAt: at(days(-1), 8), closedAt: at(days(-1), 18),
        },
    });

    // Caja abierta de hoy
    const openRegister = await prisma.cashRegister.create({
        data: {
            tenantId: tenant.id, branchId: mainBranch.id, openedById: receptionist.id,
            status: CashRegisterStatus.OPEN, openingBalance: 100,
        },
    });

    // Transacciones completadas del último mes
    const paymentMethods = [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.TRANSFER];
    const allTickets: Array<{ id: string; total: number }> = [];

    for (let d = -30; d <= 0; d++) {
        const register = d === 0 ? openRegister : closedRegister;
        const ticketsPerDay = d === 0 ? rand(2, 4) : rand(1, 5);

        for (let t = 0; t < ticketsPerDay; t++) {
            const client = pick(clients);
            const numItems = rand(1, 4);
            const selectedProducts: Array<{ product: typeof productRecords[0]; qty: number; itemTotal: number }> = [];
            let subtotal = 0;

            for (let it = 0; it < numItems; it++) {
                const product = pick(productRecords);
                const qty = rand(1, 3);
                const itemTotal = +(product.price * qty).toFixed(2);
                subtotal += itemTotal;
                selectedProducts.push({ product, qty, itemTotal });
            }

            subtotal = +subtotal.toFixed(2);
            const discount = rand(0, 3) === 0 ? +Math.min(5, subtotal * 0.1).toFixed(2) : 0;
            const total = +(subtotal - discount).toFixed(2);

            const isInvoiced = rand(0, 2) === 0;
            const ticket = await prisma.posTicket.create({
                data: {
                    tenantId: tenant.id,
                    branchId: pick([mainBranch.id, secondBranch.id]),
                    registerId: register.id,
                    clientId: client.id,
                    subtotal,
                    discount,
                    tax: 0,
                    total,
                    status: PosTicketStatus.COMPLETED,
                    createdById: receptionist.id,
                    createdAt: at(days(d), rand(8, 17), rand(0, 59)),
                    ...(isInvoiced ? {
                        providerInvoiceId: `INV-${Math.random().toString(36).slice(2, 10)}`,
                        invoiceStatus: 'AUTHORIZED',
                        invoiceNumber: `001-001-${String(allTickets.length + 1).padStart(9, '0')}`,
                        invoiceAccessKey: `AK${Date.now()}${rand(1000, 9999)}`,
                        invoiceIssuedAt: at(days(d), rand(8, 17)),
                        invoiceAuthorizedAt: at(days(d), rand(8, 17)),
                    } : {}),
                },
                select: { id: true, total: true },
            });

            for (const sp of selectedProducts) {
                await prisma.posTicketItem.create({
                    data: {
                        ticketId: ticket.id,
                        type: PosItemType.PRODUCT,
                        productId: sp.product.id,
                        description: sp.product.name,
                        quantity: sp.qty,
                        unitPrice: sp.product.price,
                        discountAmount: 0,
                        total: sp.itemTotal,
                    },
                });
            }

            await prisma.posPayment.create({
                data: { ticketId: ticket.id, method: pick(paymentMethods), amount: total },
            });

            allTickets.push(ticket);

            // Movimiento de stock por cada venta
            for (const sp of selectedProducts) {
                await prisma.stockMovement.create({
                    data: {
                        tenantId: tenant.id,
                        productId: sp.product.id,
                        type: StockMovementType.OUT,
                        quantity: sp.qty,
                        reason: `Venta POS - Ticket ${ticket.id.slice(0, 8)}`,
                        userId: receptionist.id,
                    },
                });
            }
        }
    }

    // Ticket con reembolso
    const refundTicket = await prisma.posTicket.create({
        data: {
            tenantId: tenant.id, branchId: mainBranch.id, registerId: closedRegister.id, clientId: clients[2].id,
            subtotal: 29.90, discount: 0, tax: 0, total: 29.90, status: PosTicketStatus.REFUNDED,
            createdById: receptionist.id, createdAt: at(days(-3), 14),
        },
    });
    await prisma.posTicketItem.create({
        data: { ticketId: refundTicket.id, type: PosItemType.PRODUCT, productId: productRecords[0].id, description: productRecords[0].name, quantity: 1, unitPrice: 29.90, discountAmount: 0, total: 29.90 },
    });
    await prisma.posPayment.create({ data: { ticketId: refundTicket.id, method: PaymentMethod.CASH, amount: 29.90 } });
    await prisma.posRefund.create({ data: { ticketId: refundTicket.id, tenantId: tenant.id, amount: 29.90, reason: 'Producto en mal estado — devolución completa', refundedById: receptionist.id } });

    // Discount usages
    for (let i = 0; i < 8; i++) {
        const ticketForDiscount = allTickets[rand(0, allTickets.length - 1)];
        await prisma.discountUsage.create({
            data: {
                tenantId: tenant.id,
                discountId: pick([discount1.id, discount2.id]),
                posTicketId: ticketForDiscount.id,
                savedAmount: +(rand(200, 800) / 100).toFixed(2),
            },
        });
    }

    // ── Notificaciones ───────────────────────────────────────────────────────
    await prisma.notificationTemplate.createMany({
        data: [
            { tenantId: tenant.id, key: 'appointment_reminder', channel: NotificationChannel.EMAIL, subject: 'Recordatorio de cita', bodyTemplate: 'Hola {{clientName}}, recuerda tu cita el {{date}}', isSystem: false },
            { tenantId: tenant.id, key: 'vaccination_due_reminder', channel: NotificationChannel.SMS, subject: null, bodyTemplate: 'Hola {{clientName}}, {{petName}} tiene vacuna pendiente para {{date}}', isSystem: false },
            { tenantId: tenant.id, key: 'billing_pending_invoice', channel: NotificationChannel.IN_APP, subject: null, bodyTemplate: 'Factura {{providerInvoiceId}} sigue en estado PENDING', isSystem: false },
        ],
    });

    const notificationTargets = [admin, vet1, receptionist, ...clients.slice(0, 3)];
    for (const target of notificationTargets) {
        await prisma.notification.create({
            data: {
                tenantId: tenant.id, userId: target.id,
                title: pick(['Recordatorio', 'Actualización', 'Stock bajo', 'Cita confirmada']),
                body: pick(['Tienes una cita próxima', 'Producto con stock bajo', 'Nueva venta registrada', 'Vacunación pendiente']),
                channel: NotificationChannel.IN_APP,
                readAt: rand(0, 1) === 1 ? days(-rand(0, 5)) : null,
            },
        });
    }

    // ── Audit logs ───────────────────────────────────────────────────────────
    await prisma.auditLog.create({
        data: { tenantId: tenant.id, userId: admin.id, action: 'SEED_FULL', entity: 'TENANT', entityId: tenant.id, newData: { plan: TenantPlan.PRO }, ipAddress: '127.0.0.1', userAgent: 'seed.full.ts' },
    });

    return {
        tenantId: tenant.id,
        credentials: [
            { role: 'CLINIC_ADMIN', email: 'admin@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'VET', email: 'dr.garcia@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'VET', email: 'dra.mendez@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'RECEPTIONIST', email: 'recepcion@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'GROOMER', email: 'estetica@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'INVENTORY', email: 'inventario@nuvet-clinic.com', password: 'Admin12345!' },
            { role: 'CLIENT (x8)', email: '{nombre}@nuvet-clinic.com', password: SHARED_PASSWORD },
        ],
        counts: {
            clients: clients.length,
            pets: pets.length,
            products: productRecords.length,
            posTransactions: allTickets.length,
            branches: 2,
        },
    };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('🔄 Reseteando base de datos...');
    await resetDatabase();

    // Templates globales
    await prisma.notificationTemplate.createMany({
        data: [
            { tenantId: null, key: 'appointment_reminder', channel: NotificationChannel.EMAIL, subject: 'Recordatorio', bodyTemplate: 'Hola {{clientName}}, recuerda tu cita {{date}}', isSystem: true },
            { tenantId: null, key: 'low_stock_alert', channel: NotificationChannel.IN_APP, subject: null, bodyTemplate: 'Stock bajo de {{productName}}', isSystem: true },
            { tenantId: null, key: 'vaccination_due_reminder', channel: NotificationChannel.SMS, subject: null, bodyTemplate: 'Hola {{clientName}}, {{petName}} tiene vacuna próxima {{date}}', isSystem: true },
            { tenantId: null, key: 'billing_pending_invoice', channel: NotificationChannel.IN_APP, subject: null, bodyTemplate: 'Factura {{providerInvoiceId}} pendiente de autorización', isSystem: true },
        ],
    });

    console.log('🌱 Creando tenant principal con datos completos...');
    const result = await seedFullTenant();

    console.log('\n✅ Seed completada exitosamente.\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('  CREDENCIALES DE ACCESO');
    console.log('═══════════════════════════════════════════════════════');
    for (const cred of result.credentials) {
        console.log(`  ${cred.role.padEnd(20)} ${cred.email.padEnd(35)} ${cred.password}`);
    }
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Datos generados:`);
    console.log(`    Clientes:       ${result.counts.clients}`);
    console.log(`    Mascotas:       ${result.counts.pets}`);
    console.log(`    Productos:      ${result.counts.products}`);
    console.log(`    Transacciones:  ${result.counts.posTransactions}`);
    console.log(`    Sucursales:     ${result.counts.branches}`);
    console.log('═══════════════════════════════════════════════════════\n');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => prisma.$disconnect());
