const GUEST_KEY = 'fashion_guest';
const GUEST_PROFILE_KEY = 'fashion_guest_profile';
const GUEST_LIMIT_KEY = 'fashion_guest_limit';

export const GUEST_DAILY_LIMIT = 3;

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
    localStorage.removeItem(GUEST_LIMIT_KEY);
  },

  exists() {
    return !!this.get();
  },

  // 조회 제한
  _getLimitData() {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(GUEST_LIMIT_KEY);
    return raw ? JSON.parse(raw) : null;
  },

  canPreview() {
    const today = new Date().toISOString().slice(0, 10);
    const data = this._getLimitData();
    if (!data || data.date !== today) return true;
    return data.count < GUEST_DAILY_LIMIT;
  },

  getRemainingPreviews() {
    const today = new Date().toISOString().slice(0, 10);
    const data = this._getLimitData();
    if (!data || data.date !== today) return GUEST_DAILY_LIMIT;
    return Math.max(0, GUEST_DAILY_LIMIT - data.count);
  },

  incrementPreview() {
    if (typeof window === 'undefined') return;
    const today = new Date().toISOString().slice(0, 10);
    const data = this._getLimitData();
    const count = (data?.date === today ? data.count : 0) + 1;
    localStorage.setItem(GUEST_LIMIT_KEY, JSON.stringify({ date: today, count }));
  },
};
