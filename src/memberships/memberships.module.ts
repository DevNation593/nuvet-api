import { Module } from '@nestjs/common';
import { MembershipPlansService } from './application/membership-plans.service';
import { MembershipSubscriptionsService } from './application/membership-subscriptions.service';
import { MembershipPlansController } from './infrastructure/http/membership-plans.controller';
import { MembershipSubscriptionsController } from './infrastructure/http/membership-subscriptions.controller';
import { PrismaMembershipPlanRepository } from './infrastructure/persistence/prisma-membership-plan.repository';
import { PrismaMembershipSubscriptionRepository } from './infrastructure/persistence/prisma-membership-subscription.repository';
import { PrismaMembershipBillingAttemptReportRepository } from './infrastructure/persistence/prisma-membership-billing-attempt-report.repository';
import { MockBillingProvider } from './infrastructure/billing/mock-billing.provider';
import { MembershipRenewalCron } from './infrastructure/cron/membership-renewal-cron';
import {
    BILLING_PROVIDER,
} from './application/billing/billing-provider.token';
import {
    BILLING_ATTEMPT_QUERY_REPOSITORY,
    MEMBERSHIP_PLAN_REPOSITORY,
    MEMBERSHIP_SUBSCRIPTION_REPOSITORY,
} from './domain/membership.repository';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
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
            useClass: MockBillingProvider,
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
