import {TENANT_CONTEXT_REQUIRED_FIELDS, type TenantContextRequiredField} from '@/lib/api';

/**
 * Section model for the Tenant Context Profile onboarding.
 *
 * The backend's required fields are flat (`businessName`, `businessType`, …).
 * For UX, we group them into operator-facing sections with a stable order so
 * the progress timeline, manual form wizard and interview share one model.
 */

export type SectionId = 'business' | 'communication' | 'operational';

export interface SectionDefinition {
  id: SectionId;
  /** i18n key under `onboarding.sections.<id>`. */
  labelKey: 'business' | 'communication' | 'operational';
  fields: ReadonlyArray<TenantContextRequiredField>;
}

export const SECTIONS: ReadonlyArray<SectionDefinition> = [
  {
    id: 'business',
    labelKey: 'business',
    fields: ['businessName', 'businessType', 'businessDescription', 'productsServices', 'targetAudience'],
  },
  {
    id: 'communication',
    labelKey: 'communication',
    fields: ['communicationTone', 'preferredLanguages'],
  },
  {
    id: 'operational',
    labelKey: 'operational',
    fields: ['customerSupportStyle', 'salesBehavior', 'generalGoals'],
  },
];

/** Total required fields across all sections — matches backend contract. */
export const TOTAL_REQUIRED = TENANT_CONTEXT_REQUIRED_FIELDS.length;

export function sectionForField(field: TenantContextRequiredField): SectionId {
  for (const s of SECTIONS) {
    if ((s.fields as ReadonlyArray<string>).includes(field)) return s.id;
  }
  return 'business';
}

export function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string' && v.trim().length > 0).length === 0;
  return false;
}

export interface SectionProgress {
  id: SectionId;
  total: number;
  done: number;
  complete: boolean;
}

export function computeSectionProgress(answers: Record<string, unknown>): ReadonlyArray<SectionProgress> {
  return SECTIONS.map((s) => {
    const done = s.fields.filter((f) => !isMissing(answers[f])).length;
    return {
      id: s.id,
      total: s.fields.length,
      done,
      complete: done === s.fields.length,
    };
  });
}

export function completedFieldCount(answers: Record<string, unknown>): number {
  return TENANT_CONTEXT_REQUIRED_FIELDS.filter((f) => !isMissing(answers[f])).length;
}
