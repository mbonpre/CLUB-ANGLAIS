import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const timeAgo = (isoDate) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Hier' : `Il y a ${days}j`;
};

const parseTags = (tagsString) => {
  if (!tagsString) return [];
  return tagsString.split(',').map(t => t.trim()).filter(Boolean);
};

export default function Projects({ isAuthenticated, onRequestLogin }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'collaborative', 'mission'
  const [applyingId, setApplyingId] = useState(null);
  const [applyFeedback, setApplyFeedback] = useState({}); // { [projectId]: message }

  // État pour la modale de création de projet
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState('collaborative');
  const [requiredLevel, setRequiredLevel] = useState('B2');
  const [tagsInput, setTagsInput] = useState('#React, #CSS');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async (typeFilter) => {
    setLoading(true);
    setLoadError('');
    try {
      const url = typeFilter && typeFilter !== 'all'
        ? `${API_BASE_URL}/projects/?project_type=${typeFilter}`
        :    `${API_BASE_URL}/projects/`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Erreur serveur (${res.status})`);
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement projets :', err);
      setLoadError("Impossible de charger les projets. Vérifie que le serveur backend tourne bien sur localhost:8000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects(activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !description.trim()) {
      setError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const token = localStorage.getItem('token');
    setSubmitting(true);
    try {
      const res = await fetch(   `${API_BASE_URL}/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          project_type: projectType,
          required_level: requiredLevel,
          tags: tagsInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de la publication.");

      setTitle('');
      setDescription('');
      setTagsInput('#React, #CSS');
      setIsModalOpen(false);
      fetchProjects(activeTab);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (project) => {
    const token = localStorage.getItem('token');
    setApplyingId(project.id);
    setApplyFeedback(prev => ({ ...prev, [project.id]: null }));

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${project.id}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erreur lors de l'envoi de la candidature.");

      setApplyFeedback(prev => ({ ...prev, [project.id]: '✅ Candidature envoyée avec succès.' }));
    } catch (err) {
      setApplyFeedback(prev => ({ ...prev, [project.id]: `⚠️ ${err.message}` }));
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* En-tête du module + bouton de création */}
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">Conseil des Projets & Missions 🎯</h2>
          <p className="text-sm text-slate-500">Collaborez sur des projets et pratiquez l'anglais au quotidien.</p>
        </div>
        <button
          onClick={() => isAuthenticated ? setIsModalOpen(true) : onRequestLogin?.()}
          className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded transition shadow-sm cursor-pointer"
        >
          {isAuthenticated ? '+ Publier un projet' : '🔒 Se connecter pour publier'}
        </button>
      </div>

      {/* Onglets de filtrage (filtrent désormais via l'API, pas juste en local) */}
      <div className="flex gap-2 border-b border-slate-200 pb-3 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          onClick={() => setActiveTab('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Tous les projets
        </button>
        <button
          onClick={() => setActiveTab('collaborative')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'collaborative' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Projets Collaboratifs
        </button>
        <button
          onClick={() => setActiveTab('mission')}
          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition ${activeTab === 'mission' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Missions et étapes
        </button>
      </div>

      {/* Liste des projets */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-slate-500 py-6">Chargement des projets...</p>
        ) : loadError ? (
          <p className="text-center text-red-700 py-6 bg-red-50 border border-red-200 rounded-lg px-4">⚠️ {loadError}</p>
        ) : projects.length === 0 ? (
          <p className="text-center text-slate-500 py-6 bg-white p-6 rounded-lg border border-slate-200">
            Aucun projet trouvé dans cette catégorie.
          </p>
        ) : (
          projects.map(project => (
            <div key={project.id} className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-slate-200 relative">
              <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded border border-red-100">
                  {project.project_type === 'collaborative' ? 'PROJET COLLABORATIF' : 'MISSION / ÉTAPE'}
                </span>
                <span className="text-xs text-slate-400">{timeAgo(project.created_at)}</span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 mb-1 break-words">{project.title}</h3>
              <p className="text-slate-600 text-sm mb-1">{project.description}</p>
              <p className="text-xs text-slate-400 mb-4">Publié par {project.author?.full_name || 'Membre'}</p>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="flex gap-2 flex-wrap">
                  {parseTags(project.tags).map((tag, idx) => (
                    <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500">
                    Niveau requis : <strong className="text-slate-800">{project.required_level}</strong>
                  </span>
                  <button
                    onClick={() => isAuthenticated ? handleApply(project) : onRequestLogin?.()}
                    disabled={applyingId === project.id}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded transition cursor-pointer disabled:opacity-50"
                  >
                    {!isAuthenticated ? '🔒 Se connecter' : applyingId === project.id ? 'Envoi...' : 'Postuler / Répondre'}
                  </button>
                </div>
              </div>

              {applyFeedback[project.id] && (
                <p className="text-xs mt-2 text-right">{applyFeedback[project.id]}</p>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODALE DE CRÉATION DE PROJET */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex justify-center items-center z-50 p-3 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center bg-slate-900 text-white px-4 sm:px-6 py-3 sm:py-4 shrink-0">
              <h3 className="font-bold text-sm sm:text-base">Publier un nouveau projet ou mission</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer shrink-0 ml-2"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded">{error}</div>}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Titre du projet</label>
                <input
                  type="text"
                  placeholder="Ex: Application mobile d'apprentissage..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Description et objectifs</label>
                <textarea
                  placeholder="Décrivez ce que vous recherchez..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded text-sm bg-white focus:outline-none"
                  >
                    <option value="collaborative">Projet Collaboratif</option>
                    <option value="mission">Mission / Étape</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Niveau d'anglais requis</label>
                  <select
                    value={requiredLevel}
                    onChange={(e) => setRequiredLevel(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded text-sm bg-white focus:outline-none"
                  >
                    <option value="A1">A1 (Débutant)</option>
                    <option value="A2">A2 (Élémentaire)</option>
                    <option value="B1">B1 (Intermédiaire)</option>
                    <option value="B2">B2 (Avancé)</option>
                    <option value="C1">C1 (Autonome)</option>
                    <option value="C2">C2 (Maîtrise)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Tags (séparés par des virgules)</label>
                <input
                  type="text"
                  placeholder="#React, #Design, #English"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2 rounded transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Publication...' : 'Publier le projet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}