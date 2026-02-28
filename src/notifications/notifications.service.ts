import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@nuvet/types';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../common/dto/pagination.dto';
import {
    CreateNotificationTemplateDto,
    UpdateNotificationTemplateDto,
    TriggerNotificationDto,
} from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, userId: string, query: PaginationQueryDto, unreadOnly?: boolean) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const where = {
            tenantId, userId,
            ...(unreadOnly ? { readAt: null } : {}),
        };
        const [notifications, total] = await Promise.all([
            this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
            this.prisma.notification.count({ where }),
        ]);
        const unreadCount = await this.prisma.notification.count({ where: { tenantId, userId, readAt: null } });
        return { ...buildPaginatedResponse(notifications, total, page, limit), unreadCount };
    }

    async markAsRead(userId: string, id: string) {
        return this.prisma.notification.updateMany({
            where: { id, userId },
            data: { readAt: new Date() },
        });
    }

    async markAllAsRead(tenantId: string, userId: string) {
        return this.prisma.notification.updateMany({
            where: { tenantId, userId, readAt: null },
            data: { readAt: new Date() },
        });
    }

    async remove(userId: string, id: string) {
        await this.prisma.notification.deleteMany({ where: { id, userId } });
        return { message: 'Notification deleted' };
    }

    async findTemplates(tenantId: string) {
        return this.prisma.notificationTemplate.findMany({
            where: {
                OR: [{ tenantId }, { isSystem: true }],
            },
            orderBy: [{ isSystem: 'desc' }, { key: 'asc' }],
        });
    }

    async createTemplate(tenantId: string, dto: CreateNotificationTemplateDto) {
        const exists = await this.prisma.notificationTemplate.findFirst({
            where: { tenantId, key: dto.key, channel: dto.channel },
        });
        if (exists) {
            throw new ConflictException('A template with this key/channel already exists');
        }
        return this.prisma.notificationTemplate.create({
            data: {
                tenantId,
                key: dto.key,
                channel: dto.channel,
                subject: dto.subject,
                bodyTemplate: dto.bodyTemplate,
                isSystem: false,
            },
        });
    }

    async updateTemplate(tenantId: string, id: string, dto: UpdateNotificationTemplateDto) {
        const template = await this.prisma.notificationTemplate.findFirst({
            where: { id, tenantId, isSystem: false },
        });
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return this.prisma.notificationTemplate.update({
            where: { id },
            data: dto,
        });
    }

    async deleteTemplate(tenantId: string, id: string) {
        const template = await this.prisma.notificationTemplate.findFirst({
            where: { id, tenantId, isSystem: false },
        });
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        await this.prisma.notificationTemplate.delete({ where: { id } });
        return { message: 'Template deleted' };
    }

    async triggerTemplate(tenantId: string, dto: TriggerNotificationDto) {
        const template = await this.prisma.notificationTemplate.findFirst({
            where: {
                key: dto.key,
                ...(dto.channel ? { channel: dto.channel } : {}),
                OR: [{ tenantId }, { isSystem: true }],
            },
            orderBy: [{ isSystem: 'asc' }],
        });
        if (!template) {
            throw new NotFoundException('Template not found');
        }

        const body = this.renderTemplate(template.bodyTemplate, dto.data);
        const title = template.subject
            ? this.renderTemplate(template.subject, dto.data)
            : `Notification: ${template.key}`;

        return this.send({
            tenantId,
            userId: dto.userId,
            title,
            body,
            channel: (dto.channel || template.channel) as unknown as NotificationChannel,
            data: dto.data,
        });
    }

    /**
     * Internal method called by other services to push in-app notifications.
     */
    async send(params: {
        tenantId: string;
        userId: string;
        title: string;
        body: string;
        channel?: NotificationChannel;
        data?: Record<string, unknown>;
    }) {
        return this.prisma.notification.create({
            data: {
                tenantId: params.tenantId,
                userId: params.userId,
                title: params.title,
                body: params.body,
                channel: params.channel || NotificationChannel.IN_APP,
                data: params.data as Prisma.InputJsonValue | undefined,
            },
        });
    }

    private renderTemplate(template: string, data?: Record<string, unknown>) {
        if (!data) return template;
        return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
            const value = data[key];
            return value === undefined || value === null ? '' : String(value);
        });
    }
}
