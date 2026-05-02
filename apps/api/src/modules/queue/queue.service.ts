import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { AiResponseJob, MessageProcessingJob, OutboundMessageJob } from '@synapse/contracts';
import { DEFAULT_JOB_OPTIONS, SYNAPSE_QUEUES } from './queue.constants';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(SYNAPSE_QUEUES.MESSAGE_PROCESSING)
    private readonly messageProcessingQueue: Queue<MessageProcessingJob>,
    @InjectQueue(SYNAPSE_QUEUES.AI_RESPONSE)
    private readonly aiResponseQueue: Queue<AiResponseJob>,
    @InjectQueue(SYNAPSE_QUEUES.OUTBOUND_MESSAGE)
    private readonly outboundMessageQueue: Queue<OutboundMessageJob>
  ) {}

  enqueueMessageProcessing(payload: MessageProcessingJob) {
    return this.messageProcessingQueue.add('normalize-and-persist', payload, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `${payload.tenantId}:${payload.channelAccountId}:${payload.normalizedMessage.externalMessageId ?? Date.now()}`
    });
  }

  enqueueAiResponse(payload: AiResponseJob) {
    return this.aiResponseQueue.add('generate-agent-response', payload, {
      ...DEFAULT_JOB_OPTIONS,
      jobId: `${payload.tenantId}:${payload.conversationId}:${payload.triggerMessageId}`
    });
  }

  enqueueOutboundMessage(payload: OutboundMessageJob) {
    return this.outboundMessageQueue.add('send-channel-message', payload, DEFAULT_JOB_OPTIONS);
  }
}
