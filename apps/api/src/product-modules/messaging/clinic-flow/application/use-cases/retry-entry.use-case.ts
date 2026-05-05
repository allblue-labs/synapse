import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {ClinicFlowStatus} from '@prisma/client';
import {InjectQueue} from '@nestjs/bullmq';
import {Queue} from 'bullmq';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';
import {CLINIC_FLOW_QUEUE, DEFAULT_JOB_OPTIONS} from '../../infrastructure/processors/clinic-flow.processor';
import {ProcessClinicFlowJob} from '../../contracts/clinic-flow.contracts';

@Injectable()
export class RetryEntryUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
    @InjectQueue(CLINIC_FLOW_QUEUE)
    private readonly queue: Queue<ProcessClinicFlowJob>,
  ) {}

  async execute(tenantId: string, id: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`ClinicFlow entry ${id} not found`);
    if (!entry.canRetry()) {
      throw new BadRequestException(
        entry.retryCount >= 3
          ? 'Maximum retry attempts reached'
          : `Entry cannot be retried from status "${entry.status}"`,
      );
    }

    const updated = await this.repository.update(tenantId, id, {
      status: ClinicFlowStatus.PROCESSING,
      errorMessage: null,
      retryCount: entry.retryCount + 1,
    });

    await this.queue.add('process', {tenantId, entryId: id}, DEFAULT_JOB_OPTIONS);

    return updated;
  }
}
