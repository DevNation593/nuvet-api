import { Module } from '@nestjs/common';
import { ClientsController } from './infrastructure/http/clients.controller';
import { ClientsService } from './application/clients.service';
import { PrismaClientRepository } from './infrastructure/persistence/prisma-client.repository';
import { CLIENT_REPOSITORY } from './domain/client.repository';

@Module({
    controllers: [ClientsController],
    providers: [
        { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
        ClientsService,
    ],
})
export class ClientsModule { }