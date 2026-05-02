import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return {
      status: 'ok',
      service: 'synapse-api',
      timestamp: new Date().toISOString()
    };
  }

  @Get('ready')
  async ready() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ready',
      dependencies: {
        database: 'ok'
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('metadata')
  metadata() {
    return {
      service: 'synapse-api',
      version: process.env.npm_package_version ?? '0.1.0',
      environment: process.env.NODE_ENV ?? 'development'
    };
  }
}
