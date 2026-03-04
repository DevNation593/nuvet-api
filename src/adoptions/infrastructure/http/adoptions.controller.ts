import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdoptionsService, CreateAdoptionDto, ApplyAdoptionDto, UpdateAdoptionStatusDto } from '../../application/adoptions.service';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Public } from '../../../common/decorators/public.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, AdoptionStatus, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

class AdoptionListQueryDto extends PaginationQueryDto {
    @IsOptional()
    @IsEnum(AdoptionStatus)
    status?: AdoptionStatus;

    // Public endpoint uses tenantId in query; accepted here to avoid whitelist rejection.
    @IsOptional()
    @IsString()
    tenantId?: string;
}

@ApiTags('adoptions')
@ApiBearerAuth('JWT')
@Controller({ path: 'adoptions', version: '1' })
export class AdoptionsController {
    constructor(private service: AdoptionsService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'List adoptable pets (public endpoint)' })
    findAll(@Query() query: AdoptionListQueryDto) {
        return this.service.findAll(query.tenantId ?? '', query, query.status || AdoptionStatus.AVAILABLE);
    }

    @Post()
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER)
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create an adoption listing for a pet' })
    createListing(@CurrentUser() user: JwtPayload, @Body() dto: CreateAdoptionDto) {
        return this.service.createListing(user.tenantId, dto);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get adoption record' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Post(':id/apply')
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Submit an adoption application' })
    apply(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ApplyAdoptionDto) {
        return this.service.submitApplication(user.tenantId, id, dto, user?.sub);
    }

    @Patch(':id/status')
    @Roles(UserRole.CLINIC_ADMIN, UserRole.ADOPTION_MANAGER)
    @Permissions(`${PermissionModule.ADOPTIONS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Approve or reject an adoption application' })
    updateStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateAdoptionStatusDto) {
        return this.service.updateStatus(user.tenantId, id, dto);
    }
}

