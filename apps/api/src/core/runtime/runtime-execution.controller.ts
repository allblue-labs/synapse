import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { permissionsForRole } from '@synapse/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Permissions } from '../../common/authorization';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  CancelRuntimeExecutionDto,
  RequestRuntimeExecutionDto,
  TransitionRuntimeExecutionDto,
} from './dtos/runtime-execution.dto';
import { RuntimeExecutionLifecycleService } from './runtime-execution-lifecycle.service';

@Controller('runtime/executions')
export class RuntimeExecutionController {
  constructor(private readonly lifecycle: RuntimeExecutionLifecycleService) {}

  @Permissions('runtime:executions:create')
  @Post()
  request(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestRuntimeExecutionDto,
  ) {
    return this.lifecycle.request({
      context: {
        tenantId,
        moduleSlug: dto.moduleSlug,
        actorUserId: user.sub,
        permissions: [...permissionsForRole(user.role)],
        metadata: {
          ...(dto.metadata ?? {}),
          actorSnapshot: {
            userId: user.sub,
            email: user.email,
            role: user.role,
            permissions: [...permissionsForRole(user.role)],
          },
        },
      },
      requestType: dto.requestType,
      idempotencyKey: dto.idempotencyKey,
      input: dto.input,
    });
  }

  @Permissions('runtime:executions:read')
  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.lifecycle.get(tenantId, id);
  }

  @Permissions('runtime:executions:transition')
  @Post(':id/transition')
  transition(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: TransitionRuntimeExecutionDto,
  ) {
    return this.lifecycle.transition({
      tenantId,
      executionId: id,
      status: dto.status,
      actorUserId: user.sub,
      output: dto.output,
      errorMessage: dto.errorMessage,
    });
  }

  @Permissions('runtime:executions:cancel')
  @Post(':id/cancel')
  cancel(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelRuntimeExecutionDto,
  ) {
    return this.lifecycle.cancel({
      tenantId,
      executionId: id,
      actorUserId: user.sub,
      reason: dto.reason,
    });
  }
}
