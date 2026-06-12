'use client';

import { useState } from 'react';
import Link from 'next/link';

const SEASON_LABEL = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

const OUTFIT_FIELDS = [
  { key: 'top', label: '상의' },
  { key: 'bottom', label: '하의' },
  { key: 'outer', label: '아우터' },
  { key: 'shoes', label: '신발' },
  { key: 'accessory', label: '액세서리' },
];

function formatDate(isoString) {
  return new Date(isoString).toISOString().slice(2, 10); // "26-06-10"
}

function getShoppingUrl(item) {
  return `https://www.musinsa.com/search/goods?keyword=${encodeURIComponent(item)}`;
}

function buildShareText(result) {
  const { outfit, styleKeyword, colorPalette, weather, createdAt } = result;
  const date = formatDate(createdAt);
  const lines = [
    `📅 ${date} 오늘의 OOTD — ClotAI`,
    `🌤 ${weather?.city ?? ''} ${weather?.temperature ?? ''}°C ${weather?.weatherDescription ?? ''}`,
    '',
    `스타일: ${styleKeyword}`,
    outfit?.top       && `상의: ${outfit.top}`,
    outfit?.bottom    && `하의: ${outfit.bottom}`,
    outfit?.outer     && `아우터: ${outfit.outer}`,
    outfit?.shoes     && `신발: ${outfit.shoes}`,
    outfit?.accessory && `액세서리: ${outfit.accessory}`,
    colorPalette?.length && `컬러: ${colorPalette.join(', ')}`,
    '',
    '#ClotAI #OOTD #오늘의코디',
  ].filter(Boolean).join('\n');
  return lines;
}

export default function OutfitCard({
  result,
  showActions = true,
  showFavorite = false,
  isPreview = false,
  onRetry,
}) {
  const { outfit, reason, styleKeyword, colorPalette, weather, createdAt, id, isFallback } = result;
  const [copied, setCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API 미지원 시 fallback
    }
  };

  const handleFavorite = async () => {
    if (favoriteLoading || id === 0) return;
    setFavoriteLoading(true);
    try {
      const { favoriteAPI } = await import('@/utils/api');
      const res = await favoriteAPI.toggle(id);
      setIsFavorited(res.data.isFavorited);
    } catch {
      // 오류 무시
    } finally {
      setFavoriteLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* fallback 안내 배너 */}
      {isFallback && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            AI 서비스 준비 중입니다. 날씨 기반 기본 추천을 보여드리고 있어요.
            잠시 후 다시 시도하면 체형·취향까지 반영한 AI 맞춤 추천을 받을 수 있습니다.
          </p>
        </div>
      )}

      {/* 날짜 + 배지 + 액션 아이콘 헤더 */}
      <div className="card px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
            실시간 날씨 기반
          </span>
          {isPreview && (
            <span className="text-xs text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded-full">
              게스트 미리보기
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 공유 아이콘 */}
          {showActions && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              title="공유"
            >
              {copied ? (
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              )}
            </button>
          )}
          {/* 즐겨찾기 아이콘 */}
          {showActions && showFavorite && id !== 0 && (
            <button
              onClick={handleFavorite}
              disabled={favoriteLoading}
              className={`p-1.5 rounded-lg transition-colors ${
                isFavorited
                  ? 'text-rose-500 hover:text-rose-600'
                  : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-100'
              }`}
              title={isFavorited ? '즐겨찾기 삭제' : '즐겨찾기 추가'}
            >
              <svg className="w-4 h-4" fill={isFavorited ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
          <span className="text-xs font-mono font-semibold text-zinc-500 ml-1">
            {formatDate(createdAt)}
          </span>
        </div>
      </div>

      {/* 스타일 키워드 + 날씨 요약 */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-lg font-bold text-zinc-900">{styleKeyword}</span>
          <span className="shrink-0 text-xs text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
            {SEASON_LABEL[weather?.season] ?? weather?.season}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
          {weather?.city && <span className="font-medium text-zinc-700">{weather.city}</span>}
          <span className="font-bold text-zinc-900">{weather?.temperature}°C</span>
          <span>{weather?.weatherDescription}</span>
          {weather?.feelsLike !== undefined && (
            <span className="text-xs text-zinc-400">체감 {weather.feelsLike}°C</span>
          )}
          {weather?.isRaining && <span className="text-blue-500 text-xs font-semibold">🌂 우산 필요</span>}
          {weather?.isSnowing && <span className="text-sky-400 text-xs font-semibold">❄️ 눈 예보</span>}
        </div>
        {weather?.cachedAt && (
          <p className="text-xs text-zinc-400 mt-2">
            날씨 기준{' '}
            {new Date(weather.cachedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
            <span className="ml-1 text-zinc-300">(30분 캐시)</span>
          </p>
        )}
      </div>

      {/* 컬러 팔레트 */}
      {colorPalette?.length > 0 && (
        <div className="card p-5">
          <p className="label">컬러 팔레트</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {colorPalette.map((color, i) => (
              <span key={i} className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 bg-zinc-50">
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 코디 아이템 + 쇼핑 링크 */}
      <div className="card p-5">
        <p className="label mb-3">오늘의 코디</p>
        <div className="space-y-3">
          {OUTFIT_FIELDS.filter(({ key }) => outfit?.[key]).map(({ key, label }) => (
            <div key={key} className="flex items-start gap-3">
              <span className="text-xs font-semibold text-zinc-400 w-14 pt-0.5 shrink-0">{label}</span>
              <span className="text-sm text-zinc-700 leading-relaxed flex-1">{outfit[key]}</span>
              {!isPreview && (
                <a
                  href={getShoppingUrl(outfit[key])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs text-zinc-400 hover:text-rose-500 transition-colors border border-zinc-200 hover:border-rose-300 rounded-lg px-2 py-1"
                  title="무신사에서 찾아보기"
                >
                  🛍
                </a>
              )}
            </div>
          ))}
        </div>
        {!isPreview && (
          <p className="text-xs text-zinc-400 mt-3 text-right">쇼핑 링크: 무신사 검색</p>
        )}
      </div>

      {/* 추천 이유 */}
      <div className="card p-5">
        <p className="label mb-2">추천 이유</p>
        <p className="text-sm text-zinc-600 leading-relaxed">{reason}</p>
      </div>

      {/* 액션 버튼 */}
      {showActions && onRetry && (
        <button onClick={onRetry} className="btn-ghost w-full py-3 text-sm">
          다시 추천
        </button>
      )}
    </div>
  );
}
