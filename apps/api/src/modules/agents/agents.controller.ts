import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Permissions('agents:read')
  @Get()
  list(@TenantId() tenantId: string) {
    return this.agentsService.list(tenantId);
  }

  @Permissions('agents:write')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateAgentDto) {
    return this.agentsService.create(tenantId, dto);
  }

  @Permissions('agents:read')
  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.agentsService.get(tenantId, id);
  }

  @Permissions('agents:write')
  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateAgentDto) {
    return this.agentsService.update(tenantId, id, dto);
  }
}
