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
  return new Date(isoString).toISOString().slice(0, 10); // "2026-06-14"
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function formatCachedAt(isoString) {
  const d = new Date(isoString);
  const min = d.getMinutes();
  d.setMinutes(min < 30 ? 0 : 30, 0, 0);
  const day = DAY_NAMES[d.getDay()];
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}요일 ${time}`;
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
  isGuest = false,
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

  const seasonLabel = SEASON_LABEL[weather?.season] ?? weather?.season;

  return (
    <div className="space-y-3">
      {/* fallback 안내 배너 */}
      {isFallback && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
          <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-800">현재 AI 추천을 로드하는 중입니다</p>
            <p className="text-xs text-amber-700 leading-relaxed">
              아래는 날씨 기반 미리보기이니 참고용으로만 봐주세요. 조금만 기다리신 후 다시 시도하시면
              체형·취향까지 반영한 AI 맞춤 추천을 받아보실 수 있습니다.
            </p>
            <p className="text-xs font-semibold text-amber-600">✓ 미리보기에서는 추천 횟수가 차감되지 않습니다.</p>
          </div>
        </div>
      )}

      {/* 헤더 카드: 날씨 + 링크 + 날짜 */}
      <div className="card px-4 py-4 space-y-2">
        {/* 도시이름 */}
        {weather?.city && (
          <p className="text-sm font-bold text-zinc-900">{weather.city}</p>
        )}

        {/* 날씨 데이터 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600">
          <span className="font-bold text-zinc-900">{weather?.temperature}°C</span>
          <span>{weather?.weatherDescription}</span>
          {weather?.feelsLike !== undefined && (
            <span className="text-zinc-500">체감 {weather.feelsLike}°C</span>
          )}
          {weather?.humidity !== undefined && (
            <span className="text-zinc-500">습도 {weather.humidity}%</span>
          )}
          {weather?.windSpeed !== undefined && (
            <span className="text-zinc-500">풍속 {weather.windSpeed}km/h</span>
          )}
          {weather?.isRaining && <span className="text-blue-500">🌂</span>}
          {weather?.isSnowing && <span className="text-sky-400">❄️</span>}
        </div>

        {/* 날씨 기준 시간 */}
        {weather?.cachedAt && (
          <p className="text-xs text-zinc-400">
            날씨 기준 {formatCachedAt(weather.cachedAt)}
          </p>
        )}

        {/* 구분선 */}
        <div className="border-t border-zinc-100 pt-2 flex items-center justify-between">
          {/* 링크(공유) + 미리보기 배지 */}
          <div className="flex items-center gap-1.5">
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
            {isPreview && (
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                미리보기
              </span>
            )}
          </div>

          {/* 즐겨찾기 + 날짜 */}
          <div className="flex items-center gap-1.5">
            {showActions && isGuest && (
              <Link
                href="/login"
                className="text-xs text-zinc-400 hover:text-rose-500 transition-colors border border-zinc-200 hover:border-rose-300 rounded-lg px-2 py-1 whitespace-nowrap"
                title="로그인하면 즐겨찾기 저장 가능"
              >
                ♡ 저장
              </Link>
            )}
            {showActions && showFavorite && !isGuest && id !== 0 && (
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
            <span className="text-xs font-mono text-zinc-400">
              {formatDate(createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 스타일 키워드 + 시즌 */}
      <div className="card p-5">
        <span className="text-lg font-bold text-zinc-900">
          {styleKeyword}{seasonLabel ? `, ${seasonLabel}` : ''}
        </span>
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
                  className="shrink-0 text-xs font-semibold text-rose-500 hover:text-white hover:bg-rose-500 transition-colors border border-rose-300 hover:border-rose-500 rounded-lg px-2.5 py-1.5 whitespace-nowrap"
                >
                  무신사
                </a>
              )}
            </div>
          ))}
        </div>
        {!isPreview && (
          <p className="text-xs text-zinc-400 mt-3 text-right">각 항목 버튼으로 무신사 검색</p>
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
