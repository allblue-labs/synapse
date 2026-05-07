import { Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { ModuleRegistryService } from './module-registry.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

@Controller('modules')
export class ModuleRegistryController {
  constructor(private readonly registry: ModuleRegistryService) {}

  @Permissions('modules:read')
  @Get()
  list(@TenantId() tenantId: string) {
    return this.registry.list(tenantId);
  }

  @Permissions('modules:enable')
  @Post(':name/enable')
  enable(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('name') name: string,
  ) {
    return this.registry.enable(tenantId, name, user.sub);
  }

  @Permissions('modules:disable')
  @Post(':name/disable')
  disable(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('name') name: string,
  ) {
    return this.registry.disable(tenantId, name, user.sub);
  }
}
