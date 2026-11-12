import axios from 'axios';

export const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_URL) ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  window.location.port !== '5000'
    ? 'http://localhost:5000/api/v1'
    : '/api/v1');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Storage keys — must match AuthContext
const TOKEN_KEY = 'college_erp_token';
const REFRESH_KEY = 'college_erp_refresh';
const USER_KEY = 'college_erp_user';

// Attach JWT access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track whether a silent refresh is already in-flight
let isRefreshing = false;
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const flushQueue = (error: any, token: string | null = null) => {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  pendingQueue = [];
};

// 401 interceptor: try a silent token refresh once before redirecting to login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only intercept 401 errors that are NOT the refresh endpoint itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retried &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login') &&
      !window.location.pathname.includes('/login')
    ) {
      originalRequest._retried = true;

      if (isRefreshing) {
        // Another refresh is already in progress — queue this request
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      const storedRefresh = localStorage.getItem(REFRESH_KEY);

      if (!storedRefresh) {
        // No refresh token — go to login
        isRefreshing = false;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefresh,
        });

        const { token: newAccess, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem(TOKEN_KEY, newAccess);
        localStorage.setItem(REFRESH_KEY, newRefresh);

        apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        flushQueue(null, newAccess);
        isRefreshing = false;

        return apiClient(originalRequest); // Retry the original request
      } catch (refreshError) {
        flushQueue(refreshError, null);
        isRefreshing = false;

        // Refresh token expired/revoked — clear everything and go to login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
