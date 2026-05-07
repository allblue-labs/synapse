import { Injectable } from '@nestjs/common';
import { SynapseCoreService } from '../../core/module-system/synapse-core.service';
import { SynapseModule } from '../../core/module-system/synapse-module.interface';

@Injectable()
export class PulseSynapseModule implements SynapseModule {
  name = 'pulse';
  displayName = 'Synapse Pulse';
  version = '0.1.0';
  description = 'Operational conversation orchestration, tickets, guided flows, and workflow actions.';
  tier = 'LIGHT' as const;
  visibility = 'PUBLIC' as const;
  rolloutState = 'GA' as const;
  active = true;
  permissions = [
    'pulse:read',
    'pulse:write',
    'pulse:validate',
    'pulse:reject',
    'pulse:retry',
  ];
  actions = [
    {
      name: 'pulse.entry.create',
      description: 'Accept an operational communication entry for queue processing.',
      requiredPermissions: ['pulse:write'],
      inputSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.entry.validate',
      description: 'Validate AI-extracted operational data before workflow execution.',
      requiredPermissions: ['pulse:validate'],
      inputSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.entry.retry',
      description: 'Retry a failed Pulse queue entry.',
      requiredPermissions: ['pulse:retry'],
      inputSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.ticket.create',
      description: 'Create a tenant-scoped operational ticket from a conversation state.',
      requiredPermissions: ['tickets:write'],
      inputSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.flow.transition',
      description: 'Advance a guided operational flow after validation or customer input.',
      requiredPermissions: ['pulse:write'],
      inputSchemaVersion: '2026-05-07',
    },
  ];
  events = [
    {
      name: 'pulse.entry.received',
      description: 'A Pulse entry was accepted for processing.',
      payloadSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.entry.validation_required',
      description: 'A Pulse entry requires operator validation.',
      payloadSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.ticket.created',
      description: 'A Pulse operational ticket was created.',
      payloadSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.unsupported_message_type',
      description: 'A transport message was gracefully rejected as unsupported.',
      payloadSchemaVersion: '2026-05-07',
    },
    {
      name: 'pulse.flow.transitioned',
      description: 'A guided Pulse operational flow changed state.',
      payloadSchemaVersion: '2026-05-07',
    },
  ];

  register(core: SynapseCoreService) {
    core.registerModule({
      name: this.name,
      displayName: this.displayName,
      version: this.version,
      description: this.description,
      tier: this.tier,
      visibility: this.visibility,
      rolloutState: this.rolloutState,
      active: this.active,
      permissions: this.permissions,
      actions: this.actions,
      events: this.events,
    });
  }
}
