import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from '../profile/profile.service';
import { WeatherResult, WeatherService } from '../weather/weather.service';
import { RecommendOutfitDto } from './dto/recommend-outfit.dto';

interface AiProfilePayload {
  gender: string | null;
  height: number | null;
  weight: number | null;
  body_type: string | null;
  style_tags: string[];
  color_tags: string[];
  budget_tier: string | null;
}

@Injectable()
export class OutfitService {
  private readonly logger = new Logger(OutfitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {}

  async checkAiReady(): Promise<boolean> {
    const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');
    this.logger.log(`[warmup] AI 서비스 health check 시작 url=${aiUrl}/health`);
    try {
      const res = await fetch(`${aiUrl}/health`, { signal: AbortSignal.timeout(65_000) });
      if (res.ok) {
        this.logger.log('[warmup] AI 서비스 응답 완료 — 슬립 해제');
        return true;
      }
      this.logger.warn(`[warmup] AI 서비스 비정상 응답 status=${res.status}`);
      return false;
    } catch (err: unknown) {
      this.logger.warn(`[warmup] AI 핑 실패 err=${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  async recommend(userId: number, dto: RecommendOutfitDto) {
    this.logger.log(`[recommend] 시작 userId=${userId}`);

    const profile = await this.profileService.findOne(userId);
    if (!profile) {
      this.logger.warn(`[recommend] 프로필 없음 userId=${userId}`);
      throw new BadRequestException('OOTD 추천을 받으려면 먼저 프로필을 등록해주세요.');
    }

    // 일일 조회 제한 (15회)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await this.prisma.outfit.count({
      where: { userId, createdAt: { gte: today } },
    });
    if (todayCount >= 15) {
      this.logger.warn(`[recommend] 일일 한도 초과 userId=${userId} count=${todayCount}`);
      throw new HttpException(
        '오늘의 추천 횟수(15회)를 초과했습니다. 내일 다시 이용해주세요.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.logger.log(`[recommend] 날씨 조회 시작 city=${dto.city ?? ''} lat=${dto.lat ?? ''}`);
    const weather = await this.resolveWeather(dto);
    this.logger.log(`[recommend] 날씨 조회 완료 temp=${weather.temperature} season=${weather.season}`);

    this.logger.log(`[recommend] AI 서비스 호출 시작`);
    let aiResult: Record<string, unknown>;
    let isFallback = false;
    try {
      aiResult = await this.callAiService(this.buildProfilePayload(profile), weather);
      this.logger.log(`[recommend] AI 서비스 응답 완료`);
    } catch {
      this.logger.warn(`[recommend] AI 서비스 실패 — 기본 추천 반환`);
      aiResult = this.buildFallbackRecommendation(weather);
      isFallback = true;
    }

    if (isFallback) {
      return this.formatOutfit({ id: 0, createdAt: new Date() }, aiResult, weather, true);
    }

    const outfit = await this.prisma.outfit.create({
      data: {
        userId,
        weatherData: weather as object,
        aiResult: aiResult as object,
      },
    });

    return this.formatOutfit(outfit, aiResult, weather, false);
  }

  async guestRecommend(dto: RecommendOutfitDto) {
    this.logger.log('[guestRecommend] 게스트 추천 시작');

    const weather = await this.resolveWeather(dto);

    const guestProfile: AiProfilePayload = {
      gender: null,
      height: null,
      weight: null,
      body_type: null,
      style_tags: ['캐주얼'],
      color_tags: ['화이트', '베이지'],
      budget_tier: null,
    };

    let aiResult: Record<string, unknown>;
    let isFallback = false;
    try {
      aiResult = await this.callAiService(guestProfile, weather);
      this.logger.log('[guestRecommend] AI 서비스 응답 완료');
    } catch {
      this.logger.warn('[guestRecommend] AI 서비스 실패 — 기본 추천 반환');
      aiResult = this.buildFallbackRecommendation(weather);
      isFallback = true;
    }

    return this.formatOutfit({ id: 0, createdAt: new Date() }, aiResult, weather, isFallback);
  }

  async getHistory(userId: number) {
    const outfits = await this.prisma.outfit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return outfits.map((o) => {
      const ai = o.aiResult as Record<string, unknown>;
      const wd = o.weatherData as Record<string, unknown>;
      return {
        id: o.id,
        style: ai['style'] ?? ai['styleKeyword'] ?? null,
        weatherDescription: wd['weatherDescription'] ?? null,
        temperature: wd['temperature'] ?? null,
        season: wd['season'] ?? null,
        createdAt: o.createdAt,
      };
    });
  }

  async getOne(userId: number, id: number) {
    const outfit = await this.prisma.outfit.findFirst({ where: { id, userId } });
    if (!outfit) throw new NotFoundException('추천 이력을 찾을 수 없습니다.');
    const ai = outfit.aiResult as Record<string, unknown>;
    const weather = outfit.weatherData as Record<string, unknown>;
    return this.formatOutfit(outfit, ai, weather);
  }

  private async resolveWeather(dto: RecommendOutfitDto): Promise<WeatherResult> {
    if (dto.city) {
      const geo = await this.weatherService.geocode(dto.city);
      return this.weatherService.getWeather(geo.lat, geo.lon, geo.name);
    }

    if (dto.lat !== undefined && dto.lon !== undefined) {
      return this.weatherService.getWeather(dto.lat, dto.lon);
    }

    throw new BadRequestException('city 또는 lat/lon 중 하나를 입력해주세요.');
  }

  private buildProfilePayload(profile: Profile): AiProfilePayload {
    return {
      gender: profile.gender,
      height: profile.height,
      weight: profile.weight,
      body_type: profile.bodyType,
      style_tags: (profile.styleTags as string[]) ?? [],
      color_tags: (profile.colorTags as string[]) ?? [],
      budget_tier: profile.budgetTier,
    };
  }

  private async callAiService(
    profilePayload: AiProfilePayload,
    weather: WeatherResult,
  ): Promise<Record<string, unknown>> {
    const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');

    const payload = {
      profile: profilePayload,
      weather: {
        temperature: weather.temperature,
        feels_like: weather.feelsLike,
        precipitation: weather.precipitation,
        humidity: weather.humidity,
        wind_speed: weather.windSpeed,
        weather_description: weather.weatherDescription,
        season: weather.season,
        is_raining: weather.isRaining,
        is_snowing: weather.isSnowing,
      },
    };

    let res: Response;
    try {
      res = await fetch(`${aiUrl}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(55_000),
      });
    } catch (err) {
      this.logger.error(`[recommend] AI 서비스 연결 실패 url=${aiUrl}/recommend`, err instanceof Error ? err.message : String(err));
      throw new InternalServerErrorException('AI 서비스에 연결할 수 없습니다.');
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const isHtmlResponse = detail.trimStart().startsWith('<!');
      if (res.status === 401) {
        this.logger.error(`[recommend] AI GOOGLE_API_KEY 인증 실패 — Render 환경변수 확인 필요 detail=${detail.slice(0, 200)}`);
      } else {
        this.logger.error(`[recommend] AI 서비스 오류 status=${res.status} detail=${detail.slice(0, 200)}`);
      }
      throw new InternalServerErrorException(
        isHtmlResponse ? 'AI 서비스 미가용' : `AI 추천 실패: ${detail}`,
      );
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  private formatOutfit(
    outfit: { id: number; createdAt: Date },
    ai: Record<string, unknown>,
    weather: Record<string, unknown> | WeatherResult,
    isFallback = false,
  ) {
    return {
      id: outfit.id,
      style: ai['style'] ?? ai['styleKeyword'] ?? null,
      colors: ai['colors'] ?? ai['colorPalette'] ?? [],
      items: ai['items'] ?? ai['outfit'] ?? {},
      reason: ai['reason'],
      weather,
      createdAt: outfit.createdAt,
      isFallback,
    };
  }

  private buildFallbackRecommendation(weather: WeatherResult): Record<string, unknown> {
    const { season, temperature, isRaining, isSnowing, weatherDescription } = weather;

    const base: Record<string, Record<string, unknown>> = {
      spring: {
        style: '봄 캐주얼',
        colors: ['화이트', '베이지', '라이트 탄'],
        items: { top: '화이트 오버사이즈 린넨 셔츠', bottom: '베이지 와이드 슬랙스', outer: temperature < 15 ? '라이트 트렌치코트' : null, shoes: '화이트 캔버스 스니커즈', accessory: isRaining ? '투명 우산' : '라탄 버킷백' },
      },
      summer: {
        style: '서머 캐주얼',
        colors: ['아이보리', '네이비', '화이트'],
        items: { top: '스트라이프 반팔 린넨 셔츠', bottom: '아이보리 반바지', outer: isRaining ? '방수 바람막이' : null, shoes: '슬립온 스니커즈', accessory: isRaining ? '경량 우산' : '패브릭 크로스백' },
      },
      autumn: {
        style: '오텀 클래식',
        colors: ['머스타드', '카멜', '다크 브라운'],
        items: { top: '머스타드 니트 스웨터', bottom: '다크 브라운 슬랙스', outer: temperature < 15 ? '카멜 울 블레이저' : null, shoes: '첼시 부츠', accessory: isRaining ? '우산' : '레더 토트백' },
      },
      winter: {
        style: '모던 윈터',
        colors: ['크림', '차콜', '네이비'],
        items: { top: '크림 터틀넥 니트', bottom: '차콜 울 슬랙스', outer: isSnowing ? '롱 패딩 점퍼' : '네이비 롱 코트', shoes: '블랙 앵클 부츠', accessory: isSnowing ? '니트 장갑' : '울 머플러' },
      },
    };

    const preset = base[season] ?? base['spring'];
    return {
      ...preset,
      reason: `${temperature}°C의 ${weatherDescription} 날씨 데이터를 기반으로 추천 중입니다.`,
    };
  }
}
