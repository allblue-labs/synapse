import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { SYNAPSE_QUEUES } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: SYNAPSE_QUEUES.MESSAGE_PROCESSING },
      { name: SYNAPSE_QUEUES.AI_RESPONSE },
      { name: SYNAPSE_QUEUES.OUTBOUND_MESSAGE }
    )
  ],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule {}
