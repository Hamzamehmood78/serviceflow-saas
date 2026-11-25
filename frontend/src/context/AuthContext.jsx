import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null); // { user, business, role } ya null
  const [loading, setLoading] = useState(true);

  // Page khulte hi pooch lo: koi pehle se login hai?
  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then(({ data }) => active && setSession(data.data))
      .catch(() => active && setSession(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setSession(data.data);
  }, []);

  // Register sirf account banata hai, login nahi karta
  const register = useCallback(async ({ name, email, password }) => {
    await api.post('/auth/register', { name, email, password });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setSession(null);
    }
  }, []);

  // Settings save hone ke baad session ka business data taaza karo
  const updateBusiness = useCallback((b) => {
    setSession(
      (s) =>
        s && {
          ...s,
          business: {
            ...s.business,
            name: b.name,
            slug: b.slug,
            timezone: b.timezone,
            currency: b.currency,
            onboardingCompleted: b.onboardingCompleted,
          },
        }
    );
  }, []);

  const value = useMemo(
    () => ({ session, loading, login, register, logout, updateBusiness }),
    [session, loading, login, register, logout, updateBusiness]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}