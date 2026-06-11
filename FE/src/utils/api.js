import axios from 'axios';
import { mockAuthAPI, mockProfileAPI, mockOutfitAPI, mockWeatherAPI } from './mockApi';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const hadToken = localStorage.getItem('auth_token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      if (hadToken) {
        // AuthContext에 세션 만료 알림 → user state 초기화
        window.dispatchEvent(new CustomEvent('clotai:unauthorized'));
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

// NestJS 응답: { success, message, data: { user, token } }
const realAuthAPI = {
  login: async (data) => {
    const res = await api.post('/api/auth/login', data);
    return { data: res.data.data }; // { user, token }
  },
  signup: async (data) => {
    const res = await api.post('/api/auth/signup', data);
    return { data: res.data.data };
  },
  logout: () => api.post('/api/auth/logout'),
  sendVerification: (email) => api.post('/api/auth/email/send', { email }),
  verifyCode: (email, code) => api.post('/api/auth/email/verify', { email, code }),
  me: async () => {
    const res = await api.get('/api/auth/me');
    return { data: res.data.data };
  },
};

const realProfileAPI = {
  get: async () => {
    const res = await api.get('/api/profile');
    return { data: res.data.data };
  },
  update: async (data) => {
    const res = await api.post('/api/profile', data);
    return { data: res.data.data };
  },
  uploadImage: async (file) => {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post('/api/profile/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: res.data.data };
  },
};

const realWeatherAPI = {
  getByCity: async (city) => {
    const res = await api.get('/api/weather', { params: { city } });
    return { data: res.data.data };
  },
  getByCoords: async (lat, lon) => {
    const res = await api.get('/api/weather', { params: { lat, lon } });
    return { data: res.data.data };
  },
};

const realOutfitAPI = {
  warmup: async () => {
    try { await api.post('/api/outfit/warmup'); } catch { /* 무시 */ }
  },
  recommend: async (data) => {
    const res = await api.post('/api/outfit/recommend', data);
    return { data: res.data.data };
  },
  getHistory: async () => {
    const res = await api.get('/api/outfit/history');
    return { data: res.data.data };
  },
  getOne: async (id) => {
    const res = await api.get(`/api/outfit/${id}`);
    return { data: res.data.data };
  },
};

export const favoriteAPI = {
  toggle: async (outfitId) => {
    const res = await api.post('/api/favorite/toggle', { outfitId });
    return { data: res.data.data };
  },
  getAll: async () => {
    const res = await api.get('/api/favorite');
    return { data: res.data.data };
  },
  check: async (outfitId) => {
    const res = await api.get(`/api/favorite/${outfitId}`);
    return { data: res.data.data };
  },
};

export const authAPI    = USE_MOCK ? mockAuthAPI    : realAuthAPI;
export const profileAPI = USE_MOCK ? mockProfileAPI : realProfileAPI;
export const weatherAPI = USE_MOCK ? mockWeatherAPI : realWeatherAPI;
export const outfitAPI  = USE_MOCK ? mockOutfitAPI  : realOutfitAPI;

export default api;
