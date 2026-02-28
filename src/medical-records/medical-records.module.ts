import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { StorageModule } from '../storage/storage.module';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';

@Module({
    imports: [
        MulterModule.register({ dest: '/tmp', limits: { fileSize: 10 * 1024 * 1024 } }),
        StorageModule,
    ],
    controllers: [MedicalRecordsController],
    providers: [MedicalRecordsService],
})
export class MedicalRecordsModule { }
