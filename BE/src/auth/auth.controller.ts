import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiResponse, ApiBody,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/user.decorator';

const UserSchema = {
  type: 'object',
  properties: {
    id:          { type: 'number', example: 1 },
    user_id:     { type: 'string', example: 'testuser' },
    email:       { type: 'string', example: 'test@clotai.com' },
    name:        { type: 'string', example: '테스트 유저' },
    is_verified: { type: 'boolean', example: true },
  },
} as const;

const AuthDataSchema = {
  type: 'object',
  properties: {
    user:  UserSchema,
    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
  },
} as const;

function successResponse(dataSchema: object, description: string) {
  return {
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data:    dataSchema,
      },
    },
  };
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입', description: '이메일·아이디 중복 확인 후 계정 생성. JWT 즉시 반환.' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, ...successResponse(AuthDataSchema, '회원가입 성공') })
  @ApiResponse({ status: 400, description: '입력값 유효성 오류' })
  @ApiResponse({ status: 409, description: '아이디 또는 이메일 중복' })
  async signup(@Body() dto: SignupDto) {
    const result = await this.authService.signup(dto);
    return { success: true, message: '회원가입이 완료되었습니다.', data: result };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인', description: '아이디·비밀번호로 로그인. JWT 반환.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, ...successResponse(AuthDataSchema, '로그인 성공') })
  @ApiResponse({ status: 401, description: '아이디 또는 비밀번호 불일치' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { success: true, message: '로그인 성공', data: result };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: '로그아웃', description: '클라이언트 토큰 무효화 안내 (서버 상태 변경 없음)' })
  @ApiResponse({ status: 200, description: '로그아웃 완료' })
  @ApiResponse({ status: 401, description: '인증 필요' })
  logout() {
    return { success: true, message: '로그아웃 완료', data: {} };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회', description: 'JWT 토큰으로 현재 로그인된 사용자 정보 반환' })
  @ApiResponse({ status: 200, ...successResponse(UserSchema, '사용자 정보 반환') })
  @ApiResponse({ status: 401, description: '인증 필요' })
  me(@CurrentUser() user: User) {
    return { success: true, message: '', data: this.authService.toSafe(user) };
  }
}
