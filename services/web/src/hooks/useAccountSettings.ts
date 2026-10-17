import { useState } from 'react';
import { useAuth } from '../auth/authContext';
import { changePassword, updateEmail } from '../api/accountApi';
import { toast } from 'sonner';

const EMAIL_REGX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_REGX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function useAccountSettings() {
  const { user, setUser, apiFetch } = useAuth();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [passwordFieldError, setPasswordFieldError] = useState('');
  const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const resetPasswordFields = () => {
    setNewPassword('');
    setConfirmPassword('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setPasswordFieldError('');
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
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

    setNewPasswordError('');
    setConfirmPasswordError('');
    setPasswordFieldError('');

    if (!newPassword) {
      setNewPasswordError('New password is required');
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

  const handleEmailSubmit = () => {
    runSubmitEmailChange(async () => {
      const updatedUser = await updateEmail(apiFetch, email);
      setUser(updatedUser);
      toast.success('Email updated successfully');
    });
  };

  const handlePasswordSubmit = () => {
    runSubmitPasswordChange(async () => {
      await changePassword(apiFetch, newPassword);
      resetPasswordFields();
      toast.success('Password updated successfully');
    });
  };

  return {
    email,
    newPassword,
    confirmPassword,
    emailError,
    newPasswordError,
    confirmPasswordError,
    passwordFieldError,
    isEmailSubmitting,
    isPasswordSubmitting,
    handleEmailChange,
    handleNewPasswordChange,
    handleConfirmPasswordChange,
    handleEmailSubmit,
    handlePasswordSubmit,
    resetPasswordFields,
  };
}
