import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  provider: 'google' | 'kakao';

  @IsString()
  providerId: string;

  @IsString()
  name: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}
