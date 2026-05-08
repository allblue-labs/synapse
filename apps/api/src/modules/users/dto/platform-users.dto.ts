import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PlatformRole, UserRole } from '@prisma/client';

export class PlatformScopesDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  policies?: string[];
}

class CreateUserBaseDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

export class CreatePlatformAdminDto extends CreateUserBaseDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformScopesDto)
  scopes?: PlatformScopesDto;
}

export class CreatePlatformTesterDto extends CreateUserBaseDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformScopesDto)
  scopes?: PlatformScopesDto;
}

export class CreateCustomerUserDto extends CreateUserBaseDto {
  @IsString()
  @Matches(/^c[a-z0-9]{8,}$/)
  tenantId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdatePlatformAccessDto {
  @IsOptional()
  @IsEnum(PlatformRole)
  platformRole?: PlatformRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlatformScopesDto)
  scopes?: PlatformScopesDto;
}
