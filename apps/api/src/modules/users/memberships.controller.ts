import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Permissions } from '../../common/authorization';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateMembershipDto, ListMembershipsQueryDto, UpdateMembershipRoleDto } from './dto/memberships.dto';
import { MembershipsService } from './memberships.service';

@Controller('tenant/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Permissions('users:read')
  @Get()
  list(
    @TenantId() tenantId: string,
    @Query() query: ListMembershipsQueryDto,
  ) {
    return this.memberships.list(tenantId, query);
  }

  @Permissions('users:invite')
  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateMembershipDto,
  ) {
    return this.memberships.create(tenantId, actor, dto);
  }

  @Permissions('users:role.assign')
  @Patch(':membershipId/role')
  updateRole(
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.memberships.updateRole(tenantId, membershipId, actor, dto);
  }

  @Permissions('users:remove')
  @Delete(':membershipId')
  remove(
    @TenantId() tenantId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
  ) {
    return this.memberships.remove(tenantId, membershipId, actor);
  }
}
