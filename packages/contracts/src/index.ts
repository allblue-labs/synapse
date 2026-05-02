export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type AgentStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type AgentGoal = 'SALES' | 'LEAD_QUALIFICATION' | 'SUPPORT' | 'BOOKING' | 'AUTOMATION';
export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'ESCALATED';
export type ChannelType = 'WHATSAPP' | 'TELEGRAM' | 'DISCORD';
export type ChannelStatus = 'ACTIVE' | 'DISCONNECTED' | 'NEEDS_ATTENTION';
export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'SYSTEM';
export type MessageAuthorType = 'CONTACT' | 'AGENT' | 'HUMAN' | 'SYSTEM';
export type BillingStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID' | 'INCOMPLETE';

export type TenantSummary = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
};

export type AgentSummary = {
  id: string;
  tenantId: string;
  name: string;
  status: AgentStatus;
  goal: AgentGoal;
  personality: string;
  modelProvider: string;
  modelName: string;
  updatedAt: string;
};

export type ConversationSummary = {
  id: string;
  tenantId: string;
  status: ConversationStatus;
  externalContactId: string;
  contactDisplayName?: string | null;
  lastMessageAt?: string | null;
  agent?: {
    id: string;
    name: string;
    status: AgentStatus;
  } | null;
  channelAccount: {
    id: string;
    type: ChannelType;
    displayName: string;
  };
};

export type ChannelAccountSummary = {
  id: string;
  tenantId: string;
  type: ChannelType;
  status: ChannelStatus;
  displayName: string;
  externalId?: string | null;
};

export type NormalizedInboundMessage = {
  tenantId: string;
  channelAccountId: string;
  channelType: ChannelType;
  externalMessageId?: string;
  externalContactId: string;
  contactDisplayName?: string;
  text: string;
  receivedAt: string;
  raw: Record<string, unknown>;
};

export type MessageSummary = {
  id: string;
  tenantId: string;
  conversationId: string;
  direction: MessageDirection;
  authorType: MessageAuthorType;
  content: string;
  createdAt: string;
};

export type CreateAgentRequest = {
  name: string;
  goal: AgentGoal;
  personality: string;
  instructions: string;
  rules: string[];
  modelProvider?: string;
  modelName?: string;
  temperature?: number;
};

export type AuthSession = {
  accessToken: string;
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: UserRole;
  };
};

export type BillingAccountSummary = {
  tenantId: string;
  status: BillingStatus;
  planKey: string;
  currentPeriodEnd?: string | null;
  entitlements: Record<string, unknown>;
};

export type LeadExtraction = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  companySize?: string;
  intent?: string;
  urgency?: string;
  budget?: string;
  confidence: number;
};

export type AiIntentClassification = {
  intent: 'SALES' | 'SUPPORT' | 'BOOKING' | 'GENERAL' | 'ESCALATION';
  confidence: number;
  reason?: string;
};

export type AiAgentResponse = {
  reply: string;
  leadExtraction?: LeadExtraction;
  intent?: AiIntentClassification;
  shouldEscalate?: boolean;
  metadata?: Record<string, unknown>;
};

export type MessageProcessingJob = {
  tenantId: string;
  channelAccountId: string;
  normalizedMessage: NormalizedInboundMessage;
};

export type AiResponseJob = {
  tenantId: string;
  conversationId: string;
  agentId: string;
  triggerMessageId: string;
};

export type OutboundMessageJob = {
  tenantId: string;
  channelAccountId: string;
  conversationId: string;
  externalContactId: string;
  text: string;
};
