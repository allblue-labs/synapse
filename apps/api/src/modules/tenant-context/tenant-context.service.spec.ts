import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  TenantContextProfileStatus,
  TenantContextQuestionMode,
  TenantContextSummaryStatus,
} from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { PERMISSIONS_KEY } from '../../common/authorization/permissions.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TenantContextController } from './tenant-context.controller';
import { TenantContextService } from './tenant-context.service';
import { LocalTenantProfileInterviewExecutor } from './tenant-profile-interview.executor';

const completeAnswers = {
  businessName: 'AllBlue Labs',
  businessType: 'AI SaaS',
  businessDescription: 'Builds operational AI software.',
  productsServices: ['Synapse', 'Pulse'],
  targetAudience: 'Operations teams',
  communicationTone: 'Direct and helpful',
  preferredLanguages: ['pt-BR', 'en'],
  customerSupportStyle: 'Structured triage',
  salesBehavior: 'Consultative qualification',
  generalGoals: ['Reduce response time', 'Improve operations'],
  website: 'https://allblue-labs.com',
  socialMedia: ['https://linkedin.com/company/allblue-labs'],
  notes: 'Prefer concise communication.',
};

function makeRecord(prefix: string, data: Record<string, unknown>) {
  const now = new Date();
  return {
    id: `${prefix}_${Math.random().toString(16).slice(2)}`,
    createdAt: now,
    updatedAt: now,
    ...data,
  };
}

function createPrismaFixture() {
  const state = {
    tenants: [{ id: 'tenant-1' }, { id: 'tenant-2' }],
    profiles: [] as any[],
    drafts: [] as any[],
    answers: [] as any[],
    summaries: [] as any[],
    versions: [] as any[],
  };

  const findProfile = (where: any) =>
    state.profiles.find((profile) =>
      where.id ? profile.id === where.id : profile.tenantId === where.tenantId,
    ) ?? null;

  const includeProfile = (profile: any, include?: any) => {
    if (!profile) return null;
    return {
      ...profile,
      ...(include?.drafts ? { drafts: state.drafts.filter((draft) => draft.profileId === profile.id) } : {}),
      ...(include?.summaries
        ? {
            summaries: state.summaries
              .filter((summary) => summary.profileId === profile.id)
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, include.summaries.take ?? undefined),
          }
        : {}),
    };
  };

  const prisma = {
    tenant: {
      findUnique: jest.fn(({ where }) => state.tenants.find((tenant) => tenant.id === where.id) ?? null),
    },
    tenantContextProfile: {
      findUnique: jest.fn(({ where, include }) => includeProfile(findProfile(where), include)),
      upsert: jest.fn(({ where, create, update }) => {
        const existing = findProfile(where);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = makeRecord('profile', create);
        state.profiles.push(created);
        return created;
      }),
      update: jest.fn(({ where, data }) => {
        const profile = findProfile(where);
        Object.assign(profile, data, { updatedAt: new Date() });
        return profile;
      }),
    },
    tenantContextDraft: {
      upsert: jest.fn(({ where, create, update }) => {
        const existing = state.drafts.find((draft) => draft.profileId === where.profileId);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = makeRecord('draft', create);
        state.drafts.push(created);
        return created;
      }),
      create: jest.fn(({ data }) => {
        const created = makeRecord('draft', data);
        state.drafts.push(created);
        return created;
      }),
      update: jest.fn(({ where, data }) => {
        const draft = state.drafts.find((item) => item.profileId === where.profileId);
        Object.assign(draft, data, { updatedAt: new Date() });
        return draft;
      }),
    },
    tenantContextAnswer: {
      upsert: jest.fn(({ where, create, update }) => {
        const existing = state.answers.find(
          (answer) =>
            answer.profileId === where.profileId_questionKey.profileId &&
            answer.questionKey === where.profileId_questionKey.questionKey,
        );
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          return existing;
        }
        const created = makeRecord('answer', create);
        state.answers.push(created);
        return created;
      }),
    },
    tenantContextSummary: {
      create: jest.fn(({ data }) => {
        const created = makeRecord('summary', {
          status: TenantContextSummaryStatus.GENERATED,
          generatedBy: 'internal',
          ...data,
        });
        state.summaries.push(created);
        return created;
      }),
      findFirst: jest.fn(({ where }) =>
        state.summaries
          .filter((summary) =>
            summary.tenantId === where.tenantId &&
            summary.profileId === where.profileId &&
            summary.status === where.status,
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      ),
      update: jest.fn(({ where, data }) => {
        const summary = state.summaries.find((item) => item.id === where.id);
        Object.assign(summary, data, { updatedAt: new Date() });
        return summary;
      }),
      updateMany: jest.fn(({ where, data }) => {
        const matches = state.summaries.filter(
          (summary) => summary.profileId === where.profileId && summary.status === where.status,
        );
        matches.forEach((summary) => Object.assign(summary, data, { updatedAt: new Date() }));
        return { count: matches.length };
      }),
    },
    tenantContextProfileVersion: {
      create: jest.fn(({ data }) => {
        const created = makeRecord('version', data);
        state.versions.push(created);
        return created;
      }),
      findFirst: jest.fn(({ where }) =>
        state.versions
          .filter((version) => version.profileId === where.profileId)
          .sort((a, b) => b.versionNumber - a.versionNumber)[0] ?? null,
      ),
      findUnique: jest.fn(({ where }) =>
        state.versions.find(
          (version) =>
            version.profileId === where.profileId_versionNumber.profileId &&
            version.versionNumber === where.profileId_versionNumber.versionNumber,
        ) ?? null,
      ),
    },
  };

  return { prisma, state };
}

function createService() {
  const { prisma, state } = createPrismaFixture();
  const audit = { record: jest.fn() };
  const service = new TenantContextService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditService,
    new LocalTenantProfileInterviewExecutor(),
  );
  return { service, prisma, audit, state };
}

describe('TenantContextService', () => {
  it('starts the tenant profile interview and persists a draft', async () => {
    const { service, audit, state } = createService();

    const result = await service.start('tenant-1', 'user-1');

    expect(result.profile.status).toBe(TenantContextProfileStatus.IN_PROGRESS);
    expect(result.nextQuestion?.key).toBe('businessName');
    expect(state.drafts).toHaveLength(1);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'tenant_profile_started',
      tenantId: 'tenant-1',
    }));
  });

  it('saves answers incrementally so lost sessions can resume from draft state', async () => {
    const { service, state } = createService();
    await service.start('tenant-1', 'user-1');

    const result = await service.saveAnswer({
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      questionKey: 'productsServices',
      answer: 'Synapse, Pulse',
    });

    expect(result.draft.answers).toMatchObject({ productsServices: ['Synapse', 'Pulse'] });
    expect(result.nextQuestion.key).toBe('businessName');
    expect(state.answers[0].normalized).toEqual(['Synapse', 'Pulse']);
  });

  it('rejects summary generation while required profile fields are missing', async () => {
    const { service } = createService();
    await service.start('tenant-1', 'user-1');
    await service.saveAnswer({
      tenantId: 'tenant-1',
      actorUserId: 'user-1',
      questionKey: 'businessName',
      answer: 'AllBlue Labs',
    });

    await expect(service.generateSummary('tenant-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('submits manual form answers and waits for explicit validation before creating a version', async () => {
    const { service, state } = createService();

    const result = await service.submitManualForm('tenant-1', 'user-1', completeAnswers);

    expect(result.tenantProfileSummary.completeness.readyForApproval).toBe(true);
    expect(state.profiles[0].status).toBe(TenantContextProfileStatus.AWAITING_VALIDATION);
    expect(state.versions).toHaveLength(0);
  });

  it('approves the generated summary and persists the versioned tenant context contract', async () => {
    const { service, audit, state } = createService();
    await service.submitManualForm('tenant-1', 'user-1', completeAnswers);

    const result = await service.approve('tenant-1', 'user-1');

    expect(result.profileVersion).toBe(1);
    expect(result.contract).toMatchObject({
      tenantId: 'tenant-1',
      profileVersion: 1,
      business: { businessName: 'AllBlue Labs' },
    });
    expect(state.profiles[0].status).toBe(TenantContextProfileStatus.APPROVED);
    expect(await service.getTenantContext('tenant-1')).toMatchObject({ profileVersion: 1 });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'tenant_profile_approved',
      tenantId: 'tenant-1',
    }));
  });

  it('blocks module bypass attempts until the tenant profile is approved', async () => {
    const { service, audit } = createService();

    await expect(service.getTenantContext('tenant-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'tenant_profile_bypass_blocked',
      tenantId: 'tenant-1',
    }));
  });

  it('supports optional edits as a new draft and next approved profile version', async () => {
    const { service, audit } = createService();
    await service.submitManualForm('tenant-1', 'user-1', completeAnswers);
    await service.approve('tenant-1', 'user-1');

    await service.editAnswers('tenant-1', 'user-1', {
      ...completeAnswers,
      communicationTone: 'Calm and precise',
    });
    const result = await service.approve('tenant-1', 'user-1');

    expect(result.profileVersion).toBe(2);
    expect(result.contract.communication.communicationTone).toBe('Calm and precise');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'tenant_profile_updated',
      tenantId: 'tenant-1',
    }));
  });

  it('keeps approved contracts isolated by tenant id', async () => {
    const { service } = createService();
    await service.submitManualForm('tenant-1', 'user-1', completeAnswers);
    await service.approve('tenant-1', 'user-1');
    await service.submitManualForm('tenant-2', 'user-2', {
      ...completeAnswers,
      businessName: 'Second Tenant',
    });
    await service.approve('tenant-2', 'user-2');

    await expect(service.getTenantContext('tenant-1')).resolves.toMatchObject({
      tenantId: 'tenant-1',
      business: { businessName: 'AllBlue Labs' },
    });
    await expect(service.getTenantContext('tenant-2')).resolves.toMatchObject({
      tenantId: 'tenant-2',
      business: { businessName: 'Second Tenant' },
    });
  });
});

describe('TenantContextController RBAC metadata', () => {
  it('requires tenant read/update permissions on tenant context routes', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantContextController.prototype.status)).toEqual(['tenant:read']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantContextController.prototype.getContext)).toEqual(['tenant:read']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantContextController.prototype.start)).toEqual(['tenant:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantContextController.prototype.saveAnswer)).toEqual(['tenant:update']);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, TenantContextController.prototype.approve)).toEqual(['tenant:update']);
  });
});
