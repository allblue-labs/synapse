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
import { RuntimeResultDto } from './dtos/runtime-result.dto';
import { RuntimeResultIngressService } from './runtime-result-ingress.service';
import { RuntimeSignatureService } from './runtime-signature.service';

@Controller('runtime/results')
export class RuntimeResultController {
  constructor(
    private readonly signatures: RuntimeSignatureService,
    private readonly ingress: RuntimeResultIngressService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  ingest(
    @Req() req: Request & { rawBody?: Buffer; originalUrl?: string },
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() dto: RuntimeResultDto,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Runtime result raw body is required.');
    }

    this.signatures.assertValid({
      method: req.method,
      path: req.originalUrl ?? '/v1/runtime/results',
      body: req.rawBody.toString('utf8'),
      headers,
    });

    return this.ingress.ingest(dto);
  }
}
