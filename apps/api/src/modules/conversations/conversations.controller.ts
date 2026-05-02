import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.conversationsService.list(tenantId);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(tenantId, dto);
  }

  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.get(tenantId, id);
  }

  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.conversationsService.update(tenantId, id, dto);
  }
}
