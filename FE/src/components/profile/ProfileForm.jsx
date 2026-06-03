'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { guestStorage } from '@/utils/guestStorage';

const STEPS = ['기본 정보', '체형 정보', '스타일 취향'];

const STYLE_OPTIONS = [
  { id: 'casual', label: '캐주얼', emoji: '👕' },
  { id: 'minimal', label: '미니멀', emoji: '🤍' },
  { id: 'street', label: '스트릿', emoji: '🧢' },
  { id: 'vintage', label: '빈티지', emoji: '🎸' },
  { id: 'sporty', label: '스포티', emoji: '⚡' },
  { id: 'formal', label: '포멀', emoji: '👔' },
  { id: 'feminine', label: '페미닌', emoji: '🌸' },
  { id: 'bohemian', label: '보헤미안', emoji: '🌿' },
];

const COLOR_OPTIONS = [
  { id: 'black', label: '블랙', bg: '#0A0A0A' },
  { id: 'white', label: '화이트', bg: '#F5F5F5', border: true },
  { id: 'gray', label: '그레이', bg: '#9CA3AF' },
  { id: 'navy', label: '네이비', bg: '#1E3A5F' },
  { id: 'beige', label: '베이지', bg: '#D4B896' },
  { id: 'brown', label: '브라운', bg: '#6B4226' },
  { id: 'pastel', label: '파스텔', bg: 'linear-gradient(135deg, #FFB3C6, #BDE0FE, #B5EAD7)' },
  { id: 'vivid', label: '비비드', bg: 'linear-gradient(135deg, #FF6B6B, #FFE66D, #4ECDC4)' },
];

const BODY_TYPES = [
  { id: 'rectangle', label: '직사각형', desc: '어깨·허리·엉덩이 폭이 비슷' },
  { id: 'hourglass', label: '모래시계형', desc: '어깨·엉덩이 넓고 허리 잘록' },
  { id: 'inverted_triangle', label: '역삼각형', desc: '어깨 넓고 하체가 좁음' },
  { id: 'triangle', label: '삼각형', desc: '엉덩이가 어깨보다 넓음' },
  { id: 'oval', label: '타원형', desc: '복부 중심으로 풍성한 체형' },
];

export default function ProfileForm({ initialData = null, isSetup = false }) {
  const { user, isGuest, updateUser } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [styles, setStyles] = useState(initialData?.preferredStyles || []);
  const [colors, setColors] = useState(initialData?.preferredColors || []);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm({
    defaultValues: {
      gender: initialData?.gender || '',
      birthYear: initialData?.birthYear || '',
      height: initialData?.height || '',
      weight: initialData?.weight || '',
      bodyType: initialData?.bodyType || '',
      budget: initialData?.budget || 'mid',
    },
  });

  const toggleStyle = (id) =>
    setStyles((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  const toggleColor = (id) =>
    setColors((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);

  const nextStep = async () => {
    const fields = step === 0 ? ['gender', 'birthYear'] : ['height', 'weight', 'bodyType'];
    const valid = await trigger(fields);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = async (formData) => {
    const profile = { ...formData, preferredStyles: styles, preferredColors: colors };

    if (isGuest) {
      guestStorage.saveProfile(profile);
      router.push('/');
      return;
    }

    setIsLoading(true);
    setServerError('');
    try {
      const { profileAPI } = await import('@/utils/api');
      const res = await profileAPI.update(profile);
      updateUser(res.data);
      router.push(isSetup ? '/recommend' : '/profile');
    } catch (err) {
      const msg = err.response?.data?.message;
      setServerError(msg || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      {/* 진행 표시 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i < step ? 'bg-rose-500 text-white' : i === step ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'}
              `}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${i === step ? 'text-zinc-900' : 'text-zinc-400'}`}>
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-rose-500' : 'bg-zinc-100'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── STEP 0: 기본 정보 ── */}
        {step === 0 && (
          <div className="card p-6 space-y-5 animate-slide-up">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">기본 정보</h2>
              <p className="text-sm text-zinc-500 mt-0.5">체형에 맞는 스타일 추천을 위해 필요해요</p>
            </div>

            {/* 성별 */}
            <div>
              <label className="label">성별</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }].map(({ value, label }) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" value={value} className="sr-only peer"
                      {...register('gender', { required: '성별을 선택해주세요.' })} />
                    <div className="border-2 rounded-xl py-3 text-center text-sm font-medium transition-all
                      border-zinc-200 text-zinc-500
                      peer-checked:border-rose-400 peer-checked:text-rose-500 peer-checked:bg-rose-50
                      hover:border-zinc-300">
                      {label}
                    </div>
                  </label>
                ))}
              </div>
              {errors.gender && <p className="error-msg">{errors.gender.message}</p>}
            </div>

            {/* 출생연도 */}
            <div>
              <label className="label">출생연도</label>
              <input
                type="number"
                placeholder="예: 1998"
                className={`input-field ${errors.birthYear ? 'input-error' : ''}`}
                {...register('birthYear', {
                  required: '출생연도를 입력해주세요.',
                  min: { value: 1940, message: '올바른 출생연도를 입력해주세요.' },
                  max: { value: new Date().getFullYear() - 10, message: '올바른 출생연도를 입력해주세요.' },
                })}
              />
              {errors.birthYear && <p className="error-msg">{errors.birthYear.message}</p>}
            </div>

            <button type="button" onClick={nextStep} className="btn-primary w-full py-3.5">
              다음
            </button>
          </div>
        )}

        {/* ── STEP 1: 체형 정보 ── */}
        {step === 1 && (
          <div className="card p-6 space-y-5 animate-slide-up">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">체형 정보</h2>
              <p className="text-sm text-zinc-500 mt-0.5">내 체형에 꼭 맞는 핏을 추천해드릴게요</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">키 (cm)</label>
                <input
                  type="number"
                  placeholder="170"
                  className={`input-field ${errors.height ? 'input-error' : ''}`}
                  {...register('height', {
                    required: '키를 입력해주세요.',
                    min: { value: 100, message: '100cm 이상 입력해주세요.' },
                    max: { value: 250, message: '250cm 이하로 입력해주세요.' },
                  })}
                />
                {errors.height && <p className="error-msg">{errors.height.message}</p>}
              </div>
              <div>
                <label className="label">몸무게 (kg)</label>
                <input
                  type="number"
                  placeholder="60"
                  className={`input-field ${errors.weight ? 'input-error' : ''}`}
                  {...register('weight', {
                    required: '몸무게를 입력해주세요.',
                    min: { value: 20, message: '20kg 이상 입력해주세요.' },
                    max: { value: 300, message: '300kg 이하로 입력해주세요.' },
                  })}
                />
                {errors.weight && <p className="error-msg">{errors.weight.message}</p>}
              </div>
            </div>

            {/* 체형 유형 */}
            <div>
              <label className="label">체형 유형</label>
              <div className="space-y-2">
                {BODY_TYPES.map(({ id, label, desc }) => (
                  <label key={id} className="cursor-pointer block">
                    <input type="radio" value={id} className="sr-only peer"
                      {...register('bodyType', { required: '체형을 선택해주세요.' })} />
                    <div className="border-2 rounded-xl px-4 py-3 flex items-center justify-between transition-all
                      border-zinc-200 hover:border-zinc-300
                      peer-checked:border-rose-400 peer-checked:bg-rose-50">
                      <span className="font-medium text-sm text-zinc-800 peer-checked:text-rose-600">{label}</span>
                      <span className="text-xs text-zinc-400">{desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.bodyType && <p className="error-msg">{errors.bodyType.message}</p>}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="btn-secondary flex-1 py-3.5">
                이전
              </button>
              <button type="button" onClick={nextStep} className="btn-primary flex-1 py-3.5">
                다음
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 스타일 취향 ── */}
        {step === 2 && (
          <div className="card p-6 space-y-6 animate-slide-up">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">스타일 취향</h2>
              <p className="text-sm text-zinc-500 mt-0.5">여러 개 선택해도 좋아요</p>
            </div>

            {/* 스타일 */}
            <div>
              <label className="label">선호 스타일 (복수 선택)</label>
              <div className="grid grid-cols-4 gap-2">
                {STYLE_OPTIONS.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleStyle(id)}
                    className={`
                      border-2 rounded-xl py-3 flex flex-col items-center gap-1 transition-all
                      ${styles.includes(id)
                        ? 'border-rose-400 bg-rose-50 text-rose-600'
                        : 'border-zinc-200 text-zinc-500 hover:border-zinc-300'}
                    `}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 선호 색상 */}
            <div>
              <label className="label">선호 색상 (복수 선택)</label>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_OPTIONS.map(({ id, label, bg, border }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleColor(id)}
                    className={`
                      border-2 rounded-xl py-3 flex flex-col items-center gap-2 transition-all
                      ${colors.includes(id)
                        ? 'border-rose-400 ring-2 ring-rose-200'
                        : 'border-zinc-200 hover:border-zinc-300'}
                    `}
                  >
                    <div
                      className={`w-8 h-8 rounded-full ${border ? 'border border-zinc-200' : ''}`}
                      style={{ background: bg }}
                    />
                    <span className="text-xs font-medium text-zinc-600">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 예산 */}
            <div>
              <label className="label">평균 예산</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'low', label: '저가', sub: '~5만원' },
                  { value: 'mid', label: '중가', sub: '5~20만원' },
                  { value: 'high', label: '고가', sub: '20만원+' },
                ].map(({ value, label, sub }) => (
                  <label key={value} className="cursor-pointer">
                    <input type="radio" value={value} className="sr-only peer"
                      {...register('budget')} />
                    <div className="border-2 rounded-xl py-3 text-center transition-all
                      border-zinc-200 hover:border-zinc-300
                      peer-checked:border-rose-400 peer-checked:bg-rose-50">
                      <p className="text-sm font-semibold text-zinc-800">{label}</p>
                      <p className="text-xs text-zinc-400">{sub}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {serverError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
                {serverError}
              </div>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 py-3.5">
                이전
              </button>
              <button type="submit" className="btn-rose flex-1 py-3.5" disabled={isLoading}>
                {isLoading ? '저장 중...' : isSetup ? '완료하고 추천 받기' : '저장'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
