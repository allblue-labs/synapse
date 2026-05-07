import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageMeteringService } from './usage-metering.service';

@Module({
  controllers: [UsageController],
  providers: [UsageMeteringService],
  exports: [UsageMeteringService],
})
export class UsageModule {}
