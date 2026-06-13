import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: '로그인 — ClotAI',
};

export default function LoginPage() {
  return (
    <div className="auth-container relative">
      <Link
        href="/"
        className="absolute top-6 left-6 text-sm text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
      >
        ← 홈
      </Link>
      <Suspense fallback={<div className="auth-card animate-slide-up h-[500px]" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
