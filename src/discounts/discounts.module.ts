import { Module } from '@nestjs/common';
import { DiscountsService } from './application/discounts.service';
import { DiscountsController } from './infrastructure/http/discounts.controller';
import { PrismaDiscountRepository } from './infrastructure/persistence/prisma-discount.repository';
import { DISCOUNT_REPOSITORY } from './domain/discount.repository';

@Module({
    controllers: [DiscountsController],
    providers: [
        { provide: DISCOUNT_REPOSITORY, useClass: PrismaDiscountRepository },
        DiscountsService,
    ],
    exports: [DiscountsService],
})
export class DiscountsModule {}