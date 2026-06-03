'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const EMAIL_VERIFICATION_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION === 'true';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN = 60;

// ── 단계 1: 회원가입 폼 ──────────────────────────────────────────
function SignupFields({ onSubmit, isLoading, serverError, continueAsGuest }) {
  const router = useRouter();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const handleGuest = () => {
    continueAsGuest();
    router.push('/');
  };

  return (
    <div className="auth-card animate-slide-up">
      <div className="px-8 pt-10 pb-6">
        <Link href="/" className="text-2xl font-bold tracking-tight block mb-8">
          Clot<span className="text-rose-500">AI</span>
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">시작해볼까요</h1>
        <p className="text-sm text-zinc-500 mt-1">AI가 나만의 스타일을 찾아드릴게요</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-6 space-y-4">
        {/* 이름 */}
        <div>
          <label className="label">이름 (닉네임)</label>
          <input
            type="text"
            placeholder="홍길동"
            className={`input-field ${errors.name ? 'input-error' : ''}`}
            {...register('name', {
              required: '이름을 입력해주세요.',
              minLength: { value: 2, message: '2자 이상 입력해주세요.' },
              maxLength: { value: 20, message: '20자 이하로 입력해주세요.' },
            })}
          />
          {errors.name && <p className="error-msg">{errors.name.message}</p>}
        </div>

        {/* 이메일 */}
        <div>
          <label className="label">이메일</label>
          <input
            type="email"
            placeholder="example@email.com"
            className={`input-field ${errors.email ? 'input-error' : ''}`}
            {...register('email', {
              required: '이메일을 입력해주세요.',
              pattern: { value: /\S+@\S+\.\S+/, message: '올바른 이메일 형식이 아닙니다.' },
            })}
          />
          {errors.email && <p className="error-msg">{errors.email.message}</p>}
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="label">비밀번호</label>
          <input
            type="password"
            placeholder="8자 이상, 영문+숫자 포함"
            className={`input-field ${errors.password ? 'input-error' : ''}`}
            {...register('password', {
              required: '비밀번호를 입력해주세요.',
              minLength: { value: 8, message: '8자 이상 입력해주세요.' },
              pattern: {
                value: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                message: '영문과 숫자를 모두 포함해야 합니다.',
              },
            })}
          />
          {errors.password && <p className="error-msg">{errors.password.message}</p>}
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label className="label">비밀번호 확인</label>
          <input
            type="password"
            placeholder="비밀번호 재입력"
            className={`input-field ${errors.confirmPassword ? 'input-error' : ''}`}
            {...register('confirmPassword', {
              required: '비밀번호를 다시 입력해주세요.',
              validate: (v) => v === password || '비밀번호가 일치하지 않습니다.',
            })}
          />
          {errors.confirmPassword && <p className="error-msg">{errors.confirmPassword.message}</p>}
        </div>

        {/* 약관 동의 */}
        <div className="flex items-start gap-3 pt-1">
          <input
            type="checkbox"
            id="terms"
            className="mt-0.5 w-4 h-4 rounded border-zinc-300 text-rose-500 focus:ring-rose-400 cursor-pointer"
            {...register('terms', { required: '이용약관에 동의해주세요.' })}
          />
          <label htmlFor="terms" className="text-xs text-zinc-500 cursor-pointer leading-relaxed">
            <span className="font-medium text-zinc-700">이용약관</span> 및{' '}
            <span className="font-medium text-zinc-700">개인정보처리방침</span>에 동의합니다.
          </label>
        </div>
        {errors.terms && <p className="error-msg -mt-2">{errors.terms.message}</p>}

        {/* 이메일 인증 안내 */}
        {EMAIL_VERIFICATION_ENABLED && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="text-blue-400 text-base">✉</span>
            <p className="text-xs text-blue-600">
              입력한 이메일로 인증 코드가 발송됩니다.
            </p>
          </div>
        )}

        {serverError && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
            {serverError}
          </div>
        )}

        <button type="submit" className="btn-rose w-full py-3.5 mt-2" disabled={isLoading}>
          {isLoading
            ? (EMAIL_VERIFICATION_ENABLED ? '인증 코드 발송 중...' : '가입 중...')
            : '회원가입'}
        </button>
      </form>

      <div className="px-8 flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-zinc-100" />
        <span className="text-xs text-zinc-400">또는</span>
        <div className="flex-1 h-px bg-zinc-100" />
      </div>

      <div className="px-8 pb-8">
        <button onClick={handleGuest} className="btn-secondary w-full py-3.5">
          게스트로 먼저 둘러보기
        </button>
        <p className="text-center text-sm text-zinc-500 mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-semibold text-zinc-800 hover:text-rose-500">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── 단계 2: 인라인 이메일 인증 ────────────────────────────────────
function InlineVerification({ email, onVerified, onBack }) {
  const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRefs = useRef([]);
  const timerRef = useRef(null);

  // 컴포넌트 마운트 시 첫 입력칸 포커스 + 쿨다운 시작
  useEffect(() => {
    inputRefs.current[0]?.focus();
    startCooldown();
    return () => clearInterval(timerRef.current);
  }, []);

  const startCooldown = () => {
    clearInterval(timerRef.current);
    setCooldown(RESEND_COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

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
    if (joined.length < CODE_LENGTH) { setError('6자리를 모두 입력해주세요.'); return; }
    setIsVerifying(true);
    setError('');
    try {
      const { authAPI } = await import('@/utils/api');
      const res = await authAPI.verifyCode(email, joined);
      onVerified(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || '인증 코드가 올바르지 않습니다.');
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
        <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
          <span className="font-semibold text-zinc-700">{email}</span>로<br />
          발송된 6자리 코드를 입력해주세요.
        </p>
      </div>

      <div className="px-8 pb-8 space-y-5">
        {/* 코드 입력 */}
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
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
                ${digit ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-zinc-200 bg-white text-zinc-900'}
                ${error ? 'border-rose-500 bg-rose-50' : ''}
                focus:border-rose-500
              `}
            />
          ))}
        </div>

        {error && <p className="text-center text-sm text-rose-500">{error}</p>}

        <button
          onClick={handleVerify}
          className="btn-rose w-full py-3.5"
          disabled={isVerifying || code.join('').length < CODE_LENGTH}
        >
          {isVerifying ? '확인 중...' : '인증 확인'}
        </button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-zinc-400">코드를 못 받으셨나요?</span>
          <button
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            className="text-sm font-semibold text-rose-500 hover:text-rose-600 disabled:text-zinc-300 disabled:cursor-not-allowed transition-colors"
          >
            {cooldown > 0 ? `재전송 (${cooldown}s)` : isResending ? '전송 중...' : '재전송'}
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ← 이메일 주소 변경
        </button>
      </div>
    </div>
  );
}

// ── 완료 화면 ────────────────────────────────────────────────────
function SuccessScreen() {
  return (
    <div className="auth-card animate-fade-in text-center px-8 py-16">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-zinc-900 mb-2">가입 완료!</h2>
      <p className="text-sm text-zinc-500">프로필 설정 페이지로 이동합니다...</p>
    </div>
  );
}

// ── 메인 SignupForm ───────────────────────────────────────────────
export default function SignupForm() {
  const { login, continueAsGuest } = useAuth();
  const router = useRouter();
  const [phase, setPhase] = useState('form');   // 'form' | 'verify' | 'done'
  const [email, setEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (data) => {
    setIsLoading(true);
    setServerError('');
    try {
      const { authAPI } = await import('@/utils/api');
      const payload = { email: data.email, password: data.password, name: data.name };

      if (EMAIL_VERIFICATION_ENABLED) {
        // 인증 코드 발송 후 인라인 인증 단계로 전환
        await authAPI.signup(payload);
        setEmail(data.email);
        setPhase('verify');
      } else {
        // 이메일 인증 없이 바로 로그인
        const res = await authAPI.signup(payload);
        login(res.data.user, res.data.token);
        router.push('/profile');
      }
    } catch (err) {
      setServerError(err.response?.data?.message || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerified = (userData, token) => {
    setPhase('done');
    login(userData, token);
    setTimeout(() => router.push('/profile'), 1500);
  };

  if (phase === 'verify') {
    return (
      <InlineVerification
        email={email}
        onVerified={handleVerified}
        onBack={() => setPhase('form')}
      />
    );
  }

  if (phase === 'done') {
    return <SuccessScreen />;
  }

  return (
    <SignupFields
      onSubmit={handleFormSubmit}
      isLoading={isLoading}
      serverError={serverError}
      continueAsGuest={continueAsGuest}
    />
  );
}
