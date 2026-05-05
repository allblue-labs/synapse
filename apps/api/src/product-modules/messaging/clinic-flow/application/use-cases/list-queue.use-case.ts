import {Inject, Injectable} from '@nestjs/common';
import {
  CLINIC_FLOW_REPOSITORY,
  IClinicFlowRepository,
  ListEntriesFilter,
} from '../../domain/ports/clinic-flow-repository.port';

@Injectable()
export class ListQueueUseCase {
  constructor(
    @Inject(CLINIC_FLOW_REPOSITORY)
    private readonly repository: IClinicFlowRepository,
  ) {}

  execute(tenantId: string, filter: ListEntriesFilter) {
    return this.repository.list(tenantId, filter);
  }
}
