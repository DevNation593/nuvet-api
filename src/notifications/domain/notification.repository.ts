import { NotificationChannel } from '@nuvet/types';
import { Prisma } from '@prisma/client';

export interface CreateNotificationData {
    tenantId: string;
    userId: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    data?: Prisma.InputJsonValue;
}

export interface CreateTemplateData {
    tenantId: string;
    key: string;
    channel: NotificationChannel;
    subject?: string;
    bodyTemplate: string;
    isSystem: boolean;
}

export interface INotificationRepository {
    findAll(
        tenantId: string,
        userId: string,
        query: { skip: number; take: number },
        unreadOnly?: boolean,
    ): Promise<{ data: unknown[]; total: number }>;
    countUnread(tenantId: string, userId: string): Promise<number>;
    markAsRead(userId: string, id: string): Promise<unknown>;
    markAllAsRead(tenantId: string, userId: string): Promise<unknown>;
    delete(userId: string, id: string): Promise<void>;
    create(data: CreateNotificationData): Promise<unknown>;

    findTemplates(tenantId: string): Promise<unknown[]>;
    findTemplate(tenantId: string, id: string, systemAllowed?: boolean): Promise<unknown | null>;
    findTemplateByKey(tenantId: string, key: string, channel?: NotificationChannel): Promise<unknown | null>;
    findTemplateByKeyAndChannel(tenantId: string, key: string, channel: NotificationChannel): Promise<unknown | null>;
    createTemplate(data: CreateTemplateData): Promise<unknown>;
    updateTemplate(id: string, data: Partial<Omit<CreateTemplateData, 'tenantId' | 'isSystem'>>): Promise<unknown>;
    deleteTemplate(id: string): Promise<void>;
}

export const NOTIFICATION_REPOSITORY = Symbol('INotificationRepository');
