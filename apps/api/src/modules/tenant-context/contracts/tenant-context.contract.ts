export const TENANT_CONTEXT_SCHEMA_VERSION = 1;

export type TenantContextBusiness = {
  businessName: string;
  businessType: string;
  businessDescription: string;
  productsServices: string[];
  targetAudience: string;
  website?: string;
  socialMedia?: string[];
  notes?: string;
};

export type TenantContextCommunication = {
  communicationTone: string;
  preferredLanguages: string[];
};

export type TenantContextOperational = {
  customerSupportStyle: string;
  salesBehavior: string;
  generalGoals: string[];
};

export type TenantContextContract = {
  tenantId: string;
  profileVersion: number;
  schemaVersion: number;
  business: TenantContextBusiness;
  communication: TenantContextCommunication;
  operational: TenantContextOperational;
  metadata: {
    approvedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    source: 'tenant_context_profile';
  } & Record<string, unknown>;
};

export type TenantProfileSummary = {
  business: TenantContextBusiness;
  communication: TenantContextCommunication;
  operational: TenantContextOperational;
  completeness: {
    requiredFields: string[];
    missingFields: string[];
    readyForApproval: boolean;
  };
};

export const TENANT_CONTEXT_REQUIRED_FIELDS = [
  'businessName',
  'businessType',
  'businessDescription',
  'productsServices',
  'targetAudience',
  'communicationTone',
  'preferredLanguages',
  'customerSupportStyle',
  'salesBehavior',
  'generalGoals',
] as const;

export type TenantContextRequiredField = typeof TENANT_CONTEXT_REQUIRED_FIELDS[number];
