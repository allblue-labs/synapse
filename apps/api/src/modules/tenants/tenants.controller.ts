import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantsService } from './tenants.service';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  getCurrentTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getById(tenantId);
  }
}
