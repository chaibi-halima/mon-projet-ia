import { useState } from 'react';
import { AuthContext } from './AuthContext.js';

// Ce fichier n'exporte QUE le composant React
export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('jwt_token') || null);

  const login = (newToken) => {
    localStorage.setItem('jwt_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}