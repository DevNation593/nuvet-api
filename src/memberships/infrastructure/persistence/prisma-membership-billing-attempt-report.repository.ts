import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IBillingAttemptQueryRepository } from '../../domain/membership.repository';

/**
 * Read-only repository para alimentar el dashboard de intentos de
 * cobro fallidos. Todas las queries incluyen `tenantId` explícito; el
 * Prisma tenant middleware aplica el filtro en última instancia.
 */
@Injectable()
export class PrismaMembershipBillingAttemptReportRepository
    implements IBillingAttemptQueryRepository
{
    constructor(private readonly prisma: PrismaService) {}

    async listFailures(
        tenantId: string,
        options: { since: Date; skip: number; take: number },
    ): Promise<{ data: unknown[]; total: number }> {
        const where: Prisma.BillingAttemptWhereInput = {
            tenantId,
            status: 'FAILED',
            createdAt: { gte: options.since },
        };
        const [data, total] = await this.prisma.$transaction([
            this.prisma.billingAttempt.findMany({
                where,
                skip: options.skip,
                take: options.take,
                orderBy: { createdAt: 'desc' },
                include: {
                    subscription: {
                        include: {
                            owner: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                            plan: {
                                select: {
                                    id: true,
                                    name: true,
                                    priceCents: true,
                                    currency: true,
                                },
                            },
                            pet: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.billingAttempt.count({ where }),
        ]);
        return { data, total };
    }

    async summarizeFailures(
        tenantId: string,
        since: Date,
    ): Promise<{
        failuresLast24Hours: number;
        failuresLast7Days: number;
        failuresLast30Days: number;
        pastDueSubscriptions: number;
        topFailureCodes: { failureCode: string; failureMessage: string | null; count: number }[];
        totalRecoveredAfterFailure: number;
    }> {
        const now = new Date();
        const d1 = new Date(now);
        d1.setHours(d1.getHours() - 24);
        const d7 = new Date(now);
        d7.setDate(d7.getDate() - 7);

        const [last24h, last7d, last30d] = await Promise.all([
            this.prisma.billingAttempt.count({
                where: {
                    tenantId,
                    status: 'FAILED',
                    createdAt: { gte: d1 },
                },
            }),
            this.prisma.billingAttempt.count({
                where: {
                    tenantId,
                    status: 'FAILED',
                    createdAt: { gte: d7 },
                },
            }),
            this.prisma.billingAttempt.count({
                where: {
                    tenantId,
                    status: 'FAILED',
                    createdAt: { gte: since },
                },
            }),
        ]);

        const pastDueSubscriptions = await this.prisma.membershipSubscription.count({
            where: {
                tenantId,
                status: 'PAST_DUE',
            },
        });

        // Top 5 failureCodes — Prisma `groupBy` con count + mensaje
        // representativo. Usamos `mode('failureMessage')` no existe en
        // Prisma, así que tomamos el primer mensaje encontrado vía
        // un raw-like fetch complementario.
        const grouped = await this.prisma.billingAttempt.groupBy({
            where: {
                tenantId,
                status: 'FAILED',
                createdAt: { gte: since },
                failureCode: { not: null },
            },
            by: ['failureCode'],
            _count: { _all: true },
            orderBy: { _count: { failureCode: 'desc' } },
            take: 5,
        });

        const topFailureCodes: {
            failureCode: string;
            failureMessage: string | null;
            count: number;
        }[] = [];
        for (const row of grouped) {
            const representative = await this.prisma.billingAttempt.findFirst({
                where: {
                    tenantId,
                    status: 'FAILED',
                    failureCode: row.failureCode,
                },
                select: { failureMessage: true },
                orderBy: { createdAt: 'desc' },
            });
            topFailureCodes.push({
                failureCode: row.failureCode ?? 'unknown',
                failureMessage: representative?.failureMessage ?? null,
                count: row._count._all,
            });
        }

        // Suscripciones actualmente `PAST_DUE` que alguna vez tuvieron
        // un fallo pero ahora tienen al menos un intento `SUCCESS` más
        // reciente que el último FAILED → cuentan como "recuperadas".
        //
        // Heurística simple: contamos suscripciones PAST_DUE con al menos
        // 1 SUCCESS posterior al último FAILED. (Suficiente para el
        // indicador del dashboard; si el reporte requiere precisión
        // mayor, se sustituye por una vista materializada.)
        const recoveredRows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
            WITH last_failed AS (
                SELECT
                    "subscriptionId" AS "subscriptionId",
                    MAX("createdAt") AS "lastFailedAt"
                FROM "billing_attempts"
                WHERE "tenantId" = ${tenantId}
                  AND "status" = 'FAILED'
                GROUP BY "subscriptionId"
            ),
            last_success_after AS (
                SELECT
                    s."id" AS "subscriptionId"
                FROM "membership_subscriptions" s
                JOIN last_failed lf ON lf."subscriptionId" = s."id"
                JOIN "billing_attempts" ba
                    ON ba."subscriptionId" = s."id"
                    AND ba."status" = 'SUCCESS'
                    AND ba."createdAt" > lf."lastFailedAt"
                WHERE s."tenantId" = ${tenantId}
            )
            SELECT COUNT(DISTINCT "subscriptionId")::int AS count
            FROM last_success_after
        `;
        const totalRecoveredAfterFailure = Number(recoveredRows[0]?.count ?? 0n);

        return {
            failuresLast24Hours: last24h,
            failuresLast7Days: last7d,
            failuresLast30Days: last30d,
            pastDueSubscriptions,
            topFailureCodes,
            totalRecoveredAfterFailure,
        };
    }
}
