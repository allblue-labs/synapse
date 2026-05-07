import {Inject, Injectable, NotFoundException} from '@nestjs/common';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';

@Injectable()
export class GetEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);
    return entry;
  }
}
