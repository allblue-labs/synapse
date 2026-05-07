import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  PulseChannelListDto,
  PulseConversationListDto,
  PulseEventListDto,
  PulseTicketListDto,
} from './pulse-list.dto';

describe('Pulse read filter DTOs', () => {
  async function validateDto<T extends object>(
    dto: new () => T,
    payload: Record<string, unknown>,
  ) {
    return validate(plainToInstance(dto, payload));
  }

  it('accepts valid channel filters and coerces pagination', async () => {
    const dto = plainToInstance(PulseChannelListDto, {
      page: '2',
      pageSize: '50',
      provider: 'WHATSAPP',
      status: 'ACTIVE',
    });

    const errors = await validate(dto);

    expect(errors).toEqual([]);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(50);
  });

  it('rejects unsupported channel filters', async () => {
    const errors = await validateDto(PulseChannelListDto, {
      provider: 'EMAIL',
      status: 'UNKNOWN',
      pageSize: '101',
    });

    expect(errors.map((error) => error.property).sort()).toEqual([
      'pageSize',
      'provider',
      'status',
    ].sort());
  });

  it('accepts operational conversation filters', async () => {
    const errors = await validateDto(PulseConversationListDto, {
      state: 'WAITING_OPERATOR',
      operationalStatus: 'NEEDS_REVIEW',
    });

    expect(errors).toEqual([]);
  });

  it('rejects unsupported conversation filters', async () => {
    const errors = await validateDto(PulseConversationListDto, {
      state: 'ARCHIVED',
      operationalStatus: 'PUBLIC',
    });

    expect(errors.map((error) => error.property).sort()).toEqual([
      'state',
      'operationalStatus',
    ].sort());
  });

  it('accepts operational ticket filters', async () => {
    const errors = await validateDto(PulseTicketListDto, {
      type: 'OPERATOR_REVIEW',
      status: 'PENDING_REVIEW',
    });

    expect(errors).toEqual([]);
  });

  it('rejects unsupported ticket filters', async () => {
    const errors = await validateDto(PulseTicketListDto, {
      type: 'PAYMENT',
      status: 'DELETED',
    });

    expect(errors.map((error) => error.property).sort()).toEqual(
      ['type', 'status'].sort(),
    );
  });

  it('accepts audit-safe event timeline filters', async () => {
    const errors = await validateDto(PulseEventListDto, {
      eventType: 'pulse.entry.validated',
      occurredFrom: '2026-05-07T10:00:00.000Z',
      occurredTo: '2026-05-07T11:00:00.000Z',
    });

    expect(errors).toEqual([]);
  });

  it('rejects invalid event date filters', async () => {
    const errors = await validateDto(PulseEventListDto, {
      occurredFrom: 'yesterday',
      occurredTo: 'soon',
    });

    expect(errors.map((error) => error.property).sort()).toEqual([
      'occurredFrom',
      'occurredTo',
    ].sort());
  });
});
