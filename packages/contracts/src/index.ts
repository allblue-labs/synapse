export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING_SETUP';

// ─────────────────────────────────────────────────────────────────────
// RBAC — single source of truth for roles & permissions.
// Mirrored on backend (NestJS guards) and frontend (UI gating) — keep in sync.
// ─────────────────────────────────────────────────────────────────────

export type UserRole = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';

export const USER_ROLES = ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'] as const;

/**
 * Action-shaped permission catalogue. Every route that needs authorisation
 * declares one or more of these via `@Permissions(...)`. Never check roles
 * directly in controllers or UI — go through this catalogue.
 *
 * Naming: <resource>:<action>  — keep verbs concrete and granular.
 */
export type Permission =
  // Tenant
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant:delete'
  // Users
  | 'users:read'
  | 'users:invite'
  | 'users:remove'
  | 'users:role.assign'
  // Agents
  | 'agents:read'
  | 'agents:write'
  | 'agents:delete'
  | 'agents:deploy'
  // Conversations
  | 'conversations:read'
  | 'conversations:respond'
  // Channels
  | 'channels:read'
  | 'channels:connect'
  | 'channels:disconnect'
  // ClinicFlow (product-module)
  | 'clinic-flow:read'
  | 'clinic-flow:write'
  | 'clinic-flow:validate'
  | 'clinic-flow:reject'
  | 'clinic-flow:retry'
  // Module registry
  | 'modules:read'
  | 'modules:enable'
  | 'modules:disable'
  // Billing
  | 'billing:read'
  | 'billing:manage';

export const ALL_PERMISSIONS: ReadonlyArray<Permission> = [
  'tenant:read', 'tenant:update', 'tenant:delete',
  'users:read', 'users:invite', 'users:remove', 'users:role.assign',
  'agents:read', 'agents:write', 'agents:delete', 'agents:deploy',
  'conversations:read', 'conversations:respond',
  'channels:read', 'channels:connect', 'channels:disconnect',
  'clinic-flow:read', 'clinic-flow:write', 'clinic-flow:validate', 'clinic-flow:reject', 'clinic-flow:retry',
  'modules:read', 'modules:enable', 'modules:disable',
  'billing:read', 'billing:manage',
] as const;

/**
 * Role → permission matrix.
 *
 *  OWNER     full control of the tenant
 *  ADMIN     OWNER minus tenant:delete and billing:manage (org-fatal)
 *  OPERATOR  reads + day-to-day operational writes (no deletes, no role mgmt)
 *  VIEWER    read-only across the platform
 */
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlyArray<Permission>>> = Object.freeze({
  OWNER: ALL_PERMISSIONS,

  ADMIN: ALL_PERMISSIONS.filter(
    (p) => p !== 'tenant:delete' && p !== 'billing:manage',
  ),

  OPERATOR: [
    'tenant:read',
    'users:read',
    'agents:read', 'agents:write', 'agents:deploy',
    'conversations:read', 'conversations:respond',
    'channels:read', 'channels:connect',
    'clinic-flow:read', 'clinic-flow:write', 'clinic-flow:validate', 'clinic-flow:reject', 'clinic-flow:retry',
    'modules:read',
    'billing:read',
  ],

  VIEWER: [
    'tenant:read',
    'users:read',
    'agents:read',
    'conversations:read',
    'channels:read',
    'clinic-flow:read',
    'modules:read',
    'billing:read',
  ],
});

/** Resolves the full permission set for a role. */
export function permissionsForRole(role: UserRole): ReadonlyArray<Permission> {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Does a role grant a specific permission? */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Does a role grant *all* of the given permissions? */
export function roleHasAllPermissions(role: UserRole, required: ReadonlyArray<Permission>): boolean {
  if (required.length === 0) return true;
  const granted = ROLE_PERMISSIONS[role];
  if (!granted) return false;
  return required.every((p) => granted.includes(p));
}
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

/** Returned by GET /v1/users/me — used by the dashboard layout & UI gating. */
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: ReadonlyArray<Permission>;
  tenant: {
    id: string;
    name: string;
    slug: string;
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
