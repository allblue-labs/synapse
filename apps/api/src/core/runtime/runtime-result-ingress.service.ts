import { Injectable } from '@nestjs/common';
import { ExecutionStatus } from '@prisma/client';
import { RuntimeResultDto } from './dtos/runtime-result.dto';
import { RuntimeCallbackReceiptService } from './runtime-callback-receipt.service';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';
import { RuntimeResultHandlerRegistry } from './runtime-result-handler.registry';
import { RuntimeUsageMeteringService } from './runtime-usage-metering.service';

@Injectable()
export class RuntimeResultIngressService {
  constructor(
    private readonly lifecycle: RuntimeExecutionLifecycleService,
    private readonly handlers: RuntimeResultHandlerRegistry,
    private readonly receipts: RuntimeCallbackReceiptService,
    private readonly usage: RuntimeUsageMeteringService,
  ) {}

  async ingest(input: {
    dto: RuntimeResultDto;
    rawBody: string;
    signatureKeyId: string;
    signatureTimestamp: string;
    signature: string;
  }) {
    const { dto } = input;
    const request = await this.lifecycle.getRequest(dto.tenantId, dto.executionRequestId);
    const receipt = await this.receipts.claim({
      tenantId: dto.tenantId,
      executionRequestId: dto.executionRequestId,
      resultStatus: dto.status as ExecutionStatus,
      rawBody: input.rawBody,
      signatureKeyId: input.signatureKeyId,
      signatureTimestamp: input.signatureTimestamp,
      signature: input.signature,
    });
    if (receipt.replay) {
      return {
        accepted: true,
        replay: true,
        receiptId: receipt.receiptId,
        receiptStatus: receipt.status,
      };
    }

    const handler = this.handlers.resolve(request.context.moduleSlug);
    try {
      await this.usage.recordProviderCall({
        request,
        response: {
          id: dto.runtimeExecutionId ?? dto.executionRequestId,
          tenantId: dto.tenantId,
          moduleSlug: request.context.moduleSlug,
          status: dto.status,
          output: dto.output,
          errorMessage: dto.errorMessage,
        },
        transport: 'http_callback',
      });

      const result = await handler.handle({
        tenantId: dto.tenantId,
        executionRequestId: dto.executionRequestId,
        status: dto.status,
        output: this.moduleOutput(dto.output),
        errorMessage: dto.errorMessage,
        traceId: dto.traceId,
        request,
      });
      await this.receipts.markProcessed(receipt.receiptId);
      return result;
    } catch (error) {
      await this.receipts.markFailed(receipt.receiptId, error);
      throw error;
    }
  }

  private moduleOutput(output: Record<string, unknown> | undefined) {
    if (!output) {
      return undefined;
    }
    const structuredPayload = output.structuredPayload;
    if (structuredPayload && typeof structuredPayload === 'object' && !Array.isArray(structuredPayload)) {
      return structuredPayload as Record<string, unknown>;
    }

    const raw = output.output;
    if (typeof raw !== 'string') {
      return output;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return output;
    }
    return output;
  }
}
