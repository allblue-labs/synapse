import {Injectable} from '@nestjs/common';
import {ClinicFlowStatus, Prisma} from '@prisma/client';
import {PrismaService} from '../../../../../common/prisma/prisma.service';
import {ClinicFlowEntry} from '../../domain/entities/clinic-flow-entry.entity';
import {
  IClinicFlowRepository,
  ListEntriesFilter,
  PagedResult,
  UpdateEntryFields,
} from '../../domain/ports/clinic-flow-repository.port';
import {ClinicFlowExtractedData, ClinicFlowLog} from '../../contracts/clinic-flow.contracts';

@Injectable()
export class ClinicFlowRepository implements IClinicFlowRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(record: Prisma.ClinicFlowEntryGetPayload<object>): ClinicFlowEntry {
    return new ClinicFlowEntry(
      record.id,
      record.tenantId,
      record.conversationId,
      record.status,
      record.originalMessage,
      record.transcription,
      record.mediaUrl,
      record.contactPhone,
      record.contactName,
      record.extractedData as ClinicFlowExtractedData | null,
      record.confidence,
      record.aiSummary,
      record.scheduledAt,
      record.errorMessage,
      record.retryCount,
      ((record.processingLogs ?? []) as unknown) as ClinicFlowLog[],
      record.createdAt,
      record.updatedAt,
    );
  }

  async findById(tenantId: string, id: string): Promise<ClinicFlowEntry | null> {
    const record = await this.prisma.clinicFlowEntry.findFirst({
      where: {id, tenantId},
    });
    return record ? this.toDomain(record) : null;
  }

  async list(tenantId: string, filter: ListEntriesFilter): Promise<PagedResult<ClinicFlowEntry>> {
    const {status, page = 1, pageSize = 20} = filter;
    const where = {tenantId, ...(status ? {status} : {})};

    const [records, total] = await this.prisma.$transaction([
      this.prisma.clinicFlowEntry.findMany({
        where,
        orderBy: {createdAt: 'desc'},
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.clinicFlowEntry.count({where}),
    ]);

    return {data: records.map((r) => this.toDomain(r)), total, page, pageSize};
  }

  async listFailed(tenantId: string): Promise<ClinicFlowEntry[]> {
    const records = await this.prisma.clinicFlowEntry.findMany({
      where: {tenantId, status: ClinicFlowStatus.FAILED},
      orderBy: {updatedAt: 'desc'},
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(entry: ClinicFlowEntry): Promise<ClinicFlowEntry> {
    const record = await this.prisma.clinicFlowEntry.update({
      where: {id: entry.id},
      data: {
        status: entry.status,
        transcription: entry.transcription,
        extractedData: (entry.extractedData as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        confidence: entry.confidence,
        aiSummary: entry.aiSummary,
        scheduledAt: entry.scheduledAt,
        errorMessage: entry.errorMessage,
        retryCount: entry.retryCount,
        processingLogs: (entry.processingLogs as unknown) as Prisma.InputJsonValue,
      },
    });
    return this.toDomain(record);
  }

  async update(tenantId: string, id: string, fields: UpdateEntryFields): Promise<ClinicFlowEntry> {
    const record = await this.prisma.clinicFlowEntry.update({
      where: {id},
      data: {
        ...(fields.status !== undefined && {status: fields.status}),
        ...(fields.transcription !== undefined && {transcription: fields.transcription}),
        ...(fields.extractedData !== undefined && {extractedData: fields.extractedData as Prisma.InputJsonValue}),
        ...(fields.confidence !== undefined && {confidence: fields.confidence}),
        ...(fields.aiSummary !== undefined && {aiSummary: fields.aiSummary}),
        ...(fields.scheduledAt !== undefined && {scheduledAt: fields.scheduledAt}),
        ...(fields.errorMessage !== undefined && {errorMessage: fields.errorMessage}),
        ...(fields.retryCount !== undefined && {retryCount: fields.retryCount}),
        ...(fields.processingLogs !== undefined && {processingLogs: fields.processingLogs as Prisma.InputJsonValue}),
      },
    });
    return this.toDomain(record);
  }

  async create(data: {
    tenantId: string;
    contactPhone: string;
    contactName?: string;
    originalMessage?: string;
    mediaUrl?: string;
    conversationId?: string;
  }): Promise<ClinicFlowEntry> {
    const record = await this.prisma.clinicFlowEntry.create({
      data: {
        tenantId: data.tenantId,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        originalMessage: data.originalMessage ?? '',
        mediaUrl: data.mediaUrl,
        conversationId: data.conversationId,
        status: ClinicFlowStatus.PROCESSING,
        processingLogs: [{
          at: new Date().toISOString(),
          stage: 'receive',
          message: 'Entry created and queued for processing',
        }],
      },
    });
    return this.toDomain(record);
  }
}
