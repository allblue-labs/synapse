import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { JsonLoggerService } from '../logging/json-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    if (status >= 500) {
      const error = exception instanceof Error ? exception : new Error('Unknown exception');
      this.logger.error(error.message, error.stack, 'HttpExceptionFilter');
    }

    response.status(status).json({
      statusCode: status,
      error: typeof body === 'string' ? body : body,
      timestamp: new Date().toISOString()
    });
  }
}
