import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';

export class RegisterDto {
  @ValidateIf((dto: RegisterDto) => !!dto.tenantSlug)
  @IsString()
  @IsNotEmpty()
  tenantName?: string;

  @ValidateIf((dto: RegisterDto) => !!dto.tenantName)
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{3,48}$/)
  tenantSlug?: string;

  @IsOptional()
  @IsBoolean()
  createTenant?: boolean;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
