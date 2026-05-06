import { Injectable, LoggerService } from '@nestjs/common';
import { redact } from './redact';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

type LogPayload = {
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  tenantId?: string;
  userId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  errorName?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class JsonLoggerService implements LoggerService {
  log(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write({ level: 'log', message, context, metadata });
  }

  error(message: string, trace?: string, context?: string, metadata?: Record<string, unknown>) {
    this.write({ level: 'error', message, context, stack: trace, metadata });
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write({ level: 'warn', message, context, metadata });
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write({ level: 'debug', message, context, metadata });
  }

  verbose(message: string, context?: string, metadata?: Record<string, unknown>) {
    this.write({ level: 'verbose', message, context, metadata });
  }

  write(payload: LogPayload) {
    // Sanitise the payload before serialising — `redact` walks objects /
    // arrays / errors recursively and scrubs keys that look like secrets,
    // plus pattern-matches Bearer tokens and `password=...` strings inside
    // free-form fields like `stack` and `message`.
    const sanitised = redact({
      timestamp: new Date().toISOString(),
      service: 'synapse-api',
      ...payload,
    });

    const line = JSON.stringify(sanitised);
    if (payload.level === 'error') {
      process.stderr.write(`${line}\n`);
      return;
    }

    process.stdout.write(`${line}\n`);
  }
}
