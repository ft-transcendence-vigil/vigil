import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addUser, updateUser } from '../api/usersApi';
import type { User, UpdateUser } from '../api/usersApi';
import { useAuth } from '../auth/authContext';
import { toast } from 'sonner';
import type { Role } from '../auth/authTypes';

const EMAIL_REGX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const PASSWORD_REGX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

type UseUsersSettingsOptions =
  | {
      mode: 'create';
      user?: never;
      onCreated?: () => void;
      onUpdated?: () => void;
    }
  | {
      mode: 'edit';
      user: User;
      onCreated?: () => void;
      onUpdated?: () => void;
    };

export default function useUsersSettings({
  mode,
  user,
  onCreated,
  onUpdated,
}: UseUsersSettingsOptions) {
  const { apiFetch } = useAuth();
  const queryClient = useQueryClient();
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

  const addMutation = useMutation({
    mutationFn: () =>
      addUser(apiFetch, {
        email: email.trim(),
        role,
        password,
      }),

    onSuccess: (newUser) => {
      queryClient.setQueryData<User[]>(['users'], (users = []) => [
        ...users,
        newUser,
      ]);
      toast.success('User added successfully');
      onCreated?.();
    },

    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: (changes: UpdateUser) => {
      if (!user) {
        throw new Error('No user selected.');
      }
      return updateUser(apiFetch, user.id, changes);
    },

    onSuccess: (updatedUser) => {
      queryClient.setQueryData<User[]>(['users'], (users = []) =>
        users.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      );
      toast.success('User updated successfully');
      onUpdated?.();
    },

    onError: (error) => {
      setFormError(
        error instanceof Error ? error.message : 'Something went wrong',
      );
    },
  });

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

  const validateForm = () => {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    return isEmailValid && isPasswordValid;
  };

  const handleAddUserSubmit = () => {
    if (!validateForm()) return;
    setFormError('');
    addMutation.mutate();
  };

  const handleEditUserSubmit = () => {
    if (mode !== 'edit') return;
    if (!validateForm()) return;

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

    setFormError('');
    updateMutation.mutate(changes);
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
    isFormSubmitting: addMutation.isPending || updateMutation.isPending,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmPasswordChange,
    handleDropdownChange,
    handleAddUserSubmit,
    handleEditUserSubmit,
  };
}
