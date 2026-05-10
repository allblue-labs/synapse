import { Injectable } from '@nestjs/common';
import { PulseActionDefinition, PulseActionHandler } from '../../domain/ports/pulse-action-handler.port';
import { PulseTicketAdvanceFlowActionHandler } from './pulse-ticket-advance-flow-action.handler';

@Injectable()
export class PulseActionHandlerRegistry {
  private readonly handlers: PulseActionHandler[];

  constructor(
    advanceFlowHandler: PulseTicketAdvanceFlowActionHandler,
  ) {
    this.handlers = [
      advanceFlowHandler,
    ];
  }

  find(action: string) {
    return this.handlers.find((handler) => handler.canHandle(action)) ?? null;
  }

  definition(action: string): PulseActionDefinition | null {
    return this.find(action)?.definition ?? null;
  }

  registeredActions() {
    return this.handlers.map((handler) => handler.action);
  }

  definitions() {
    return this.handlers.map((handler) => handler.definition);
  }
}
