import { Injectable } from '@nestjs/common';
import {
    collectDefaultMetrics,
    Counter,
    Histogram,
    Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
    private readonly registry = new Registry();
    private readonly httpRequestsTotal: Counter<'method' | 'route' | 'status'>;
    private readonly httpRequestDurationMs: Histogram<'method' | 'route' | 'status'>;

    constructor() {
        collectDefaultMetrics({ register: this.registry, prefix: 'nuvet_api_' });

        this.httpRequestsTotal = new Counter({
            name: 'nuvet_api_http_requests_total',
            help: 'Total HTTP requests',
            labelNames: ['method', 'route', 'status'],
            registers: [this.registry],
        });

        this.httpRequestDurationMs = new Histogram({
            name: 'nuvet_api_http_request_duration_ms',
            help: 'HTTP request duration in milliseconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
            registers: [this.registry],
        });
    }

    recordHttpRequest(params: {
        method: string;
        route: string;
        status: number;
        durationMs: number;
    }) {
        const labels = {
            method: params.method,
            route: params.route,
            status: String(params.status),
        };

        this.httpRequestsTotal.inc(labels, 1);
        this.httpRequestDurationMs.observe(labels, params.durationMs);
    }

    getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    getContentType() {
        return this.registry.contentType;
    }
}
