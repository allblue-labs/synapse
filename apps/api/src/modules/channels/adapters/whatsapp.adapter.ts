import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { ChannelAdapter, ChannelWebhookValidationResult, NormalizedChannelMessage } from '../channel-adapter.interface';

@Injectable()
export class WhatsAppAdapter implements ChannelAdapter {
  getChannelType(): ChannelType {
    return ChannelType.WHATSAPP;
  }

  async validateWebhook(): Promise<ChannelWebhookValidationResult> {
    return {
      valid: false,
      reason: 'WhatsApp provider-specific signature validation must be configured before accepting production webhooks.'
    };
  }

  normalizeInboundMessage(payload: Record<string, unknown>): NormalizedChannelMessage {
    const contact = payload.contact as Record<string, unknown> | undefined;
    const message = payload.message as Record<string, unknown> | undefined;

    return {
      externalMessageId: message?.id ? String(message.id) : undefined,
      externalContactId: contact?.wa_id ? String(contact.wa_id) : String(message?.from ?? 'unknown'),
      contactDisplayName: typeof contact?.name === 'string' ? contact.name : undefined,
      text: typeof message?.text === 'string' ? message.text : '',
      receivedAt: new Date(),
      raw: payload
    };
  }

  async sendMessage(): Promise<{ externalMessageId?: string; raw: Record<string, unknown> }> {
    throw new ServiceUnavailableException('WhatsApp outbound delivery requires a configured provider adapter.');
  }
}
