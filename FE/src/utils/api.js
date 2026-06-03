import axios from 'axios';
import { mockAuthAPI, mockProfileAPI } from './mockApi';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ── 실제 axios 인스턴스 ─────────────────────────────────────────
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
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── 실제 API 핸들러 ────────────────────────────────────────────
const realAuthAPI = {
  login: (data) => api.post('/api/auth/login', data),
  signup: (data) => api.post('/api/auth/signup', data),
  logout: () => api.post('/api/auth/logout'),
  sendVerification: (email) => api.post('/api/auth/email/send', { email }),
  verifyCode: (email, code) => api.post('/api/auth/email/verify', { email, code }),
  me: () => api.get('/api/auth/me'),
};

const realProfileAPI = {
  get: () => api.get('/api/profile'),
  update: (data) => api.put('/api/profile', data),
};

// ── 환경에 따라 자동 선택 ─────────────────────────────────────
export const authAPI   = USE_MOCK ? mockAuthAPI   : realAuthAPI;
export const profileAPI = USE_MOCK ? mockProfileAPI : realProfileAPI;

export default api;
