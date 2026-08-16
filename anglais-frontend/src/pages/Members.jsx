import { useState, useEffect } from 'react';

export default function Members() {
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Charger les membres depuis l'API FastAPI au chargement de la page
  useEffect(() => {
    fetch('http://localhost:8000/users/')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMembers(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des membres:", err);
        setLoading(false);
      });
  }, []);

  // Fonction pour promouvoir un membre (réservée aux Admin et CM selon les règles du backend)
  const handlePromote = async (userId, targetRole) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:8000/users/${userId}/promote?new_role=${targetRole}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de la promotion");
      }

      alert(data.message);
      // Recharger la liste des membres pour voir le changement de rôle
      window.location.reload();
    } catch (err) {
      alert(err.message);
    }
  };

  // Affichage dynamique des badges selon le rôle
  const renderRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return <span className="bg-slate-900 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Admin ⚡</span>;
      case 'COMMUNITY_MANAGER':
        return <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">CM 📢</span>;
      case 'COACH':
        return <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">Coach 🎓</span>;
      default:
        return <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Member</span>;
    }
  };

  // Filtrage dynamique
  const filteredMembers = members.filter((m) => {
    const matchesSearch = (m.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (m.skills || '').toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || m.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6">
      {/* Barre de recherche et filtres */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
        <input
          type="text"
          placeholder="Rechercher un membre ou une compétence..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-2/3 p-2.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="w-full md:w-1/3 p-2.5 border border-slate-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="ALL">Tous les niveaux d'anglais</option>
          <option value="A2">Niveau A2 (Élémentaire)</option>
          <option value="B2">Niveau B2 (Intermédiaire)</option>
          <option value="C1">Niveau C1 (Avancé)</option>
        </select>
      </div>

      {/* État de chargement */}
      {loading ? (
        <p className="text-center text-slate-500 py-8">Chargement des membres de la communauté...</p>
      ) : filteredMembers.length === 0 ? (
        <p className="text-center text-slate-500 py-8">Aucun membre trouvé.</p>
      ) : (
        /* Liste des cartes membres */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMembers.map((member) => (
            <div key={member.id} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg">{member.full_name}</h3>
                    <div className="mt-1">{renderRoleBadge(member.role)}</div>
                  </div>
                  <span className="bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded">
                    {member.email}
                  </span>
                </div>

                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  {member.bio || "Aucune bio renseignée pour le moment."}
                </p>

                {/* Badges de compétences */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {member.skills ? (
                    member.skills.split(',').map((skill, idx) => (
                      <span key={idx} className="bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded font-medium">
                        {skill.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Aucune compétence spécifiée</span>
                  )}
                </div>
              </div>

              {/* Actions d'administration (Exemple de boutons de promotion rapides) */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="text-slate-400">Inscrit le {new Date(member.created_at).toLocaleDateString()}</span>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePromote(member.id, 'COACH')} 
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition font-medium"
                  >
                    Mettre Coach
                  </button>
                  <button 
                    onClick={() => handlePromote(member.id, 'COMMUNITY_MANAGER')} 
                    className="bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded transition font-medium"
                  >
                    Mettre CM
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}