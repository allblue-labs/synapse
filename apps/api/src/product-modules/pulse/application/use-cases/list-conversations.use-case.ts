import { Inject, Injectable } from '@nestjs/common';
import {
  PulseConversationState,
  PulseOperationalStatus,
} from '@prisma/client';
import {
  IPulseConversationRepository,
  PULSE_CONVERSATION_REPOSITORY,
} from '../../domain/ports/pulse-conversation-repository.port';

@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(PULSE_CONVERSATION_REPOSITORY)
    private readonly conversations: IPulseConversationRepository,
  ) {}

  execute(tenantId: string, filter?: {
    page?: number;
    pageSize?: number;
    state?: PulseConversationState;
    operationalStatus?: PulseOperationalStatus;
  }) {
    return this.conversations.list(tenantId, filter);
  }
}
