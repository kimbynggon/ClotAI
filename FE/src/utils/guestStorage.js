const GUEST_KEY = 'fashion_guest';
const GUEST_PROFILE_KEY = 'fashion_guest_profile';
const GUEST_LIMIT_COOKIE = 'guest_daily_limit';

export const GUEST_DAILY_LIMIT = 3;

function parseLimitCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${GUEST_LIMIT_COOKIE}=`));
  if (!match) return null;
  try {
    const value = match.slice(GUEST_LIMIT_COOKIE.length + 1);
    const [date, count] = value.split(':');
    return { date, count: parseInt(count, 10) };
  } catch {
    return null;
  }
}

function setLimitCookie(date, count) {
  if (typeof document === 'undefined') return;
  const midnight = new Date();
  midnight.setHours(23, 59, 59, 999);
  document.cookie = `${GUEST_LIMIT_COOKIE}=${date}:${count}; expires=${midnight.toUTCString()}; path=/; SameSite=Lax`;
}

export const guestStorage = {
  init() {
    if (typeof window === 'undefined') return null;
    const existing = this.get();
    if (existing) return existing;
    const guest = { id: `guest_${Date.now()}`, createdAt: new Date().toISOString() };
    localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
    return guest;
  },

  get() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  getProfile() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(GUEST_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  saveProfile(profile) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  },

  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(GUEST_PROFILE_KEY);
    document.cookie = `${GUEST_LIMIT_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  },

  exists() {
    return !!this.get();
  },

  canRecommend() {
    const today = new Date().toISOString().slice(0, 10);
    const data = parseLimitCookie();
    if (!data || data.date !== today) return true;
    return data.count < GUEST_DAILY_LIMIT;
  },

  getRemainingRecommends() {
    const today = new Date().toISOString().slice(0, 10);
    const data = parseLimitCookie();
    if (!data || data.date !== today) return GUEST_DAILY_LIMIT;
    return Math.max(0, GUEST_DAILY_LIMIT - data.count);
  },

  incrementRecommend() {
    const today = new Date().toISOString().slice(0, 10);
    const data = parseLimitCookie();
    const count = (data?.date === today ? data.count : 0) + 1;
    setLimitCookie(today, count);
  },
};
