import { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'forgot', 'request'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Demande de compte
  const [reqFullName, setReqFullName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPassword, setReqPassword] = useState('');
  const [reqMessage, setReqMessage] = useState('');
  const [reqSuccess, setReqSuccess] = useState('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
      const response = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Identifiants incorrects");

      localStorage.setItem('token', data.access_token);
      if (onLoginSuccess) onLoginSuccess();
      else window.location.reload();
    } catch (err) {
      setError("Identifiants incorrects ou serveur indisponible.");
    }
  };

  const handleRequestAccount = async (e) => {
    e.preventDefault();
    setError('');
    setReqSuccess('');
    setReqSubmitting(true);

    try {
      const res = await fetch('http://localhost:8000/account-requests/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: reqFullName,
          email: reqEmail,
          password: reqPassword,
          message: reqMessage || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de l'envoi de la demande.");

      setReqSuccess("Ta demande a bien été envoyée ! Un admin va l'examiner et tu pourras te connecter une fois approuvée.");
      setReqFullName('');
      setReqEmail('');
      setReqPassword('');
      setReqMessage('');
    } catch (err) {
      setError(err.message);
    } finally {
      setReqSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 w-full max-w-md">
        <h2 className="text-xl font-bold mb-6 text-center text-slate-900">
          {mode === 'request' ? "Demander un accès au club" : "Club d'Anglais — Connexion"}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>
        )}
        {reqSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded">{reqSuccess}</div>
        )}

        {mode === 'forgot' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded">
              🔒 Pour des raisons de sécurité, la réinitialisation ne peut plus se faire seul en ligne.
              Contacte un administrateur ou Community Manager du club — il pourra réinitialiser ton
              mot de passe depuis son compte.
            </div>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-slate-600 hover:underline">
              Retour à la connexion
            </button>
          </div>
        )}

        {mode === 'request' && !reqSuccess && (
          <form onSubmit={handleRequestAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nom complet</label>
              <input type="text" value={reqFullName} onChange={(e) => setReqFullName(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse E-mail</label>
              <input type="email" value={reqEmail} onChange={(e) => setReqEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Choisis un mot de passe</label>
              <input type="password" value={reqPassword} onChange={(e) => setReqPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required minLength={6} />
              <p className="text-[11px] text-slate-400 mt-1">Utilisable seulement si ta demande est approuvée.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pourquoi veux-tu rejoindre le club ? (optionnel)</label>
              <textarea value={reqMessage} onChange={(e) => setReqMessage(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <button type="submit" disabled={reqSubmitting}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded text-sm transition disabled:opacity-50">
              {reqSubmitting ? 'Envoi...' : 'Envoyer ma demande'}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-slate-600 hover:underline">
              Retour à la connexion
            </button>
          </form>
        )}

        {mode === 'request' && reqSuccess && (
          <button type="button" onClick={() => { setMode('login'); setReqSuccess(''); }}
            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold p-2.5 rounded text-sm transition">
            Retour à la connexion
          </button>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Adresse E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2.5 rounded text-sm transition">
              Se connecter
            </button>
            <div className="flex justify-between text-xs mt-1">
              <button type="button" onClick={() => setMode('request')} className="text-slate-600 hover:underline">
                Pas encore de compte ?
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="text-red-600 hover:underline">
                Mot de passe oublié ?
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}