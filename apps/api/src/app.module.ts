import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { envSchema } from './config/env.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';
import { QueueModule } from './modules/queue/queue.module';
import { CoreIntelligenceModule } from './core/intelligence/core-intelligence.module';
import { CoreOrchestrationModule } from './core/orchestration/core-orchestration.module';
import { ModuleSystemModule } from './core/module-system/module-system.module';
import { MessagingModule } from './product-modules/messaging/messaging.module';
import { RuntimeModule } from './core/runtime/runtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env)
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL')
        }
      })
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000,
        limit: 120
      },
      {
        name: 'auth',
        ttl: 60_000,
        limit: 10
      }
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    CoreIntelligenceModule,
    CoreOrchestrationModule,
    RuntimeModule,
    ModuleSystemModule,
    MessagingModule,
    BillingModule,
    QueueModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
