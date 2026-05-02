import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TenantId = createParamDecorator((_data: unknown, context: ExecutionContext): string => {
  const request = context.switchToHttp().getRequest<{ tenantId: string }>();
  return request.tenantId;
});
