import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkflowEngineService {
  startWorkflow(input: { tenantId: string; moduleName: string; workflowName: string; state?: Record<string, unknown> }) {
    return {
      workflowId: `${input.moduleName}:${input.workflowName}:${Date.now()}`,
      tenantId: input.tenantId,
      moduleName: input.moduleName,
      workflowName: input.workflowName,
      status: 'STARTED',
      state: input.state ?? {}
    };
  }
}
