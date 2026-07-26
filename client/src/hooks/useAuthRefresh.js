import { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

export const useAuthRefresh = () => {
  const [loading, setLoading] = useState(true);
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const refresh = async () => {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { accessToken, user } = response.data;
        setAuth(user, accessToken);
      } catch (err) {
        // expected if not logged in
      } finally {
        setLoading(false);
      }
    };
    refresh();
  }, [setAuth]);

  return loading;
};
