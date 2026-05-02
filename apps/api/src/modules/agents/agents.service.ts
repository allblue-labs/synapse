import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../common/prisma/tenant-prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  list(tenantId: string) {
    return this.tenantPrisma.agents({ tenantId }).findMany({
      orderBy: { updatedAt: 'desc' }
    });
  }

  create(tenantId: string, dto: CreateAgentDto) {
    return this.tenantPrisma.agents({ tenantId }).create({
      data: {
        name: dto.name,
        goal: dto.goal,
        personality: dto.personality,
        instructions: dto.instructions,
        rules: dto.rules,
        modelProvider: dto.modelProvider ?? 'openai',
        modelName: dto.modelName ?? 'gpt-4.1-mini',
        temperature: dto.temperature ?? 0.3
      }
    });
  }

  async get(tenantId: string, id: string) {
    const agent = await this.tenantPrisma.agents({ tenantId }).findMany({
      where: { id },
      include: {
        channelAccounts: true,
        knowledgeItems: {
          orderBy: { updatedAt: 'desc' },
          take: 10
        }
      },
      take: 1
    });

    if (!agent[0]) {
      throw new NotFoundException('Agent not found.');
    }

    return agent[0];
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    await this.get(tenantId, id);

    const result = await this.tenantPrisma.agents({ tenantId }).update(id, dto);
    if (result.count !== 1) {
      throw new NotFoundException('Agent not found.');
    }

    return this.get(tenantId, id);
  }
}
