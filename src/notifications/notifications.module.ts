import { Module } from '@nestjs/common';
import { NotificationsController } from './infrastructure/http/notifications.controller';
import { NotificationsService } from './application/notifications.service';
import { PrismaNotificationRepository } from './infrastructure/persistence/prisma-notification.repository';
import { NOTIFICATION_REPOSITORY } from './domain/notification.repository';

@Module({
    controllers: [NotificationsController],
    providers: [
        { provide: NOTIFICATION_REPOSITORY, useClass: PrismaNotificationRepository },
        NotificationsService,
    ],
    exports: [NotificationsService],
})
export class NotificationsModule { }