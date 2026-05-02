import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { JsonLoggerService } from './common/logging/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = app.get(JsonLoggerService);

  app.useLogger(logger);
  app.use(json({ limit: config.get<string>('REQUEST_BODY_LIMIT', '1mb') }));
  app.use(urlencoded({ extended: true, limit: config.get<string>('REQUEST_BODY_LIMIT', '1mb') }));

  app.setGlobalPrefix('v1');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGINS')?.split(',') ?? true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new RequestIdInterceptor(), new RequestLoggingInterceptor(logger));

  await app.listen(config.get<number>('PORT', 4000));
}

void bootstrap();
