import { useState } from 'react';
import Members from './Members.jsx';
import Projects from './Projects.jsx';
import Chat from './Chat.jsx';
import Posts from './Posts.jsx'; // 1. Importation du composant Posts

export default function Dashboard({ onLogout }) {
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'members', 'projects', 'chat'
  const [activeTab, setActiveTab] = useState('official');

  return (
    <div className="min-h-screen bg-slate-100 font-sans">
      {/* En-tête UK/British Style */}
      <header className="bg-slate-900 text-white border-b-4 border-red-600 sticky top-0 z-10 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <h1 className="text-xl font-black tracking-wide flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <span>English Club</span>
              <span className="text-xs bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">UK</span>
            </h1>
            <nav className="hidden md:flex space-x-5 text-sm font-medium text-slate-300">
              <button
                onClick={() => setCurrentPage('home')}
                className={currentPage === 'home' ? 'text-white border-b-2 border-red-500 pb-0.5 font-semibold' : 'hover:text-white transition'}
              >
                Accueil
              </button>
              <button
                onClick={() => setCurrentPage('members')}
                className={currentPage === 'members' ? 'text-white border-b-2 border-red-500 pb-0.5 font-semibold' : 'hover:text-white transition'}
              >
                Membres & CV
              </button>
              <button
                onClick={() => setCurrentPage('projects')}
                className={currentPage === 'projects' ? 'text-white border-b-2 border-red-500 pb-0.5 font-semibold' : 'hover:text-white transition'}
              >
                Projets & Offres
              </button>
              <button
                onClick={() => setCurrentPage('chat')}
                className={currentPage === 'chat' ? 'text-white border-b-2 border-red-500 pb-0.5 font-semibold' : 'hover:text-white transition'}
              >
                Messagerie 💬
              </button>
            </nav>
          </div>
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded transition shadow-sm"
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Rendu dynamique des vues */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {currentPage === 'members' && <Members />}
        {currentPage === 'projects' && <Projects />}
        {currentPage === 'chat' && <Chat />}
        {currentPage === 'home' && (
          <>
            {/* Système à Double Flux (Onglets) */}
            <div className="flex border border-slate-200 mb-6 bg-white rounded-lg p-1.5 shadow-sm">
              <button
                onClick={() => setActiveTab('official')}
                className={`flex-1 py-2.5 text-center font-bold text-sm rounded-md transition ${
                  activeTab === 'official' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📢 À la Une du Club (Officiel)
              </button>
              <button
                onClick={() => setActiveTab('community')}
                className={`flex-1 py-2.5 text-center font-bold text-sm rounded-md transition ${
                  activeTab === 'community' ? 'bg-red-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                👥 Fil de la Communauté
              </button>
            </div>

            {/* Affichage dynamique du composant Posts filtré selon l'onglet actif */}
            <Posts activeTab={activeTab} />
          </>
        )}
      </main>
    </div>
  );
}