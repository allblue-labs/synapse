import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuthenticatedUser } from '../types/authenticated-user';
import { JsonLoggerService } from '../logging/json-logger.service';

type RequestWithContext = {
  method: string;
  originalUrl?: string;
  url: string;
  requestId?: string;
  tenantId?: string;
  user?: AuthenticatedUser;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: JsonLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      tap(() => {
        this.logger.write({
          level: 'log',
          message: 'http_request_completed',
          context: 'HTTP',
          requestId: request.requestId,
          tenantId: request.tenantId ?? request.user?.tenantId,
          userId: request.user?.sub,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt
        });
      }),
      catchError((error: Error) => {
        this.logger.write({
          level: 'error',
          message: 'http_request_failed',
          context: 'HTTP',
          requestId: request.requestId,
          tenantId: request.tenantId ?? request.user?.tenantId,
          userId: request.user?.sub,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
          errorName: error.name,
          stack: error.stack
        });

        return throwError(() => error);
      })
    );
  }
}
