import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecommendOutfitDto {
  @ApiPropertyOptional({ description: '위도 (lat/lon 또는 city 중 하나 필수)', example: 37.5665 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: '경도', example: 126.978 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon?: number;

  @ApiPropertyOptional({ description: '도시명 (한글 가능)', example: '서울' })
  @IsOptional()
  @IsString()
  city?: string;
}
