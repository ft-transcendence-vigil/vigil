import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../auth/authContext';
import useAuhForm from '../../../hooks/useAuthForm';
import AuthFormShell from '../AuthFormShell';
import { useState } from 'react';

export default function LoginForm() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState('');
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
    if (!termsAccepted) {
      setTermsError('You must accept the Terms and Privacy Policy.');
      return;
    }
    runSubmit(async () => {
      await auth.signUp(email, password);
      navigate('/dashboard');
    });
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermsAccepted(e.target.checked);
    if (e.target.checked) setTermsError('');
  };

  return (
    <AuthFormShell
      title="Create your admin account"
      caption="This runs once. After setup, new accounts are created from inside Vigil by an admin."
      formError={setupError}
      emailError={emailError}
      passwordError={passwordError}
      confirmPasswordError={confirmPasswordError}
      isSetup={true}
      submitLabel="Create admin account"
      onSubmit={handleSetup}
      onEmailChange={handleEmailChange}
      onPasswordChange={handlePasswordChange}
      onConfirmPasswordChange={handleConfirmPasswordChange}
      isSubmitting={isSubmitting}
      termsAccepted={termsAccepted}
      termsError={termsError}
      onTermsChange={handleTermsChange}
    />
  );
}
