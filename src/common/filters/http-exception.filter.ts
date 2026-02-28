import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        let message = 'Internal server error';
        let code = 'INTERNAL_ERROR';
        let details: unknown[] = [];

        if (exception instanceof HttpException) {
            const res = exception.getResponse();
            if (typeof res === 'string') {
                message = res;
                code = this.statusToCode(status);
            } else if (typeof res === 'object' && res !== null) {
                const resObj = res as Record<string, unknown>;
                message = (resObj.message as string) || message;
                code = (resObj.code as string) || this.statusToCode(status);
                details = Array.isArray(resObj.message)
                    ? (resObj.message as unknown[])
                    : [];
                if (details.length > 0) {
                    message = 'Validation failed';
                }
            }
        }

        if (status >= 500) {
            this.logger.error(
                `${request.method} ${request.url} → ${status}`,
                exception instanceof Error ? exception.stack : String(exception),
            );
        } else {
            this.logger.warn(
                `${request.method} ${request.url} → ${status}: ${message}`,
            );
        }

        response.status(status).json({
            success: false,
            error: {
                code,
                message,
                details,
            },
            meta: {
                timestamp: new Date().toISOString(),
                path: request.url,
            },
        });
    }

    private statusToCode(status: number): string {
        const map: Record<number, string> = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'CONFLICT',
            422: 'UNPROCESSABLE_ENTITY',
            429: 'TOO_MANY_REQUESTS',
            500: 'INTERNAL_ERROR',
        };
        return map[status] || 'UNKNOWN_ERROR';
    }
}
