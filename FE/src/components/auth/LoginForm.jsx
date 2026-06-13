'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SocialLoginButtons from './SocialLoginButtons';

const SAVED_ID_KEY = 'saved_user_id';

export default function LoginForm() {
  const { login, continueAsGuest } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get('expired') === '1';
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [saveId, setSaveId] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    const saved = localStorage.getItem(SAVED_ID_KEY);
    if (saved) {
      setValue('user_id', saved);
      setSaveId(true);
    }
  }, [setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      const { authAPI } = await import('@/utils/api');
      const res = await authAPI.login(data);
      if (saveId) {
        localStorage.setItem(SAVED_ID_KEY, data.user_id);
      } else {
        localStorage.removeItem(SAVED_ID_KEY);
      }
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

      {/* 세션 만료 안내 */}
      {isExpired && (
        <div className="mx-8 mb-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          세션이 만료되었습니다. 다시 로그인해주세요.
        </div>
      )}

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
          <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={saveId}
              onChange={(e) => setSaveId(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-300 accent-rose-500"
            />
            <span className="text-xs text-zinc-500">아이디 저장</span>
          </label>
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
