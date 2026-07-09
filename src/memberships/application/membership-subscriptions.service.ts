import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    BillingProviderKind,
    MembershipBillingPeriod,
    MembershipSubscriptionStatus,
    UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PassportPrismaService } from '../../prisma/passport-prisma.service';
import { BILLING_PROVIDER } from './billing/billing-provider.token';
import type { BillingProvider } from './billing/billing-provider';
import {
    CancelSubscriptionDto,
    SubscribeToPlanDto,
} from './dto/membership-subscription.dto';
import {
    IMembershipSubscriptionRepository,
    MEMBERSHIP_SUBSCRIPTION_REPOSITORY,
} from '../domain/membership.repository';

interface JwtPayloadLike {
    sub: string;
    tenantId: string;
    role: UserRole;
}

@Injectable()
export class MembershipSubscriptionsService {
    constructor(
        @Inject(MEMBERSHIP_SUBSCRIPTION_REPOSITORY)
        private readonly repo: IMembershipSubscriptionRepository,
        @Inject(BILLING_PROVIDER)
        private readonly billingProvider: BillingProvider,
        private readonly prisma: PrismaService,
        private readonly passportPrisma: PassportPrismaService,
    ) {}

    async listMine(
        actor: JwtPayloadLike,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }> {
        return this.repo.findByOwner(actor.sub, filter, pagination);
    }

    async listForTenantAdmin(
        tenantId: string,
        filter: { status?: MembershipSubscriptionStatus },
        pagination: { skip: number; take: number },
    ) {
        return this.repo.findByTenant(tenantId, filter, pagination);
    }

    async subscribe(
        actor: JwtPayloadLike,
        dto: SubscribeToPlanDto,
    ) {
        // 1. Cargar plan + mascota.
        const pet = await this.prisma.pet.findFirst({
            where: { id: dto.petId, tenantId: actor.tenantId },
        });
        if (!pet) throw new NotFoundException('Pet not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === pet.ownerId;
        const isStaff =
            actor.role === UserRole.CLINIC_ADMIN ||
            actor.role === UserRole.VET ||
            actor.role === UserRole.RECEPTIONIST;
        if (!isOwner && !isStaff) {
            throw new ForbiddenException(
                'Solo el dueño de la mascota o staff de la clínica puede contratar membresías',
            );
        }

        const plan = await this.prisma.membershipPlan.findFirst({
            where: { id: dto.planId, tenantId: actor.tenantId, isActive: true },
        });
        if (!plan) throw new NotFoundException('Plan no encontrado o inactivo');

        // 2. Validar que la mascota no tenga ya una suscripción activa al mismo plan.
        const existing = await this.repo.findActiveForPetAndPlan(pet.id, plan.id);
        if (existing) {
            throw new ConflictException(
                'La mascota ya tiene una suscripción activa a este plan',
            );
        }

        // 3. Calcular el período actual según `billingPeriod`.
        const period = computePeriod(plan.billingPeriod, new Date());

        // 4. Llamar al billing provider con un token transitorio (en el mock,
        //    aceptamos cualquier string; cuando llegue el provider real,
        //    el cliente deberá tokenizar vía POST /billing/payment-methods).
        const paymentToken = dto.paymentMethodToken ?? `tok_new_${pet.id}_${Date.now()}`;

        const charge = await this.billingProvider.charge({
            subscriptionId: 'pending', // se usa como idempotencyKey en el primer cargo
            amountCents: plan.priceCents,
            currency: plan.currency,
            paymentMethodToken: paymentToken,
            idempotencyKey: `subscribe_${pet.id}_${plan.id}_${period.currentPeriodStart.getTime()}`,
            metadata: {
                action: 'first_charge',
                tenantId: plan.tenantId,
                petId: pet.id,
                planId: plan.id,
                ownerId: pet.ownerId,
            },
        });

        if (!charge.ok) {
            throw new BadRequestException(
                `Cobro inicial rechazado: ${charge.failureMessage ?? charge.failureCode ?? 'unknown'}`,
            );
        }

        // 5. Crear la suscripción en estado ACTIVE.
        const subscription = (await this.repo.create({
            tenantId: plan.tenantId,
            sourceTenantId: actor.tenantId,
            petId: pet.id,
            ownerId: pet.ownerId,
            planId: plan.id,
            currentPeriodStart: period.currentPeriodStart,
            currentPeriodEnd: period.currentPeriodEnd,
            nextBillingAt: period.nextBillingAt,
            paymentMethodToken: paymentToken,
            providerKind: BillingProviderKind.MOCK,
        })) as { id: string };

        await this.repo.updateStatus(
            subscription.id,
            MembershipSubscriptionStatus.ACTIVE,
            { lastChargedAt: new Date(), lastChargeTxId: charge.transactionId },
        );

        return subscription;
    }

    async cancel(
        actor: JwtPayloadLike,
        subscriptionId: string,
        dto: CancelSubscriptionDto,
    ) {
        const sub = await this.repo.findOneGlobal(subscriptionId);
        if (!sub) throw new NotFoundException('Subscription not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === (sub as { ownerId: string }).ownerId;
        const isStaff =
            actor.role !== UserRole.CLIENT &&
            actor.tenantId === (sub as { tenantId: string }).tenantId;
        if (!isOwner && !isStaff) {
            throw new ForbiddenException(
                'Solo el dueño o el staff del catálogo pueden cancelar la suscripción',
            );
        }

        await this.billingProvider.cancelAtPeriodEnd(subscriptionId);
        return this.repo.updateStatus(subscriptionId, MembershipSubscriptionStatus.CANCELLED, {
            canceledAt: new Date(),
            cancelReason: dto.reason,
        });
    }

    async pause(actor: JwtPayloadLike, subscriptionId: string) {
        return this._setStatusByOwner(actor, subscriptionId, MembershipSubscriptionStatus.PAUSED, {
            autoRenew: false,
        });
    }

    async resume(actor: JwtPayloadLike, subscriptionId: string) {
        return this._setStatusByOwner(actor, subscriptionId, MembershipSubscriptionStatus.ACTIVE, {
            autoRenew: true,
        });
    }

    /** Job interno llamado por el cron de renovación. */
    async renewIfDue(subscriptionId: string): Promise<{ status: 'renewed' | 'expired' | 'past_due' }> {
        const sub = await this.repo.findOneGlobal(subscriptionId);
        if (!sub) return { status: 'expired' };
        const typed = sub as {
            id: string;
            tenantId: string;
            status: MembershipSubscriptionStatus;
            paymentMethodToken: string;
            plan: { priceCents: number; currency: string; billingPeriod: MembershipBillingPeriod };
        };
        if (typed.status !== MembershipSubscriptionStatus.ACTIVE && typed.status !== MembershipSubscriptionStatus.PAST_DUE) {
            return { status: 'expired' };
        }

        const period = computePeriod(typed.plan.billingPeriod, new Date());
        const charge = await this.billingProvider.charge({
            subscriptionId,
            amountCents: typed.plan.priceCents,
            currency: typed.plan.currency,
            paymentMethodToken: typed.paymentMethodToken,
            idempotencyKey: `renew_${subscriptionId}_${period.currentPeriodStart.getTime()}`,
            metadata: { action: 'renew', subscriptionId },
        });

        if (charge.ok) {
            await this.repo.advancePeriod(subscriptionId, {
                currentPeriodStart: period.currentPeriodStart,
                currentPeriodEnd: period.currentPeriodEnd,
                nextBillingAt: period.nextBillingAt,
            });
            await this.repo.updateStatus(subscriptionId, MembershipSubscriptionStatus.ACTIVE, {
                lastChargedAt: new Date(),
                lastChargeTxId: charge.transactionId,
            });
            return { status: 'renewed' };
        }

        await this.repo.updateStatus(
            subscriptionId,
            MembershipSubscriptionStatus.PAST_DUE,
            {},
        );
        return { status: 'past_due' };
    }

    private async _setStatusByOwner(
        actor: JwtPayloadLike,
        subscriptionId: string,
        status: MembershipSubscriptionStatus,
        extra: { autoRenew?: boolean },
    ) {
        const sub = await this.repo.findOneGlobal(subscriptionId);
        if (!sub) throw new NotFoundException('Subscription not found');

        const isOwner = actor.role === UserRole.CLIENT && actor.sub === (sub as { ownerId: string }).ownerId;
        if (!isOwner) {
            throw new ForbiddenException('Solo el dueño puede pausar o reanudar su suscripción');
        }

        return this.repo.updateStatus(subscriptionId, status, extra);
    }
}

/**
 * Calcula el período actual (start/end) y la fecha del próximo cobro.
 * No es parte del BillingProvider porque es lógica de producto (regla de
 * cuánto dura un mes/año), no del gateway.
 */
export function computePeriod(period: MembershipBillingPeriod, from: Date) {
    const start = startOfDay(from);
    let end: Date;
    let next: Date;
    if (period === MembershipBillingPeriod.MONTHLY) {
        end = new Date(start);
        end.setMonth(end.getMonth() + 1);
        next = new Date(end);
    } else {
        end = new Date(start);
        end.setFullYear(end.getFullYear() + 1);
        next = new Date(end);
    }
    return { currentPeriodStart: start, currentPeriodEnd: end, nextBillingAt: next };
}

function startOfDay(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}
