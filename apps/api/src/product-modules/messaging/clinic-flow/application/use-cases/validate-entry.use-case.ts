import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {ClinicFlowStatus} from '@prisma/client';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';
import {ClinicFlowExtractedData} from '../../contracts/clinic-flow.contracts';

@Injectable()
export class ValidateEntryUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
  ) {}

  async execute(
    tenantId: string,
    id: string,
    overrides?: {extractedData?: ClinicFlowExtractedData; scheduledAt?: Date},
  ) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`ClinicFlow entry ${id} not found`);
    if (!entry.canValidate()) {
      throw new BadRequestException(
        `Entry cannot be validated from status "${entry.status}"`,
      );
    }

    return this.repository.update(tenantId, id, {
      status: ClinicFlowStatus.READY_TO_CONFIRM,
      ...(overrides?.extractedData && {extractedData: overrides.extractedData as Record<string, unknown>}),
      ...(overrides?.scheduledAt && {scheduledAt: overrides.scheduledAt}),
    });
  }
}
