import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { Permissions } from '../../common/authorization';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  EditTenantContextAnswersDto,
  RejectTenantContextSummaryDto,
  SaveTenantContextAnswerDto,
  StartTenantContextProfileDto,
  SubmitTenantContextFormDto,
} from './dto/tenant-context.dto';
import { TenantContextService } from './tenant-context.service';

@Controller('tenant-context')
export class TenantContextController {
  constructor(private readonly tenantContext: TenantContextService) {}

  @Permissions('tenant:read')
  @Get('status')
  status(@TenantId() tenantId: string) {
    return this.tenantContext.getStatus(tenantId);
  }

  @Permissions('tenant:read')
  @Get()
  getContext(@TenantId() tenantId: string) {
    return this.tenantContext.getTenantContext(tenantId);
  }

  @Permissions('tenant:update')
  @Post('start')
  start(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartTenantContextProfileDto,
  ) {
    return this.tenantContext.start(tenantId, user.sub, dto.mode);
  }

  @Permissions('tenant:update')
  @Post('answers')
  saveAnswer(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveTenantContextAnswerDto,
  ) {
    return this.tenantContext.saveAnswer({
      tenantId,
      actorUserId: user.sub,
      questionKey: dto.questionKey,
      answer: dto.answer,
      mode: dto.mode,
    });
  }

  @Permissions('tenant:update')
  @Post('manual-submit')
  submitManualForm(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitTenantContextFormDto,
  ) {
    return this.tenantContext.submitManualForm(tenantId, user.sub, dto as unknown as Record<string, unknown>);
  }

  @Permissions('tenant:update')
  @Post('summary/generate')
  generateSummary(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantContext.generateSummary(tenantId, user.sub);
  }

  @Permissions('tenant:update')
  @Post('approve')
  approve(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tenantContext.approve(tenantId, user.sub);
  }

  @Permissions('tenant:update')
  @Post('reject')
  reject(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RejectTenantContextSummaryDto,
  ) {
    return this.tenantContext.reject(tenantId, user.sub, dto.reason);
  }

  @Permissions('tenant:update')
  @Patch()
  edit(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: EditTenantContextAnswersDto,
  ) {
    return this.tenantContext.editAnswers(tenantId, user.sub, dto.answers);
  }
}
