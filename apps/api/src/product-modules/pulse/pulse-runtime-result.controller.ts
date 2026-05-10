import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../../common/authorization';
import { RuntimeSignatureService } from '../../core/runtime/runtime-signature.service';
import { PulseRuntimeResultDto } from './application/dtos/pulse-runtime-result.dto';
import { IngestPulseRuntimeResultUseCase } from './application/use-cases/ingest-pulse-runtime-result.use-case';

@Controller('pulse/runtime/results')
export class PulseRuntimeResultController {
  constructor(
    private readonly signatures: RuntimeSignatureService,
    private readonly ingestRuntimeResult: IngestPulseRuntimeResultUseCase,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  ingest(
    @Req() req: Request & { rawBody?: Buffer; originalUrl?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() dto: PulseRuntimeResultDto,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Pulse runtime result raw body is required.');
    }

    this.signatures.assertValid({
      method: req.method,
      path: req.originalUrl ?? '/v1/pulse/runtime/results',
      body: req.rawBody.toString('utf8'),
      headers,
    });

    return this.ingestRuntimeResult.execute({
      tenantId: dto.tenantId,
      executionRequestId: dto.executionRequestId,
      status: dto.status,
      output: dto.output,
      errorMessage: dto.errorMessage,
      traceId: dto.traceId,
    });
  }
}
