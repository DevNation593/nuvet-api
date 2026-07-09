import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { VaccinationCampaignStatus, VaccinationRegistrationStatus } from '@prisma/client';
import { VaccinationCampaignsService } from './vaccination-campaigns.service';
import type {
    IVaccinationCampaignRepository,
    IVaccinationRegistrationRepository,
    VaccinationCampaignEntity,
} from '../domain/vaccination-campaign.repository';

const OWNER = { sub: 'owner-1', tenantId: 'tenant-1', role: 'CLIENT' as const };
const STAFF = { sub: 'vet-1', tenantId: 'tenant-1', role: 'VET' as const };
const OTHER_TENANT_OWNER = {
    sub: 'owner-9',
    tenantId: 'tenant-other',
    role: 'CLIENT' as const,
};

function buildService() {
    const campaignRepo: jest.Mocked<IVaccinationCampaignRepository> = {
        create: jest.fn(),
        findOne: jest.fn(),
        findByTenant: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    } as any;
    const registrationRepo: jest.Mocked<IVaccinationRegistrationRepository> = {
        create: jest.fn(),
        findOneGlobal: jest.fn(),
        findOneByCampaignAndPet: jest.fn(),
        findByCampaign: jest.fn(),
        findByOwner: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    } as any;
    const prisma = {
        pet: { findFirst: jest.fn() },
    };
    const passportPrisma = {} as any;
    const service = new VaccinationCampaignsService(
        campaignRepo,
        registrationRepo,
        prisma as any,
        passportPrisma,
    );
    return { service, campaignRepo, registrationRepo, prisma };
}

function buildCampaign(
    overrides: Partial<VaccinationCampaignEntity> = {},
): VaccinationCampaignEntity {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const farFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    return {
        id: 'camp-1',
        tenantId: 'tenant-1',
        name: 'Jornada Antirrábica',
        description: null,
        vaccineName: 'Antirrábica',
        startsAt: future,
        endsAt: farFuture,
        location: 'Clínica central',
        capacity: 50,
        priceCents: 0,
        currency: 'USD',
        status: VaccinationCampaignStatus.OPEN,
        notes: null,
        createdById: 'vet-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        registrationCount: 0,
        ...overrides,
    };
}

describe('VaccinationCampaignsService.create', () => {
    it('happy path: crea la campaña con DRAFT por default', async () => {
        const { service, campaignRepo } = buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        campaignRepo.create.mockResolvedValueOnce(buildCampaign());

        await service.create('tenant-1', {
            name: 'Jornada Antirrábica',
            vaccineName: 'Antirrábica',
            startsAt: future,
            endsAt: farFuture,
            location: 'Clínica central',
            capacity: 50,
            createdById: 'vet-1',
        });

        expect(campaignRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-1',
                name: 'Jornada Antirrábica',
            }),
        );
    });

    it('rechaza endsAt <= startsAt', async () => {
        const { service } = buildService();
        const t = new Date();
        await expect(
            service.create('tenant-1', {
                name: 'X',
                vaccineName: 'Y',
                startsAt: t,
                endsAt: new Date(t.getTime() - 1000),
                createdById: 'vet-1',
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it('rechaza capacity negativo', async () => {
        const { service } = buildService();
        const t = new Date();
        await expect(
            service.create('tenant-1', {
                name: 'X',
                vaccineName: 'Y',
                startsAt: t,
                endsAt: new Date(t.getTime() + 1000),
                capacity: -1,
                createdById: 'vet-1',
            }),
        ).rejects.toThrow(BadRequestException);
    });
});

describe('VaccinationCampaignsService.delete', () => {
    it('elimina una campaña sin inscripciones', async () => {
        const { service, campaignRepo } = buildService();
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ registrationCount: 0 }),
        );
        await service.delete('tenant-1', 'camp-1');
        expect(campaignRepo.delete).toHaveBeenCalledWith('tenant-1', 'camp-1');
    });

    it('bloquea delete si tiene inscripciones', async () => {
        const { service, campaignRepo } = buildService();
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ registrationCount: 5 }),
        );
        await expect(service.delete('tenant-1', 'camp-1')).rejects.toThrow(
            ConflictException,
        );
        expect(campaignRepo.delete).not.toHaveBeenCalled();
    });

    it('NotFound si no existe', async () => {
        const { service, campaignRepo } = buildService();
        campaignRepo.findOne.mockResolvedValueOnce(null);
        await expect(service.delete('tenant-1', 'camp-x')).rejects.toThrow(
            NotFoundException,
        );
    });
});

describe('VaccinationCampaignsService.registerPet', () => {
    it('inscripción happy path del dueño', async () => {
        const { service, campaignRepo, registrationRepo, prisma } =
            buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-1',
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.findOneByCampaignAndPet.mockResolvedValueOnce(null);
        registrationRepo.create.mockResolvedValueOnce({
            id: 'reg-1',
            status: VaccinationRegistrationStatus.REGISTERED,
        } as never);

        const result = await service.registerPet(OWNER, {
            campaignId: 'camp-1',
            petId: 'pet-1',
        });
        expect(result).toBeDefined();
        expect(registrationRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: 'tenant-1',
                petId: 'pet-1',
                ownerId: 'owner-1',
            }),
        );
    });

    it('staff del tenant puede inscribir cualquier mascota del tenant', async () => {
        const { service, campaignRepo, registrationRepo, prisma } =
            buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-2', // diferente al actor staff
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.findOneByCampaignAndPet.mockResolvedValueOnce(null);
        registrationRepo.create.mockResolvedValueOnce({} as never);

        await service.registerPet(STAFF, {
            campaignId: 'camp-1',
            petId: 'pet-1',
        });
        expect(registrationRepo.create).toHaveBeenCalled();
    });

    it('rechaza si la mascota no existe en el tenant', async () => {
        const { service, campaignRepo, prisma } = buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce(null);
        await expect(
            service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-x' }),
        ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si el cliente no es dueño de la mascota', async () => {
        const { service, campaignRepo, prisma } = buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-OTHER',
            tenantId: 'tenant-1',
        } as never);
        await expect(
            service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-1' }),
        ).rejects.toThrow(ForbiddenException);
    });

    it('rechaza si la campaña está en DRAFT/COMPLETED/CANCELLED', async () => {
        const { service, campaignRepo } = buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        for (const status of [
            VaccinationCampaignStatus.DRAFT,
            VaccinationCampaignStatus.COMPLETED,
            VaccinationCampaignStatus.CANCELLED,
        ]) {
            campaignRepo.findOne.mockResolvedValueOnce(
                buildCampaign({ startsAt: future, endsAt: farFuture, status }),
            );
            await expect(
                service.registerPet(OWNER, {
                    campaignId: 'camp-1',
                    petId: 'pet-1',
                }),
            ).rejects.toThrow(ConflictException);
        }
    });

    it('rechaza cuando se alcanza la capacidad', async () => {
        const { service, campaignRepo } = buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({
                startsAt: future,
                endsAt: farFuture,
                capacity: 5,
                registrationCount: 5,
            }),
        );
        await expect(
            service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-1' }),
        ).rejects.toThrow(ConflictException);
    });

    it('rechaza inscripción duplicada (misma pet+campaign, status distinto de CANCELLED)', async () => {
        const { service, campaignRepo, registrationRepo, prisma } =
            buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-1',
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.findOneByCampaignAndPet.mockResolvedValueOnce({
            id: 'reg-existing',
            status: VaccinationRegistrationStatus.REGISTERED,
        } as never);
        await expect(
            service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-1' }),
        ).rejects.toThrow(ConflictException);
    });

    it('re-habilita inscripción si la previa está CANCELLED', async () => {
        const { service, campaignRepo, registrationRepo, prisma } =
            buildService();
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: future, endsAt: farFuture }),
        );
        prisma.pet.findFirst.mockResolvedValueOnce({
            id: 'pet-1',
            ownerId: 'owner-1',
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.findOneByCampaignAndPet.mockResolvedValueOnce({
            id: 'reg-existing',
            status: VaccinationRegistrationStatus.CANCELLED,
        } as never);
        registrationRepo.update.mockResolvedValueOnce({} as never);

        await service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-1' });
        expect(registrationRepo.update).toHaveBeenCalledWith(
            'reg-existing',
            expect.objectContaining({ status: 'REGISTERED' }),
        );
    });

    it('rechaza si la campaña ya empezó (ventana de tolerancia 1h)', async () => {
        const { service, campaignRepo } = buildService();
        const started = new Date(Date.now() - 2 * 60 * 60 * 1000); // hace 2h
        const ends = new Date(Date.now() + 24 * 60 * 60 * 1000);
        campaignRepo.findOne.mockResolvedValueOnce(
            buildCampaign({ startsAt: started, endsAt: ends }),
        );
        await expect(
            service.registerPet(OWNER, { campaignId: 'camp-1', petId: 'pet-1' }),
        ).rejects.toThrow(ConflictException);
    });
});

describe('VaccinationCampaignsService.cancelRegistration', () => {
    it('dueño cancela su propia inscripción', async () => {
        const { service, registrationRepo } = buildService();
        registrationRepo.findOneGlobal.mockResolvedValueOnce({
            id: 'reg-1',
            tenantId: 'tenant-1',
            ownerId: 'owner-1',
        } as never);
        registrationRepo.update.mockResolvedValueOnce({} as never);
        await service.cancelRegistration(OWNER, 'reg-1');
        expect(registrationRepo.update).toHaveBeenCalledWith(
            'reg-1',
            { status: 'CANCELLED' },
        );
    });

    it('staff del tenant puede cancelar', async () => {
        const { service, registrationRepo } = buildService();
        registrationRepo.findOneGlobal.mockResolvedValueOnce({
            id: 'reg-1',
            tenantId: 'tenant-1',
            ownerId: 'owner-1',
        } as never);
        registrationRepo.update.mockResolvedValueOnce({} as never);
        await service.cancelRegistration(STAFF, 'reg-1');
        expect(registrationRepo.update).toHaveBeenCalled();
    });

    it('rechaza cross-tenant (inscripción de otro tenant)', async () => {
        const { service, registrationRepo } = buildService();
        registrationRepo.findOneGlobal.mockResolvedValueOnce({
            id: 'reg-1',
            tenantId: 'tenant-OTHER',
            ownerId: 'owner-x',
        } as never);
        await expect(
            service.cancelRegistration(OWNER, 'reg-1'),
        ).rejects.toThrow(ForbiddenException);
    });
});

describe('VaccinationCampaignsService.markAttended / markNoShow', () => {
    it('staff marca asistencia → status=ATTENDED con attendedAt', async () => {
        const { service, registrationRepo } = buildService();
        registrationRepo.findOneGlobal.mockResolvedValueOnce({
            id: 'reg-1',
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.update.mockResolvedValueOnce({} as never);
        await service.markAttended(STAFF, 'reg-1', { notes: 'OK' });
        expect(registrationRepo.update).toHaveBeenCalledWith(
            'reg-1',
            expect.objectContaining({
                status: 'ATTENDED',
                notes: 'OK',
            }),
        );
    });

    it('cliente NO puede marcar asistencia', async () => {
        const { service, registrationRepo } = buildService();
        await expect(
            service.markAttended(OWNER, 'reg-1', {}),
        ).rejects.toThrow(ForbiddenException);
    });

    it('staff marca no-show → status=NO_SHOW', async () => {
        const { service, registrationRepo } = buildService();
        registrationRepo.findOneGlobal.mockResolvedValueOnce({
            id: 'reg-1',
            tenantId: 'tenant-1',
        } as never);
        registrationRepo.update.mockResolvedValueOnce({} as never);
        await service.markNoShow(STAFF, 'reg-1');
        expect(registrationRepo.update).toHaveBeenCalledWith(
            'reg-1',
            { status: 'NO_SHOW' },
        );
    });
});

describe('VaccinationCampaignsService.getOne + listRegistrations', () => {
    it('getOne lanza NotFound si no existe', async () => {
        const { service, campaignRepo } = buildService();
        campaignRepo.findOne.mockResolvedValueOnce(null);
        await expect(service.getOne('tenant-1', 'camp-x')).rejects.toThrow(
            NotFoundException,
        );
    });

    it('listRegistrations valida que la campaña exista en el tenant', async () => {
        const { service, campaignRepo, registrationRepo } = buildService();
        campaignRepo.findOne.mockResolvedValueOnce(null);
        await expect(
            service.listRegistrations('camp-1', 'tenant-1', {
                skip: 0,
                take: 20,
            }),
        ).rejects.toThrow(NotFoundException);
        expect(registrationRepo.findByCampaign).not.toHaveBeenCalled();
    });
});
