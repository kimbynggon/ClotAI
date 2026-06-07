import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'testuser' })
  @IsString()
  user_id: string;

  @ApiProperty({ example: 'test1234a' })
  @IsString()
  password: string;
}
