'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { guestStorage, GUEST_DAILY_LIMIT } from '@/utils/guestStorage';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';
import OutfitCard from '@/components/outfit/OutfitCard';

const SEASON_PRESETS = {
  spring: {
    outfit: { top: '화이트 오버사이즈 린넨 셔츠', bottom: '베이지 와이드 슬랙스', outer: null, shoes: '화이트 캔버스 스니커즈', accessory: '라탄 버킷백' },
    styleKeyword: '캐주얼 미니멀',
    colorPalette: ['white', 'beige', 'light tan'],
  },
  summer: {
    outfit: { top: '스트라이프 반팔 린넨 셔츠', bottom: '아이보리 반바지', outer: null, shoes: '슬립온 스니커즈', accessory: '패브릭 크로스백' },
    styleKeyword: '서머 캐주얼',
    colorPalette: ['ivory', 'navy', 'white'],
  },
  autumn: {
    outfit: { top: '머스타드 니트 스웨터', bottom: '다크 브라운 슬랙스', outer: '카멜 울 블레이저', shoes: '첼시 부츠', accessory: '레더 토트백' },
    styleKeyword: '오텀 클래식',
    colorPalette: ['mustard', 'camel', 'dark brown'],
  },
  winter: {
    outfit: { top: '크림 터틀넥 니트', bottom: '차콜 울 슬랙스', outer: '네이비 롱 코트', shoes: '블랙 앵클 부츠', accessory: '울 머플러' },
    styleKeyword: '모던 윈터',
    colorPalette: ['cream', 'charcoal', 'navy'],
  },
};

function buildPreviewResult(weather) {
  const season = weather.season ?? 'spring';
  const preset = SEASON_PRESETS[season] ?? SEASON_PRESETS.spring;
  const outer = weather.isRaining ? (preset.outfit.outer ?? '방수 바람막이') : preset.outfit.outer;
  const tempText = `${Math.round(weather.temperature)}°C`;
  const reason = `오늘 ${weather.city ?? '서울'}은 ${tempText}, ${weather.weatherDescription} 날씨예요. 회원가입하면 체형·취향까지 반영한 나만의 코디를 받을 수 있어요.`;
  return {
    id: 0,
    outfit: { ...preset.outfit, outer },
    reason,
    styleKeyword: preset.styleKeyword,
    colorPalette: preset.colorPalette,
    weather,
    createdAt: new Date().toISOString(),
  };
}

export default function RecommendPage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hasProfile, setHasProfile] = useState(null); // null=확인중, true/false=확인완료
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState(GUEST_DAILY_LIMIT);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [loading, user, isGuest, router]);

  useEffect(() => {
    if (!user) return;
    import('@/utils/api').then(({ profileAPI }) =>
      profileAPI.get()
        .then((res) => setHasProfile(!!res.data))
        .catch(() => setHasProfile(false))
    );
  }, [user]);

  useEffect(() => {
    if (!isGuest) return;

    const canView = guestStorage.canPreview();
    const rem = guestStorage.getRemainingPreviews();
    setRemaining(rem);

    if (!canView) {
      setLimitReached(true);
      return;
    }

    setPreviewLoading(true);
    import('@/utils/api').then(({ weatherAPI }) =>
      weatherAPI.getByCity('서울')
        .then(({ data }) => {
          setPreviewResult(buildPreviewResult(data));
          guestStorage.incrementPreview();
          setRemaining(guestStorage.getRemainingPreviews());
        })
        .catch(() => setPreviewError(true))
        .finally(() => setPreviewLoading(false))
    );
  }, [isGuest]);

  const fetchRecommend = async (payload) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const { outfitAPI } = await import('@/utils/api');
      const res = await outfitAPI.recommend(payload);
      setResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.message;
      if (status === 429) {
        setError(msg || '오늘의 추천 횟수(15회)를 초과했습니다. 내일 다시 이용해주세요.');
      } else {
        setError(msg || '추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!city.trim()) {
      setError('도시명을 입력해주세요.');
      return;
    }
    fetchRecommend({ city: city.trim() });
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 정보를 지원하지 않습니다.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => fetchRecommend({ lat: coords.latitude, lon: coords.longitude }),
      () => {
        setError('위치 정보를 가져올 수 없습니다. 도시명을 직접 입력해주세요.');
        setIsLoading(false);
      },
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="pt-16 min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (isGuest) {
    return (
      <>
        <Header />
        <div className="pt-16">
          <GuestBanner />
        </div>
        <main className="max-w-lg mx-auto px-4 py-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 mb-2">오늘의 OOTD 미리보기</h1>
            <p className="text-zinc-500 text-sm">회원가입하면 나만의 체형·취향에 맞는 코디를 받을 수 있어요</p>
          </div>

          {/* 조회 제한 안내 */}
          {!limitReached && remaining < GUEST_DAILY_LIMIT && (
            <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
              <span>오늘 미리보기 남은 횟수</span>
              <span className="font-bold">{remaining}회</span>
            </div>
          )}

          {/* 조회 제한 초과 */}
          {limitReached && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-900 mb-1">오늘 미리보기 횟수를 모두 사용했습니다</p>
                <p className="text-sm text-zinc-500">게스트는 하루 {GUEST_DAILY_LIMIT}회까지 미리보기가 가능합니다.<br />회원가입하면 제한 없이 이용할 수 있어요.</p>
              </div>
            </div>
          )}

          {/* 날씨 API 오류 */}
          {previewError && !limitReached && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-900 mb-1">날씨 정보를 불러올 수 없습니다</p>
                <p className="text-sm text-zinc-500">일시적인 오류로 오늘의 OOTD 미리보기를 표시할 수 없습니다.<br />잠시 후 다시 시도하거나 회원가입 후 이용해주세요.</p>
              </div>
            </div>
          )}

          {/* 로딩 */}
          {previewLoading && !previewError && (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* 미리보기 카드 */}
          {previewResult && !previewError && !previewLoading && (
            <div className="relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-zinc-800 text-white text-xs font-medium px-3 py-1 rounded-full shadow">
                  미리보기
                </span>
              </div>
              <OutfitCard result={previewResult} showActions={false} isPreview />
            </div>
          )}

          <div className="mt-6 card p-6 text-center space-y-3">
            <p className="font-semibold text-zinc-900">나만의 OOTD 추천 받기</p>
            <p className="text-xs text-zinc-500">체형·스타일·날씨를 분석해 딱 맞는 코디를 제안해드려요</p>
            <div className="flex gap-3 justify-center pt-1">
              <Link href="/signup" className="btn-rose py-3 px-6">무료 회원가입</Link>
              <Link href="/login" className="btn-secondary py-3 px-6">로그인</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="pt-24 max-w-lg mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">오늘의 OOTD</h1>
          <p className="text-zinc-500 text-sm">날씨와 취향을 분석해 코디를 추천해드려요</p>
        </div>

        {/* 프로필 확인 중 */}
        {hasProfile === null && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 프로필 미등록 */}
        {hasProfile === false && (
          <div className="card p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">프로필을 먼저 등록해주세요</p>
              <p className="text-sm text-zinc-500">OOTD 추천을 받으려면 체형·스타일 정보가 필요해요.</p>
            </div>
            <Link href="/profile" className="btn-rose px-6 py-3 inline-block">
              프로필 등록하기
            </Link>
          </div>
        )}

        {hasProfile && !result && (
          <div className="card p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">도시 이름</label>
                <input
                  type="text"
                  placeholder="예: 서울, 부산, 제주"
                  className="input-field"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={handleGPS} disabled={isLoading} className="btn-secondary flex-1 py-3">
                  📍 현재 위치
                </button>
                <button type="submit" disabled={isLoading} className="btn-rose flex-1 py-3">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      분석 중...
                    </span>
                  ) : '추천 받기'}
                </button>
              </div>
            </form>

            {isLoading && (
              <p className="text-center text-zinc-400 text-xs mt-4">
                AI가 분석 중이에요. 처음 실행 시 최대 1분이 걸릴 수 있어요 ✨
              </p>
            )}
          </div>
        )}

        {result && (
          <OutfitCard result={result} onRetry={() => setResult(null)} showFavorite />
        )}
      </main>
    </>
  );
}
