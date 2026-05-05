import { RuntimeService } from './runtime.service';

describe('RuntimeService', () => {
  it('updates tenant runtime module state and prepares Pain command shape', async () => {
    const painClient = {
      applyRuntime: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn(),
      destroyRuntime: jest.fn()
    };
    const service = new RuntimeService(painClient as never);

    const spec = await service.setModuleState('tenant_1', 'messaging', true, { channels: ['telegram'] });

    expect(spec).toEqual({
      tenantId: 'tenant_1',
      plan: 'starter',
      modules: [
        {
          name: 'messaging',
          enabled: true,
          config: { channels: ['telegram'] }
        }
      ]
    });
    expect(painClient.applyRuntime).toHaveBeenCalledWith(spec);
    expect(service.preparePainCommand(spec)).toEqual({
      command: 'applyRuntime',
      target: 'pain-runtime-operator',
      spec
    });
  });
});
