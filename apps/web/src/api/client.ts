import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import type { ApiResponse, AuthenticatedUser } from '@qr/types';
import { useAuthStore } from '../store/auth-store.js';

const configuredMode: unknown = import.meta.env.MODE;
const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;

export function resolveApiBaseUrl(
  apiUrl: string | undefined,
  mode = typeof configuredMode === 'string' ? configuredMode : 'production',
): string {
  if (typeof apiUrl === 'string' && apiUrl.trim().length > 0) return apiUrl;
  if (mode === 'development') {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      if (currentOrigin.includes('127.0.0.1') || currentOrigin.includes('localhost')) {
        return `${currentOrigin.replace(/:\d+$/, '')}:4000/api/v1`;
      }
    }
    return 'http://localhost:4000/api/v1';
  }
  return '/api/v1';
}

function resolveSocketUrl(baseUrl: string): string {
  try {
    return new URL(
      baseUrl,
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    ).origin;
  } catch {
    return 'http://localhost';
  }
}

export const apiBaseUrl = resolveApiBaseUrl(
  typeof configuredApiUrl === 'string' ? configuredApiUrl : undefined,
);
export const socketUrl = resolveSocketUrl(apiBaseUrl);

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

interface RetriableRequest extends AxiosRequestConfig {
  _attendityRetried?: boolean;
}
interface SessionPayload {
  readonly user: AuthenticatedUser;
  readonly accessToken: string;
}

let refreshPromise: Promise<SessionPayload> | null = null;

export async function refreshSession(): Promise<SessionPayload> {
  refreshPromise ??= apiClient
    .post<ApiResponse<SessionPayload>>('/auth/refresh')
    .then(({ data }) => {
      useAuthStore.getState().setSession(data.data.user, data.data.accessToken);
      return data.data;
    })
    .catch((error: unknown) => {
      useAuthStore.getState().clearSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const UNAUTHENTICATED_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/invitations',
];

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;
  const request = error.config as RetriableRequest | undefined;
  const url = request?.url ?? '';
  const isUnauthenticatedAuthRequest = UNAUTHENTICATED_AUTH_ENDPOINTS.some((endpoint) =>
    url.includes(endpoint),
  );
  if (
    error.response?.status !== 401 ||
    !request ||
    request._attendityRetried ||
    isUnauthenticatedAuthRequest
  )
    throw error;
  request._attendityRetried = true;
  const session = await refreshSession();
  request.headers = { ...request.headers, Authorization: `Bearer ${session.accessToken}` };
  return apiClient(request);
});
