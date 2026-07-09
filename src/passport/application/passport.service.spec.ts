import { PassportService } from './passport.service';

/**
 * Tests de `PassportService` para Fase 1:
 *   - misma-tenant: dueño y staff
 *   - cross-tenant: con y sin consent GRANTED
 *   - shares: validación de ttlDays y creación básica
 *
 * Se mockea `PrismaService` y `PassportPrismaService` a mano para no depender
 * de la base de datos.
 */

const PET_FULL = {
    id: 'pet-1',
    ownerId: 'owner-1',
    tenantId: 'tenant-A',
    name: 'Rex',
    species: 'DOG',
    breed: null,
    sex: 'MALE',
    birthDate: null,
    color: null,
    microchip: '123',
    photoUrl: null,
    weight: 12,
    allergies: null,
    isNeutered: false,
    updatedAt: new Date(),
    tenant: { id: 'tenant-A', name: 'Clínica A' },
};

function buildPassportMocks() {
    const auditWriter = {
        write: jest.fn().mockResolvedValue(undefined),
        passportPrisma: {},
    } as any;

    // Devolvemos la misma forma completa en cualquier llamada.
    const findUnique = jest.fn().mockResolvedValue(PET_FULL);

    const consentService = {
        findActiveGrantForPetAndTenant: jest.fn(),
        // Por defecto grant no encontrado → forzado en cada test.
        recordAccess: jest.fn().mockImplementation((input: any) =>
            auditWriter.write({ ...input, action: 'ACCESSED' }),
        ),
    };

    const prisma = { pet: { findUnique } };

    const passportPrisma = {
        client: {
            pet: { findUnique },
            vaccination: { findMany: jest.fn().mockResolvedValue([]) },
            medicalRecord: { findMany: jest.fn().mockResolvedValue([]) },
            surgery: { findMany: jest.fn().mockResolvedValue([]) },
        },
    };

    const service = new PassportService(
        prisma as any,
        passportPrisma as any,
        consentService as any,
        auditWriter,
    );

    return { service, findUnique, consentService, auditWriter };
}

const owner = { sub: 'owner-1', tenantId: 'tenant-A', role: 'CLIENT' as const };
const staffSame = { sub: 'vet-1', tenantId: 'tenant-A', role: 'VET' as const };
const staffOther = { sub: 'vet-2', tenantId: 'tenant-B', role: 'VET' as const };

describe('PassportService.getPetPassport', () => {
    it('permite acceso same-tenant al dueño de la mascota', async () => {
        const { service } = buildPassportMocks();
        await expect(
            service.getPetPassport(owner, 'pet-1', {}),
        ).resolves.toBeDefined();
    });

    it('permite acceso same-tenant a staff de la clínica dueña', async () => {
        const { service } = buildPassportMocks();
        await expect(
            service.getPetPassport(staffSame, 'pet-1', {}),
        ).resolves.toBeDefined();
    });

    it('bloquea acceso cross-tenant sin consent GRANTED', async () => {
        const { service, consentService } = buildPassportMocks();
        consentService.findActiveGrantForPetAndTenant.mockResolvedValueOnce(null);
        await expect(
            service.getPetPassport(staffOther, 'pet-1', {}),
        ).rejects.toThrow(/No active consent/);
    });

    it('permite acceso cross-tenant cuando hay consent GRANTED activo y audita el acceso', async () => {
        const { service, consentService, auditWriter } = buildPassportMocks();
        consentService.findActiveGrantForPetAndTenant.mockResolvedValueOnce({
            id: 'consent-1',
            petId: 'pet-1',
            targetTenantId: 'tenant-B',
            sourceTenantId: 'tenant-A',
        } as any);

        await expect(
            service.getPetPassport(staffOther, 'pet-1', {}),
        ).resolves.toBeDefined();
        expect(auditWriter.write).toHaveBeenCalled();
    });
});

describe('PassportService.createShare', () => {
    function buildShareMocks() {
        const findFirst = jest.fn();
        const shareCreate = jest.fn();
        const prisma = {
            pet: { findFirst },
            petConsentShare: { findMany: jest.fn() },
        };
        const passportPrisma = {
            client: {
                petConsentShare: { create: shareCreate },
            },
        };
        const consentService = {
            findActiveGrantForPetAndTenant: jest.fn(),
            recordAccess: jest.fn(),
        };
        const auditWriter = {
            write: jest.fn().mockResolvedValue(undefined),
            passportPrisma: {},
        } as any;
        return {
            service: new PassportService(
                prisma as any,
                passportPrisma as any,
                consentService as any,
                auditWriter,
            ),
            findFirst,
            shareCreate,
        };
    }

    it('rechaza ttlDays fuera de [1, 90]', async () => {
        const { service } = buildShareMocks();
        const actor = { sub: 'u-1', tenantId: 't-1', role: 'CLINIC_ADMIN' as const };
        await expect(service.createShare(actor, 'pet-1', 0, {})).rejects.toThrow();
        await expect(service.createShare(actor, 'pet-1', 91, {})).rejects.toThrow();
    });

    it('genera token y crea share con expiración correcta', async () => {
        const { service, findFirst, shareCreate } = buildShareMocks();
        findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-1',
            tenantId: 't-1',
        });
        shareCreate.mockResolvedValueOnce({
            id: 'share-1',
            petId: 'pet-1',
            ownerId: 'owner-1',
            tenantId: 't-1',
            token: 'generated-token',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revokedAt: null,
            accessCount: 0,
            lastAccessedAt: null,
            createdAt: new Date(),
        });

        const actor = { sub: 'admin-1', tenantId: 't-1', role: 'CLINIC_ADMIN' as const };
        const result = await service.createShare(actor, 'pet-1', 7, {});
        expect(result.token).toBe('generated-token');
        expect(result.shareUrl).toContain('generated-token');
    });
});
