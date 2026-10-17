import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

export type ApiFetch = <T = unknown>(
  url: string,
  options: AxiosRequestConfig,
) => Promise<AxiosResponse<T>>;

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export default api;
