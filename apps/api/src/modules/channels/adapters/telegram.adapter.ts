import { Injectable } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { ChannelAdapter, ChannelWebhookValidationResult, NormalizedChannelMessage, SendMessageInput } from '../channel-adapter.interface';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  getChannelType(): ChannelType {
    return ChannelType.TELEGRAM;
  }

  async validateWebhook(): Promise<ChannelWebhookValidationResult> {
    return { valid: true };
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

  normalizeInboundMessage(payload: Record<string, unknown>): NormalizedChannelMessage {
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
