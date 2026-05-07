import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPulseChannelRepository,
  PULSE_CHANNEL_REPOSITORY,
} from '../../domain/ports/pulse-channel-repository.port';

@Injectable()
export class GetChannelUseCase {
  constructor(
    @Inject(PULSE_CHANNEL_REPOSITORY)
    private readonly channels: IPulseChannelRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const channel = await this.channels.findById(tenantId, id);
    if (!channel) {
      throw new NotFoundException(`Pulse channel ${id} not found`);
    }
    return channel;
  }
}
