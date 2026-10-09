import React, { useState, useMemo } from 'react';
import { Player, Match, MatchMinuteRecord, Opponent } from '../../types';
import { isPlayer } from '../../utils/playerSorting';
import { apiFetch } from '../../lib/apiClient';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Timer, 
  Users, 
  Trash2, 
  Edit2, 
  Plus, 
  X, 
  LayoutGrid, 
  List, 
  ExternalLink, 
  Trophy, 
  Target, 
  RotateCcw, 
  Download, 
  Award, 
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Shield,
  Globe,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatchPlanningViewProps {
  players: Player[];
  matches: Match[];
  matchMinutes: MatchMinuteRecord[];
  opponents: Opponent[];
  onSaveMatch: (match: Match) => Promise<void>;
  onDeleteMatch: (id: string | number) => Promise<void>;
  onSaveMinutes: (record: MatchMinuteRecord) => Promise<void>;
  onSaveOpponent: (opponent: Opponent) => Promise<void>;
  onDeleteOpponent: (id: string) => Promise<void>;
  onWipeAllMatches?: () => Promise<void>;
  onRestoreMatches?: () => Promise<void>;
  title?: string;
  // DFB-Stammspieler-Regel: Optional externe Datengrundlage (z.B. Pflichtspiele)
  // Wenn gesetzt, wird die Stammspieler-Berechnung aus diesen Daten gespeist.
  stammspielerMatches?: Match[];
  stammspielerMinutes?: MatchMinuteRecord[];
}

// KW calculation helper
const getKW = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
};

export const MatchPlanningView: React.FC<MatchPlanningViewProps> = ({
  players,
  matches,
  matchMinutes,
  opponents,
  onSaveMatch,
  onDeleteMatch,
  onSaveMinutes,
  onSaveOpponent,
  onDeleteOpponent,
  onWipeAllMatches,
  onRestoreMatches,
  title = "Pflichtspiel-Planung",
  stammspielerMatches,
  stammspielerMinutes
}) => {
  const [selectedMatchId, setSelectedMatchId] = useState<string | number>(matches[0]?.id || '');
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'table'>(title.includes('Test') ? 'table' : 'list');
  const [showOpponentModal, setShowOpponentModal] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  // fussball.de-Import
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Helper component for local state inputs to prevent focus jumping
  const EditableField = ({ 
    value, 
    onSave, 
    type = "text", 
    className = "", 
    isTextArea = false,
    listId = "",
    placeholder = ""
  }: { 
    value: string, 
    onSave: (val: string) => void, 
    type?: string, 
    className?: string,
    isTextArea?: boolean,
    listId?: string,
    placeholder?: string
  }) => {
    const [localValue, setLocalValue] = useState(value);
    
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    if (isTextArea) {
      return (
        <textarea 
          placeholder={placeholder}
          className={className}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            if (localValue !== value) onSave(localValue);
          }}
        />
      );
    }

    return (
      <input 
        type={type}
        list={listId}
        placeholder={placeholder}
        className={className}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onSave(localValue);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            if (localValue !== value) onSave(localValue);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    );
  };

  const [editingOpponent, setEditingOpponent] = useState<Opponent | null>(null);
  const [newOpponentName, setNewOpponentName] = useState('');
  const [showDeleteMatchConfirm, setShowDeleteMatchConfirm] = useState(false);
  const [opponentToDelete, setOpponentToDelete] = useState<Opponent | null>(null);
  const [playerToReset, setPlayerToReset] = useState<Player | null>(null);

  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'TBD';
    if (dateStr.includes('.')) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('de-DE');
  };

  const parseMatchDate = (dateStr?: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateStr;
  };

  const selectedMatch = useMemo(() => 
    matches.find(m => m.id === selectedMatchId),
    [matches, selectedMatchId]
  );

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const dateA = parseMatchDate(a.date);
      const dateB = parseMatchDate(b.date);
      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return (Number(a.index) || 0) - (Number(b.index) || 0);
    });
  }, [matches]);

  // DFB-Stammspieler-Regel:
  // Datengrundlage: Pflichtspiele (wenn uebergeben), sonst eigene Spiele/Minuten.
  const stammspielerMatchList = stammspielerMatches || matches;
  const stammspielerMinuteList = stammspielerMinutes || matchMinutes;

  const stammspielerSortedMatches = useMemo(() => {
    return [...stammspielerMatchList].sort((a, b) => {
      const dateA = parseMatchDate(a.date);
      const dateB = parseMatchDate(b.date);
      if (dateA && dateB && dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      if (dateA && !dateB) return -1;
      if (!dateA && dateB) return 1;
      return (Number(a.index) || 0) - (Number(b.index) || 0);
    });
  }, [stammspielerMatchList]);

  // Nur bisher tatsaechlich gespielte Spiele (haben ein Ergebnis mit ":") zaehlen,
  // damit zukuenftige Termine die Stammspieler-Quote nicht verdünnen.
  const stammspielerPlayedMatches = useMemo(() => {
    return stammspielerSortedMatches.filter(m =>
      typeof m.result === 'string' && m.result.includes(':')
    );
  }, [stammspielerSortedMatches]);

  // Pro Spieler die Spiele zaehlen, in denen er eingesetzt war (Minuten > 0)
  const appearancesByPlayer = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    stammspielerMinuteList.forEach(rec => {
      const allMinutes = { ...(rec.matchMinutes || {}), ...(rec.minutes || {}) };
      const set = map[rec.playerId] || (map[rec.playerId] = new Set<string>());
      Object.entries(allMinutes).forEach(([matchId, mins]) => {
        if (Number(mins) > 0) set.add(String(matchId));
      });
    });
    return map;
  }, [stammspielerMinuteList]);

  const getStammspielerStatus = (playerId: string) => {
    const appearanceSet = appearancesByPlayer[playerId] || new Set<string>();
    const playedGames = stammspielerPlayedMatches.filter(m => appearanceSet.has(String(m.id))).length;
    const totalGames = stammspielerPlayedMatches.length;
    const pct = totalGames > 0 ? (playedGames / totalGames) * 100 : 0;

    // 3 Spiele hintereinander eingesetzt?
    let streak = 0;
    let hasStreak3 = false;
    for (const m of stammspielerPlayedMatches) {
      if (appearanceSet.has(String(m.id))) {
        streak++;
        if (streak >= 3) { hasStreak3 = true; break; }
      } else {
        streak = 0;
      }
    }

    if (pct > 50 || hasStreak3) {
      return { label: 'Stammspieler', cls: 'bg-red-50 text-red-700 border-red-300', pct };
    }
    if (pct >= 40) {
      return { label: 'Grenzbereich', cls: 'bg-amber-50 text-amber-700 border-amber-300', pct };
    }
    return { label: 'Kein Stammspieler', cls: 'bg-emerald-50 text-emerald-700 border-emerald-300', pct };
  };

  const matchStats = useMemo(() => {
    let played = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    const scorerMap: Record<string, number> = {};

    matches.forEach(m => {
      if (m.result && m.result.includes(':')) {
        played++;
        const parts = m.result.split(':').map(s => parseInt(s.trim(), 10));
        if (!isNaN(parts[0]) && !isNaN(parts[1])) {
          const teamGoals = m.isHome ? parts[0] : parts[1];
          const oppGoals = m.isHome ? parts[1] : parts[0];
          goalsFor += teamGoals;
          goalsAgainst += oppGoals;

          if (teamGoals > oppGoals) wins++;
          else if (teamGoals === oppGoals) draws++;
          else losses++;
        }
      }

      if (m.scorers) {
        const tokens = m.scorers.split(/[,;\n]/);
        tokens.forEach(tok => {
          const cleaned = tok.trim();
          if (cleaned) {
            const countMatch = cleaned.match(/(.*?)\((\d+)\)/);
            if (countMatch) {
              const name = countMatch[1].trim();
              const cnt = parseInt(countMatch[2], 10) || 1;
              scorerMap[name] = (scorerMap[name] || 0) + cnt;
            } else {
              scorerMap[cleaned] = (scorerMap[cleaned] || 0) + 1;
            }
          }
        });
      }
    });

    const topScorers = Object.entries(scorerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      total: matches.length,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      diff: goalsFor - goalsAgainst,
      topScorers
    };
  }, [matches]);

  const handleExportICS = (matchToExport?: Match) => {
    const listToExport = matchToExport ? [matchToExport] : sortedMatches;
    if (listToExport.length === 0) return;

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FC Auggen Match Plan//NONSGML v1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${title}`
    ];

    listToExport.forEach(m => {
      const matchDateStr = parseMatchDate(m.date);
      const matchDate = matchDateStr ? new Date(matchDateStr + 'T' + (m.kickOff || '15:00')) : new Date();
      const endDate = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000);
      const formatDateToICS = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      lines.push(
        'BEGIN:VEVENT',
        `UID:match-${m.id}-${Date.now()}@fc-auggen`,
        `DTSTAMP:${formatDateToICS(new Date())}`,
        `DTSTART:${formatDateToICS(matchDate)}`,
        `DTEND:${formatDateToICS(endDate)}`,
        `SUMMARY:[${m.isHome ? 'Heim' : 'Auswärts'}] FC Auggen vs. ${m.opponent}`,
        `LOCATION:${m.location || 'Auggen'}`,
        `DESCRIPTION:Anstoß: ${m.kickOff || 'TBD'} Uhr\\nTreffpunkt: ${m.meetingTime || 'TBD'} Uhr\\nErgebnis: ${m.result || 'Noch nicht gespielt'}\\nTorschützen: ${m.scorers || '-'}\\nNotizen: ${m.notes || '-'}`,
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = matchToExport ? `spiel_${matchToExport.opponent.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics` : `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleMatchChange = (field: keyof Match, value: any) => {
    if (!selectedMatch) return;
    onSaveMatch({ ...selectedMatch, [field]: value });
  };

  const handleAddMatch = async () => {
    const newIndex = matches.length > 0 ? Math.max(...matches.map(m => Number(m.index) || 0)) + 1 : 1;
    const newMatch: Match = {
      id: `match_${Date.now()}`,
      index: newIndex,
      opponent: 'NEUER GEGNER',
      location: 'Auggen',
      isHome: true,
      kickOff: '15:30',
      endTime: '17:15',
      meetingTime: '14:15',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    };
    await onSaveMatch(newMatch);
    setSelectedMatchId(newMatch.id);
  };

  const handleImportFussballDe = async () => {
    const url = importUrl.trim();
    if (!url) return;
    setImportLoading(true);
    setImportError(null);
    setImportMsg(null);
    try {
      const res = await apiFetch('/api/fussball-de/match', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      const d = result.data;
      if (!d || !d.opponent && !d.awayTeam && !d.homeTeam) {
        throw new Error('Keine verwertbaren Spieldaten erhalten.');
      }

      const opponentName = d.opponent
        || (d.isFCAHome ? d.awayTeam : d.homeTeam)
        || 'Unbekannter Gegner';
      const existing = matches.find(m =>
        m.opponent && m.opponent.toLowerCase() === opponentName.toLowerCase()
        && m.date && d.date && String(m.date).slice(0, 10) === String(d.date).slice(0, 10)
      );

      const resultString = d.isFCAHome
        ? `${d.homeGoals ?? 0}:${d.awayGoals ?? 0}`
        : `${d.awayGoals ?? 0}:${d.homeGoals ?? 0}`;
      const ownGoals = Array.isArray(d.goals)
        ? d.goals.filter((g: any) => g.team === 'own')
        : [];
      const oppGoals = Array.isArray(d.goals)
        ? d.goals.filter((g: any) => g.team === 'opponent')
        : [];
      const ownCards = Array.isArray(d.cards)
        ? d.cards.filter((c: any) => c.team === 'own')
        : [];

      const scorersText = ownGoals
        .map((g: any) => g.scorer ? `${g.minute}. Minute – ${g.scorer}` : `Tor in Minute ${g.minute}`)
        .join('\n');
      const cardsText = ownCards
        .map((c: any) => `${c.minute}. Minute – ${c.type} ${c.player}`)
        .join('\n');
      const notesParts: string[] = [];
      if (d.competition) notesParts.push(`Wettbewerb: ${d.competition}`);
      if (Array.isArray(d.starters) && d.starters.length) {
        notesParts.push(`Startelf FCA: ${d.starters.filter((s: any) => s.team === 'own').map((s: any) => s.name).join(', ')}`);
      }
      if (oppGoals.length) {
        notesParts.push(`Gegentore: ${oppGoals.map((g: any) => `${g.minute}.' ${g.scorer || 'Gegner'}`).join(', ')}`);
      }
      if (Array.isArray(d.cards) && d.cards.length && d.cards.length > ownCards.length) {
        const opp = d.cards.filter((c: any) => c.team !== 'own');
        if (opp.length) notesParts.push(`Gegner-Karten: ${opp.map((c: any) => `${c.minute}.' ${c.type} ${c.player}`).join(', ')}`);
      }
      if (d.notes) notesParts.push(d.notes);

      const match: Match = {
        id: existing?.id || `fussball_${result.spielId || Date.now()}`,
        index: existing?.index ?? (matches.length > 0 ? Math.max(...matches.map(m => Number(m.index) || 0)) + 1 : 1),
        opponent: opponentName,
        location: d.venue || (d.isFCAHome ? 'Auggen' : 'Auswärts'),
        isHome: !!d.isFCAHome,
        kickOff: d.time || '',
        meetingTime: existing?.meetingTime || '',
        date: d.date || existing?.date || new Date().toISOString().split('T')[0],
        competition: existing?.competition || d.competition || '',
        result: existing?.result || resultString,
        scorers: scorersText || existing?.scorers || undefined,
        cards: cardsText || existing?.cards || undefined,
        notes: notesParts.length ? notesParts.join('\n') : existing?.notes || '',
        startingLineup: existing?.startingLineup || (Array.isArray(d.starters) ? d.starters.filter((s: any) => s.team === 'own').map((s: any) => s.name) : undefined),
      };

      await onSaveMatch(match);
      setSelectedMatchId(match.id);
      setImportMsg(`${existing ? 'Aktualisiert' : 'Importiert'}: ${opponentName} ${match.date} – ${resultString} (${d.isFCAHome ? 'Heim' : 'Auswärts'})`);
      setImportUrl('');
      setShowImport(false);
    } catch (err: any) {
      setImportError(err.message || 'Import fehlgeschlagen.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!selectedMatchId) return;

    const currentIdx = sortedMatches.findIndex(m => m.id === selectedMatchId);
    await onDeleteMatch(selectedMatchId);
    
    // Select another match
    if (sortedMatches.length > 1) {
      const nextIdx = currentIdx > 0 ? currentIdx - 1 : 1;
      setSelectedMatchId(sortedMatches[nextIdx].id);
    } else {
      setSelectedMatchId('');
    }
    setShowDeleteMatchConfirm(false);
  };

  const handleSaveOpponent = async () => {
    if (!newOpponentName.trim()) return;
    const opponent: Opponent = {
      id: editingOpponent?.id || `opp_${Date.now()}`,
      name: newOpponentName.trim()
    };
    await onSaveOpponent(opponent);
    setEditingOpponent(null);
    setNewOpponentName('');
  };

  const handleMinuteChange = (playerId: string, field: 'start' | 'end' | 'notes', value: string) => {
    if (!selectedMatchId) return;
    
    const record = matchMinutes.find(r => r.playerId === playerId) || {
      playerId,
      minutes: {},
      details: {}
    };

    const currentDetails = record.details || {};

    // Legacy-Daten (matchMinutes) mit einschließen, damit alte Einsatzzeiten
    // beim Speichern nicht verloren gehen und korrekt mitgezählt werden.
    const currentMinutes = { ...(record.matchMinutes || {}), ...(record.minutes || {}) };
    
    const matchDetails = currentDetails[selectedMatchId] || { start: '', end: '', notes: '' };
    const updatedDetails = { ...matchDetails, [field]: value };
    
    // Calculate minutes
    let minutes = 0;
    const start = field === 'start' ? value : updatedDetails.start;
    const end = field === 'end' ? value : updatedDetails.end;
    
    if (start && end) {
      const [startH, startM] = start.split(':').map(Number);
      const [endH, endM] = end.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      if (endTotal > startTotal) {
        minutes = endTotal - startTotal;
      }
    }

    onSaveMinutes({
      ...record,
      details: { ...currentDetails, [selectedMatchId]: updatedDetails },
      minutes: { ...currentMinutes, [selectedMatchId]: minutes }
    });
  };

  const calculateTotalMinutes = (playerId: string) => {
    const record = matchMinutes.find(r => r.playerId === playerId);
    if (!record) return 0;

    // Legacy-Daten (matchMinutes) und neue Daten (minutes) zusammen zählen
    const allMinutes = { ...(record.matchMinutes || {}), ...(record.minutes || {}) };
    return Object.values(allMinutes).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  };

  const handleResetPlayerMinutes = async (playerId: string) => {
    const record = matchMinutes.find(r => r.playerId === playerId);
    if (!record) return;

    await onSaveMinutes({
      ...record,
      minutes: {},
      details: {}
    });
    setPlayerToReset(null);
  };

  return (
    <div className="space-y-5 p-3 sm:p-6 bg-[#F4F4F4] text-[#1A1A1A] min-h-screen rounded-2xl border border-[#DADADA] shadow-sm">
      {/* ----------------- TOP HEADER / CONTROL BAR ----------------- */}
      <div className="bg-white border border-[#DADADA] rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#4C6FFF]/10 text-[#4C6FFF] border border-[#4C6FFF]/20 mb-2 uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5 text-[#4C6FFF]" />
            <span>FC Auggen 1921 e.V. • {title.includes('Test') ? 'Testspiel-Zentrale' : 'Verbandsliga & Pokal'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-[#1A1A1A] flex items-center gap-2.5">
            <span>{title}</span>
          </h1>
          <p className="text-[#4A4A4A] text-xs sm:text-sm font-medium mt-0.5">
            Spieltags-Planung, Spielberichte, Torschützen und Einsatzzeiten im modernen CoCoach-System.
          </p>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#F4F4F4] p-1 rounded-xl border border-[#DADADA]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-[#1A1A1A] text-[#FACC15] shadow-xs' 
                  : 'text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-white'
              }`}
            >
              <LayoutGrid size={14} />
              Übersicht
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'table' 
                  ? 'bg-[#1A1A1A] text-[#FACC15] shadow-xs' 
                  : 'text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-white'
              }`}
            >
              <List size={14} />
              Tabellen-Plan
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'detail' 
                  ? 'bg-[#1A1A1A] text-[#FACC15] shadow-xs' 
                  : 'text-[#4A4A4A] hover:text-[#1A1A1A] hover:bg-white'
              }`}
            >
              <Target size={14} />
              Spiel-Details
            </button>
          </div>

          {/* Action Buttons */}
          <button 
            onClick={handleAddMatch}
            className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#1A1A1A] px-4 py-2 font-black uppercase text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs border border-[#FACC15] cursor-pointer"
          >
            <Plus size={14} className="stroke-[3]" />
            <span>Neues Spiel</span>
          </button>

          <button 
            onClick={() => { setShowImport(v => !v); setImportError(null); setImportMsg(null); }}
            className="bg-[#1A1A1A] hover:bg-[#2A2A2A] text-white px-4 py-2 font-black uppercase text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs border border-[#1A1A1A] cursor-pointer"
          >
            <Globe size={14} className="stroke-[3]" />
            <span>fussball.de-Import</span>
          </button>

          {showImport && (
            <div className="w-full lg:w-[420px] bg-white border border-[#DADADA] rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#4C6FFF] flex items-center gap-1.5">
                  <Globe size={14} className="stroke-[3]" /> Spiel per fussball.de-Link importieren
                </span>
                <button onClick={() => setShowImport(false)} className="text-[#4A4A4A] hover:text-[#1A1A1A] cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <p className="text-[10px] text-[#4A4A4A] mb-2">
                Link zur Spielseite einfügen (Beispiel: fussball.de/spiel/.../spiel/spiel000000ABCD). Ergebnis, Tore, Karten und Startelf werden automatisch übernommen – bestehendes Spiel wird aktualisiert.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleImportFussballDe(); }}
                  placeholder="https://www.fussball.de/spiel/..."
                  className="flex-1 border-2 border-[#DADADA] focus:border-[#4C6FFF] rounded-lg px-3 py-2 text-xs font-bold outline-none"
                />
                <button
                  onClick={() => void handleImportFussballDe()}
                  disabled={importLoading || !importUrl.trim()}
                  className="bg-[#4C6FFF] hover:bg-[#3B5BDB] disabled:opacity-50 text-white px-4 py-2 font-black uppercase text-xs rounded-lg flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  {importLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{importLoading ? 'Importiert...' : 'Importieren'}</span>
                </button>
              </div>
              {importMsg && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] border border-[#4ADE80]/40 rounded-lg px-2.5 py-1.5">
                  <CheckCircle2 size={13} className="stroke-[3]" /> {importMsg}
                </div>
              )}
              {importError && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[#B91C1C] bg-[#FEE2E2] border border-[#FCA5A5]/40 rounded-lg px-2.5 py-1.5">
                  <AlertTriangle size={13} className="stroke-[3]" /> {importError}
                </div>
              )}
            </div>
          )}

          <button 
            onClick={() => setShowOpponentModal(true)}
            className="bg-white hover:bg-[#F4F4F4] text-[#1A1A1A] border border-[#DADADA] px-3.5 py-2 font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Users size={14} />
            <span>Gegner</span>
          </button>

          <button 
            onClick={() => handleExportICS()}
            className="bg-white hover:bg-[#F4F4F4] text-[#1A1A1A] border border-[#DADADA] px-3.5 py-2 font-bold uppercase text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Spieltermine als ICS-Kalenderdatei exportieren"
          >
            <Download size={14} className="text-[#4C6FFF]" />
            <span>.ics Kalender</span>
          </button>

          {onRestoreMatches && (
            <button 
              onClick={onRestoreMatches}
              className="bg-white hover:bg-[#F4F4F4] text-[#1A1A1A] border border-[#DADADA] px-3 py-2 font-bold uppercase text-xs transition-colors flex items-center gap-1.5 rounded-xl shadow-xs cursor-pointer"
              title="Alle 32 Pflichtspiele der Saison 2026/2027 wiederherstellen"
            >
              <RotateCcw size={14} className="text-[#4C6FFF]" />
              <span className="hidden sm:inline">Wiederherstellen</span>
            </button>
          )}

          {onWipeAllMatches && (
            confirmWipe ? (
              <div className="flex gap-1 items-center bg-rose-50 p-1 border border-rose-300 rounded-xl">
                <span className="text-[10px] font-black uppercase text-rose-700 px-1">Sicher?</span>
                <button 
                  onClick={async () => {
                    await onWipeAllMatches();
                    setConfirmWipe(false);
                  }}
                  className="bg-[#FB7185] text-white px-2 py-1 font-black uppercase text-[10px] hover:bg-rose-600 transition-colors flex items-center gap-1 rounded-lg cursor-pointer"
                >
                  <Trash2 size={12} /> Ja, löschen
                </button>
                <button 
                  onClick={() => setConfirmWipe(false)}
                  className="bg-white text-[#4A4A4A] px-2 py-1 font-bold uppercase text-[10px] hover:bg-[#F4F4F4] transition-colors border border-[#DADADA] rounded-lg cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setConfirmWipe(true)}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 font-bold uppercase text-xs hover:bg-rose-100 transition-colors flex items-center gap-1.5 rounded-xl shadow-xs cursor-pointer"
                title="Alle Spiele und Einsatzzeiten komplett zurücksetzen"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Alle löschen</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* ----------------- STATISTIKEN SUMMARY BAR (4 COCOACH CARDS) ----------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Card 1: Bilanz */}
        <div className="bg-white border border-[#DADADA] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider">Spiele &amp; Bilanz</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-0.5">{matchStats.played} / {matchStats.total}</div>
            <div className="text-[11px] font-black text-emerald-700 uppercase mt-0.5">
              {matchStats.wins}S • {matchStats.draws}U • {matchStats.losses}N
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#FACC15]/20 border border-[#FACC15]/40 flex items-center justify-center text-[#1A1A1A]">
            <Trophy className="h-5 w-5 text-[#1A1A1A]" />
          </div>
        </div>

        {/* Card 2: Tore */}
        <div className="bg-white border border-[#DADADA] p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider">Torverhältnis</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-0.5">{matchStats.goalsFor} : {matchStats.goalsAgainst}</div>
            <div className="text-[11px] font-black text-[#4C6FFF] uppercase mt-0.5">
              Diff: {matchStats.diff > 0 ? `+${matchStats.diff}` : matchStats.diff}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#4C6FFF]/10 border border-[#4C6FFF]/20 flex items-center justify-center text-[#4C6FFF]">
            <Target className="h-5 w-5 text-[#4C6FFF]" />
          </div>
        </div>

        {/* Card 3: Top-Torschützen */}
        <div className="bg-white border border-[#DADADA] p-4 rounded-2xl shadow-sm col-span-2 flex items-center justify-between">
          <div className="w-full">
            <div className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-2 flex items-center gap-1.5">
              <Award size={14} className="text-[#FB7185]" />
              <span>Top-Torschützen ({title.includes('Test') ? 'Testspiele' : 'Pflichtspiele'})</span>
            </div>
            {matchStats.topScorers.length > 0 ? (
              <div className="flex flex-wrap gap-2 text-xs">
                {matchStats.topScorers.map(([name, goals]) => (
                  <span key={name} className="bg-[#F4F4F4] border border-[#DADADA] text-[#1A1A1A] px-3 py-1 rounded-xl font-black text-xs uppercase flex items-center gap-1.5 shadow-xs">
                    <span>{name}</span>
                    <span className="bg-[#1A1A1A] text-[#FACC15] px-1.5 py-0.5 rounded-md text-[10px] font-extrabold">{goals} Tore</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-[#4A4A4A]/70 italic">Noch keine Torschützen eingetragen</span>
            )}
          </div>
        </div>
      </div>

      {/* ----------------- MAIN CONTENT ACCORDING TO VIEW MODE ----------------- */}
      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Next Match Highlight Card (Sporty High-Impact CoCoach Box) */}
            {(() => {
              const now = new Date().toISOString().split('T')[0];
              const upcoming = sortedMatches.filter(m => {
                if (!m.date) return false;
                const dateISO = m.date.includes('.') ? m.date.split('.').reverse().join('-') : m.date;
                return dateISO >= now;
              }).sort((a,b) => {
                const rawA = a.date || '';
                const rawB = b.date || '';
                const dateA = rawA.includes('.') ? rawA.split('.').reverse().join('-') : rawA;
                const dateB = rawB.includes('.') ? rawB.split('.').reverse().join('-') : rawB;
                return dateA.localeCompare(dateB);
              });
              const nextMatch = upcoming[0];
              
              if (!nextMatch) return null;
              
              return (
                <div className="bg-white border-2 border-[#1A1A1A] p-6 rounded-2xl shadow-sm text-[#1A1A1A] relative overflow-hidden group">
                  <div className="absolute -right-8 -bottom-8 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700 text-[#1A1A1A] pointer-events-none">
                    <Trophy size={180} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-[#FACC15] text-[#1A1A1A] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#1A1A1A] animate-pulse" />
                        Nächstes Spiel
                      </span>
                      <span className="bg-[#F4F4F4] text-[#4A4A4A] border border-[#DADADA] px-2.5 py-1 rounded-full text-[10px] font-black uppercase">
                        {title.includes('Test') ? 'Testspiel' : 'Pflichtspiel (Verbandsliga)'}
                      </span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div>
                        <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight italic text-[#1A1A1A] mb-3">
                          {nextMatch.opponent}
                        </h3>
                        <div className="flex flex-wrap gap-2.5 text-xs font-black uppercase">
                          <span className="flex items-center gap-1.5 bg-[#F4F4F4] border border-[#DADADA] px-3 py-1.5 rounded-xl text-[#1A1A1A]">
                            <Calendar size={14} className="text-[#4C6FFF]" /> {formatDate(nextMatch.date)}
                          </span>
                          <span className="flex items-center gap-1.5 bg-[#F4F4F4] border border-[#DADADA] px-3 py-1.5 rounded-xl text-[#1A1A1A]">
                            <Clock size={14} className="text-[#4C6FFF]" /> {nextMatch.kickOff || '--:--'} Uhr
                          </span>
                          <span className="flex items-center gap-1.5 bg-[#F4F4F4] border border-[#DADADA] px-3 py-1.5 rounded-xl text-[#1A1A1A]">
                            <MapPin size={14} className="text-[#4C6FFF]" /> {nextMatch.location || (nextMatch.isHome ? 'Lettenpark Auggen' : 'Auswärts')}
                          </span>
                          <span className="bg-[#1A1A1A] text-white px-3 py-1.5 rounded-xl text-xs font-black">
                            {nextMatch.isHome ? 'HEIM' : 'AUSWÄRTS'}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setSelectedMatchId(nextMatch.id);
                          setViewMode('detail');
                        }}
                        className="bg-[#1A1A1A] hover:bg-black text-[#FACC15] px-6 py-3 font-black uppercase text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer shrink-0"
                      >
                        <span>Details &amp; Einsatzzeiten</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* All Matches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedMatches.map((match) => (
                <motion.div
                  key={match.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white border border-[#DADADA] rounded-2xl shadow-sm hover:border-[#1A1A1A] hover:shadow-md transition-all cursor-pointer flex flex-col group overflow-hidden"
                  onClick={() => {
                    setSelectedMatchId(match.id);
                    setViewMode('detail');
                  }}
                >
                  <div className="p-4 bg-[#F4F4F4] text-[#1A1A1A] flex justify-between items-start border-b border-[#DADADA]">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-[#4C6FFF] mb-0.5">
                        {title.includes('Test') ? 'TESTSPIEL' : 'PFLICHTSPIEL'} • #{match.index}
                      </div>
                      <div className="text-base font-black uppercase truncate max-w-[200px] text-[#1A1A1A]">
                        {match.opponent}
                      </div>
                    </div>
                    <div className="bg-white text-[#1A1A1A] border border-[#DADADA] px-2.5 py-1 rounded-lg font-black text-xs uppercase shadow-xs">
                      {match.isHome ? 'HEIM' : 'AW'}
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1 grid grid-cols-2 gap-3 bg-white">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-[#4C6FFF]" />
                      <span className="text-xs font-bold uppercase text-[#1A1A1A]">
                        {formatDate(match.date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-[#4C6FFF]" />
                      <span className="text-xs font-bold uppercase text-[#1A1A1A]">{match.kickOff || '--:--'} Uhr</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <MapPin size={14} className="text-[#4C6FFF]" />
                      <span className="text-xs font-medium uppercase truncate text-[#4A4A4A]">{match.location || 'Lettenpark Auggen'}</span>
                    </div>

                    {match.result && (
                      <div className="col-span-2 bg-[#F4F4F4] p-2.5 rounded-xl border border-[#DADADA] flex justify-between items-center text-xs font-black">
                        <span className="text-[#4A4A4A] text-[10px] uppercase">Ergebnis:</span>
                        <span className="bg-[#1A1A1A] text-[#FACC15] px-2.5 py-0.5 rounded-md text-xs font-black">{match.result}</span>
                      </div>
                    )}

                    {match.scorers && (
                      <div className="col-span-2 text-xs bg-[#F4F4F4] p-2.5 rounded-xl border border-[#DADADA] text-[#1A1A1A]">
                        <span className="font-black text-[#FB7185] uppercase block mb-0.5 text-[10px]">⚽ Torschützen:</span>
                        <span className="font-bold text-[#1A1A1A]">{match.scorers}</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 flex justify-between items-center text-[10px] font-black uppercase border-t border-[#DADADA] bg-[#F9FAFB]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportICS(match);
                      }}
                      className="text-[#4C6FFF] hover:underline flex items-center gap-1 cursor-pointer"
                      title="Termin im Kalender speichern"
                    >
                      <Download size={12} /> .ics Kalender
                    </button>
                    <div className="group-hover:text-[#1A1A1A] transition-colors flex items-center gap-1 text-[#4A4A4A] font-black">
                      Details <ExternalLink size={12} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : viewMode === 'table' ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white border border-[#DADADA] rounded-2xl shadow-sm overflow-hidden text-[#1A1A1A]"
          >
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full border-collapse text-left shrink-0">
                <thead>
                  <tr className="bg-[#F4F4F4] text-[#1A1A1A] text-[10px] font-black uppercase tracking-widest border-b border-[#DADADA]">
                    <th className="p-3 border-r border-[#DADADA] w-12 text-center text-[#4A4A4A]">ID</th>
                    <th className="p-3 border-r border-[#DADADA] w-12 text-center text-[#4A4A4A]">KW</th>
                    <th className="p-3 border-r border-[#DADADA] w-32 font-black">Datum</th>
                    <th className="p-3 border-r border-[#DADADA] w-20 font-black">Anstoß</th>
                    <th className="p-3 border-r border-[#DADADA] w-20 text-center font-black">H/A</th>
                    <th className="p-3 border-r border-[#DADADA] min-w-[180px] font-black">Gegner</th>
                    <th className="p-3 border-r border-[#DADADA] min-w-[130px] font-black">Ort</th>
                    <th className="p-3 border-r border-[#DADADA] w-24 text-center font-black text-[#FB7185]">Ergebnis</th>
                    <th className="p-3 border-r border-[#DADADA] min-w-[160px] font-black">Torschützen</th>
                    <th className="p-3 border-r border-[#DADADA] w-20 text-center font-black">Treff</th>
                    <th className="p-3 border-r border-[#DADADA] w-20 text-center font-black">Ende</th>
                    <th className="p-3 border-r border-[#DADADA] min-w-[180px] font-black">Notizen</th>
                    <th className="p-3 border-r border-[#DADADA] w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DADADA]">
                  {sortedMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#DADADA] text-[#1A1A1A]">
                      <td className="p-3 border-r border-[#DADADA] font-black text-center text-[#1A1A1A]">{match.index}</td>
                      <td className="p-3 border-r border-[#DADADA] font-black text-center text-[10px] text-[#4A4A4A]">{getKW(match.date || '')}</td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          type="date"
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-bold text-xs text-[#1A1A1A]"
                          value={match.date || ''}
                          onSave={(val) => onSaveMatch({ ...match, date: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          type="time"
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-black text-xs text-[#1A1A1A]"
                          value={match.kickOff || ''}
                          onSave={(val) => onSaveMatch({ ...match, kickOff: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA] text-center">
                        <select 
                          className="bg-[#F4F4F4] text-[#1A1A1A] border border-[#DADADA] rounded px-2 py-1 font-black uppercase text-[10px] focus:outline-none cursor-pointer"
                          value={match.isHome ? 'H' : 'A'}
                          onChange={(e) => onSaveMatch({ ...match, isHome: e.target.value === 'H' })}
                        >
                          <option value="H">Heim</option>
                          <option value="A">AW</option>
                        </select>
                      </td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          listId="opponents-list-table"
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-black uppercase text-xs text-[#1A1A1A]"
                          value={match.opponent || ''}
                          onSave={(val) => onSaveMatch({ ...match, opponent: val })}
                        />
                        <datalist id="opponents-list-table">
                          {opponents.map(opp => <option key={opp.id} value={opp.name} />)}
                        </datalist>
                      </td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-bold text-xs uppercase text-[#4A4A4A]"
                          value={match.location || ''}
                          onSave={(val) => onSaveMatch({ ...match, location: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA] text-center">
                        <EditableField 
                          placeholder="z.B. 3:1"
                          className="w-full bg-[#FB7185]/10 border border-[#FB7185]/30 focus:bg-white focus:border-[#FB7185] rounded px-2 py-1 focus:outline-none font-black text-xs text-[#FB7185] text-center uppercase"
                          value={match.result || ''}
                          onSave={(val) => onSaveMatch({ ...match, result: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          placeholder="Torschützen..."
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-bold text-xs text-[#1A1A1A] placeholder:text-[#4A4A4A]/50"
                          value={match.scorers || ''}
                          onSave={(val) => onSaveMatch({ ...match, scorers: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA] text-center">
                        <EditableField 
                          type="time"
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-bold text-xs text-[#4A4A4A]"
                          value={match.meetingTime || ''}
                          onSave={(val) => onSaveMatch({ ...match, meetingTime: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA] text-center">
                        <EditableField 
                          type="time"
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none font-bold text-xs text-[#4A4A4A]"
                          value={match.endTime || ''}
                          onSave={(val) => onSaveMatch({ ...match, endTime: val })}
                        />
                      </td>
                      <td className="p-3 border-r border-[#DADADA]">
                        <EditableField 
                          className="w-full bg-[#F4F4F4] focus:bg-white border border-[#DADADA] focus:border-[#4C6FFF] rounded px-2 py-1 focus:outline-none italic text-[#4A4A4A] text-xs"
                          value={match.notes || ''}
                          onSave={(val) => onSaveMatch({ ...match, notes: val })}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => {
                            setSelectedMatchId(match.id);
                            setShowDeleteMatchConfirm(true);
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Spiel löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedMatches.length === 0 && (
                    <tr>
                      <td colSpan={13} className="p-12 text-center italic text-[#4A4A4A]">Keine Spiele angelegt</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-[#F4F4F4] text-center border-t border-[#DADADA]">
              <button 
                onClick={handleAddMatch}
                className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#1A1A1A] px-8 py-2.5 font-black uppercase text-xs rounded-xl transition-all shadow-xs border border-[#FACC15] cursor-pointer"
              >
                + Weiteres Spiel hinzufügen
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {selectedMatch ? (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left Card: Spiel-Details Mask */}
                <div className="xl:col-span-1 space-y-5">
                  <div className="bg-white border border-[#DADADA] shadow-sm rounded-2xl p-5 text-[#1A1A1A]">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#DADADA]">
                      <h3 className="text-lg font-black uppercase flex items-center gap-2 text-[#1A1A1A]">
                        <Calendar className="h-5 w-5 text-[#4C6FFF]" />
                        <span>Spiel-Details</span>
                      </h3>
                      <div className="flex gap-2 items-center">
                        <button 
                          onClick={() => handleExportICS(selectedMatch)}
                          className="text-[10px] font-black uppercase text-[#4C6FFF] hover:underline flex items-center gap-1 cursor-pointer"
                          title="Diesen Spieltermin als ICS-Kalenderdatei herunterladen"
                        >
                          <Download size={12} /> .ics
                        </button>
                        <button 
                          onClick={() => setShowDeleteMatchConfirm(true)}
                          className="text-[10px] font-black uppercase text-rose-600 hover:underline cursor-pointer"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      <div>
                        <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 block">GEGNER</label>
                        <div className="relative group">
                          <EditableField 
                            listId="opponents-list-planning"
                            className="w-full border border-[#DADADA] p-2.5 font-black bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] focus:outline-none uppercase rounded-xl text-xs" 
                            value={selectedMatch.opponent} 
                            onSave={(val) => handleMatchChange('opponent', val)}
                          />
                          <datalist id="opponents-list-planning">
                            {opponents.map((opp) => (
                              <option key={opp.id} value={opp.name} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase flex items-center gap-1 text-[#FB7185] tracking-wider mb-1">
                            <Trophy className="h-3 w-3 text-[#FB7185]" /> ERGEBNIS / ENDSTAND
                          </label>
                          <EditableField 
                            placeholder="z.B. 3:1"
                            className="w-full border border-[#FB7185]/30 p-2.5 font-black text-sm bg-[#FB7185]/10 text-[#FB7185] focus:bg-white focus:border-[#FB7185] rounded-xl text-center focus:outline-none"
                            value={selectedMatch.result || ''} 
                            onSave={(val) => handleMatchChange('result', val)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 block">HEIM / AUSWÄRTS</label>
                          <select 
                            className="w-full border border-[#DADADA] p-2.5 font-black bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] rounded-xl text-xs cursor-pointer focus:outline-none"
                            value={selectedMatch.isHome ? 'Heim' : 'Auswärts'}
                            onChange={(e) => handleMatchChange('isHome', e.target.value === 'Heim')}
                          >
                            <option value="Heim">Heim</option>
                            <option value="Auswärts">Auswärts</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 block">
                          ⚽ TORSCHÜTZEN (NAME, MIN / ANZAHL)
                        </label>
                        <EditableField 
                          placeholder="z.B. J. Ehret (2), D. Valchuk (45')"
                          className="w-full border border-[#DADADA] p-2.5 font-bold bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white placeholder-[#4A4A4A]/50 focus:border-[#4C6FFF] rounded-xl text-xs focus:outline-none"
                          value={selectedMatch.scorers || ''} 
                          onSave={(val) => handleMatchChange('scorers', val)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 block">DATUM</label>
                          <EditableField 
                            type="date" 
                            className="w-full border border-[#DADADA] p-2.5 font-bold bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] rounded-xl text-xs focus:outline-none"
                            value={selectedMatch.date || ''} 
                            onSave={(val) => handleMatchChange('date', val)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-[#4C6FFF]" /> ORT
                          </label>
                          <EditableField 
                            className="w-full border border-[#DADADA] p-2.5 font-bold bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] rounded-xl text-xs focus:outline-none uppercase"
                            value={selectedMatch.location || ''} 
                            onSave={(val) => handleMatchChange('location', val)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-[#4C6FFF]" /> ANSTOß
                          </label>
                          <EditableField 
                            type="time" 
                            className="w-full border border-[#DADADA] p-2.5 font-bold bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] rounded-xl text-xs focus:outline-none"
                            value={selectedMatch.kickOff || ''} 
                            onSave={(val) => handleMatchChange('kickOff', val)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 flex items-center gap-1">
                            <Timer className="h-3 w-3 text-[#4C6FFF]" /> SPIELENDE
                          </label>
                          <EditableField 
                            type="time" 
                            className="w-full border border-[#DADADA] p-2.5 font-bold bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white focus:border-[#4C6FFF] rounded-xl text-xs focus:outline-none"
                            value={selectedMatch.endTime || ''} 
                            onSave={(val) => handleMatchChange('endTime', val)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider mb-1 block">NOTIZEN / MATCHPLAN</label>
                        <EditableField 
                          isTextArea
                          className="w-full border border-[#DADADA] p-2.5 font-medium bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white placeholder-[#4A4A4A]/50 focus:border-[#4C6FFF] rounded-xl min-h-[90px] text-xs focus:outline-none"
                          value={selectedMatch.notes || ''}
                          onSave={(val) => handleMatchChange('notes', val)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Spieler-Einsatzzeiten Matrix */}
                <div className="xl:col-span-2">
                  <div className="bg-white border border-[#DADADA] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-[#DADADA] flex items-center justify-between bg-[#F4F4F4]">
                      <h3 className="text-base font-black uppercase text-[#1A1A1A] flex items-center gap-2">
                        <Users className="text-[#4C6FFF] h-4 w-4" />
                        <span>SPIELER-EINSATZZEITEN</span>
                      </h3>
                      <div className="text-[11px] font-black uppercase text-[#4A4A4A] bg-white border border-[#DADADA] px-2.5 py-1 rounded-lg">
                        Minuten werden automatisch berechnet
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[#F4F4F4] text-[#1A1A1A] uppercase text-[10px] font-black tracking-widest border-b border-[#DADADA]">
                            <th className="p-3 border-r border-[#DADADA]">SPIELER</th>
                            <th className="p-3 border-r border-[#DADADA] text-center">GESAMT</th>
                            <th className="p-3 border-r border-[#DADADA] text-center">START</th>
                            <th className="p-3 border-r border-[#DADADA] text-center">ENDE</th>
                            <th className="p-3 border-r border-[#DADADA] text-center text-[#1A1A1A]">MIN</th>
                            <th className="p-3 border-r border-[#DADADA] text-center">STAMMSPIELER-STATUS</th>
                            <th className="p-3">NOTIZEN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DADADA]">
                          {players.filter(isPlayer).map(player => {
                            const record = matchMinutes.find(r => r.playerId === player.id);
                            const details = record?.details?.[selectedMatchId] || { start: '', end: '', notes: '' };
                            const minutes = record?.minutes?.[selectedMatchId] || record?.matchMinutes?.[selectedMatchId] || 0;
                            const totalMinutes = calculateTotalMinutes(player.id);

                            return (
                              <tr key={player.id} className="hover:bg-[#F9FAFB] transition-colors text-[#1A1A1A] bg-white">
                                <td className="p-3 border-r border-[#DADADA] font-black uppercase text-xs text-[#1A1A1A]">
                                  {player.lastName} {player.firstName ? `(${player.firstName.charAt(0)}.)` : ''}
                                </td>
                                <td className="p-3 border-r border-[#DADADA] text-center text-xs font-black text-[#1A1A1A]">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className="bg-[#F4F4F4] border border-[#DADADA] px-2 py-0.5 rounded font-black text-xs text-[#1A1A1A]">
                                      {totalMinutes} MIN
                                    </span>
                                    {totalMinutes > 0 && (
                                      <button 
                                        onClick={() => setPlayerToReset(player)}
                                        className="text-rose-500 hover:text-rose-700 transition-colors p-1 cursor-pointer"
                                        title="Alle Zeiten für diesen Spieler zurücksetzen"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2.5 border-r border-[#DADADA] text-center">
                                  <EditableField 
                                    type="time" 
                                    className="border border-[#DADADA] bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white p-1 font-bold text-xs w-24 rounded-lg text-center focus:border-[#4C6FFF] focus:outline-none" 
                                    value={details.start}
                                    onSave={(val) => handleMinuteChange(player.id, 'start', val)}
                                  />
                                </td>
                                <td className="p-2.5 border-r border-[#DADADA] text-center">
                                  <EditableField 
                                    type="time" 
                                    className="border border-[#DADADA] bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white p-1 font-bold text-xs w-24 rounded-lg text-center focus:border-[#4C6FFF] focus:outline-none" 
                                    value={details.end}
                                    onSave={(val) => handleMinuteChange(player.id, 'end', val)}
                                  />
                                </td>
                                <td className="p-3 border-r border-[#DADADA] text-center font-black text-sm">
                                  <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${minutes > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-300' : 'text-[#4A4A4A]'}`}>
                                    {minutes}
                                  </span>
                                </td>
                                <td className="p-3 border-r border-[#DADADA] text-center">
                                  {(() => {
                                    const status = getStammspielerStatus(player.id);
                                    return (
                                      <span title={`${status.label} · ${status.pct.toFixed(1)}% Einsätze`} className={`px-2.5 py-1 rounded-lg font-black text-[10px] uppercase inline-flex items-center border ${status.cls}`}>
                                        {status.pct.toFixed(0)}% {status.label}
                                      </span>
                                    );
                                  })()}
                                </td>
                                <td className="p-2.5">
                                  <EditableField 
                                    className="w-full border border-[#DADADA] bg-[#F4F4F4] text-[#1A1A1A] focus:bg-white p-1.5 font-medium text-xs rounded-lg focus:border-[#4C6FFF] focus:outline-none placeholder:text-[#4A4A4A]/50" 
                                    placeholder="Notizen zum Einsatz..."
                                    value={details.notes}
                                    onSave={(val) => handleMinuteChange(player.id, 'notes', val)}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-[#DADADA] p-12 text-center rounded-2xl shadow-sm">
                <Calendar className="h-14 w-14 mx-auto mb-3 text-[#4A4A4A]/40" />
                <h3 className="text-lg font-black uppercase text-[#1A1A1A]">Kein Spiel ausgewählt</h3>
                <p className="text-xs font-bold text-[#4A4A4A] mt-1">Bitte wähle ein Spiel aus der Übersicht oder erstelle ein neues.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- OPPONENT MANAGEMENT MODAL ----------------- */}
      <AnimatePresence>
        {showOpponentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DADADA] shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden text-[#1A1A1A]"
            >
              <div className="bg-[#F4F4F4] text-[#1A1A1A] p-4 flex justify-between items-center border-b border-[#DADADA]">
                <h3 className="font-black uppercase tracking-wider flex items-center gap-2 text-sm">
                  <Users size={16} className="text-[#4C6FFF]" /> Gegner-Verwaltung
                </h3>
                <button onClick={() => setShowOpponentModal(false)} className="text-[#4A4A4A] hover:text-[#1A1A1A] transition-colors cursor-pointer">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text"
                    className="flex-1 bg-[#F4F4F4] border border-[#DADADA] rounded-xl p-2.5 font-bold uppercase text-[#1A1A1A] text-xs focus:border-[#4C6FFF] focus:bg-white focus:outline-none"
                    placeholder="Gegner Name..."
                    value={newOpponentName}
                    onChange={(e) => setNewOpponentName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveOpponent()}
                  />
                  <button 
                    onClick={handleSaveOpponent}
                    className="bg-[#FACC15] hover:bg-[#FACC15]/90 text-[#1A1A1A] px-5 py-2.5 font-black uppercase text-xs rounded-xl transition-colors shadow-xs border border-[#FACC15] cursor-pointer"
                  >
                    {editingOpponent ? 'Speichern' : 'Hinzufügen'}
                  </button>
                  {editingOpponent && (
                    <button 
                      onClick={() => {
                        setEditingOpponent(null);
                        setNewOpponentName('');
                      }}
                      className="bg-[#F4F4F4] text-[#1A1A1A] px-4 py-2.5 font-bold uppercase text-xs hover:bg-[#DADADA] transition-colors border border-[#DADADA] rounded-xl cursor-pointer"
                    >
                      Abbrechen
                    </button>
                  )}
                </div>

                <div className="max-h-[350px] overflow-y-auto border border-[#DADADA] rounded-xl overflow-hidden bg-white custom-scrollbar">
                  <table className="w-full border-collapse text-xs">
                    <thead className="bg-[#F4F4F4] sticky top-0 border-b border-[#DADADA] text-[#1A1A1A]">
                      <tr>
                        <th className="p-3 text-left text-[10px] font-black uppercase tracking-widest">Gegner Name</th>
                        <th className="p-3 text-right text-[10px] font-black uppercase tracking-widest">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DADADA]">
                      {opponents.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="p-8 text-center text-xs font-bold text-[#4A4A4A] italic">
                            Keine Gegner hinterlegt.
                          </td>
                        </tr>
                      ) : (
                        opponents.map(opp => (
                          <tr key={opp.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="p-3 font-bold uppercase text-xs text-[#1A1A1A]">{opp.name}</td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button 
                                  onClick={() => {
                                    setEditingOpponent(opp);
                                    setNewOpponentName(opp.name);
                                  }}
                                  className="p-1 text-[#4C6FFF] hover:underline transition-colors cursor-pointer"
                                  title="Bearbeiten"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button 
                                  onClick={() => setOpponentToDelete(opp)}
                                  className="p-1 text-rose-600 hover:underline transition-colors cursor-pointer"
                                  title="Löschen"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- DELETE MATCH CONFIRM MODAL ----------------- */}
      <AnimatePresence>
        {showDeleteMatchConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DADADA] shadow-2xl rounded-2xl w-full max-w-md p-6 text-[#1A1A1A]"
            >
              <h3 className="text-xl font-black uppercase mb-2 text-[#1A1A1A]">Spiel löschen?</h3>
              <p className="font-bold text-xs text-[#4A4A4A] mb-6">Möchtest du dieses Spiel wirklich unwiderruflich aus dem Spielplan entfernen?</p>
              <div className="flex gap-3">
                <button 
                  onClick={handleDeleteMatch}
                  className="flex-1 bg-[#FB7185] hover:bg-rose-600 text-white py-2.5 font-black uppercase text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Ja, löschen
                </button>
                <button 
                  onClick={() => setShowDeleteMatchConfirm(false)}
                  className="flex-1 bg-[#F4F4F4] hover:bg-[#DADADA] text-[#1A1A1A] py-2.5 font-bold uppercase text-xs rounded-xl transition-colors border border-[#DADADA] cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- DELETE OPPONENT CONFIRM MODAL ----------------- */}
      <AnimatePresence>
        {opponentToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DADADA] shadow-2xl rounded-2xl w-full max-w-md p-6 text-[#1A1A1A]"
            >
              <h3 className="text-xl font-black uppercase mb-2 text-[#1A1A1A]">Gegner löschen?</h3>
              <p className="font-bold text-xs text-[#4A4A4A] mb-6">Möchtest du den Gegner "{opponentToDelete.name}" wirklich löschen?</p>
              <div className="flex gap-3">
                <button 
                  onClick={async () => {
                    await onDeleteOpponent(opponentToDelete.id);
                    setOpponentToDelete(null);
                  }}
                  className="flex-1 bg-[#FB7185] hover:bg-rose-600 text-white py-2.5 font-black uppercase text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Ja, löschen
                </button>
                <button 
                  onClick={() => setOpponentToDelete(null)}
                  className="flex-1 bg-[#F4F4F4] hover:bg-[#DADADA] text-[#1A1A1A] py-2.5 font-bold uppercase text-xs rounded-xl transition-colors border border-[#DADADA] cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ----------------- RESET PLAYER MINUTES CONFIRM MODAL ----------------- */}
      <AnimatePresence>
        {playerToReset && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-[#DADADA] shadow-2xl rounded-2xl w-full max-w-md p-6 text-[#1A1A1A]"
            >
              <h3 className="text-xl font-black uppercase mb-2 text-[#1A1A1A]">Zeiten zurücksetzen?</h3>
              <p className="font-bold text-xs text-[#4A4A4A] mb-6">
                Möchtest du wirklich alle Einsatzzeiten für <span className="text-[#1A1A1A] font-black">{playerToReset.lastName}</span> über alle Spiele hinweg auf 0 setzen?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleResetPlayerMinutes(playerToReset.id)}
                  className="flex-1 bg-[#FB7185] hover:bg-rose-600 text-white py-2.5 font-black uppercase text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  Ja, zurücksetzen
                </button>
                <button 
                  onClick={() => setPlayerToReset(null)}
                  className="flex-1 bg-[#F4F4F4] hover:bg-[#DADADA] text-[#1A1A1A] py-2.5 font-bold uppercase text-xs rounded-xl transition-colors border border-[#DADADA] cursor-pointer"
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchPlanningView;
