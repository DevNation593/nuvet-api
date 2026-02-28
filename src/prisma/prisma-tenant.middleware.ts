import { Prisma } from '@prisma/client';
import { getTenantId } from '../common/tenant-context';

const TENANT_SCOPED_MODELS = new Set([
    'User', 'Pet', 'Appointment', 'MedicalRecord', 'Vaccination', 'AestheticService',
    'Surgery', 'Product', 'Order', 'Adoption', 'Notification', 'AuditLog',
    'ClinicHours', 'StaffSchedule', 'Block', 'Holiday', 'MedicalRecordAttachment',
    'ProductBatch', 'StockMovement', 'Payment', 'OrderItem',
]);

function hasTenantId(model: string): boolean {
    return TENANT_SCOPED_MODELS.has(model);
}

function injectTenantWhere(args: Record<string, unknown>, tenantId: string): void {
    const where = (args.where as Record<string, unknown>) ?? {};
    args.where = { ...where, tenantId };
}

function injectTenantData(args: Record<string, unknown>, tenantId: string): void {
    if (typeof args.data === 'object' && args.data !== null) {
        if (Array.isArray(args.data)) {
            (args.data as Record<string, unknown>[]).forEach((item) => {
                if (item && typeof item === 'object' && item.tenantId === undefined) {
                    item.tenantId = tenantId;
                }
            });
        } else {
            const data = args.data as Record<string, unknown>;
            if (data.tenantId === undefined) data.tenantId = tenantId;
        }
    }
    if (typeof args.create === 'object' && args.create !== null) {
        if (Array.isArray(args.create)) {
            (args.create as Record<string, unknown>[]).forEach((item) => {
                if (item && typeof item === 'object' && item.tenantId === undefined) {
                    item.tenantId = tenantId;
                }
            });
        } else {
            const create = args.create as Record<string, unknown>;
            if (create.tenantId === undefined) create.tenantId = tenantId;
        }
    }
}

export function applyTenantScope(model: string, action: string, rawArgs: unknown): unknown {
    const tenantId = getTenantId();
    if (!hasTenantId(model) || tenantId == null) return rawArgs;

    const args = ((rawArgs ?? {}) as Record<string, unknown>);

    switch (action) {
        case 'create':
        case 'createMany':
        case 'createManyAndReturn':
            injectTenantData(args, tenantId);
            break;
        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
            injectTenantWhere(args, tenantId);
            break;
        case 'findUnique':
        case 'findUniqueOrThrow':
            // Do not inject tenantId: findUnique requires only unique constraint fields.
            // Services must use findFirst({ where: { id, tenantId } }) for tenant-scoped lookups by id.
            break;
        case 'update':
        case 'updateMany':
        case 'updateManyAndReturn':
        case 'delete':
        case 'deleteMany':
            injectTenantWhere(args, tenantId);
            break;
        case 'upsert':
            injectTenantData(args, tenantId);
            if (args.where) {
                (args.where as Record<string, unknown>).tenantId = tenantId;
            }
            break;
        default:
            break;
    }

    return args;
}

export function createTenantExtension() {
    return Prisma.defineExtension({
        name: 'tenant-scope',
        query: {
            $allModels: {
                async $allOperations({
                    model,
                    operation,
                    args,
                    query,
                }: {
                    model?: string;
                    operation: string;
                    args: unknown;
                    query: (nextArgs: unknown) => Promise<unknown>;
                }) {
                    if (!model) return query(args);
                    return query(applyTenantScope(model, operation, args));
                },
            },
        },
    });
}
