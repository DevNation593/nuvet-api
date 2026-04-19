import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { FeatureFlagsService } from '../../common/feature-flags/feature-flags.service';

const CLINICAL_REMINDERS_CRON =
    process.env.CLINICAL_REMINDERS_CRON ?? CronExpression.EVERY_2_HOURS;
const CLINICAL_REMINDERS_TIMEZONE =
    process.env.CLINICAL_REMINDERS_TIMEZONE ?? 'America/Guayaquil';

@Injectable()
export class ClinicalRemindersScheduler {
    private readonly logger = new Logger(ClinicalRemindersScheduler.name);

    constructor(
        private readonly notificationsService: NotificationsService,
        private readonly featureFlagsService: FeatureFlagsService,
    ) {}

    @Cron(CLINICAL_REMINDERS_CRON, { timeZone: CLINICAL_REMINDERS_TIMEZONE })
    async dispatchClinicalReminders() {
        const enabled = this.featureFlagsService.isEnabled('clinical_reminders_scheduler', false);
        if (!enabled) {
            this.logger.log('Clinical reminders scheduler skipped: feature flag disabled');
            return;
        }

        const result = await this.notificationsService.runAutomaticClinicalReminders();
        this.logger.log(
            `Clinical reminders dispatched: cron=${CLINICAL_REMINDERS_CRON}, tz=${CLINICAL_REMINDERS_TIMEZONE}, tenants=${result.processedTenants}, failed=${result.failedTenants}, notifications=${result.notificationsCreated}`,
        );
    }
}
