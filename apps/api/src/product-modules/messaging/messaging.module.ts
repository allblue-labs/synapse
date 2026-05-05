import { Module } from '@nestjs/common';
import { ChannelsModule } from '../../modules/channels/channels.module';
import { ConversationsModule } from '../../modules/conversations/conversations.module';
import { MessagesModule } from '../../modules/messages/messages.module';
import { QueueModule } from '../../modules/queue/queue.module';
import { ClinicFlowModule } from './clinic-flow/clinic-flow.module';

@Module({
  imports: [ChannelsModule, ConversationsModule, MessagesModule, QueueModule, ClinicFlowModule],
  exports: [ChannelsModule, ConversationsModule, MessagesModule, ClinicFlowModule],
})
export class MessagingModule {}
