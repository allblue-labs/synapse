import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ExecutionStatus, Prisma, RuntimeCallbackReceiptStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export type RuntimeCallbackReceiptClaim = {
  receiptId: string;
  replay: boolean;
  status: RuntimeCallbackReceiptStatus;
};

@Injectable()
export class RuntimeCallbackReceiptService {
  constructor(private readonly prisma: PrismaService) {}

  async claim(input: {
    tenantId: string;
    executionRequestId: string;
    resultStatus: ExecutionStatus;
    rawBody: string;
    signatureKeyId: string;
    signatureTimestamp: string;
    signature: string;
  }): Promise<RuntimeCallbackReceiptClaim> {
    const bodyHash = this.sha256(input.rawBody);
    const signatureHash = this.sha256(input.signature);
    const callbackKey = this.sha256([
      input.tenantId,
      input.executionRequestId,
      input.resultStatus,
      bodyHash,
    ].join('\n'));

    try {
      const receipt = await this.prisma.runtimeCallbackReceipt.create({
        data: {
          tenantId: input.tenantId,
          executionRequestId: input.executionRequestId,
          callbackKey,
          signatureKeyId: input.signatureKeyId,
          signatureTimestamp: new Date(Number(input.signatureTimestamp) * 1000),
          signatureHash,
          bodyHash,
          resultStatus: input.resultStatus,
          metadata: {
            replayProtected: true,
          },
        },
      });
      return { receiptId: receipt.id, replay: false, status: receipt.status };
    } catch (error) {
      if (!this.isUniqueConstraint(error)) {
        throw error;
      }
      const receipt = await this.prisma.runtimeCallbackReceipt.update({
        where: { callbackKey },
        data: { replayCount: { increment: 1 } },
      });
      return { receiptId: receipt.id, replay: true, status: receipt.status };
    }
  }

  async markProcessed(receiptId: string) {
    await this.prisma.runtimeCallbackReceipt.update({
      where: { id: receiptId },
      data: {
        status: RuntimeCallbackReceiptStatus.PROCESSED,
        processedAt: new Date(),
        errorMessage: null,
      },
    });
  }

  async markFailed(receiptId: string, error: unknown) {
    await this.prisma.runtimeCallbackReceipt.update({
      where: { id: receiptId },
      data: {
        status: RuntimeCallbackReceiptStatus.FAILED,
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
  }

  private sha256(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private isUniqueConstraint(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
