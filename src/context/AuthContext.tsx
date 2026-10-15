import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.ts';

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'patient';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  dob?: string;
  mustChangePassword?: boolean;
  patientId?: string; // Record ID e.g. 'pat-ananya'
  patientCode?: string; // VL-2026-XXXXXX
  doctorId?: string;
  nurseId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, role?: UserRole, rememberMe?: boolean) => Promise<{ user: User; mustChangePassword?: boolean }>;
  register: (data: any) => Promise<User>;
  guestLogin: (role?: UserRole) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateUserContext: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ user: {} as User }),
  register: async () => ({} as User),
  guestLogin: async () => ({} as User),
  logout: () => {},
  refreshUser: async () => {},
  updateUserContext: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('vitallink_token');
    const storedUser = localStorage.getItem('vitallink_user');

    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        // Verify with /api/auth/me
        api.get('/auth/me')
          .then((res) => {
            const data = res.data;
            const updatedUser: User = {
              id: data.id,
              email: data.email,
              role: data.role,
              fullName: data.fullName,
              phone: data.phone,
              address: data.address,
              dob: data.dob,
              avatarUrl: data.avatarUrl,
              mustChangePassword: data.mustChangePassword,
              patientId: data.patient?.id,
              patientCode: data.patient?.patient_id,
              doctorId: data.doctor?.id,
              nurseId: data.nurse?.id,
            };
            setUser(updatedUser);
            localStorage.setItem('vitallink_user', JSON.stringify(updatedUser));
          })
          .catch(() => {
            // Token might be refreshed or invalid
          })
          .finally(() => setLoading(false));
      } catch (e) {
        setUser(null);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string, role?: UserRole, rememberMe?: boolean) => {
    const res = await api.post('/auth/login', { identifier, password, role, rememberMe });
    const { user: userData, tokens } = res.data;

    localStorage.setItem('vitallink_token', tokens.accessToken);
    localStorage.setItem('vitallink_refresh_token', tokens.refreshToken);
    localStorage.setItem('vitallink_user', JSON.stringify(userData));
    setUser(userData);

    return { user: userData, mustChangePassword: userData.mustChangePassword };
  };

  const register = async (registerData: any): Promise<User> => {
    const res = await api.post('/auth/register', registerData);
    const { user: userData, tokens } = res.data;

    localStorage.setItem('vitallink_token', tokens.accessToken);
    localStorage.setItem('vitallink_refresh_token', tokens.refreshToken);
    localStorage.setItem('vitallink_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const guestLogin = async (role: UserRole = 'patient'): Promise<User> => {
    const res = await api.post('/auth/guest-login', { role });
    const { user: userData, tokens } = res.data;

    localStorage.setItem('vitallink_token', tokens.accessToken);
    localStorage.setItem('vitallink_refresh_token', tokens.refreshToken);
    localStorage.setItem('vitallink_user', JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  const logout = () => {
    localStorage.removeItem('vitallink_token');
    localStorage.removeItem('vitallink_refresh_token');
    localStorage.removeItem('vitallink_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res.data;
      const updatedUser: User = {
        id: data.id,
        email: data.email,
        role: data.role,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        dob: data.dob,
        avatarUrl: data.avatarUrl,
        mustChangePassword: data.mustChangePassword,
        patientId: data.patient?.id,
        patientCode: data.patient?.patient_id,
        doctorId: data.doctor?.id,
        nurseId: data.nurse?.id,
      };
      setUser(updatedUser);
      localStorage.setItem('vitallink_user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('Failed refreshing user:', err);
    }
  };

  const updateUserContext = (updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('vitallink_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, guestLogin, logout, refreshUser, updateUserContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
