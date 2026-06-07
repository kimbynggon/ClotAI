'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';
import OutfitCard from '@/components/outfit/OutfitCard';

const SAMPLE_RESULT = {
  id: 0,
  outfit: {
    top: '화이트 오버사이즈 린넨 셔츠',
    bottom: '베이지 와이드 슬랙스',
    outer: null,
    shoes: '화이트 캔버스 스니커즈',
    accessory: '라탄 버킷백',
  },
  reason: '오늘은 기온이 22°C로 쾌적한 봄 날씨입니다. 캐주얼 미니멀 스타일을 선호하시는 분께 린넨 소재의 가벼운 코디를 추천드립니다. 직사각형 체형에 어울리는 와이드 실루엣으로 균형 잡힌 비율을 연출하세요.',
  styleKeyword: '캐주얼 미니멀',
  colorPalette: ['white', 'beige', 'light tan'],
  weather: {
    city: '서울',
    temperature: 22,
    feelsLike: 21,
    weatherDescription: '맑음',
    season: 'spring',
    isRaining: false,
    isSnowing: false,
  },
  createdAt: new Date().toISOString(),
};

export default function RecommendPage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [loading, user, isGuest, router]);

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
            <OutfitCard result={SAMPLE_RESULT} showActions={false} />
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
