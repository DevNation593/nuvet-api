import { Module } from '@nestjs/common';
import { TenantsController } from './infrastructure/http/tenants.controller';
import { TenantsService } from './application/tenants.service';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma-tenant.repository';
import { TENANT_REPOSITORY } from './domain/tenant.repository';

@Module({
    controllers: [TenantsController],
    providers: [
        { provide: TENANT_REPOSITORY, useClass: PrismaTenantRepository },
        TenantsService,
    ],
})
export class TenantsModule { }