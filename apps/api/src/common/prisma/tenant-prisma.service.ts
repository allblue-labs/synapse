import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type TenantScope = {
  tenantId: string;
};

@Injectable()
export class TenantPrismaService {
  constructor(private readonly prisma: PrismaService) {}

  agents(scope: TenantScope) {
    return {
      findMany: (args?: Omit<Prisma.AgentFindManyArgs, 'where'> & { where?: Prisma.AgentWhereInput }) =>
        this.prisma.agent.findMany({
          ...args,
          where: { ...args?.where, tenantId: scope.tenantId }
        }),
      findFirstOrThrow: (args: Omit<Prisma.AgentFindFirstOrThrowArgs, 'where'> & { where?: Prisma.AgentWhereInput }) =>
        this.prisma.agent.findFirstOrThrow({
          ...args,
          where: { ...args.where, tenantId: scope.tenantId }
        }),
      create: (args: Omit<Prisma.AgentCreateArgs, 'data'> & { data: Omit<Prisma.AgentUncheckedCreateInput, 'tenantId'> }) =>
        this.prisma.agent.create({
          ...args,
          data: { ...args.data, tenantId: scope.tenantId }
        }),
      update: (id: string, data: Prisma.AgentUncheckedUpdateInput) =>
        this.prisma.agent.updateMany({
          where: { id, tenantId: scope.tenantId },
          data
        })
    };
  }

  conversations(scope: TenantScope) {
    return {
      findMany: (args?: Omit<Prisma.ConversationFindManyArgs, 'where'> & { where?: Prisma.ConversationWhereInput }) =>
        this.prisma.conversation.findMany({
          ...args,
          where: { ...args?.where, tenantId: scope.tenantId }
        }),
      findFirst: (args: Omit<Prisma.ConversationFindFirstArgs, 'where'> & { where?: Prisma.ConversationWhereInput }) =>
        this.prisma.conversation.findFirst({
          ...args,
          where: { ...args.where, tenantId: scope.tenantId }
        }),
      create: (
        args: Omit<Prisma.ConversationCreateArgs, 'data'> & {
          data: Omit<Prisma.ConversationUncheckedCreateInput, 'tenantId'>;
        }
      ) =>
        this.prisma.conversation.create({
          ...args,
          data: { ...args.data, tenantId: scope.tenantId }
        }),
      update: (id: string, data: Prisma.ConversationUncheckedUpdateInput) =>
        this.prisma.conversation.updateMany({
          where: { id, tenantId: scope.tenantId },
          data
        })
    };
  }
}
