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
import { PermissionAction, PermissionModule, UserRole, type JwtPayload } from '@nuvet/types';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { buildPaginatedResponse } from '../../../common/dto/pagination.dto';
import {
    CancelPostOpPlanDto,
    CreatePostOpCheckinDto,
    CreatePostOpPlanDto,
    ListPostOpCheckinsQueryDto,
    ListPostOpPlansQueryDto,
    ReviewPostOpCheckinDto,
    UpdatePostOpPlanDto,
} from '../../application/dto/postop.dto';
import { PostOpService } from '../../application/postop.service';

const TAGS = 'Postop / Seguimiento postoperatorio';

function buildActor(user: JwtPayload) {
    return {
        userId: user.sub,
        role: user.role,
    };
}

@ApiTags(TAGS)
@ApiBearerAuth()
@Controller({ path: 'postop', version: '1' })
@Roles(UserRole.CLINIC_ADMIN, UserRole.VET, UserRole.RECEPTIONIST, UserRole.CLIENT)
export class PostOpController {
    constructor(private readonly service: PostOpService) {}

    @Post('plans')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Crear plan postoperatorio (vet/admin)' })
    async createPlan(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostOpPlanDto) {
        return this.service.createPlan(user.tenantId, {
            tenantId: user.tenantId,
            ...dto,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
        });
    }

    @Get('plans')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.READ}`)
    @ApiOperation({
        summary:
            'Listar planes: staff ve todos los del tenant; CLIENT solo los suyos',
    })
    async listPlans(
        @CurrentUser() user: JwtPayload,
        @Query() query: ListPostOpPlansQueryDto,
    ) {
        const filter = {
            ...(query.status ? { status: query.status } : {}),
            ...(query.petId ? { petId: query.petId } : {}),
            ...(query.vetId ? { vetId: query.vetId } : {}),
            ...(query.surgeryId ? { surgeryId: query.surgeryId } : {}),
        };
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        if (user.role === UserRole.CLIENT) {
            const result = await this.service.listByOwner(user.sub, filter, page, pageSize);
            return buildPaginatedResponse(result.data, result.total, page, pageSize);
        }
        const result = await this.service.listByTenant(user.tenantId, filter, page, pageSize);
        return buildPaginatedResponse(result.data, result.total, page, pageSize);
    }

    @Get('plans/:id')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Detalle de un plan con sus checkins' })
    async findOnePlan(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.service.findOnePlan(user.tenantId, id, buildActor(user), true);
    }

    @Patch('plans/:id')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Actualizar instrucciones o fechas de un plan activo' })
    async updatePlan(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdatePostOpPlanDto,
    ) {
        return this.service.updatePlan(user.tenantId, id, {
            ...dto,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        });
    }

    @Post('plans/:id/complete')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Marcar plan como completado (vet/admin)' })
    async completePlan(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.service.completePlan(user.tenantId, id);
    }

    @Post('plans/:id/cancel')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancelar plan postoperatorio' })
    async cancelPlan(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelPostOpPlanDto,
    ) {
        return this.service.cancelPlan(user.tenantId, id, dto.reason);
    }

    @Post('plans/:id/checkins')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Dueño o staff registra un checkin de seguimiento',
    })
    async createCheckin(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CreatePostOpCheckinDto,
    ) {
        return this.service.createCheckin(user.tenantId, id, buildActor(user), dto);
    }

    @Get('plans/:id/checkins')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Listar checkins de un plan' })
    async listCheckins(
        @CurrentUser() user: JwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: ListPostOpCheckinsQueryDto,
    ) {
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        const result = await this.service.listCheckins(
            user.tenantId,
            id,
            buildActor(user),
            page,
            pageSize,
        );
        return buildPaginatedResponse(result.data, result.total, page, pageSize);
    }

    @Post('checkins/:checkinId/review')
    @Permissions(`${PermissionModule.POSTOP}:${PermissionAction.UPDATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Vet revisa y comenta un checkin (o lo marca FLAGGED)' })
    async reviewCheckin(
        @CurrentUser() user: JwtPayload,
        @Param('checkinId', ParseUUIDPipe) checkinId: string,
        @Body() dto: ReviewPostOpCheckinDto,
    ) {
        return this.service.reviewCheckin(
            user.tenantId,
            checkinId,
            user.sub,
            buildActor(user),
            dto,
        );
    }
}
