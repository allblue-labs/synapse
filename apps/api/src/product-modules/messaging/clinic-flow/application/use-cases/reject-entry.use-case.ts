import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {ClinicFlowStatus} from '@prisma/client';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';

@Injectable()
export class RejectEntryUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
  ) {}

  async execute(tenantId: string, id: string, reason?: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`ClinicFlow entry ${id} not found`);

    const validStatuses: ClinicFlowStatus[] = [
      ClinicFlowStatus.PENDING_VALIDATION,
      ClinicFlowStatus.READY_TO_CONFIRM,
    ];
    if (!validStatuses.includes(entry.status)) {
      throw new BadRequestException(
        `Entry cannot be rejected from status "${entry.status}"`,
      );
    }

    return this.repository.update(tenantId, id, {
      status: ClinicFlowStatus.FAILED,
      errorMessage: reason ?? 'Rejected by operator',
    });
  }
}
