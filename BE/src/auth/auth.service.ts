import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const byUserId = await this.prisma.user.findUnique({ where: { userId: dto.user_id } });
    if (byUserId?.isVerified) throw new ConflictException('이미 사용 중인 아이디입니다.');

    const byEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (byEmail?.isVerified) throw new ConflictException('이미 사용 중인 이메일입니다.');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = byEmail
      ? await this.prisma.user.update({
          where: { id: byEmail.id },
          data: { userId: dto.user_id, passwordHash, name: dto.name, isVerified: true },
        })
      : await this.prisma.user.create({
          data: {
            userId: dto.user_id,
            email: dto.email,
            passwordHash,
            name: dto.name,
            isVerified: true,
          },
        });

    return { user: this.toSafe(user), token: this.jwt.sign({ id: user.id }) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { userId: dto.user_id } });
    if (!user) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    if (!user.passwordHash) {
      const providerLabel = user.provider === 'google' ? 'Google' : user.provider === 'kakao' ? 'Kakao' : '소셜';
      throw new UnauthorizedException(`${providerLabel} 로그인 계정입니다. ${providerLabel}로 로그인해주세요.`);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');

    return { user: this.toSafe(user), token: this.jwt.sign({ id: user.id }) };
  }

  async socialLogin(dto: SocialLoginDto) {
    const { provider, providerId, email, name } = dto;

    // 기존 소셜 계정 조회
    const existing = await this.prisma.user.findFirst({
      where: { provider, providerId },
    });
    if (existing) {
      return { user: this.toSafe(existing), token: this.jwt.sign({ id: existing.id }) };
    }

    // 이메일로 기존 계정 연동
    const byEmail = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    if (byEmail) {
      const updated = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: { provider, providerId, isVerified: true },
      });
      return { user: this.toSafe(updated), token: this.jwt.sign({ id: updated.id }) };
    }

    // 신규 계정 생성
    const userId = `${provider}_${providerId.slice(0, 12)}`;
    const safeEmail = email ?? `${provider}_${providerId}@social.clotai.com`;

    const user = await this.prisma.user.create({
      data: { userId, email: safeEmail, name, provider, providerId, isVerified: true },
    });
    return { user: this.toSafe(user), token: this.jwt.sign({ id: user.id }) };
  }

  toSafe(user: User) {
    return {
      id: user.id,
      user_id: user.userId,
      email: user.email,
      name: user.name,
      is_verified: user.isVerified,
      provider: user.provider,
    };
  }
}
