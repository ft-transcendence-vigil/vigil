import type { ApiFetch } from './api';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
}

export interface CreateUser {
  email: string;
  role: 'admin' | 'viewer';
  password: string;
}

export interface UpdateUser {
  email?: string;
  role?: 'admin' | 'viewer';
  password?: string;
}

async function getAllUsers(apiFetch: ApiFetch): Promise<User[]> {
  try {
    const res = await apiFetch<User[]>('/users', {
      method: 'GET',
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', {
          cause: error,
        });
      }
    }
    throw new Error('Unable to fetch users.', { cause: error });
  }
}

async function addUser(apiFetch: ApiFetch, user: CreateUser): Promise<User> {
  try {
    const res = await apiFetch<User>('/users', {
      method: 'POST',
      data: user,
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', {
          cause: error,
        });
      }
    }
    throw new Error('Unable to add user.', { cause: error });
  }
}

async function updateUser(
  apiFetch: ApiFetch,
  id: string,
  changes: UpdateUser,
): Promise<User> {
  try {
    const res = await apiFetch<User>(`/users/${id}`, {
      method: 'PATCH',
      data: changes,
    });
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', {
          cause: error,
        });
      }
    }
    throw new Error('Unable to update user.', { cause: error });
  }
}

async function deleteUser(apiFetch: ApiFetch, id: string): Promise<void> {
  try {
    await apiFetch<User>(`/users/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message, { cause: error });
      }
      if (!error.response) {
        throw new Error('Unable to connect to the server.', {
          cause: error,
        });
      }
    }
    throw new Error('Unable to delete user.', { cause: error });
  }
}

export { getAllUsers, addUser, updateUser, deleteUser };
