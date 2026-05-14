import { Body, Controller, Get, Post } from '@nestjs/common';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { AllowTenantless, Permissions } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { TenantsService } from './tenants.service';

class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]{3,48}$/)
  slug!: string;
}

@Controller('tenant')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Permissions('tenant:read')
  @Get()
  getCurrentTenant(@TenantId() tenantId: string) {
    return this.tenantsService.getById(tenantId);
  }

  @AllowTenantless()
  @Post()
  createTenant(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTenantDto,
  ) {
    return this.tenantsService.create({
      actorUserId: user.sub,
      name: dto.name,
      slug: dto.slug,
    });
  }
}
