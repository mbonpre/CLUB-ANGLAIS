import { useState, useEffect } from 'react';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
});

const LEVEL_COLORS = {
  A1: 'bg-slate-400', A2: 'bg-blue-400', B1: 'bg-emerald-500',
  B2: 'bg-amber-500', C1: 'bg-orange-500', C2: 'bg-red-600',
};

const SECTIONS = [
  { value: 'debate', label: 'Débat' },
  { value: 'interpretation', label: 'Interprétation' },
  { value: 'news', label: 'Actualités' },
  { value: 'drama', label: 'Théâtre' },
];

export default function AdminPanel() {
  const [tab, setTab] = useState('operationnel');

  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestActionId, setRequestActionId] = useState(null);

  const [members, setMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [promotingId, setPromotingId] = useState(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editingLevelId, setEditingLevelId] = useState(null);
  const [banningId, setBanningId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [manageRooms, setManageRooms] = useState([]);
  const [closingRoomId, setClosingRoomId] = useState(null);

  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');
  const [announceSubmitting, setAnnounceSubmitting] = useState(false);
  const [announceFeedback, setAnnounceFeedback] = useState('');

  const [levelStats, setLevelStats] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [avgProgress, setAvgProgress] = useState(null);
  const [roomActivity, setRoomActivity] = useState(null);
  const [pendingAssessments, setPendingAssessments] = useState([]);
  const [validatingId, setValidatingId] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState(['', '', '', '']);
  const [qCorrect, setQCorrect] = useState(0);
  const [qLevel, setQLevel] = useState('A1');
  const [qSection, setQSection] = useState('debate');
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [statsError, setStatsError] = useState('');

  const [saFullName, setSaFullName] = useState('');
  const [saEmail, setSaEmail] = useState('');
  const [saPassword, setSaPassword] = useState('');
  const [saSubmitting, setSaSubmitting] = useState(false);
  const [saFeedback, setSaFeedback] = useState('');

  const fetchQuestions = async () => {
    try {
      const res = await fetch('http://localhost:8000/assessment/admin/questions', { headers: authHeaders() });
      setQuestions(res.ok ? await res.json() : []);
    } catch (err) { console.error(err); }
  };

  const resetQuestionForm = () => {
    setEditingQuestion(null); setQText(''); setQOptions(['', '', '', '']); setQCorrect(0);
    setQLevel('A1'); setQSection(currentUser?.section || 'debate'); setShowQuestionForm(false);
  };

  const openEditQuestion = (q) => {
    setEditingQuestion(q); setQText(q.text); setQOptions([...q.options]); setQCorrect(q.correct_index);
    setQLevel(q.level); setQSection(q.section || 'debate'); setShowQuestionForm(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (qOptions.some(o => !o.trim())) { alert('Remplis les 4 options.'); return; }
    setSavingQuestion(true);
    try {
      const payload = { text: qText.trim(), options: qOptions.map(o => o.trim()), correct_index: qCorrect, level: qLevel, is_active: true, section: qSection };
      const url = editingQuestion ? `http://localhost:8000/assessment/admin/questions/${editingQuestion.id}` : 'http://localhost:8000/assessment/admin/questions';
      const res = await fetch(url, { method: editingQuestion ? 'PUT' : 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur.');
      resetQuestionForm();
      fetchQuestions();
    } catch (err) { alert(err.message); } finally { setSavingQuestion(false); }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Supprimer cette question ?')) return;
    await fetch(`http://localhost:8000/assessment/admin/questions/${id}`, { method: 'DELETE', headers: authHeaders() });
    fetchQuestions();
  };

  const fetchPendingAssessments = async () => {
    try {
      const res = await fetch('http://localhost:8000/assessment/pending', { headers: authHeaders() });
      setPendingAssessments(res.ok ? await res.json() : []);
    } catch (err) { console.error(err); }
  };

  const handleValidateAssessment = async (id, level) => {
    setValidatingId(id);
    try {
      const res = await fetch(`http://localhost:8000/assessment/${id}/validate`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ final_level: level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setPendingAssessments(prev => prev.filter(a => a.id !== id));
      fetchMembers();
    } catch (err) { alert(err.message); } finally { setValidatingId(null); }
  };

  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch('http://localhost:8000/account-requests/', { headers: authHeaders() });
      const data = await res.json();
      setRequests(Array.isArray(data) ? data.filter(r => r.status === 'pending') : []);
    } catch (err) {
      console.error('Erreur chargement demandes :', err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch('http://localhost:8000/users/');
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement membres :', err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchManageRooms = async () => {
    try {
      const res = await fetch('http://localhost:8000/rooms/', { headers: authHeaders() });
      const data = await res.json();
      setManageRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement salons :', err);
    }
  };

  const handleBanToggle = async (member) => {
    if (!window.confirm(member.is_active
      ? `Bannir ${member.full_name} ? Il ne pourra plus se connecter, même s'il est actuellement en session.`
      : `Réactiver ${member.full_name} ?`)) return;

    setBanningId(member.id);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${member.id}/toggle-active`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: data.is_active } : m));
    } catch (err) {
      alert(err.message);
    } finally {
      setBanningId(null);
    }
  };

  const handleDeleteUser = async (member) => {
    if (!window.confirm(`SUPPRIMER DÉFINITIVEMENT le compte de ${member.full_name} ? Cette action est irréversible et effacera son accès au site.`)) return;
    setDeletingId(member.id);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${member.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMembers(prev => prev.filter(m => m.id !== member.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCloseRoom = async (room) => {
    if (!window.confirm(`Fermer le salon "${room.name}" ? Plus personne ne pourra y écrire (l'historique reste visible).`)) return;
    setClosingRoomId(room.id);
    try {
      const res = await fetch(`http://localhost:8000/rooms/${room.id}/close`, {
        method: 'PATCH', headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setManageRooms(prev => prev.map(r => r.id === room.id ? { ...r, is_closed: true } : r));
    } catch (err) {
      alert(err.message);
    } finally {
      setClosingRoomId(null);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`SUPPRIMER DÉFINITIVEMENT "${room.name}" ? Efface tous ses messages, action irréversible.`)) return;
    setClosingRoomId(room.id);
    try {
      const res = await fetch(`http://localhost:8000/rooms/${room.id}`, { method: 'DELETE', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setManageRooms(prev => prev.filter(r => r.id !== room.id));
    } catch (err) {
      alert(err.message);
    } finally {
      setClosingRoomId(null);
    }
  };

  const fetchStats = async () => {
    setStatsError('');
    try {
      const [levelRes, engagementRes, progressRes, roomsRes] = await Promise.all([
        fetch('http://localhost:8000/stats/level-distribution', { headers: authHeaders() }),
        fetch('http://localhost:8000/stats/engagement', { headers: authHeaders() }),
        fetch('http://localhost:8000/stats/average-progress', { headers: authHeaders() }),
        fetch('http://localhost:8000/stats/room-activity', { headers: authHeaders() }),
      ]);
      if (!levelRes.ok || !engagementRes.ok || !progressRes.ok || !roomsRes.ok) throw new Error('Erreur lors du chargement des statistiques.');
      setLevelStats(await levelRes.json());
      setEngagement(await engagementRes.json());
      setAvgProgress(await progressRes.json());
      setRoomActivity(await roomsRes.json());
    } catch (err) {
      setStatsError(err.message);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchMembers();
    fetchManageRooms();
    fetchPendingAssessments();
    fetchQuestions();
    fetch('http://localhost:8000/auth/me', { headers: authHeaders() }).then(r => r.json()).then(setCurrentUser).catch(() => {});
  }, []);

  const handlePromoteAdmin = async (member) => {
    const section = member._section || 'debate';
    const sectionLabel = SECTIONS.find(s => s.value === section)?.label || section;
    if (!window.confirm(`Promouvoir ${member.full_name} en Admin de la section "${sectionLabel}" ? Il aura les pouvoirs d'Admin uniquement sur cette section.`)) return;
    setPromotingId(member.id);
    try {
      const res = await fetch(`http://localhost:8000/auth/users/${member.id}/promote?new_role=ADMIN&section=${section}`, { method: 'PUT', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: 'ADMIN', section } : m));
    } catch (err) {
      alert(err.message);
    } finally {
      setPromotingId(null);
    }
  };

  const filteredMembers = members.filter(m =>
    m.full_name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  useEffect(() => {
    if (tab === 'stats') fetchStats();
  }, [tab]);

  const handleApprove = async (id) => {
    setRequestActionId(id);
    try {
      const res = await fetch(`http://localhost:8000/account-requests/${id}/approve`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      fetchRequests();
      fetchMembers();
    } catch (err) {
      alert(err.message);
    } finally {
      setRequestActionId(null);
    }
  };

  const handleReject = async (id) => {
    setRequestActionId(id);
    try {
      const res = await fetch(`http://localhost:8000/account-requests/${id}/reject`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      fetchRequests();
    } catch (err) {
      alert(err.message);
    } finally {
      setRequestActionId(null);
    }
  };

  const handleLevelChange = async (userId, newLevel, memberName) => {
    if (!window.confirm(`Confirmer le changement de niveau de ${memberName} vers ${newLevel} ?`)) return;
    setEditingLevelId(userId);
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}/level`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ english_level: newLevel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, english_level: newLevel } : m));
    } catch (err) {
      alert(err.message);
    } finally {
      setEditingLevelId(null);
    }
  };

  const handleSectionChange = async (userId, newSection, memberName) => {
    if (!window.confirm(`Confirmer le changement de section de ${memberName} vers "${SECTIONS.find(s => s.value === newSection)?.label}" ?`)) return;
    try {
      const res = await fetch(`http://localhost:8000/admin/users/${userId}/section`, {
        method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ section: newSection }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, section: newSection } : m));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    setAnnounceFeedback('');
    setAnnounceSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/posts/', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ title: announceTitle, content: announceContent, post_type: 'official' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de l'envoi.");
      setAnnounceFeedback('✅ Annonce publiée dans le flux officiel.');
      setAnnounceTitle('');
      setAnnounceContent('');
    } catch (err) {
      setAnnounceFeedback(`⚠️ ${err.message}`);
    } finally {
      setAnnounceSubmitting(false);
    }
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    setSaFeedback(''); setSaSubmitting(true);
    try {
      const res = await fetch('http://localhost:8000/auth/create-super-admin', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ full_name: saFullName, email: saEmail, password: saPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur.");
      setSaFeedback(`✅ ${data.message}`);
      setSaFullName(''); setSaEmail(''); setSaPassword('');
    } catch (err) {
      setSaFeedback(`⚠️ ${err.message}`);
    } finally {
      setSaSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-lg p-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black">Espace Administration</h1>
          <p className="text-sm text-slate-400">Gestion du club et suivi des statistiques</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('operationnel')} className={`px-4 py-2 rounded text-sm font-bold transition ${tab === 'operationnel' ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>
            Gestion Opérationnelle
          </button>
          <button onClick={() => setTab('stats')} className={`px-4 py-2 rounded text-sm font-bold transition ${tab === 'stats' ? 'bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}>
            Statistiques & Analyses
          </button>
        </div>
      </div>

      {tab === 'operationnel' && (
        <div className="space-y-6">
          {currentUser?.is_super_admin && (
            <div className="bg-white rounded-lg shadow-sm border border-purple-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">👑 Créer un nouveau Super Admin</h2>
              {saFeedback && <p className="text-xs mb-2">{saFeedback}</p>}
              <form onSubmit={handleCreateSuperAdmin} className="space-y-2">
                <input type="text" placeholder="Nom complet" value={saFullName} onChange={(e) => setSaFullName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-sm" required />
                <input type="email" placeholder="Email" value={saEmail} onChange={(e) => setSaEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-sm" required />
                <input type="password" placeholder="Mot de passe" value={saPassword} onChange={(e) => setSaPassword(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded text-sm" required minLength={6} />
                <button type="submit" disabled={saSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded text-sm transition disabled:opacity-50">
                  {saSubmitting ? 'Création...' : 'Créer ce Super Admin'}
                </button>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">
              Demandes de compte en attente {requests.length > 0 && <span className="text-red-600">({requests.length})</span>}
            </h2>
            {loadingRequests ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : requests.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucune demande en attente.</p>
            ) : (
              <div className="space-y-3">
                {requests.map(req => (
                  <div key={req.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">
                        {req.full_name} — {req.email}
                      </p>
                      {req.message && <p className="text-xs text-slate-500 italic mt-0.5">"{req.message}"</p>}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprove(req.id)} disabled={requestActionId === req.id} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50">Approuver</button>
                      <button onClick={() => handleReject(req.id)} disabled={requestActionId === req.id} className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50">Refuser</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">
              🎓 Évaluations de niveau à valider {pendingAssessments.length > 0 && <span className="text-red-600">({pendingAssessments.length})</span>}
            </h2>
            {pendingAssessments.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucune évaluation en attente.</p>
            ) : (
              <div className="space-y-3">
                {pendingAssessments.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div>
                      <p className="font-semibold text-sm text-slate-900">{a.user.full_name}</p>
                      <p className="text-xs text-slate-500">Score : {a.score}/{a.total_questions} — Suggestion machine : <strong className="text-blue-700">{a.suggested_level}</strong></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        defaultValue={a.suggested_level}
                        onChange={(e) => (a._chosen = e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1"
                      >
                        {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <button
                        onClick={() => handleValidateAssessment(a.id, a._chosen || a.suggested_level)}
                        disabled={validatingId === a.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50"
                      >
                        {validatingId === a.id ? '...' : 'Valider'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-slate-900">🧩 Questions du test de niveau ({questions.length})</h2>
              <button onClick={() => { resetQuestionForm(); setShowQuestionForm(true); }} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition">+ Ajouter</button>
            </div>

            {showQuestionForm && (
              <form onSubmit={handleSaveQuestion} className="mb-4 p-4 border border-slate-200 rounded-lg space-y-2 bg-slate-50">
                <input type="text" placeholder="Texte de la question" value={qText} onChange={(e) => setQText(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm" required />
                {qOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input type="radio" checked={qCorrect === idx} onChange={() => setQCorrect(idx)} title="Bonne réponse" />
                    <input type="text" placeholder={`Option ${idx + 1}`} value={opt} onChange={(e) => { const n = [...qOptions]; n[idx] = e.target.value; setQOptions(n); }} className="flex-1 p-1.5 border border-slate-200 rounded text-xs" required />
                  </div>
                ))}
                <div className="flex gap-2">
                  <select value={qLevel} onChange={(e) => setQLevel(e.target.value)} className="p-1.5 border border-slate-200 rounded text-xs bg-white">
                    {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  {currentUser?.is_super_admin && (
                    <select value={qSection} onChange={(e) => setQSection(e.target.value)} className="p-1.5 border border-slate-200 rounded text-xs bg-white">
                      {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingQuestion} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50">
                    {savingQuestion ? '...' : (editingQuestion ? 'Enregistrer' : 'Créer')}
                  </button>
                  <button type="button" onClick={resetQuestionForm} className="text-xs text-slate-500 px-3 py-1.5">Annuler</button>
                </div>
              </form>
            )}

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {questions.map(q => (
                <div key={q.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{q.text}</p>
                    <p className="text-[10px] text-slate-400">
                      {q.level} · Réponse : {q.options[q.correct_index]}
                      {q.section && ` · ${SECTIONS.find(s => s.value === q.section)?.label || q.section}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEditQuestion(q)} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">✏️</button>
                    <button onClick={() => handleDeleteQuestion(q.id)} className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2 py-1 rounded">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">📢 Envoyer une annonce officielle</h2>
            {announceFeedback && <p className="text-xs mb-2">{announceFeedback}</p>}
            <form onSubmit={handleSendAnnouncement} className="space-y-2">
              <input type="text" placeholder="Titre de l'annonce" value={announceTitle} onChange={(e) => setAnnounceTitle(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
              <textarea placeholder="Contenu..." value={announceContent} onChange={(e) => setAnnounceContent(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-red-500" required />
              <button type="submit" disabled={announceSubmitting} className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded transition disabled:opacity-50">
                {announceSubmitting ? 'Envoi...' : 'Publier dans le flux officiel'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Membres ({filteredMembers.length}/{members.length})</h2>
            <input
              type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Rechercher un membre par nom ou email..."
              className="w-full mb-3 p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            {loadingMembers ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                      <th className="pb-2">Nom</th><th className="pb-2">Email</th><th className="pb-2">Rôle</th><th className="pb-2">Section</th><th className="pb-2">Niveau</th><th className="pb-2">Statut</th><th className="pb-2">Supprimer</th>
                      {currentUser?.is_super_admin && <th className="pb-2">Admin</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(m => (
                      <tr key={m.id} className="border-b border-slate-50">
                        <td className="py-2 font-medium text-slate-800">{m.full_name}</td>
                        <td className="py-2 text-slate-500">{m.email}</td>
                        <td className="py-2 text-slate-500">{m.role}</td>
                        <td className="py-2 text-xs">
                          {currentUser?.is_super_admin ? (
                            <select
                              value={m.section || ''}
                              onChange={(e) => handleSectionChange(m.id, e.target.value, m.full_name)}
                              className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none"
                            >
                              {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          ) : (
                            SECTIONS.find(s => s.value === m.section)?.label || '—'
                          )}
                        </td>
                        <td className="py-2">
                          <select value={m.english_level} disabled={editingLevelId === m.id} onChange={(e) => handleLevelChange(m.id, e.target.value, m.full_name)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs bg-white focus:outline-none disabled:opacity-50">
                            {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                          </select>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleBanToggle(m)}
                            disabled={banningId === m.id || m.role === 'ADMIN'}
                            title={m.role === 'ADMIN' ? "Impossible de bannir un Admin" : ''}
                            className={`text-xs font-bold px-3 py-1 rounded-full transition disabled:opacity-40 ${
                              m.is_active === false ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                            }`}
                          >
                            {banningId === m.id ? '...' : (m.is_active === false ? 'Réactiver' : 'Bannir')}
                          </button>
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleDeleteUser(m)}
                            disabled={deletingId === m.id || m.role === 'ADMIN'}
                            title={m.role === 'ADMIN' ? "Impossible de supprimer un Admin" : ''}
                            className="text-xs font-bold px-3 py-1 rounded-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition"
                          >
                            {deletingId === m.id ? '...' : 'Supprimer'}
                          </button>
                        </td>
                        {currentUser?.is_super_admin && (
                          <td className="py-2">
                            {m.role === 'ADMIN' ? (
                              <span className="text-[10px] text-slate-400">Déjà Admin ({SECTIONS.find(s => s.value === m.section)?.label || '—'})</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <select
                                  defaultValue="debate"
                                  onChange={(e) => (m._section = e.target.value)}
                                  className="text-[10px] border border-slate-200 rounded px-1 py-1"
                                >
                                  {SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                                <button onClick={() => handlePromoteAdmin(m)} disabled={promotingId === m.id}
                                  className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 disabled:opacity-50">
                                  {promotingId === m.id ? '...' : 'Promouvoir Admin'}
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Salons de discussion ({manageRooms.length})</h2>
            {manageRooms.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucun salon créé pour le moment (crée-en un depuis la Messagerie).</p>
            ) : (
              <div className="space-y-2">
                {manageRooms.map(room => (
                  <div key={room.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-lg">
                    <div>
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: room.color || '#DC2626' }}></span>
                      <span className="text-sm font-semibold text-slate-800">#{room.name}</span>
                      {room.is_closed && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Fermé</span>}
                      <p className="text-xs text-slate-400">{room.member_count} membre(s) · {room.message_count} messages</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!room.is_closed && (
                        <button onClick={() => handleCloseRoom(room)} disabled={closingRoomId === room.id}
                          className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50">
                          {closingRoomId === room.id ? '...' : 'Fermer'}
                        </button>
                      )}
                      <button onClick={() => handleDeleteRoom(room)} disabled={closingRoomId === room.id}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition disabled:opacity-50">
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-6">
          {statsError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">⚠️ {statsError}</p>}

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-4">Répartition des niveaux d'anglais</h2>
            {!levelStats ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : (
              <div className="space-y-2">
                {levelStats.distribution.map(row => (
                  <div key={row.level} className="flex items-center gap-3">
                    <span className="w-8 text-xs font-bold text-slate-600">{row.level}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <div className={`h-full ${LEVEL_COLORS[row.level]} transition-all`} style={{ width: `${row.percentage}%` }} />
                    </div>
                    <span className="w-20 text-xs text-slate-500 text-right">{row.count} ({row.percentage}%)</span>
                  </div>
                ))}
                <p className="text-xs text-slate-400 pt-2">{levelStats.total_members} membres au total</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Taux d'engagement (7 derniers jours)</h2>
            {!engagement ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-4xl font-black text-red-600">{engagement.engagement_rate}%</div>
                <p className="text-sm text-slate-500">
                  {engagement.active_this_week} membre(s) actif(s) sur {engagement.total_members} inscrits
                  <br /><span className="text-xs text-slate-400">Basé sur les connexions enregistrées.</span>
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Progrès moyen pour monter d'un niveau</h2>
            {!avgProgress ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : avgProgress.average_days_per_level === null ? (
              <p className="text-sm text-slate-400 italic">{avgProgress.message}</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="text-4xl font-black text-red-600">{avgProgress.average_days_per_level}j</div>
                <p className="text-sm text-slate-500">
                  En moyenne, sur {avgProgress.sample_size} changement(s) de niveau enregistré(s).
                </p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-5">
            <h2 className="font-bold text-slate-900 mb-3">Activité par salon de discussion</h2>
            {!roomActivity ? (
              <p className="text-sm text-slate-500">Chargement...</p>
            ) : roomActivity.length === 0 ? (
              <p className="text-sm text-slate-400 italic">Aucun salon créé pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {roomActivity.map((r, idx) => (
                  <div key={r.room_name} className="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">#{idx + 1}</span>
                      <span className="text-sm font-medium text-slate-800">{r.room_name}</span>
                      {r.is_closed && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Fermé</span>}
                    </div>
                    <span className="text-sm font-bold text-red-600">{r.message_count} msg</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}