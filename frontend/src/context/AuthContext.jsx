import { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set Base URL
    axios.defaults.baseURL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api';
    
    // Add Token Interceptor
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add Response Interceptor for 401 Expired Sessions
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401 && error.response.data?.expired) {
          logout();
          toast.error('Session expired. Please log in again.');
        }
        return Promise.reject(error);
      }
    );

    checkUserLoggedIn();
  }, []);

  const checkUserLoggedIn = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await axios.get('/auth/me');
        setUser(res.data);
      } catch (err) {
        console.error(err);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const res = await axios.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data);
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await axios.post('/auth/register', { name, email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
