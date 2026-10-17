import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/authContext';
import useAuhForm from '../../../hooks/useAuthForm';
import AuthFormShell from '../AuthFormShell';

export default function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const {
    email,
    password,
    emailError,
    passwordError,
    formError: loginError,
    handleEmailChange,
    handlePasswordChange,
    runSubmit,
    isSubmitting,
  } = useAuhForm();

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSubmit(async () => {
      await auth.signIn(email, password);
      navigate('/overview');
    });
  };

  return (
    <AuthFormShell
      title="Log in"
      caption="Enter your credentials to access the dashboard."
      formError={loginError}
      emailError={emailError}
      passwordError={passwordError}
      showConfirmPassword={false}
      submitLabel="Log in"
      onSubmit={handleLogin}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      isSubmitting={isSubmitting}
    />
  );
}
