import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, PermissionAction, PermissionModule, UserRole } from '@nuvet/types';
import { VaccinationCampaignStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import {
    PaginationQueryDto,
    buildPaginationArgs,
} from '../../../common/dto/pagination.dto';
import { VaccinationCampaignsService } from '../../application/vaccination-campaigns.service';
import {
    CreateVaccinationCampaignDto,
    MarkAttendedDto,
    RegisterPetDto,
    UpdateVaccinationCampaignDto,
} from '../../application/dto/vaccination-campaign.dto';

@ApiTags('vaccinations')
@ApiBearerAuth('JWT')
@Controller({ path: 'vaccinations/campaigns', version: '1' })
export class VaccinationCampaignsController {
    constructor(
        private readonly service: VaccinationCampaignsService,
    ) {}

    @Get()
    @Roles(
        UserRole.CLINIC_ADMIN,
        UserRole.VET,
        UserRole.RECEPTIONIST,
    )
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
    )
    @ApiOperation({ summary: 'Lista campañas de vacunación del tenant' })
    list(
        @CurrentUser() user: JwtPayload,
        @Query() query: PaginationQueryDto & {
            status?: VaccinationCampaignStatus;
            fromDate?: string;
            toDate?: string;
        },
    ) {
        const { skip, take } = buildPaginationArgs(query);
        return this.service.listForTenant(
            user.tenantId,
            {
                status: query.status,
                fromDate: query.fromDate ? new Date(query.fromDate) : undefined,
                toDate: query.toDate ? new Date(query.toDate) : undefined,
            },
            { skip, take },
        );
    }

    @Get(':id')
    @Roles(
        UserRole.CLINIC_ADMIN,
        UserRole.VET,
        UserRole.RECEPTIONIST,
        UserRole.CLIENT,
    )
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
    )
    @ApiOperation({ summary: 'Detalle de una campaña con conteo de inscritos' })
    async getOne(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
    ) {
        return this.service.getOne(user.tenantId, id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.CREATE}`,
    )
    @ApiOperation({ summary: 'Crea una nueva campaña (status=DRAFT por defecto)' })
    create(
        @CurrentUser() user: JwtPayload,
        @Body() dto: CreateVaccinationCampaignDto,
    ) {
        return this.service.create(user.tenantId, {
            name: dto.name,
            description: dto.description,
            vaccineName: dto.vaccineName,
            startsAt: new Date(dto.startsAt),
            endsAt: new Date(dto.endsAt),
            location: dto.location,
            capacity: dto.capacity,
            priceCents: dto.priceCents,
            currency: dto.currency,
            notes: dto.notes,
            createdById: user.sub,
        });
    }

    @Patch(':id')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Actualiza una campaña existente' })
    update(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: UpdateVaccinationCampaignDto,
    ) {
        return this.service.update(user.tenantId, id, {
            ...dto,
            startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
            endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        });
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(UserRole.CLINIC_ADMIN)
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.DELETE}`,
    )
    @ApiOperation({
        summary:
            'Elimina una campaña SIN inscripciones (si tiene, debe cancelarse)',
    })
    async delete(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
    ) {
        await this.service.delete(user.tenantId, id);
    }

    // ── Registrations (sub-recurso) ────────────────────────────────────────

    @Get(':id/registrations')
    @Roles(
        UserRole.CLINIC_ADMIN,
        UserRole.VET,
        UserRole.RECEPTIONIST,
    )
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.READ}`,
    )
    @ApiOperation({ summary: 'Lista las inscripciones de una campaña' })
    listRegistrations(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Query() query: PaginationQueryDto,
    ) {
        const { skip, take } = buildPaginationArgs(query);
        return this.service.listRegistrations(id, user.tenantId, {
            skip,
            take,
        });
    }

    @Post(':id/registrations')
    @HttpCode(HttpStatus.CREATED)
    @Roles(
        UserRole.CLIENT,
        UserRole.CLINIC_ADMIN,
        UserRole.VET,
        UserRole.RECEPTIONIST,
    )
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.CREATE}`,
    )
    @ApiOperation({ summary: 'Inscribe una mascota a la campaña' })
    registerPet(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: RegisterPetDto,
    ) {
        return this.service.registerPet(
            {
                sub: user.sub,
                tenantId: user.tenantId,
                role: user.role,
            },
            { campaignId: id, petId: dto.petId, notes: dto.notes },
        );
    }

    @Delete('registrations/:regId')
    @HttpCode(HttpStatus.NO_CONTENT)
    @Roles(
        UserRole.CLIENT,
        UserRole.CLINIC_ADMIN,
        UserRole.VET,
        UserRole.RECEPTIONIST,
    )
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.DELETE}`,
    )
    @ApiOperation({ summary: 'Cancela una inscripción (status=CANCELLED)' })
    async cancelRegistration(
        @CurrentUser() user: JwtPayload,
        @Param('regId') regId: string,
    ) {
        await this.service.cancelRegistration(
            {
                sub: user.sub,
                tenantId: user.tenantId,
                role: user.role,
            },
            regId,
        );
    }

    @Patch('registrations/:regId/attend')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST)
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Marca asistencia: la mascota recibió la vacuna' })
    markAttended(
        @CurrentUser() user: JwtPayload,
        @Param('regId') regId: string,
        @Body() dto: MarkAttendedDto,
    ) {
        return this.service.markAttended(
            {
                sub: user.sub,
                tenantId: user.tenantId,
                role: user.role,
            },
            regId,
            {
                attendedAt: dto.attendedAt ? new Date(dto.attendedAt) : undefined,
                notes: dto.notes,
            },
        );
    }

    @Patch('registrations/:regId/no-show')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST)
    @Permissions(
        `${PermissionModule.VACCINATIONS}:${PermissionAction.UPDATE}`,
    )
    @ApiOperation({ summary: 'Marca no-show: la mascota no vino a la jornada' })
    markNoShow(
        @CurrentUser() user: JwtPayload,
        @Param('regId') regId: string,
    ) {
        return this.service.markNoShow(
            {
                sub: user.sub,
                tenantId: user.tenantId,
                role: user.role,
            },
            regId,
        );
    }
}
