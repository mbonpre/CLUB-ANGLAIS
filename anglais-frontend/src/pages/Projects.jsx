import { useState } from 'react';

export default function Projects() {
  const [filterType, setFilterType] = useState('ALL');

  // Données de démonstration des projets/offres
  const mockProjects = [
    {
      id: 1,
      title: 'Création d\'un site E-Commerce pour un Club d\'Échecs',
      type: 'Projet Collaboratif',
      author: 'Sarah Connor',
      levelRequired: 'B2',
      description: 'Recherche un développeur React et un rédacteur pour créer le contenu en anglais.',
      tags: ['React', 'Copywriting', 'CSS'],
      date: 'Il y a 2h'
    },
    {
      id: 2,
      title: 'Traduction technique de documentation API (FR -> EN)',
      type: 'Mission / Stage',
      author: 'Alex Johnson',
      levelRequired: 'C1',
      description: 'Mission court terme pour traduire une documentation technique de Python vers l\'anglais.',
      tags: ['Python', 'Translation', 'FastAPI'],
      date: 'Hier'
    }
  ];

  const filteredProjects = mockProjects.filter((p) => {
    if (filterType === 'ALL') return true;
    return p.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* En-tête du module + bouton de création */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Board des Projets & Missions 🎯</h2>
          <p className="text-sm text-slate-500">Trouvez des collaborateurs ou rejoignez une mission en anglais.</p>
        </div>
        <button className="bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-4 py-2 rounded transition shadow-sm">
          + Publier un projet
        </button>
      </div>

      {/* Filtre par type */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tous les projets
        </button>
        <button
          onClick={() => setFilterType('Projet Collaboratif')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'Projet Collaboratif' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Projets Collaboratifs
        </button>
        <button
          onClick={() => setFilterType('Mission / Stage')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
            filterType === 'Mission / Stage' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Missions & Stages
        </button>
      </div>

      {/* Liste des projets */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <div key={project.id} className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-slate-900 hover:border-red-600 transition">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded">
                  {project.type}
                </span>
                <h3 className="font-bold text-slate-900 text-lg mt-1">{project.title}</h3>
              </div>
              <span className="text-xs text-slate-400">{project.date}</span>
            </div>

            <p className="text-sm text-slate-600 mt-2 leading-relaxed">{project.description}</p>

            <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-slate-100">
              <div className="flex gap-1.5">
                {project.tags.map((tag, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium">Niveau requis : <strong className="text-slate-900">{project.levelRequired}</strong></span>
                <button className="bg-slate-900 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded transition">
                  Postuler / Répondre
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}