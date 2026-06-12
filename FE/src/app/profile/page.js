'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';
import ProfileForm from '@/components/profile/ProfileForm';
import FavoriteList from '@/components/favorite/FavoriteList';

const TABS = [
  { id: 'profile', label: '프로필 정보' },
  { id: 'history', label: '추천 이력' },
  { id: 'favorites', label: '즐겨찾기' },
];

const SEASON_LABEL = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ProfilePage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [history, setHistory] = useState([]);
  const [historyFetching, setHistoryFetching] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => {
    if (!loading && !user && !isGuest) {
      router.push('/login');
      return;
    }
    if (user) {
      setIsFetching(true);
      import('@/utils/api')
        .then(({ profileAPI }) => profileAPI.get())
        .then((res) => setProfileData(res.data))
        .catch(() => {})
        .finally(() => setIsFetching(false));
    }
  }, [loading, user, isGuest, router]);

  const fetchHistory = useCallback(async () => {
    setHistoryFetching(true);
    setHistoryError('');
    try {
      const { outfitAPI } = await import('@/utils/api');
      const res = await outfitAPI.getHistory();
      setHistory(res.data);
    } catch {
      setHistoryError('이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setHistoryFetching(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && user && history.length === 0 && !historyError) {
      fetchHistory();
    }
  }, [activeTab, user, history.length, historyError, fetchHistory]);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Header />
      {isGuest && <div className="pt-16"><GuestBanner /></div>}

      <main className={`${isGuest ? '' : 'pt-16'} max-w-6xl mx-auto px-6 py-12`}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-zinc-900">내 프로필</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {isGuest
              ? '게스트 프로필은 이 기기에만 저장됩니다. 회원가입하면 영구 저장할 수 있어요.'
              : '프로필 정보를 바탕으로 더 정확한 스타일을 추천해드려요.'}
          </p>
        </div>

        {/* 탭 — 게스트는 즐겨찾기 탭 미표시 */}
        {user && (
          <div className="flex gap-1 mb-8 border-b border-zinc-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-rose-500 text-rose-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileForm isSetup={false} initialData={profileData} />
        )}

        {activeTab === 'history' && user && (
          <div className="max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <p className="text-zinc-500 text-sm">최근 20개까지 조회됩니다</p>
              <Link href="/recommend" className="btn-rose py-2 px-4 text-sm">새 추천</Link>
            </div>

            {historyFetching && (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!historyFetching && historyError && (
              <div className="card p-5 text-center">
                <p className="text-rose-500 text-sm mb-4">{historyError}</p>
                <button onClick={fetchHistory} className="btn-secondary py-2 px-5">
                  다시 시도
                </button>
              </div>
            )}

            {!historyFetching && !historyError && history.length === 0 && (
              <div className="card p-10 text-center">
                <p className="text-zinc-400 text-sm mb-5">아직 추천 이력이 없어요</p>
                <Link href="/recommend" className="btn-rose py-3 px-6">첫 OOTD 추천 받기</Link>
              </div>
            )}

            {!historyFetching && !historyError && history.length > 0 && (
              <div className="space-y-3">
                {history.map((item) => (
                  <Link key={item.id} href={`/history/${item.id}`} className="block">
                    <div className="card p-5 hover:shadow-md transition-shadow flex items-center justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-semibold text-zinc-900 truncate">
                          {item.styleKeyword ?? '코디 추천'}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                          <span>{item.weatherDescription}</span>
                          <span>{item.temperature}°C</span>
                          <span>{SEASON_LABEL[item.season] ?? item.season}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-zinc-400">{formatDate(item.createdAt)}</p>
                        <span className="text-zinc-300 text-xl leading-none">›</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && user && (
          <div className="max-w-lg">
            <p className="text-zinc-500 text-sm mb-4">즐겨찾기한 코디를 모아볼 수 있어요</p>
            <FavoriteList />
          </div>
        )}
      </main>
    </>
  );
}
