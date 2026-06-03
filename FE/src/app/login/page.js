import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: '로그인 — fitAI',
};

export default function LoginPage() {
  return (
    <div className="auth-container">
      <LoginForm />
    </div>
  );
}
