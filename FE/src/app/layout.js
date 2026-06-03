import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
  title: 'ClotAI — AI 패션 스타일리스트',
  description: '체형과 날씨에 맞는 나만의 OOTD를 AI가 추천해드립니다.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
