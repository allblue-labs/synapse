import { Injectable } from '@nestjs/common';
import { ChannelAdapter, NormalizedInboundMessage, SendMessageInput } from '../channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  async receiveMessage(payload: Record<string, unknown>): Promise<NormalizedInboundMessage> {
    return this.normalizePayload(payload);
  }

  async sendMessage(input: SendMessageInput): Promise<{ externalMessageId?: string; raw: Record<string, unknown> }> {
    return {
      raw: {
        provider: 'telegram',
        channelAccountId: input.channelAccountId,
        externalContactId: input.externalContactId,
        text: input.text
      }
    };
  }

  normalizePayload(payload: Record<string, unknown>): NormalizedInboundMessage {
    const message = payload.message as Record<string, unknown> | undefined;
    const from = message?.from as Record<string, unknown> | undefined;
    const chat = message?.chat as Record<string, unknown> | undefined;
    const firstName = typeof from?.first_name === 'string' ? from.first_name : undefined;
    const lastName = typeof from?.last_name === 'string' ? from.last_name : undefined;
    const displayName = [firstName, lastName].filter(Boolean).join(' ') || undefined;

    return {
      externalMessageId: message?.message_id ? String(message.message_id) : undefined,
      externalContactId: chat?.id ? String(chat.id) : String(from?.id ?? 'unknown'),
      contactDisplayName: displayName,
      text: typeof message?.text === 'string' ? message.text : '',
      receivedAt: new Date(),
      raw: payload
    };
  }
}
