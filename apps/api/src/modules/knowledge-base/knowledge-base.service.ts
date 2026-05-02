import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class KnowledgeBaseService {
  constructor(private readonly prisma: PrismaService) {}

  searchForAgent(tenantId: string, agentId: string, query: string) {
    const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 6);

    return this.prisma.knowledgeItem.findMany({
      where: {
        tenantId,
        OR: [
          { agentId },
          { agentId: null }
        ],
        ...(terms.length > 0
          ? {
              AND: terms.map((term) => ({
                OR: [
                  { title: { contains: term, mode: 'insensitive' as const } },
                  { content: { contains: term, mode: 'insensitive' as const } }
                ]
              }))
            }
          : {})
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });
  }
}
