import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ['log', 'warn', 'error', 'debug'],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');

    // ── Security ──────────────────────────────────────────────────────────────
    app.use(helmet());
    app.use(compression());

    // ── CORS ──────────────────────────────────────────────────────────────────
    const corsOrigins = configService
        .get<string>('CORS_ORIGINS', 'http://localhost:4200,http://localhost:3001,http://localhost:8081')
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

    // ── Swagger ───────────────────────────────────────────────────────────────
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

    await app.listen(port);
    console.log(`🚀 NuVet API running on: http://localhost:${port}/api/v1`);
    console.log(`📚 Swagger docs: http://localhost:${port}/api/v1/docs`);
}

bootstrap();
