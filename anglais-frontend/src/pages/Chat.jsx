import { useState } from 'react';

export default function Chat() {
  const [activeContact, setActiveContact] = useState(1);
  const [messageText, setMessageText] = useState('');

  const [contacts] = useState([
    { id: 1, name: 'Sarah Connor', role: 'Fullstack Dev', level: 'C1', online: true },
    { id: 2, name: 'Alex Johnson', role: 'UI/UX Designer', level: 'B2', online: false },
    { id: 3, name: 'David Smith', role: 'Data Analyst', level: 'A2', online: true }
  ]);

  const [conversations, setConversations] = useState({
    1: [
      { id: 1, sender: 'them', text: 'Hello! Welcome to the English Club chat.', time: '10:00' },
      { id: 2, sender: 'me', text: 'Hi Sarah! Happy to be here. How are you?', time: '10:02' },
      { id: 3, sender: 'them', text: 'Doing great! Ready to collaborate on projects?', time: '10:05' }
    ],
    2: [
      { id: 1, sender: 'them', text: 'Hey, did you see the new design guidelines?', time: 'Yesterday' }
    ],
    3: [
      { id: 1, sender: 'them', text: 'Hi! Let me know if you want to practice English together.', time: '09:15' }
    ]
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: messageText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversations({
      ...conversations,
      [activeContact]: [...(conversations[activeContact] || []), newMsg]
    });

    setMessageText('');
  };

  const selectedContact = contacts.find(c => c.id === activeContact);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 h-[550px] overflow-hidden">
      
      {/* Liste des contacts (Colonne gauche) */}
      <div className="border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 text-lg">Direct Messages 💬</h2>
          <p className="text-xs text-slate-500">Discutez en privé avec les membres</p>
        </div>

        <div className="overflow-y-auto flex-1">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => setActiveContact(contact.id)}
              className={`p-3.5 flex items-center justify-between cursor-pointer border-b border-slate-100 transition ${
                activeContact === contact.id ? 'bg-white font-semibold border-l-4 border-red-600' : 'hover:bg-slate-100'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-900 font-bold">{contact.name}</span>
                  <span className={`w-2 h-2 rounded-full ${contact.online ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                </div>
                <span className="text-xs text-slate-500 block">{contact.role}</span>
              </div>
              <span className="text-[10px] bg-slate-900 text-white font-bold px-1.5 py-0.5 rounded">
                {contact.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Zone de conversation (Colonne droite) */}
      <div className="md:col-span-2 flex flex-col bg-white">
        
        {/* Entête du chat */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-sm">{selectedContact?.name}</h3>
            <span className="text-xs text-slate-300">{selectedContact?.role} — Level {selectedContact?.level}</span>
          </div>
          <span className="text-xs bg-red-600 px-2 py-0.5 rounded font-bold">1-on-1 Chat</span>
        </div>

        {/* Message feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
          {(conversations[activeContact] || []).map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'me' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-lg text-sm shadow-sm ${
                  msg.sender === 'me'
                    ? 'bg-red-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
            </div>
          ))}
        </div>

        {/* Saisie du message */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <input
            type="text"
            placeholder="Type your message in English..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="flex-1 p-2.5 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold px-5 py-2 rounded-md transition"
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}