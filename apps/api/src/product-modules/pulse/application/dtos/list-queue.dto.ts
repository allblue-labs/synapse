import {IsEnum, IsInt, IsOptional, Max, Min} from 'class-validator';
import {Type} from 'class-transformer';
import {PulseStatus} from '@prisma/client';

export class ListQueueDto {
  @IsOptional()
  @IsEnum(PulseStatus)
  status?: PulseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
