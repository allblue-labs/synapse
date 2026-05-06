import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantsService } from './tenants.service';

@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Permissions('tenant:read')
  @Get()
  getCurrentTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getById(tenantId);
  }
}
