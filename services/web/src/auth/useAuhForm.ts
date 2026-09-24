import { useState } from 'react';

export default function useAuhForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState<Error | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const value = e.target.value;

    setEmail(value);

    if (!value) setEmailError('');
    else if (value && !emailReg.test(value))
      setEmailError('Enter a valid email');
    else setEmailError('');
    setFormError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
    setFormError(null);
  };

  const validate = (): boolean => {
    let isValid: boolean = true;

    setEmailError('');
    setPasswordError('');
    setFormError(null);

    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    }
    if (!password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    }
    return isValid;
  };

  return {
    email,
    password,
    emailError,
    passwordError,
    formError,
    setFormError,
    handleEmailChange,
    handlePasswordChange,
    validate,
  };
}
