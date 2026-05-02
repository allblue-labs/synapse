import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  tenantName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]{3,48}$/)
  tenantSlug!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}
