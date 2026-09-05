import React, { useState, useMemo } from 'react';
import { 
  Trophy, Calendar, Plus, Edit3, Trash2, RotateCcw, 
  AlertTriangle, Shield, Flame, Activity, Award, HelpCircle,
  Sparkles, Star
} from 'lucide-react';
import { Spieler } from '../../types';
import { useSyncedState } from '../../hooks/useSyncedState';

export interface ChampionsCupProViewProps {
  players: Spieler[];
  isEditing?: boolean;
  setToast?: (toast: { message: string; id: number }) => void;
}

export interface PlayerSessionStats {
  passspiel: number;
  spielform: number;
  abschlussspiel: number;
  torschuss: number;
  athletik: number;
  schulnote: number;
}

export interface TrainingSession {
  id: string;
  date: string;
  period: 'vorrunde' | 'rueckrunde' | 'winter' | 'sommer';
  playerStats: Record<string, PlayerSessionStats>;
  notes?: string;
  createdAt: number;
}

export const ChampionsCupProView: React.FC<ChampionsCupProViewProps> = ({
  players,
  isEditing = true,
  setToast,
}) => {
  const [rankingPeriod, setRankingPeriod] = useState<'vorrunde' | 'rueckrunde'>('vorrunde');
  const [showAddModal, setShowAddModal] = useState(false);

  // Synced state
  const [sessions, setSessions] = useSyncedState<TrainingSession[]>('tableauSessions', []);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);

  // Custom Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'amber';
    onConfirm: () => void;
  } | null>(null);

  // Filter only actual squad players
  const squadPlayers = useMemo(() => {
    if (!players || !Array.isArray(players)) return [];
    const nonPlayerKeywords = [
      "trainer", "coach", "physio", "arzt", "manager", "betreuer", 
      "funktionär", "funktionaer", "staff", "official", "medical", 
      "athletik", "leiter", "sportlicher"
    ];

    return players.filter(p => {
      if (p.category && p.category !== "player") return false;
      const pos = (p.position || "").toLowerCase();
      if (nonPlayerKeywords.some(kw => pos.includes(kw))) return false;
      const fullName = (p.name || `${p.firstName || ""} ${p.lastName || ""}`).toLowerCase();
      if (nonPlayerKeywords.some(kw => fullName.includes(kw))) return false;
      return true;
    });
  }, [players]);

  // Form state for creating/editing a session
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPeriod, setFormPeriod] = useState<'vorrunde' | 'rueckrunde'>('vorrunde');
  const [formStats, setFormStats] = useState<Record<string, PlayerSessionStats>>({});
  const [formNotes, setFormNotes] = useState<string>('');

  // Helper to match period including legacy 'winter' / 'sommer'
  const isPeriodMatch = (sessionPeriod: string, target: 'vorrunde' | 'rueckrunde') => {
    if (target === 'vorrunde') {
      return sessionPeriod === 'vorrunde' || sessionPeriod === 'winter';
    }
    return sessionPeriod === 'rueckrunde' || sessionPeriod === 'sommer';
  };

  // Calculate Standings
  const standings = useMemo(() => {
    const stats: Record<string, {
      pName: string;
      passspiel: number;
      spielform: number;
      abschlussspiel: number;
      torschuss: number;
      athletik: number;
      totalPoints: number;
      noteSum: number;
      noteCount: number;
    }> = {};

    squadPlayers.forEach(p => {
      const name = p.name || `${p.firstName} ${p.lastName}`.trim();
      stats[name] = {
        pName: name, passspiel: 0, spielform: 0, abschlussspiel: 0, 
        torschuss: 0, athletik: 0, totalPoints: 0, noteSum: 0, noteCount: 0
      };
    });

    const filteredSessions = sessions.filter(s => isPeriodMatch(s.period, rankingPeriod));

    filteredSessions.forEach(session => {
      Object.entries(session.playerStats || {}).forEach(([pName, pStats]) => {
        if (!stats[pName]) return;
        
        stats[pName].passspiel += pStats.passspiel || 0;
        stats[pName].spielform += pStats.spielform || 0;
        stats[pName].abschlussspiel += pStats.abschlussspiel || 0;
        stats[pName].torschuss += pStats.torschuss || 0;
        stats[pName].athletik += pStats.athletik || 0;
        
        stats[pName].totalPoints += (pStats.passspiel || 0) + (pStats.spielform || 0) + (pStats.abschlussspiel || 0) + (pStats.torschuss || 0) + (pStats.athletik || 0);

        if (pStats.schulnote > 0) {
          stats[pName].noteSum += pStats.schulnote;
          stats[pName].noteCount += 1;
        }
      });
    });

    return Object.values(stats).sort((a, b) => b.totalPoints - a.totalPoints);
  }, [squadPlayers, sessions, rankingPeriod]);

  const handleStatChange = (playerName: string, field: keyof PlayerSessionStats, value: number) => {
    setFormStats(prev => ({
      ...prev,
      [playerName]: {
        ...(prev[playerName] || { passspiel: 0, spielform: 0, abschlussspiel: 0, torschuss: 0, athletik: 0, schulnote: 0 }),
        [field]: value
      }
    }));
  };

  const handleSaveSession = (e: React.FormEvent) => {
    e.preventDefault();

    const newSession: TrainingSession = {
      id: editingSessionId || `session_${Date.now()}`,
      date: formDate,
      period: formPeriod,
      playerStats: formStats,
      notes: formNotes,
      createdAt: Date.now()
    };

    if (editingSessionId) {
      setSessions(prev => prev.map(s => s.id === editingSessionId ? newSession : s));
      setToast?.({ message: 'Trainingseinheit erfolgreich aktualisiert!', id: Date.now() });
    } else {
      setSessions(prev => [...prev, newSession]);
      setToast?.({ message: 'Neue Wertung gespeichert!', id: Date.now() });
    }

    setEditingSessionId(null);
    setFormStats({});
    setFormNotes('');
    setShowAddModal(false);
  };

  const handleEditSession = (session: TrainingSession) => {
    setEditingSessionId(session.id);
    setFormDate(session.date);
    setFormPeriod((session.period === 'sommer' || session.period === 'rueckrunde') ? 'rueckrunde' : 'vorrunde');
    setFormStats({ ...session.playerStats });
    setFormNotes(session.notes || '');
    setShowAddModal(true);
  };

  const handleDeleteSession = (id: string) => {
    setConfirmModal({
      title: 'Wertung löschen',
      message: 'Möchtest du diese gewertete Trainingseinheit wirklich löschen?',
      confirmLabel: 'Löschen',
      confirmVariant: 'danger',
      onConfirm: () => {
        setSessions(prev => prev.filter(s => s.id !== id));
        setToast?.({ message: 'Wertung gelöscht.', id: Date.now() });
      }
    });
  };

  const handleResetAll = () => {
    setConfirmModal({
      title: '⚠️ ALLES AUF 0 ZURÜCKSETZEN',
      message: 'Möchtest du wirklich ALLE Daten löschen? Dies setzt die gesamte Tabelle unwiderruflich auf 0 zurück.',
      confirmLabel: 'Ja, alles löschen',
      confirmVariant: 'danger',
      onConfirm: () => {
        setSessions([]);
        setToast?.({ message: 'Alle Daten wurden zurückgesetzt!', id: Date.now() });
      }
    });
  };

  const getNoteColor = (avgNote: number) => {
    if (avgNote === 0) return 'text-slate-500 bg-slate-800/50 border-slate-700';
    if (avgNote <= 2.5) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50';
    if (avgNote <= 4.0) return 'text-amber-400 bg-amber-950/40 border-amber-800/50';
    return 'text-rose-400 bg-rose-950/40 border-rose-800/50';
  };

  // Helper for Podium Badges
  const renderRankBadge = (idx: number) => {
    if (idx === 0) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 to-yellow-500/15 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.25)] text-yellow-300 font-black">
          <span className="text-sm">🥇</span>
          <span className="text-xs tracking-wider">1. GOLD</span>
        </div>
      );
    }
    if (idx === 1) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-slate-300/25 to-slate-400/15 border border-slate-300/60 shadow-[0_0_10px_rgba(226,232,240,0.2)] text-slate-100 font-black">
          <span className="text-sm">🥈</span>
          <span className="text-xs tracking-wider">2. SILBER</span>
        </div>
      );
    }
    if (idx === 2) {
      return (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-700/25 to-orange-800/15 border border-amber-600/60 shadow-[0_0_10px_rgba(217,119,6,0.2)] text-amber-300 font-black">
          <span className="text-sm">🥉</span>
          <span className="text-xs tracking-wider">3. BRONZE</span>
        </div>
      );
    }
    return (
      <span className="font-mono font-bold text-slate-400 text-xs">
        {idx + 1}.
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="bg-[#0F1C2E] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-[#00C2FF]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-[#00C2FF]/15 text-[#00C2FF] border border-[#00C2FF]/30 mb-3 shadow-xs">
              <Activity className="w-4 h-4 text-[#00C2FF]" />
              <span>FC Auggen · Leistungsbewertung</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <span>FC Auggen – Trainings-Tableau</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              Punktevergabe in 5 festen Kategorien (Passspiel, Spielform, Abschlussspiel, Torschuss, Athletik) inkl. Schulnoten-Bewertung.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setEditingSessionId(null);
                setFormStats({});
                setFormNotes('');
                setShowAddModal(true);
              }}
              className="px-4 py-2.5 bg-[#1A73E8] hover:bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all transform hover:scale-105 border border-[#00C2FF]/40 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Einheit werten</span>
            </button>

            <button
              onClick={handleResetAll}
              className="px-3 py-2.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold text-xs rounded-xl shadow flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Alles zurücksetzen</span>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* ZEITRAUM FILTER (VORRUNDE / RÜCKRUNDE) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900 border border-slate-800 p-2 rounded-xl gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRankingPeriod('vorrunde')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                rankingPeriod === 'vorrunde'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-400/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Shield className="w-4 h-4 text-blue-300" />
              <span>Vorrunde</span>
            </button>

            <button
              onClick={() => setRankingPeriod('rueckrunde')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                rankingPeriod === 'rueckrunde'
                  ? 'bg-amber-500 text-slate-950 shadow-md border border-amber-300/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-700" />
              <span>Rückrunde</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-400 px-3 flex items-center gap-2">
            <span>Aktive Wertungsphase:</span>
            <span className="text-white bg-slate-800 px-2 py-0.5 rounded font-black border border-slate-700">
              {rankingPeriod === 'vorrunde' ? 'Vorrunde' : 'Rückrunde'}
            </span>
          </div>
        </div>

        {/* STANDINGS TABLE */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-slate-950/70 text-[11px] font-black text-slate-400 uppercase border-b border-slate-800 tracking-wider">
                  <th className="p-3.5 w-32 text-center">Platz</th>
                  <th className="p-3.5">Spieler</th>
                  <th className="p-3 text-center">Passspiel</th>
                  <th className="p-3 text-center">Spielform</th>
                  <th className="p-3 text-center">Abschluss</th>
                  <th className="p-3 text-center">Torschuss</th>
                  <th className="p-3 text-center">Athletik</th>
                  <th className="p-3.5 text-center text-amber-400 bg-amber-950/20 font-black">Punkte</th>
                  <th className="p-3.5 text-center">Ø Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {standings.map((st, idx) => {
                  const avgNote = st.noteCount > 0 ? (st.noteSum / st.noteCount).toFixed(1) : 0;
                  const isGold = idx === 0 && st.totalPoints > 0;
                  const isSilver = idx === 1 && st.totalPoints > 0;
                  const isBronze = idx === 2 && st.totalPoints > 0;
                  
                  return (
                    <tr 
                      key={st.pName} 
                      className={`transition-colors ${
                        isGold 
                          ? 'bg-amber-500/10 hover:bg-amber-500/15' 
                          : isSilver 
                          ? 'bg-slate-300/5 hover:bg-slate-300/10' 
                          : isBronze 
                          ? 'bg-orange-950/15 hover:bg-orange-950/25' 
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3 text-center font-bold">
                        {renderRankBadge(idx)}
                      </td>
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span>{st.pName}</span>
                        {isGold && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />}
                        {isSilver && <Award className="w-3.5 h-3.5 text-slate-300" />}
                        {isBronze && <Star className="w-3.5 h-3.5 text-amber-500" />}
                      </td>
                      <td className="p-3 text-center text-slate-300 font-mono font-semibold">{st.passspiel}</td>
                      <td className="p-3 text-center text-slate-300 font-mono font-semibold">{st.spielform}</td>
                      <td className="p-3 text-center text-slate-300 font-mono font-semibold">{st.abschlussspiel}</td>
                      <td className="p-3 text-center text-slate-300 font-mono font-semibold">{st.torschuss}</td>
                      <td className="p-3 text-center text-slate-300 font-mono font-semibold">{st.athletik}</td>
                      
                      <td className="p-3 text-center bg-amber-950/15">
                        <span className={`font-mono font-black text-sm px-2.5 py-1 rounded-lg border shadow-sm ${
                          isGold 
                            ? 'text-yellow-300 bg-yellow-500/20 border-yellow-400/50' 
                            : 'text-amber-400 bg-amber-950/60 border-amber-500/30'
                        }`}>
                          {st.totalPoints}
                        </span>
                      </td>
                      
                      <td className="p-3 text-center">
                        <span className={`font-mono font-bold px-2.5 py-1 rounded-lg border ${getNoteColor(Number(avgNote))}`}>
                          {avgNote === 0 ? '-' : avgNote}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* LOGGED SESSIONS HISTORY */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-extrabold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            Historie der eingetragenen Einheiten
          </h3>
          
          {sessions.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center">
              Noch keine Einheiten gewertet. Klicke auf "Einheit werten", um Ergebnisse einzutragen!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.slice().reverse().map((session) => {
                const isVorrunde = session.period === 'vorrunde' || session.period === 'winter';
                return (
                  <div key={session.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${isVorrunde ? 'bg-blue-900/40 text-blue-300 border-blue-500/30' : 'bg-amber-900/40 text-amber-300 border-amber-500/30'}`}>
                          {isVorrunde ? 'Vorrunde' : 'Rückrunde'}
                        </span>
                        <span className="text-xs font-bold text-white">Datum: {session.date}</span>
                      </div>
                      {session.notes && (
                        <p className="text-xs text-slate-400 italic mt-1">"{session.notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditSession(session)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Bearbeiten</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 📘 KOMPAKTE BEDIENUNGSANLEITUNGS-LEISTE (FÜR UNTEN) */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0F1C2E] to-slate-900 border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-2.5 mb-3 border-b border-slate-800/80 pb-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>Schnellanleitung: Trainings-Tableau & Punktevergabe</span>
              </h4>
              <p className="text-[10px] text-slate-400">So trägst du Leistungen ein und wertest sie automatisch aus:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* SCHRITT 1 */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">1. Einheit eintragen</span>
                  <span className="text-xs font-black text-slate-500">01</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Oben auf <strong className="text-white">„Einheit werten“</strong> klicken, Datum wählen und die Saisonphase (<strong className="text-blue-300">Vorrunde</strong> oder <strong className="text-amber-300">Rückrunde</strong>) auswählen.
                </p>
              </div>
            </div>

            {/* SCHRITT 2 */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">2. 5 Kategorien</span>
                  <span className="text-xs font-black text-slate-500">02</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Punkte für <strong className="text-white">Passspiel</strong>, <strong className="text-white">Spielform</strong>, <strong className="text-white">Abschluss</strong>, <strong className="text-white">Torschuss</strong> und <strong className="text-white">Athletik</strong> eintragen.
                </p>
              </div>
            </div>

            {/* SCHRITT 3 */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">3. Schulnote (1 - 6)</span>
                  <span className="text-xs font-black text-slate-500">03</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Optional eine Tagesnote (<strong className="text-emerald-400">1.0 = Sehr gut</strong> bis <strong className="text-rose-400">6.0 = Ungenügend</strong>) vergeben. Das System berechnet die <strong className="text-white">Ø Note</strong>.
                </p>
              </div>
            </div>

            {/* SCHRITT 4 */}
            <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase text-yellow-400 tracking-wider">4. Rangliste & Medaillen</span>
                  <span className="text-xs font-black text-slate-500">04</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Die Tabelle ordnet automatisch nach Gesamtpunkten. Platz 1, 2 und 3 erhalten <strong className="text-yellow-300">🥇 Gold</strong>, <strong className="text-slate-200">🥈 Silber</strong> und <strong className="text-amber-400">🥉 Bronze</strong>!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT TRAINING SESSION EVALUATION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-400" />
                <span>{editingSessionId ? 'Wertung korrigieren' : 'Tageswertung eintragen'}</span>
              </h2>
              
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500"
                  required
                />
                <select
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value as 'vorrunde' | 'rueckrunde')}
                  className="bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-blue-500 uppercase"
                >
                  <option value="vorrunde">Vorrunde</option>
                  <option value="rueckrunde">Rückrunde</option>
                </select>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white font-bold ml-2 cursor-pointer">✕</button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {/* Desktop Header for Inputs */}
              <div className="hidden md:grid grid-cols-7 gap-2 px-3 pb-2 border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
                <div className="col-span-1 text-left">Spieler</div>
                <div>Passspiel</div>
                <div>Spielform</div>
                <div>Abschluss</div>
                <div>Torschuss</div>
                <div>Athletik</div>
                <div className="text-amber-400">Schulnote (1-6)</div>
              </div>

              {squadPlayers.map(p => {
                const pName = p.name || `${p.firstName} ${p.lastName}`.trim();
                const pStats = formStats[pName] || { passspiel: 0, spielform: 0, abschlussspiel: 0, torschuss: 0, athletik: 0, schulnote: 0 };

                return (
                  <div key={pName} className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl md:grid md:grid-cols-7 md:gap-2 md:items-center flex flex-col gap-3">
                    <span className="text-xs font-bold text-white col-span-1">{pName}</span>
                    
                    <div className="grid grid-cols-3 md:grid-cols-6 col-span-6 gap-2">
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-slate-500 md:hidden font-bold uppercase">Passspiel</label>
                        <input type="number" min="0" value={pStats.passspiel || ''} onChange={(e) => handleStatChange(pName, 'passspiel', Number(e.target.value))} placeholder="0" className="w-full md:w-16 bg-slate-900 border border-slate-700 text-white text-center rounded px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-slate-500 md:hidden font-bold uppercase">Spielform</label>
                        <input type="number" min="0" value={pStats.spielform || ''} onChange={(e) => handleStatChange(pName, 'spielform', Number(e.target.value))} placeholder="0" className="w-full md:w-16 bg-slate-900 border border-slate-700 text-white text-center rounded px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-slate-500 md:hidden font-bold uppercase">Abschluss</label>
                        <input type="number" min="0" value={pStats.abschlussspiel || ''} onChange={(e) => handleStatChange(pName, 'abschlussspiel', Number(e.target.value))} placeholder="0" className="w-full md:w-16 bg-slate-900 border border-slate-700 text-white text-center rounded px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-slate-500 md:hidden font-bold uppercase">Torschuss</label>
                        <input type="number" min="0" value={pStats.torschuss || ''} onChange={(e) => handleStatChange(pName, 'torschuss', Number(e.target.value))} placeholder="0" className="w-full md:w-16 bg-slate-900 border border-slate-700 text-white text-center rounded px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-slate-500 md:hidden font-bold uppercase">Athletik</label>
                        <input type="number" min="0" value={pStats.athletik || ''} onChange={(e) => handleStatChange(pName, 'athletik', Number(e.target.value))} placeholder="0" className="w-full md:w-16 bg-slate-900 border border-slate-700 text-white text-center rounded px-2 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none" />
                      </div>
                      <div className="flex flex-col gap-1 md:items-center">
                        <label className="text-[9px] text-amber-500 md:hidden font-bold uppercase">Note (1-6)</label>
                        <input type="number" min="1" max="6" step="0.5" value={pStats.schulnote || ''} onChange={(e) => handleStatChange(pName, 'schulnote', Number(e.target.value))} placeholder="-" className="w-full md:w-16 bg-amber-950/20 border border-amber-800/50 text-amber-300 text-center rounded px-2 py-1.5 text-xs font-mono font-bold focus:border-amber-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div className="mt-4 pt-4 border-t border-slate-800">
                <input
                  type="text"
                  placeholder="Notizen zur Trainingseinheit (optional)..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer">
                Abbrechen
              </button>
              <button onClick={handleSaveSession} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl shadow-lg transition-colors cursor-pointer">
                {editingSessionId ? 'Änderungen speichern' : 'Wertung eintragen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-xl border shrink-0 bg-rose-500/20 text-rose-400 border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white leading-snug">{confirmModal.title}</h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer">Abbrechen</button>
              <button onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className="px-4 py-2 font-black text-xs rounded-xl bg-rose-600 text-white shadow-lg cursor-pointer">
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChampionsCupProView;
