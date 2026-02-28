import { Module } from '@nestjs/common';
import { ClienteController } from './cliente.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PetsModule } from '../pets/pets.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { StoreModule } from '../store/store.module';

@Module({
    imports: [PrismaModule, PetsModule, AppointmentsModule, StoreModule],
    controllers: [ClienteController],
})
export class ClienteModule {}

