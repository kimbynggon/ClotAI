import { Controller, Post, Get, Body, UseGuards, HttpCode, Req, Res } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiResponse, ApiBody,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { CurrentUser } from './decorators/user.decorator';

interface SocialProfile {
  provider: 'google' | 'kakao';
  providerId: string;
  email?: string;
  name: string;
}

const UserSchema = {
  type: 'object',
  properties: {
    id:          { type: 'number', example: 1 },
    user_id:     { type: 'string', example: 'testuser' },
    email:       { type: 'string', example: 'test@clotai.com' },
    name:        { type: 'string', example: '테스트 유저' },
    is_verified: { type: 'boolean', example: true },
    provider:    { type: 'string', example: 'local' },
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
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  @ApiOperation({ summary: '회원가입' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, ...successResponse(AuthDataSchema, '회원가입 성공') })
  @ApiResponse({ status: 409, description: '아이디 또는 이메일 중복' })
  async signup(@Body() dto: SignupDto) {
    const result = await this.authService.signup(dto);
    return { success: true, message: '회원가입이 완료되었습니다.', data: result };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: '로그인' })
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
  @ApiOperation({ summary: '로그아웃' })
  logout() {
    return { success: true, message: '로그아웃 완료', data: {} };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '내 정보 조회' })
  @ApiResponse({ status: 200, ...successResponse(UserSchema, '사용자 정보 반환') })
  me(@CurrentUser() user: User) {
    return { success: true, message: '', data: this.authService.toSafe(user) };
  }

  // ── Google OAuth ──────────────────────────────────────────────────
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth 시작',
    description: '브라우저에서 직접 접근. Google 로그인 페이지로 302 리다이렉트됩니다. API 클라이언트가 아닌 브라우저에서만 사용하세요.',
  })
  @ApiResponse({ status: 302, description: 'Google 로그인 페이지로 리다이렉트' })
  googleLogin() { /* Passport가 리다이렉트 처리 */ }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth 콜백',
    description: 'Google 인증 완료 후 Google이 호출하는 콜백 URL. 인증 성공 시 프론트엔드로 JWT 토큰과 함께 리다이렉트됩니다. (직접 호출 불가)',
  })
  @ApiResponse({ status: 302, description: '프론트엔드 /auth/social-callback 으로 리다이렉트 (token, id, user_id, name, email, provider 쿼리 파라미터 포함)' })
  @ApiResponse({ status: 401, description: 'Google 인증 실패' })
  async googleCallback(@Req() req: { user: SocialProfile }, @Res() res: Response) {
    const result = await this.authService.socialLogin(req.user);
    this.redirectToFrontend(res, result);
  }

  // ── Kakao OAuth ───────────────────────────────────────────────────
  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: 'Kakao OAuth 시작',
    description: '브라우저에서 직접 접근. Kakao 로그인 페이지로 302 리다이렉트됩니다. API 클라이언트가 아닌 브라우저에서만 사용하세요.',
  })
  @ApiResponse({ status: 302, description: 'Kakao 로그인 페이지로 리다이렉트' })
  kakaoLogin() { /* Passport가 리다이렉트 처리 */ }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: 'Kakao OAuth 콜백',
    description: 'Kakao 인증 완료 후 Kakao가 호출하는 콜백 URL. 인증 성공 시 프론트엔드로 JWT 토큰과 함께 리다이렉트됩니다. (직접 호출 불가)',
  })
  @ApiResponse({ status: 302, description: '프론트엔드 /auth/social-callback 으로 리다이렉트 (token, id, user_id, name, email, provider 쿼리 파라미터 포함)' })
  @ApiResponse({ status: 401, description: 'Kakao 인증 실패' })
  async kakaoCallback(@Req() req: { user: SocialProfile }, @Res() res: Response) {
    const result = await this.authService.socialLogin(req.user);
    this.redirectToFrontend(res, result);
  }

  private redirectToFrontend(
    res: Response,
    result: { user: ReturnType<AuthService['toSafe']>; token: string },
  ) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3001');
    const params = new URLSearchParams({
      token: result.token,
      id: String(result.user.id),
      user_id: result.user.user_id,
      name: result.user.name,
      email: result.user.email,
      provider: result.user.provider,
    });
    res.redirect(`${frontendUrl}/auth/social-callback?${params.toString()}`);
  }
}
