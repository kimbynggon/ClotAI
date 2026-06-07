import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: number, dto: UpsertProfileDto) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        gender: dto.gender,
        birthYear: dto.birthYear,
        height: dto.height,
        weight: dto.weight,
        bodyType: dto.bodyType,
        styleTags: dto.styleTags ?? [],
        colorTags: dto.colorTags ?? [],
        budgetTier: dto.budgetTier,
      },
      update: {
        gender: dto.gender,
        birthYear: dto.birthYear,
        height: dto.height,
        weight: dto.weight,
        bodyType: dto.bodyType,
        styleTags: dto.styleTags ?? [],
        colorTags: dto.colorTags ?? [],
        budgetTier: dto.budgetTier,
      },
    });
  }

  async findOne(userId: number) {
    return this.prisma.profile.findUnique({ where: { userId } });
  }

  async updateImage(userId: number, imageUrl: string) {
    return this.prisma.profile.upsert({
      where: { userId },
      create: { userId, styleTags: [], colorTags: [], profileImageUrl: imageUrl },
      update: { profileImageUrl: imageUrl },
    });
  }
}
