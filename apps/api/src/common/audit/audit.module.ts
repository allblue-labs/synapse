import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * Global audit module — every other module can `inject(AuditService)` to
 * append a security-relevant event. Append-only by design; the service
 * never exposes update/delete methods.
 */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
