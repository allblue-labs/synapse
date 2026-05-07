import { Module } from '@nestjs/common';
import { UsageModule } from '../usage/usage.module';
import { MessagesService } from './messages.service';

@Module({
  imports: [UsageModule],
  providers: [MessagesService],
  exports: [MessagesService]
})
export class MessagesModule {}
