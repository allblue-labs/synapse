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

  // ── CORS ──────────────────────────────────────────────────────────
  // Parse CORS_ORIGINS as a comma-separated allowlist. An empty / unset
  // value is *not* treated as `[""]` (which would silently block every
  // origin); it falls through to a sensible dev default when NODE_ENV
  // is not "production". In production an explicit allowlist is required.
  const rawOrigins = config.get<string>('CORS_ORIGINS') ?? '';
  const originList = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isProd = config.get<string>('NODE_ENV') === 'production';
  const corsOrigin: string[] | boolean =
    originList.length > 0
      ? originList
      : isProd
        ? false
        : true;

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Tenant-Id', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400,
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

  await app.listen(config.get<number>('PORT', 4000), '0.0.0.0');
}

void bootstrap();
