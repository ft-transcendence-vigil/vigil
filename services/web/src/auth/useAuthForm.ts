import { useState } from 'react';

const EMAIL_REGX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

interface UseAuthFormOptions {
  requireConfirm?: boolean;
}

export default function useAuthForm({
  requireConfirm = false,
}: UseAuthFormOptions = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setFormError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
    setFormError(null);
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError('');
    setFormError(null);
  };

  const validate = (): boolean => {
    let isValid: boolean = true;

    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setFormError(null);

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!EMAIL_REGX.test(email.trim())) {
      setEmailError('Enter a valid email');
      isValid = false;
    }

    if (password.length === 0) {
      setPasswordError('Password is required');
      isValid = false;
    }

    if (requireConfirm) {
      if (confirmPassword.length === 0) {
        setConfirmPasswordError('Confirm password is required');
        isValid = false;
      } else if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords don't match");
        isValid = false;
      }
    }
    return isValid;
  };

  const runSubmit = async (submitFn: () => Promise<void>) => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await submitFn();
    } catch (error) {
      setFormError(
        error instanceof Error ? error : new Error('Something went wrong'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    emailError,
    passwordError,
    confirmPasswordError,
    formError,
    setFormError,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    isSubmitting,
    runSubmit,
  };
}
