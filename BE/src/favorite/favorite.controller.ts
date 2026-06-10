import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ToggleFavoriteDto } from './dto/toggle-favorite.dto';
import { FavoriteService } from './favorite.service';

@ApiTags('Favorite')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorite')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post('toggle')
  @ApiOperation({ summary: '즐겨찾기 토글', description: '등록 안 된 경우 추가, 등록된 경우 삭제' })
  @ApiResponse({ status: 201, description: '토글 완료' })
  async toggle(@CurrentUser() user: User, @Body() dto: ToggleFavoriteDto) {
    const data = await this.favoriteService.toggle(user.id, dto);
    const message = data.isFavorited ? '즐겨찾기에 추가되었습니다.' : '즐겨찾기에서 삭제되었습니다.';
    return { success: true, message, data };
  }

  @Get()
  @ApiOperation({ summary: '즐겨찾기 목록 조회' })
  async getAll(@CurrentUser() user: User) {
    const data = await this.favoriteService.getAll(user.id);
    return { success: true, message: '', data };
  }

  @Get(':outfitId')
  @ApiOperation({ summary: '즐겨찾기 여부 확인' })
  @ApiParam({ name: 'outfitId', description: '추천 ID', example: 1 })
  async check(@CurrentUser() user: User, @Param('outfitId', ParseIntPipe) outfitId: number) {
    const data = await this.favoriteService.check(user.id, outfitId);
    return { success: true, message: '', data };
  }
}
