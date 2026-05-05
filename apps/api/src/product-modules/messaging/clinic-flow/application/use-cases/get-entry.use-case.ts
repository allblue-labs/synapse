import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
} from '../../domain/ports/clinic-flow-repository.port';

@Injectable()
export class GetEntryUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`ClinicFlow entry ${id} not found`);
    return entry;
  }
}
