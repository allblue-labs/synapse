import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';

export type PlatformScopeSet = {
  metrics: string[];
  modules: string[];
  policies: string[];
};

@Injectable()
export class PlatformScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async scopesFor(actor: AuthenticatedUser): Promise<PlatformScopeSet> {
    if (actor.role === 'super_admin' || actor.role === 'platform_admin') {
      return { metrics: ['*'], modules: ['*'], policies: ['*'] };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { platformScopes: true },
    });
    return this.parseScopes(user?.platformScopes);
  }

  assertAllowed(scope: PlatformScopeSet, kind: keyof PlatformScopeSet, requested?: string): void {
    const allowed = scope[kind];
    if (allowed.includes('*')) return;
    if (!requested) {
      if (allowed.length > 0) return;
      throw new ForbiddenException(`No platform ${kind} scope assigned.`);
    }
    if (!allowed.includes(requested)) {
      throw new ForbiddenException(`Platform ${kind} scope is not assigned: ${requested}`);
    }
  }

  filterRequested(scope: PlatformScopeSet, kind: keyof PlatformScopeSet, requested?: string): string[] | undefined {
    const allowed = scope[kind];
    if (allowed.includes('*')) return requested ? [requested] : undefined;
    if (requested) {
      this.assertAllowed(scope, kind, requested);
      return [requested];
    }
    if (allowed.length === 0) {
      throw new ForbiddenException(`No platform ${kind} scope assigned.`);
    }
    return allowed;
  }

  private parseScopes(value: Prisma.JsonValue | undefined): PlatformScopeSet {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { metrics: [], modules: [], policies: [] };
    }
    const object = value as Record<string, unknown>;
    return {
      metrics: this.parseList(object.metrics),
      modules: this.parseList(object.modules),
      policies: this.parseList(object.policies),
    };
  }

  private parseList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((item): item is string => typeof item === 'string'))].sort();
  }
}
