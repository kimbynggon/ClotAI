/**
 * 목업 API — 백엔드 연동 전 테스트용
 * NEXT_PUBLIC_USE_MOCK=true 일 때만 사용됩니다.
 *
 * 테스트 계정
 *   이메일:    test@clotai.com
 *   비밀번호:  test1234
 *   인증코드:  123456 (회원가입 시)
 */

const delay = (ms = 500) => new Promise((res) => setTimeout(res, ms));

const MOCK_TOKEN = 'mock_jwt_clotai_dev';
const VERIFY_CODE = '123456';

// 인메모리 사용자 저장소
const USERS = {
  'test@clotai.com': {
    id: 1,
    email: 'test@clotai.com',
    name: '테스트 유저',
    hasProfile: true,
  },
};

const PASSWORDS = {
  'test@clotai.com': 'test1234',
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
  async login({ email, password }) {
    await delay(600);
    const user = USERS[email];
    if (!user || PASSWORDS[email] !== password) {
      throw makeError('이메일 또는 비밀번호가 올바르지 않습니다.', 401);
    }
    return { data: { user, token: MOCK_TOKEN } };
  },

  async signup({ email, password, name }) {
    await delay(700);
    if (USERS[email]) {
      throw makeError('이미 사용 중인 이메일입니다.', 409);
    }
    pendingSignups[email] = { email, password, name };
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
    const newUser = { id: Date.now(), email, name: pending.name, hasProfile: false };
    USERS[email] = newUser;
    PASSWORDS[email] = pending.password;
    delete pendingSignups[email];
    return { data: { user: newUser, token: MOCK_TOKEN } };
  },

  async me() {
    await delay(300);
    return { data: USERS['test@clotai.com'] };
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
};
