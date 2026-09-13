import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Assessment() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    fetch(   `${API_BASE_URL}/assessment/questions`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json())
      .then(d => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => setError('Impossible de charger le test.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (Object.keys(answers).length < questions.length) {
      setError('Réponds à toutes les questions avant de valider.');
      return;
    }
    setError(''); setSubmitting(true);
    try {
      const res = await fetch(   `${API_BASE_URL}/assessment/submit`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ answers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur.');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-center text-slate-500 py-10">Chargement du test...</p>;

  if (result) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <p className="text-4xl mb-3">📊</p>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Résultat de ton test</h2>
        <p className="text-sm text-slate-500 mb-4">{result.score} / {result.total_questions} bonnes réponses</p>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
          <p className="text-xs text-emerald-700 font-semibold uppercase mb-1">Ton niveau a été mis à jour</p>
          <p className="text-3xl font-black text-emerald-900">{result.suggested_level}</p>
        </div>
        <p className="text-xs text-slate-400">
          Ce niveau est appliqué immédiatement à ton profil. Un administrateur peut encore le confirmer ou l'ajuster si besoin (approche hybride machine + humain).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-1">📝 Test d'évaluation de niveau</h2>
        <p className="text-sm text-slate-500">Réponds à ces {questions.length} questions. Le résultat sera d'abord calculé automatiquement, puis confirmé par un administrateur.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <p className="font-semibold text-slate-900 mb-3">{idx + 1}. {q.text}</p>
            <div className="space-y-2">
              {q.options.map((opt, optIdx) => (
                <label key={optIdx} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${answers[q.id] === optIdx ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === optIdx} onChange={() => setAnswers({ ...answers, [q.id]: optIdx })} className="accent-blue-600" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="submit" disabled={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg text-sm transition disabled:opacity-50">
          {submitting ? 'Envoi...' : 'Valider mes réponses'}
        </button>
      </form>
    </div>
  );
}