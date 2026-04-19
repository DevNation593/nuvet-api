import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class StorageService {
    private readonly logger = new Logger(StorageService.name);

    async uploadFile(
        _file: Express.Multer.File,
        _folder: string = 'uploads',
        _tenantId: string,
    ): Promise<string> {
        this.logger.warn('S3 storage is disabled — uploadFile is a noop');
        return `noop/${_tenantId}/${_folder}/placeholder`;
    }

    async getPresignedUrl(_key: string, _expiresInSeconds = 3600): Promise<string> {
        this.logger.warn('S3 storage is disabled — getPresignedUrl is a noop');
        return '';
    }

    async getUploadPresignedUrl(
        _tenantId: string,
        _folder: string,
        _filename: string,
        _contentType: string,
        _expiresInSeconds = 300,
    ): Promise<{ url: string; key: string }> {
        this.logger.warn('S3 storage is disabled — getUploadPresignedUrl is a noop');
        return { url: '', key: `noop/${_tenantId}/${_folder}/${_filename}` };
    }

    async deleteFile(_key: string): Promise<void> {
        this.logger.warn('S3 storage is disabled — deleteFile is a noop');
    }

    getPublicUrl(_key: string): string {
        return '';
    }
}
