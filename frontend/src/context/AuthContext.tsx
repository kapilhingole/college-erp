import React, { createContext, useContext, useState, useEffect } from 'react';
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
  login: (token: string, user: UserProfile, profileData?: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('college_erp_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('college_erp_token');
  });
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await apiClient.get('/auth/profile');
      if (res.data.success) {
        const userData = res.data.data;
        setUser(userData);
        localStorage.setItem('college_erp_user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserProfile, profileData?: any) => {
    setToken(newToken);
    const fullUser = {
      ...newUser,
      profile: profileData || newUser.profile || newUser.studentProfile || newUser.facultyProfile || newUser.managementProfile,
    };
    setUser(fullUser);
    localStorage.setItem('college_erp_token', newToken);
    localStorage.setItem('college_erp_user', JSON.stringify(fullUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('college_erp_token');
    localStorage.removeItem('college_erp_user');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
