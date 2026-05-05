import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ModuleRegistryService } from './module-registry.service';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('modules')
export class ModuleRegistryController {
  constructor(private readonly registry: ModuleRegistryService) {}

  @Get()
  list() {
    return this.registry.list();
  }

  @Post(':name/enable')
  enable(@TenantId() tenantId: string, @Param('name') name: string) {
    return this.registry.enable(tenantId, name);
  }

  @Post(':name/disable')
  disable(@TenantId() tenantId: string, @Param('name') name: string) {
    return this.registry.disable(tenantId, name);
  }
}
