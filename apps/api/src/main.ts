import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { JsonLoggerService } from './common/logging/json-logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = app.get(JsonLoggerService);

  const isProd = config.get<string>('NODE_ENV') === 'production';

  app.useLogger(logger);

  // ── Trust proxy ───────────────────────────────────────────────────
  // When deployed behind a load balancer / reverse proxy, honour the
  // X-Forwarded-* headers so req.ip and req.protocol reflect the real
  // client. `1` = trust the immediate proxy hop only; tighten if more
  // hops are added.
  app.set('trust proxy', 1);

  // ── HTTP hardening (Helmet) ───────────────────────────────────────
  // CSP is not set here because the API is a JSON-only service — no
  // HTML is ever rendered. The frontend (Next) owns CSP for browser
  // surfaces. We disable CSP explicitly so it doesn't interfere with
  // tooling that hits the API directly (Swagger UI, curl, etc.).
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      strictTransportSecurity: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );
  app.disable('x-powered-by');

  // Populate `req.cookies` so the JWT cookie extractor can read the
  // synapse_session cookie. Sits before route handlers so guards see it.
  app.use(cookieParser());

  app.use(json({
    limit: config.get<string>('REQUEST_BODY_LIMIT', '1mb'),
    verify: (req, _res, buf) => {
      const expressReq = req as typeof req & { originalUrl?: string; rawBody?: Buffer };
      if (
        expressReq.originalUrl === '/v1/billing/stripe/webhook' ||
        expressReq.originalUrl === '/v1/pulse/runtime/results'
      ) {
        expressReq.rawBody = Buffer.from(buf);
      }
    },
  }));
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

  let corsOrigin: string[] | boolean;
  if (originList.length > 0) {
    corsOrigin = originList;
  } else {
    // Dev: reflect the request origin. Prod: deny — fail closed.
    corsOrigin = !isProd;
  }

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Tenant-Id',
      'X-Request-Id',
      'X-Synapse-Runtime-Key-Id',
      'X-Synapse-Runtime-Timestamp',
      'X-Synapse-Runtime-Signature',
    ],
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

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');

  logger.write({
    level: 'log',
    message: 'http_server_started',
    context: 'Bootstrap',
    metadata: {port, host: '0.0.0.0'},
  });
}

void bootstrap();
