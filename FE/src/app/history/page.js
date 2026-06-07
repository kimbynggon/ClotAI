'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';

const SEASON_LABEL = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      const { outfitAPI } = await import('@/utils/api');
      const res = await outfitAPI.getHistory();
      setHistory(res.data);
    } catch {
      setError('이력을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }
    if (user) fetchHistory();
  }, [loading, user, router, fetchHistory]);

  return (
    <>
      <Header />
      <main className="pt-24 max-w-lg mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">추천 이력</h1>
            <p className="text-zinc-500 text-sm mt-1">최근 20개까지 조회됩니다</p>
          </div>
          <Link href="/recommend" className="btn-rose py-2.5 px-5">
            새 추천
          </Link>
        </div>

        {isFetching && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isFetching && error && (
          <div className="card p-5 text-center">
            <p className="text-rose-500 text-sm mb-4">{error}</p>
            <button onClick={fetchHistory} className="btn-secondary py-2 px-5">
              다시 시도
            </button>
          </div>
        )}

        {!isFetching && !error && history.length === 0 && (
          <div className="card p-10 text-center">
            <p className="text-zinc-400 text-sm mb-5">아직 추천 이력이 없어요</p>
            <Link href="/recommend" className="btn-rose py-3 px-6">
              첫 OOTD 추천 받기
            </Link>
          </div>
        )}

        {!isFetching && !error && history.length > 0 && (
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
      </main>
    </>
  );
}
