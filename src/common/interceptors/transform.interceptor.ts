import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
    success: boolean;
    data: T;
    meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>> {
    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<Response<T>> {
        return next.handle().pipe(
            map((data) => {
                // If data already has the envelope shape (from paginated responses), pass through
                if (data && typeof data === 'object' && 'success' in data) {
                    return data;
                }
                // Wrap data in success envelope
                return {
                    success: true,
                    data,
                };
            }),
        );
    }
}
