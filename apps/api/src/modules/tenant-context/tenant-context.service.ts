import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TenantContextProfileStatus,
  TenantContextQuestionMode,
  TenantContextSummaryStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  TENANT_CONTEXT_SCHEMA_VERSION,
  TenantContextContract,
  TenantProfileSummary,
} from './contracts/tenant-context.contract';
import {
  asInputJson,
  LocalTenantProfileInterviewExecutor,
  TenantProfileInterviewAnswerMap,
  TenantProfileInterviewExecutor,
} from './tenant-profile-interview.executor';

const AuditTenantProfile = {
  STARTED: 'tenant_profile_started',
  ANSWER_SAVED: 'tenant_profile_answer_saved',
  SUMMARY_GENERATED: 'tenant_profile_summary_generated',
  APPROVED: 'tenant_profile_approved',
  UPDATED: 'tenant_profile_updated',
  REJECTED: 'tenant_profile_rejected',
  BYPASS_BLOCKED: 'tenant_profile_bypass_blocked',
} as const;

@Injectable()
export class TenantContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly executor: LocalTenantProfileInterviewExecutor,
  ) {}

  async getStatus(tenantId: string) {
    const profile = await this.prisma.tenantContextProfile.findUnique({
      where: { tenantId },
      include: {
        drafts: true,
        summaries: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!profile) {
      return { exists: false, status: 'missing', requiresProfile: true };
    }
    return {
      exists: true,
      status: profile.status,
      requiresProfile: profile.status !== TenantContextProfileStatus.APPROVED,
      activeVersionNumber: profile.activeVersionNumber,
      draft: profile.drafts[0] ?? null,
      latestSummary: profile.summaries[0] ?? null,
    };
  }

  async start(
    tenantId: string,
    actorUserId: string,
    mode: TenantContextQuestionMode = TenantContextQuestionMode.LLM,
  ) {
    await this.ensureTenantExists(tenantId);
    const profile = await this.prisma.tenantContextProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        status: TenantContextProfileStatus.IN_PROGRESS,
        schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
      },
      update: {},
    });
    if (profile.status === TenantContextProfileStatus.APPROVED) {
      return { profile, alreadyApproved: true };
    }
    const draft = await this.prisma.tenantContextDraft.upsert({
      where: { profileId: profile.id },
      create: {
        tenantId,
        profileId: profile.id,
        mode,
        schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
        answers: {},
      },
      update: {
        mode,
      },
    });
    const nextQuestion = await this.executor.generateNextQuestion(this.objectFromJson(draft.answers));
    await this.prisma.tenantContextProfile.update({
      where: { id: profile.id },
      data: { status: TenantContextProfileStatus.IN_PROGRESS },
    });
    await this.auditProfile(tenantId, actorUserId, AuditTenantProfile.STARTED, profile.id, { mode });
    return { profile: { ...profile, status: TenantContextProfileStatus.IN_PROGRESS }, draft, nextQuestion };
  }

  async saveAnswer(input: {
    tenantId: string;
    actorUserId: string;
    questionKey: string;
    answer: unknown;
    mode?: TenantContextQuestionMode;
  }) {
    const { profile, draft } = await this.requireEditableDraft(input.tenantId);
    const normalized = await this.executor.normalizeAnswer(input.questionKey, input.answer);
    const answers = {
      ...this.objectFromJson(draft.answers),
      [input.questionKey]: normalized,
    };
    await this.prisma.tenantContextAnswer.upsert({
      where: {
        profileId_questionKey: {
          profileId: profile.id,
          questionKey: input.questionKey,
        },
      },
      create: {
        tenantId: input.tenantId,
        profileId: profile.id,
        questionKey: input.questionKey,
        answer: asInputJson(input.answer),
        normalized: asInputJson(normalized),
        mode: input.mode ?? TenantContextQuestionMode.LLM,
        actorUserId: input.actorUserId,
      },
      update: {
        answer: asInputJson(input.answer),
        normalized: asInputJson(normalized),
        mode: input.mode ?? TenantContextQuestionMode.LLM,
        actorUserId: input.actorUserId,
      },
    });
    const nextQuestion = await this.executor.generateNextQuestion(answers);
    const updatedDraft = await this.prisma.tenantContextDraft.update({
      where: { profileId: profile.id },
      data: {
        answers: asInputJson(answers),
        currentQuestion: nextQuestion.key,
        progress: asInputJson({
          answered: Object.keys(answers),
          nextQuestionKey: nextQuestion.key,
        }),
      },
    });
    await this.auditProfile(input.tenantId, input.actorUserId, AuditTenantProfile.ANSWER_SAVED, profile.id, {
      questionKey: input.questionKey,
    });
    return { draft: updatedDraft, nextQuestion };
  }

  async submitManualForm(tenantId: string, actorUserId: string, answers: TenantProfileInterviewAnswerMap) {
    await this.start(tenantId, actorUserId, TenantContextQuestionMode.MANUAL_FORM);
    const { profile } = await this.requireEditableDraft(tenantId);
    for (const [questionKey, answer] of Object.entries(answers)) {
      await this.saveAnswer({
        tenantId,
        actorUserId,
        questionKey,
        answer,
        mode: TenantContextQuestionMode.MANUAL_FORM,
      });
    }
    return this.generateSummary(tenantId, actorUserId);
  }

  async generateSummary(tenantId: string, actorUserId: string) {
    const { profile, draft } = await this.requireEditableDraft(tenantId);
    const summary = await this.executor.generateSummary({
      tenantId,
      answers: this.objectFromJson(draft.answers),
    });
    const validation = await this.executor.validateProfile(summary);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Tenant profile is missing required information.',
        missingFields: validation.missingFields,
      });
    }
    const nextVersion = await this.nextVersionNumber(profile.id);
    const contractDraft = this.executor.toContractDraft(tenantId, nextVersion, summary);
    const saved = await this.prisma.tenantContextSummary.create({
      data: {
        tenantId,
        profileId: profile.id,
        schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
        summary: asInputJson(summary),
        contractDraft: asInputJson(contractDraft),
        actorUserId,
      },
    });
    await this.prisma.tenantContextProfile.update({
      where: { id: profile.id },
      data: { status: TenantContextProfileStatus.AWAITING_VALIDATION },
    });
    await this.auditProfile(tenantId, actorUserId, AuditTenantProfile.SUMMARY_GENERATED, profile.id, {
      summaryId: saved.id,
    });
    return { summary: saved, tenantProfileSummary: summary, contractDraft };
  }

  async approve(tenantId: string, actorUserId: string) {
    const profile = await this.prisma.tenantContextProfile.findUnique({ where: { tenantId } });
    if (!profile) throw new NotFoundException('Tenant context profile not found.');
    if (profile.status === TenantContextProfileStatus.APPROVED) {
      return {
        profileVersion: profile.activeVersionNumber,
        contract: await this.getTenantContext(tenantId),
      };
    }
    if (profile.status !== TenantContextProfileStatus.AWAITING_VALIDATION) {
      throw new ConflictException('Tenant context profile must be awaiting validation before approval.');
    }
    const summary = await this.prisma.tenantContextSummary.findFirst({
      where: { tenantId, profileId: profile.id, status: TenantContextSummaryStatus.GENERATED },
      orderBy: { createdAt: 'desc' },
    });
    if (!summary) throw new BadRequestException('Tenant context summary is required before approval.');
    const contractDraft = summary.contractDraft as unknown as TenantContextContract;
    const versionNumber = await this.nextVersionNumber(profile.id);
    const contract: TenantContextContract = {
      ...contractDraft,
      profileVersion: versionNumber,
      metadata: {
        ...contractDraft.metadata,
        approvedAt: new Date().toISOString(),
      },
    };
    const version = await this.prisma.tenantContextProfileVersion.create({
      data: {
        tenantId,
        profileId: profile.id,
        versionNumber,
        schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
        contract: asInputJson(contract),
        business: asInputJson(contract.business),
        communication: asInputJson(contract.communication),
        operational: asInputJson(contract.operational),
        metadata: asInputJson(contract.metadata),
        createdByUserId: actorUserId,
      },
    });
    await this.prisma.tenantContextSummary.update({
      where: { id: summary.id },
      data: { status: TenantContextSummaryStatus.APPROVED, versionId: version.id },
    });
    await this.prisma.tenantContextProfile.update({
      where: { id: profile.id },
      data: {
        status: TenantContextProfileStatus.APPROVED,
        activeVersionNumber: versionNumber,
        completedAt: new Date(),
        approvedAt: new Date(),
        approvedByUserId: actorUserId,
        rejectedAt: null,
        rejectedByUserId: null,
        rejectionReason: null,
      },
    });
    await this.auditProfile(tenantId, actorUserId, AuditTenantProfile.APPROVED, profile.id, {
      versionNumber,
      summaryId: summary.id,
    });
    return { profileVersion: versionNumber, contract };
  }

  async reject(tenantId: string, actorUserId: string, reason?: string) {
    const profile = await this.prisma.tenantContextProfile.findUnique({ where: { tenantId } });
    if (!profile) throw new NotFoundException('Tenant context profile not found.');
    await this.prisma.tenantContextProfile.update({
      where: { id: profile.id },
      data: {
        status: TenantContextProfileStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedByUserId: actorUserId,
        rejectionReason: reason,
      },
    });
    await this.prisma.tenantContextSummary.updateMany({
      where: { profileId: profile.id, status: TenantContextSummaryStatus.GENERATED },
      data: { status: TenantContextSummaryStatus.REJECTED },
    });
    await this.auditProfile(tenantId, actorUserId, AuditTenantProfile.REJECTED, profile.id, { reason });
    return { status: TenantContextProfileStatus.REJECTED };
  }

  async editAnswers(tenantId: string, actorUserId: string, answers: TenantProfileInterviewAnswerMap) {
    const profile = await this.prisma.tenantContextProfile.findUnique({ where: { tenantId } });
    let profileId = profile?.id;
    if (!profile) {
      const started = await this.start(tenantId, actorUserId, TenantContextQuestionMode.MANUAL_FORM);
      profileId = started.profile.id;
    } else if (profile.status === TenantContextProfileStatus.APPROVED) {
      await this.prisma.tenantContextProfile.update({
        where: { id: profile.id },
        data: { status: TenantContextProfileStatus.IN_PROGRESS },
      });
    }
    const result = await this.submitManualForm(tenantId, actorUserId, answers);
    if (profileId) {
      await this.auditProfile(tenantId, actorUserId, AuditTenantProfile.UPDATED, profileId, {
        summaryId: result.summary.id,
      });
    }
    return result;
  }

  async getTenantContext(tenantId: string): Promise<TenantContextContract> {
    const profile = await this.prisma.tenantContextProfile.findUnique({ where: { tenantId } });
    if (!profile || profile.status !== TenantContextProfileStatus.APPROVED || !profile.activeVersionNumber) {
      await this.audit.record({
        tenantId,
        action: AuditTenantProfile.BYPASS_BLOCKED,
        resourceType: 'TenantContextProfile',
        resourceId: profile?.id,
      });
      throw new ForbiddenException('Tenant context profile must be approved before module usage.');
    }
    const version = await this.prisma.tenantContextProfileVersion.findUnique({
      where: {
        profileId_versionNumber: {
          profileId: profile.id,
          versionNumber: profile.activeVersionNumber,
        },
      },
    });
    if (!version) throw new NotFoundException('Tenant context profile version not found.');
    return version.contract as unknown as TenantContextContract;
  }

  private async requireEditableDraft(tenantId: string) {
    const profile = await this.prisma.tenantContextProfile.findUnique({
      where: { tenantId },
      include: { drafts: true },
    });
    if (!profile) throw new NotFoundException('Tenant context profile not found. Start the profile flow first.');
    if (profile.status === TenantContextProfileStatus.APPROVED) {
      throw new ConflictException('Tenant context profile is already approved.');
    }
    const draft = profile.drafts[0] ?? (await this.prisma.tenantContextDraft.create({
      data: {
        tenantId,
        profileId: profile.id,
        schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
        answers: {},
      },
    }));
    return { profile, draft };
  }

  private async ensureTenantExists(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Tenant not found.');
  }

  private async nextVersionNumber(profileId: string) {
    const latest = await this.prisma.tenantContextProfileVersion.findFirst({
      where: { profileId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return (latest?.versionNumber ?? 0) + 1;
  }

  private objectFromJson(value: Prisma.JsonValue): TenantProfileInterviewAnswerMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as TenantProfileInterviewAnswerMap;
  }

  private auditProfile(
    tenantId: string,
    actorUserId: string,
    action: string,
    profileId: string,
    metadata: Prisma.InputJsonValue = {},
  ) {
    return this.audit.record({
      tenantId,
      actorUserId,
      action,
      resourceType: 'TenantContextProfile',
      resourceId: profileId,
      metadata,
    });
  }
}

export { AuditTenantProfile, TenantProfileInterviewExecutor };
