/**
 * 이메일 인증 페이지 (독립 모듈)
 *
 * 제거 방법: 이 파일과 EmailVerification.jsx 를 삭제하고
 * NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION=false 로 변경
 */
import EmailVerification from '@/components/auth/EmailVerification';

export const metadata = {
  title: '이메일 인증 — fitAI',
};

export default function VerifyPage() {
  return (
    <div className="auth-container">
      <EmailVerification />
    </div>
  );
}
