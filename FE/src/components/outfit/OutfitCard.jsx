'use client';

import Link from 'next/link';

const SEASON_LABEL = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };

const OUTFIT_FIELDS = [
  { key: 'top', label: '상의' },
  { key: 'bottom', label: '하의' },
  { key: 'outer', label: '아우터' },
  { key: 'shoes', label: '신발' },
  { key: 'accessory', label: '액세서리' },
];

export default function OutfitCard({ result, showActions = true, onRetry }) {
  const { outfit, reason, styleKeyword, colorPalette, weather } = result;

  return (
    <div className="space-y-4">
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
          {weather?.isRaining && <span className="text-blue-500 text-xs font-medium">우산 필요</span>}
          {weather?.isSnowing && <span className="text-sky-400 text-xs font-medium">눈 예보</span>}
        </div>
      </div>

      {/* 컬러 팔레트 */}
      {colorPalette?.length > 0 && (
        <div className="card p-5">
          <p className="label">컬러 팔레트</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {colorPalette.map((color, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 rounded-full border border-zinc-200 text-zinc-600 bg-zinc-50"
              >
                {color}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 코디 아이템 */}
      <div className="card p-5">
        <p className="label mb-3">오늘의 코디</p>
        <div className="space-y-3">
          {OUTFIT_FIELDS.filter(({ key }) => outfit?.[key]).map(({ key, label }) => (
            <div key={key} className="flex gap-3">
              <span className="text-xs font-semibold text-zinc-400 w-14 pt-0.5 shrink-0">{label}</span>
              <span className="text-sm text-zinc-700 leading-relaxed">{outfit[key]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 추천 이유 */}
      <div className="card p-5">
        <p className="label mb-2">추천 이유</p>
        <p className="text-sm text-zinc-600 leading-relaxed">{reason}</p>
      </div>

      {/* 액션 버튼 */}
      {showActions && (
        <div className="flex gap-3">
          {onRetry && (
            <button onClick={onRetry} className="btn-secondary flex-1 py-3">
              다시 추천받기
            </button>
          )}
          <Link href="/history" className="btn-ghost flex-1 py-3 text-center">
            이력 보기
          </Link>
        </div>
      )}
    </div>
  );
}
