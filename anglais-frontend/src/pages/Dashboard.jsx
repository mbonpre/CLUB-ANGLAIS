import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Members from './Members.jsx';
import Projects from './Projects.jsx';
import Chat from './Chat.jsx';
import Posts from './Posts.jsx';
import Login from './Login.jsx';
import AdminPanel from './AdminPanel.jsx';
import Assessment from './Assessment.jsx';
import { API_BASE_URL } from '../config';

const SECTIONS = { debate: 'Débat', interpretation: 'Interprétation', news: 'Actualités', drama: 'Théâtre' };

const WORD_OF_THE_DAY = [
  { en: 'Fluent', fr: 'Courant(e)', example: 'She speaks fluent English.' },
  { en: 'Overcome', fr: 'Surmonter', example: 'You can overcome your fear of speaking.' },
  { en: 'Rewarding', fr: 'Gratifiant', example: 'Learning a language is rewarding.' },
  { en: 'Consistency', fr: 'Régularité', example: 'Consistency beats motivation.' },
  { en: 'Mistake', fr: 'Erreur', example: "Don't be afraid to make mistakes." },
  { en: 'Improve', fr: 'S\'améliorer', example: 'Practice every day to improve.' },
  { en: 'Confidence', fr: 'Confiance en soi', example: 'Speaking builds confidence.' },
  { en: 'Debate', fr: 'Débat', example: "Let's join tonight's debate." },
  { en: 'Challenge', fr: 'Défi', example: 'Accept the challenge!' },
  { en: 'Achieve', fr: 'Atteindre / Réussir', example: 'You will achieve your goals.' },
];

const PROGRAMMES = [
  "🇺🇸 Parakou Bilingue English Program (3/9 mois)",
  "🇬🇧 CAPAR — Camp d'anglais accéléré (1 mois)",
  "🇨🇦 English Colony (Kids)",
  "🇺🇸🇫🇷 Traduction & Interprétation",
  "Club YEE (8 mois / année académique)",
];

const getWordOfTheDay = () => {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return WORD_OF_THE_DAY[dayOfYear % WORD_OF_THE_DAY.length];
};

// "default.png" est la valeur par défaut en base : on la traite comme "pas de photo"
const hasCustomAvatar = (url) => !!url && url !== 'default.png';

export default function Dashboard({ isAuthenticated, onLoginSuccess, onLogout }) {
  // --- Navigation basée sur de vraies URLs (correctif) -----------------------
  // Avant : `currentPage` était un simple état React (useState), jamais reflété
  // dans l'URL -> un rechargement de page retombait toujours sur "home".
  // Maintenant : la page active est dérivée de l'URL réelle (via react-router-dom),
  // donc un rechargement (F5) reste sur la même section.
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname === '/' ? 'home' : location.pathname.slice(1);
  const goTo = (page) => navigate(page === 'home' ? '/' : `/${page}`);

  const [activeTab, setActiveTab] = useState('official');
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const isStaff = currentUser && ['ADMIN', 'COMMUNITY_MANAGER'].includes(currentUser.role);

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const fetchCurrentUser = () => {
    if (!isAuthenticated) { setCurrentUser(null); return; }
    fetch(   `${API_BASE_URL}/auth/me`, { headers: authHeaders() })
      .then((res) => {
        if (res.status === 403) {
          alert("Ton compte a été suspendu par un administrateur.");
          onLogout();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => setCurrentUser(data))
      .catch(() => setCurrentUser(null));
  };

  useEffect(() => {
    fetchCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`${API_BASE_URL}/upload/`, { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error("Échec de l'envoi de l'image.");
      const uploadData = await uploadRes.json();

      const saveRes = await fetch(`${API_BASE_URL}/users/me/profile-image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ profile_image: uploadData.url }),
      });
      if (!saveRes.ok) throw new Error("Échec de l'enregistrement de la photo.");
      const saved = await saveRes.json();
      setCurrentUser(saved);
    } catch (err) {
      alert(err.message || "Impossible de mettre à jour la photo de profil.");
    } finally {
      setUploadingPic(false);
      e.target.value = '';
    }
  };

  const [memberCount, setMemberCount] = useState(null);
  const [postCount, setPostCount] = useState(null);

  useEffect(() => {
    fetch(   `${API_BASE_URL}/users/`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setMemberCount(data.length); })
      .catch(() => setMemberCount(null));

    fetch(   `${API_BASE_URL}/posts/`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setPostCount(data.length); })
      .catch(() => setPostCount(null));
  }, []);

  const goToLogin = () => { goTo('login'); setMobileMenuOpen(false); };
  const handleLoginSuccess = () => { onLoginSuccess(); goTo('home'); setMobileMenuOpen(false); };
  const handleChatClick = () => { goTo(isAuthenticated ? 'chat' : 'login'); setMobileMenuOpen(false); };
  const navigateTo = (page) => { goTo(page); setMobileMenuOpen(false); };

  const navLinkClass = (page) => currentPage === page
    ? 'text-white border-b-2 border-red-500 pb-0.5 font-semibold'
    : 'hover:text-white transition';

  const mobileNavLinkClass = (page) => `w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
    currentPage === page ? 'bg-white/15 text-white' : 'text-slate-200 hover:bg-white/10'
  }`;

  return (
    <div className="min-h-screen bg-slate-100 font-sans notranslate flex flex-col" translate="no">
      <header className="bg-blue-900 text-white border-b-4 border-red-600 sticky top-0 z-20 shadow-md">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 flex justify-between items-center gap-2">
          <div className="flex items-center space-x-6 min-w-0">
            <h1 className="text-base sm:text-xl font-black tracking-wide flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0" onClick={() => navigateTo('home')}>
              <span>EAGLES INSTITUTE</span>
              <span className="text-[10px] sm:text-xs bg-red-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">YEE</span>
            </h1>
            <nav className="hidden md:flex space-x-5 text-sm font-medium text-slate-300">
              <button onClick={() => navigateTo('home')} className={navLinkClass('home')}>Accueil</button>
              <button onClick={() => navigateTo('members')} className={navLinkClass('members')}>Membres & CV</button>
              <button onClick={() => navigateTo('projects')} className={navLinkClass('projects')}>Projets & Offres</button>
              <button onClick={handleChatClick} className={navLinkClass('chat')}>
                Messagerie 💬 {!isAuthenticated && <span className="text-[10px] text-slate-400">(connexion requise)</span>}
              </button>
              <button onClick={() => navigateTo(isAuthenticated ? 'assessment' : 'login')} className={navLinkClass('assessment')}>
                🎓 Test de niveau
              </button>
              {isStaff && (
                <button onClick={() => navigateTo('admin')} className={navLinkClass('admin')}>⚙️ Administration</button>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <>
                {currentUser?.active_section && (
                  <span className="hidden sm:inline text-xs bg-white/10 text-slate-200 px-2.5 py-1 rounded-full max-w-[140px] truncate">
                    📍 {SECTIONS[currentUser.active_section] || currentUser.active_section}
                  </span>
                )}
                <button onClick={onLogout} className="hidden md:inline-flex bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-1.5 rounded transition shadow-sm">Déconnexion</button>
              </>
            ) : (
              <button onClick={goToLogin} className="hidden md:inline-flex bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold px-4 py-1.5 rounded transition shadow-sm">Se connecter</button>
            )}

            {/* Bouton hamburger : visible uniquement sur mobile/tablette */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 -mr-1 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition text-lg"
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Menu déroulant mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-blue-900 px-3 py-3 space-y-1">
            <button onClick={() => navigateTo('home')} className={mobileNavLinkClass('home')}>🏠 Accueil</button>
            <button onClick={() => navigateTo('members')} className={mobileNavLinkClass('members')}>👥 Membres & CV</button>
            <button onClick={() => navigateTo('projects')} className={mobileNavLinkClass('projects')}>🚀 Projets & Offres</button>
            <button onClick={handleChatClick} className={mobileNavLinkClass('chat')}>
              💬 Messagerie {!isAuthenticated && <span className="text-[10px] text-slate-400">(connexion requise)</span>}
            </button>
            <button onClick={() => navigateTo(isAuthenticated ? 'assessment' : 'login')} className={mobileNavLinkClass('assessment')}>🎓 Test de niveau</button>
            {isStaff && (
              <button onClick={() => navigateTo('admin')} className={mobileNavLinkClass('admin')}>⚙️ Administration</button>
            )}

            <div className="pt-2 mt-2 border-t border-white/10">
              {currentUser?.active_section && (
                <p className="px-3 pb-2 text-xs text-slate-300">📍 Section : {SECTIONS[currentUser.active_section] || currentUser.active_section}</p>
              )}
              {isAuthenticated ? (
                <button onClick={() => { onLogout(); setMobileMenuOpen(false); }} className="w-full bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition">Déconnexion</button>
              ) : (
                <button onClick={goToLogin} className="w-full bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold px-4 py-2.5 rounded-lg transition">Se connecter</button>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex-1 w-full">
        {currentPage === 'login' && <Login onLoginSuccess={handleLoginSuccess} />}
        {currentPage === 'members' && <Members />}
        {currentPage === 'projects' && <Projects isAuthenticated={isAuthenticated} onRequestLogin={goToLogin} />}

        {currentPage === 'admin' && (
          isStaff ? <AdminPanel /> : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center max-w-md mx-auto">
              <p className="text-4xl mb-3">🔒</p>
              <h2 className="font-bold text-lg text-slate-900 mb-2">Accès réservé</h2>
              <p className="text-sm text-slate-500">Cette section est réservée aux Admins et Community Managers.</p>
            </div>
          )
        )}

        {currentPage === 'chat' && (
          isAuthenticated ? <Chat /> : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center max-w-md mx-auto">
              <p className="text-4xl mb-3">🔒</p>
              <h2 className="font-bold text-lg text-slate-900 mb-2">Connexion requise</h2>
              <p className="text-sm text-slate-500 mb-5">La messagerie est réservée aux membres connectés.</p>
              <button onClick={goToLogin} className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-sm transition">Se connecter</button>
            </div>
          )
        )}

        {currentPage === 'assessment' && (
          isAuthenticated ? <Assessment /> : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-10 text-center max-w-md mx-auto">
              <p className="text-4xl mb-3">🔒</p>
              <h2 className="font-bold text-lg text-slate-900 mb-2">Connexion requise</h2>
              <p className="text-sm text-slate-500 mb-5">Le test de niveau est réservé aux membres connectés.</p>
              <button onClick={goToLogin} className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-sm transition">Se connecter</button>
            </div>
          )
        )}

        {currentPage === 'home' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Bannière d'accueil */}
            <div className="relative overflow-hidden rounded-xl text-white px-4 py-6 sm:px-6 sm:py-10 md:px-10 md:py-14 border-b-4 border-red-600 shadow-md">
              <img src="/assets/yee-assemblee.jpg" alt="Assemblée Générale YEE" className="absolute inset-0 w-full h-full object-cover object-top brightness-125 contrast-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6">
                <div className="bg-black/45 backdrop-blur-[2px] rounded-xl p-3 sm:p-4 max-w-xl">
                  <span className="inline-block text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-red-400 mb-2">🇬🇧 YOUNG EAGLES OF ENGLISH (YEE) · Eagles Institute Training Center</span>
                  <h2 className="text-lg sm:text-2xl md:text-3xl font-black leading-tight mb-2">Apprends, pratique, progresse en anglais à Parakou.</h2>
                  <p className="text-xs sm:text-sm text-slate-200">
                    Le club international d'anglais de l'Eagles Institute Training Center — 8 mois / une année académique de pratique, débats et échanges avec une communauté active d'apprenants.
                  </p>
                </div>
                <div className="flex gap-3 sm:gap-4 shrink-0">
                  <div className="text-center bg-black/45 border border-white/20 rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 min-w-[76px] sm:min-w-[92px] backdrop-blur-sm">
                    <p className="text-xl sm:text-2xl font-black">{memberCount ?? '—'}</p>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-300">Membres</p>
                  </div>
                  <div className="text-center bg-black/45 border border-white/20 rounded-lg px-4 sm:px-5 py-2.5 sm:py-3 min-w-[76px] sm:min-w-[92px] backdrop-blur-sm">
                    <p className="text-xl sm:text-2xl font-black">{postCount ?? '—'}</p>
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-slate-300">Publications</p>
                  </div>
                </div>
              </div>
              {!isAuthenticated && (
                <button onClick={goToLogin} className="relative z-10 mt-4 sm:mt-6 bg-red-600 hover:bg-red-700 text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded text-sm transition shadow-sm">
                  Rejoindre le club →
                </button>
              )}
            </div>

            {/* Bandeau programmes */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 sm:p-4 flex flex-wrap gap-2 sm:gap-3 justify-center text-[11px] sm:text-xs">
              {PROGRAMMES.map((p) => (
                <span key={p} className="bg-slate-50 border border-slate-200 rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 font-semibold text-slate-700">{p}</span>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="md:col-span-1 space-y-4">
                {isAuthenticated ? (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
                    <div className="relative w-20 h-20 mx-auto mb-3 group">
                      <div className="w-20 h-20 bg-slate-200 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold text-slate-700 border-2 border-slate-300">
                        {hasCustomAvatar(currentUser?.profile_image)
                          ? <img src={currentUser.profile_image} alt="Profil" className="w-full h-full object-cover" />
                          : <span>👑</span>}
                      </div>
                      <label htmlFor="profile-pic-input" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs opacity-0 group-hover:opacity-100 transition cursor-pointer">
                        {uploadingPic ? '⏳' : 'Modifier'}
                      </label>
                      <input id="profile-pic-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={uploadingPic} />
                    </div>
                    <h2 className="font-bold text-slate-900">{currentUser?.full_name || 'Chargement...'}</h2>
                    <p className="text-xs text-red-600 font-semibold uppercase mt-0.5">
                      {currentUser?.role === 'ADMIN' ? 'Super Admin' : currentUser?.role === 'COMMUNITY_MANAGER' ? 'Community Manager' : currentUser?.role === 'COACH' ? 'Coach' : 'Membre'}
                      {currentUser?.english_level && ` · ${currentUser.english_level}`}
                      {currentUser?.active_section && ` · ${SECTIONS[currentUser.active_section] || currentUser.active_section}`}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-100 text-left text-sm space-y-2">
                      <button onClick={() => navigateTo('members')} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-2">👥 Annuaire des membres</button>
                      <button onClick={() => navigateTo('projects')} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-2">🚀 Projets & Offres</button>
                      <button onClick={() => navigateTo('chat')} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-2">💬 Messagerie</button>
                      {isStaff && (
                        <button onClick={() => navigateTo('admin')} className="w-full text-left px-2 py-1.5 rounded hover:bg-red-50 text-red-600 font-medium transition flex items-center gap-2">⚙️ Administration</button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 text-center">
                    <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-3xl">🇬🇧</div>
                    <h2 className="font-bold text-slate-900">Bienvenue !</h2>
                    <p className="text-xs text-slate-500 mt-1 mb-3">Connecte-toi pour publier, commenter et accéder à la messagerie.</p>
                    <button onClick={goToLogin} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm transition">Se connecter</button>
                    <div className="mt-4 pt-4 border-t border-slate-100 text-left text-sm space-y-2">
                      <button onClick={() => navigateTo('members')} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-2">👥 Annuaire des membres</button>
                      <button onClick={() => navigateTo('projects')} className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-50 text-slate-700 font-medium transition flex items-center gap-2">🚀 Projets & Offres</button>
                    </div>
                  </div>
                )}

                {(() => {
                  const word = getWordOfTheDay();
                  return (
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-2">📖 Mot du jour</p>
                      <p className="text-lg font-black text-slate-900 leading-tight">{word.en}</p>
                      <p className="text-sm text-slate-500 mb-2">{word.fr}</p>
                      <p className="text-xs italic text-slate-400 border-t border-slate-100 pt-2">"{word.example}"</p>
                    </div>
                  );
                })()}
              </div>

              <div className="md:col-span-3">
                <div className="flex border border-slate-200 mb-4 sm:mb-6 bg-white rounded-lg p-1 sm:p-1.5 shadow-sm">
                  <button onClick={() => setActiveTab('official')} className={`flex-1 py-2 sm:py-2.5 text-center font-bold text-xs sm:text-sm rounded-md transition ${activeTab === 'official' ? 'bg-blue-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}>
                    📢 <span className="hidden sm:inline">À la Une du Club (Officiel)</span><span className="sm:hidden">À la Une</span>
                  </button>
                  <button onClick={() => setActiveTab('community')} className={`flex-1 py-2 sm:py-2.5 text-center font-bold text-xs sm:text-sm rounded-md transition ${activeTab === 'community' ? 'bg-red-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}>
                    👥 <span className="hidden sm:inline">Fil de la Communauté</span><span className="sm:hidden">Communauté</span>
                  </button>
                </div>
                <Posts activeTab={activeTab} isAuthenticated={isAuthenticated} onRequestLogin={goToLogin} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-blue-900 text-blue-200 text-xs mt-10 py-6 px-4 border-t-4 border-red-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between gap-3">
          <div>
            <p className="text-white font-bold mb-1">Eagles Institute Training Center</p>
            <p>Quartier Arafat, La terre rouge, derrière le décanat de l'ENATSE/UP, Parakou</p>
            <p>RCCM : RB/PKO/25 A 25829 · IFU : 0202214437704</p>
          </div>
          <div className="text-left md:text-right">
            <p>📞 +229 01 95 83 25 32 / 01 66 83 15 91</p>
            <p>✉️ eaglesinstitute9@gmail.com</p>
          </div>
        </div>
      </footer>
    </div>
  );
}