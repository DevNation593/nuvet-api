import { Module } from '@nestjs/common';
import { StoreController } from './infrastructure/http/store.controller';
import { StoreService } from './application/store.service';
import { DiscountsModule } from '../discounts/discounts.module';
import { STORE_REPOSITORY } from './domain/store.repository';
import { PrismaStoreRepository } from './infrastructure/persistence/prisma-store.repository';

@Module({
    imports: [DiscountsModule],
    controllers: [StoreController],
    providers: [
        { provide: STORE_REPOSITORY, useClass: PrismaStoreRepository },
        StoreService,
    ],
    exports: [StoreService],
})
export class StoreModule { }
