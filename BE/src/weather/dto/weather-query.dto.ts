import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class WeatherQueryDto {
  @ApiPropertyOptional({ example: 37.5665, description: '위도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90) @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: 126.978, description: '경도' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180) @Max(180)
  lon?: number;

  @ApiPropertyOptional({ example: '서울', description: '도시명 (한글/영문). lat+lon 대신 사용 가능' })
  @IsOptional()
  @IsString()
  city?: string;
}
