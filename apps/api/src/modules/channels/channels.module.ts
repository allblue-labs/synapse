import { Module } from '@nestjs/common';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [MessagesModule],
  controllers: [ChannelsController],
  providers: [ChannelsService, TelegramAdapter],
  exports: [ChannelsService]
})
export class ChannelsModule {}
