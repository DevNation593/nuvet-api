import { Module } from '@nestjs/common';
import { HomeVetBookingsController } from './infrastructure/http/home-vet-bookings.controller';
import { HomeVetBookingsService } from './application/home-vet-bookings.service';
import { PrismaHomeVetBookingRepository } from './infrastructure/persistence/prisma-home-vet-booking.repository';
import { HOME_VET_BOOKING_REPOSITORY } from './domain/home-vet-booking.repository';

@Module({
    controllers: [HomeVetBookingsController],
    providers: [
        { provide: HOME_VET_BOOKING_REPOSITORY, useClass: PrismaHomeVetBookingRepository },
        HomeVetBookingsService,
    ],
    exports: [HomeVetBookingsService],
})
export class HomeVetModule {}
