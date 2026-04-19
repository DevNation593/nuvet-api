import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { context, SpanStatusCode, trace } from '@opentelemetry/api';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
    intercept(contextRef: ExecutionContext, next: CallHandler): Observable<unknown> {
        const http = contextRef.switchToHttp();
        const request = http.getRequest<{ method: string; route?: { path?: string }; url: string }>();
        const response = http.getResponse<{ statusCode?: number }>();

        const route = request.route?.path ?? request.url;
        const span = trace.getTracer('nuvet-api').startSpan(`HTTP ${request.method} ${route}`);

        span.setAttribute('http.method', request.method);
        span.setAttribute('http.route', route);
        span.setAttribute('http.target', request.url);

        return context.with(trace.setSpan(context.active(), span), () =>
            next.handle().pipe(
                catchError((error: unknown) => {
                    span.recordException(error as Error);
                    span.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: error instanceof Error ? error.message : 'request_failed',
                    });
                    return throwError(() => error);
                }),
                finalize(() => {
                    span.setAttribute('http.status_code', response.statusCode ?? 500);
                    if ((response.statusCode ?? 500) < 500) {
                        span.setStatus({ code: SpanStatusCode.OK });
                    }
                    span.end();
                }),
            ),
        );
    }
}
