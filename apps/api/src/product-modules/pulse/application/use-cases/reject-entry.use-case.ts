import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus} from '@prisma/client';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';

@Injectable()
export class RejectEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
  ) {}

  async execute(tenantId: string, id: string, reason?: string) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);

    const validStatuses: PulseStatus[] = [
      PulseStatus.PENDING_VALIDATION,
      PulseStatus.READY_TO_CONFIRM,
    ];
    if (!validStatuses.includes(entry.status)) {
      throw new BadRequestException(
        `Entry cannot be rejected from status "${entry.status}"`,
      );
    }

    return this.repository.update(tenantId, id, {
      status: PulseStatus.FAILED,
      errorMessage: reason ?? 'Rejected by operator',
    });
  }
}
