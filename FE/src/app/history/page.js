'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';

export default function HistoryPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/profile');
  }, [router]);

  return (
    <>
      <Header />
      <div className="pt-24 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );
}
