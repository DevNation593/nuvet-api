import { Module } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { StoreModule } from '../store/store.module';

@Module({
    imports: [StoreModule],
    controllers: [InventoryController],
})
export class InventoryModule { }
