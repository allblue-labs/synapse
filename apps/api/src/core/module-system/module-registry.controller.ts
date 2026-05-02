import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ModuleRegistryService } from './module-registry.service';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('modules')
export class ModuleRegistryController {
  constructor(private readonly registry: ModuleRegistryService) {}

  @Get()
  list() {
    return this.registry.list();
  }
}
