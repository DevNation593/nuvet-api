import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { StorageService } from '../../../storage/storage.service';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtPayload, PermissionModule, PermissionAction } from '@nuvet/types';
import { Permissions } from '../../../common/decorators/permissions.decorator';
import { IsNotEmpty, IsString } from 'class-validator';

export class PresignUploadDto {
    @ApiProperty() @IsString() @IsNotEmpty() filename: string;
    @ApiProperty() @IsString() @IsNotEmpty() contentType: string;
    @ApiProperty({ example: 'medical-records' }) @IsString() @IsNotEmpty() folder: string;
}

@ApiTags('files')
@ApiBearerAuth('JWT')
@Controller({ path: 'files', version: '1' })
export class FilesController {
    constructor(private storageService: StorageService) { }

    @Post('presign')
    @Permissions(`${PermissionModule.FILES}:${PermissionAction.CREATE}`)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get a presigned URL for file upload' })
    async presign(@CurrentUser() user: JwtPayload, @Body() dto: PresignUploadDto) {
        return this.storageService.getUploadPresignedUrl(
            user.tenantId,
            dto.folder,
            dto.filename,
            dto.contentType,
        );
    }
}
