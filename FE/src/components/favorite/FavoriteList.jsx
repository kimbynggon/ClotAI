'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SEASON_LABEL = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function FavoriteList() {
  const [favorites, setFavorites] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchFavorites = useCallback(async () => {
    setIsFetching(true);
    setError('');
    try {
      const { favoriteAPI } = await import('@/utils/api');
      const res = await favoriteAPI.getAll();
      setFavorites(res.data);
    } catch {
      setError('즐겨찾기를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (outfitId) => {
    setRemovingId(outfitId);
    try {
      const { favoriteAPI } = await import('@/utils/api');
      await favoriteAPI.toggle(outfitId);
      setFavorites((prev) => prev.filter((f) => f.id !== outfitId));
    } catch {
      // 오류 무시
    } finally {
      setRemovingId(null);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-7 h-7 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 text-center">
        <p className="text-rose-500 text-sm mb-3">{error}</p>
        <button onClick={fetchFavorites} className="btn-secondary py-2 px-5 text-sm">
          다시 시도
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-400 text-sm mb-4">아직 즐겨찾기한 코디가 없어요</p>
        <Link href="/recommend" className="btn-rose py-2.5 px-5">
          OOTD 추천 받기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {favorites.map((item) => (
        <div key={item.id} className="card p-5 flex items-center justify-between gap-3">
          <Link href={`/history/${item.id}`} className="min-w-0 flex-1 space-y-1 block">
            <p className="font-semibold text-zinc-900 truncate">
              {item.style ?? item.styleKeyword ?? '코디 추천'}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
              <span>{item.weatherDescription}</span>
              <span>{item.temperature}°C</span>
              <span>{SEASON_LABEL[item.season] ?? item.season}</span>
            </div>
            <p className="text-xs text-zinc-400">{formatDate(item.createdAt)}</p>
          </Link>
          <button
            onClick={() => handleRemove(item.id)}
            disabled={removingId === item.id}
            className="shrink-0 p-2 rounded-xl border border-zinc-200 text-rose-400 hover:border-rose-300 hover:bg-rose-50 transition-colors disabled:opacity-50"
            title="즐겨찾기 삭제"
          >
            {removingId === item.id ? (
              <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
