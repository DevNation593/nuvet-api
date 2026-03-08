import { PrismaClient, TenantPlan, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PermissionModule, UserRole as SharedUserRole } from '@nuvet/types';

const prisma = new PrismaClient();

type SeedTenant = {
    name: string;
    slug: string;
    plan: TenantPlan;
    email: string;
    phone: string;
    address: string;
};

type SeedUser = {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    password: string;
    phone?: string;
};

const tenantsToSeed: SeedTenant[] = [
    {
        name: 'NuVet Free Demo',
        slug: 'demo-free',
        plan: TenantPlan.FREE,
        email: 'contacto@demo-free.com',
        phone: '+15550001001',
        address: '101 Free Avenue',
    },
    {
        name: 'NuVet Starter Demo',
        slug: 'demo-starter',
        plan: TenantPlan.STARTER,
        email: 'contacto@demo-starter.com',
        phone: '+15550001002',
        address: '202 Starter Street',
    },
    {
        name: 'NuVet Pro Demo',
        slug: 'demo-pro',
        plan: TenantPlan.PRO,
        email: 'contacto@demo-pro.com',
        phone: '+15550001003',
        address: '303 Pro Boulevard',
    },
    {
        name: 'NuVet Enterprise Demo',
        slug: 'demo-enterprise',
        plan: TenantPlan.ENTERPRISE,
        email: 'contacto@demo-enterprise.com',
        phone: '+15550001004',
        address: '404 Enterprise Road',
    },
];

const ownerUserByPlan: Record<TenantPlan, SeedUser> = {
    [TenantPlan.FREE]: {
        email: 'owner@demo-free.com',
        firstName: 'Owner',
        lastName: 'Free',
        role: UserRole.CLINIC_ADMIN,
        password: 'OwnerFree123!',
    },
    [TenantPlan.STARTER]: {
        email: 'owner@demo-starter.com',
        firstName: 'Owner',
        lastName: 'Starter',
        role: UserRole.CLINIC_ADMIN,
        password: 'OwnerStarter123!',
    },
    [TenantPlan.PRO]: {
        email: 'owner@demo-pro.com',
        firstName: 'Owner',
        lastName: 'Pro',
        role: UserRole.CLINIC_ADMIN,
        password: 'OwnerPro123!',
    },
    [TenantPlan.ENTERPRISE]: {
        email: 'owner@demo-enterprise.com',
        firstName: 'Owner',
        lastName: 'Enterprise',
        role: UserRole.CLINIC_ADMIN,
        password: 'OwnerEnterprise123!',
    },
};

const modulesByPlan: Record<TenantPlan, PermissionModule[]> = {
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
        PermissionModule.NOTIFICATIONS,
        PermissionModule.REPORTS,
        PermissionModule.FILES,
    ],
    [TenantPlan.ENTERPRISE]: Object.values(PermissionModule),
};

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

async function upsertTenant(input: SeedTenant) {
    return prisma.tenant.upsert({
        where: { slug: input.slug },
        update: {
            name: input.name,
            plan: input.plan,
            email: input.email,
            phone: input.phone,
            address: input.address,
            isActive: true,
        },
        create: {
            name: input.name,
            slug: input.slug,
            plan: input.plan,
            email: input.email,
            phone: input.phone,
            address: input.address,
        },
    });
}

async function upsertUser(tenantId: string, input: SeedUser) {
    const passwordHash = await bcrypt.hash(input.password, 12);
    return prisma.user.upsert({
        where: {
            tenantId_email: {
                tenantId,
                email: input.email,
            },
        },
        update: {
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            phone: input.phone,
            isActive: true,
            passwordHash,
        },
        create: {
            tenantId,
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            phone: input.phone,
            isActive: true,
            passwordHash,
        },
    });
}

async function main() {
    console.log('Iniciando seed base (reset total)...');
    await resetDatabase();

    const seededTenants: Array<{ id: string; slug: string; plan: TenantPlan }> = [];
    const seededUsers: Array<{ tenantSlug: string; email: string; role: UserRole; password: string }> = [];

    for (const tenantInput of tenantsToSeed) {
        const tenant = await upsertTenant(tenantInput);
        seededTenants.push({ id: tenant.id, slug: tenant.slug, plan: tenant.plan });

        const owner = ownerUserByPlan[tenant.plan];
        await upsertUser(tenant.id, owner);
        seededUsers.push({
            tenantSlug: tenant.slug,
            email: owner.email,
            role: owner.role,
            password: owner.password,
        });
    }

    const planProfiles = Object.values(TenantPlan).map((plan) => {
        const modules = modulesByPlan[plan] ?? [];
        return {
            plan,
            ownerRole: SharedUserRole.CLINIC_ADMIN,
            modules,
            modulesCount: modules.length,
        };
    });

    console.log('Seed completado');
    console.log({
        tenants: seededTenants,
        users: seededUsers,
        planProfiles,
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
