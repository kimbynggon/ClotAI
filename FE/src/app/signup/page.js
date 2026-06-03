import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: '회원가입 — ClotAI',
};

export default function SignupPage() {
  return (
    <div className="auth-container">
      <SignupForm />
    </div>
  );
}
