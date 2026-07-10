import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = 'https://nexus-production-abcc.up.railway.app/api/auth';

const TOKEN_KEY = 'business_nexus_token';
const USER_STORAGE_KEY = 'business_nexus_user';

interface AuthContextType {
  user: any | null;
  token: string | null;
   login: (email: string, password: string) => Promise<any>;
  register: (fullName: string, email: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Record<string, any>) => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored session on initial mount
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

 const login = async (email: string, password: string): Promise<any> => {
  setIsLoading(true);
  try {
    const res = await axios.post(`${API_URL}/login`, { email, password });
    const { token: newToken, user: apiUser } = res.data;

    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(apiUser));
    setToken(newToken);
    setUser(apiUser);
    toast.success('Successfully logged in!');
    return apiUser;
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Login failed');
    throw error;
  } finally {
    setIsLoading(false);
  }
};

  const register = async (
    fullName: string,
    email: string,
    password: string,
    role: string
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${API_URL}/register`, { fullName, email, password, role });
      const { token: newToken, user: apiUser } = res.data;

      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(apiUser));
      setToken(newToken);
      setUser(apiUser);
      toast.success('Account created successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Record<string, any>): Promise<void> => {
    try {
      const res = await axios.put(`${API_URL}/profile`, updates, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const updatedUser = res.data.user;

      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Profile update failed');
      throw error;
    }
  };

  const logout = (): void => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user && !!token,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};