'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import OutfitCard from '@/components/outfit/OutfitCard';

function formatDateTime(iso) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryDetailPage({ params }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [outfit, setOutfit] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchOutfit = useCallback(async () => {
    try {
      const { outfitAPI } = await import('@/utils/api');
      const res = await outfitAPI.getOne(params.id);
      setOutfit(res.data);
    } catch (err) {
      const status = err.response?.status;
      setError(status === 404 ? '추천 이력을 찾을 수 없습니다.' : '데이터를 불러오지 못했습니다.');
    } finally {
      setIsFetching(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) fetchOutfit();
  }, [loading, user, router, fetchOutfit]);

  return (
    <>
      <Header />
      <main className="pt-24 max-w-lg mx-auto px-4 pb-12">
        {/* 헤더 */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/history" className="btn-ghost py-2 px-3 text-sm">
            ← 이력
          </Link>
          <h1 className="text-xl font-bold text-zinc-900">추천 상세</h1>
        </div>

        {isFetching && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isFetching && error && (
          <div className="card p-8 text-center">
            <p className="text-rose-500 text-sm mb-5">{error}</p>
            <Link href="/history" className="btn-secondary py-2.5 px-6">
              이력 목록으로
            </Link>
          </div>
        )}

        {outfit && (
          <>
            <p className="text-xs text-zinc-400 mb-5">{formatDateTime(outfit.createdAt)}</p>
            <OutfitCard result={outfit} showActions={false} />
            <div className="mt-6 flex gap-3">
              <Link href="/history" className="btn-secondary flex-1 py-3">
                이력 목록
              </Link>
              <Link href="/recommend" className="btn-rose flex-1 py-3">
                새 추천
              </Link>
            </div>
          </>
        )}
      </main>
    </>
  );
}
