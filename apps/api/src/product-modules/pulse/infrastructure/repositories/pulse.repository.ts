import {Injectable, NotFoundException} from '@nestjs/common';
import {PulseStatus, Prisma} from '@prisma/client';
import {PrismaService} from '../../../../common/prisma/prisma.service';
import {PulseEntry} from '../../domain/entities/pulse-entry.entity';
import {
  IPulseRepository,
  ListEntriesFilter,
  PagedResult,
  UpdateEntryFields,
} from '../../domain/ports/pulse-repository.port';
import {PulseExtractedData, PulseLog} from '../../contracts/pulse.contracts';

@Injectable()
export class PulseRepository implements IPulseRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(record: Prisma.PulseEntryGetPayload<object>): PulseEntry {
    return new PulseEntry(
      record.id,
      record.tenantId,
      record.conversationId,
      record.status,
      record.originalMessage,
      record.transcription,
      record.mediaUrl,
      record.contactPhone,
      record.contactName,
      record.extractedData as PulseExtractedData | null,
      record.confidence,
      record.aiSummary,
      record.scheduledAt,
      record.errorMessage,
      record.retryCount,
      ((record.processingLogs ?? []) as unknown) as PulseLog[],
      record.createdAt,
      record.updatedAt,
    );
  }

  async findById(tenantId: string, id: string): Promise<PulseEntry | null> {
    const record = await this.prisma.pulseEntry.findFirst({
      where: {id, tenantId},
    });
    return record ? this.toDomain(record) : null;
  }

  async list(tenantId: string, filter: ListEntriesFilter): Promise<PagedResult<PulseEntry>> {
    const {status, page = 1, pageSize = 20} = filter;
    const where = {tenantId, ...(status ? {status} : {})};

    const [records, total] = await this.prisma.$transaction([
      this.prisma.pulseEntry.findMany({
        where,
        orderBy: {createdAt: 'desc'},
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pulseEntry.count({where}),
    ]);

    return {data: records.map((r) => this.toDomain(r)), total, page, pageSize};
  }

  async listFailed(tenantId: string): Promise<PulseEntry[]> {
    const records = await this.prisma.pulseEntry.findMany({
      where: {tenantId, status: PulseStatus.FAILED},
      orderBy: {updatedAt: 'desc'},
    });
    return records.map((r) => this.toDomain(r));
  }

  async save(entry: PulseEntry): Promise<PulseEntry> {
    return this.update(entry.tenantId, entry.id, {
      status: entry.status,
      transcription: entry.transcription ?? undefined,
      extractedData: entry.extractedData ?? undefined,
      confidence: entry.confidence ?? undefined,
      aiSummary: entry.aiSummary ?? undefined,
      scheduledAt: entry.scheduledAt ?? undefined,
      errorMessage: entry.errorMessage,
      retryCount: entry.retryCount,
      processingLogs: entry.processingLogs,
    });
  }

  async update(tenantId: string, id: string, fields: UpdateEntryFields): Promise<PulseEntry> {
    const result = await this.prisma.pulseEntry.updateMany({
      where: {id, tenantId},
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

    if (result.count === 0) {
      throw new NotFoundException(`Pulse entry ${id} not found`);
    }

    const record = await this.prisma.pulseEntry.findFirstOrThrow({
      where: {id, tenantId},
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
  }): Promise<PulseEntry> {
    const record = await this.prisma.pulseEntry.create({
      data: {
        tenantId: data.tenantId,
        contactPhone: data.contactPhone,
        contactName: data.contactName,
        originalMessage: data.originalMessage ?? '',
        mediaUrl: data.mediaUrl,
        conversationId: data.conversationId,
        status: PulseStatus.PROCESSING,
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
