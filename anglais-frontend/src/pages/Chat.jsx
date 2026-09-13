import React, { useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';
const EN_WORDS = [
  'hello', 'hi', 'how', 'are', 'you', 'today', 'thank', 'thanks', 'please', 'yes', 'no',
  'good', 'morning', 'afternoon', 'evening', 'great', 'nice', 'meeting', 'practice',
  'english', 'club', 'welcome', 'member', 'members', 'project', 'schedule', 'tomorrow',
  'weekend', 'week', 'help', 'question', 'answer', 'speak', 'speaking', 'write', 'writing',
  'listen', 'listening', 'read', 'reading', 'grammar', 'vocabulary', 'exercise', 'homework',
  'teacher', 'student', 'lesson', 'conversation', 'fluent', 'fluently', 'pronunciation',
];

const FR_WORDS = [
  'bonjour', 'salut', 'comment', 'allez', 'vas', 'vous', "aujourd'hui", 'merci', "s'il",
  'plait', 'oui', 'non', 'bien', 'matin', 'après-midi', 'soir', 'super', 'sympa', 'réunion',
  'pratiquer', 'anglais', 'club', 'bienvenue', 'membre', 'membres', 'projet', 'programme',
  'demain', 'semaine', 'aide', 'question', 'réponse', 'parler', 'parlé', 'écrire', 'écouter',
  'lire', 'grammaire', 'vocabulaire', 'exercice', 'devoir', 'professeur', 'étudiant', 'leçon',
];

const stripAccents = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const getSuggestions = (text, lang) => {
  const tokens = text.split(/\s+/);
  const lastToken = tokens[tokens.length - 1] || '';
  if (lastToken.length < 2) return [];
  const dict = lang === 'fr' ? FR_WORDS : EN_WORDS;
  const lower = stripAccents(lastToken.toLowerCase());
  return dict
    .filter(w => {
      const normalized = stripAccents(w.toLowerCase());
      return normalized.startsWith(lower) && normalized !== lower;
    })
    .slice(0, 5);
};

const detectLanguage = (text) => {
  const frenchMarkers = /[àâäéèêëîïôöùûüç]|(?:\b(le|la|les|des|une|un|est|vous|je|nous|avec|bonjour|merci)\b)/i;
  return frenchMarkers.test(text || '') ? 'fr' : 'en';
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase();
};

const formatTime = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};

export default function ChatClubAnglais() {
  const [darkMode, setDarkMode] = useState(false);
  const [dictLang, setDictLang] = useState('en');
  const [chatMode, setChatMode] = useState('private'); // 'private' | 'rooms'

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomMessagesByRoom, setRoomMessagesByRoom] = useState({});
  const [loadingRoomHistory, setLoadingRoomHistory] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoomId, setJoiningRoomId] = useState(null);
  const [unreadRoomIds, setUnreadRoomIds] = useState(new Set());

  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [conversationPreviews, setConversationPreviews] = useState({});
  const [activeContact, setActiveContact] = useState(null);
  const [messagesByContact, setMessagesByContact] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [inputText, setInputText] = useState('');
  const [traductions, setTraductions] = useState({});
  const [translationsVisible, setTranslationsVisible] = useState({});
  const [translatingIds, setTranslatingIds] = useState({});
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [forwardModalMsg, setForwardModalMsg] = useState(null);
  const [forwardSearch, setForwardSearch] = useState('');

  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);
  const stickerPickerRef = useRef(null);
  const attachMenuRef = useRef(null);
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  const currentMessages = activeContact ? (messagesByContact[activeContact.id] || []) : [];
  const suggestions = getSuggestions(inputText, dictLang);
  const stickerList = ['😀', '😂', '🔥', '👍', '❤️', '🎉', '🚀', '😎'];

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    fetch(   `${API_BASE_URL}/auth/me`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : null)
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));

    fetch(   `${API_BASE_URL}/users/`)
      .then(res => res.json())
      .then(data => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));

    fetchRooms();
    refreshConversationPreviews();
  }, []);

  const isStaff = currentUser && ['ADMIN', 'COMMUNITY_MANAGER'].includes(currentUser.role);

  const fetchRooms = () => {
    fetch(   `${API_BASE_URL}/rooms/`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => setRooms(Array.isArray(data) ? data : []))
      .catch(() => setRooms([]));
  };

  const refreshConversationPreviews = () => {
    fetch(   `${API_BASE_URL}/messages/conversations`, { headers: authHeaders() })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        const map = {};
        (data || []).forEach(c => { map[c.user.id] = c; });
        setConversationPreviews(map);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE_URL}/messages/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'room_message') {
        setRoomMessagesByRoom(prev => {
          const existing = prev[msg.room_id] || [];
          if (existing.some(m => m.id === msg.id)) return prev;
          return { ...prev, [msg.room_id]: [...existing, msg] };
        });
        setUnreadRoomIds(prev => {
          if (activeRoom?.id === msg.room_id) return prev;
          const next = new Set(prev); next.add(msg.room_id); return next;
        });
        fetchRooms();
        return;
      }

      if (msg.type === 'reaction_update') {
        setMessagesByContact(prev => {
          const updated = {};
          for (const [cid, msgs] of Object.entries(prev)) {
            updated[cid] = msgs.map(m => m.id === msg.id ? { ...m, reactions: msg.reactions } : m);
          }
          return updated;
        });
        return;
      }

      if (msg.deleted_id) {
        setMessagesByContact(prev => {
          const updated = {};
          for (const [contactId, msgs] of Object.entries(prev)) {
            updated[contactId] = msgs.filter(m => m.id !== msg.deleted_id);
          }
          return updated;
        });
        return;
      }

      const otherId = msg.sender_id === currentUser?.id ? msg.receiver_id : msg.sender_id;

      setMessagesByContact(prev => {
        const existing = prev[otherId] || [];
        if (msg.edited) {
          return { ...prev, [otherId]: existing.map(m => m.id === msg.id ? msg : m) };
        }
        if (existing.some(m => m.id === msg.id)) return prev;
        return { ...prev, [otherId]: [...existing, msg] };
      });

      refreshConversationPreviews();
    };

    return () => ws.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages.length]);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) setShowAttachMenu(false);
      if (stickerPickerRef.current && !stickerPickerRef.current.contains(event.target)) setShowStickerPicker(false);
      if (menuRef.current && !menuRef.current.contains(event.target)) setSelectedMsgForMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openConversation = async (member) => {
    setActiveContact(member);
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/messages/${member.id}`, { headers: authHeaders() });
      const data = await res.json();
      setMessagesByContact(prev => ({ ...prev, [member.id]: Array.isArray(data) ? data : [] }));
      refreshConversationPreviews();
    } catch (err) {
      console.error('Erreur chargement historique :', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const sendPayload = (payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      alert("Connexion en temps réel indisponible. Recharge la page.");
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (chatMode === 'rooms') {
      if (!activeRoom) return;
      sendPayload({ room_id: activeRoom.id, content: inputText.trim() });
      setInputText('');
      return;
    }

    if (!activeContact) return;

    if (editingMessageId) {
      fetch(`${API_BASE_URL}/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: inputText.trim() }),
      }).catch(err => console.error('Erreur modification :', err));
      setEditingMessageId(null);
      setInputText('');
      return;
    }

    sendPayload({ receiver_id: activeContact.id, content: inputText.trim() });
    setInputText('');
    setReplyingTo(null);
  };

  const [pendingRequests, setPendingRequests] = useState([]);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const fetchPending = async (roomId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${roomId}/pending`, { headers: authHeaders() });
      setPendingRequests(res.ok ? await res.json() : []);
    } catch (err) { console.error(err); }
  };

  const handleApprove = async (roomId, membershipId) => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/approve/${membershipId}`, { method: 'POST', headers: authHeaders() });
    fetchPending(roomId); fetchRooms();
  };

  const handleApproveAll = async (roomId) => {
    await fetch(`${API_BASE_URL}/rooms/${roomId}/approve-all`, { method: 'POST', headers: authHeaders() });
    fetchPending(roomId); fetchRooms();
  };

  const openRoom = async (room) => {
    setActiveRoom(room);
    setActiveContact(null);
    setUnreadRoomIds(prev => { const next = new Set(prev); next.delete(room.id); return next; });
    if (!room.is_member) return;
    setLoadingRoomHistory(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${room.id}/messages`, { headers: authHeaders() });
      const data = await res.json();
      setRoomMessagesByRoom(prev => ({ ...prev, [room.id]: Array.isArray(data) ? data : [] }));
    } catch (err) {
      console.error('Erreur historique salon :', err);
    } finally {
      setLoadingRoomHistory(false);
    }
  };

  const handleJoinRoom = async (room) => {
    setJoiningRoomId(room.id);
    try {
      const res = await fetch(`${API_BASE_URL}/rooms/${room.id}/join`, { method: 'POST', headers: authHeaders() });
      const data = await res.json();
      fetchRooms();
      if (data.status === 'pending') setActiveRoom({ ...room, is_pending: true });
      else openRoom({ ...room, is_member: true });
    } catch (err) {
      console.error('Erreur adhésion salon :', err);
    } finally {
      setJoiningRoomId(null);
    }
  };

  const handleLeaveRoom = async (room) => {
    if (!window.confirm(`Quitter ${room.name} ?`)) return;
    try {
      await fetch(`${API_BASE_URL}/rooms/${room.id}/leave`, { method: 'POST', headers: authHeaders() });
      setActiveRoom(null);
      fetchRooms();
    } catch (err) { console.error(err); }
  };

  const handleReact = async (msg, emoji) => {
    try {
      await fetch(`${API_BASE_URL}/messages/${msg.id}/react`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ emoji }),
      });
    } catch (err) { console.error(err); }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setCreatingRoom(true);
    try {
      const res = await fetch(   `${API_BASE_URL}/rooms/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: newRoomName.trim(), description: newRoomDescription.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur lors de la création.');
      setNewRoomName('');
      setNewRoomDescription('');
      setShowCreateRoom(false);
      fetchRooms();
    } catch (err) {
      alert(err.message);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleEditMessage = (msg) => {
    setEditingMessageId(msg.id);
    setInputText(msg.content || '');
    setSelectedMsgForMenu(null);
  };

  const handleDeleteMessage = async (msg) => {
    setSelectedMsgForMenu(null);
    try {
      await fetch(`${API_BASE_URL}/messages/${msg.id}`, { method: 'DELETE', headers: authHeaders() });
    } catch (err) {
      console.error('Erreur suppression :', err);
    }
  };

  const executeForward = (targetMember) => {
    if (!forwardModalMsg) return;
    sendPayload({ receiver_id: targetMember.id, content: forwardModalMsg.content, media_url: forwardModalMsg.media_url });
    setForwardModalMsg(null);
    setForwardSearch('');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeContact) return;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(   `${API_BASE_URL}/upload/`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error("Échec de l'upload");
      const data = await res.json();
      sendPayload({ receiver_id: activeContact.id, content: file.name, media_url: data.url });
    } catch (err) {
      alert("Impossible d'envoyer ce fichier.");
      console.error(err);
    } finally {
      setUploadingFile(false);
      setShowAttachMenu(false);
      e.target.value = '';
    }
  };

  const handleSendSticker = (emoji) => {
    if (!activeContact) return;
    sendPayload({ receiver_id: activeContact.id, content: emoji });
    setShowStickerPicker(false);
  };

  const askClaudeStyleTranslate = async (text, target) => {
    const res = await fetch(`${API_BASE_URL}/translate/?text=${encodeURIComponent(text.slice(0, 490))}&target=${target}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Erreur HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data.translatedText) throw new Error('Réponse vide');
    return data.translatedText;
  };

  const basculerTraduction = async (msg) => {
    if (translationsVisible[msg.id]) {
      setTranslationsVisible(prev => ({ ...prev, [msg.id]: false }));
      return;
    }
    if (traductions[msg.id]) {
      setTranslationsVisible(prev => ({ ...prev, [msg.id]: true }));
      return;
    }

    setTranslatingIds(prev => ({ ...prev, [msg.id]: true }));
    try {
      const source = detectLanguage(msg.content);
      const target = source === 'fr' ? 'en' : 'fr';
      const translated = await askClaudeStyleTranslate(msg.content || '', target);
      setTraductions(prev => ({ ...prev, [msg.id]: translated }));
      setTranslationsVisible(prev => ({ ...prev, [msg.id]: true }));
    } catch (e) {
      setTraductions(prev => ({ ...prev, [msg.id]: `⚠️ Traduction indisponible (${e.message}).` }));
      setTranslationsVisible(prev => ({ ...prev, [msg.id]: true }));
    } finally {
      setTranslatingIds(prev => {
        const copie = { ...prev };
        delete copie[msg.id];
        return copie;
      });
    }
  };

  const correctText = async () => {
    if (!inputText.trim()) return;
    setIsCorrecting(true);
    try {
      const languageParam = dictLang === 'fr' ? 'fr' : 'en-US';
      const response = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text: inputText, language: languageParam }),
      });
      const data = await response.json();
      let correctedText = inputText;
      if (data?.matches?.length > 0) {
        let offsetShift = 0;
        data.matches.forEach(match => {
          if (match.replacements?.length > 0) {
            const replacement = match.replacements[0].value;
            const start = match.offset + offsetShift;
            correctedText = correctedText.substring(0, start) + replacement + correctedText.substring(start + match.length);
            offsetShift += replacement.length - match.length;
          }
        });
      }
      setInputText(correctedText);
    } catch (e) {
      alert('Correction indisponible pour le moment.');
    } finally {
      setIsCorrecting(false);
    }
  };

  const applySuggestion = (word) => {
    const tokens = inputText.split(/\s+/);
    tokens[tokens.length - 1] = word;
    setInputText(tokens.join(' ') + ' ');
  };

  const otherMembers = members.filter(m => m.id !== currentUser?.id);
  const filteredMembers = otherMembers.filter(m => m.full_name.toLowerCase().includes(globalSearch.toLowerCase()));

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const previewA = conversationPreviews[a.id];
    const previewB = conversationPreviews[b.id];
    if (previewA && previewB) return new Date(previewB.last_message_at) - new Date(previewA.last_message_at);
    if (previewA) return -1;
    if (previewB) return 1;
    return a.full_name.localeCompare(b.full_name);
  });

  return (
    <div translate="no" className={`max-w-6xl mx-auto rounded-2xl shadow-xl border overflow-hidden flex h-[685px] relative transition-colors duration-200 ${darkMode ? 'bg-[#1E3A8A] text-[#EDEFF3] border-slate-800' : 'bg-white text-[#15181D] border-slate-100'}`}>

      <div className={`w-1/3 border-r flex flex-col ${darkMode ? 'border-[#3B5FCC] bg-[#1E40AF]' : 'border-[#DBEAFE] bg-[#EFF6FF]'}`}>
        <div className="px-4 py-3 flex justify-between items-center bg-[#1E3A8A] border-b-2 border-red-600">
          <div>
            <h2 className="font-bold text-lg text-white">Messagerie</h2>
            <p className="text-[10px] text-slate-400">{wsConnected ? '🟢 Connecté en temps réel' : '🔴 Connexion en cours...'}</p>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl text-sm text-white/80 hover:text-white transition">
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        <div className={`flex border-b ${darkMode ? 'border-[#3B5FCC]' : 'border-[#EFF6FF]'}`}>
          <button
            onClick={() => setChatMode('private')}
            className={`flex-1 py-2 text-xs font-bold transition ${chatMode === 'private' ? 'bg-red-600 text-white' : (darkMode ? 'text-slate-400 hover:bg-[#1E3A8A]' : 'text-slate-500 hover:bg-white')}`}
          >
            💬 Messages privés
          </button>
          <button
            onClick={() => setChatMode('rooms')}
            className={`flex-1 py-2 text-xs font-bold transition ${chatMode === 'rooms' ? 'bg-red-600 text-white' : (darkMode ? 'text-slate-400 hover:bg-[#1E3A8A]' : 'text-slate-500 hover:bg-white')}`}
          >
            📢 Salons
          </button>
        </div>

        {chatMode === 'private' && (
          <div className={`px-4 py-2 border-b ${darkMode ? 'border-[#3B5FCC]' : 'border-[#EFF6FF]'}`}>
            <input
              type="text" value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Rechercher un membre..."
              className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-white border-slate-200'}`}
            />
          </div>
        )}

        {chatMode === 'rooms' && isStaff && (
          <div className={`px-4 py-2 border-b ${darkMode ? 'border-[#3B5FCC]' : 'border-[#EFF6FF]'}`}>
            <button
              onClick={() => setShowCreateRoom(true)}
              className="w-full text-xs font-bold py-2 rounded-lg border-2 border-dashed border-red-300 text-red-600 hover:bg-red-50 transition"
            >
              + Créer un salon
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {chatMode === 'private' ? (
            sortedMembers.map(member => {
              const preview = conversationPreviews[member.id];
              return (
                <button
                  key={member.id}
                  onClick={() => openConversation(member)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b ${darkMode ? 'border-[#3B5FCC]' : 'border-[#EFF6FF]'} ${
                    activeContact?.id === member.id ? (darkMode ? 'bg-[#2563EB]' : 'bg-red-50/70') : (darkMode ? 'hover:bg-[#1E3A8A]' : 'hover:bg-white')
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-bold shrink-0 text-sm shadow-sm">
                    {getInitials(member.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="text-sm font-semibold truncate">{member.full_name}</h4>
                      {preview && <span className="text-[10px] text-slate-400 shrink-0">{formatTime(preview.last_message_at)}</span>}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{preview?.last_message || member.english_level}</p>
                  </div>
                  {preview?.unread_count > 0 && (
                    <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">{preview.unread_count}</span>
                  )}
                </button>
              );
            })
          ) : (
            rooms.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4">Aucun salon pour le moment.</p>
            ) : rooms.map(room => (
              <button
                key={room.id}
                onClick={() => room.is_member ? openRoom(room) : null}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-b ${darkMode ? 'border-[#3B5FCC]' : 'border-[#EFF6FF]'} ${
                  activeRoom?.id === room.id ? (darkMode ? 'bg-[#2563EB]' : 'bg-red-50/70') : (darkMode ? 'hover:bg-[#1E3A8A]' : 'hover:bg-white')
                } ${!room.is_member ? 'opacity-80' : ''}`}
              >
                <div className="w-11 h-11 rounded-full text-white flex items-center justify-center font-bold shrink-0 text-sm shadow-sm" style={{ background: room.color || '#DC2626' }}>
                  #
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="text-sm font-semibold truncate">{room.name}{room.is_closed && ' 🔒'}</h4>
                    <span className="text-[10px] text-slate-400 shrink-0">{room.member_count} membre(s)</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{room.description || `${room.message_count} messages`}</p>
                </div>
                {unreadRoomIds.has(room.id) && room.is_member && <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0"></span>}
                {room.is_pending && <span className="text-[10px] text-amber-600 font-bold shrink-0">En attente</span>}
                {!room.is_member && !room.is_pending && !room.is_closed && (
                  <span
                    onClick={(e) => { e.stopPropagation(); handleJoinRoom(room); }}
                    className="text-[10px] font-bold bg-red-600 text-white px-2 py-1 rounded-full shrink-0 hover:bg-red-700"
                  >
                    {joiningRoomId === room.id ? '...' : 'Rejoindre'}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {showCreateRoom && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 ${darkMode ? 'bg-[#1E40AF] border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm">Créer un nouveau salon</h3>
              <button onClick={() => setShowCreateRoom(false)} className="text-lg">✕</button>
            </div>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text" placeholder="Nom du salon (ex: Debate)" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
                className={`w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`} required
              />
              <textarea
                placeholder="Description (optionnel)" value={newRoomDescription} onChange={(e) => setNewRoomDescription(e.target.value)}
                className={`w-full p-2.5 border rounded-lg text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-slate-50 border-slate-200'}`}
              />
              <button type="submit" disabled={creatingRoom} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold p-2.5 rounded-lg text-sm transition disabled:opacity-50">
                {creatingRoom ? 'Création...' : 'Créer le salon'}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className={`w-2/3 flex flex-col ${darkMode ? 'bg-[#1E3A8A]' : 'bg-white'}`}>
        {chatMode === 'rooms' ? (
          !activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Sélectionne un salon (ou rejoins-en un) pour démarrer.
            </div>
          ) : activeRoom.is_pending ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              ⏳ Demande envoyée — en attente d'approbation du créateur du salon.
            </div>
          ) : !activeRoom.is_member ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-3">
              <p>Rejoins <strong>{activeRoom.name}</strong> pour voir et envoyer des messages.</p>
              <button onClick={() => handleJoinRoom(activeRoom)} className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-4 py-2 rounded transition">
                Rejoindre le salon
              </button>
            </div>
          ) : (
            <>
              <div className={`px-6 py-4 border-b-2 flex items-center gap-3 justify-between ${darkMode ? 'bg-[#1E40AF]' : 'bg-white'}`} style={{ borderColor: activeRoom.color || '#DC2626' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold shadow-sm" style={{ background: activeRoom.color || '#DC2626' }}>#</div>
                  <div>
                    <h3 className="font-bold text-sm">{activeRoom.name}</h3>
                    <p className="text-xs text-slate-400">{activeRoom.description || `${activeRoom.member_count} membre(s)`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeRoom.pending_count > 0 && (
                    <button onClick={() => { fetchPending(activeRoom.id); setShowPendingModal(true); }} className="text-xs bg-amber-100 text-amber-700 font-bold px-2.5 py-1 rounded-full">
                      {activeRoom.pending_count} demande(s)
                    </button>
                  )}
                  <button onClick={() => handleLeaveRoom(activeRoom)} className="text-xs text-slate-400 hover:text-red-600 font-semibold">Quitter</button>
                </div>
              </div>

              {showPendingModal && (
                <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                  <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 ${darkMode ? 'bg-[#1E40AF] border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-sm">Demandes d'adhésion</h3>
                      <button onClick={() => setShowPendingModal(false)}>✕</button>
                    </div>
                    {pendingRequests.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Aucune demande.</p>
                    ) : (
                      <>
                        <button onClick={() => handleApproveAll(activeRoom.id)} className="w-full mb-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded">
                          Tout accepter ({pendingRequests.length})
                        </button>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {pendingRequests.map(p => (
                            <div key={p.membership_id} className="flex items-center justify-between p-2 border border-slate-100 rounded">
                              <span className="text-sm">{p.full_name}</span>
                              <button onClick={() => handleApprove(activeRoom.id, p.membership_id)} className="text-xs bg-emerald-600 text-white px-2 py-1 rounded font-bold">Accepter</button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className={`flex-1 overflow-y-auto p-6 space-y-3 relative ${darkMode ? 'bg-[#1E3A8A]' : 'bg-[#EFF6FF]'}`}>
                {loadingRoomHistory ? (
                  <p className="text-center text-slate-400 text-sm">Chargement...</p>
                ) : (roomMessagesByRoom[activeRoom.id] || []).length === 0 ? (
                  <p className="text-center text-slate-400 text-sm italic">Aucun message dans ce salon pour le moment.</p>
                ) : (
                  (roomMessagesByRoom[activeRoom.id] || []).map(msg => {
                    const isMe = msg.sender?.id === currentUser?.id || msg.sender_id === currentUser?.id;
                    const senderName = msg.sender?.full_name || 'Membre';
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {!isMe && <span className="text-[10px] text-slate-400 ml-2 mb-0.5">{senderName}</span>}
                        <div className={`max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${isMe ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-br-none' : (darkMode ? 'bg-[#1D4ED8] text-white border border-slate-700 rounded-bl-none' : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none')}`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap notranslate" translate="no">{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMe ? 'text-red-100' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-2 ${darkMode ? 'border-slate-800 bg-[#1E40AF]' : 'border-[#DBEAFE] bg-white'}`}>
                <input
                  type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Écrire dans #${activeRoom.name}...`}
                  className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-[#EFF6FF] border-slate-200'}`}
                />
                <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition shrink-0 disabled:opacity-40">➔</button>
              </form>
            </>
          )
        ) : !activeContact ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Sélectionne un membre pour démarrer une conversation.
          </div>
        ) : (
          <>
            <div className={`px-6 py-4 border-b-2 border-red-600 flex items-center gap-3 ${darkMode ? 'bg-[#1E40AF]' : 'bg-white'}`}>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-bold shadow-sm">
                {getInitials(activeContact.full_name)}
              </div>
              <div>
                <h3 className="font-bold text-sm">{activeContact.full_name}</h3>
                <p className="text-xs text-slate-400">{activeContact.english_level}</p>
              </div>
            </div>

            <div className={`flex-1 overflow-y-auto p-6 space-y-4 relative ${darkMode ? 'bg-[#1E3A8A]' : 'bg-[#EFF6FF]'}`}>
              <div className="absolute inset-0 pointer-events-none" style={{
                opacity: darkMode ? 0.05 : 0.045,
                backgroundImage: `repeating-linear-gradient(45deg, #DC2626 0, #DC2626 1.5px, transparent 1.5px, transparent 26px), repeating-linear-gradient(-45deg, #1E40AF 0, #1E40AF 1.5px, transparent 1.5px, transparent 26px)`
              }} />

              {loadingHistory ? (
                <p className="text-center text-slate-400 text-sm relative z-10">Chargement de la conversation...</p>
              ) : currentMessages.length === 0 ? (
                <p className="text-center text-slate-400 text-sm italic relative z-10">Aucun message avec {activeContact.full_name}. Dis bonjour !</p>
              ) : (
                currentMessages.map(msg => {
                  const isMe = msg.sender_id === currentUser?.id;
                  const isTranslating = !!translatingIds[msg.id];
                  const isTranslationVisible = !!translationsVisible[msg.id];
                  return (
                    <div key={msg.id} className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'} ${selectedMsgForMenu === msg.id ? 'z-50' : (translationsVisible[msg.id] !== undefined ? 'z-20' : 'z-10')}`}>
                      <div className={`relative max-w-[70%] rounded-2xl px-4 py-3 shadow-xs ${isMe ? 'bg-gradient-to-br from-red-600 to-rose-700 text-white rounded-br-none' : (darkMode ? 'bg-[#1D4ED8] text-white border border-slate-700 rounded-bl-none' : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none')}`}>
                        {msg.media_url && (
                          msg.media_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img src={msg.media_url} alt={msg.content} className="rounded-lg mb-2 max-h-56 w-full object-cover" />
                          ) : (
                            <a href={msg.media_url} download className={`flex items-center gap-2 p-2 rounded-lg mb-2 text-xs font-medium ${isMe ? 'bg-white/10' : 'bg-black/5'}`}>
                              📎 <span className="truncate">{msg.content || 'Fichier'}</span>
                            </a>
                          )
                        )}
                        {msg.content && !(msg.media_url && msg.content === msg.content && msg.media_url.includes(msg.content)) && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap notranslate" translate="no">{msg.content}</p>
                        )}

                        {isTranslating && <p className="text-[10px] italic opacity-70 mt-1">Traduction en cours...</p>}
                        {!isTranslating && isTranslationVisible && traductions[msg.id] && (
                          <div className={`mt-2 p-2 rounded-xl text-xs border ${isMe ? 'bg-black/20 border-white/30' : (darkMode ? 'bg-[#1E40AF] border-slate-700' : 'bg-slate-100 border-slate-200')}`}>
                            <p className="italic">{traductions[msg.id]}</p>
                          </div>
                        )}

                        {msg.reactions && Object.keys(JSON.parse(msg.reactions)).length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {Object.entries(JSON.parse(msg.reactions)).map(([emo, cnt]) => (
                              <span key={emo} className={`text-[10px] px-1.5 py-0.5 rounded-full ${isMe ? 'bg-black/20' : 'bg-slate-100'}`}>{emo} {cnt}</span>
                            ))}
                          </div>
                        )}

                        <div className={`flex items-center justify-between mt-2 pt-1 border-t text-[11px] gap-4 ${isMe ? 'border-white/20 text-red-100' : 'border-slate-700/20 text-slate-400'}`}>
                          <span>{formatTime(msg.created_at)}</span>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => handleReact(msg, '❤️')} className="hover:scale-125 transition">❤️</button>
                            <button type="button" onClick={() => handleReact(msg, '👍')} className="hover:scale-125 transition">👍</button>
                            <button type="button" onClick={() => basculerTraduction(msg)} disabled={isTranslating} className="hover:underline font-semibold disabled:opacity-50">🌐</button>
                          </div>
                        </div>

                        {isMe && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedMsgForMenu(selectedMsgForMenu === msg.id ? null : msg.id); }}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition p-1 text-xs bg-black/20 rounded text-white"
                          >
                            ▼
                          </button>
                        )}

                        {selectedMsgForMenu === msg.id && (
                          <div ref={menuRef} className={`absolute right-0 top-8 z-50 w-40 rounded-lg shadow-xl border py-1 text-xs ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
                            <button onClick={() => { setForwardModalMsg(msg); setSelectedMsgForMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-red-500/10 flex items-center gap-2">
                              <span>➔</span> Transférer
                            </button>
                            {!msg.media_url && (
                              <button onClick={() => handleEditMessage(msg)} className="w-full text-left px-4 py-2 hover:bg-red-500/10 flex items-center gap-2">
                                <span>✏️</span> Modifier
                              </button>
                            )}
                            <button onClick={() => handleDeleteMessage(msg)} className="w-full text-left px-4 py-2 hover:bg-red-500/10 text-red-500 flex items-center gap-2">
                              <span>🗑️</span> Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
            <input type="file" ref={docInputRef} className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={handleFileUpload} />

            {suggestions.length > 0 && (
              <div className={`px-4 py-2 border-t flex items-center gap-2 overflow-x-auto ${darkMode ? 'bg-[#1E40AF] border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] text-slate-400 shrink-0">{dictLang === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                {suggestions.map(word => (
                  <button key={word} type="button" onClick={() => applySuggestion(word)} className={`text-xs px-3 py-1 rounded-full border shrink-0 transition ${darkMode ? 'border-slate-700 text-slate-200 hover:bg-red-500/15' : 'border-slate-200 text-slate-700 hover:bg-red-50'}`}>
                    {word}
                  </button>
                ))}
              </div>
            )}

            {forwardModalMsg && (
              <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                <div className={`w-full max-w-sm rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[420px] ${darkMode ? 'bg-[#1E40AF] border-slate-700 text-white' : 'bg-white border-slate-200'}`}>
                  <div className="p-4 border-b border-slate-700/20 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Transférer à...</h3>
                    <button onClick={() => setForwardModalMsg(null)} className="text-lg">✕</button>
                  </div>
                  <div className="p-3 border-b border-slate-700/20">
                    <input type="text" value={forwardSearch} onChange={(e) => setForwardSearch(e.target.value)} placeholder="Rechercher un membre..."
                      className={`w-full px-3 py-1.5 border rounded-lg text-xs focus:outline-none ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-slate-100 border-slate-200'}`} />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {otherMembers.filter(m => m.full_name.toLowerCase().includes(forwardSearch.toLowerCase())).map(member => (
                      <div key={member.id} onClick={() => executeForward(member)} className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-red-500/10 transition">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center font-bold text-xs">
                          {getInitials(member.full_name)}
                        </div>
                        <span className="text-sm font-medium">{member.full_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {editingMessageId && (
              <div className={`px-4 py-2 border-t flex items-center justify-between text-xs ${darkMode ? 'bg-[#1E40AF] border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                <span className="font-bold text-red-500">✏️ Modification du message...</span>
                <button onClick={() => { setEditingMessageId(null); setInputText(''); }} className="font-bold hover:opacity-75">✕</button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-2 relative ${darkMode ? 'border-slate-800 bg-[#1E40AF]' : 'border-[#DBEAFE] bg-white'}`}>
              {showStickerPicker && (
                <div ref={stickerPickerRef} className={`absolute bottom-20 left-4 p-3 rounded-2xl shadow-2xl border grid grid-cols-4 gap-2 z-50 w-64 ${darkMode ? 'bg-[#1D4ED8] border-slate-700' : 'bg-white border-slate-200'}`}>
                  {stickerList.map((emoji, i) => (
                    <button key={i} type="button" onClick={() => handleSendSticker(emoji)} className="text-3xl p-2 rounded-xl hover:bg-red-500/15 transition">{emoji}</button>
                  ))}
                </div>
              )}
              {showAttachMenu && (
                <div ref={attachMenuRef} className={`absolute bottom-20 left-12 z-50 rounded-2xl shadow-xl border py-3 px-2 flex flex-col gap-2 ${darkMode ? 'bg-[#1D4ED8] border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button type="button" onClick={() => fileInputRef.current.click()} className="flex items-center gap-3 px-4 py-2 text-xs rounded-xl hover:bg-red-500/10 font-medium">📷 Photo/Vidéo</button>
                  <button type="button" onClick={() => docInputRef.current.click()} className="flex items-center gap-3 px-4 py-2 text-xs rounded-xl hover:bg-red-500/10 font-medium">📄 Document</button>
                </div>
              )}

              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setShowStickerPicker(!showStickerPicker)} className="p-2 rounded-xl text-lg hover:bg-slate-100/10 transition">😊</button>
                <button type="button" onClick={() => setShowAttachMenu(!showAttachMenu)} disabled={uploadingFile} className="p-2 rounded-xl text-lg hover:bg-slate-100/10 transition disabled:opacity-50">
                  {uploadingFile ? '⏳' : '📎'}
                </button>
                <div className={`flex items-center rounded-lg overflow-hidden border text-xs font-semibold ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => setDictLang('fr')} className={`px-2 py-1 ${dictLang === 'fr' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>🇫🇷</button>
                  <button type="button" onClick={() => setDictLang('en')} className={`px-2 py-1 ${dictLang === 'en' ? 'bg-red-600 text-white' : 'text-slate-500'}`}>🇬🇧</button>
                </div>
                <button type="button" onClick={correctText} disabled={isCorrecting} className="p-2 rounded-xl text-lg hover:bg-slate-100/10 transition disabled:opacity-50">
                  {isCorrecting ? '⏳' : '✨'}
                </button>
              </div>

              <input
                type="text" value={inputText} onChange={(e) => setInputText(e.target.value)}
                placeholder="Écrivez votre message..."
                className={`flex-1 px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${darkMode ? 'bg-[#1D4ED8] border-slate-700 text-white' : 'bg-[#EFF6FF] border-slate-200'}`}
              />

              <button type="submit" disabled={!inputText.trim()} className="w-10 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition shrink-0 disabled:opacity-40">
                ➔
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}