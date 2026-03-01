/**
 * Vercel serverless entry point.
 * Wraps the NestJS app in an Express adapter so Vercel can invoke it as a
 * serverless function. The bootstrap promise is cached to avoid re-initializing
 * on warm invocations.
 */
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { Request, Response } from 'express';

const expressApp = express();

let initPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(expressApp),
        { logger: ['log', 'warn', 'error'] },
    );

    const configService = app.get(ConfigService);
    const nodeEnv = configService.get<string>('NODE_ENV', 'production');

    // ── Security ──────────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(compression());

    // ── CORS ──────────────────────────────────────────────────────────────────
    const corsOrigins = configService
        .get<string>('CORS_ORIGINS', '*')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    app.enableCors({
        origin: corsOrigins,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    // ── Global prefix & versioning ────────────────────────────────────────────
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

    // ── Global pipes, filters, interceptors ───────────────────────────────────
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    // ── Swagger (non-production only) ─────────────────────────────────────────
    if (nodeEnv !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('NuVet API')
            .setDescription('Multi-tenant veterinary clinic SaaS API')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
            .addTag('auth', 'Authentication & Authorization')
            .addTag('tenants', 'Tenant management')
            .addTag('users', 'User management')
            .addTag('clients', 'Client management')
            .addTag('pets', 'Pet management')
            .addTag('appointments', 'Appointment scheduling')
            .addTag('medical-records', 'Medical records & consultations')
            .addTag('vaccinations', 'Vaccination records')
            .addTag('aesthetics', 'Grooming & aesthetic services')
            .addTag('grooming', 'Grooming services')
            .addTag('surgeries', 'Surgical procedures')
            .addTag('store', 'Products & orders')
            .addTag('inventory', 'Stock management')
            .addTag('adoptions', 'Pet adoption')
            .addTag('notifications', 'Notification inbox')
            .addTag('reports', 'Analytics & reports')
            .addTag('health', 'Health checks')
            .build();

        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api/v1/docs', app, document, {
            swaggerOptions: { persistAuthorization: true },
        });
    }

    await app.init();
}

export default async function handler(req: Request, res: Response): Promise<void> {
    if (!initPromise) {
        initPromise = bootstrap().catch((err) => {
            // Reset on failure so the next request retries
            initPromise = null;
            throw err;
        });
    }
    await initPromise;
    expressApp(req, res);
}
