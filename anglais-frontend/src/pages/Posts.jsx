import { useState, useEffect } from 'react';

const detectLanguage = (t) => /[àâäéèêëîïôöùûüç]|(?:\b(le|la|les|des|une|un|est|vous|je|nous|avec|bonjour|merci)\b)/i.test(t) ? 'fr' : 'en';
const getInitials = (n) => { if (!n) return '?'; const p = n.trim().split(/\s+/); return p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : p[0].slice(0,2).toUpperCase(); };
const timeAgo = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "À l'instant"; if (m < 60) return `${m} min`;
  const h = Math.floor(m/60); if (h < 24) return `${h} h`;
  return `${Math.floor(h/24)} j`;
};

function CommentItem({ c, onLike }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(c.likes_count || 0);
  const like = async () => {
    if (liked) return;
    setLiked(true); setCount(x => x + 1);
    onLike(c.id);
  };
  return (
    <div className="flex gap-2 mb-1.5">
      <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center text-[10px] font-bold">
        {getInitials(c.author?.full_name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-slate-100 rounded-2xl px-3 py-1.5 inline-block max-w-full">
          <p className="text-xs font-semibold text-slate-800">{c.author?.full_name || 'Membre'}</p>
          <p className="text-xs text-slate-700 break-words">{c.text}</p>
        </div>
        <div className="flex items-center gap-3 mt-0.5 ml-2 text-[10px] text-slate-400 font-semibold">
          <button onClick={like} className={liked ? 'text-red-600' : 'hover:underline'}>J'aime</button>
          <span>{timeAgo(c.created_at)}</span>
          {count > 0 && <span>❤️ {count}</span>}
        </div>
      </div>
    </div>
  );
}

export default function Posts({ activeTab, isAuthenticated, onRequestLogin }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState(activeTab === 'official' ? 'official' : 'community');
  const [mediaFile, setMediaFile] = useState(null);
  const [error, setError] = useState('');
  const [postsError, setPostsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [translations, setTranslations] = useState({});
  const [translatingPostId, setTranslatingPostId] = useState(null);
  const [myLikedIds, setMyLikedIds] = useState(new Set());
  const [likingId, setLikingId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingCommentId, setSubmittingCommentId] = useState(null);
  const [expandedComments, setExpandedComments] = useState(new Set());

  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => { setPostType(activeTab === 'official' ? 'official' : 'community'); }, [activeTab]);

  const fetchPosts = async () => {
    setPostsError('');
    try {
      const r = await fetch(`http://localhost:8000/posts/?post_type=${activeTab}`);
      if (!r.ok) throw new Error(`Erreur serveur (${r.status})`);
      const d = await r.json();
      if (Array.isArray(d)) setPosts(d);
    } catch (e) { setPostsError("Impossible de charger les publications. Vérifie le serveur backend."); }
    finally { setLoading(false); }
  };

  const fetchMyLikes = async () => {
    if (!isAuthenticated) { setMyLikedIds(new Set()); return; }
    try {
      const r = await fetch('http://localhost:8000/posts/my-likes', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      if (r.ok) setMyLikedIds(new Set(await r.json()));
    } catch (e) {}
  };

  useEffect(() => { fetchPosts(); }, [activeTab]);
  useEffect(() => { fetchMyLikes(); }, [isAuthenticated]);

  const handleCreatePost = async (e) => {
    e.preventDefault(); setError('');
    const token = localStorage.getItem("token");
    try {
      let mediaUrl = "";
      if (mediaFile) {
        const fd = new FormData(); fd.append("file", mediaFile);
        const up = await fetch("http://localhost:8000/upload/", { method: "POST", body: fd });
        if (!up.ok) throw new Error("Erreur upload.");
        mediaUrl = (await up.json()).url;
      }
      const r = await fetch('http://localhost:8000/posts/', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, content, post_type: postType, image_url: mediaUrl })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Erreur.");
      setTitle(''); setContent(''); setMediaFile(null); fetchPosts();
    } catch (e) { setError(e.message); }
  };

  const handleTranslate = async (postId, text) => {
    const cur = translations[postId];
    if (cur?.isTranslated) { setTranslations({ ...translations, [postId]: { ...cur, isTranslated: false } }); return; }
    if (cur?.translatedText) { setTranslations({ ...translations, [postId]: { ...cur, isTranslated: true } }); return; }
    setTranslatingPostId(postId);
    try {
      const target = detectLanguage(text) === 'fr' ? 'en' : 'fr';
      const r = await fetch(`http://localhost:8000/translate/?text=${encodeURIComponent(text.slice(0,490))}&target=${target}`);
      if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.detail || `Erreur ${r.status}`); }
      const d = await r.json();
      if (!d.translatedText) throw new Error('Réponse vide');
      setTranslations({ ...translations, [postId]: { translatedText: d.translatedText, isTranslated: true } });
    } catch (e) {
      setTranslations({ ...translations, [postId]: { translatedText: `⚠️ Indisponible (${e.message})`, isTranslated: true } });
    } finally { setTranslatingPostId(null); }
  };

  const handleLike = async (postId) => {
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    setLikingId(postId);
    try {
      const r = await fetch(`http://localhost:8000/posts/${postId}/like`, { method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
      const d = await r.json();
      setPosts(p => p.map(x => x.id === postId ? { ...x, likes_count: d.likes_count } : x));
      setMyLikedIds(prev => { const n = new Set(prev); d.liked ? n.add(postId) : n.delete(postId); return n; });
    } catch (e) {} finally { setLikingId(null); }
  };

  const handleAddComment = async (postId, e) => {
    e.preventDefault();
    if (!isAuthenticated) { onRequestLogin?.(); return; }
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    setSubmittingCommentId(postId);
    try {
      const r = await fetch(`http://localhost:8000/posts/${postId}/comments`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ text: text.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Erreur.");
      setPosts(p => p.map(x => x.id === postId ? { ...x, comments: [...x.comments, d] } : x));
      setCommentInputs({ ...commentInputs, [postId]: '' });
      setExpandedComments(prev => new Set(prev).add(postId));
    } catch (e) { alert(e.message); } finally { setSubmittingCommentId(null); }
  };

  const likeComment = (commentId) => {
    fetch(`http://localhost:8000/posts/comments/${commentId}/like`, { method: 'POST', headers: authHeaders() }).catch(()=>{});
  };

  return (
    <div className="space-y-8">
      {isAuthenticated ? (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold mb-4 text-slate-900">Créer une publication</h2>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>}
          <form onSubmit={handleCreatePost} className="space-y-4">
            <input type="text" placeholder="Titre..." value={title} onChange={(e)=>setTitle(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <textarea placeholder="Message..." value={content} onChange={(e)=>setContent(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" required />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Média</label>
              <input type="file" accept="image/*,audio/*,video/*" onChange={(e)=>setMediaFile(e.target.files[0])} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700" />
            </div>
            <div className="flex gap-4 items-center">
              <select value={postType} onChange={(e)=>setPostType(e.target.value)} className="p-2 border border-slate-200 rounded text-sm bg-white">
                <option value="community">Fil de la Communauté</option>
                <option value="official">Annonce Officielle</option>
              </select>
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-sm">Publier</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 text-center">
          <p className="text-sm text-slate-600 mb-3">🔒 Connecte-toi pour publier.</p>
          <button onClick={onRequestLogin} className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-sm">Se connecter</button>
        </div>
      )}

      <div className="space-y-4">
        {loading ? <p className="text-center text-slate-500 py-6">Chargement...</p>
        : postsError ? <p className="text-center text-red-700 py-6 bg-red-50 border border-red-200 rounded-lg px-4">⚠️ {postsError}</p>
        : posts.length === 0 ? <p className="text-center text-slate-500 py-6 bg-white p-6 rounded-lg border border-slate-200">Aucune publication.</p>
        : posts.map(post => {
          const trans = translations[post.id];
          const displayed = trans?.isTranslated ? trans.translatedText : post.content;
          const isLiked = myLikedIds.has(post.id);
          const isTranslating = translatingPostId === post.id;
          const label = detectLanguage(post.content) === 'fr' ? 'Traduire en anglais' : 'Traduire en français';
          const comments = post.comments || [];
          const expanded = expandedComments.has(post.id);
          const visibleComments = expanded ? comments : comments.slice(-2);

          return (
            <div key={post.id} className={`p-5 rounded-lg shadow-sm border ${post.post_type === 'official' ? 'border-red-200 bg-red-50/40' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center text-xs font-bold">{getInitials(post.author?.full_name)}</div>
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">{post.title}</h3>
                  <p className="text-xs text-slate-500">{post.author?.full_name || 'Membre'}{post.author?.english_level && ` · ${post.author.english_level}`} · {timeAgo(post.created_at)}</p>
                </div>
              </div>

              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed mb-2 notranslate" translate="no">{displayed}</p>

              {post.image_url && (
                <div className="mb-3">
                  {post.image_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) && <img src={post.image_url} alt="" className="rounded-lg max-h-72 object-cover w-full border border-slate-200" />}
                  {post.image_url.match(/\.(mp3|wav|ogg|m4a)$/i) && <audio controls className="w-full mt-2"><source src={post.image_url} /></audio>}
                  {post.image_url.match(/\.(mp4|webm)$/i) && <video controls className="rounded-lg max-h-72 w-full mt-2 border border-slate-200"><source src={post.image_url} /></video>}
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mb-2 text-xs">
                <button onClick={() => handleTranslate(post.id, post.content)} disabled={isTranslating} className="text-red-600 font-semibold disabled:opacity-50">
                  🌐 {isTranslating ? "..." : (trans?.isTranslated ? "Voir l'original" : label)}
                </button>
                <div className="flex items-center gap-3 text-slate-500">
                  {post.likes_count > 0 && <span>❤️ {post.likes_count}</span>}
                  {comments.length > 0 && <button onClick={() => setExpandedComments(p => { const n=new Set(p); n.has(post.id)?n.delete(post.id):n.add(post.id); return n; })} className="hover:underline">{comments.length} commentaire(s)</button>}
                </div>
              </div>

              <div className="flex border-t border-b border-slate-100 py-1 mb-2">
                <button onClick={() => handleLike(post.id)} disabled={likingId === post.id} className={`flex-1 text-xs font-bold py-1.5 rounded hover:bg-slate-50 ${isLiked ? 'text-red-600' : 'text-slate-500'}`}>
                  {isLiked ? '❤️ Aimé' : '🤍 J\'aime'}
                </button>
              </div>

              {comments.length > 2 && !expanded && (
                <button onClick={() => setExpandedComments(p => new Set(p).add(post.id))} className="text-xs text-slate-400 hover:underline mb-2 block">
                  Voir les {comments.length - 2} autres commentaires
                </button>
              )}
              {visibleComments.map(c => <CommentItem key={c.id} c={c} onLike={likeComment} />)}

              {isAuthenticated ? (
                <form onSubmit={(e) => handleAddComment(post.id, e)} className="flex gap-2 mt-2 items-center">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-slate-200"></div>
                  <input type="text" placeholder="Écrire un commentaire..." value={commentInputs[post.id] || ''} onChange={(e)=>setCommentInputs({...commentInputs,[post.id]:e.target.value})} className="flex-1 p-1.5 text-xs border border-slate-200 rounded-full bg-slate-50 focus:outline-none" />
                  <button type="submit" disabled={submittingCommentId === post.id} className="text-red-600 text-xs font-bold px-2">{submittingCommentId === post.id ? '...' : 'Envoyer'}</button>
                </form>
              ) : (
                <button onClick={onRequestLogin} className="text-xs text-red-600 hover:underline">🔒 Connecte-toi pour commenter</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}