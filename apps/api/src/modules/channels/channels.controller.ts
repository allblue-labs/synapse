import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { Permissions } from '../../common/authorization';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Permissions('channels:read')
  @Get()
  list(@TenantId() tenantId: string) {
    return this.channelsService.list(tenantId);
  }

  @Permissions('channels:connect')
  @Post('telegram')
  createTelegram(
    @TenantId() tenantId: string,
    @Body() body: { displayName: string; agentId?: string; externalId?: string },
  ) {
    return this.channelsService.create(tenantId, {
      type: ChannelType.TELEGRAM,
      displayName: body.displayName,
      agentId: body.agentId,
      externalId: body.externalId,
    });
  }

  // NOTE: This admin-triggered ingestion path requires `channels:connect` so
  // only operators-and-up can re-inject messages. External webhook delivery
  // should land on a dedicated controller with HMAC signature verification
  // rather than relying on the JWT layer.
  @Permissions('channels:connect')
  @Post(':id/receive')
  receive(
    @TenantId() tenantId: string,
    @Param('id') channelAccountId: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    return this.channelsService.receive(tenantId, channelAccountId, payload, headers);
  }
}
