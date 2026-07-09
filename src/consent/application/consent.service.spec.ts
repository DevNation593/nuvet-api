import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import {
    ConsentAccessAction,
    ConsentTokenScope,
    ConsentTokenStatus,
} from '@prisma/client';
import { JwtPayload, UserRole } from '@nuvet/types';
import { ConsentService, RequestContext } from './consent.service';
import { ConsentAuditWriter } from './consent-audit.writer';
import {
    IConsentRepository,
} from '../domain/consent.repository';

/**
 * Tests unitarios de `ConsentService` (Fase 2).
 *
 * Cobertura mínima exigida por la consigna:
 *   1. issueToken + validateToken positivo produce una entrada en
 *      `ConsentAccessLog` con action=VALIDATE.
 *   2. validateToken sobre un token expirado lanza `ForbiddenException`.
 *   3. validateToken sobre un token de otro tenant (mock devuelve null,
 *      simulando cross-tenant) lanza `NotFoundException`.
 *
 * Bonus:
 *   4. validateToken sobre un token revocado lanza `ForbiddenException`.
 *   5. revokeToken emite una entrada de log con action=REVOKE.
 *
 * Cobertura adicional añadida por qa-agent:
 *   6. listAccessLogs pagina y serializa correctamente (`skip/take`,
 *      meta.totalPages, `createdAt` ISO).
 *   7. listAccessLogs traduce los filtros opcionales del DTO al filtro
 *      del repositorio (`tokenId`, `action`, `from`, `to`).
 *   8. listAccessLogs sin filtros usa defaults (page=1, limit=20).
 *   9. issueToken valida la ventana de expiración (pasado, > 90 días).
 *  10. issueToken rechaza petIds fuera del tenant.
 *  11. issueToken rechaza roles no autorizados (no CLIENT ni staff).
 *  12. revokeToken: un cliente no puede revocar tokens ajenos.
 *  13. revokeToken: staff de otro tenant no puede revocar tokens
 *      (chequeo explícito cross-tenant).
 *
 * El repositorio (`IConsentRepository`) y el writer (`ConsentAuditWriter`)
 * se mockean a mano para no depender de Postgres. Patrón inspirado en
 * `passport.service.spec.ts`.
 */

const TENANT_A = '11111111-1111-1111-1111-111111111111';
const TENANT_B = '22222222-2222-2222-2222-222222222222';
const OWNER_USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PET_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const CLIENT_ACTOR: JwtPayload = {
    sub: OWNER_USER_ID,
    tenantId: TENANT_A,
    email: 'owner@clinic-a.test',
    role: UserRole.CLIENT,
};

const VET_TENANT_A: JwtPayload = {
    sub: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    tenantId: TENANT_A,
    email: 'vet@clinic-a.test',
    role: UserRole.VET,
};

function makeToken(overrides: Partial<{
    id: string;
    tenantId: string;
    ownerUserId: string;
    granteeEmail: string;
    granteeTenantId: string | null;
    scope: ConsentTokenScope;
    petIds: string[];
    status: ConsentTokenStatus;
    expiresAt: Date;
    createdAt: Date;
    revokedAt: Date | null;
    auditReason: string | null;
}> = {}) {
    const now = new Date();
    return {
        id: 't-1',
        tenantId: TENANT_A,
        ownerUserId: OWNER_USER_ID,
        granteeEmail: 'grantee@other-clinic.com',
        granteeTenantId: null,
        scope: ConsentTokenScope.READ,
        petIds: [PET_ID],
        status: ConsentTokenStatus.ACTIVE,
        expiresAt: new Date(now.getTime() + 60_000),
        createdAt: now,
        revokedAt: null,
        auditReason: null,
        ...overrides,
    };
}

interface MockSet {
    service: ConsentService;
    repo: jest.Mocked<IConsentRepository>;
    auditWriter: jest.Mocked<ConsentAuditWriter>;
}

function buildService(opts: {
    findPetsResult?: Array<{ id: string }>;
    createTokenResult?: ReturnType<typeof makeToken>;
} = {}): MockSet {
    const findPets = jest
        .fn()
        .mockResolvedValue(opts.findPetsResult ?? []);
    const createToken = jest
        .fn()
        .mockResolvedValue(
            opts.createTokenResult ??
                makeToken({ id: 't-created' }),
        );
    const findTokenById = jest.fn();
    const updateToken = jest
        .fn()
        .mockImplementation((_tid, _id, input) =>
            Promise.resolve(makeToken({ id: 't-updated', revokedAt: input.revokedAt ?? null })),
        );

    const repo: jest.Mocked<IConsentRepository> = {
        findTokenById: findTokenById as unknown as jest.Mocked<IConsentRepository>['findTokenById'],
        createToken: createToken as unknown as jest.Mocked<IConsentRepository>['createToken'],
        updateToken: updateToken as unknown as jest.Mocked<IConsentRepository>['updateToken'],
        findPetsNotInTenant: findPets as unknown as jest.Mocked<IConsentRepository>['findPetsNotInTenant'],
        createAccessLog: jest
            .fn()
            .mockResolvedValue({
                id: 'log-1',
                tenantId: TENANT_A,
                consentTokenId: 't-1',
                accessedByUserId: OWNER_USER_ID,
                accessedByTenantId: TENANT_A,
                action: ConsentAccessAction.VALIDATE,
                ipAddress: null,
                userAgent: null,
                createdAt: new Date(),
            }),
        listAccessLogs: jest
            .fn()
            .mockResolvedValue({ data: [], total: 0 }),
    };

    const auditWriter = {
        write: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ConsentAuditWriter>;

    // Inyectar manualmente con `@Inject(CONSENT_REPOSITORY)` emulado.
    const service = new ConsentService(
        repo as unknown as IConsentRepository,
        auditWriter as unknown as ConsentAuditWriter,
    );

    return { service, repo, auditWriter };
}

const ctx: RequestContext = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('ConsentService', () => {
    // ── 1) issueToken + validateToken → access log ──────────────────────────
    it('issueToken + validateToken positivo produce un access log con action=VALIDATE', async () => {
        const { service, repo, auditWriter } = buildService({
            findPetsResult: [],
        });
        // El primer token "creado" y luego "encontrado".
        const created = makeToken({
            id: 't-fresh',
            ownerUserId: CLIENT_ACTOR.sub,
            status: ConsentTokenStatus.ACTIVE,
            expiresAt: new Date(Date.now() + 60_000),
        });
        // 1) createToken devuelve el token recién creado.
        repo.createToken.mockResolvedValueOnce(created);
        // 2) findTokenById (en validateToken) devuelve el mismo token.
        repo.findTokenById.mockResolvedValueOnce(created);

        const issued = await service.issueToken(
            CLIENT_ACTOR,
            {
                ownerUserId: CLIENT_ACTOR.sub,
                granteeEmail: 'grantee@other-clinic.com',
                scope: ConsentTokenScope.READ,
                petIds: [PET_ID],
                expiresAt: created.expiresAt.toISOString(),
            },
            ctx,
        );

        expect(issued.id).toBe('t-fresh');
        expect(issued.status).toBe(ConsentTokenStatus.ACTIVE);

        const validated = await service.validateToken(
            CLIENT_ACTOR,
            { tokenId: 't-fresh' },
            ctx,
        );

        expect(validated.id).toBe('t-fresh');
        expect(validated.expiresAt).toBe(created.expiresAt.toISOString());

        // El writer se llamó una vez (en validateToken).
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        const callArg = auditWriter.write.mock.calls[0][0];
        expect(callArg.action).toBe(ConsentAccessAction.VALIDATE);
        expect(callArg.consentTokenId).toBe('t-fresh');
        expect(callArg.accessedByUserId).toBe(CLIENT_ACTOR.sub);
        expect(callArg.tenantId).toBe(CLIENT_ACTOR.tenantId);
    });

    // ── 2) Expired token ────────────────────────────────────────────────────
    it('validateToken sobre un token expirado lanza ForbiddenException', async () => {
        const { service, repo, auditWriter } = buildService();
        const expiredToken = makeToken({
            id: 't-expired',
            status: ConsentTokenStatus.EXPIRED,
            expiresAt: new Date(Date.now() - 60_000),
        });
        repo.findTokenById.mockResolvedValueOnce(expiredToken);

        await expect(
            service.validateToken(
                VET_TENANT_A,
                { tokenId: 't-expired' },
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);

        // Aunque falle, debe dejar constancia en el log (intento de uso).
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        expect(auditWriter.write.mock.calls[0][0].action).toBe(
            ConsentAccessAction.VALIDATE,
        );
    });

    // ── 3) Cross-tenant → NotFound ─────────────────────────────────────────
    it('validateToken sobre un token de otro tenant lanza NotFoundException', async () => {
        const { service, repo, auditWriter } = buildService();
        // El middleware Prisma scopea por tenant: si el token pertenece a
        // otro tenant, findFirst devuelve null. Simulamos eso devolviendo null.
        repo.findTokenById.mockResolvedValueOnce(null);

        // El actor pertenece a TENANT_B (vet cross-tenant).
        const actorOtherTenant: JwtPayload = {
            sub: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            tenantId: TENANT_B,
            email: 'vet-other@clinic-b.test',
            role: UserRole.VET,
        };

        await expect(
            service.validateToken(
                actorOtherTenant,
                { tokenId: 'cross-tenant-token' },
                ctx,
            ),
        ).rejects.toBeInstanceOf(NotFoundException);

        // Sin log porque ni siquiera llegamos a registrar el intento (no
        // encontramos el token). Esto preserva la no-leak de información:
        // un atacante no puede distinguir "no existe" de "pertenece a otro tenant".
        expect(auditWriter.write).not.toHaveBeenCalled();
    });

    // ── 4) Bonus: token REVOKED → Forbidden ────────────────────────────────
    it('validateToken sobre un token revocado lanza ForbiddenException', async () => {
        const { service, repo } = buildService();
        const revokedToken = makeToken({
            id: 't-revoked',
            status: ConsentTokenStatus.REVOKED,
            revokedAt: new Date(Date.now() - 1000),
        });
        repo.findTokenById.mockResolvedValueOnce(revokedToken);

        await expect(
            service.validateToken(
                VET_TENANT_A,
                { tokenId: 't-revoked' },
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    // ── 5) Bonus: revokeToken emite log con action=REVOKE ───────────────────
    it('revokeToken emite un access log con action=REVOKE', async () => {
        const { service, repo, auditWriter } = buildService();
        const existing = makeToken({ id: 't-to-revoke' });
        const updated = makeToken({
            id: 't-to-revoke',
            status: ConsentTokenStatus.REVOKED,
            revokedAt: new Date(),
        });
        repo.findTokenById.mockResolvedValueOnce(existing);
        repo.updateToken.mockResolvedValueOnce(updated);

        const result = await service.revokeToken(
            VET_TENANT_A,
            't-to-revoke',
            { auditReason: 'owner requested' },
            ctx,
        );

        expect(result.status).toBe(ConsentTokenStatus.REVOKED);
        expect(auditWriter.write).toHaveBeenCalledTimes(1);
        expect(auditWriter.write.mock.calls[0][0].action).toBe(
            ConsentAccessAction.REVOKE,
        );
    });

    // ── 6) listAccessLogs: paginación y filtros ──────────────────────────────
    it('listAccessLogs pagina correctamente y aplica skip/take', async () => {
        const { service, repo } = buildService();
        const sampleLog = {
            id: 'log-42',
            tenantId: TENANT_A,
            consentTokenId: 't-1',
            accessedByUserId: OWNER_USER_ID,
            accessedByTenantId: TENANT_A,
            action: ConsentAccessAction.READ,
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
            createdAt: new Date('2026-07-07T10:00:00.000Z'),
        };
        repo.listAccessLogs.mockResolvedValueOnce({
            data: [sampleLog],
            total: 41,
        });

        const result = await service.listAccessLogs(VET_TENANT_A, {
            page: 2,
            limit: 20,
        });

        // El repo debe recibir skip=20, take=20.
        expect(repo.listAccessLogs).toHaveBeenCalledWith(
            TENANT_A,
            {},
            { skip: 20, take: 20 },
        );
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toMatchObject({
            id: 'log-42',
            tenantId: TENANT_A,
            consentTokenId: 't-1',
            action: ConsentAccessAction.READ,
        });
        // createdAt debe serializarse como ISO string.
        expect(result.data[0].createdAt).toBe(
            '2026-07-07T10:00:00.000Z',
        );
        expect(result.meta).toEqual({
            page: 2,
            limit: 20,
            total: 41,
            totalPages: 3, // ceil(41 / 20) = 3
            hasNextPage: true,
            hasPrevPage: true,
        });
    });

    it('listAccessLogs traduce filtros del DTO al filter del repositorio', async () => {
        const { service, repo } = buildService();
        repo.listAccessLogs.mockResolvedValueOnce({ data: [], total: 0 });

        await service.listAccessLogs(VET_TENANT_A, {
            page: 1,
            limit: 10,
            tokenId: 't-filter',
            action: ConsentAccessAction.REVOKE,
            from: '2026-07-01T00:00:00.000Z',
            to: '2026-07-31T23:59:59.999Z',
        });

        expect(repo.listAccessLogs).toHaveBeenCalledWith(
            TENANT_A,
            {
                tokenId: 't-filter',
                action: ConsentAccessAction.REVOKE,
                from: new Date('2026-07-01T00:00:00.000Z'),
                to: new Date('2026-07-31T23:59:59.999Z'),
            },
            { skip: 0, take: 10 },
        );
    });

    it('listAccessLogs sin filtros usa filter vacío y defaults de paginación', async () => {
        const { service, repo } = buildService();
        repo.listAccessLogs.mockResolvedValueOnce({ data: [], total: 0 });

        const result = await service.listAccessLogs(VET_TENANT_A, {});

        expect(repo.listAccessLogs).toHaveBeenCalledWith(
            TENANT_A,
            {},
            { skip: 0, take: 20 }, // defaults: page=1, limit=20
        );
        expect(result.meta.totalPages).toBe(0);
        expect(result.meta.hasNextPage).toBe(false);
        expect(result.meta.hasPrevPage).toBe(false);
    });

    // ── 7) Bonus: issueToken valida expiresAt en el pasado ─────────────────
    it('issueToken rechaza expiresAt en el pasado con BadRequestException', async () => {
        const { service } = buildService();
        const past = new Date(Date.now() - 60_000).toISOString();

        await expect(
            service.issueToken(
                CLIENT_ACTOR,
                {
                    ownerUserId: CLIENT_ACTOR.sub,
                    granteeEmail: 'grantee@other-clinic.com',
                    scope: ConsentTokenScope.READ,
                    petIds: [PET_ID],
                    expiresAt: past,
                },
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('issueToken rechaza expiresAt a más de 90 días con BadRequestException', async () => {
        const { service } = buildService();
        const farFuture = new Date(
            Date.now() + 91 * 24 * 60 * 60 * 1000,
        ).toISOString();

        await expect(
            service.issueToken(
                CLIENT_ACTOR,
                {
                    ownerUserId: CLIENT_ACTOR.sub,
                    granteeEmail: 'grantee@other-clinic.com',
                    scope: ConsentTokenScope.READ,
                    petIds: [PET_ID],
                    expiresAt: farFuture,
                },
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('issueToken rechaza petIds que no pertenecen al tenant', async () => {
        const { service, repo } = buildService({
            // Simula que el repo reportó 1 pet como "fuera del tenant".
            findPetsResult: [{ id: PET_ID }],
        });

        await expect(
            service.issueToken(
                CLIENT_ACTOR,
                {
                    ownerUserId: CLIENT_ACTOR.sub,
                    granteeEmail: 'grantee@other-clinic.com',
                    scope: ConsentTokenScope.READ,
                    petIds: [PET_ID],
                    expiresAt: new Date(
                        Date.now() + 60_000,
                    ).toISOString(),
                },
                ctx,
            ),
        ).rejects.toBeInstanceOf(BadRequestException);

        // No se debe haber creado ningún token.
        expect(repo.createToken).not.toHaveBeenCalled();
    });

    it('issueToken rechaza roles que no son CLIENT ni staff del tenant', async () => {
        const { service } = buildService();
        const otherActor: JwtPayload = {
            ...VET_TENANT_A,
            // Un rol inventado sólo para el test.
            role: 'AUDITOR' as unknown as UserRole,
        };

        await expect(
            service.issueToken(
                otherActor,
                {
                    ownerUserId: OWNER_USER_ID,
                    granteeEmail: 'grantee@other-clinic.com',
                    scope: ConsentTokenScope.READ,
                    petIds: [PET_ID],
                    expiresAt: new Date(
                        Date.now() + 60_000,
                    ).toISOString(),
                },
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    // ── 8) revokeToken: cliente no-dueño no puede revocar ───────────────────
    it('revokeToken impide a un cliente revocar un token que no es suyo', async () => {
        const { service, repo } = buildService();
        const existing = makeToken({
            id: 't-other',
            ownerUserId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });
        repo.findTokenById.mockResolvedValueOnce(existing);

        await expect(
            service.revokeToken(
                CLIENT_ACTOR,
                't-other',
                {},
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('revokeToken impide a staff de otro tenant revocar el token', async () => {
        const { service, repo } = buildService();
        const existing = makeToken({
            id: 't-foreign',
            tenantId: TENANT_A,
            ownerUserId: OWNER_USER_ID,
        });
        repo.findTokenById.mockResolvedValueOnce(existing);

        const otherTenantStaff: JwtPayload = {
            sub: '99999999-9999-9999-9999-999999999999',
            tenantId: TENANT_B,
            email: 'vet@clinic-b.test',
            role: UserRole.VET,
        };

        await expect(
            service.revokeToken(
                otherTenantStaff,
                't-foreign',
                {},
                ctx,
            ),
        ).rejects.toBeInstanceOf(ForbiddenException);
    });
});
