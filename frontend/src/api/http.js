import axios from 'axios';
import { env } from '../config/env.js';

export function createHttpClient(token) {
  const http = axios.create({
    baseURL: env.apiUrl,
    timeout: 10000
  });

  http.interceptors.request.use((config) => {
    config.headers = config.headers || {};
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  return http;
}
