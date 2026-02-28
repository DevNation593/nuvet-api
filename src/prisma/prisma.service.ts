import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createTenantExtension } from './prisma-tenant.middleware';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ],
        });
        const extendedClient = (this as unknown as PrismaClient).$extends(createTenantExtension());
        const serviceKeys = new Set<PropertyKey>(['logger', 'onModuleInit', 'onModuleDestroy']);

        return new Proxy(this, {
            get(target, prop, receiver) {
                if (serviceKeys.has(prop)) {
                    return Reflect.get(target, prop, receiver);
                }

                const extendedValue = Reflect.get(extendedClient as object, prop, extendedClient);
                if (extendedValue !== undefined) {
                    return typeof extendedValue === 'function'
                        ? extendedValue.bind(extendedClient)
                        : extendedValue;
                }

                const baseValue = Reflect.get(target, prop, receiver);
                return typeof baseValue === 'function' ? baseValue.bind(target) : baseValue;
            },
            set(target, prop, value, receiver) {
                if (serviceKeys.has(prop)) {
                    return Reflect.set(target, prop, value, receiver);
                }

                if (Reflect.has(extendedClient as object, prop)) {
                    return Reflect.set(extendedClient as object, prop, value, extendedClient);
                }

                return Reflect.set(target, prop, value, receiver);
            },
        }) as unknown as PrismaService;
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('Database connected');

        // Log slow queries in development
        if (process.env.NODE_ENV === 'development') {
            if (typeof this.$on === 'function') {
                (this.$on as unknown as (eventType: 'query', cb: (event: { duration: number; query: string }) => void) => void)(
                    'query',
                    (event: { duration: number; query: string }) => {
                    if (event.duration > 500) {
                        this.logger.warn(`Slow query (${event.duration}ms): ${event.query}`);
                    }
                });
            }
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
        this.logger.log('Database disconnected');
    }
}
