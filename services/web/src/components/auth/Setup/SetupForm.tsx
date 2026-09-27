import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../../auth/authContext';
import useAuhForm from '../../../auth/useAuthForm';
import AuthFormShell from '../AuthFormShell';

export default function LoginForm() {
  const auth = useContext(AuthContext);
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
  } = useAuhForm({ requireConfirm: true });

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
