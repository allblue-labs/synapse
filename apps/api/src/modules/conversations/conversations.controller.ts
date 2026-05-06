import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Permissions('conversations:read')
  @Get()
  list(@TenantId() tenantId: string) {
    return this.conversationsService.list(tenantId);
  }

  @Permissions('conversations:respond')
  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateConversationDto) {
    return this.conversationsService.create(tenantId, dto);
  }

  @Permissions('conversations:read')
  @Get(':id')
  get(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.get(tenantId, id);
  }

  @Permissions('conversations:respond')
  @Patch(':id')
  update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateConversationDto) {
    return this.conversationsService.update(tenantId, id, dto);
  }
}
