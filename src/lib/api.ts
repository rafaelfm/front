import axios from 'axios';
import type { Router } from 'vue-router';

type AuthStoreAdapter = {
  clearSession: (message?: string) => void;
  setRedirectPath: (path: string | null) => void;
  setStatusMessage: (message?: string) => void;
};

const resolveDefaultBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '/api';
  }

  return 'http://localhost:91/api';
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? resolveDefaultBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
};

let interceptorsConfigured = false;

export const setupApiInterceptors = (
  authStore: AuthStoreAdapter,
  router: Router,
) => {
  if (interceptorsConfigured) {
    return;
  }

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const hasResponse = Boolean(error.response);

      const payload = hasResponse
        ? ((typeof error.response.data === 'object' && error.response.data !== null
            ? error.response.data
            : {}) ?? {})
        : {};

      const normalizedError = {
        ...payload,
        status: hasResponse ? Number(error.response.status) : null,
        message:
          typeof payload.message === 'string'
            ? payload.message
            : error.message ?? 'Erro ao se comunicar com o servidor',
      } as { status: number | null; message: string } & Record<string, unknown>;

      if (
        normalizedError.status !== null &&
        [401, 403].includes(normalizedError.status)
      ) {
        authStore.clearSession('Sessão expirada. Faça login novamente.');

        if (router.currentRoute.value.name !== 'login') {
          authStore.setRedirectPath(router.currentRoute.value.fullPath);
        }

        authStore.setStatusMessage(normalizedError.message);

        if (router.currentRoute.value.name !== 'login') {
          void router.push({ name: 'login', query: { reason: 'expired' } });
        }
      }

      return Promise.reject(normalizedError);
    },
  );

  interceptorsConfigured = true;
};
