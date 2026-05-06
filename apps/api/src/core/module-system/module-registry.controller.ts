import { Controller, Get, Param, Post } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { ModuleRegistryService } from './module-registry.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@Controller('modules')
export class ModuleRegistryController {
  constructor(private readonly registry: ModuleRegistryService) {}

  @Permissions('modules:read')
  @Get()
  list() {
    return this.registry.list();
  }

  @Permissions('modules:enable')
  @Post(':name/enable')
  enable(@TenantId() tenantId: string, @Param('name') name: string) {
    return this.registry.enable(tenantId, name);
  }

  @Permissions('modules:disable')
  @Post(':name/disable')
  disable(@TenantId() tenantId: string, @Param('name') name: string) {
    return this.registry.disable(tenantId, name);
  }
}
