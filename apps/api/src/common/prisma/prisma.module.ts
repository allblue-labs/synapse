import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantPrismaService } from './tenant-prisma.service';
import { JsonLoggerService } from '../logging/json-logger.service';

@Global()
@Module({
  providers: [PrismaService, TenantPrismaService, JsonLoggerService],
  exports: [PrismaService, TenantPrismaService, JsonLoggerService]
})
export class PrismaModule {}
