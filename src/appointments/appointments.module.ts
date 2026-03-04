import { Module } from '@nestjs/common';
import { AppointmentsController } from './infrastructure/http/appointments.controller';
import { AppointmentsService } from './application/appointments.service';
import { APPOINTMENT_REPOSITORY } from './domain/appointment.repository';
import { PrismaAppointmentRepository } from './infrastructure/persistence/prisma-appointment.repository';

@Module({
    controllers: [AppointmentsController],
    providers: [
        { provide: APPOINTMENT_REPOSITORY, useClass: PrismaAppointmentRepository },
        AppointmentsService,
    ],
    exports: [AppointmentsService],
})
export class AppointmentsModule { }
