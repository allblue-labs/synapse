import {Inject, Injectable} from '@nestjs/common';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';
import {CLINIC_FLOW_QUEUE, DEFAULT_JOB_OPTIONS} from '../../infrastructure/processors/clinic-flow.processor';
import {ProcessClinicFlowJob} from '../../contracts/clinic-flow.contracts';

export interface CreateEntryInput {
  tenantId: string;
  contactPhone: string;
  contactName?: string;
  originalMessage?: string;
  mediaUrl?: string;
  conversationId?: string;
}

@Injectable()
export class CreateEntryUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
    @InjectQueue(CLINIC_FLOW_QUEUE)
    private readonly queue: Queue<ProcessClinicFlowJob>,
  ) {}

  async execute(input: CreateEntryInput) {
    const entry = await this.repository.create(input);

    await this.queue.add(
      'process',
      {tenantId: input.tenantId, entryId: entry.id},
      {...DEFAULT_JOB_OPTIONS, jobId: `clinic-flow:${entry.id}`},
    );

    return entry;
  }
}
