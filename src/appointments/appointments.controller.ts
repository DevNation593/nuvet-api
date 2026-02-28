import {
    Controller, Get, Post, Patch, Delete,
    Param, Body, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import {
    CreateAppointmentDto,
    UpdateAppointmentDto,
    AppointmentListQueryDto,
    CancelAppointmentDto,
} from './dto/appointment.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';

@ApiTags('appointments')
@ApiBearerAuth('JWT')
@Controller({ path: 'appointments', version: '1' })
export class AppointmentsController {
    constructor(private appointmentsService: AppointmentsService) { }

    @Get()
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List appointments with filters (date range, vet, status, type)' })
    findAll(
        @CurrentUser() user: JwtPayload,
        @Query() query: AppointmentListQueryDto,
    ) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.appointmentsService.findAll(user.tenantId, query, query, ownerId);
    }

    @Get('availability')
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get available time slots for a vet on a given date' })
    @ApiQuery({ name: 'date', example: '2026-03-01', required: true })
    @ApiQuery({ name: 'vetId', required: true })
    getAvailability(
        @CurrentUser() user: JwtPayload,
        @Query('date') date: string,
        @Query('vetId') vetId: string,
    ) {
        return this.appointmentsService.getAvailability(user.tenantId, date, vetId);
    }

    @Get('staff')
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List assignable staff for appointments' })
    getAssignableStaff(@CurrentUser() user: JwtPayload) {
        return this.appointmentsService.getAssignableStaff(user.tenantId);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST, UserRole.CLIENT)
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Book a new appointment' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppointmentDto) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.appointmentsService.create(user.tenantId, dto, ownerId);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get appointment details' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.appointmentsService.findOne(user.tenantId, id, ownerId);
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST)
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update or reschedule appointment' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateAppointmentDto,
    ) {
        return this.appointmentsService.update(user.tenantId, id, dto, user.sub);
    }

    @Delete(':id')
    @Permissions(`${PermissionModule.APPOINTMENTS}:${PermissionAction.DELETE}`)
    @ApiOperation({ summary: 'Cancel appointment' })
    cancel(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() body: CancelAppointmentDto,
    ) {
        const ownerId = user.role === UserRole.CLIENT ? user.sub : undefined;
        return this.appointmentsService.cancel(user.tenantId, id, body.reason, user.sub, ownerId);
    }
}

