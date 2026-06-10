'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SocialCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const id    = searchParams.get('id');
    const userId = searchParams.get('user_id');
    const name  = searchParams.get('name');
    const email = searchParams.get('email');
    const provider = searchParams.get('provider');

    if (!token || !id) {
      setError('소셜 로그인에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    const user = {
      id: Number(id),
      user_id: userId,
      name,
      email,
      is_verified: true,
      provider,
    };

    login(user, token);
    router.replace('/');
  }, [searchParams, login, router]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-zinc-700 font-semibold">{error}</p>
        <button
          onClick={() => router.push('/login')}
          className="btn-rose px-6 py-3"
        >
          로그인 페이지로
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-500 text-sm">로그인 처리 중...</p>
    </div>
  );
}
