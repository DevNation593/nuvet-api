import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TraceInterceptor } from './observability/trace.interceptor';
import { MetricsService } from './observability/metrics.service';
import { validateEnvironment } from './config/env-validation';

validateEnvironment();

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['log', 'warn', 'error', 'debug'],
    });

    const configService = app.get(ConfigService);
    const metricsService = app.get(MetricsService);
    const accessLogger = new Logger('HttpAccess');
    const port = configService.get<number>('PORT', 3000);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // ── Security ──────────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(compression());

    // ── Body size limits ──────────────────────────────────────────────────────
    const { json, urlencoded } = await import('express');
    app.use(json({ limit: '2mb' }));
    app.use(urlencoded({ extended: true, limit: '2mb' }));

    app.use((request: any, response: any, next: () => void) => {
        const requestId = request.headers['x-request-id'] ?? randomUUID();
        const startedAt = Date.now();

        request.requestId = requestId;
        response.setHeader('x-request-id', String(requestId));

        response.on('finish', () => {
            const durationMs = Date.now() - startedAt;
            const route = String(request.path ?? request.url ?? 'unknown').replace(/\?.*$/, '');
            const statusCode = Number(response.statusCode ?? 500);

            metricsService.recordHttpRequest({
                method: String(request.method ?? 'UNKNOWN'),
                route,
                status: statusCode,
                durationMs,
            });

            accessLogger.log(
                JSON.stringify({
                    event: 'http.request.completed',
                    requestId,
                    method: request.method,
                    path: route,
                    statusCode,
                    durationMs,
                    tenantId: request.headers['x-tenant-id'] ?? null,
                }),
            );
        });

        next();
    });

    // ── CORS ──────────────────────────────────────────────────────────────────
    const corsOrigins = configService
        .get<string>('CORS_ORIGINS', 'http://localhost:4200,http://localhost:3001,http://localhost:8081')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    const isLocalDevOrigin = (origin: string) =>
        /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\d{1,3}(?:\.\d{1,3}){3})(:\d+)?$/i.test(origin);

    app.enableCors({
        origin: (origin, callback) => {
            // Allow non-browser clients and same-origin/server calls.
            if (!origin) return callback(null, true);

            if (corsOrigins.includes('*') || corsOrigins.includes(origin)) {
                return callback(null, true);
            }

            // In non-production, allow localhost/LAN origins to simplify dev setups.
            if (nodeEnv !== 'production' && isLocalDevOrigin(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`CORS origin not allowed: ${origin}`), false);
        },
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
    app.useGlobalInterceptors(new TraceInterceptor(), new TransformInterceptor());

    // ── Swagger ───────────────────────────────────────────────────────────────
    if (nodeEnv !== 'production') {
        const swaggerConfig = new DocumentBuilder()
            .setTitle('NuVet Tech API')
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

    await app.listen(port);
    console.log(`🚀 NuVet Tech API running on: http://localhost:${port}/api/v1`);
    console.log(`📚 Swagger docs: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
