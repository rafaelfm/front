import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiClient, setAuthToken } from '../lib/api';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role?: string | null;
  roles?: string[];
  [key: string]: unknown;
}

const COOKIE_NAME = 'jwt';

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.*+?^${}()|[\]\\])/g, '\\$1')}=([^;]*)`),
  );

  return match ? decodeURIComponent(match[1]) : null;
};

const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
  if (typeof document === 'undefined') {
    return;
  }

  const maxAge = Math.max(maxAgeSeconds, 0);
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; max-age=${maxAge}; path=/; SameSite=Lax`;
};

const removeCookie = (name: string) => {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
};

export const useAuthStore = defineStore('auth', () => {
  const user = ref<BackendUser | null>(null);
  const token = ref<string | null>(null);
  const hydrated = ref(false);
  const loading = ref(false);
  const statusMessage = ref('');
  const redirectPath = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(user.value && token.value));

  const setStatusMessage = (message?: string) => {
    statusMessage.value = message ?? '';
  };

  const setRedirectPath = (path: string | null) => {
    redirectPath.value = path;
  };

  const setSession = (sessionToken: string, sessionUser: BackendUser) => {
    token.value = sessionToken;
    user.value = sessionUser;
    setAuthToken(sessionToken);
    setCookie(COOKIE_NAME, sessionToken, 60 * 60 * 6);
  };

  const clearSession = (message?: string) => {
    token.value = null;
    user.value = null;
    setAuthToken(null);
    removeCookie(COOKIE_NAME);
    statusMessage.value = message ?? '';
  };

  const fetchUser = async (
    sessionToken?: string,
    options: { silent?: boolean } = {},
  ): Promise<BackendUser> => {
    const activeToken = sessionToken ?? token.value;

    if (!activeToken) {
      throw new Error('Token ausente');
    }

    setAuthToken(activeToken);

    if (sessionToken) {
      setCookie(COOKIE_NAME, sessionToken, 60 * 60 * 6);
    }

    try {
      const { data } = await apiClient.get<{ user: BackendUser }>('/user');
      setSession(activeToken, data.user);

      if (!options.silent) {
        statusMessage.value = '';
      }

      return data.user;
    } catch (error: unknown) {
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? Number((error as { status?: number }).status)
          : undefined;

      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Não foi possível validar o usuário.';

      if (status === 401 || status === 403) {
        clearSession('Sessão expirada. Faça login novamente.');
      } else if (!options.silent) {
        statusMessage.value = message;
      }

      throw error;
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    clearSession();
    loading.value = true;
    statusMessage.value = '';

    try {
      const { data } = await apiClient.post<{
        token: string;
        expires_in?: number;
      }>('/login', credentials);

      const expiresIn = Number.isFinite(data.expires_in)
        ? Number(data.expires_in)
        : 60 * 15;

      setCookie(COOKIE_NAME, data.token, expiresIn);
      setAuthToken(data.token);
      token.value = data.token;

      await fetchUser(data.token, { silent: true });

      statusMessage.value = '';

      return data.token;
    } finally {
      loading.value = false;
    }
  };

  const hydrate = async () => {
    if (hydrated.value) {
      return;
    }

    const savedToken = getCookie(COOKIE_NAME);

    if (savedToken) {
      try {
        await fetchUser(savedToken, { silent: true });
      } catch (error) {
        console.warn('Não foi possível restaurar a sessão:', error);

        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? Number((error as { status?: number }).status)
            : undefined;

        if (status === 401 || status === 403) {
          clearSession('Sessão expirada. Faça login novamente.');
        } else {
          setStatusMessage('Não foi possível validar a sessão. Tente novamente.');
        }
      }
    } else {
      clearSession();
    }

    hydrated.value = true;
  };

  const logout = (message?: string) => {
    clearSession(message);
    redirectPath.value = null;
  };

  return {
    user,
    token,
    hydrated,
    loading,
    statusMessage,
    redirectPath,
    isAuthenticated,
    setStatusMessage,
    setRedirectPath,
    setSession,
    clearSession,
    fetchUser,
    login,
    hydrate,
    logout,
  };
});
