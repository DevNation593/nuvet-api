# Pasaporte medico digital Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Formalizar el contrato de lectura del pasaporte medico y cerrar sus limites de acceso sin duplicar datos clinicos ni agregar migraciones.

**Architecture:** `PassportService` seguira construyendo una proyeccion de lectura desde `Pet`, `Vaccination`, `MedicalRecord`, `Surgery` y `Tenant`. Los DTOs del modulo definiran el contrato Swagger y los permisos compartidos alinearan los roles con los endpoints actuales. El acceso cross-tenant existente seguira condicionado a consentimiento y auditado, sin ampliar su flujo en esta fase.

**Tech Stack:** NestJS 11, TypeScript 5.9, Prisma 6, PostgreSQL, Jest 30, `class-validator`, `@nestjs/swagger`, `@nuvet/types`, pnpm.

## Global Constraints

- No crear una entidad `PetPassport` ni duplicar datos clinicos.
- No crear migraciones Prisma para esta fase.
- Mantener compatibilidad con `GET /api/v1/passport/pets/:petId`, `GET /api/v1/passport/lookup` y los endpoints actuales de shares.
- No incluir `prescriptions`, `notes`, adjuntos, tokens ni secretos en el pasaporte.
- Mantener el limite de 50 registros por categoria y orden descendente desde el mas reciente.
- Mantener auditoria de accesos cross-tenant y mediante share sin registrar tokens en claro en logs.
- Cada unidad revisable debe terminar en un commit separado.
- La rama de implementacion es `feat/fase-1-pasaporte-medico`, creada desde `dev`.
- Al finalizar los gates, se debe abrir un PR de `feat/fase-1-pasaporte-medico` hacia `dev`; no hacer merge automaticamente.

---

## File Map

- Modify: `src/passport/application/dto/passport.dto.ts` - DTOs de respuesta y metadatos Swagger del pasaporte.
- Modify: `src/passport/application/passport.service.ts` - validacion de mascota activa, autorizacion y proyeccion segura.
- Modify: `src/passport/infrastructure/http/passport.controller.ts` - tipo real de respuesta Swagger.
- Modify: `src/passport/infrastructure/http/passport-share.controller.ts` - tipo real de respuesta Swagger para share publico.
- Modify: `types/src/index.ts` - permisos de pasaporte para los roles que ya exponen sus endpoints.
- Modify: `src/passport/application/passport.service.spec.ts` - regresiones de acceso, redaccion, limite y agregacion.
- Create: `types/src/index.spec.ts` - regresiones de la matriz de permisos compartida.
- No modify: `prisma/schema.prisma` y `prisma/migrations/**`.

## Task 1: Add Failing Passport Contract And Boundary Tests

**Files:**
- Modify: `src/passport/application/passport.service.spec.ts`
- Create: `types/src/index.spec.ts`

**Interfaces:**
- Consumes: `PassportService.getPetPassport(actor, petId, ctx)` and `getRolePermissions(role)`.
- Produces: executable expectations for the DTO-safe projection, active-pet boundary, bounded queries and role permissions.

- [ ] **Step 1: Extend the passport test fixture with active state and query mocks.**

In `PET_FULL`, add `isActive: true`. In `buildPassportMocks`, keep references to the three `findMany` mocks and return them from the helper:

```ts
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

return {
    service,
    findUnique,
    consentService,
    auditWriter,
    vaccinationFindMany,
    medicalRecordFindMany,
    surgeryFindMany,
};
```

- [ ] **Step 2: Write the failing test for inactive pets.**

Append this test to the `getPetPassport` suite:

```ts
it('trata una mascota inactiva como no encontrada', async () => {
    const { service, findUnique } = buildPassportMocks();
    findUnique.mockResolvedValueOnce({ ...PET_FULL, isActive: false });

    await expect(service.getPetPassport(owner, 'pet-1', {}))
        .rejects.toThrow('Pet not found');
});
```

- [ ] **Step 3: Write the failing test for redaction and response shape.**

Configure the medical record mock with private fields and assert that the returned projection omits them:

```ts
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
```

- [ ] **Step 4: Write the failing test for bounded, descending queries.**

Assert the exact query contract for every clinical category:

```ts
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
```

- [ ] **Step 5: Write the failing tests for role permissions.**

Create `types/src/index.spec.ts`:

```ts
import { getRolePermissions, PermissionAction, PermissionModule, UserRole } from './index';

const permission = (action: PermissionAction) =>
    `${PermissionModule.PASSPORT}:${action}` as const;

describe('passport role permissions', () => {
    it('permite lectura a veterinarios y recepcionistas', () => {
        expect(getRolePermissions(UserRole.VET)).toContain(permission(PermissionAction.READ));
        expect(getRolePermissions(UserRole.RECEPTIONIST)).toContain(permission(PermissionAction.READ));
    });

    it('permite las acciones de share al cliente propietario y al staff que las expone', () => {
        expect(getRolePermissions(UserRole.CLIENT)).toEqual(
            expect.arrayContaining([
                permission(PermissionAction.READ),
                permission(PermissionAction.CREATE),
                permission(PermissionAction.DELETE),
            ]),
        );
        expect(getRolePermissions(UserRole.CLINIC_ADMIN)).toEqual(
            expect.arrayContaining([
                permission(PermissionAction.READ),
                permission(PermissionAction.CREATE),
                permission(PermissionAction.DELETE),
            ]),
        );
    });
});
```

- [ ] **Step 6: Run the focused tests and verify the new tests fail for the intended reasons.**

Run:

```bash
pnpm exec jest src/passport/application/passport.service.spec.ts types/src/index.spec.ts --runInBand
```

Expected: FAIL because inactive pets are currently not rejected and the role matrix does not consistently grant the passport permissions required by the existing controllers. The redaction and query assertions should remain green if their current implementation already satisfies them.

- [ ] **Step 7: Commit the regression tests.**

```bash
git add src/passport/application/passport.service.spec.ts types/src/index.spec.ts
git commit -m "test(passport): cover passport boundaries and contract"
```

## Task 2: Formalize The Passport DTO And Swagger Contract

**Files:**
- Modify: `src/passport/application/dto/passport.dto.ts`
- Modify: `src/passport/infrastructure/http/passport.controller.ts`
- Modify: `src/passport/infrastructure/http/passport-share.controller.ts`

**Interfaces:**
- Consumes: Existing `PassportPublicPet`, `LookupResultDto`, `ShareResponseDto` response shapes and `types/src/api-contract.ts` compatibility interfaces.
- Produces: Swagger metadata that exposes `PassportPublicPet` instead of `Object`, while preserving all existing JSON property names and types.

- [ ] **Step 1: Add Swagger metadata classes without changing serialized names.**

Import `ApiProperty` and define nested response classes before `PassportPublicPet`:

```ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PassportIssuedByDto {
    @ApiProperty() tenantId!: string;
    @ApiProperty() tenantName!: string;
}

export class PassportVaccineDto {
    @ApiProperty() id!: string;
    @ApiProperty() vaccineName!: string;
    @ApiPropertyOptional({ nullable: true }) manufacturer!: string | null;
    @ApiPropertyOptional({ nullable: true }) batchNumber!: string | null;
    @ApiProperty() administeredAt!: Date;
    @ApiPropertyOptional({ nullable: true }) nextDueAt!: Date | null;
    @ApiProperty() status!: string;
}

export class PassportMedicalRecordDto {
    @ApiProperty() id!: string;
    @ApiProperty() date!: Date;
    @ApiProperty() chiefComplaint!: string;
    @ApiProperty() diagnosis!: string;
    @ApiProperty() treatment!: string;
    @ApiPropertyOptional({ nullable: true }) vetName!: string | null;
}

export class PassportSurgeryDto {
    @ApiProperty() id!: string;
    @ApiProperty() scheduledAt!: Date;
    @ApiPropertyOptional({ nullable: true }) completedAt!: Date | null;
    @ApiProperty() type!: string;
    @ApiProperty() status!: string;
    @ApiPropertyOptional({ nullable: true }) postInstructions!: string | null;
}

export class PassportWeightEntryDto {
    @ApiProperty() date!: Date;
    @ApiProperty() weight!: number;
}
```

Decorate `PassportPublicPet` with `@ApiProperty` for scalar fields and
`@ApiProperty({ type: () => NestedDto, isArray: true })` for nested arrays. Use
`nullable: true` for nullable fields. Keep the class name and property names
unchanged so the runtime contract remains compatible.

- [ ] **Step 2: Tighten microchip query validation.**

Add `IsNotEmpty` to the existing validator import and decorate the field:

```ts
@IsString()
@IsNotEmpty()
@MaxLength(64)
microchip!: string;
```

- [ ] **Step 3: Replace generic Swagger response types.**

In `passport.controller.ts`, change the passport response from `Object` to
`PassportPublicPet`. In `passport-share.controller.ts`, import the same DTO and
change its success response to `type: PassportPublicPet`. Do not change route
paths, status codes or JSON fields.

- [ ] **Step 4: Run the contract checks.**

Run:

```bash
pnpm run build:types
pnpm exec jest src/passport/application/passport.service.spec.ts --runInBand
```

Expected: `build:types` passes, the passport tests pass except for the intended
inactive-pet and permission failures from Task 1, and no DTO property is
removed from the existing response shape.

- [ ] **Step 5: Commit the contract changes.**

```bash
git add src/passport/application/dto/passport.dto.ts src/passport/infrastructure/http/passport.controller.ts src/passport/infrastructure/http/passport-share.controller.ts
git commit -m "feat(passport): formalize passport response contract"
```

## Task 3: Enforce Active-Pet Boundaries And Role Permissions

**Files:**
- Modify: `src/passport/application/passport.service.ts`
- Modify: `types/src/index.ts`
- Test: `src/passport/application/passport.service.spec.ts`
- Test: `types/src/index.spec.ts`

**Interfaces:**
- Consumes: Existing `JwtPayloadLike`, `PassportService.resolveAccess`, `PassportService.aggregate`, `PermissionModule.PASSPORT` and `PermissionAction`.
- Produces: Inactive pets treated as not found, same-tenant ownership/staff checks preserved, cross-tenant consent path preserved, and role permissions aligned with the controller decorators.

- [ ] **Step 1: Update the pet lookup in `resolveAccess`.**

Include `isActive` in the selected fields and reject inactive records before any
ownership or consent decision:

```ts
const pet = await this.passportPrisma.client.pet.findUnique({
    where: { id: petId },
    select: { id: true, ownerId: true, tenantId: true, isActive: true },
});
if (!pet || !pet.isActive) throw new NotFoundException('Pet not found');
```

Keep the existing same-tenant owner/staff rules and the existing
`findActiveGrantForPetAndTenant` call unchanged.

- [ ] **Step 2: Apply the same active check in `aggregate`.**

The public share path calls `aggregate` without `resolveAccess`, so its pet
query must also include `isActive` and reject inactive pets:

```ts
const pet = await this.passportPrisma.client.pet.findUnique({
    where: { id: petId },
    include: { tenant: { select: { id: true, name: true } } },
});
if (!pet || !pet.isActive) throw new NotFoundException('Pet not found');
```

Do not add private fields to the returned DTO. Keep the existing `Promise.all`
queries, `take: PASSPORT_AGGREGATION_LIMIT`, descending order and mapping logic.

- [ ] **Step 3: Align shared role permissions with exposed controller roles.**

In `types/src/index.ts`:

- Add `...permissionsForModule(PermissionModule.PASSPORT)` to `UserRole.VET`, because the service permits VET share creation/revocation and the controller exposes those routes.
- Add `${PermissionModule.PASSPORT}:${PermissionAction.READ}` to `UserRole.RECEPTIONIST`, because the controller permits receptionist read access but not share mutation.
- Ensure `UserRole.CLIENT` and `UserRole.CLINIC_ADMIN` include the full passport permission set required by their existing controller routes.

Do not add consent permissions to this task; consent changes belong to Fase 2.

- [ ] **Step 4: Run the focused tests and verify all intended regressions pass.**

Run:

```bash
pnpm exec jest src/passport/application/passport.service.spec.ts types/src/index.spec.ts --runInBand
```

Expected: PASS for inactive-pet rejection, DTO redaction, bounded queries,
same-tenant access, cross-tenant consent denial/allowance and the role matrix.

- [ ] **Step 5: Commit the boundary changes.**

```bash
git add src/passport/application/passport.service.ts types/src/index.ts
git commit -m "fix(passport): enforce passport access boundaries"
```

## Task 4: Execute Phase Quality Gates And Prepare The PR

**Files:**
- Review only: all files changed by Tasks 1-3.
- No new source files.

**Interfaces:**
- Consumes: Commits created by Tasks 1-3 and the acceptance criteria in `docs/superpowers/specs/2026-07-14-fase-1-pasaporte-medico-design.md`.
- Produces: A verified branch and a pull request from `feat/fase-1-pasaporte-medico` to `dev`.

- [ ] **Step 1: Inspect the final branch diff and confirm scope.**

Run:

```bash
git status --short
git diff --stat dev...HEAD
git diff --name-only dev...HEAD
git log --oneline dev..HEAD
```

Expected: only the passport DTO/controller/service tests, shared role permissions,
the approved design and the implementation plan are present. No unrelated
worktree changes are staged or committed, and no Prisma schema or migration file
is modified.

- [ ] **Step 2: Run the focused test gate.**

Run:

```bash
pnpm exec jest src/passport/application/passport.service.spec.ts types/src/index.spec.ts --runInBand
```

Expected: all selected tests pass with zero failures.

- [ ] **Step 3: Run static and build gates.**

Run each command separately:

```bash
pnpm lint
pnpm build:types
pnpm build
```

Expected: each command exits with status 0. `pnpm build` may execute the
repository's migration deploy step; do not run it against a production database.

- [ ] **Step 4: Inspect PR template before creating the PR.**

Search for `pull_request_template.md` and `.github/PULL_REQUEST_TEMPLATE/`.
Use the repository template, if present, to structure the PR body with:

- Summary of the formal passport contract.
- Access-boundary and role-permission changes.
- Tests and quality-gate commands executed.
- Explicit statement that no Prisma migration was added.
- Compatibility and rollback notes.

- [ ] **Step 5: Push the phase branch and create the PR toward `dev`.**

Only after the previous gates pass:

```bash
git push -u origin feat/fase-1-pasaporte-medico
```

Create a PR with base `dev`, head `feat/fase-1-pasaporte-medico`, and a title
such as `feat(api): formalize phase 1 medical passport`. Do not merge it.

## Acceptance Coverage

- Owner and authorized staff access: Task 1 tests plus Task 3 service rules.
- Unauthorized access returns `403`: existing cross-tenant denial test retained and expanded in Task 1.
- Missing or inactive pet returns `404`: Task 1 and Task 3.
- Microchip lookup exposes identity only: existing controller/service contract retained; DTO validation tightened in Task 2.
- Public DTO excludes private medical fields: Task 1 and Task 2.
- Category limit and descending ordering: Task 1 query assertions.
- Cross-tenant/share audit behavior remains intact: existing service tests retained; no audit path removed in Task 3.
- No destructive contract or schema change: Task 2 compatibility checks and Task 4 scope inspection.

## Plan Self-Review

- Spec coverage checked: scope, API endpoints, security, acceptance criteria,
  commits, verification and rollback are represented in Tasks 1-4.
- Placeholder scan completed: no `TBD`, `TODO` or unspecified implementation
  step is required by this plan.
- Type consistency checked: `PassportPublicPet`, nested DTO names,
  `getPetPassport`, `resolveAccess`, `aggregate`, `getRolePermissions`,
  `PermissionModule.PASSPORT` and `PermissionAction` match repository symbols.
- No database migration is included, matching the approved design.
