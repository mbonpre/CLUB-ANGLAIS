import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Identifiants incorrects");
      }

      localStorage.setItem('token', data.access_token);
      if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError("Identifiants incorrects ou serveur indisponible.");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-md">
        <h2 className="text-xl font-bold mb-6 text-center text-slate-900">Club d'Anglais — Connexion</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adresse E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded text-sm transition"
          >
            Se connecter
          </button>
        </form>
      </div>
    </div>
  );
}