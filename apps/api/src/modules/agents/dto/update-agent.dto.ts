import { PartialType } from '@nestjs/mapped-types';
import { AgentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;
}
