import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';

// ── 주요 한국 도시 한글 → 영문 변환 테이블 ──────────────────────
const KO_CITIES: Record<string, string> = {
  // 특별/광역/특별자치시 (시 접미사 포함 변형)
  서울: 'Seoul', 서울시: 'Seoul', 서울특별시: 'Seoul',
  부산: 'Busan', 부산시: 'Busan', 부산광역시: 'Busan',
  대구: 'Daegu', 대구시: 'Daegu', 대구광역시: 'Daegu',
  인천: 'Incheon', 인천시: 'Incheon', 인천광역시: 'Incheon',
  광주: 'Gwangju', 광주시: 'Gwangju', 광주광역시: 'Gwangju',
  대전: 'Daejeon', 대전시: 'Daejeon', 대전광역시: 'Daejeon',
  울산: 'Ulsan', 울산시: 'Ulsan', 울산광역시: 'Ulsan',
  세종: 'Sejong', 세종시: 'Sejong', 세종특별자치시: 'Sejong',
  // 수도권
  수원: 'Suwon', 수원시: 'Suwon',
  고양: 'Goyang', 고양시: 'Goyang',
  용인: 'Yongin', 용인시: 'Yongin',
  성남: 'Seongnam', 성남시: 'Seongnam',
  안산: 'Ansan', 안산시: 'Ansan',
  안양: 'Anyang', 안양시: 'Anyang',
  남양주: 'Namyangju', 남양주시: 'Namyangju',
  화성: 'Hwaseong', 화성시: 'Hwaseong',
  // 충청권
  청주: 'Cheongju', 청주시: 'Cheongju',
  천안: 'Cheonan', 천안시: 'Cheonan',
  // 전라권
  전주: 'Jeonju', 전주시: 'Jeonju',
  목포: 'Mokpo', 목포시: 'Mokpo',
  여수: 'Yeosu', 여수시: 'Yeosu',
  순천: 'Suncheon', 순천시: 'Suncheon',
  // 경상권
  창원: 'Changwon', 창원시: 'Changwon',
  포항: 'Pohang', 포항시: 'Pohang',
  경주: 'Gyeongju', 경주시: 'Gyeongju',
  구미: 'Gumi', 구미시: 'Gumi',
  // 강원권
  춘천: 'Chuncheon', 춘천시: 'Chuncheon',
  원주: 'Wonju', 원주시: 'Wonju',
  강릉: 'Gangneung', 강릉시: 'Gangneung',
  // 제주
  제주: 'Jeju', 제주시: 'Jeju',
  // 광역시/도 단위 (대표 도시로 매핑)
  강원도: 'Chuncheon', 강원: 'Chuncheon', 강원특별자치도: 'Chuncheon',
  경기도: 'Suwon', 경기: 'Suwon',
  충청북도: 'Cheongju', 충북: 'Cheongju',
  충청남도: 'Cheonan', 충남: 'Cheonan',
  전라북도: 'Jeonju', 전북: 'Jeonju', 전북특별자치도: 'Jeonju',
  전라남도: 'Mokpo', 전남: 'Mokpo',
  경상북도: 'Pohang', 경북: 'Pohang',
  경상남도: 'Changwon', 경남: 'Changwon',
  제주도: 'Jeju', 제주특별자치도: 'Jeju',
};

// ── WMO 날씨 코드 → 한국어 설명 ─────────────────────────────────
const WMO: Record<number, string> = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비',
  61: '비', 63: '비', 65: '폭우',
  71: '눈', 73: '눈', 75: '폭설', 77: '싸락눈',
  80: '소나기', 81: '소나기', 82: '강한 소나기',
  85: '눈 소나기', 86: '강한 눈 소나기',
  95: '뇌우', 96: '우박을 동반한 뇌우', 99: '우박을 동반한 뇌우',
};

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

function getSeason(month: number): string {
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export interface WeatherResult {
  lat: number;
  lon: number;
  city: string | null;
  temperature: number;       // 기온 °C
  feelsLike: number;         // 체감온도 °C
  precipitation: number;     // 강수량 mm
  humidity: number;          // 습도 %
  windSpeed: number;         // 풍속 km/h
  weatherCode: number;
  weatherDescription: string;
  season: string;
  isRaining: boolean;
  isSnowing: boolean;
  cachedAt: string;
}

interface CacheEntry {
  data: WeatherResult;
  expiresAt: number;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly TTL_MS = 30 * 60 * 1000; // 30분

  // ── 날씨 조회 (캐시 우선) ─────────────────────────────────────
  async getWeather(lat: number, lon: number, city?: string): Promise<WeatherResult> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`캐시 HIT [${key}]`);
      return cached.data;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,relative_humidity_2m',
    );
    url.searchParams.set('timezone', 'auto');

    let json: any;
    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
      json = await res.json();
    } catch (e) {
      this.logger.error(`[getWeather] fetch 실패 err=${e instanceof Error ? e.message : String(e)}`);
      throw new InternalServerErrorException('날씨 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    const cur = json.current;
    const code: number = cur.weathercode ?? 0;
    const month = new Date().getMonth() + 1;

    const data: WeatherResult = {
      lat,
      lon,
      city: city ?? null,
      temperature: Math.round(cur.temperature_2m * 10) / 10,
      feelsLike: Math.round(cur.apparent_temperature * 10) / 10,
      precipitation: cur.precipitation ?? 0,
      humidity: cur.relative_humidity_2m ?? 0,
      windSpeed: Math.round(cur.windspeed_10m * 10) / 10,
      weatherCode: code,
      weatherDescription: WMO[code] ?? '알 수 없음',
      season: getSeason(month),
      isRaining: RAIN_CODES.has(code),
      isSnowing: SNOW_CODES.has(code),
      cachedAt: new Date().toISOString(),
    };

    this.cache.set(key, { data, expiresAt: Date.now() + this.TTL_MS });
    this.logger.log(`날씨 조회 [${key}] → ${data.temperature}°C ${data.weatherDescription}`);
    return data;
  }

  // ── 도시명 → 좌표 변환 (Open-Meteo Geocoding) ─────────────────
  async geocode(city: string): Promise<{ lat: number; lon: number; name: string }> {
    const query = KO_CITIES[city] ?? city; // 한글 도시명 → 영문 변환
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ko&format=json`;

    let json: any;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Geocoding ${res.status}`);
      json = await res.json();
    } catch (e) {
      this.logger.error(`[geocode] fetch 실패 city=${city} query=${query} err=${e instanceof Error ? e.message : String(e)}`);
      throw new InternalServerErrorException('도시 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    if (!json.results?.length) {
      throw new BadRequestException(`"${city}" 도시를 찾을 수 없습니다.`);
    }

    const { latitude, longitude, name } = json.results[0];
    return { lat: latitude, lon: longitude, name };
  }
}
