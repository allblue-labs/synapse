import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {Permissions} from '../../../common/authorization';
import {TenantId} from '../../../common/decorators/tenant-id.decorator';
import {ListQueueDto} from './application/dtos/list-queue.dto';
import {CreateEntryDto} from './application/dtos/create-entry.dto';
import {ValidateEntryDto} from './application/dtos/validate-entry.dto';
import {ListQueueUseCase} from './application/use-cases/list-queue.use-case';
import {GetEntryUseCase} from './application/use-cases/get-entry.use-case';
import {CreateEntryUseCase} from './application/use-cases/create-entry.use-case';
import {ValidateEntryUseCase} from './application/use-cases/validate-entry.use-case';
import {RejectEntryUseCase} from './application/use-cases/reject-entry.use-case';
import {RetryEntryUseCase} from './application/use-cases/retry-entry.use-case';

@Controller('clinic-flow')
export class ClinicFlowController {
  constructor(
    private readonly listQueue: ListQueueUseCase,
    private readonly getEntry: GetEntryUseCase,
    private readonly createEntry: CreateEntryUseCase,
    private readonly validateEntry: ValidateEntryUseCase,
    private readonly rejectEntry: RejectEntryUseCase,
    private readonly retryEntry: RetryEntryUseCase,
  ) {}

  @Permissions('clinic-flow:read')
  @Get('queue')
  list(@TenantId() tenantId: string, @Query() query: ListQueueDto) {
    return this.listQueue.execute(tenantId, query);
  }

  @Permissions('clinic-flow:read')
  @Get('queue/:id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.getEntry.execute(tenantId, id);
  }

  @Permissions('clinic-flow:write')
  @Post('entries')
  create(@TenantId() tenantId: string, @Body() dto: CreateEntryDto) {
    return this.createEntry.execute({tenantId, ...dto});
  }

  @Permissions('clinic-flow:validate')
  @Post('queue/:id/validate')
  validate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ValidateEntryDto,
  ) {
    return this.validateEntry.execute(tenantId, id, {
      extractedData: dto.extractedData,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
  }

  @Permissions('clinic-flow:reject')
  @Post('queue/:id/reject')
  reject(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.rejectEntry.execute(tenantId, id, reason);
  }

  @Permissions('clinic-flow:retry')
  @Post('queue/:id/retry')
  retry(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.retryEntry.execute(tenantId, id);
  }

  @Permissions('clinic-flow:read')
  @Get('errors')
  errors(@TenantId() tenantId: string) {
    return this.listQueue.execute(tenantId, {status: 'FAILED' as const});
  }
}
