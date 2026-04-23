import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { HttpCacheInterceptor } from './common/interceptors/http-cache.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { RedisModule } from './redis/redis.module';
import { FeatureFlagsModule } from './common/feature-flags/feature-flags.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { PetsModule } from './pets/pets.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { VaccinationsModule } from './vaccinations/vaccinations.module';
import { AestheticsModule } from './aesthetics/aesthetics.module';
import { GroomingModule } from './grooming/grooming.module';
import { SurgeriesModule } from './surgeries/surgeries.module';
import { StoreModule } from './store/store.module';
import { InventoryModule } from './inventory/inventory.module';
import { AdoptionsModule } from './adoptions/adoptions.module';
import { AdoptionAnimalsModule } from './adoption-animals/adoption-animals.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { DiscountsModule } from './discounts/discounts.module';
import { BranchesModule } from './branches/branches.module';
import { PosModule } from './pos/pos.module';
import { BillingModule } from './billing/billing.module';
import { AuditModule } from './audit/audit.module';
import { ObservabilityModule } from './observability/observability.module';
import { appConfig } from './config/app.config';
import { billingConfig } from './config/billing.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';

@Module({
    imports: [
        // ── Config ──────────────────────────────────────────────────────────────
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, jwtConfig, redisConfig, billingConfig],
            envFilePath: ['.env.local', '.env'],
        }),

        // ── Rate limiting ────────────────────────────────────────────────────────
        ThrottlerModule.forRoot([
            { ttl: 60000, limit: 100 },  // 100 requests per minute
        ]),

        // ── Scheduler ───────────────────────────────────────────────────────────
        ScheduleModule.forRoot(),

        // ── Core infrastructure ──────────────────────────────────────────────────
        PrismaModule,
        RedisModule,
        StorageModule,
        ObservabilityModule,
        FeatureFlagsModule,

        // ── App features ─────────────────────────────────────────────────────────
        HealthModule,
        AuthModule,
        TenantsModule,
        UsersModule,
        ClientsModule,
        PetsModule,
        AppointmentsModule,
        MedicalRecordsModule,
        VaccinationsModule,
        AestheticsModule,
        GroomingModule,
        SurgeriesModule,
        StoreModule,
        InventoryModule,
        AdoptionsModule,
        AdoptionAnimalsModule,
        NotificationsModule,
        ReportsModule,
        FilesModule,
        DiscountsModule,
        BranchesModule,
        PosModule,
        BillingModule,
        AuditModule,
    ],
    providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
        { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    ],
})
export class AppModule { }
