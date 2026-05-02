import { Injectable } from '@nestjs/common';
import { SynapseCoreService } from '../../core/module-system/synapse-core.service';
import { SynapseModule } from '../../core/module-system/synapse-module.interface';

@Injectable()
export class MessagingSynapseModule implements SynapseModule {
  name = 'messaging';
  displayName = 'Messaging';
  version = '0.1.0';
  description = 'Channel messaging, conversations, lead capture, and agent interaction.';
  permissions = [
    'messaging:read',
    'messaging:write',
    'messaging:channels.manage',
    'messaging:conversations.manage'
  ];
  actions = [
    {
      name: 'messaging.receive_inbound',
      description: 'Validate and normalize an inbound provider message.',
      requiredPermissions: ['messaging:write'],
      inputSchemaVersion: '2026-05-02'
    },
    {
      name: 'messaging.send_outbound',
      description: 'Send an outbound message through a configured channel adapter.',
      requiredPermissions: ['messaging:write'],
      inputSchemaVersion: '2026-05-02'
    },
    {
      name: 'messaging.capture_lead',
      description: 'Capture structured lead signals from a conversation.',
      requiredPermissions: ['messaging:write'],
      inputSchemaVersion: '2026-05-02'
    }
  ];
  events = [
    {
      name: 'messaging.message.received',
      description: 'A normalized inbound message was accepted by the messaging module.',
      payloadSchemaVersion: '2026-05-02'
    },
    {
      name: 'messaging.conversation.state_changed',
      description: 'A conversation state changed inside the messaging module.',
      payloadSchemaVersion: '2026-05-02'
    }
  ];

  register(core: SynapseCoreService) {
    core.registerModule({
      name: this.name,
      displayName: this.displayName,
      version: this.version,
      description: this.description,
      permissions: this.permissions,
      actions: this.actions,
      events: this.events
    });
  }
}
