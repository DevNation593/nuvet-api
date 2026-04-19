import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditService {
    constructor(private readonly prisma: PrismaService) {}

    async listLogs(tenantId: string, query: AuditLogQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const fromDate = query.from ? new Date(query.from) : undefined;
        const toDate = query.to ? new Date(query.to) : undefined;
        if (toDate) {
            toDate.setHours(23, 59, 59, 999);
        }

        const where = {
            tenantId,
            ...(query.action ? { action: query.action } : {}),
            ...(query.entity ? { entity: query.entity } : {}),
            ...(query.userId ? { userId: query.userId } : {}),
            ...(fromDate || toDate
                ? {
                      createdAt: {
                          ...(fromDate ? { gte: fromDate } : {}),
                          ...(toDate ? { lte: toDate } : {}),
                      },
                  }
                : {}),
        };

        const [data, total] = await Promise.all([
            this.prisma.auditLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
            }),
            this.prisma.auditLog.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);
        return {
            success: true,
            data,
            meta: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            },
        };
    }
}
