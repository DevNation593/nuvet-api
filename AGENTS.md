# AI Agent Guide: NuVet API

**Project**: Multi-tenant veterinary clinic SaaS API (NestJS + Prisma + PostgreSQL)

**Quick Links**: [README.md](README.md) | [Schema](prisma/schema.prisma) | [Main App](src/app.module.ts)

---

## 🏗️ Architecture

### Module Structure
Every domain follows a **3-layer pattern** with dependency injection:

```
src/{domain}/
├── {domain}.module.ts          # NestJS module, dependency setup
├── application/
│   ├── {domain}.service.ts      # Business logic (use repositories)
│   └── dto/
│       └── {domain}.dto.ts      # DTOs with class-validator decorators
├── domain/
│   └── {domain}.repository.ts   # Repository interface & DI token (e.g., `USER_REPOSITORY`)
└── infrastructure/
    ├── http/{domain}.controller.ts  # HTTP endpoints, decorators (@Roles, @Permissions)
    └── persistence/
        └── prisma-{domain}.repository.ts  # Prisma implementation
```

### Key Patterns
- **Repositories**: Injected via `@Inject(DOMAIN_REPOSITORY)`. Always use repository interface in services.
- **DTOs**: Extend `PartialType()` for update operations. Use `class-validator` decorators.
- **Multi-tenancy**: Automatic `tenantId` injection via Prisma middleware (`applyTenantScope`). Use `getTenantId()` context.
- **Decorators**: `@Roles()`, `@Permissions()`, `@Public()`, `@CurrentUser()` control access.
- **Pagination**: Use `buildPaginationArgs()` and `buildPaginatedResponse()` from `common/dto/pagination.dto`.

---

## 🚀 Build & Run

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start with watch mode (port 3000) |
| `pnpm build` | Compile to `dist/` + Lambda webpack |
| `pnpm start` | Run compiled app |
| `pnpm test` | Run Jest tests |
| `pnpm lint` | ESLint check |
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Create & apply migration |
| `pnpm prisma:seed:full` | Populate demo data |
| `docker compose up -d` | Spin up Postgres, Redis, MinIO |

**Swagger**: http://localhost:3000/api/v1/docs (non-production only)

---

## 🔑 Essential Files & Conventions

### Core Setup
- **[main.ts](src/main.ts)** – Express bootstrap, global pipes/filters, Swagger setup
- **[app.module.ts](src/app.module.ts)** – Root module, all features imported, global guards (Throttler, TenantContext, Cache, Audit)
- **[app.config.ts](src/config/app.config.ts)** – Environment config registration
- **[schema.prisma](prisma/schema.prisma)** – Data model with tenant scoping

### Multi-tenancy
- **[prisma-tenant.middleware.ts](src/prisma/prisma-tenant.middleware.ts)** – Auto-injects `tenantId` on all scoped models
- **[tenant-context.ts](src/common/tenant-context.ts)** – `getTenantId()` extracts from request context
- **Scoped models**: User, Pet, Appointment, Order, etc. (see `TENANT_SCOPED_MODELS` set)

### Common Utilities
- **[common/guards/](src/common/guards/)** – JWT, Roles, Permissions guards
- **[common/decorators/](src/common/decorators/)** – @Public, @Roles, @Permissions, @CurrentUser
- **[common/interceptors/](src/common/interceptors/)** – TenantContext, HttpCache, Audit, Transform, Trace
- **[common/dto/pagination.dto.ts](src/common/dto/pagination.dto.ts)** – Pagination helpers

---

## 📋 Typical Feature Implementation

### 1. **Add a Controller Endpoint**
```typescript
// src/{domain}/infrastructure/http/{domain}.controller.ts
@Controller({ path: '{domain}', version: '1' })
@Roles(UserRole.CLINIC_ADMIN)
export class {Domain}Controller {
  constructor(private readonly {domain}Service: {Domain}Service) {}

  @Post()
  @Permissions(`${PermissionModule.{DOMAIN}}:${PermissionAction.CREATE}`)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Description' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDto) {
    return this.{domain}Service.create(user.tenantId, dto);
  }
}
```

### 2. **Implement Service Logic**
```typescript
// src/{domain}/application/{domain}.service.ts
@Injectable()
export class {Domain}Service {
  constructor(
    @Inject(DOMAIN_REPOSITORY) private readonly repo: I{Domain}Repository,
  ) {}

  async create(tenantId: string, dto: CreateDto) {
    // Validate
    const existing = await this.repo.findByUnique(tenantId, dto.email);
    if (existing) throw new ConflictException('Already exists');
    
    // Create
    return this.repo.create({ tenantId, ...dto });
  }
}
```

### 3. **Define Repository Interface**
```typescript
// src/{domain}/domain/{domain}.repository.ts
export const DOMAIN_REPOSITORY = Symbol('DOMAIN_REPOSITORY');

export interface I{Domain}Repository {
  findOne(tenantId: string, id: string): Promise<{Domain} | null>;
  create(data: Create{Domain}Data): Promise<{Domain}>;
}
```

### 4. **Implement with Prisma**
```typescript
// src/{domain}/infrastructure/persistence/prisma-{domain}.repository.ts
@Injectable()
export class Prisma{Domain}Repository implements I{Domain}Repository {
  constructor(private prisma: PrismaService) {}

  async findOne(tenantId: string, id: string) {
    // tenantId is auto-injected by middleware, but explicit for clarity
    return this.prisma.{domain}.findFirst({
      where: { id, tenantId },
    });
  }

  async create(data: Create{Domain}Data) {
    return this.prisma.{domain}.create({ data });
  }
}
```

### 5. **Register in Module**
```typescript
// src/{domain}/{domain}.module.ts
@Module({
  controllers: [{Domain}Controller],
  providers: [
    { provide: DOMAIN_REPOSITORY, useClass: Prisma{Domain}Repository },
    {Domain}Service,
  ],
  exports: [{Domain}Service],
})
export class {Domain}Module {}
```

---

## 🗂️ Module Overview

### Core Features
| Module | Purpose |
|--------|---------|
| **auth** | JWT token issuing, validation, refresh token rotation |
| **users** | Staff management (vets, receptionists, inventory) |
| **clients** | Pet owner accounts |
| **pets** | Pet records (species, breed, medical history) |
| **appointments** | Scheduling (vet, grooming, consultation, etc.) |
| **medical-records** | Clinical notes, diagnoses, attachments |
| **vaccinations** | Vaccine tracking & reminders |
| **aesthetics** | Grooming services |
| **surgeries** | Surgical procedures with pre/post instructions |
| **store** | Product catalog & orders |
| **inventory** | Stock management & movements |
| **pos** | Cash register, POS tickets, refunds, invoicing |
| **billing** | Integration with Faktur (Ecuador tax/invoicing) |
| **discounts** | Promotional discounts (% fixed, BOGO, category-based) |
| **notifications** | In-app, email, SMS alerts & templates |
| **reports** | Analytics (appointments, revenue, inventory, KPIs) |
| **branches** | Multi-location support |
| **adoptions** | Pet adoption workflows |
| **tenants** | Tenant (clinic) creation & management |
| **audit** | Change logs |

---

## 🔐 Common Pitfalls

1. **Forget to inject tenantId**: Services must pass `tenantId` to repos; middleware auto-injects in queries.
2. **Missing `@Public()` on health endpoints**: Auth guard is global; exempt public routes with `@Public()`.
3. **Weak password hashing**: Always use `bcrypt.hash(..., 12)` for passwords, never store plain text.
4. **Duplicate scoped model**: Check `TENANT_SCOPED_MODELS` set before adding new tenantId fields.
5. **findUnique() with tenantId**: Only use unique constraints; use `findFirst()` for tenant-scoped lookups.

---

## 📊 Database

- **Multi-tenancy**: All user-facing data includes `tenantId`.
- **Soft deletes**: Most entities use `isActive` boolean; no hard deletes unless specified.
- **Audit trail**: `AuditLog` table tracks user actions (CREATE, UPDATE, DELETE).
- **Billing entities**: `PosTicket`, `Invoice`, `Payment` integrate with Faktur API.

---

## 🧪 Testing Tips

- Jest config in [jest.config.cjs](jest.config.cjs)
- Test database: Use PostgreSQL container or in-memory Prisma mock
- Common seeds: Run `pnpm prisma:seed:full` to populate demo clinic data

---

## 🔗 External Integrations

- **Faktur**: Ecuador billing/invoicing (see [billing/](src/billing/))
- **MinIO/S3**: File storage for medical attachments, invoices
- **Redis**: Job queues, caching
- **Stripe/Payment Gateway**: For future payment processing (placeholders in billing module)

---

## 📝 Code Style

- **Naming**: camelCase for variables, PascalCase for classes/modules, UPPER_CASE for constants
- **Imports**: Group by: NestJS → third-party → local types → local services
- **Error handling**: Throw specific HTTP exceptions (`ConflictException`, `NotFoundException`, etc.)
- **Logging**: Use `Logger` from `@nestjs/common`; avoid `console.log` in production code
- **Type safety**: Always return typed DTOs, not raw Prisma models

---

## 🎯 Quick Reference: Add a New Feature

1. Create module folder: `src/{feature}/{feature}.module.ts`
2. Define repository interface in `domain/`
3. Implement Prisma repository in `infrastructure/persistence/`
4. Write service in `application/`
5. Create DTOs in `application/dto/`
6. Add controller in `infrastructure/http/`
7. Import module in `app.module.ts`
8. Run `pnpm dev` to test
9. Add Swagger tags in `main.ts` if needed

---

## 📚 Environment Variables

See [README.md](README.md) for full list. Key ones:
- `DATABASE_URL` – PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT` – Redis config
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` – Auth tokens
- `S3_ENDPOINT`, `S3_ACCESS_KEY` – MinIO/S3 storage
- `BILLING_FAKTUR_*` – Ecuador tax system integration

---

**Last Updated**: 2026-06-08  
**Version**: 1.0.0  
**Contact**: Stiwar Saltos (admin@nuvet-clinic.com)
