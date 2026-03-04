import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { NotificationChannel } from '@nuvet/types';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import {
    CreateNotificationTemplateDto,
    UpdateNotificationTemplateDto,
    TriggerNotificationDto,
} from './dto/notifications.dto';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../domain/notification.repository';

@Injectable()
export class NotificationsService {
    constructor(
        @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
    ) { }

    async findAll(tenantId: string, userId: string, query: PaginationQueryDto, unreadOnly?: boolean) {
        const { skip, take, page, limit } = buildPaginationArgs(query);
        const { data, total } = await this.notificationRepo.findAll(tenantId, userId, { skip, take }, unreadOnly);
        const unreadCount = await this.notificationRepo.countUnread(tenantId, userId);
        return { ...buildPaginatedResponse(data, total, page, limit), unreadCount };
    }

    async markAsRead(userId: string, id: string) {
        return this.notificationRepo.markAsRead(userId, id);
    }

    async markAllAsRead(tenantId: string, userId: string) {
        return this.notificationRepo.markAllAsRead(tenantId, userId);
    }

    async remove(userId: string, id: string) {
        await this.notificationRepo.delete(userId, id);
        return { message: 'Notification deleted' };
    }

    async findTemplates(tenantId: string) {
        return this.notificationRepo.findTemplates(tenantId);
    }

    async createTemplate(tenantId: string, dto: CreateNotificationTemplateDto) {
        const exists = await this.notificationRepo.findTemplateByKeyAndChannel(tenantId, dto.key, dto.channel as NotificationChannel);
        if (exists) {
            throw new ConflictException('A template with this key/channel already exists');
        }
        return this.notificationRepo.createTemplate({
            tenantId,
            key: dto.key,
            channel: dto.channel as NotificationChannel,
            subject: dto.subject,
            bodyTemplate: dto.bodyTemplate,
            isSystem: false,
        });
    }

    async updateTemplate(tenantId: string, id: string, dto: UpdateNotificationTemplateDto) {
        const template = await this.notificationRepo.findTemplate(tenantId, id);
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        return this.notificationRepo.updateTemplate(id, dto);
    }

    async deleteTemplate(tenantId: string, id: string) {
        const template = await this.notificationRepo.findTemplate(tenantId, id);
        if (!template) {
            throw new NotFoundException('Template not found');
        }
        await this.notificationRepo.deleteTemplate(id);
        return { message: 'Template deleted' };
    }

    async triggerTemplate(tenantId: string, dto: TriggerNotificationDto) {
        const template = await this.notificationRepo.findTemplateByKey(tenantId, dto.key, dto.channel as NotificationChannel | undefined) as any;
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

    async send(params: {
        tenantId: string;
        userId: string;
        title: string;
        body: string;
        channel?: NotificationChannel;
        data?: Record<string, unknown>;
    }) {
        return this.notificationRepo.create({
            tenantId: params.tenantId,
            userId: params.userId,
            title: params.title,
            body: params.body,
            channel: params.channel || NotificationChannel.IN_APP,
            data: params.data as any,
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