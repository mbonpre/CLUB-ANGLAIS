import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const hasCustomAvatar = (url) => !!url && url !== 'default.png';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
};

export default function Members() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetch(   `${API_BASE_URL}/users/`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setMembers(d); setLoading(false); })
      .catch(() => setLoading(false));

    const token = localStorage.getItem('token');
    if (token) {
      fetch(   `${API_BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(u => setIsStaff(u && ['ADMIN', 'COMMUNITY_MANAGER'].includes(u.role)))
        .catch(() => setIsStaff(false));
    }
  }, []);

  const handleUpdateLevel = async (userId, newLevel, memberName) => {
    if (!window.confirm(`Confirmer le changement de niveau de ${memberName} vers ${newLevel} ?`)) return;
    setEditingId(userId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/level`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ english_level: newLevel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur.');
      setMembers(members.map(m => m.id === userId ? { ...m, english_level: newLevel } : m));
    } catch (err) {
      alert(`Échec : ${err.message}`);
    } finally {
      setEditingId(null);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.full_name?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter ? m.english_level === levelFilter : true;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Annuaire des Membres 👥</h2>
          <p className="text-sm text-slate-500">Consultez la liste des membres et leurs niveaux d'anglais.</p>
        </div>
        <div className="flex gap-2 sm:gap-3 w-full md:w-auto">
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="p-2 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 flex-1 min-w-0 md:w-64" />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className="shrink-0 p-2 border border-slate-200 rounded text-xs sm:text-sm bg-white">
            <option value="">Tous les niveaux</option>
            {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="col-span-full text-center text-slate-500 py-8">Chargement...</p>
        ) : filteredMembers.length === 0 ? (
          <p className="col-span-full text-center text-slate-500 py-8 bg-white p-6 rounded-lg border border-slate-200">Aucun membre trouvé.</p>
        ) : (
          filteredMembers.map(member => (
            <div key={member.id} className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-bold text-sm overflow-hidden">
                    {hasCustomAvatar(member.profile_image)
                      ? <img src={member.profile_image} alt={member.full_name} className="w-full h-full object-cover" />
                      : getInitials(member.full_name)}
                  </div>
                  <div className="flex-1 min-w-0 flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 break-words leading-tight">{member.full_name || "Utilisateur"}</h3>
                      <p className="text-xs text-slate-500 break-words">{member.email}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">{member.english_level || 'A1'}</span>
                  </div>
                </div>
              </div>

              {isStaff && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-600 shrink-0">Niveau officiel :</span>
                  <select
                    value={member.english_level || 'A1'}
                    disabled={editingId === member.id}
                    onChange={(e) => handleUpdateLevel(member.id, e.target.value, member.full_name)}
                    className="text-xs p-1.5 border border-slate-300 rounded bg-slate-50 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                  >
                    {['A1','A2','B1','B2','C1','C2'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}