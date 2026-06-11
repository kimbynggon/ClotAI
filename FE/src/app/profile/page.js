'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';
import ProfileForm from '@/components/profile/ProfileForm';
import FavoriteList from '@/components/favorite/FavoriteList';

const TABS = [
  { id: 'profile', label: '프로필 정보' },
  { id: 'favorites', label: '즐겨찾기' },
];

export default function ProfilePage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

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
