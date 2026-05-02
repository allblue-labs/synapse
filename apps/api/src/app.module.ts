import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AgentsModule } from './modules/agents/agents.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { AiOrchestratorModule } from './modules/ai-orchestrator/ai-orchestrator.module';
import { BillingModule } from './modules/billing/billing.module';
import { HealthModule } from './modules/health/health.module';

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
    PrismaModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AgentsModule,
    ConversationsModule,
    MessagesModule,
    ChannelsModule,
    KnowledgeBaseModule,
    AiOrchestratorModule,
    BillingModule
  ]
})
export class AppModule {}
