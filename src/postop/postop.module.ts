import { Module } from '@nestjs/common';
import { PostOpController } from './infrastructure/http/postop.controller';
import { PostOpService } from './application/postop.service';
import {
    PrismaPostOpCheckinRepository,
    PrismaPostOpPlanRepository,
} from './infrastructure/persistence/prisma-postop.repository';
import { POSTOP_CHECKIN_REPOSITORY, POSTOP_PLAN_REPOSITORY } from './domain/postop.repository';

@Module({
    controllers: [PostOpController],
    providers: [
        { provide: POSTOP_PLAN_REPOSITORY, useClass: PrismaPostOpPlanRepository },
        { provide: POSTOP_CHECKIN_REPOSITORY, useClass: PrismaPostOpCheckinRepository },
        PostOpService,
    ],
    exports: [PostOpService],
})
export class PostOpModule {}
