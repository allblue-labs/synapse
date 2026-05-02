import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.agent.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' }
    });
  }

  create(tenantId: string, dto: CreateAgentDto) {
    return this.prisma.agent.create({
      data: {
        tenantId,
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
    const agent = await this.prisma.agent.findFirst({
      where: { id, tenantId },
      include: {
        channelAccounts: true,
        knowledgeItems: {
          orderBy: { updatedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!agent) {
      throw new NotFoundException('Agent not found.');
    }

    return agent;
  }

  async update(tenantId: string, id: string, dto: UpdateAgentDto) {
    await this.get(tenantId, id);

    return this.prisma.agent.update({
      where: { id },
      data: dto
    });
  }
}
