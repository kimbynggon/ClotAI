import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';

@Injectable()
export class FavoriteService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(userId: number, dto: ToggleFavoriteDto) {
    const outfit = await this.prisma.outfit.findFirst({ where: { id: dto.outfitId, userId } });
    if (!outfit) throw new NotFoundException('추천 이력을 찾을 수 없습니다.');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_outfitId: { userId, outfitId: dto.outfitId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { isFavorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, outfitId: dto.outfitId } });
    return { isFavorited: true };
  }

  async getAll(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { outfit: true },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((f) => {
      const ai = f.outfit.aiResult as Record<string, unknown>;
      const wd = f.outfit.weatherData as Record<string, unknown>;
      return {
        id: f.outfit.id,
        style: ai['style'] ?? ai['styleKeyword'] ?? null,
        weatherDescription: wd['weatherDescription'] ?? null,
        temperature: wd['temperature'] ?? null,
        season: wd['season'] ?? null,
        createdAt: f.outfit.createdAt,
        favoritedAt: f.createdAt,
      };
    });
  }

  async check(userId: number, outfitId: number) {
    const exists = await this.prisma.favorite.findUnique({
      where: { userId_outfitId: { userId, outfitId } },
    });
    return { isFavorited: !!exists };
  }
}
