import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';
import { RedisModule } from './redis/redis.module';
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
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { StorageModule } from './storage/storage.module';
import { FilesModule } from './files/files.module';
import { DiscountsModule } from './discounts/discounts.module';
import { appConfig } from './config/app.config';
import { databaseConfig } from './config/database.config';
import { jwtConfig } from './config/jwt.config';
import { redisConfig } from './config/redis.config';
import { s3Config } from './config/s3.config';

@Module({
    imports: [
        // ── Config ──────────────────────────────────────────────────────────────
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig, databaseConfig, jwtConfig, redisConfig, s3Config],
            envFilePath: ['.env.local', '.env'],
        }),

        // ── Rate limiting ────────────────────────────────────────────────────────
        ThrottlerModule.forRoot([
            { ttl: 60000, limit: 100 },  // 100 requests per minute
        ]),

        // ── Core infrastructure ──────────────────────────────────────────────────
        PrismaModule,
        RedisModule,
        StorageModule,

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
        NotificationsModule,
        ReportsModule,
        FilesModule,
        DiscountsModule,
    ],
    providers: [
        { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    ],
})
export class AppModule { }
