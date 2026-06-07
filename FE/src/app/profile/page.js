'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';
import ProfileForm from '@/components/profile/ProfileForm';

export default function ProfilePage() {
  const { user, isGuest, loading } = useAuth();
  const router = useRouter();
  const [profileData, setProfileData] = useState(null);
  const [isFetching, setIsFetching] = useState(false);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">내 프로필</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {isGuest
              ? '게스트 프로필은 이 기기에만 저장됩니다. 회원가입하면 영구 저장할 수 있어요.'
              : '프로필 정보를 바탕으로 더 정확한 스타일을 추천해드려요.'}
          </p>
        </div>

        <ProfileForm isSetup={false} initialData={profileData} />
      </main>
    </>
  );
}
