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
  moduleName?: string;
  channelAccountId: string;
  conversationId: string;
  externalContactId: string;
  text: string;
};

export type ModuleActionInput = Record<string, unknown>;
export type ModuleActionOutput = Record<string, unknown>;

export type ModuleAction = {
  name: string;
  description: string;
  requiredPermissions?: string[];
  inputSchemaVersion: string;
};

export type ModuleEvent = {
  name: string;
  description: string;
  payloadSchemaVersion: string;
};

export type SynapseModuleManifest = {
  name: string;
  displayName: string;
  version: string;
  description: string;
  actions: ModuleAction[];
  events?: ModuleEvent[];
  permissions?: string[];
};

export type RegisteredModule = SynapseModuleManifest & {
  enabled: boolean;
  registeredAt: string;
};

export type LlmTaskType = 'conversation_reply' | 'lead_extraction' | 'intent_classification' | 'workflow_reasoning';

export type LlmRoutingPolicy = {
  taskType: LlmTaskType;
  privacy: 'standard' | 'private';
  maxLatencyMs?: number;
  maxCostTier?: 'low' | 'medium' | 'high';
};

export type MessagingConversationState = 'NEW' | 'QUALIFYING' | 'WAITING_ON_USER' | 'READY_FOR_HANDOFF' | 'CLOSED';

export type TaskType = 'llm' | 'workflow' | 'message' | 'analysis';

export type Task = {
  id: string;
  type: TaskType;
  tenantId: string;
  module: string;
  payload: Record<string, unknown>;
  priority?: number;
  metadata?: Record<string, unknown>;
};

export type TaskResult = {
  taskId: string;
  tenantId: string;
  module: string;
  status: 'completed' | 'queued' | 'failed';
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  completedAt: string;
};

export type TenantRuntimeModuleSpec = {
  name: string;
  enabled: boolean;
  config?: Record<string, unknown>;
};

export type TenantRuntimeSpec = {
  tenantId: string;
  plan: string;
  modules: TenantRuntimeModuleSpec[];
};

export type TenantRuntimeStatus = {
  tenantId: string;
  state: 'local' | 'pending' | 'ready' | 'error';
  lastAppliedAt?: string;
  message?: string;
};
