import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
    imports: [DiscountsModule],
    controllers: [StoreController],
    providers: [StoreService],
    exports: [StoreService],
})
export class StoreModule { }
