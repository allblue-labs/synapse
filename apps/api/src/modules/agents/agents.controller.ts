import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@UseGuards(AuthGuard('jwt'), TenantGuard, RolesGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.agentsService.list(tenantId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(@TenantId() tenantId: string, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(tenantId, dto);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.agentsService.get(tenantId, id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(tenantId, id, dto);
  }
}
