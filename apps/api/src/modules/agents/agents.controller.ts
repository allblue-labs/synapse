import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.agentsService.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(tenantId, dto);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.agentsService.get(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(tenantId, id, dto);
  }
}
