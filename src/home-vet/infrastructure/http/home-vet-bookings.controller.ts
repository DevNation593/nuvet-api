import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeVetBookingStatus } from '@prisma/client';
import { PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtPayload } from '@nuvet/types';
import { HomeVetBookingsService } from '../../application/home-vet-bookings.service';
import {
    AssignVetDto,
    CancelHomeVetBookingDto,
    CompleteHomeVetBookingDto,
    CreateHomeVetBookingDto,
    ListHomeVetBookingsQueryDto,
    UpdateHomeVetBookingDto,
} from '../../application/dto/home-vet-booking.dto';

@ApiTags('home-vet')
@ApiBearerAuth('JWT')
@Controller({ path: 'home-vet/bookings', version: '1' })
@Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST, UserRole.CLIENT)
export class HomeVetBookingsController {
    constructor(private readonly service: HomeVetBookingsService) {}

    @Post()
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear una solicitud de visita a domicilio' })
    async create(
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateHomeVetBookingDto,
    ) {
        return this.service.create(user, {
            petId: dto.petId,
            scheduledAt: new Date(dto.scheduledAt),
            address: dto.address,
            addressNotes: dto.addressNotes,
            reason: dto.reason,
            visitFeeCents: dto.visitFeeCents,
            travelFeeCents: dto.travelFeeCents,
            totalCents: dto.totalCents,
            currency: dto.currency,
        });
    }

    @Get()
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.READ}`)
    @ApiOperation({
        summary:
            'Listar bookings. CLIENT ve solo los suyos; staff ve todos los del tenant.',
    })
    async list(
        @CurrentUser() user: JwtPayload,
        @Query() q: ListHomeVetBookingsQueryDto,
    ) {
        const page = q.page ?? 1;
        const pageSize = q.pageSize ?? 20;
        return this.service.list(
            user,
            {
                status: q.status,
                fromDate: q.fromDate ? new Date(q.fromDate) : undefined,
                toDate: q.toDate ? new Date(q.toDate) : undefined,
                ownerId: q.ownerId,
                vetId: q.vetId,
                petId: q.petId,
            },
            { skip: (page - 1) * pageSize, take: pageSize },
        );
    }

    @Get(':id')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Detalle de un booking' })
    async getOne(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.service.getOne(user, id);
    }

    @Patch(':id')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Editar booking (staff). No permitido en CANCELLED/COMPLETED.' })
    async update(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: UpdateHomeVetBookingDto,
    ) {
        return this.service.update(user, id, {
            scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
            address: dto.address,
            addressNotes: dto.addressNotes,
            reason: dto.reason,
            visitFeeCents: dto.visitFeeCents,
            travelFeeCents: dto.travelFeeCents,
            totalCents: dto.totalCents,
            currency: dto.currency,
            visitNotes: dto.visitNotes,
            diagnosis: dto.diagnosis,
            internalNotes: dto.internalNotes,
        });
    }

    @Patch(':id/assign')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({
        summary: 'Asignar veterinario (staff). Auto-transiciona a CONFIRMED.',
    })
    async assignVet(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: AssignVetDto,
    ) {
        return this.service.assignVet(user, id, dto.vetId);
    }

    @Patch(':id/confirm')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Marcar como CONFIRMED (staff)' })
    async confirm(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.CONFIRMED);
    }

    @Patch(':id/en-route')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Vet va en camino' })
    async enRoute(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.EN_ROUTE);
    }

    @Patch(':id/start')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Iniciar la visita' })
    async start(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.IN_PROGRESS);
    }

    @Patch(':id/complete')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Marcar como COMPLETED con notas y diagnóstico opcionales' })
    async complete(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: CompleteHomeVetBookingDto,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.COMPLETED, {
            visitNotes: dto.visitNotes,
            diagnosis: dto.diagnosis,
        });
    }

    @Patch(':id/no-show')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Marcar como NO_SHOW (staff)' })
    async noShow(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.NO_SHOW);
    }

    @Patch(':id/cancel')
    @Permissions(`${PermissionModule.HOME_VET}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Cancelar (cliente o staff)' })
    async cancel(
        @CurrentUser() user: JwtPayload,
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body() dto: CancelHomeVetBookingDto,
    ) {
        return this.service.transition(user, id, HomeVetBookingStatus.CANCELLED, {
            cancelReason: dto.reason,
        });
    }
}
