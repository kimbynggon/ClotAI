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
    const aiResult = await this.callAiService(profile, weather);
    this.logger.log(`[recommend] AI 서비스 응답 완료`);

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

    let res: Response;
    try {
      res = await fetch(`${aiUrl}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      this.logger.error(`[recommend] AI 서비스 연결 실패 url=${aiUrl}/recommend`, err instanceof Error ? err.message : String(err));
      throw new InternalServerErrorException(
        'AI 서비스에 연결할 수 없습니다. AI 서버가 실행 중인지 확인해주세요.',
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      this.logger.error(`[recommend] AI 서비스 오류 status=${res.status} detail=${detail}`);
      throw new InternalServerErrorException(`AI 추천 실패: ${detail}`);
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
}
