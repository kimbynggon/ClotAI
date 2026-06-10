'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';

export default function LoginForm() {
  const { login, continueAsGuest } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      const { authAPI } = await import('@/utils/api');
      const res = await authAPI.login(data);
      login(res.data.user, res.data.token);
      router.push('/');
    } catch (err) {
      const msg = err.response?.data?.message;
      setServerError(msg || '아이디 또는 비밀번호를 확인해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    router.push('/');
  };

  return (
    <div className="auth-card animate-slide-up">
      {/* 헤더 */}
      <div className="px-8 pt-10 pb-6">
        <Link href="/" className="text-2xl font-bold tracking-tight block mb-8 hover:opacity-70 transition-opacity" title="홈으로">
          Clot<span className="text-rose-500">AI</span>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">다시 만나서 반가워요</h1>
        <p className="text-sm text-zinc-500 mt-1">로그인하고 나만의 OOTD를 받아보세요</p>
      </div>

      {/* 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-6 space-y-4">
        <div>
          <label className="label">아이디</label>
          <input
            type="text"
            placeholder="아이디 입력"
            className={`input-field ${errors.user_id ? 'input-error' : ''}`}
            {...register('user_id', {
              required: '아이디를 입력해주세요.',
            })}
          />
          {errors.user_id && <p className="error-msg">{errors.user_id.message}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0">비밀번호</label>
            <Link href="/forgot-password" className="text-xs text-zinc-400 hover:text-rose-500 transition-colors">
              비밀번호 찾기
            </Link>
          </div>
          <input
            type="password"
            placeholder="비밀번호 입력"
            className={`input-field ${errors.password ? 'input-error' : ''}`}
            {...register('password', { required: '비밀번호를 입력해주세요.' })}
          />
          {errors.password && <p className="error-msg">{errors.password.message}</p>}
        </div>

        {serverError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
            {serverError}
          </div>
        )}

        <button type="submit" className="btn-primary w-full py-3.5 mt-2" disabled={isLoading}>
          {isLoading ? '로그인 중...' : '로그인'}
        </button>
      </form>

      {/* 구분선 */}
      <div className="px-8 flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400">또는</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      {/* 소셜 로그인 */}
      <div className="px-8 mb-4">
        <SocialLoginButtons />
      </div>

      {/* 구분선 */}
      <div className="px-8 flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400">또는</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      {/* 게스트 로그인 */}
      <div className="px-8 pb-8">
        <button onClick={handleGuest} className="btn-secondary w-full py-3.5">
          게스트로 둘러보기
        </button>
        <p className="text-center text-sm text-zinc-500 mt-6">
          아직 계정이 없으신가요?{' '}
          <Link href="/signup" className="font-semibold text-rose-500 hover:text-rose-600">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
