import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiResponse, ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WeatherService } from './weather.service';
import { WeatherQueryDto } from './dto/weather-query.dto';

const WeatherDataSchema = {
  type: 'object',
  properties: {
    lat:                { type: 'number', example: 37.5665 },
    lon:                { type: 'number', example: 126.978 },
    city:               { type: 'string', nullable: true, example: '서울' },
    temperature:        { type: 'number', example: 22.5, description: '기온 (°C)' },
    feelsLike:          { type: 'number', example: 21.0, description: '체감온도 (°C)' },
    precipitation:      { type: 'number', example: 0, description: '강수량 (mm)' },
    humidity:           { type: 'number', example: 55, description: '습도 (%)' },
    windSpeed:          { type: 'number', example: 8.2, description: '풍속 (km/h)' },
    weatherCode:        { type: 'number', example: 1, description: 'WMO 날씨 코드' },
    weatherDescription: { type: 'string', example: '대체로 맑음' },
    season:             { type: 'string', enum: ['spring', 'summer', 'autumn', 'winter'] },
    isRaining:          { type: 'boolean', example: false },
    isSnowing:          { type: 'boolean', example: false },
    cachedAt:           { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Weather')
@Controller('weather')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @ApiOperation({
    summary: '현재 날씨 조회',
    description:
      '`city` 또는 `lat+lon` 중 하나를 필수로 전달. Open-Meteo 사용 (무료, API 키 불필요). 30분 캐시 적용.',
  })
  @ApiQuery({ name: 'city', required: false, description: '도시명 (한글/영문). 예: 서울, Busan' })
  @ApiQuery({ name: 'lat', required: false, description: '위도 (city 미사용 시 필수)', example: 37.5665 })
  @ApiQuery({ name: 'lon', required: false, description: '경도 (city 미사용 시 필수)', example: 126.978 })
  @ApiResponse({
    status: 200,
    description: '날씨 조회 성공',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: '' },
        data:    WeatherDataSchema,
      },
    },
  })
  @ApiResponse({ status: 400, description: '위치 정보 누락 또는 도시를 찾을 수 없음' })
  async getWeather(@Query() query: WeatherQueryDto) {
    let { lat, lon, city } = query;

    if (city) {
      const geo = await this.weatherService.geocode(city);
      lat = geo.lat;
      lon = geo.lon;
      city = geo.name;
    }

    if (lat === undefined || lon === undefined) {
      throw new BadRequestException('위치 정보(lat, lon) 또는 도시명(city)을 입력해주세요.');
    }

    const data = await this.weatherService.getWeather(lat, lon, city);
    return { success: true, message: '', data };
  }
}
