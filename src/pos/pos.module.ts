import { Module } from '@nestjs/common';
import { PosController } from './infrastructure/http/pos.controller';
import { PosService } from './application/pos.service';
import { POS_REPOSITORY } from './domain/pos.repository';
import { PrismaPosRepository } from './infrastructure/persistence/prisma-pos.repository';

@Module({
    controllers: [PosController],
    providers: [
        { provide: POS_REPOSITORY, useClass: PrismaPosRepository },
        PosService,
    ],
    exports: [PosService],
})
export class PosModule {}
