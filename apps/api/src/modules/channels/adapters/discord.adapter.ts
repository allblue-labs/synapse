import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { ChannelAdapter, ChannelWebhookValidationResult, NormalizedChannelMessage } from '../channel-adapter.interface';

@Injectable()
export class DiscordAdapter implements ChannelAdapter {
  getChannelType(): ChannelType {
    return ChannelType.DISCORD;
  }

  async validateWebhook(): Promise<ChannelWebhookValidationResult> {
    return {
      valid: false,
      reason: 'Discord webhook signature validation is not configured yet.'
    };
  }

  normalizeInboundMessage(payload: Record<string, unknown>): NormalizedChannelMessage {
    const author = payload.author as Record<string, unknown> | undefined;

    return {
      externalMessageId: payload.id ? String(payload.id) : undefined,
      externalContactId: author?.id ? String(author.id) : 'unknown',
      contactDisplayName: typeof author?.username === 'string' ? author.username : undefined,
      text: typeof payload.content === 'string' ? payload.content : '',
      receivedAt: new Date(),
      raw: payload
    };
  }

  async sendMessage(): Promise<{ externalMessageId?: string; raw: Record<string, unknown> }> {
    throw new ServiceUnavailableException('Discord outbound delivery is not implemented yet.');
  }
}
