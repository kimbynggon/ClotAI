'use client';

/**
 * 이메일 인증 컴포넌트 (독립 모듈)
 *
 * 제거 방법: 이 파일과 /signup/verify/page.js 를 삭제하고
 * .env.local 에서 NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=false 로 변경
 * → 나머지 코드에 영향 없음
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function EmailVerification() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('verify_email');
    if (!stored) {
      router.replace('/signup');
      return;
    }
    setEmail(stored);
    inputRefs.current[0]?.focus();
  }, [router]);

  // 재전송 쿨다운 타이머
  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const handleInput = (idx, val) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...code];
    next[idx] = char;
    setCode(next);
    setError('');
    if (char && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    const next = Array(CODE_LENGTH).fill('');
    pasted.split('').forEach((c, i) => { next[i] = c; });
    setCode(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const joined = code.join('');
    if (joined.length < CODE_LENGTH) {
      setError('인증 코드 6자리를 모두 입력해주세요.');
      return;
    }
    setIsVerifying(true);
    setError('');
    try {
      const { authAPI } = await import('@/utils/api');
      const res = await authAPI.verifyCode(email, joined);
      setIsVerified(true);
      sessionStorage.removeItem('verify_email');
      login(res.data.user, res.data.token);
      setTimeout(() => router.push('/profile'), 1500);
    } catch (err) {
      const msg = err.response?.data?.message;
      setError(msg || '인증 코드가 올바르지 않습니다.');
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setIsResending(true);
    setError('');
    try {
      const { authAPI } = await import('@/utils/api');
      await authAPI.sendVerification(email);
      startCooldown();
    } catch {
      setError('재전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className="auth-card animate-fade-in text-center px-8 py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">인증 완료!</h2>
        <p className="text-sm text-zinc-500">프로필 설정 페이지로 이동합니다...</p>
      </div>
    );
  }

  return (
    <div className="auth-card animate-slide-up">
      <div className="px-8 pt-10 pb-6">
        <Link href="/" className="text-2xl font-bold tracking-tight block mb-8">
          Clot<span className="text-rose-500">AI</span>
        </Link>

        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900">이메일 인증</h1>
        <p className="text-sm text-zinc-500 mt-1">
          <span className="font-medium text-zinc-700">{email}</span>로 발송된<br />
          6자리 인증 코드를 입력해주세요.
        </p>
      </div>

      <div className="px-8 pb-8">
        {/* 코드 입력 칸 */}
        <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`
                w-12 h-14 text-center text-xl font-bold border-2 rounded-xl
                focus:outline-none transition-all duration-200
                ${digit ? 'border-rose-400 bg-rose-50' : 'border-zinc-200 bg-white'}
                ${error ? 'border-rose-500' : ''}
                focus:border-rose-500 focus:bg-rose-50
              `}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-rose-500 mb-4">{error}</p>
        )}

        <button
          onClick={handleVerify}
          className="btn-rose w-full py-3.5"
          disabled={isVerifying || code.join('').length < CODE_LENGTH}
        >
          {isVerifying ? '확인 중...' : '인증 확인'}
        </button>

        <div className="flex items-center justify-center gap-2 mt-5">
          <span className="text-sm text-zinc-400">코드를 받지 못하셨나요?</span>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-sm font-semibold text-rose-500 hover:text-rose-600 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
          >
            {cooldown > 0 ? `재전송 (${cooldown}s)` : isResending ? '전송 중...' : '재전송'}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-4">
          이메일 주소가 잘못됐나요?{' '}
          <Link href="/signup" className="text-zinc-500 underline hover:text-zinc-700">
            돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
