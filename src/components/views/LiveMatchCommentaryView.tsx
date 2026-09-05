import React, { useState, useCallback } from 'react';
import { Mic, MicOff, Send, Clock, Target, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface CommentaryEntry {
  id: string;
  time: string;
  minute: number;
  text: string;
  category: 'tor' | 'chance' | 'foul' | 'wechsel' | 'taktik' | 'allgemein';
  structured?: {
    player?: string;
    action?: string;
    zone?: string;
    impact?: 'positive' | 'negative' | 'neutral';
  };
  timestamp: number;
}

interface LiveMatchCommentaryProps {
  matchId?: string;
  onSave?: (entries: CommentaryEntry[]) => void;
}

const CATEGORIES = [
  { id: 'tor', label: '⚽ Tor', color: '#10B981' },
  { id: 'chance', label: '🎯 Chance', color: '#F59E0B' },
  { id: 'foul', label: '⚠️ Foul', color: '#EF4444' },
  { id: 'wechsel', label: '🔄 Wechsel', color: '#3B82F6' },
  { id: 'taktik', label: '📐 Taktik', color: '#8B5CF6' },
  { id: 'allgemein', label: '📝 Allgemein', color: '#6B7280' },
];

export const LiveMatchCommentary: React.FC<LiveMatchCommentaryProps> = ({ matchId, onSave }) => {
  const [entries, setEntries] = useState<CommentaryEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('allgemein');
  const [matchMinute, setMatchMinute] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      addEntry(text.trim());
    }
  }, [selectedCategory, matchMinute]);

  const { isListening, interimTranscript, isSupported, toggle, error } = useVoiceInput({
    lang: 'de-DE',
    continuous: true,
    interimResults: true,
    onResult: handleVoiceResult
  });

  const addEntry = (text: string) => {
    const entry: CommentaryEntry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: `${matchMinute}'`,
      minute: matchMinute,
      text,
      category: detectCategory(text),
      structured: extractStructuredData(text),
      timestamp: Date.now()
    };
    setEntries(prev => [...prev, entry]);
  };

  const detectCategory = (text: string): CommentaryEntry['category'] => {
    const lower = text.toLowerCase();
    if (lower.includes('tor') || lower.includes('goal') || lower.includes('1:0') || lower.includes('2:0')) return 'tor';
    if (lower.includes('chance') || lower.includes('schuss') || lower.includes('schieß')) return 'chance';
    if (lower.includes('foul') || lower.includes('gelb') || lower.includes('rot') || lower.includes('fehler')) return 'foul';
    if (lower.includes('wechsel') || lower.includes('einwechs') || lower.includes('auswechs')) return 'wechsel';
    if (lower.includes('taktik') || lower.includes('pressing') || lower.includes('formation')) return 'taktik';
    return 'allgemein';
  };

  const extractStructuredData = (text: string) => {
    const numberMatch = text.match(/(\d+)\s*(?:\.|\/|\.?\s*(?:Min|Minute))/);
    const playerMatch = text.match(/(?:Nummer|Nr\.?|#)\s*(\d+)/i);
    const zoneMatch = text.match(/(?:zentrum|flügel|links|rechts|hinten|vorne|mittelfeld)/i);

    return {
      player: playerMatch ? `Spieler #${playerMatch[1]}` : undefined,
      action: text.substring(0, 50),
      zone: zoneMatch ? zoneMatch[0] : undefined,
      impact: detectImpact(text)
    };
  };

  const detectImpact = (text: string): 'positive' | 'negative' | 'neutral' => {
    const lower = text.toLowerCase();
    if (lower.includes('gut') || lower.includes('stark') || lower.includes('tor') || lower.includes('chance')) return 'positive';
    if (lower.includes('schlecht') || lower.includes('fehler') || lower.includes('foul') || lower.includes('verlier')) return 'negative';
    return 'neutral';
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      addEntry(textInput.trim());
      setTextInput('');
    }
  };

  const handleSave = () => {
    onSave?.(entries);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] p-4 lg:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Live-Spielkommentar</h1>
          <p className="text-[10px] text-[#94A3B8] mt-0.5">Spracheingabe + strukturierte Analyse</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[#121824] border border-[#334155]/60 rounded-xl px-3 py-1.5 flex items-center gap-2">
            <Clock size={14} className="text-[#F59E0B]" />
            <span className="text-sm font-black text-white font-mono">{matchMinute}'</span>
            <input
              type="number"
              min={0}
              max={120}
              value={matchMinute}
              onChange={e => setMatchMinute(parseInt(e.target.value) || 0)}
              className="w-12 bg-transparent text-center text-sm font-black text-white focus:outline-none"
            />
          </div>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all ${
              isRunning ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30' : 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
            }`}
          >
            {isRunning ? '⏹ Stopp' : '▶️ Start'}
          </button>
        </div>
      </div>

      {/* Category Selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'text-white'
                : 'bg-[#1E293B]/50 text-[#94A3B8] hover:text-white'
            }`}
            style={selectedCategory === cat.id ? { backgroundColor: `${cat.color}22`, border: `1px solid ${cat.color}44` } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Voice Input Area */}
      <div className="bg-[#121824] border border-[#334155]/60 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-[#EF4444] text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse'
                : 'bg-[#1E293B] text-[#94A3B8] hover:bg-[#334155]'
            }`}
          >
            {isListening ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <div className="flex-1 min-w-0">
            {isListening ? (
              <div className="text-xs text-[#F59E0B] font-bold animate-pulse">
                {interimTranscript || '🔴 Höre zu...'}
              </div>
            ) : (
              <div className="text-xs text-[#64748B]">
                {isSupported ? 'Klicke auf Mikrofon zum Starten' : 'Spracherkennung nicht unterstützt'}
              </div>
            )}
            {error && <div className="text-[9px] text-[#EF4444] mt-1">{error}</div>}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
            <span className="text-[9px] text-[#94A3B8]">{entries.length} Einträge</span>
          </div>
        </div>

        {/* Text Input Fallback */}
        <div className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
            placeholder="Oder manuell eingeben..."
            className="flex-1 bg-[#0F172A] border border-[#334155]/60 rounded-xl px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#F59E0B]/50"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="px-3 py-2 bg-[#F59E0B] text-black rounded-xl disabled:opacity-30 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Entries List */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-[#64748B] text-xs">
            Noch keine Kommentare. Starte die Spracheingabe oder tippe etwas.
          </div>
        ) : (
          entries.map(entry => {
            const cat = CATEGORIES.find(c => c.id === entry.category);
            return (
              <div
                key={entry.id}
                className="bg-[#121824] border border-[#334155]/40 rounded-xl p-3 flex items-start gap-3"
              >
                <div className="text-center shrink-0">
                  <div className="text-xs font-black text-white font-mono">{entry.time}</div>
                  <div className="text-[8px] text-[#64748B]">{new Date(entry.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${cat?.color}22`, color: cat?.color }}
                    >
                      {cat?.label}
                    </span>
                    {entry.structured?.impact && (
                      <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        entry.structured.impact === 'positive' ? 'bg-[#10B981]/20 text-[#10B981]' :
                        entry.structured.impact === 'negative' ? 'bg-[#EF4444]/20 text-[#EF4444]' :
                        'bg-[#6B7280]/20 text-[#6B7280]'
                      }`}>
                        {entry.structured.impact}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#CBD5E1]">{entry.text}</p>
                  {entry.structured?.player && (
                    <p className="text-[9px] text-[#94A3B8] mt-1">👤 {entry.structured.player}</p>
                  )}
                </div>
                <button
                  onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
                  className="text-[9px] text-[#EF4444] hover:text-[#F87171] transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Save Button */}
      {entries.length > 0 && (
        <button
          onClick={handleSave}
          className="w-full py-3 bg-[#F59E0B] text-black rounded-xl font-black text-xs uppercase tracking-wider hover:bg-[#FBBF24] transition-all"
        >
          💾 {entries.length} Kommentare speichern
        </button>
      )}
    </div>
  );
};
