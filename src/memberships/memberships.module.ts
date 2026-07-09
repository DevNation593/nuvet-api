import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { ConfigType } from '@nestjs/config';
import { payphoneConfig } from '../config/payphone.config';
import { MembershipPlansService } from './application/membership-plans.service';
import { MembershipSubscriptionsService } from './application/membership-subscriptions.service';
import { MembershipPlansController } from './infrastructure/http/membership-plans.controller';
import { MembershipSubscriptionsController } from './infrastructure/http/membership-subscriptions.controller';
import { PrismaMembershipPlanRepository } from './infrastructure/persistence/prisma-membership-plan.repository';
import { PrismaMembershipSubscriptionRepository } from './infrastructure/persistence/prisma-membership-subscription.repository';
import { PrismaMembershipBillingAttemptReportRepository } from './infrastructure/persistence/prisma-membership-billing-attempt-report.repository';
import { MockBillingProvider } from './infrastructure/billing/mock-billing.provider';
import { PayPhoneBillingProvider } from './infrastructure/billing/payphone-billing.provider';
import { MembershipRenewalCron } from './infrastructure/cron/membership-renewal-cron';
import {
    BILLING_PROVIDER,
} from './application/billing/billing-provider.token';
import {
    BILLING_ATTEMPT_QUERY_REPOSITORY,
    MEMBERSHIP_PLAN_REPOSITORY,
    MEMBERSHIP_SUBSCRIPTION_REPOSITORY,
} from './domain/membership.repository';
import { FeatureFlagsService } from '../common/feature-flags/feature-flags.service';
import { PassportPrismaService } from '../prisma/passport-prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule, ConfigModule],
    controllers: [
        MembershipPlansController,
        MembershipSubscriptionsController,
    ],
    providers: [
        {
            provide: MEMBERSHIP_PLAN_REPOSITORY,
            useClass: PrismaMembershipPlanRepository,
        },
        {
            provide: MEMBERSHIP_SUBSCRIPTION_REPOSITORY,
            useClass: PrismaMembershipSubscriptionRepository,
        },
        {
            provide: BILLING_ATTEMPT_QUERY_REPOSITORY,
            useClass: PrismaMembershipBillingAttemptReportRepository,
        },
        // `MockBillingProvider` se inyecta como el `BillingProvider` por
        // defecto. Cuando llegue Stripe/PayPhone, sólo cambia el binding.
        {
            provide: BILLING_PROVIDER,
            inject: [FeatureFlagsService, ConfigService, PassportPrismaService],
            useFactory: (
                flags: FeatureFlagsService,
                config: ConfigService,
                passportPrisma: PassportPrismaService,
            ) => {
                const usePayPhone = flags.isEnabled(
                    'billing_payphone_provider',
                    false,
                );
                if (usePayPhone) {
                    const token = config.get<string>('payphone.token');
                    const storeId = config.get<string>('payphone.storeId');
                    if (!token || !storeId) {
                        new Logger('MembershipsModule').warn(
                            'billing_payphone_provider=true pero faltan ' +
                                'PAYPHONE_TOKEN / PAYPHONE_STORE_ID — ' +
                                'fallback a MockBillingProvider para no romper cobros',
                        );
                        return new MockBillingProvider(passportPrisma);
                    }
                    const payphoneCfg = config.get(
                        payphoneConfig.KEY,
                    ) as ConfigType<typeof payphoneConfig>;
                    return new PayPhoneBillingProvider(payphoneCfg);
                }
                return new MockBillingProvider(passportPrisma);
            },
        },
        MembershipPlansService,
        MembershipSubscriptionsService,
        MembershipRenewalCron,
    ],
    exports: [
        MembershipPlansService,
        MembershipSubscriptionsService,
    ],
})
export class MembershipsModule {}
