import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipSubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeatureFlagsService } from '../../../common/feature-flags/feature-flags.service';
import { NotificationsService } from '../../../notifications/application/notifications.service';
import { MembershipSubscriptionsService } from '../../application/membership-subscriptions.service';


const MEMBERSHIP_RENEWAL_CRON =
    process.env.MEMBERSHIP_RENEWAL_CRON ?? CronExpression.EVERY_DAY_AT_8AM;
const MEMBERSHIP_RENEWAL_TIMEZONE =
    process.env.MEMBERSHIP_RENEWAL_TIMEZONE ?? 'America/Guayaquil';
/** Días antes del próximo cobro para notificar al dueño. */
const REMINDER_WINDOW_DAYS = parseInt(
    process.env.MEMBERSHIP_REMINDER_WINDOW_DAYS ?? '7',
    10,
);

@Injectable()
export class MembershipRenewalCron {
    private readonly logger = new Logger(MembershipRenewalCron.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly subscriptions: MembershipSubscriptionsService,
        private readonly notificationsService: NotificationsService,
        private readonly featureFlagsService: FeatureFlagsService,
    ) {}

    /**
     * Cada día a las 08:00 (Guayaquil):
     *   1. Encuentra suscripciones cuyo `nextBillingAt` está en la ventana
     *      de aviso (default próximos 7 días) y crea una notificación
     *      recordatoria al dueño.
     *   2. Encuentra suscripciones ya vencidas (`currentPeriodEnd < now`)
     *      y las marca como `EXPIRED`.
     *   3. (Futuro) corre cobros reales; hoy el mock es idempotente así
     *      que sólo procesamos enventos de reminder + expiración.
     */
    @Cron(MEMBERSHIP_RENEWAL_CRON, { timeZone: MEMBERSHIP_RENEWAL_TIMEZONE })
    async dispatchMembershipRenewals() {
        const enabled = this.featureFlagsService.isEnabled(
            'membership_renewal_cron',
            false,
        );
        if (!enabled) {
            this.logger.log(
                'Membership renewal cron skipped: feature flag disabled',
            );
            return;
        }

        const now = new Date();
        const windowEnd = new Date(now);
        windowEnd.setDate(windowEnd.getDate() + REMINDER_WINDOW_DAYS);
        const processedReminders = await this.sendRenewalReminders(now, windowEnd);
        const processedExpirations = await this.expireOverdue(now);

        this.logger.log(
            `Membership cron done: reminders=${processedReminders}, expirations=${processedExpirations}`,
        );
    }

    /**
     * Recordatorio "tu suscripción se renovará el {fecha}".
     * No importa el paymentMethodToken en esta vuelta; sólo se notifica.
     */
    private async sendRenewalReminders(
        now: Date,
        windowEnd: Date,
    ): Promise<number> {
        const upcoming = await this.prisma.membershipSubscription.findMany({
            where: {
                status: { in: [MembershipSubscriptionStatus.ACTIVE] },
                nextBillingAt: { gte: now, lte: windowEnd },
            },
            select: {
                id: true,
                ownerId: true,
                tenantId: true,
                nextBillingAt: true,
                plan: { select: { name: true, priceCents: true, currency: true } },
                pet: { select: { name: true } },
            },
            take: 200,
        });

        let count = 0;
        for (const sub of upcoming) {
            await this.notificationsService.send({
                tenantId: sub.tenantId,
                userId: sub.ownerId,
                title: 'Tu membresía se renovará pronto',
                body: `${sub.pet.name} ${sub.plan.name} se renovará el ${sub.nextBillingAt.toLocaleDateString('es-EC')} (${(sub.plan.priceCents / 100).toFixed(2)} ${sub.plan.currency}).`,
                data: {
                    source: 'membership-renewal',
                    subscriptionId: sub.id,
                    nextBillingAt: sub.nextBillingAt.toISOString(),
                },
            });
            count++;
        }
        return count;
    }

    /**
     * Suscripciones cuya fecha de fin de período ya pasó, sin auto-renovación
     * o que tras un fallo de cobro no se recuperaron en N días → EXPIRED.
     */
    private async expireOverdue(now: Date): Promise<number> {
        const { count } = await this.prisma.membershipSubscription.updateMany({
            where: {
                status: { in: [MembershipSubscriptionStatus.ACTIVE] },
                currentPeriodEnd: { lt: now },
                autoRenew: false,
            },
            data: { status: MembershipSubscriptionStatus.EXPIRED },
        });
        return count;
    }
}
