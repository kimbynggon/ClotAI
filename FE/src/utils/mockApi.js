/**
 * 목업 API — 백엔드 연동 전 테스트용
 * NEXT_PUBLIC_USE_MOCK=true 일 때만 사용됩니다.
 *
 * 테스트 계정
 *   아이디:    testuser
 *   비밀번호:  test1234
 *   인증코드:  123456 (회원가입 시)
 */

const delay = (ms = 500) => new Promise((res) => setTimeout(res, ms));

const MOCK_TOKEN = 'mock_jwt_clotai_dev';
const VERIFY_CODE = '123456';

// 인메모리 사용자 저장소 (key: user_id)
const USERS = {
  testuser: {
    id: 1,
    user_id: 'testuser',
    email: 'test@clotai.com',
    name: '테스트 유저',
    hasProfile: true,
  },
};

const PASSWORDS = {
  testuser: 'test1234',
};

const MOCK_PROFILE = {
  gender: 'male',
  birthYear: 1998,
  height: 178,
  weight: 70,
  bodyType: 'rectangle',
  preferredStyles: ['casual', 'minimal'],
  preferredColors: ['black', 'white', 'navy'],
  budget: 'mid',
};

// 회원가입 중 이메일 인증 대기 목록
const pendingSignups = {};

function makeError(message, status = 400) {
  const err = new Error(message);
  err.response = { status, data: { message } };
  return err;
}

export const mockAuthAPI = {
  async login({ user_id, password }) {
    await delay(600);
    const user = USERS[user_id];
    if (!user || PASSWORDS[user_id] !== password) {
      throw makeError('아이디 또는 비밀번호가 올바르지 않습니다.', 401);
    }
    return { data: { user, token: MOCK_TOKEN } };
  },

  async signup({ user_id, email, password, name }) {
    await delay(700);
    if (USERS[user_id]) {
      throw makeError('이미 사용 중인 아이디입니다.', 409);
    }
    pendingSignups[email] = { user_id, email, password, name };
    return { data: { message: '인증 코드가 발송되었습니다.' } };
  },

  async logout() {
    await delay(200);
    return { data: { message: '로그아웃 완료' } };
  },

  async sendVerification(email) {
    await delay(500);
    return { data: { message: '인증 코드가 재발송되었습니다.' } };
  },

  async verifyCode(email, code) {
    await delay(600);
    const pending = pendingSignups[email];
    if (!pending) {
      throw makeError('인증 세션이 만료되었습니다. 다시 시도해주세요.', 410);
    }
    if (code !== VERIFY_CODE) {
      throw makeError('인증 코드가 올바르지 않습니다.', 400);
    }
    const newUser = { id: Date.now(), user_id: pending.user_id, email, name: pending.name, hasProfile: false };
    USERS[pending.user_id] = newUser;
    PASSWORDS[pending.user_id] = pending.password;
    delete pendingSignups[email];
    return { data: { user: newUser, token: MOCK_TOKEN } };
  },

  async me() {
    await delay(300);
    return { data: USERS['testuser'] };
  },
};

export const mockProfileAPI = {
  async get() {
    await delay(400);
    return { data: MOCK_PROFILE };
  },

  async update(data) {
    await delay(500);
    return { data: { ...data, updatedAt: new Date().toISOString() } };
  },

  async uploadImage() {
    await delay(800);
    return { data: { profileImageUrl: '/uploads/profile/mock-profile.jpg' } };
  },
};

const MOCK_WEATHER = {
  city: '서울',
  temperature: 22,
  feelsLike: 21,
  precipitation: 0,
  humidity: 55,
  windSpeed: 8.2,
  weatherCode: 1,
  weatherDescription: '대체로 맑음',
  season: 'spring',
  isRaining: false,
  isSnowing: false,
  cachedAt: new Date().toISOString(),
};

export const mockWeatherAPI = {
  async getByCity() {
    await delay(300);
    return { data: { ...MOCK_WEATHER, lat: 37.5665, lon: 126.978 } };
  },
  async getByCoords(lat, lon) {
    await delay(300);
    return { data: { ...MOCK_WEATHER, lat, lon, city: null } };
  },
};

const MOCK_OUTFIT = {
  id: 1,
  outfit: {
    top: '화이트 오버사이즈 린넨 셔츠',
    bottom: '베이지 와이드 슬랙스',
    outer: null,
    shoes: '화이트 캔버스 스니커즈',
    accessory: '라탄 버킷백',
  },
  reason: '오늘은 기온이 22°C로 쾌적한 봄 날씨입니다. 캐주얼 미니멀 스타일을 선호하시는 분께 린넨 소재의 가벼운 코디를 추천드립니다. 직사각형 체형에 어울리는 와이드 실루엣으로 균형 잡힌 비율을 연출할 수 있습니다.',
  styleKeyword: '캐주얼 미니멀',
  colorPalette: ['white', 'beige', 'light tan'],
  weather: {
    city: '서울',
    temperature: 22,
    feelsLike: 21,
    weatherDescription: '맑음',
    season: 'spring',
    isRaining: false,
    isSnowing: false,
  },
  createdAt: new Date().toISOString(),
};

export const mockOutfitAPI = {
  async recommend() {
    await delay(1500);
    return { data: { ...MOCK_OUTFIT, id: Date.now() } };
  },

  async getHistory() {
    await delay(400);
    return {
      data: [
        MOCK_OUTFIT,
        {
          ...MOCK_OUTFIT,
          id: 2,
          styleKeyword: '스트릿 캐주얼',
          weather: { ...MOCK_OUTFIT.weather, temperature: 15, weatherDescription: '구름 조금', season: 'autumn' },
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    };
  },

  async getOne() {
    await delay(300);
    return { data: MOCK_OUTFIT };
  },
};
