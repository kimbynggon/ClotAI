import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray, IsEnum, IsNumber, IsOptional, IsString, Max, Min,
} from 'class-validator';

export enum Gender { MALE = 'male', FEMALE = 'female', OTHER = 'other' }
export enum BodyType {
  RECTANGLE = 'rectangle',
  TRIANGLE = 'triangle',
  INVERTED_TRIANGLE = 'inverted_triangle',
  HOURGLASS = 'hourglass',
  OVAL = 'oval',
}
export enum BudgetTier { LOW = 'low', MID = 'mid', HIGH = 'high' }

export class UpsertProfileDto {
  @ApiPropertyOptional({ enum: Gender, example: 'male' })
  @IsOptional()
  @IsEnum(Gender, { message: '성별은 male, female, other 중 하나여야 합니다.' })
  gender?: Gender;

  @ApiPropertyOptional({ example: 1998 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900) @Max(2020)
  birthYear?: number;

  @ApiPropertyOptional({ example: 178.5, description: '키 (cm)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(100) @Max(250)
  height?: number;

  @ApiPropertyOptional({ example: 70.0, description: '몸무게 (kg)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30) @Max(300)
  weight?: number;

  @ApiPropertyOptional({ enum: BodyType })
  @IsOptional()
  @IsEnum(BodyType)
  bodyType?: BodyType;

  @ApiPropertyOptional({ example: ['casual', 'minimal'], description: '선호 스타일 태그' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  styleTags?: string[];

  @ApiPropertyOptional({ example: ['black', 'white', 'navy'], description: '선호 색상 태그' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colorTags?: string[];

  @ApiPropertyOptional({ enum: BudgetTier })
  @IsOptional()
  @IsEnum(BudgetTier)
  budgetTier?: BudgetTier;
}
