'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function SocialLoginButtons() {
  return (
    <div className="space-y-3">
      <a
        href={`${API_URL}/api/auth/google`}
        className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors text-sm font-medium text-zinc-700"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Google로 계속하기
      </a>

      <a
        href={`${API_URL}/api/auth/kakao`}
        className="flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl border border-yellow-300 bg-[#FEE500] hover:bg-yellow-300 transition-colors text-sm font-medium text-zinc-900"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.572 1.494 4.833 3.754 6.218l-.952 3.556a.375.375 0 00.542.416l4.155-2.75A11.55 11.55 0 0012 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
        </svg>
        Kakao로 계속하기
      </a>
    </div>
  );
}
