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

@Injectable()
export class OutfitService {
  private readonly logger = new Logger(OutfitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {}

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
    try {
      aiResult = await this.callAiService(profile, weather);
      this.logger.log(`[recommend] AI 서비스 응답 완료`);
    } catch {
      this.logger.warn(`[recommend] AI 서비스 실패 — 기본 추천 반환`);
      aiResult = this.buildFallbackRecommendation(weather);
    }

    const outfit = await this.prisma.outfit.create({
      data: {
        userId,
        weatherData: weather as object,
        aiResult: aiResult as object,
      },
    });

    return this.formatOutfit(outfit, aiResult, weather);
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
        styleKeyword: ai['styleKeyword'] ?? null,
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

  private async callAiService(
    profile: Profile,
    weather: WeatherResult,
  ): Promise<Record<string, unknown>> {
    const aiUrl = this.configService.get<string>('AI_SERVICE_URL', 'http://localhost:8000');

    const payload = {
      profile: {
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
        body_type: profile.bodyType,
        style_tags: profile.styleTags,
        color_tags: profile.colorTags,
        budget_tier: profile.budgetTier,
      },
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

    const fetchAi = (timeoutMs: number) =>
      fetch(`${aiUrl}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });

    let res: Response;
    try {
      res = await fetchAi(45_000);
    } catch (err) {
      this.logger.error(`[recommend] AI 서비스 연결 실패 url=${aiUrl}/recommend`, err instanceof Error ? err.message : String(err));
      throw new InternalServerErrorException(
        'AI 서비스에 연결할 수 없습니다. AI 서버가 실행 중인지 확인해주세요.',
      );
    }

    // 502/503: Render 무료 플랜 슬립 상태 → 30초 대기 후 1회 재시도
    if (res.status === 502 || res.status === 503) {
      this.logger.warn(`[recommend] AI 서비스 ${res.status} — 30초 후 재시도`);
      await new Promise<void>((r) => setTimeout(r, 30_000));
      try {
        res = await fetchAi(45_000);
      } catch (err) {
        this.logger.error(`[recommend] AI 서비스 재시도 실패`, err instanceof Error ? err.message : String(err));
        throw new InternalServerErrorException(
          'AI 서비스를 시작할 수 없습니다. 잠시 후 다시 시도해주세요.',
        );
      }
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`[recommend] AI 서비스 오류 status=${res.status} detail=${detail.slice(0, 300)}`);
      const isGatewayError = res.status === 502 || res.status === 503;
      const isHtmlResponse = detail.trimStart().startsWith('<!');
      throw new InternalServerErrorException(
        isGatewayError || isHtmlResponse
          ? 'AI 서비스가 일시적으로 중단되었습니다. 잠시 후 다시 시도해주세요.'
          : `AI 추천 실패: ${detail}`,
      );
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  private formatOutfit(
    outfit: { id: number; createdAt: Date },
    ai: Record<string, unknown>,
    weather: Record<string, unknown> | WeatherResult,
  ) {
    return {
      id: outfit.id,
      outfit: ai['outfit'],
      reason: ai['reason'],
      styleKeyword: ai['styleKeyword'],
      colorPalette: ai['colorPalette'],
      weather,
      createdAt: outfit.createdAt,
    };
  }

  private buildFallbackRecommendation(weather: WeatherResult): Record<string, unknown> {
    const { season, temperature, isRaining, isSnowing, weatherDescription, city } = weather;
    const loc = city ?? '현재 위치';

    const base: Record<string, Record<string, unknown>> = {
      spring: {
        outfit: { top: '화이트 오버사이즈 린넨 셔츠', bottom: '베이지 와이드 슬랙스', outer: temperature < 15 ? '라이트 트렌치코트' : null, shoes: '화이트 캔버스 스니커즈', accessory: isRaining ? '투명 우산' : '라탄 버킷백' },
        styleKeyword: '캐주얼 미니멀', colorPalette: ['white', 'beige', 'light tan'],
      },
      summer: {
        outfit: { top: '스트라이프 반팔 린넨 셔츠', bottom: '아이보리 반바지', outer: isRaining ? '방수 바람막이' : null, shoes: '슬립온 스니커즈', accessory: isRaining ? '경량 우산' : '패브릭 크로스백' },
        styleKeyword: '서머 캐주얼', colorPalette: ['ivory', 'navy', 'white'],
      },
      autumn: {
        outfit: { top: '머스타드 니트 스웨터', bottom: '다크 브라운 슬랙스', outer: temperature < 15 ? '카멜 울 블레이저' : null, shoes: '첼시 부츠', accessory: isRaining ? '우산' : '레더 토트백' },
        styleKeyword: '오텀 클래식', colorPalette: ['mustard', 'camel', 'dark brown'],
      },
      winter: {
        outfit: { top: '크림 터틀넥 니트', bottom: '차콜 울 슬랙스', outer: isSnowing ? '롱 패딩 점퍼' : '네이비 롱 코트', shoes: '블랙 앵클 부츠', accessory: isSnowing ? '니트 장갑' : '울 머플러' },
        styleKeyword: '모던 윈터', colorPalette: ['cream', 'charcoal', 'navy'],
      },
    };

    const preset = base[season] ?? base['spring'];
    return {
      ...preset,
      reason: `오늘 ${loc}은 ${temperature}°C, ${weatherDescription} 날씨예요. AI 서비스 점검 중으로 날씨 기반 기본 코디를 제안드립니다.`,
    };
  }
}
