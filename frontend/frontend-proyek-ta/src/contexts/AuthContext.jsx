import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMeApi, loginApi } from '../api/authApi';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

const ROLE_HOME = { admin: '/pos', owner: '/dashboard' };

const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => !!localStorage.getItem('token'));

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  // Verifikasi sesi tersimpan saat aplikasi dimuat
  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    let active = true;
    getMeApi()
      .then((res) => {
        if (!active) return;
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      })
      .catch(() => active && clearSession())
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [clearSession]);

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    navigate(ROLE_HOME[newUser.role] || '/login', { replace: true });
    return newUser;
  };

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const value = useMemo(
    () => ({ user, token, isAuthenticated: !!token && !!user, loading, login, logout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}