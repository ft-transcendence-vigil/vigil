import { useState } from 'react';
import { addUser, updateUser } from '../api/usersApi';
import type { User, UpdateUser } from '../api/usersApi';
import { useAuth } from '../auth/authContext';
import { toast } from 'sonner';
import type { Role } from '../auth/authTypes';

const EMAIL_REGX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const PASSWORD_REGX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

interface UseUsersSettingsOptions {
  mode: 'create' | 'edit';
  user?: User;
  onCreated?: (user: User) => void;
  onUpdated?: (user: User) => void;
}

export default function useUsersSettings({
  mode,
  user,
  onCreated,
  onUpdated,
}: UseUsersSettingsOptions) {
  const { apiFetch } = useAuth();
  const [email, setEmail] = useState(
    mode === 'edit' ? (user?.email ?? '') : '',
  );
  const [role, setRole] = useState<'admin' | 'viewer'>(
    mode === 'edit' ? (user?.role ?? 'viewer') : 'viewer',
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setFormError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
    setFormError('');
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setConfirmPassword(e.target.value);
    setConfirmPasswordError('');
    setFormError('');
  };

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value as Role);
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
    return true;
  };

  const validatePassword = (): boolean => {
    let isValid = true;

    setPasswordError('');
    setConfirmPasswordError('');
    setFormError('');
    if (mode === 'create') {
      if (!password) {
        setPasswordError('Password is required');
        isValid = false;
      } else if (!PASSWORD_REGX.test(password)) {
        setPasswordError('8+ chars, uppercase, lowercase, number, symbol');
        isValid = false;
      }
    }

    if (!password && confirmPassword) {
      setPasswordError('New password is required');
      isValid = false;
    }

    if (password && !PASSWORD_REGX.test(password)) {
      setPasswordError('8+ chars, uppercase, lowercase, number, symbol');
      isValid = false;
    }

    if (password && !confirmPassword) {
      setConfirmPasswordError('Confirm password is required');
      isValid = false;
    }

    if (password && confirmPassword && password !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      isValid = false;
    }
    return isValid;
  };

  const runSubmit = async (submitFn: () => Promise<void>) => {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
      return;
    }
    setIsFormSubmitting(true);
    setFormError('');
    try {
      await submitFn();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleAddUserSubmit = () => {
    void runSubmit(async () => {
      const newUser = await addUser(apiFetch, {
        email: email.trim(),
        role,
        password,
      });
      onCreated?.(newUser);
      toast.success('User added successfully');
    });
  };

  const handleEditUserSubmit = () => {
    if (!user) {
      setFormError('No user selected.');
      return;
    }

    void runSubmit(async () => {
      const changes: UpdateUser = {};
      const normalizedEmail = email.trim();

      if (normalizedEmail !== user.email) {
        changes.email = normalizedEmail;
      }

      if (role !== user.role) {
        changes.role = role;
      }

      if (password) {
        changes.password = password;
      }

      if (Object.keys(changes).length === 0) {
        toast.info('No changes to save.');
        return;
      }
      const updatedUser = await updateUser(apiFetch, user.id, changes);

      onUpdated?.(updatedUser);
      toast.success('User updated successfully');
    });
  };

  return {
    email,
    password,
    confirmPassword,
    emailError,
    passwordError,
    confirmPasswordError,
    formError,
    role,
    isFormSubmitting,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleDropdownChange,
    handleAddUserSubmit,
    handleEditUserSubmit,
  };
}
