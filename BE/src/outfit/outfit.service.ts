import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly weatherService: WeatherService,
    private readonly profileService: ProfileService,
    private readonly configService: ConfigService,
  ) {}

  async recommend(userId: number, dto: RecommendOutfitDto) {
    const profile = await this.profileService.findOne(userId);
    if (!profile) {
      throw new BadRequestException('OOTD 추천을 받으려면 먼저 프로필을 등록해주세요.');
    }

    const weather = await this.resolveWeather(dto);
    const aiResult = await this.callAiService(profile, weather);

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
    } catch {
      throw new InternalServerErrorException(
        'AI 서비스에 연결할 수 없습니다. AI 서버가 실행 중인지 확인해주세요.',
      );
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
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
