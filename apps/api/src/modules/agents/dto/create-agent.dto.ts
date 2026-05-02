import { AgentGoal } from '@prisma/client';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  name!: string;

  @IsEnum(AgentGoal)
  goal!: AgentGoal;

  @IsString()
  personality!: string;

  @IsString()
  instructions!: string;

  @IsArray()
  @IsString({ each: true })
  rules!: string[];

  @IsOptional()
  @IsString()
  modelProvider?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}
