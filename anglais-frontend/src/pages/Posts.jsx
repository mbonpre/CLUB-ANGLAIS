import { useState, useEffect } from 'react';

export default function Posts({ activeTab }) {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState(activeTab === 'official' ? 'official' : 'community');
  const [mediaFile, setMediaFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Mettre à jour le type par défaut si on change d'onglet en haut
  useEffect(() => {
    setPostType(activeTab === 'official' ? 'official' : 'community');
  }, [activeTab]);

  const fetchPosts = async () => {
    try {
      const response = await fetch(`http://localhost:8000/posts/?post_type=${activeTab}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setPosts(data);
      }
    } catch (err) {
      console.error("Erreur chargement posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem("token");

    try {
      let mediaUrl = "";

      // 1. Si un fichier est sélectionné, on l'uploade d'abord
      if (mediaFile) {
        const formData = new FormData();
        formData.append("file", mediaFile);

        const uploadRes = await fetch("http://localhost:8000/upload/", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Erreur lors de l'upload du fichier.");
        }

        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.url;
      }

      // 2. Ensuite, on envoie la publication avec le lien du média
      const response = await fetch('http://localhost:8000/posts/', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          title, 
          content, 
          post_type: postType,
          media_url: mediaUrl 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Erreur lors de la publication.");
      }

      setTitle('');
      setContent('');
      setMediaFile(null);
      fetchPosts();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulaire de création */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 text-slate-900">Créer une publication</h2>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">{error}</div>}
        
        <form onSubmit={handleCreatePost} className="space-y-4">
          <input 
            type="text" 
            placeholder="Titre de la publication..." 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500" 
            required
          />
          <textarea 
            placeholder="Écrivez votre message ici..." 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded text-sm h-24 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" 
            required
          />

          {/* Champ d'importation de fichier */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ajouter un média (Photo, Audio, Vidéo)</label>
            <input 
              type="file" 
              accept="image/*,audio/*,video/*"
              onChange={(e) => setMediaFile(e.target.files[0])}
              className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
            />
          </div>

          <div className="flex gap-4 items-center">
            <select 
              value={postType} 
              onChange={(e) => setPostType(e.target.value)} 
              className="p-2 border border-slate-200 rounded text-sm bg-white focus:outline-none"
            >
              <option value="community">Fil de la Communauté</option>
              <option value="official">Annonce Officielle (Admin/CM)</option>
            </select>
            <button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded text-sm transition"
            >
              Publier
            </button>
          </div>
        </form>
      </div>

      {/* Flux de posts */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-slate-500 py-6">Chargement...</p>
        ) : posts.length === 0 ? (
          <p className="text-center text-slate-500 py-6 bg-white p-6 rounded-lg border border-slate-200">
            Aucune publication dans cet onglet pour le moment.
          </p>
        ) : (
          posts.map(post => (
            <div 
              key={post.id} 
              className={`p-6 rounded-lg shadow-sm border ${post.post_type === 'official' ? 'border-red-200 bg-red-50/40' : 'bg-white border-slate-200'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-lg text-slate-900">{post.title}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {post.author.full_name} ({post.author.english_level})
                </span>
              </div>
              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed mb-4">{post.content}</p>

              {/* Affichage du média s'il y en a un */}
              {post.media_url && (
                <div className="mt-3">
                  {post.media_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                    <img src={post.media_url} alt="Média" className="rounded-lg max-h-80 object-cover w-full border border-slate-200" />
                  )}
                  {post.media_url.match(/\.(mp3|wav|ogg|m4a)$/i) && (
                    <audio controls className="w-full mt-2">
                      <source src={post.media_url} />
                      Votre navigateur ne supporte pas l'élément audio.
                    </audio>
                  )}
                  {post.media_url.match(/\.(mp4|webm|ogg)$/i) && (
                    <video controls className="rounded-lg max-h-80 w-full mt-2 border border-slate-200">
                      <source src={post.media_url} />
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}