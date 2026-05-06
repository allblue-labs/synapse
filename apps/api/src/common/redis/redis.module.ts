import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import IORedis, { Redis } from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/**
 * Global Redis module — provides a single ioredis client instance keyed by
 * `REDIS_CLIENT`. Reuse across security primitives (rate limit / lockout),
 * caches, and any other state that needs to be shared across replicas.
 *
 * BullMQ already opens its own connection — keeping a separate client here
 * isolates application traffic from queue traffic so neither stalls the
 * other under load.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const url = config.getOrThrow<string>('REDIS_URL');
        return new IORedis(url, {
          maxRetriesPerRequest: null,
          enableReadyCheck: true,
          lazyConnect: false,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
