import { ForbiddenException, NotFoundException } from '@nestjs/common';
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
    isActive: true,
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

    const vaccinationFindMany = jest.fn().mockResolvedValue([]);
    const medicalRecordFindMany = jest.fn().mockResolvedValue([]);
    const surgeryFindMany = jest.fn().mockResolvedValue([]);

    const passportPrisma = {
        client: {
            pet: { findUnique },
            vaccination: { findMany: vaccinationFindMany },
            medicalRecord: { findMany: medicalRecordFindMany },
            surgery: { findMany: surgeryFindMany },
        },
    };

    const service = new PassportService(
        prisma as any,
        passportPrisma as any,
        consentService as any,
        auditWriter,
    );

    return {
        service,
        findUnique,
        consentService,
        auditWriter,
        vaccinationFindMany,
        medicalRecordFindMany,
        surgeryFindMany,
    };
}

const owner = { sub: 'owner-1', tenantId: 'tenant-A', role: 'CLIENT' as const };
const clientSameTenant = { sub: 'owner-2', tenantId: 'tenant-A', role: 'CLIENT' as const };
const clientOther = { sub: 'owner-2', tenantId: 'tenant-B', role: 'CLIENT' as const };
const staffSame = { sub: 'vet-1', tenantId: 'tenant-A', role: 'VET' as const };
const staffOther = { sub: 'vet-2', tenantId: 'tenant-B', role: 'VET' as const };
const receptionist = { sub: 'receptionist-1', tenantId: 'tenant-A', role: 'RECEPTIONIST' as const };

describe('PassportService.getPetPassport', () => {
    it('trata una mascota inactiva como no encontrada', async () => {
        const { service, findUnique } = buildPassportMocks();
        findUnique.mockResolvedValueOnce({ ...PET_FULL, isActive: false });

        await expect(service.getPetPassport(owner, 'pet-1', {}))
            .rejects.toThrow('Pet not found');
    });

    it('permite acceso same-tenant al dueño de la mascota', async () => {
        const { service } = buildPassportMocks();
        await expect(
            service.getPetPassport(owner, 'pet-1', {}),
        ).resolves.toBeDefined();
    });

    it('rechaza acceso same-tenant a un cliente que no es dueño', async () => {
        const { service, vaccinationFindMany } = buildPassportMocks();

        await expect(
            service.getPetPassport(clientSameTenant, 'pet-1', {}),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(vaccinationFindMany).not.toHaveBeenCalled();
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

    it('rechaza a un cliente cross-tenant antes de consultar el consent activo', async () => {
        const { service, consentService } = buildPassportMocks();
        consentService.findActiveGrantForPetAndTenant.mockResolvedValueOnce({
            id: 'consent-1',
        });

        await expect(service.getPetPassport(clientOther, 'pet-1', {}))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(consentService.findActiveGrantForPetAndTenant).not.toHaveBeenCalled();
    });

    it('rechaza a un cliente al buscar por microchip', async () => {
        const { service } = buildPassportMocks();

        await expect(service.lookupByMicrochip(owner, '123'))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('proyecta solo campos publicables del historial medico', async () => {
        const { service, medicalRecordFindMany } = buildPassportMocks();
        medicalRecordFindMany.mockResolvedValueOnce([{
            id: 'record-1',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            chiefComplaint: 'Tos',
            diagnosis: 'Irritacion',
            treatment: 'Reposo',
            prescriptions: 'PRIVATE PRESCRIPTION',
            notes: 'PRIVATE NOTE',
            vet: { firstName: 'Ana', lastName: 'Vet' },
        }]);

        const result = await service.getPetPassport(owner, 'pet-1', {});
        expect(result.medicalRecords).toEqual([{
            id: 'record-1',
            date: new Date('2026-01-01T00:00:00.000Z'),
            chiefComplaint: 'Tos',
            diagnosis: 'Irritacion',
            treatment: 'Reposo',
            vetName: 'Ana Vet',
        }]);
        expect(result.medicalRecords[0]).not.toHaveProperty('prescriptions');
        expect(result.medicalRecords[0]).not.toHaveProperty('notes');
    });

    it('consulta cada bloque clinico con limite 50 y orden descendente', async () => {
        const { service, vaccinationFindMany, medicalRecordFindMany, surgeryFindMany } =
            buildPassportMocks();

        await service.getPetPassport(owner, 'pet-1', {});

        expect(vaccinationFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { petId: 'pet-1' },
            orderBy: { administeredAt: 'desc' },
            take: 50,
        }));
        expect(medicalRecordFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { petId: 'pet-1' },
            orderBy: { createdAt: 'desc' },
            take: 50,
        }));
        expect(surgeryFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { petId: 'pet-1' },
            orderBy: { scheduledAt: 'desc' },
            take: 50,
        }));
    });
});

describe('PassportService.createShare', () => {
    function buildShareMocks() {
        const findFirst = jest.fn();
        const shareCreate = jest.fn();
        const shareFindUnique = jest.fn();
        const shareUpdate = jest.fn();
        const prisma = {
            pet: { findFirst },
            petConsentShare: { findMany: jest.fn() },
        };
        const passportPrisma = {
            client: {
                petConsentShare: {
                    create: shareCreate,
                    findUnique: shareFindUnique,
                    update: shareUpdate,
                },
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
            shareFindUnique,
            shareUpdate,
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

    it('rechaza al recepcionista al crear un share', async () => {
        const { service } = buildShareMocks();

        await expect(service.createShare(receptionist, 'pet-1', 7, {}))
            .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza al recepcionista al revocar un share', async () => {
        const { service, shareFindUnique } = buildShareMocks();

        await expect(service.revokeShare(receptionist, 'share-1', {}))
            .rejects.toBeInstanceOf(ForbiddenException);
        expect(shareFindUnique).not.toHaveBeenCalled();
    });
});

describe('PassportService.getByShareToken', () => {
    it('trata un share de una mascota inactiva como no encontrado sin efectos secundarios', async () => {
        const shareFindUnique = jest.fn().mockResolvedValue({
            id: 'share-1',
            petId: 'pet-1',
            tenantId: 'tenant-A',
            token: 'share-token',
            revokedAt: null,
            expiresAt: new Date(Date.now() + 60_000),
        });
        const shareUpdate = jest.fn();
        const petFindUnique = jest.fn().mockResolvedValue({ ...PET_FULL, isActive: false });
        const auditWriter = { write: jest.fn().mockResolvedValue(undefined) };
        const service = new PassportService(
            { pet: { findUnique: jest.fn() } } as any,
            {
                client: {
                    pet: { findUnique: petFindUnique },
                    petConsentShare: { findUnique: shareFindUnique, update: shareUpdate },
                },
            } as any,
            {} as any,
            auditWriter as any,
        );

        await expect(service.getByShareToken('share-token', {}))
            .rejects.toBeInstanceOf(NotFoundException);
        expect(shareUpdate).not.toHaveBeenCalled();
        expect(auditWriter.write).not.toHaveBeenCalled();
    });
});
