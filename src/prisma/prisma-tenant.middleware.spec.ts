import { applyTenantScope } from './prisma-tenant.middleware';
import { tenantContext } from '../common/tenant-context';

describe('PrismaTenantTenantScopeExtension', () => {

    const runWithTenant = (tenantId: string, fn: () => void) => {
        tenantContext.run({ tenantId }, fn);
    };

    it('injects tenantId into create data when context has tenantId', () => {
        runWithTenant('tenant-1', () => {
            const args = {
                data: { petId: 'p1', type: 'CONSULTATION', scheduledAt: new Date() },
            };

            const scoped = applyTenantScope('Appointment', 'create', args) as typeof args;

            expect(scoped.data).toMatchObject({ tenantId: 'tenant-1', petId: 'p1' });
        });
    });

    it('injects tenantId into findMany where when context has tenantId', () => {
        runWithTenant('tenant-2', () => {
            const args = { where: { isActive: true } };
            const scoped = applyTenantScope('Pet', 'findMany', args) as typeof args;
            expect(scoped.where).toEqual({ isActive: true, tenantId: 'tenant-2' });
        });
    });

    it('injects tenantId into update where when context has tenantId', () => {
        runWithTenant('tenant-3', () => {
            const args = { where: { id: 'u1' }, data: { firstName: 'John' } };
            const scoped = applyTenantScope('User', 'update', args) as typeof args;
            expect(scoped.where).toMatchObject({ id: 'u1', tenantId: 'tenant-3' });
        });
    });

    it('does not inject when model is not tenant-scoped', () => {
        runWithTenant('tenant-1', () => {
            const args = { where: {} };
            const scoped = applyTenantScope('RefreshToken', 'findMany', args) as typeof args;
            expect(scoped.where).toEqual({});
        });
    });

    it('does not inject when tenantId is not in context', () => {
        const args = {
            data: { petId: 'p1', type: 'CONSULTATION', scheduledAt: new Date() },
        };

        const scoped = applyTenantScope('Appointment', 'create', args) as typeof args;
        expect(scoped.data).not.toHaveProperty('tenantId');
    });
});
