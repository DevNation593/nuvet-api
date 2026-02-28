import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
    private readonly s3: S3Client;
    private readonly bucket: string;
    private readonly logger = new Logger(StorageService.name);

    constructor(private configService: ConfigService) {
        this.bucket = configService.get<string>('s3.bucket', 'nuvet-files');

        this.s3 = new S3Client({
            endpoint: configService.get<string>('s3.endpoint'),
            region: configService.get<string>('s3.region', 'us-east-1'),
            credentials: {
                accessKeyId: configService.get<string>('s3.accessKey', 'minioadmin'),
                secretAccessKey: configService.get<string>('s3.secretKey', 'minioadmin'),
            },
            forcePathStyle: true, // Required for MinIO
        });
    }

    async uploadFile(
        file: Express.Multer.File,
        folder: string = 'uploads',
        tenantId: string,
    ): Promise<string> {
        const extension = file.originalname.split('.').pop();
        const key = `${tenantId}/${folder}/${uuidv4()}.${extension}`;

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                Metadata: {
                    originalName: file.originalname,
                    tenantId,
                },
            }),
        );

        this.logger.log(`Uploaded file: ${key}`);
        return key;
    }

    async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });
        return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
    }

    async getUploadPresignedUrl(
        tenantId: string,
        folder: string,
        filename: string,
        contentType: string,
        expiresInSeconds = 300,
    ): Promise<{ url: string; key: string }> {
        const extension = filename.split('.').pop();
        const key = `${tenantId}/${folder}/${uuidv4()}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ContentType: contentType,
            Metadata: {
                originalName: filename,
                tenantId,
            },
        });

        const url = await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
        return { url, key };
    }

    async deleteFile(key: string): Promise<void> {
        await this.s3.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }),
        );
        this.logger.log(`Deleted file: ${key}`);
    }

    getPublicUrl(key: string): string {
        const endpoint = this.configService.get<string>('s3.endpoint');
        // If local MinIO, might need mapping from internal (docker) to external (localhost)
        // For now returning stored endpoint
        return `${endpoint}/${this.bucket}/${key}`;
    }
}
