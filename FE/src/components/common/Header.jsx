'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { user, isGuest, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { authAPI } = await import('@/utils/api');
      await authAPI.logout().catch(() => {});
    } finally {
      logout();
      router.push('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            Clot<span className="text-rose-500">AI</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {(user || isGuest) && (
            <Link href="/recommend" className="btn-ghost text-sm">OOTD 추천</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/profile" className="btn-ghost text-sm">
                <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xs font-bold">
                  {user.name?.[0] ?? 'U'}
                </span>
                <span className="hidden sm:inline">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                로그아웃
              </button>
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
      </div>
    </header>
  );
}
