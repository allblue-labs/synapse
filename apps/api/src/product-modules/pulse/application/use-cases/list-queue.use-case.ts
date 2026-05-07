import {Inject, Injectable} from '@nestjs/common';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
  ListEntriesFilter,
} from '../../domain/ports/pulse-repository.port';

@Injectable()
export class ListQueueUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
  ) {}

  execute(tenantId: string, filter: ListEntriesFilter) {
    return this.repository.list(tenantId, filter);
  }
}
