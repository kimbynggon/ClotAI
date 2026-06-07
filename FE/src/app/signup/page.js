import Link from 'next/link';
import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: '회원가입 — ClotAI',
};

export default function SignupPage() {
  return (
    <div className="auth-container relative">
      <Link
        href="/"
        className="absolute top-6 left-6 text-sm text-zinc-400 hover:text-zinc-700 transition-colors flex items-center gap-1"
      >
        ← 홈
      </Link>
      <SignupForm />
    </div>
  );
}
