'use client';

import Link from 'next/link';

export default function GuestBanner() {
  return (
    <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-rose-100">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-600">
          <span className="font-semibold text-rose-500">게스트 모드</span>로 이용 중입니다.
          회원가입하면 추천 기록과 프로필을 저장할 수 있어요.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/login" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition-colors">
            로그인
          </Link>
          <Link href="/signup" className="text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 px-3 py-1.5 rounded-full transition-colors">
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
