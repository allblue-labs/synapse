export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type AgentStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type AgentGoal = 'SALES' | 'LEAD_QUALIFICATION' | 'SUPPORT' | 'BOOKING' | 'AUTOMATION';
export type ConversationStatus = 'ACTIVE' | 'CLOSED' | 'ESCALATED';
export type ChannelType = 'WHATSAPP' | 'TELEGRAM' | 'DISCORD';
export type ChannelStatus = 'ACTIVE' | 'DISCONNECTED' | 'NEEDS_ATTENTION';
export type MessageDirection = 'INBOUND' | 'OUTBOUND' | 'SYSTEM';

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
