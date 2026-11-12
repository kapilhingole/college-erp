import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';

export type UserRole = 'MANAGEMENT' | 'FACULTY' | 'STUDENT' | 'SUPER_ADMIN' | 'ADMIN' | 'Faculty' | 'Management' | 'Student';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
  profile?: any;
  studentProfile?: {
    id: string;
    rollNumber: string;
    enrollmentNumber?: string;
    firstName: string;
    lastName: string;
    currentSemester: number;
    departmentId: string;
    department?: { name: string; code?: string };
    program?: { name: string };
    section?: { name: string };
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    bloodGroup?: string;
    address?: string;
    guardianName?: string;
    guardianPhone?: string;
  };
  facultyProfile?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    qualification?: string;
    departmentId: string;
    department?: { name: string; code?: string };
    phone?: string;
    maxWeeklyHours?: number;
    joiningDate?: string;
  };
  managementProfile?: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    designation: string;
    office: string;
    phone?: string;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (token: string, refreshToken: string, user: UserProfile, profileData?: any) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const TOKEN_KEY = 'college_erp_token';
const REFRESH_KEY = 'college_erp_refresh';
const USER_KEY = 'college_erp_user';

// Access token expires in 15 minutes — refresh 2 minutes before expiry
const REFRESH_BUFFER_MS = 2 * 60 * 1000;
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

/** Decode JWT payload without verifying signature (verification is server-side) */
const decodeTokenExpiry = (token: string): number | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem(USER_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState<boolean>(true);

  // Ref for the auto-refresh timer so we can clear it on logout
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clear everything from storage and state ──────────────────────────
  const clearSession = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // ── Silently refresh the access token using the stored refresh token ──
  const silentRefresh = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (!storedRefresh) return false;

    try {
      const res = await apiClient.post('/auth/refresh', { refreshToken: storedRefresh });
      if (res.data.success) {
        const { token: newAccess, refreshToken: newRefresh } = res.data.data;
        localStorage.setItem(TOKEN_KEY, newAccess);
        localStorage.setItem(REFRESH_KEY, newRefresh);
        setToken(newAccess);
        scheduleRefresh(newAccess);
        return true;
      }
    } catch {
      // refresh token expired or revoked — force logout
      clearSession();
      window.location.href = '/login';
    }
    return false;
  }, [clearSession]);

  // ── Schedule a silent refresh just before the access token expires ───
  const scheduleRefresh = useCallback((accessToken: string) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const expiry = decodeTokenExpiry(accessToken);
    if (!expiry) return;

    const msUntilRefresh = expiry - Date.now() - REFRESH_BUFFER_MS;
    if (msUntilRefresh <= 0) {
      // Already expired or about to — refresh immediately
      silentRefresh();
      return;
    }

    refreshTimerRef.current = setTimeout(() => {
      silentRefresh();
    }, msUntilRefresh);
  }, [silentRefresh]);

  // ── Refresh user profile from server ────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient.get('/auth/profile');
      if (res.data.success) {
        const userData = res.data.data;
        setUser(userData);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        // Try a silent refresh first before giving up
        const refreshed = await silentRefresh();
        if (!refreshed) {
          clearSession();
          window.location.href = '/login';
        }
      }
    } finally {
      setLoading(false);
    }
  }, [silentRefresh, clearSession]);

  // ── On mount: validate stored token, kick off refresh schedule ───────
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      setLoading(false);
      return;
    }

    const expiry = decodeTokenExpiry(storedToken);
    if (expiry && expiry < Date.now()) {
      // Access token already expired — try silent refresh before loading profile
      silentRefresh().then((ok) => {
        if (ok) refreshUser();
        else setLoading(false);
      });
    } else {
      scheduleRefresh(storedToken);
      refreshUser();
    }
  }, []);

  // ── Login: store tokens, set state, start refresh timer ─────────────
  const login = useCallback((
    newToken: string,
    newRefreshToken: string,
    newUser: UserProfile,
    profileData?: any,
  ) => {
    const fullUser = {
      ...newUser,
      profile: profileData || newUser.profile || newUser.studentProfile || newUser.facultyProfile || newUser.managementProfile,
    };

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(REFRESH_KEY, newRefreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(fullUser));

    setToken(newToken);
    setUser(fullUser);
    scheduleRefresh(newToken);
  }, [scheduleRefresh]);

  // ── Logout: tell server to blacklist token, then clear client state ──
  const logout = useCallback(async () => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);

    try {
      // Best-effort server-side revocation — don't block logout if it fails
      await apiClient.post('/auth/logout', { refreshToken: storedRefresh });
    } catch {
      // ignore — we still clear client session regardless
    }

    clearSession();
    window.location.href = '/login';
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
