export type NormalizedInboundMessage = {
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
  receiveMessage(payload: Record<string, unknown>): Promise<NormalizedInboundMessage>;
  sendMessage(input: SendMessageInput): Promise<{ externalMessageId?: string; raw: Record<string, unknown> }>;
  normalizePayload(payload: Record<string, unknown>): NormalizedInboundMessage;
}
