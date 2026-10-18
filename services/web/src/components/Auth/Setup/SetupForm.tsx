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
    confirmPasswordError,
    formError: setupError,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    runSubmit,
    isSubmitting,
  } = useAuhForm({ requireConfirm: true, validatePasswordStrength: true });

  if (!auth) throw new Error('AuthContext must be used inside AuthProvider');

  const handleSetup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSubmit(async () => {
      await auth.signUp(email, password);
      navigate('/dashboard');
    });
  };

  return (
    <AuthFormShell
      title="Create your admin account"
      caption="This runs once. After setup, new accounts are created from inside Vigil by an admin."
      formError={setupError}
      emailError={emailError}
      passwordError={passwordError}
      confirmPasswordError={confirmPasswordError}
      showConfirmPassword={true}
      submitLabel="Create admin account"
      onSubmit={handleSetup}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      isSubmitting={isSubmitting}
    />
  );
}
