'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

function ProviderIcon({ provider }) {
  if (provider === 'google') {
    return (
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
    );
  }
  if (provider === 'kakao') {
    return (
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#FEE500] shrink-0">
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="#3C1E1E">
          <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.572 1.494 4.833 3.754 6.218l-.952 3.556a.375.375 0 00.542.416l4.155-2.75A11.55 11.55 0 0012 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
        </svg>
      </span>
    );
  }
  return null;
}

export default function Header() {
  const { user, isGuest, logout, exitGuest } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const { authAPI } = await import('@/utils/api');
      await authAPI.logout().catch(() => {});
    } finally {
      logout();
      router.push('/');
    }
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <span className="text-xl font-bold tracking-tight">
            Clot<span className="text-rose-500">AI</span>
          </span>
        </Link>

        {/* PC 네비게이션 */}
        <nav className="hidden md:flex items-center gap-1">
          {(user || isGuest) && (
            <Link href="/recommend" className="btn-ghost text-sm">OOTD 추천</Link>
          )}
        </nav>

        {/* PC 우측 액션 */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile" className="btn-ghost text-sm">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  {user.name?.[0] ?? 'U'}
                </span>
                <span className="hidden sm:inline">{user.name}</span>
                <ProviderIcon provider={user.provider} />
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                로그아웃
              </button>
            </>
          ) : isGuest ? (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-200">
                <span className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-bold">G</span>
                <span className="text-xs font-medium text-zinc-600">게스트</span>
              </div>
              <button
                onClick={() => { exitGuest(); router.push('/'); }}
                className="btn-secondary text-sm py-2 px-4"
              >
                게스트 해제
              </button>
              <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                회원가입
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-sm py-2 px-4">로그인</Link>
              <Link href="/signup" className="btn-primary text-sm py-2 px-4">
                회원가입
              </Link>
            </>
          )}
        </div>

        {/* 모바일 햄버거 버튼 */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-zinc-100 transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴 열기"
        >
          {menuOpen ? (
            <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-zinc-100 shadow-sm">
          <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {user ? (
              <>
                {/* 사용자 프로필 */}
                <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                  <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-sm font-bold shrink-0">
                    {user.name?.[0] ?? 'U'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate flex items-center gap-1.5">
                      {user.name}
                      <ProviderIcon provider={user.provider} />
                    </p>
                    <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="h-px bg-zinc-100 mb-1" />
                <Link href="/recommend" onClick={closeMenu} className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-700 transition-colors">
                  OOTD 추천
                </Link>
                <Link href="/profile" onClick={closeMenu} className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-700 transition-colors">
                  내 프로필
                </Link>
                <Link href="/history" onClick={closeMenu} className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-700 transition-colors">
                  추천 이력
                </Link>
                <div className="h-px bg-zinc-100 my-1" />
                <button
                  onClick={() => { handleLogout(); closeMenu(); }}
                  className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-500 text-left transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : isGuest ? (
              <>
                {/* 게스트 프로필 */}
                <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
                  <span className="w-9 h-9 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-sm font-bold shrink-0">G</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">게스트</p>
                    <p className="text-xs text-zinc-400">게스트 모드로 이용 중</p>
                  </div>
                </div>
                <div className="h-px bg-zinc-100 mb-1" />
                <Link href="/recommend" onClick={closeMenu} className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-700 transition-colors">
                  OOTD 추천
                </Link>
                <div className="h-px bg-zinc-100 my-1" />
                <button
                  onClick={() => { exitGuest(); router.push('/'); closeMenu(); }}
                  className="px-3 py-2.5 rounded-lg hover:bg-zinc-50 text-sm text-zinc-500 text-left transition-colors"
                >
                  게스트 해제
                </button>
                <Link href="/signup" onClick={closeMenu} className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-semibold mt-1 transition-colors hover:bg-rose-600">
                  회원가입
                </Link>
                <Link href="/login" onClick={closeMenu} className="flex items-center justify-center px-3 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 text-sm mt-1 transition-colors hover:bg-zinc-50">
                  로그인
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={closeMenu} className="flex items-center justify-center px-3 py-2.5 rounded-lg border border-zinc-200 text-zinc-700 text-sm transition-colors hover:bg-zinc-50">
                  로그인
                </Link>
                <Link href="/signup" onClick={closeMenu} className="flex items-center justify-center px-3 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-semibold mt-1 transition-colors hover:bg-rose-600">
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
