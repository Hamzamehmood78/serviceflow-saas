import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 15000,
});

let refreshPromise = null;

// 401 aaye to aik dafa token refresh karke wohi request dobara bhejo
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';
    const isAuthCall = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].some((p) =>
      url.includes(p)
    );

    if (status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        // Kai requests aik saath fail hon to refresh sirf aik dafa hota hai
        refreshPromise =
          refreshPromise ||
          api.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        await refreshPromise;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;