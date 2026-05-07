import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  IPulseConversationRepository,
  PULSE_CONVERSATION_REPOSITORY,
} from '../../domain/ports/pulse-conversation-repository.port';

@Injectable()
export class GetConversationUseCase {
  constructor(
    @Inject(PULSE_CONVERSATION_REPOSITORY)
    private readonly conversations: IPulseConversationRepository,
  ) {}

  async execute(tenantId: string, id: string) {
    const conversation = await this.conversations.findById(tenantId, id);
    if (!conversation) {
      throw new NotFoundException(`Pulse conversation ${id} not found`);
    }
    return conversation;
  }
}
