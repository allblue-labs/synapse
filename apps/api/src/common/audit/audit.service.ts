import { Injectable } from '@nestjs/common';
import { AuditStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JsonLoggerService } from '../logging/json-logger.service';

/**
 * Canonical action names. Keep these stable — they're indexed and used
 * downstream for filtering/alerting. Add new ones here rather than at
 * the call site so we get autocompletion and a single inventory.
 */
export const AuditAction = {
  AUTH_LOGIN_SUCCEEDED: 'auth.login.succeeded',
  AUTH_LOGIN_FAILED:    'auth.login.failed',
  AUTH_LOGIN_LOCKED:    'auth.login.locked',
  AUTH_LOGOUT:          'auth.logout',
  AUTH_REGISTERED:      'auth.registered',
  // Reserved for future use; documented up-front so callers don't drift.
  USER_INVITED:         'users.invited',
  USER_ROLE_CHANGED:    'users.role.changed',
  USER_REMOVED:         'users.removed',
  TENANT_UPDATED:       'tenant.updated',
  AGENT_CREATED:        'agents.created',
  AGENT_UPDATED:        'agents.updated',
  AGENT_DELETED:        'agents.deleted',
  CHANNEL_CONNECTED:    'channels.connected',
  CHANNEL_DISCONNECTED: 'channels.disconnected',
  MODULE_ENABLED:       'modules.enabled',
  MODULE_DISABLED:      'modules.disabled',
  BILLING_FEATURE_FLAG_UPDATED: 'billing.feature_flag.updated',
  BILLING_STRIPE_CUSTOMER_CREATED: 'billing.stripe_customer.created',
  BILLING_STRIPE_CHECKOUT_CREATED: 'billing.stripe_checkout.created',
  BILLING_STRIPE_WEBHOOK_PROCESSED: 'billing.stripe_webhook.processed',
} as const;

export type AuditActionName = typeof AuditAction[keyof typeof AuditAction] | (string & {});

export interface AuditEventInput {
  /** Owning tenant. Optional for pre-session events (e.g. failed login). */
  tenantId?: string | null;
  /** Authenticated actor performing the action, when known. */
  actorUserId?: string | null;
  /** Canonical action — pick from `AuditAction` whenever possible. */
  action: AuditActionName;
  /** Type of the resource the action targets, e.g. 'Agent', 'Tenant'. */
  resourceType?: string | null;
  /** Concrete resource id, when applicable. */
  resourceId?: string | null;
  /** Outcome of the action — defaults to SUCCESS. */
  status?: AuditStatus;
  /** Network attribution. */
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  /** Free-form structured metadata. Will be persisted as JSONB. */
  metadata?: Prisma.InputJsonValue;
}

/**
 * Append-only security ledger. Best-effort: persistence failures are
 * logged but do *not* fail the original request — never let audit
 * unavailability take an action down.
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: JsonLoggerService,
  ) {}

  async record(event: AuditEventInput): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId:     event.tenantId ?? null,
          actorUserId:  event.actorUserId ?? null,
          action:       event.action,
          resourceType: event.resourceType ?? null,
          resourceId:   event.resourceId ?? null,
          status:       event.status ?? AuditStatus.SUCCESS,
          ipAddress:    event.ipAddress ?? null,
          userAgent:    event.userAgent ?? null,
          requestId:    event.requestId ?? null,
          metadata:     event.metadata,
        },
      });
    } catch (err) {
      this.logger.write({
        level: 'error',
        message: 'audit_persist_failed',
        context: 'AuditService',
        metadata: {
          action: event.action,
          tenantId: event.tenantId,
          actorUserId: event.actorUserId,
          // Stack/message will pass through redact() in the logger.
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }
}
