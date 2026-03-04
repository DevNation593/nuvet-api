import { Module } from '@nestjs/common';
import { AestheticsController } from './infrastructure/http/aesthetics.controller';
import { AestheticsService } from './application/aesthetics.service';
import { PrismaAestheticRepository } from './infrastructure/persistence/prisma-aesthetic.repository';
import { AESTHETIC_REPOSITORY } from './domain/aesthetic.repository';

@Module({
    controllers: [AestheticsController],
    providers: [
        { provide: AESTHETIC_REPOSITORY, useClass: PrismaAestheticRepository },
        AestheticsService,
    ],
    exports: [AestheticsService],
})
export class AestheticsModule { }