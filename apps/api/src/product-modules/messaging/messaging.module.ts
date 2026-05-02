import { Module } from '@nestjs/common';
import { ChannelsModule } from '../../modules/channels/channels.module';
import { ConversationsModule } from '../../modules/conversations/conversations.module';
import { MessagesModule } from '../../modules/messages/messages.module';
import { QueueModule } from '../../modules/queue/queue.module';

@Module({
  imports: [ChannelsModule, ConversationsModule, MessagesModule, QueueModule],
  exports: [ChannelsModule, ConversationsModule, MessagesModule]
})
export class MessagingModule {}
