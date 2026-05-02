import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  getEntitlements(tenantId: string) {
    return this.prisma.billingAccount.findUnique({
      where: { tenantId }
    });
  }
}
