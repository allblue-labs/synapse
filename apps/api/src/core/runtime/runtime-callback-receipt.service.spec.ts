import { Prisma, RuntimeCallbackReceiptStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RuntimeCallbackReceiptService } from './runtime-callback-receipt.service';

describe('RuntimeCallbackReceiptService', () => {
  const prisma = {
    runtimeCallbackReceipt: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('claims a first callback without storing raw body or raw signature', async () => {
    prisma.runtimeCallbackReceipt.create.mockResolvedValue({
      id: 'receipt-1',
      status: RuntimeCallbackReceiptStatus.RECEIVED,
    });
    const service = new RuntimeCallbackReceiptService(prisma as unknown as PrismaService);

    await expect(service.claim({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      resultStatus: 'SUCCEEDED',
      rawBody: '{"tenantId":"tenant-1"}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=secret-signature',
    })).resolves.toEqual({
      receiptId: 'receipt-1',
      replay: false,
      status: RuntimeCallbackReceiptStatus.RECEIVED,
    });

    expect(prisma.runtimeCallbackReceipt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        executionRequestId: 'exec-1',
        resultStatus: 'SUCCEEDED',
        signatureKeyId: 'platform',
        signatureTimestamp: new Date(1778241600 * 1000),
        callbackKey: expect.any(String),
        bodyHash: expect.any(String),
        signatureHash: expect.any(String),
      }),
    });
    const data = prisma.runtimeCallbackReceipt.create.mock.calls[0][0].data;
    expect(data.bodyHash).not.toContain('tenant-1');
    expect(data.signatureHash).not.toContain('secret-signature');
  });

  it('treats duplicate callback keys as replay and increments replay count', async () => {
    prisma.runtimeCallbackReceipt.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
      }),
    );
    prisma.runtimeCallbackReceipt.update.mockResolvedValue({
      id: 'receipt-1',
      status: RuntimeCallbackReceiptStatus.PROCESSED,
    });
    const service = new RuntimeCallbackReceiptService(prisma as unknown as PrismaService);

    await expect(service.claim({
      tenantId: 'tenant-1',
      executionRequestId: 'exec-1',
      resultStatus: 'SUCCEEDED',
      rawBody: '{"tenantId":"tenant-1"}',
      signatureKeyId: 'platform',
      signatureTimestamp: '1778241600',
      signature: 'sha256=secret-signature',
    })).resolves.toEqual({
      receiptId: 'receipt-1',
      replay: true,
      status: RuntimeCallbackReceiptStatus.PROCESSED,
    });

    expect(prisma.runtimeCallbackReceipt.update).toHaveBeenCalledWith({
      where: { callbackKey: expect.any(String) },
      data: { replayCount: { increment: 1 } },
    });
  });

  it('marks receipts as processed or failed', async () => {
    const service = new RuntimeCallbackReceiptService(prisma as unknown as PrismaService);

    await service.markProcessed('receipt-1');
    await service.markFailed('receipt-2', new Error('handler failed'));

    expect(prisma.runtimeCallbackReceipt.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'receipt-1' },
      data: {
        status: RuntimeCallbackReceiptStatus.PROCESSED,
        processedAt: expect.any(Date),
        errorMessage: null,
      },
    });
    expect(prisma.runtimeCallbackReceipt.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'receipt-2' },
      data: {
        status: RuntimeCallbackReceiptStatus.FAILED,
        failedAt: expect.any(Date),
        errorMessage: 'handler failed',
      },
    });
  });
});
