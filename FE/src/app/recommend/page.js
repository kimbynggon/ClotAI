'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
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

const FALLBACK_RESULT = {
  id: 0,
  outfit: SEASON_PRESETS.spring.outfit,
  reason: '오늘은 기온이 22°C로 쾌적한 봄 날씨입니다. 회원가입하면 체형·취향에 맞는 나만의 코디를 받을 수 있어요.',
  styleKeyword: SEASON_PRESETS.spring.styleKeyword,
  colorPalette: SEASON_PRESETS.spring.colorPalette,
  weather: { city: '서울', temperature: 22, feelsLike: 21, weatherDescription: '맑음', season: 'spring', isRaining: false, isSnowing: false },
  createdAt: new Date().toISOString(),
};

function buildPreviewResult(weather) {
  const season = weather.season ?? 'spring';
  const preset = SEASON_PRESETS[season] ?? SEASON_PRESETS.spring;
  const outer = weather.isRaining
    ? (preset.outfit.outer ?? '방수 바람막이')
    : preset.outfit.outer;
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
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [loading, user, isGuest, router]);

  useEffect(() => {
    if (!isGuest) return;
    setPreviewLoading(true);
    import('@/utils/api').then(({ weatherAPI }) =>
      weatherAPI.getByCity('서울')
        .then(({ data }) => setPreviewResult(buildPreviewResult(data)))
        .catch(() => setPreviewResult(FALLBACK_RESULT))
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
      const msg = err.response?.data?.message;
      setError(msg || '추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
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

          <div className="opacity-50 pointer-events-none select-none">
            {previewLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <OutfitCard result={previewResult ?? FALLBACK_RESULT} showActions={false} />
            )}
          </div>

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

        {/* 입력 폼 — 결과가 없을 때만 표시 */}
        {!result && (
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

              {error && <p className="text-rose-500 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleGPS}
                  disabled={isLoading}
                  className="btn-secondary flex-1 py-3"
                >
                  📍 현재 위치
                </button>
                <button type="submit" disabled={isLoading} className="btn-rose flex-1 py-3">
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      분석 중...
                    </span>
                  ) : (
                    '추천 받기'
                  )}
                </button>
              </div>
            </form>

            {isLoading && (
              <p className="text-center text-zinc-400 text-xs mt-4">
                AI가 날씨와 취향을 분석 중이에요. 잠시만 기다려주세요 ✨
              </p>
            )}
          </div>
        )}

        {/* 추천 결과 */}
        {result && (
          <OutfitCard result={result} onRetry={() => setResult(null)} />
        )}
      </main>
    </>
  );
}
