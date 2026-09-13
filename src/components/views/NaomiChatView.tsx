import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Trash2, Sparkles, Copy, Check } from 'lucide-react';
import { useClub } from '../../contexts/ClubContext';
import { apiFetch } from '../../lib/apiClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface NaomiChatProps {
  players?: any[];
  matchAnalyses?: any[];
  competitiveMatches?: any[];
}

const SUGGESTIONS = [
  'Welche Aufstellung empfiehlst du für das nächste Spiel?',
  'Analysiere unsere Stärken und Schwächen',
  'Erstelle einen Trainingsplan für diese Woche',
  'Wer ist unser bester Spieler aktuell?',
  'Was müssen wir gegen den nächsten Gegner verbessern?',
];

export const NaomiChat: React.FC<NaomiChatProps> = ({ players = [], matchAnalyses = [], competitiveMatches = [] }) => {
  const { activeClub } = useClub();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getSystemContext = () => {
    const squad = players.filter((p: any) => p.category === 'player');
    const squadList = squad.map((p: any) => `${p.firstName || ''} ${p.lastName || ''} (${p.position}, Nr. ${p.number || '?'})`).join(', ');
    const recentMatches = matchAnalyses.slice(-3).map((a: any) => `${a.date || '?'}: ${a.opponent || '?'} ${a.result || '?'}`).join('; ');
    const upcomingMatches = competitiveMatches.filter((m: any) => !m.result).slice(0, 3).map((m: any) => `${m.date || '?'}: vs. ${m.opponent || '?'} (${m.isHome ? 'Heim' : 'Auswärts'})`).join('; ');

    return `Du bist Naomi, die Analyse-Engine-Assistentin von ${activeClub.name} (${activeClub.shortName || activeClub.name}).
Du bist eine erfahrene Fußball-Analystin und Trainerin. Antworte IMMER auf Deutsch.
Du kennst den Kader, die aktuellen Ergebnisse und die taktische Ausrichtung.

AKTUELLER KADER: ${squadList || 'Keine Daten'}
LETZTE ERGEBNISSE: ${recentMatches || 'Keine Daten'}
KOMMENDE SPIELE: ${upcomingMatches || 'Keine Daten'}
VEREIN: ${activeClub.name}
FORMATION: 4-2-3-1 (Standard)

Regeln:
- Antworte kurz und präzise (max 3-4 Sätze)
- Nutze Emoji sparsam
- Sei hilfsbereit und professionell
- Beziehe dich auf konkrete Spieler wenn möglich
- Bei taktischen Fragen: denke an 4-2-3-1 Formation`;
  };

  const handleSend = async (text?: string) => {
    const question = text || input.trim();
    if (!question || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/tactical-analysis', {
        method: 'POST',
        body: JSON.stringify({
          tacticalPhaseConfig: {
            offensiv: { aufbau: 'Pressing HOCH', fokusspieler: 'Stürmer', muster: 'Steil-Klatsch' },
            umschaltenDefensiv: { gegenpressingintensitaet: 'hoch', trigger: 'Ballverlust', absicherung: '3er Restverteidigung', pressingseite: 'situativ' }
          },
          formation: '4-2-3-1',
          clubName: activeClub.name,
          customQuestion: question,
          systemContext: getSystemContext()
        })
      });

      const data = await res.json();
      let answer = '';

      if (data.success && data.analysis && data.analysis.length > 0) {
        answer = data.analysis.map((a: any) => `**${a.title}**\n${a.content}`).join('\n\n');
      } else if (data.raw) {
        answer = data.raw;
      } else {
        answer = 'Ich konnte leider keine passende Antwort generieren. Versuche es mit einer konkreteren Frage.';
      }

      const assistantMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `e_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Verbindungsfehler. Bitte versuche es erneut.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-h-[700px]">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-950/60 via-slate-900 to-slate-950 border-2 border-violet-500/50 rounded-t-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-600 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-black text-white text-sm uppercase tracking-wider">Naomi AI</h3>
            <p className="text-[9px] text-violet-400">{activeClub.name} • Analyse-Engine-Assistentin</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="text-slate-500 hover:text-red-400 transition-colors p-2"
          title="Chat leeren"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-slate-900 border-x-2 border-violet-500/20 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
              <Sparkles size={28} className="text-violet-400" />
            </div>
            <div>
              <h4 className="text-white font-black text-lg uppercase">Naomi AI Chat</h4>
              <p className="text-slate-500 text-xs mt-1">Frag mich alles zu deinem Team, Taktik und Strategie</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="bg-slate-800 hover:bg-violet-500/20 border border-slate-700 hover:border-violet-500/50 text-[10px] text-slate-300 hover:text-white px-3 py-2 rounded-xl transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot size={14} className="text-violet-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-violet-600 text-white rounded-br-md'
                : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700'
            }`}>
              <div className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[8px] opacity-50">{new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                {msg.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="text-[8px] opacity-50 hover:opacity-100 transition-opacity"
                  >
                    {copiedId === msg.id ? <Check size={10} /> : <Copy size={10} />}
                  </button>
                )}
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User size={14} className="text-slate-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-violet-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="text-violet-400 animate-spin" />
                <span className="text-[10px] text-slate-400">Naomi denkt nach...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-slate-900 border-2 border-t-0 border-violet-500/20 rounded-b-2xl p-3">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage an Naomi..."
            rows={1}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-[11px] text-white placeholder:text-slate-600 resize-none focus:outline-none focus:border-violet-500 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-600 text-white w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
