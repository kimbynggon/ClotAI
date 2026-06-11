import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Strategy } = require('passport-kakao');

interface KakaoProfile {
  id: number;
  username: string;
  displayName: string;
  _json: {
    kakao_account?: {
      email?: string;
      profile?: { nickname?: string };
    };
  };
}

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('KAKAO_DEFAULT_REST_API_KEY') ?? '',
      clientSecret: config.get<string>('KAKAO_CLIENT_SECRET') ?? '',
      callbackURL: config.get<string>('KAKAO_CALLBACK_URL') ?? 'http://localhost:3000/api/auth/kakao/callback',
      scope: ['profile_nickname'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: KakaoProfile,
    done: (err: unknown, user?: unknown) => void,
  ) {
    const kakaoAccount = profile._json?.kakao_account;
    const email = kakaoAccount?.email;
    const rawName =
      kakaoAccount?.profile?.nickname ??
      profile.displayName ??
      profile.username ??
      '카카오 사용자';
    // 카카오 프로필 미설정 계정의 기본값 대체
    const name = rawName === '미연동 계정' ? '카카오 사용자' : rawName;
    console.log(`[KAKAO] profile received | id=${profile.id} email=${email ?? 'none'} name=${name}`);
    done(null, { provider: 'kakao', providerId: String(profile.id), email, name });
  }
}
