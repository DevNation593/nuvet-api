import { Injectable, NotFoundException, ConflictException, Inject, Logger } from '@nestjs/common';
import { NotificationChannel } from '@nuvet/types';
import { PaginationQueryDto, buildPaginatedResponse, buildPaginationArgs } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
    CreateNotificationTemplateDto,
    GenerateClinicalRemindersDto,
    UpdateNotificationTemplateDto,
    TriggerNotificationDto,
} from './dto/notifications.dto';
import { INotificationRepository, NOTIFICATION_REPOSITORY } from '../domain/notification.repository';

const TENANT_BATCH_SIZE = 100;
const TENANT_CONCURRENCY = 5;

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        @Inject(NOTIFICATION_REPOSITORY) private readonly notificationRepo: INotificationRepository,
        private readonly prisma: PrismaService,
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

    async generateClinicalReminders(tenantId: string, dto: GenerateClinicalRemindersDto) {
        const daysAhead = dto.daysAhead ?? 3;
        const channels = dto.channels?.length
            ? dto.channels
            : [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS];

        const fromDate = new Date();
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + daysAhead);

        const [appointments, vaccinations] = await Promise.all([
            this.prisma.appointment.findMany({
                where: {
                    tenantId,
                    scheduledAt: { gte: fromDate, lte: toDate },
                    status: { in: ['SCHEDULED', 'CONFIRMED'] as any },
                },
                select: {
                    id: true,
                    scheduledAt: true,
                    type: true,
                    pet: {
                        select: {
                            id: true,
                            name: true,
                            owner: { select: { id: true, firstName: true, lastName: true } },
                        },
                    },
                },
            }),
            this.prisma.vaccination.findMany({
                where: {
                    tenantId,
                    nextDueAt: { gte: fromDate, lte: toDate },
                },
                select: {
                    id: true,
                    vaccineName: true,
                    nextDueAt: true,
                    pet: {
                        select: {
                            id: true,
                            name: true,
                            owner: { select: { id: true, firstName: true, lastName: true } },
                        },
                    },
                },
            }),
        ]);

        const notificationsToCreate: Array<{
            tenantId: string;
            userId: string;
            title: string;
            body: string;
            channel: NotificationChannel;
            data: Record<string, unknown>;
        }> = [];

        for (const appointment of appointments) {
            const ownerId = appointment.pet.owner.id;
            const ownerName = `${appointment.pet.owner.firstName} ${appointment.pet.owner.lastName}`.trim();
            const body = `Hola ${ownerName}, recuerda tu cita de ${appointment.pet.name} el ${appointment.scheduledAt.toLocaleString('es-EC')}.`;

            for (const channel of channels) {
                notificationsToCreate.push({
                    tenantId,
                    userId: ownerId,
                    title: 'Recordatorio de cita',
                    body,
                    channel,
                    data: {
                        source: 'clinical-reminder',
                        kind: 'appointment',
                        appointmentId: appointment.id,
                        petId: appointment.pet.id,
                        petName: appointment.pet.name,
                        scheduledAt: appointment.scheduledAt.toISOString(),
                        channelProviderStatus: channel === NotificationChannel.IN_APP ? 'DELIVERED' : 'PENDING_PROVIDER',
                    } as Record<string, unknown>,
                });
            }
        }

        for (const vaccination of vaccinations) {
            if (!vaccination.nextDueAt) continue;

            const ownerId = vaccination.pet.owner.id;
            const ownerName = `${vaccination.pet.owner.firstName} ${vaccination.pet.owner.lastName}`.trim();
            const body = `Hola ${ownerName}, ${vaccination.pet.name} tiene vacuna pendiente (${vaccination.vaccineName}) para ${vaccination.nextDueAt.toLocaleDateString('es-EC')}.`;

            for (const channel of channels) {
                notificationsToCreate.push({
                    tenantId,
                    userId: ownerId,
                    title: 'Recordatorio de vacunación',
                    body,
                    channel,
                    data: {
                        source: 'clinical-reminder',
                        kind: 'vaccination',
                        vaccinationId: vaccination.id,
                        petId: vaccination.pet.id,
                        petName: vaccination.pet.name,
                        vaccineName: vaccination.vaccineName,
                        nextDueAt: vaccination.nextDueAt.toISOString(),
                        channelProviderStatus: channel === NotificationChannel.IN_APP ? 'DELIVERED' : 'PENDING_PROVIDER',
                    } as Record<string, unknown>,
                });
            }
        }

        if (notificationsToCreate.length > 0) {
            await this.prisma.notification.createMany({
                data: notificationsToCreate.map((notification) => ({
                    tenantId: notification.tenantId,
                    userId: notification.userId,
                    title: notification.title,
                    body: notification.body,
                    channel: notification.channel,
                    data: notification.data as any,
                })),
            });
        }

        return {
            generatedAt: new Date().toISOString(),
            daysAhead,
            channels,
            totals: {
                appointments: appointments.length,
                vaccinations: vaccinations.length,
                notificationsCreated: notificationsToCreate.length,
            },
        };
    }

    async runAutomaticClinicalReminders() {
        const summary = {
            processedTenants: 0,
            failedTenants: 0,
            notificationsCreated: 0,
        };

        let cursor: string | undefined;
        let hasMore = true;

        while (hasMore) {
            const tenants = await this.prisma.tenant.findMany({
                where: { isActive: true },
                select: { id: true },
                take: TENANT_BATCH_SIZE,
                orderBy: { id: 'asc' },
                ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            });

            if (tenants.length < TENANT_BATCH_SIZE) hasMore = false;
            if (tenants.length > 0) cursor = tenants[tenants.length - 1].id;

            for (let i = 0; i < tenants.length; i += TENANT_CONCURRENCY) {
                const batch = tenants.slice(i, i + TENANT_CONCURRENCY);
                const results = await Promise.allSettled(
                    batch.map((tenant) =>
                        this.generateClinicalReminders(tenant.id, {
                            daysAhead: 2,
                            channels: [
                                NotificationChannel.IN_APP,
                                NotificationChannel.EMAIL,
                                NotificationChannel.SMS,
                            ],
                        }),
                    ),
                );

                for (let j = 0; j < results.length; j++) {
                    const result = results[j];
                    if (result.status === 'fulfilled') {
                        summary.processedTenants += 1;
                        summary.notificationsCreated += result.value.totals.notificationsCreated;
                    } else {
                        summary.failedTenants += 1;
                        this.logger.error(
                            `Clinical reminders failed for tenant ${batch[j].id}: ${result.reason}`,
                        );
                    }
                }
            }
        }

        return {
            ranAt: new Date().toISOString(),
            ...summary,
        };
    }

    private renderTemplate(template: string, data?: Record<string, unknown>) {
        if (!data) return template;
        return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
            const value = data[key];
            return value === undefined || value === null ? '' : String(value);
        });
    }
}