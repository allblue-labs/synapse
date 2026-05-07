import {BadRequestException, Inject, Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus} from '@prisma/client';
import {
  PULSE_REPOSITORY,
  IPulseRepository,
} from '../../domain/ports/pulse-repository.port';
import {PulseExtractedData} from '../../contracts/pulse.contracts';

@Injectable()
export class ValidateEntryUseCase {
  constructor(
    @Inject(PULSE_REPOSITORY)
    private readonly repository: IPulseRepository,
  ) {}

  async execute(
    tenantId: string,
    id: string,
    overrides?: {extractedData?: PulseExtractedData; scheduledAt?: Date},
  ) {
    const entry = await this.repository.findById(tenantId, id);
    if (!entry) throw new NotFoundException(`Pulse entry ${id} not found`);
    if (!entry.canValidate()) {
      throw new BadRequestException(
        `Entry cannot be validated from status "${entry.status}"`,
      );
    }

    return this.repository.update(tenantId, id, {
      status: PulseStatus.READY_TO_CONFIRM,
      ...(overrides?.extractedData && {extractedData: overrides.extractedData}),
      ...(overrides?.scheduledAt && {scheduledAt: overrides.scheduledAt}),
    });
  }
}
