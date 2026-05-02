import { ChannelType } from '@prisma/client';

export type ChannelWebhookValidationResult = {
  valid: boolean;
  reason?: string;
};

export type NormalizedChannelMessage = {
  externalMessageId?: string;
  externalContactId: string;
  contactDisplayName?: string;
  text: string;
  receivedAt: Date;
  raw: Record<string, unknown>;
};

export type SendMessageInput = {
  channelAccountId: string;
  externalContactId: string;
  text: string;
};

export interface ChannelAdapter {
  getChannelType(): ChannelType;
  validateWebhook(payload: Record<string, unknown>, headers: Record<string, string | string[] | undefined>): Promise<ChannelWebhookValidationResult>;
  normalizeInboundMessage(payload: Record<string, unknown>): NormalizedChannelMessage;
  sendMessage(input: SendMessageInput): Promise<{ externalMessageId?: string; raw: Record<string, unknown> }>;
}
