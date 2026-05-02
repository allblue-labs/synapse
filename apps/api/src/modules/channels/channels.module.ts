import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { MessagesModule } from '../messages/messages.module';
import { DiscordAdapter } from './adapters/discord.adapter';
import { WhatsAppAdapter } from './adapters/whatsapp.adapter';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [MessagesModule, QueueModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, TelegramAdapter, DiscordAdapter, WhatsAppAdapter],
  exports: [ChannelsService]
})
export class ChannelsModule {}
