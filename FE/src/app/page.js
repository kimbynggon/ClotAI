'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/common/Header';
import GuestBanner from '@/components/common/GuestBanner';

const FEATURES = [
  {
    icon: '🌤',
    title: '날씨 기반 추천',
    desc: '오늘의 날씨를 자동으로 분석해서 딱 맞는 옷차림을 제안해요.',
  },
  {
    icon: '✨',
    title: 'AI 스타일링',
    desc: '체형과 취향을 학습한 AI가 나만을 위한 코디를 만들어드려요.',
  },
  {
    icon: '👤',
    title: '체형 맞춤 핏',
    desc: '내 체형에 어울리는 실루엣과 스타일을 정확히 알려드릴게요.',
  },
];

export default function HomePage() {
  const { user, isGuest, continueAsGuest } = useAuth();
  const router = useRouter();

  const handleGuest = () => {
    continueAsGuest();
    router.push('/recommend');
  };

  return (
    <>
      <Header />
      {isGuest && <div className="pt-16"><GuestBanner /></div>}

      <main className={isGuest ? '' : 'pt-16'}>
        {/* 히어로 섹션 */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center">
          {/* 배경 그라디언트 */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800" />
          <div className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, #f43f5e 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fb923c 0%, transparent 40%)',
            }}
          />

          <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white/80 text-xs font-medium px-4 py-2 rounded-full mb-8 border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              AI 기반 패션 스타일리스트
            </span>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
              오늘 뭐 입지?<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
                AI가 골라줄게요
              </span>
            </h1>

            <p className="text-zinc-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
              체형·날씨·스타일 취향을 분석해서<br />
              매일 아침 나만을 위한 OOTD를 추천해드립니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {user ? (
                <Link href="/recommend" className="btn-rose px-8 py-4 text-base">
                  OOTD 추천
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn-rose px-8 py-4 text-base">
                    무료로 시작하기
                  </Link>
                  <button onClick={handleGuest} className="text-white/70 hover:text-white text-sm font-medium transition-colors px-4 py-2">
                    로그인 없이 둘러보기 →
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* 기능 소개 */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4">
              스타일 고민은 이제 AI에게
            </h2>
            <p className="text-zinc-500 text-lg">
              ClotAI가 매일 아침 패션 고민을 해결해드립니다
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="card p-8 hover:shadow-md transition-shadow duration-300">
                <div className="text-4xl mb-4">{icon}</div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA 섹션 */}
        {!user && (
          <section className="bg-zinc-900 py-20 px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              지금 바로 시작해보세요
            </h2>
            <p className="text-zinc-400 mb-8 text-base">회원가입은 무료이며 1분이면 충분해요</p>
            <Link href="/signup" className="btn-rose px-10 py-4 text-base">
              무료 회원가입
            </Link>
          </section>
        )}
      </main>
    </>
  );
}
