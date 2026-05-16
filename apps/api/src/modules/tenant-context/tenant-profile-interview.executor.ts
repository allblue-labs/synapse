import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  TENANT_CONTEXT_REQUIRED_FIELDS,
  TENANT_CONTEXT_SCHEMA_VERSION,
  TenantContextContract,
  TenantProfileSummary,
} from './contracts/tenant-context.contract';

export type TenantProfileInterviewAnswerMap = Record<string, unknown>;

export interface TenantProfileInterviewExecutor {
  generateNextQuestion(answers: TenantProfileInterviewAnswerMap): Promise<{ key: string | null; question: string | null }>;
  normalizeAnswer(questionKey: string, answer: unknown): Promise<unknown>;
  generateSummary(input: { tenantId: string; answers: TenantProfileInterviewAnswerMap }): Promise<TenantProfileSummary>;
  validateProfile(summary: TenantProfileSummary): Promise<{ valid: boolean; missingFields: string[] }>;
}

const QUESTION_TEXT: Record<string, string> = {
  businessName: 'What is the business name?',
  businessType: 'What type of business is this?',
  businessDescription: 'Briefly describe what this business does.',
  productsServices: 'Which products or services does this business offer?',
  targetAudience: 'Who is the target audience?',
  communicationTone: 'What communication tone should the business use?',
  preferredLanguages: 'Which languages should the business prefer?',
  customerSupportStyle: 'How should customer support behave?',
  salesBehavior: 'How should sales conversations behave?',
  generalGoals: 'What are the general operational goals?',
};

@Injectable()
export class LocalTenantProfileInterviewExecutor implements TenantProfileInterviewExecutor {
  async generateNextQuestion(answers: TenantProfileInterviewAnswerMap) {
    const key = TENANT_CONTEXT_REQUIRED_FIELDS.find((field) => this.isMissing(answers[field])) ?? null;
    return { key, question: key ? QUESTION_TEXT[key] : null };
  }

  async normalizeAnswer(questionKey: string, answer: unknown) {
    if (!questionKey?.trim()) {
      throw new BadRequestException('questionKey is required.');
    }
    if (['productsServices', 'preferredLanguages', 'socialMedia', 'generalGoals'].includes(questionKey)) {
      return this.stringArray(answer);
    }
    if (typeof answer === 'string') {
      return answer.trim();
    }
    return answer;
  }

  async generateSummary(input: { tenantId: string; answers: TenantProfileInterviewAnswerMap }) {
    const answers = input.answers;
    const summary: TenantProfileSummary = {
      business: {
        businessName: this.stringValue(answers.businessName),
        businessType: this.stringValue(answers.businessType),
        businessDescription: this.stringValue(answers.businessDescription),
        productsServices: this.stringArray(answers.productsServices),
        targetAudience: this.stringValue(answers.targetAudience),
        website: this.optionalString(answers.website),
        socialMedia: this.stringArray(answers.socialMedia),
        notes: this.optionalString(answers.notes),
      },
      communication: {
        communicationTone: this.stringValue(answers.communicationTone),
        preferredLanguages: this.stringArray(answers.preferredLanguages),
      },
      operational: {
        customerSupportStyle: this.stringValue(answers.customerSupportStyle),
        salesBehavior: this.stringValue(answers.salesBehavior),
        generalGoals: this.stringArray(answers.generalGoals),
      },
      completeness: {
        requiredFields: [...TENANT_CONTEXT_REQUIRED_FIELDS],
        missingFields: [],
        readyForApproval: false,
      },
    };
    const validation = await this.validateProfile(summary);
    summary.completeness.missingFields = validation.missingFields;
    summary.completeness.readyForApproval = validation.valid;
    return summary;
  }

  async validateProfile(summary: TenantProfileSummary) {
    const contractDraft = this.toContractDraft('validation', 0, summary);
    const missingFields = TENANT_CONTEXT_REQUIRED_FIELDS.filter((field) => this.isMissing(this.valueForField(contractDraft, field)));
    return { valid: missingFields.length === 0, missingFields };
  }

  toContractDraft(tenantId: string, profileVersion: number, summary: TenantProfileSummary): TenantContextContract {
    return {
      tenantId,
      profileVersion,
      schemaVersion: TENANT_CONTEXT_SCHEMA_VERSION,
      business: summary.business,
      communication: summary.communication,
      operational: summary.operational,
      metadata: {
        source: 'tenant_context_profile',
      },
    };
  }

  private valueForField(contract: TenantContextContract, field: string) {
    if (field in contract.business) return contract.business[field as keyof typeof contract.business];
    if (field in contract.communication) return contract.communication[field as keyof typeof contract.communication];
    return contract.operational[field as keyof typeof contract.operational];
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
  }

  private optionalString(value: unknown) {
    const normalized = this.stringValue(value);
    return normalized || undefined;
  }

  private stringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  private isMissing(value: unknown) {
    return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
  }
}

export function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
