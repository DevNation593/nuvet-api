import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole, JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { MedicalRecordsService } from '../../application/medical-records.service';
import { CreateMedicalRecordDto, UpdateMedicalRecordDto, RegisterAttachmentDto } from '../../application/dto/medical-record.dto';

@ApiTags('medical-records')
@ApiBearerAuth('JWT')
@Roles(UserRole.CLINIC_ADMIN, UserRole.VET)
@Controller({ path: 'medical-records', version: '1' })
export class MedicalRecordsController {
    constructor(private service: MedicalRecordsService) { }

    @Get()
    @Permissions(`${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'List medical records for a pet' })
    findAll(@CurrentUser() user: JwtPayload, @Query('petId') petId: string, @Query() query: PaginationQueryDto) {
        return this.service.findAll(user.tenantId, petId, query);
    }

    @Post()
    @Permissions(`${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create a medical record (VET/CLINIC_ADMIN)' })
    create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMedicalRecordDto) {
        return this.service.create(user.tenantId, user.sub, dto);
    }

    @Get(':id')
    @Permissions(`${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.READ}`)
    @ApiOperation({ summary: 'Get a medical record by ID' })
    findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
        return this.service.findOne(user.tenantId, id);
    }

    @Patch(':id')
    @Permissions(`${PermissionModule.MEDICAL_RECORDS}:${PermissionAction.UPDATE}`)
    @ApiOperation({ summary: 'Update a medical record' })
    update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
        return this.service.update(user.tenantId, id, dto);
    }

    @Post(':id/attachments')
    @Permissions(`${PermissionModule.FILES}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register attachment metadata after uploading via presigned URL' })
    registerAttachment(
        @CurrentUser() user: JwtPayload,
        @Param('id') id: string,
        @Body() dto: RegisterAttachmentDto,
    ) {
        return this.service.registerAttachment(user.tenantId, user.sub, id, dto);
    }
}


