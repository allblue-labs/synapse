import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChannelType } from '@prisma/client';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { ChannelsService } from './channels.service';

@UseGuards(AuthGuard('jwt'), TenantGuard)
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  list(@TenantId() tenantId: string) {
    return this.channelsService.list(tenantId);
  }

  @Post('telegram')
  createTelegram(@TenantId() tenantId: string, @Body() body: { displayName: string; agentId?: string; externalId?: string }) {
    return this.channelsService.create(tenantId, {
      type: ChannelType.TELEGRAM,
      displayName: body.displayName,
      agentId: body.agentId,
      externalId: body.externalId
    });
  }

  @Post(':id/receive')
  receive(
    @TenantId() tenantId: string,
    @Param('id') channelAccountId: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>
  ) {
    return this.channelsService.receive(tenantId, channelAccountId, payload, headers);
  }
}
