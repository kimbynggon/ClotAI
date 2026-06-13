import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecommendOutfitDto } from './dto/recommend-outfit.dto';
import { OutfitService } from './outfit.service';

const OutfitItemSchema = {
  type: 'object',
  properties: {
    top:       { type: 'string', example: '화이트 린넨 셔츠' },
    bottom:    { type: 'string', example: '베이지 와이드 슬랙스' },
    outer:     { type: 'string', nullable: true, example: null },
    shoes:     { type: 'string', example: '화이트 스니커즈' },
    accessory: { type: 'string', nullable: true, example: null },
  },
};

const OutfitDetailSchema = {
  type: 'object',
  properties: {
    id:           { type: 'number', example: 1 },
    outfit:       OutfitItemSchema,
    reason:       { type: 'string', example: '오늘 날씨와 체형에 어울리는 코디입니다.' },
    styleKeyword: { type: 'string', example: '캐주얼 미니멀' },
    colorPalette: { type: 'array', items: { type: 'string' }, example: ['white', 'beige'] },
    weather:      { type: 'object', description: '날씨 정보' },
    createdAt:    { type: 'string', format: 'date-time' },
  },
};

const HistoryItemSchema = {
  type: 'object',
  properties: {
    id:                 { type: 'number', example: 1 },
    styleKeyword:       { type: 'string', example: '캐주얼 미니멀' },
    weatherDescription: { type: 'string', example: '맑음' },
    temperature:        { type: 'number', example: 22 },
    season:             { type: 'string', example: 'spring' },
    createdAt:          { type: 'string', format: 'date-time' },
  },
};

function successResponse(dataSchema: object, description: string) {
  return {
    description,
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string' },
        data:    dataSchema,
      },
    },
  };
}

@ApiTags('Outfit')
@Controller('outfit')
export class OutfitController {
  constructor(private readonly outfitService: OutfitService) {}

  @Post('warmup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI 서비스 슬립 해제 워밍업', description: 'AI 서비스가 응답할 때까지 대기 후 반환. aiReady로 준비 여부 확인.' })
  async warmup() {
    const aiReady = await this.outfitService.checkAiReady();
    return { success: true, message: aiReady ? 'AI 서비스 준비 완료' : 'AI 서비스 응답 없음', data: { aiReady } };
  }

  @Post('recommend')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'AI OOTD 추천',
    description: '`city` 또는 `lat+lon` 중 하나 필수. 프로필 등록 필요.',
  })
  @ApiResponse({ status: 201, ...successResponse(OutfitDetailSchema, 'AI 추천 완료') })
  @ApiResponse({ status: 400, description: '프로필 미등록 또는 위치 정보 누락' })
  @ApiResponse({ status: 500, description: 'AI 서비스 연결 오류' })
  async recommend(@CurrentUser() user: User, @Body() dto: RecommendOutfitDto) {
    const data = await this.outfitService.recommend(user.id, dto);
    return { success: true, message: 'OOTD 추천이 완료되었습니다.', data };
  }

  @Post('guest/recommend')
  @ApiOperation({
    summary: '게스트 AI OOTD 추천 (인증 불필요)',
    description: '로그인 없이 이용 가능. 결과는 저장되지 않습니다. 횟수 제한은 클라이언트 쿠키로 관리.',
  })
  @ApiResponse({ status: 201, ...successResponse(OutfitDetailSchema, '게스트 AI 추천 완료') })
  @ApiResponse({ status: 400, description: '위치 정보 누락' })
  async guestRecommend(@Body() dto: RecommendOutfitDto) {
    const data = await this.outfitService.guestRecommend(dto);
    return { success: true, message: 'OOTD 추천이 완료되었습니다.', data };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '추천 이력 조회', description: '최근 20건 내림차순 반환' })
  @ApiResponse({
    status: 200,
    ...successResponse({ type: 'array', items: HistoryItemSchema }, '이력 조회 성공'),
  })
  async getHistory(@CurrentUser() user: User) {
    const data = await this.outfitService.getHistory(user.id);
    return { success: true, message: '', data };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '추천 상세 조회' })
  @ApiParam({ name: 'id', description: '추천 ID', example: 1 })
  @ApiResponse({ status: 200, ...successResponse(OutfitDetailSchema, '조회 성공') })
  @ApiResponse({ status: 404, description: '이력 없음' })
  async getOne(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    const data = await this.outfitService.getOne(user.id, id);
    return { success: true, message: '', data };
  }
}
