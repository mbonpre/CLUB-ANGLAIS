import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Dashboard
      isAuthenticated={isAuthenticated}
      onLoginSuccess={() => setIsAuthenticated(true)}
      onLogout={handleLogout}
    />
  );
}