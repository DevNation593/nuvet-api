import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageModule } from '../storage/storage.module';
import { MedicalRecordsController } from './infrastructure/http/medical-records.controller';
import { MedicalRecordsService } from './application/medical-records.service';
import { PrismaMedicalRecordRepository } from './infrastructure/persistence/prisma-medical-record.repository';
import { MEDICAL_RECORD_REPOSITORY } from './domain/medical-record.repository';

@Module({
    imports: [
        MulterModule.register({ dest: '/tmp', limits: { fileSize: 10 * 1024 * 1024 } }),
        StorageModule,
    ],
    controllers: [MedicalRecordsController],
    providers: [
        { provide: MEDICAL_RECORD_REPOSITORY, useClass: PrismaMedicalRecordRepository },
        MedicalRecordsService,
    ],
})
export class MedicalRecordsModule { }