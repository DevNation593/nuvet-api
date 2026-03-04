import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@nuvet/types';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    INotificationRepository,
    CreateNotificationData,
    CreateTemplateData,
} from '../../domain/notification.repository';

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findAll(
        tenantId: string,
        userId: string,
        query: { skip: number; take: number },
        unreadOnly?: boolean,
    ): Promise<{ data: unknown[]; total: number }> {
        const where = {
            tenantId,
            userId,
            ...(unreadOnly ? { readAt: null } : {}),
        };
        const [data, total] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                skip: query.skip,
                take: query.take,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.notification.count({ where }),
        ]);
        return { data, total };
    }

    async countUnread(tenantId: string, userId: string): Promise<number> {
        return this.prisma.notification.count({ where: { tenantId, userId, readAt: null } });
    }

    async markAsRead(userId: string, id: string): Promise<unknown> {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { readAt: new Date() },
        });
    }

    async markAllAsRead(tenantId: string, userId: string): Promise<unknown> {
        return this.prisma.notification.updateMany({
            where: { tenantId, userId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async delete(userId: string, id: string): Promise<void> {
        await this.prisma.notification.deleteMany({ where: { id, userId } });
    }

    async create(data: CreateNotificationData): Promise<unknown> {
        return this.prisma.notification.create({ data });
    }

    async findTemplates(tenantId: string): Promise<unknown[]> {
        return this.prisma.notificationTemplate.findMany({
            where: { OR: [{ tenantId }, { isSystem: true }] },
            orderBy: [{ isSystem: 'desc' }, { key: 'asc' }],
        });
    }

    async findTemplate(
        tenantId: string,
        id: string,
        systemAllowed?: boolean,
    ): Promise<unknown | null> {
        return this.prisma.notificationTemplate.findFirst({
            where: {
                id,
                ...(systemAllowed ? {} : { tenantId, isSystem: false }),
            },
        });
    }

    async findTemplateByKey(
        tenantId: string,
        key: string,
        channel?: NotificationChannel,
    ): Promise<unknown | null> {
        return this.prisma.notificationTemplate.findFirst({
            where: {
                key,
                ...(channel ? { channel } : {}),
                OR: [{ tenantId }, { isSystem: true }],
            },
            orderBy: [{ isSystem: 'asc' }],
        });
    }

    async findTemplateByKeyAndChannel(
        tenantId: string,
        key: string,
        channel: NotificationChannel,
    ): Promise<unknown | null> {
        return this.prisma.notificationTemplate.findFirst({
            where: { tenantId, key, channel },
        });
    }

    async createTemplate(data: CreateTemplateData): Promise<unknown> {
        return this.prisma.notificationTemplate.create({ data });
    }

    async updateTemplate(
        id: string,
        data: Partial<Omit<CreateTemplateData, 'tenantId' | 'isSystem'>>,
    ): Promise<unknown> {
        return this.prisma.notificationTemplate.update({ where: { id }, data });
    }

    async deleteTemplate(id: string): Promise<void> {
        await this.prisma.notificationTemplate.delete({ where: { id } });
    }
}
