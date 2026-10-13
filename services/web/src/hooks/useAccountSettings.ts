import { useState } from 'react';
import { useAuth } from '../auth/authContext';

const EMAIL_REGX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_REGX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function useAccountSettings() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const resetPasswordFields = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setPasswordFieldError('');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
  };

  const handleCurrentPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCurrentPassword(e.target.value);
    setCurrentPasswordError('');
    setPasswordFieldError('');
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    setNewPasswordError('');
    setPasswordFieldError('');
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError('');
    setPasswordFieldError('');
  };

  const validateEmail = (): boolean => {
    const normalizedEmail = email.trim();

    setEmailError('');
    if (!normalizedEmail) {
      setEmailError('Email is required');
      return false;
    }

    if (!EMAIL_REGX.test(normalizedEmail)) {
      setEmailError('Enter a valid email');
      return false;
    }

    if (normalizedEmail === user?.email) {
      setEmailError('Enter a new email');
      return false;
    }
    return true;
  };

  const validatePassword = (): boolean => {
    let isValid = true;

    setCurrentPasswordError('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setPasswordFieldError('');
    if (!currentPassword) {
      setCurrentPasswordError('Current password is required');
      isValid = false;
    }

    if (!newPassword) {
      setNewPasswordError('New password is required');
      isValid = false;
    } else if (currentPassword === newPassword) {
      setNewPasswordError(
        'New password must be different from the current password',
      );
      isValid = false;
    } else if (!PASSWORD_REGX.test(newPassword)) {
      setNewPasswordError('8+ chars, uppercase, lowercase, number, symbol');
      isValid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Confirm password is required');
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      isValid = false;
    }
    return isValid;
  };

  const runSubmitEmailChange = async (submitFn: () => Promise<void>) => {
    if (!validateEmail()) return;
    setIsEmailSubmitting(true);
    try {
      await submitFn();
    } catch (error) {
      setEmailError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    } finally {
      setIsEmailSubmitting(false);
    }
  };

  const runSubmitPasswordChange = async (submitFn: () => Promise<void>) => {
    if (!validatePassword()) return;
    setIsPasswordSubmitting(true);
    try {
      await submitFn();
    } catch (error) {
      setPasswordFieldError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return {
    email,
    currentPassword,
    newPassword,
    confirmPassword,
    emailError,
    currentPasswordError,
    newPasswordError,
    confirmPasswordError,
    passwordFieldError,
    isEmailSubmitting,
    isPasswordSubmitting,
    handleEmailChange,
    handleCurrentPasswordChange,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    runSubmitEmailChange,
    runSubmitPasswordChange,
    resetPasswordFields,
  };
}
