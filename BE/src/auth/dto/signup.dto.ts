import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'testuser', description: '영문/숫자/언더스코어, 4-20자' })
  @IsString()
  @MinLength(4, { message: '아이디는 4자 이상이어야 합니다.' })
  @MaxLength(20, { message: '아이디는 20자 이하여야 합니다.' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '아이디는 영문, 숫자, 언더스코어만 사용 가능합니다.' })
  user_id: string;

  @ApiProperty({ example: 'test@clotai.com' })
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email: string;

  @ApiProperty({ example: 'test1234a', description: '8자 이상, 영문+숫자 포함' })
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '비밀번호는 영문과 숫자를 모두 포함해야 합니다.' })
  password: string;

  @ApiProperty({ example: '테스트 유저' })
  @IsString()
  @MinLength(2, { message: '이름은 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '이름은 20자 이하여야 합니다.' })
  name: string;
}
