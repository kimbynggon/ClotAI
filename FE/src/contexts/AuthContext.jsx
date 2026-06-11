'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { guestStorage } from '@/utils/guestStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const token = localStorage.getItem('auth_token');
      const raw = localStorage.getItem('auth_user');
      if (token && raw) {
        setUser(JSON.parse(raw));
      } else if (guestStorage.exists()) {
        setIsGuest(true);
      }
    } catch {
      // 손상된 localStorage 데이터 무시
    } finally {
      setLoading(false);
    }
  }, []);

  // api.js 인터셉터에서 세션 만료 이벤트를 받아 자동 로그아웃
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setIsGuest(false);
    };
    window.addEventListener('clotai:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('clotai:unauthorized', handleUnauthorized);
  }, []);

  const login = useCallback((userData, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    guestStorage.clear();
    setUser(userData);
    setIsGuest(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    const guest = guestStorage.init();
    setIsGuest(true);
    return guest;
  }, []);

  const exitGuest = useCallback(() => {
    guestStorage.clear();
    setIsGuest(false);
  }, []);

  const updateUser = useCallback((updated) => {
    const next = { ...user, ...updated };
    localStorage.setItem('auth_user', JSON.stringify(next));
    setUser(next);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, login, logout, continueAsGuest, exitGuest, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다.');
  return ctx;
}
