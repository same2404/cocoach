import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  ShieldAlert, 
  Lock, 
  User, 
  Sparkles, 
  Clock, 
  CheckCheck, 
  Search,
  Filter,
  AlertCircle
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  senderRole: string;
  text: string;
  createdAt: string;
  category?: 'allgemein' | 'taktik' | 'kader' | 'wichtig';
}

interface TrainerChatViewProps {
  isOwner: boolean;
  currentUserEmail: string;
  currentUserName: string;
  messages: ChatMessage[];
  onSendMessage: (text: string, category?: 'allgemein' | 'taktik' | 'kader' | 'wichtig') => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onClearChat?: () => Promise<void>;
}

export const TrainerChatView: React.FC<TrainerChatViewProps> = ({
  isOwner,
  currentUserEmail,
  currentUserName,
  messages = [],
  onSendMessage,
  onDeleteMessage,
  onClearChat
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'allgemein' | 'taktik' | 'kader' | 'wichtig'>('allgemein');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSending, setIsSending] = useState(false);

  // If user is not Samer / Owner: Show Access Denied Guard
  if (!isOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center bg-[#121824] rounded-2xl border border-red-500/40 shadow-2xl my-auto">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border-2 border-red-500/50 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
          <Lock className="w-10 h-10 text-red-400 animate-pulse" />
        </div>

        <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-red-500/20 text-red-300 px-3 py-1 rounded-full border border-red-500/30 mb-3">
          Zugriff gesperrt • Sicherheitssystem
        </span>

        <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">
          Chat-Zugriff Beschränkt
        </h2>

        <p className="text-sm font-semibold text-slate-300 max-w-lg leading-relaxed mb-6">
          Alle Trainer, die diese App nutzen, haben keinen Zugriff auf den Chat. 
          Nur der Entwickler und Owner <strong className="text-amber-400 font-extrabold underline decoration-amber-500">Samer Khaleel (samerkhaleel720@gmail.com)</strong> hat Schreib- und Leserechte für den Chat.
        </p>

        <div className="p-4 bg-slate-900/80 border border-slate-700/60 rounded-xl text-left max-w-md w-full space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <ShieldAlert size={14} className="text-amber-400" />
            <span>Zugriffsstatus: <span className="text-red-400 font-black">NICHT BERECHTIGT</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <User size={14} className="text-blue-400" />
            <span>Berechtigter Owner: <span className="text-white font-bold">samerkhaleel720@gmail.com</span></span>
          </div>
        </div>
      </div>
    );
  }

  // Owner (Samer) Access: Full Interactive Chat
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(inputText.trim(), selectedCategory);
      setInputText('');
    } catch (err) {
      console.error("Fehler beim Senden der Chat-Nachricht:", err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredMessages = messages.filter(m => {
    if (!searchTerm) return true;
    return m.text.toLowerCase().includes(searchTerm.toLowerCase()) || 
           m.senderName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#0F172A] rounded-2xl border border-[#334155] shadow-2xl overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#1E293B] p-4 border-b border-[#334155] flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            <MessageSquare size={20} className="font-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase text-white tracking-wider">
                Exklusiver Entwickler & Owner Chat
              </h2>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/40">
                OWNER: SAMER
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Live-Kommunikationskanal & Notizbuch exklusiv für Samer Khaleel
            </p>
          </div>
        </div>

        {/* Quick Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nachrichten durchsuchen..."
              className="bg-[#0F172A] border border-[#334155] text-xs font-bold text-white pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500 w-44 sm:w-60"
            />
          </div>

          {onClearChat && messages.length > 0 && (
            <button
              onClick={onClearChat}
              className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              title="Chatverlauf leeren"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Verlauf leeren</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-[#0A0E17]/60">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mb-3 border border-slate-700">
              <Sparkles size={28} className="text-amber-400/60" />
            </div>
            <p className="text-xs font-black uppercase tracking-wider text-slate-400">
              Noch keine Nachrichten vorhanden
            </p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
              Schreibe hier wichtige Notizen, Taktikanweisungen oder Entwicklungs-Briefings. Nur du (Samer) kannst diesen Chat einsehen!
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMe = msg.senderEmail.toLowerCase() === (currentUserEmail || '').toLowerCase() || isOwner;
            return (
              <div 
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-2xl ${isMe ? 'ml-auto' : 'mr-auto'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                    {msg.senderName || 'Samer (Owner)'}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.category && (
                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                      msg.category === 'wichtig' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                      msg.category === 'taktik' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                      msg.category === 'kader' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-slate-700/40 text-slate-300 border-slate-600/40'
                    }`}>
                      {msg.category}
                    </span>
                  )}
                </div>

                <div className={`group relative p-3.5 rounded-2xl text-xs font-medium leading-relaxed border shadow-md ${
                  isMe 
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-50 rounded-tr-xs' 
                    : 'bg-slate-800 border-slate-700 text-slate-100 rounded-tl-xs'
                }`}>
                  <p className="whitespace-pre-wrap break-words text-sm font-semibold">{msg.text}</p>

                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 text-white p-1 rounded-full shadow-lg hover:bg-red-700"
                    title="Nachricht löschen"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 bg-[#1E293B] border-t border-[#334155] flex flex-col gap-2 shrink-0">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Kategorie:</span>
          {[
            { id: 'allgemein', label: 'Allgemein' },
            { id: 'taktik', label: '⚽ Taktik & Ausrichtung' },
            { id: 'kader', label: '📋 Kader-Notizen' },
            { id: 'wichtig', label: '🚨 Wichtig / Urgent' }
          ].map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition border shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Input & Send Button */}
        <div className="flex items-center gap-2">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Schreibe eine Chat-Nachricht (NUR DU als Samer/Owner kannst schreiben)..."
            className="flex-1 bg-[#0F172A] border border-[#334155] rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition shadow-lg cursor-pointer"
          >
            <span>{isSending ? 'Sende...' : 'Senden'}</span>
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};
