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
  // 경기 추가
  부천: 'Bucheon', 부천시: 'Bucheon',
  의정부: 'Uijeongbu', 의정부시: 'Uijeongbu',
  파주: 'Paju', 파주시: 'Paju',
  시흥: 'Siheung', 시흥시: 'Siheung',
  평택: 'Pyeongtaek', 평택시: 'Pyeongtaek',
  김포: 'Gimpo', 김포시: 'Gimpo',
  광명: 'Gwangmyeong', 광명시: 'Gwangmyeong',
  하남: 'Hanam', 하남시: 'Hanam',
  오산: 'Osan', 오산시: 'Osan',
  군포: 'Gunpo', 군포시: 'Gunpo',
  구리: 'Guri', 구리시: 'Guri',
  양주: 'Yangju', 양주시: 'Yangju',
  이천: 'Icheon', 이천시: 'Icheon',
  안성: 'Anseong', 안성시: 'Anseong',
  // 충청 추가
  아산: 'Asan', 아산시: 'Asan',
  공주: 'Gongju', 공주시: 'Gongju',
  논산: 'Nonsan', 논산시: 'Nonsan',
  서산: 'Seosan', 서산시: 'Seosan',
  // 전라 추가
  익산: 'Iksan', 익산시: 'Iksan',
  군산: 'Gunsan', 군산시: 'Gunsan',
  광양: 'Gwangyang', 광양시: 'Gwangyang',
  나주: 'Naju', 나주시: 'Naju',
  // 경상 추가
  김해: 'Gimhae', 김해시: 'Gimhae',
  진주: 'Jinju', 진주시: 'Jinju',
  통영: 'Tongyeong', 통영시: 'Tongyeong',
  거제: 'Geoje', 거제시: 'Geoje',
  안동: 'Andong', 안동시: 'Andong',
  밀양: 'Miryang', 밀양시: 'Miryang',
  // 강원 추가
  속초: 'Sokcho', 속초시: 'Sokcho',
  동해: 'Donghae', 동해시: 'Donghae',
  삼척: 'Samcheok', 삼척시: 'Samcheok',
  태백: 'Taebaek', 태백시: 'Taebaek',
  // 제주
  제주: 'Jeju', 제주시: 'Jeju',
  서귀포: 'Seogwipo', 서귀포시: 'Seogwipo',
  // 서울 구 단위
  강남구: 'Gangnam-gu, Seoul', 강북구: 'Gangbuk-gu, Seoul', 강서구: 'Gangseo-gu, Seoul',
  강동구: 'Gangdong-gu, Seoul', 관악구: 'Gwanak-gu, Seoul', 광진구: 'Gwangjin-gu, Seoul',
  구로구: 'Guro-gu, Seoul', 금천구: 'Geumcheon-gu, Seoul', 노원구: 'Nowon-gu, Seoul',
  도봉구: 'Dobong-gu, Seoul', 동대문구: 'Dongdaemun-gu, Seoul', 동작구: 'Dongjak-gu, Seoul',
  마포구: 'Mapo-gu, Seoul', 서대문구: 'Seodaemun-gu, Seoul', 서초구: 'Seocho-gu, Seoul',
  성동구: 'Seongdong-gu, Seoul', 성북구: 'Seongbuk-gu, Seoul', 송파구: 'Songpa-gu, Seoul',
  양천구: 'Yangcheon-gu, Seoul', 영등포구: 'Yeongdeungpo-gu, Seoul', 용산구: 'Yongsan-gu, Seoul',
  은평구: 'Eunpyeong-gu, Seoul', 종로구: 'Jongno-gu, Seoul', 중구: 'Jung-gu, Seoul',
  중랑구: 'Jungnang-gu, Seoul',
  // 부산 구 단위 (주요)
  해운대구: 'Haeundae-gu, Busan', 수영구: 'Suyeong-gu, Busan', 남구: 'Nam-gu, Busan',
  부산진구: 'Busanjin-gu, Busan', 기장군: 'Gijang-gun, Busan',
  // 인천 구 단위 (주요)
  연수구: 'Yeonsu-gu, Incheon', 남동구: 'Namdong-gu, Incheon', 미추홀구: 'Michuhol-gu, Incheon',
  // 일본 (한국어 표기 → 영문)
  도쿄: 'Tokyo', 동경: 'Tokyo',
  오사카: 'Osaka',
  교토: 'Kyoto',
  후쿠오카: 'Fukuoka',
  삿포로: 'Sapporo',
  나고야: 'Nagoya',
  고베: 'Kobe',
  요코하마: 'Yokohama',
  센다이: 'Sendai',
  오키나와: 'Naha', 나하: 'Naha',
  히로시마: 'Hiroshima',
  나가사키: 'Nagasaki',
  가나자와: 'Kanazawa',
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

// ── wttr.in 날씨 코드 → 한국어 설명 ──────────────────────────────
const WTTR_DESC: Record<number, string> = {
  113: '맑음', 116: '구름 조금', 119: '흐림', 122: '매우 흐림',
  143: '안개', 248: '안개', 260: '짙은 안개',
  176: '가벼운 비', 185: '가벼운 진눈깨비', 200: '뇌우',
  227: '눈보라', 230: '폭설',
  263: '이슬비', 266: '이슬비', 281: '진눈깨비', 284: '진눈깨비',
  293: '가벼운 비', 296: '비', 299: '비', 302: '비', 305: '강한 비', 308: '폭우',
  311: '진눈깨비', 314: '진눈깨비',
  317: '가벼운 눈', 320: '눈', 323: '눈', 326: '눈', 329: '강한 눈', 332: '강한 눈',
  335: '눈보라', 338: '폭설',
  350: '얼음비', 353: '소나기', 356: '소나기', 359: '강한 소나기',
  362: '눈비', 365: '눈비', 368: '눈 소나기', 371: '강한 눈 소나기',
  374: '얼음비', 377: '강한 얼음비',
  386: '뇌우', 389: '강한 뇌우', 392: '뇌우', 395: '폭설과 뇌우',
};

const RAIN_CODES = new Set([176, 185, 263, 266, 281, 284, 293, 296, 299, 302, 305, 308, 311, 314, 350, 353, 356, 359, 362, 365, 374, 377, 386, 389]);
const SNOW_CODES = new Set([227, 230, 317, 320, 323, 326, 329, 332, 335, 338, 362, 365, 368, 371, 392, 395]);

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
  windSpeed: number;         // 풍속 m/s
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

  // ── 날씨 조회 (캐시 우선) — wttr.in API 사용 ─────────────────
  async getWeather(lat: number, lon: number, city?: string): Promise<WeatherResult> {
    const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`캐시 HIT [${key}]`);
      return cached.data;
    }

    const url = `https://wttr.in/${lat},${lon}?format=j1`;
    this.logger.log(`[getWeather] fetch 시작 lat=${lat} lon=${lon}`);

    let json: any;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) throw new Error(`wttr.in ${res.status}`);
      json = await res.json();
    } catch (e) {
      this.logger.error(`[getWeather] fetch 실패 err=${e instanceof Error ? e.message : String(e)}`);
      throw new InternalServerErrorException('날씨 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }

    const cur = json.current_condition?.[0];
    if (!cur) {
      this.logger.error('[getWeather] current_condition 없음');
      throw new InternalServerErrorException('날씨 데이터를 파싱할 수 없습니다.');
    }

    const code: number = Number(cur.weatherCode ?? 113);
    const precipMM: number = parseFloat(cur.precipMM ?? '0');
    const month = new Date().getMonth() + 1;

    const data: WeatherResult = {
      lat,
      lon,
      city: city ?? null,
      temperature: parseFloat(cur.temp_C ?? '0'),
      feelsLike: parseFloat(cur.FeelsLikeC ?? '0'),
      precipitation: precipMM,
      humidity: parseFloat(cur.humidity ?? '0'),
      windSpeed: Math.round((parseFloat(cur.windspeedKmph ?? '0') / 3.6) * 10) / 10,
      weatherCode: code,
      weatherDescription: WTTR_DESC[code] ?? '알 수 없음',
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

    this.logger.log(`[geocode] 호출 city=${city} query=${query}`);
    let json: any;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Geocoding ${res.status}`);
      json = await res.json();
    } catch (e) {
      this.logger.error(`[geocode] fetch 실패 city=${city} query=${query} err=${e instanceof Error ? e.message : String(e)}`);
      throw new InternalServerErrorException('도시 정보를 가져올 수 없습니다. 잠시 후 다시 시도해주세요.');
    }
    this.logger.log(`[geocode] 완료 city=${city} results=${json.results?.length ?? 0}`);

    if (!json.results?.length) {
      throw new BadRequestException(`"${city}" 도시를 찾을 수 없습니다.`);
    }

    const { latitude, longitude, name } = json.results[0];
    return { lat: latitude, lon: longitude, name };
  }
}
