import { PulseActionHandlerRegistry } from './pulse-action-handler.registry';

describe('PulseActionHandlerRegistry', () => {
  it('finds registered action handlers by action key', () => {
    const advanceFlowHandler = {
      action: 'ticket.advance_flow',
      definition: {
        action: 'ticket.advance_flow',
        permissions: ['tickets:write'],
        validationFailureClass: 'non_retryable_validation',
      },
      canHandle: jest.fn((action) => action === 'ticket.advance_flow'),
      execute: jest.fn(),
    };
    const registry = new PulseActionHandlerRegistry(advanceFlowHandler as never);

    expect(registry.find('ticket.advance_flow')).toBe(advanceFlowHandler);
    expect(registry.definition('ticket.advance_flow')).toBe(advanceFlowHandler.definition);
    expect(registry.definition('ticket.assign')).toBeNull();
    expect(registry.find('ticket.assign')).toBeNull();
    expect(registry.registeredActions()).toEqual(['ticket.advance_flow']);
    expect(registry.definitions()).toEqual([advanceFlowHandler.definition]);
  });
});
