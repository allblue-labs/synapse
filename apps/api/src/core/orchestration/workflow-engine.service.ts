import { Injectable } from '@nestjs/common';
import { UsageMeteringService, UsageMetricType } from '../../modules/usage/usage-metering.service';

@Injectable()
export class WorkflowEngineService {
  constructor(private readonly usage: UsageMeteringService) {}

  async startWorkflow(input: { tenantId: string; moduleName: string; workflowName: string; state?: Record<string, unknown> }) {
    const workflow = {
      workflowId: `${input.moduleName}:${input.workflowName}:${Date.now()}`,
      tenantId: input.tenantId,
      moduleName: input.moduleName,
      workflowName: input.workflowName,
      status: 'STARTED',
      state: input.state ?? {}
    };

    await this.usage.record({
      tenantId: input.tenantId,
      moduleSlug: input.moduleName,
      metricType: UsageMetricType.WORKFLOW_RUN,
      quantity: 1,
      unit: 'run',
      resourceType: 'Workflow',
      resourceId: workflow.workflowId,
      idempotencyKey: `workflow:${workflow.workflowId}`,
      metadata: { workflowName: input.workflowName },
    });

    return workflow;
  }
}
