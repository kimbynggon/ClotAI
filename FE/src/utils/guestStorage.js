const GUEST_KEY = 'fashion_guest';
const GUEST_PROFILE_KEY = 'fashion_guest_profile';

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
  },

  exists() {
    return !!this.get();
  },
};
