import { Inject, Injectable } from '@nestjs/common';
import { PulseChannelProvider, PulseChannelStatus } from '@prisma/client';
import {
  IPulseChannelRepository,
  PULSE_CHANNEL_REPOSITORY,
} from '../../domain/ports/pulse-channel-repository.port';

@Injectable()
export class ListChannelsUseCase {
  constructor(
    @Inject(PULSE_CHANNEL_REPOSITORY)
    private readonly channels: IPulseChannelRepository,
  ) {}

  execute(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    provider?: PulseChannelProvider;
    status?: PulseChannelStatus;
  }) {
    return this.channels.list(tenantId, filter);
  }
}
