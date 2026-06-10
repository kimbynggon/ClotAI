import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ToggleFavoriteDto {
  @ApiProperty({ example: 1, description: '추천 ID' })
  @IsInt()
  @Min(1)
  outfitId: number;
}
