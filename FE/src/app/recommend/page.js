'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { guestStorage, GUEST_DAILY_LIMIT } from '@/utils/guestStorage';
import Header from '@/components/common/Header';
import OutfitCard from '@/components/outfit/OutfitCard';

export default function RecommendPage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [hasProfile, setHasProfile] = useState(null);
  const [memberLimitReached, setMemberLimitReached] = useState(false);
  const [aiReady, setAiReady] = useState(false);
  const [aiWarmingUp, setAiWarmingUp] = useState(false);

  // 게스트 전용 상태
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState(GUEST_DAILY_LIMIT);

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.replace('/login');
    }
  }, [loading, user, isGuest, router]);

  useEffect(() => {
    if (!user) return;
    import('@/utils/api').then(({ profileAPI, outfitAPI }) => {
      // warmup — AI 서비스가 실제로 응답할 때까지 대기
      setAiWarmingUp(true);
      outfitAPI.warmup?.().then((ready) => {
        setAiReady(!!ready);
        setAiWarmingUp(false);
      });
      profileAPI.get()
        .then((res) => setHasProfile(!!res.data))
        .catch(() => setHasProfile(false));
    });
  }, [user]);

  useEffect(() => {
    if (!isGuest) return;
    const rem = guestStorage.getRemainingRecommends();
    setRemaining(rem);
    setLimitReached(!guestStorage.canRecommend());
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
        setMemberLimitReached(true);
      } else {
        setError(msg || '추천 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGuestRecommend = async (payload) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const { guestOutfitAPI } = await import('@/utils/api');
      const res = await guestOutfitAPI.recommend(payload);
      // fallback(AI 준비 중) 결과는 횟수 차감 안 함
      if (!res.data.isFallback) {
        guestStorage.incrementRecommend();
        const rem = guestStorage.getRemainingRecommends();
        setRemaining(rem);
        if (rem === 0) setLimitReached(true);
      }
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
    if (isGuest) {
      fetchGuestRecommend({ city: city.trim() });
    } else {
      fetchRecommend({ city: city.trim() });
    }
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
      ({ coords }) => {
        const payload = { lat: coords.latitude, lon: coords.longitude };
        if (isGuest) {
          fetchGuestRecommend(payload);
        } else {
          fetchRecommend(payload);
        }
      },
      () => {
        setError('현재 준비중입니다. 도시명을 직접 입력해주세요.');
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
        <main className="pt-24 max-w-lg mx-auto px-4 pb-12">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 mb-1">오늘의 OOTD</h1>
            <p className="text-zinc-500 text-sm">날씨를 분석해 코디를 추천해드려요</p>
          </div>

          {/* 남은 횟수 안내 */}
          {!limitReached && (
            <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-700">
              <span>오늘 남은 추천 횟수</span>
              <span className="font-bold">{remaining} / {GUEST_DAILY_LIMIT}회</span>
            </div>
          )}

          {/* 한도 초과 */}
          {limitReached && (
            <div className="card p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-zinc-900 mb-1">오늘 추천 횟수를 모두 사용했습니다</p>
                <p className="text-sm text-zinc-500">
                  게스트는 하루 {GUEST_DAILY_LIMIT}회까지 추천이 가능합니다.<br />
                  회원가입하면 하루 15회까지 이용할 수 있어요.
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <Link href="/signup" className="btn-rose py-3 px-6">무료 회원가입</Link>
                <Link href="/login" className="btn-secondary py-3 px-6">로그인</Link>
              </div>
            </div>
          )}

          {/* 입력 폼 */}
          {!limitReached && !result && (
            <div className="card p-6 mb-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">도시 이름</label>
                  <input
                    type="text"
                    placeholder="예: 서울, 강남구, 해운대구, 부산, 제주"
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
                  날씨를 분석하고 있어요. 잠시만 기다려주세요 ✨
                </p>
              )}
            </div>
          )}

          {/* 결과 */}
          {result && (
            <>
              <OutfitCard result={result} onRetry={() => { setResult(null); setError(''); }} showActions isGuest />
              <div className="mt-4 card p-4 flex items-center justify-between gap-3">
                <p className="text-sm text-zinc-500">추천 결과는 저장되지 않아요</p>
                <div className="flex gap-2 shrink-0">
                  <Link href="/login" className="btn-ghost text-xs py-2 px-3">로그인</Link>
                  <Link href="/signup" className="btn-rose text-xs py-2 px-3">회원가입</Link>
                </div>
              </div>
            </>
          )}
        </main>
      </>
    );
  }

  // 로그인 사용자
  return (
    <>
      <Header />
      <main className="pt-24 max-w-lg mx-auto px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-1">오늘의 OOTD</h1>
          <p className="text-zinc-500 text-sm">날씨와 취향을 분석해 코디를 추천해드려요</p>
        </div>

        {/* 일일 추천 한도 초과 */}
        {memberLimitReached && (
          <div className="card p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-zinc-900 mb-1">오늘 추천 횟수를 모두 사용했습니다</p>
              <p className="text-sm text-zinc-500">내일 다시 추천 받아보실 수 있습니다</p>
            </div>
          </div>
        )}

        {/* 프로필 확인 중 */}
        {!memberLimitReached && hasProfile === null && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* 프로필 미등록 */}
        {!memberLimitReached && hasProfile === false && (
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

        {/* AI 워밍업 상태 배너 */}
        {!memberLimitReached && hasProfile && !result && aiWarmingUp && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 mb-4">
            <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-800">AI 서비스 준비 중입니다</p>
              <p className="text-xs text-blue-600 mt-0.5">
                잠시만 기다려주시면 체형·취향 맞춤 AI 추천을 받으실 수 있어요.
              </p>
            </div>
          </div>
        )}

        {!memberLimitReached && hasProfile && !result && (
          <div className="card p-6 mb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">도시 이름</label>
                <input
                  type="text"
                  placeholder="예: 서울, 강남구, 해운대구, 부산, 제주"
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
                날씨와 취향을 분석하고 있어요. 잠시만 기다려주세요 ✨
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
