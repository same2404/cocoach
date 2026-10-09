import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  User, Plus, Calendar, Search, ChevronDown, ChevronUp, ListChecks, Filter,
  Clock, Activity, Shield, Ban, Stethoscope, FolderOpen, Save, X, Pencil, Trash2
} from 'lucide-react';
import { Spieler, AttendanceRecord } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { useCollectionSync } from '../../hooks/useCollectionSync';
import { useLiteCollectionSync } from '../../hooks/useLiteCollectionSync';

interface AttendanceMonthsViewProps {
  players: Spieler[];
  attendance: AttendanceRecord[];
  onUpdateAttendance: (playerId: string, sessionNum: number, status: string) => void;
  isEditing: boolean;
}

interface UnitMeta {
  id: string;
  sessionNum: number;
  date?: string;
  time?: string;
  duration?: string;
  trainer?: string;
  loadLevel?: string;
  focus?: string;
}

const ATTENDANCE_OPTIONS: { key: string; label: string; color: string }[] = [
  { key: 'x', label: 'Anwesend', color: 'text-black bg-white border border-slate-300' },
  { key: 'Lg', label: 'Legend (★)', color: 'text-[#D97706] bg-white border border-slate-300' },
  { key: 'e', label: 'Entschuldigt', color: 'text-[#2563EB] bg-white border border-slate-300' },
  { key: 'u', label: 'Unentschuldigt', color: 'text-[#DC2626] bg-white border border-slate-300' },
  { key: 'k', label: 'Krank', color: 'text-[#CA8A04] bg-white border border-slate-300' },
  { key: 'P', label: 'Privat', color: 'text-[#9333EA] bg-white border border-slate-300' },
  { key: 'L', label: 'Lehrgang', color: 'text-[#0D9488] bg-white border border-slate-300' },
  { key: 'v', label: 'Verletzt', color: 'text-[#E11D48] bg-white border border-slate-300' },
  { key: '', label: 'Leeren', color: 'text-[#94A3B8] bg-[#1A1A1A]' },
];

// Saison-Monatsordnung: Juli → Dezember, danach März → Juni
const SEASON_MONTHS = [
  { num: 7, label: 'Juli' },
  { num: 8, label: 'August' },
  { num: 9, label: 'September' },
  { num: 10, label: 'Oktober' },
  { num: 11, label: 'November' },
  { num: 12, label: 'Dezember' },
  { num: 3, label: 'März' },
  { num: 4, label: 'April' },
  { num: 5, label: 'Mai' },
  { num: 6, label: 'Juni' },
];

const LOAD_LEVELS = ['Niedrig', 'Mittel', 'Hoch', 'Sehr Hoch'];

const toIsoPart = (d: string) => {
  if (!d) return '';
  if (d.includes('T')) return d.slice(0, 10);
  if (d.includes('.')) {
    const parts = d.split('.');
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    return d;
  }
  return d.slice(0, 10);
};

const formatDateDe = (d: string): string => {
  if (!d) return '';
  const iso = toIsoPart(d);
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length !== 3) return iso;
  return `${p[2]}.${p[1]}.${p[0]}`;
};

const getStatusColor = (status: string) => {
  const opt = ATTENDANCE_OPTIONS.find(o => o.key === status);
  return opt ? opt.color : 'text-gray-300 bg-transparent';
};

const getStatusLabel = (status: string) => {
  const opt = ATTENDANCE_OPTIONS.find(o => o.key === status);
  return opt ? opt.label : 'Unbekannt';
};

// Löschen-Button mit Inline-Bestätigung (kein window.confirm – iframe-Sandbox).
const DeleteUnitButton: React.FC<{ isEditing: boolean; onDelete: () => void; label: string }> = ({ isEditing, onDelete, label }) => {
  const [confirming, setConfirming] = useState(false);
  if (!isEditing) return null;
  return confirming ? (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={() => { onDelete(); setConfirming(false); }}
        className="px-2 py-1 rounded-md bg-[#DC2626] text-white font-black text-[9px] uppercase transition-all"
      >
        Sicher?
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-2 py-1 rounded-md bg-[#1E293B] text-[#94A3B8] text-[9px] uppercase transition-all"
      >
        <X size={11} />
      </button>
    </span>
  ) : (
    <button
      onClick={() => setConfirming(true)}
      title={`${label} löschen`}
      className="px-2 py-1 rounded-md bg-[#DC2626]/10 hover:bg-[#DC2626]/25 text-[#F87171] transition-all border border-[#DC2626]/30"
    >
      <Trash2 size={12} />
    </button>
  );
};

export const AttendanceMonthsView: React.FC<AttendanceMonthsViewProps> = ({
  players,
  attendance,
  onUpdateAttendance,
  isEditing,
}) => {
  // Einheiten-Register (Session-Nummer → Datum/Thema/Trainer/Belastung)
  const { data: unitMetaList, loading: loadingUnitMeta, addOrUpdateItem: saveUnitMeta, removeItem: removeUnitMeta } = useCollectionSync<any>('attendance_unit_meta', 'id', undefined, 'asc', true);

  // Monats-Register: manuell gepflegte Werte der Monatsübersicht (Optional –
  // wenn vorhanden, überschreiben sie die automatisch berechneten Werte).
  const { data: monthMetaList, addOrUpdateItem: saveMonthMeta } = useCollectionSync<any>('attendance_month_meta', 'id', undefined, 'asc', true);

  // Spieler-Monats-Register: manuelle Werte je Spieler+Monat (Unterliste).
  const { data: playerMonthMetaList, addOrUpdateItem: savePlayerMonthMeta } = useCollectionSync<any>('attendance_player_month_meta', 'id', undefined, 'asc', true);

  // Map: `${playerId}_${monthNum}` → manuelle Werte (Overrides)
  const playerMonthMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    (playerMonthMetaList || []).forEach((d: any) => {
      const key = `${d.playerId}_${d.monthNum}`;
      if (d.playerId && d.monthNum !== undefined) map.set(key, d);
    });
    return map;
  }, [playerMonthMetaList]);

  // Trainingsplan-Einheiten (echtes Datum + Thema/Schwerpunkt). Leichtgewichtig:
  // useLiteCollectionSync entfernt große Base64-Bilder automatisch → kein Hänger.
  const { data: trainingSessionsRaw } = useLiteCollectionSync<any>('training_sessions', 'id', 'date', 'asc', true, true);

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editMonthNum, setEditMonthNum] = useState<number | null>(null);

  // Bearbeiten-Modal für eine einzelne Einheit (inkl. änderbarer EH-Nummer)
  const [editUnitTarget, setEditUnitTarget] = useState<UnitMeta | null>(null);
  const [editUnitForm, setEditUnitForm] = useState({ sessionNum: '', date: '', time: '', duration: '', trainer: '', loadLevel: 'Mittel', focus: '' });

  // Filter für Unterliste
  const [filterDate, setFilterDate] = useState('');
  const [filterFocus, setFilterFocus] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Neue Einheit Formular
  const [newUnit, setNewUnit] = useState({ date: '', time: '', duration: '', trainer: '', loadLevel: 'Mittel', focus: '' });

  const squadPlayers = useMemo(() => {
    return sortPlayers(players.filter(p => {
      const cat = (p.category || 'player').toLowerCase();
      return cat === 'player' || cat === 'spieler';
    }));
  }, [players]);

  const unitMap = useMemo(() => {
    const map = new Map<number, UnitMeta>();
    (unitMetaList || []).forEach((u: any) => {
      const num = Number(u.sessionNum || u.id);
      if (!isNaN(num) && num > 0) {
        map.set(num, { id: u.id, sessionNum: num, date: u.date, time: u.time, duration: u.duration, trainer: u.trainer, loadLevel: u.loadLevel, focus: u.focus });
      }
    });
    return map;
  }, [unitMetaList]);

  // Alle Session-Nummern, die irgendwo in der Anwesenheit vorkommen
  const usedSessionNums = useMemo(() => {
    const nums = new Set<number>();
    attendance.forEach(rec => {
      Object.keys(rec.sessions || {}).forEach(k => {
        const num = parseInt(k);
        const val = rec.sessions[num];
        if (!isNaN(num) && val) nums.add(num);
      });
    });
    return nums;
  }, [attendance]);

  // Vereinheitlichte Einheitenliste: Register + in der Anwesenheit genutzte Nummern
  const allUnits = useMemo(() => {
    const merged = new Map<number, UnitMeta>();
    usedSessionNums.forEach(num => {
      const existing = unitMap.get(num);
      merged.set(num, existing || { id: String(num), sessionNum: num });
    });
    unitMap.forEach((u, num) => merged.set(num, u));
    return Array.from(merged.values()).sort((a, b) => a.sessionNum - b.sessionNum);
  }, [usedSessionNums, unitMap]);

  // Trainingsplan-Einheiten (echtes Datum + Schwerpunkt) den EH-Nummern zuordnen:
  // chronologisch nach Datum sortiert auf die aufsteigend sortierten Session-
  // Nummern gelegt, damit EH #6 den ersten Termin bekommt, EH #7 den zweiten usw.
  const trainingByUnitNum = useMemo(() => {
    const map = new Map<number, Partial<UnitMeta>>();
    const sessions = (trainingSessionsRaw || [])
      .filter((s: any) => s && s.date)
      .slice()
      .sort((a: any, b: any) => (toIsoPart(a.date || '') < toIsoPart(b.date || '') ? -1 : 1));
    const nums = Array.from(usedSessionNums).sort((a, b) => a - b);
    sessions.forEach((s: any, i: number) => {
      const num = nums[i];
      if (num === undefined) return;
      map.set(num, {
        date: s.date || '',
        focus: s.sessionFocus || s.weeklyFocus || s.focus || '',
      });
    });
    return map;
  }, [trainingSessionsRaw, usedSessionNums]);

  // Einheiten mit Datum + Thema/Schwerpunkt aus dem Trainingsplan anreichern.
  // Das Register (attendance_unit_meta) hat Vorrang, wenn der Nutzer dort
  // eigene Werte gepflegt hat. NUR Einheiten, die in der Anwesenheit wirklich
  // belegt/gefüllt sind, erscheinen – geplante, aber nie trainierte Einheiten
  // (z.B. Oktober–Juni) tauchen nicht auf.
  const richUnits = useMemo(() => {
    const filled = new Set(Array.from(usedSessionNums));
    return (allUnits || [])
      .filter(u => filled.has(u.sessionNum))
      .map(u => {
        const t = trainingByUnitNum.get(u.sessionNum);
        if (!t) return u;
        return {
          ...u,
          date: u.date || t.date || '',
          focus: u.focus || t.focus || '',
        };
      });
  }, [allUnits, trainingByUnitNum, usedSessionNums]);

  // Auto-Nummerierung: Einheiten EH #6 … höchste erfasste Session automatisch
  // ins Register schreiben (einmalig nach dem Laden). So erscheinen ALLE
  // existierenden Einheiten in der Monatsauswertung - auch ohne Datum.
  const autoSeedDoneRef = useRef(false);
  useEffect(() => {
    if (loadingUnitMeta || autoSeedDoneRef.current) return;
    const existingNums = new Set(unitMap.keys());
    const highest = Math.max(5, ...Array.from(usedSessionNums));
    const missing: number[] = [];
    for (let n = 6; n <= highest; n++) {
      if (!existingNums.has(n)) {
        missing.push(n);
      }
    }
    if (missing.length === 0) {
      autoSeedDoneRef.current = true;
      return;
    }
    autoSeedDoneRef.current = true;
    missing.forEach(n => {
      saveUnitMeta({ id: String(n), sessionNum: n });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingUnitMeta, unitMetaList, attendance, usedSessionNums]);

  const monthOfUnit = (u: UnitMeta): number => {
    // Nur ECHTE Daten zählen: Monat kommt ausschließlich aus dem Trainingsplan
    // bzw. Register. Ohne Datum -> 'Ohne Datum', keine künstliche Verteilung
    // über kommende Saisonmonate.
    if (u.date) {
      const iso = toIsoPart(u.date);
      const m = parseInt(iso.split('-')[1]);
      if (!isNaN(m)) return m;
    }
    return 0;
  };

  const unitsBySeasonMonth = useMemo(() => {
    const map: Record<number, UnitMeta[]> = {};
    SEASON_MONTHS.forEach(m => (map[m.num] = []));
    map[0] = []; // ohne Datum
    map[-1] = []; // außerhalb Saison (Jan/Feb/winterpause)
    (richUnits || []).forEach(u => {
      const m = monthOfUnit(u);
      if (m === 0) map[0].push(u);
      else if (SEASON_MONTHS.some(sm => sm.num === m)) map[m].push(u);
      else map[-1].push(u);
    });
    return map;
  }, [richUnits]);

  // Kader-Zähler über alle Einheiten
  const playerCounters = useMemo(() => {
    const map = new Map<string, { anwesend: number; entschuldigt: number; unentschuldigt: number; krankVerletzt: number; gesamt: number }>();
    squadPlayers.forEach(p => {
      map.set(p.id, { anwesend: 0, entschuldigt: 0, unentschuldigt: 0, krankVerletzt: 0, gesamt: 0 });
    });
    (allUnits || []).forEach(u => {
      attendance.forEach(rec => {
        const holder = map.get(rec.playerId);
        if (!holder) return;
        const status = rec.sessions?.[u.sessionNum] || '';
        if (!status) return;
        holder.gesamt += 1;
        if (status === 'x' || status === 'Lg') holder.anwesend += 1;
        else if (status === 'e') holder.entschuldigt += 1;
        else if (status === 'u') holder.unentschuldigt += 1;
        else if (status === 'k' || status === 'v') holder.krankVerletzt += 1;
      });
    });
    return map;
  }, [squadPlayers, allUnits, attendance]);

  // Fehlzeiten pro Spieler pro Monat: Einheit existiert, aber Spieler hat keinen Status
  const absencesPerPlayerMonth = useMemo(() => {
    const map = new Map<string, Record<number, number>>();
    squadPlayers.forEach(p => map.set(p.id, {}));
    SEASON_MONTHS.forEach(m => {
      const units = unitsBySeasonMonth[m.num] || [];
      squadPlayers.forEach(p => {
        let fehl = 0;
        const rec = attendance.find(a => a.playerId === p.id);
        units.forEach(u => {
          const status = rec?.sessions?.[u.sessionNum] || '';
          if (!status) fehl += 1;
        });
        map.get(p.id)![m.num] = fehl;
      });
    });
    return map;
  }, [squadPlayers, unitsBySeasonMonth, attendance]);

  const selectedPlayer = squadPlayers.find(p => p.id === selectedPlayerId) || null;

  const filteredUnits = useMemo(() => {
    let list = (richUnits || []).slice();
    if (filterMonth) {
      const m = parseInt(filterMonth);
      list = list.filter(u => monthOfUnit(u) === m);
    }
    if (filterDate) {
      const iso = toIsoPart(filterDate);
      list = list.filter(u => toIsoPart(u.date || '') === iso);
    }
    if (filterFocus) {
      const q = filterFocus.toLowerCase();
      list = list.filter(u => (u.focus || '').toLowerCase().includes(q));
    }
    return list;
  }, [richUnits, filterMonth, filterDate, filterFocus]);

  const cycleStatus = (playerId: string, sessionNum: number, current: string) => {
    if (!isEditing) return;
    const idx = ATTENDANCE_OPTIONS.findIndex(o => o.key === current);
    const next = ATTENDANCE_OPTIONS[(idx + 1) % ATTENDANCE_OPTIONS.length].key;
    onUpdateAttendance(playerId, sessionNum, next);
  };

  const addUnit = () => {
    if (!newUnit.date) return;
    const maxNum = (allUnits || []).reduce((max, u) => Math.max(max, u.sessionNum), 6);
    const nextNum = maxNum + 1;
    saveUnitMeta({
      id: String(nextNum),
      sessionNum: nextNum,
      date: newUnit.date,
      time: newUnit.time,
      duration: newUnit.duration,
      trainer: newUnit.trainer,
      loadLevel: newUnit.loadLevel,
      focus: newUnit.focus,
    });
    setNewUnit({ date: '', time: '', duration: '', trainer: '', loadLevel: 'Mittel', focus: '' });
    setShowAddUnit(false);
  };

  const saveMetaField = (id: string, field: string, value: string) => {
    const existing = unitMap.get(Number(id)) || { id, sessionNum: Number(id) };
    saveUnitMeta({ ...existing, [field]: value });
  };

  // Bearbeiten-Modal öffnen: Einheit mit Datein/Zeiten vorbefüllen
  const openEditUnit = (u: UnitMeta) => {
    setEditUnitTarget(u);
    setEditUnitForm({
      sessionNum: String(u.sessionNum),
      date: u.date ? toIsoPart(u.date) : '',
      time: u.time || '',
      duration: u.duration || '',
      trainer: u.trainer || '',
      loadLevel: u.loadLevel || 'Mittel',
      focus: u.focus || '',
    });
  };

  // Bearbeiten speichern: Anwesenheiten der ALTEN Nummer auf die NEUE Nummer
  // verschieben (falls geändert), dann Meta-Dokument neu anlegen + altes löschen.
  const saveEditedUnit = async () => {
    if (!editUnitTarget) return;
    const oldNum = editUnitTarget.sessionNum;
    const newNum = parseInt(editUnitForm.sessionNum.trim(), 10);
    const safeNew = !isNaN(newNum) && newNum > 0 ? newNum : oldNum;
    const patch = {
      date: editUnitForm.date,
      time: editUnitForm.time,
      duration: editUnitForm.duration,
      trainer: editUnitForm.trainer,
      loadLevel: editUnitForm.loadLevel,
      focus: editUnitForm.focus,
    };
    if (safeNew !== oldNum) {
      // Bestehende Anwesenheit/Status aller Spieler von alter → neuer Nummer übertragen.
      const moves = squadPlayers.map(async p => {
        const rec = attendance.find(a => a.playerId === p.id);
        const status = rec?.sessions?.[oldNum] || '';
        if (status) {
          await onUpdateAttendance(p.id, safeNew, status);
          await onUpdateAttendance(p.id, oldNum, '');
        }
      });
      await Promise.all(moves);
      // Meta neu anlegen unter neuer Nummer, alte entfernen.
      await saveUnitMeta({ id: String(safeNew), sessionNum: safeNew, ...patch });
      await removeUnitMeta(String(oldNum));
    } else {
      // Nur Feldwerte aktualisieren.
      await saveUnitMeta({ id: String(oldNum), sessionNum: oldNum, ...patch });
    }
    setEditUnitTarget(null);
  };

  // Einheit komplett löschen: Register-Eintrag entfernen UND die Session aus
  // der Anwesenheit ALLER Spieler löschen (Status '' → deleteField).
  const deleteUnit = async (u: UnitMeta) => {
    if (!isEditing) return;
    await Promise.all(
      squadPlayers.map(p => onUpdateAttendance(p.id, u.sessionNum, ''))
    );
    await removeUnitMeta(u.id || String(u.sessionNum));
    setEditMonthNum(null);
  };

  // Monatsübersicht am Ende
  const monthlySummary = useMemo(() => {
    return SEASON_MONTHS.map(m => {
      const units = unitsBySeasonMonth[m.num] || [];
      let anwesenheiten = 0;
      let fehlzeiten = 0;
      squadPlayers.forEach(p => {
        const rec = attendance.find(a => a.playerId === p.id);
        units.forEach(u => {
          const status = rec?.sessions?.[u.sessionNum] || '';
          if (status === 'x' || status === 'Lg') anwesenheiten += 1;
          else if (!status) fehlzeiten += 1;
        });
      });
      return { month: m.label, monthNum: m.num, anwesenheiten, einheiten: units.length, fehlzeiten };
    });
  }, [unitsBySeasonMonth, squadPlayers, attendance]);

  // Monats-Register-Map: manuelle Werte je Saisonmonat (trainerpflegebar)
  const monthMetaMap = useMemo(() => {
    const map = new Map<number, any>();
    (monthMetaList || []).forEach((d: any) => {
      const num = Number(d.monthNum ?? d.id);
      if (!isNaN(num)) map.set(num, d);
    });
    return map;
  }, [monthMetaList]);

  // Effektive Monatsübersicht: manuell gesetzte Werte überschreiben die
  // automatisch berechneten; leere Overrides (null) kehren zur Auto-Basis zurück.
  const effectiveMonthly = useMemo(() => {
    const autoSoll = (s: { einheiten: number }) => s.einheiten * squadPlayers.length;
    return monthlySummary.map(s => {
      const m = monthMetaMap.get(s.monthNum) || {};
      const pick = (f: keyof any, auto: number) => {
        const v = m[f];
        return v !== null && v !== undefined && v !== '' ? Number(v) : auto;
      };
      return {
        ...s,
        einheiten: pick('einheiten', s.einheiten),
        soll: pick('soll', autoSoll(s)),
        anwesenheiten: pick('anwesenheiten', s.anwesenheiten),
        fehlzeiten: pick('fehlzeiten', s.fehlzeiten),
      };
    });
  }, [monthlySummary, monthMetaMap, squadPlayers]);

  // Manuellen Wert je Monatszelle speichern; leerer Input → null → Auto-Modus
  const saveMonthField = (monthNum: number, field: 'einheiten' | 'soll' | 'anwesenheiten' | 'fehlzeiten', raw: string) => {
    const existing = monthMetaMap.get(monthNum) || {};
    const trimmed = raw.trim();
    const num = parseInt(trimmed, 10);
    const val = trimmed === '' || isNaN(num) ? null : num;
    saveMonthMeta({ id: String(monthNum), monthNum, ...existing, [field]: val });
  };

  const selectedMonthUnits = useMemo(() => {
    if (!selectedPlayer) return [];
    const rec = attendance.find(a => a.playerId === selectedPlayer.id);
    const make = (m: { label: string; num: number }) => ({
      month: m.label,
      monthNum: m.num,
      units: (unitsBySeasonMonth[m.num] || []).map(u => ({
        ...u,
        status: rec?.sessions?.[u.sessionNum] || '',
      })),
      fehl: absencesPerPlayerMonth.get(selectedPlayer.id)?.[m.num] || 0,
    });
    const season = SEASON_MONTHS.map(m => make(m));
    const rest: { label: string; num: number }[] = [];
    if (unitsBySeasonMonth[-1]?.length) rest.push({ label: 'Winterpause (Jan – Feb)', num: -1 });
    if (unitsBySeasonMonth[0]?.length) rest.push({ label: 'Ohne Datum / Unzugeordnet', num: 0 });
    return [...season, ...rest.map(m => make(m))];
  }, [selectedPlayer, unitsBySeasonMonth, attendance, absencesPerPlayerMonth]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-full bg-[#0A0E17] text-[#F8FAFC] p-2 sm:p-4 rounded-2xl border border-[#334155] shadow-xl overflow-y-auto min-h-0">
      {/* HEADER */}
      <div className="p-4 border border-[#334155] bg-[#121824] text-[#F8FAFC] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center mb-3 shadow-md gap-3 w-full max-w-full">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-black uppercase text-sm sm:text-base tracking-wider text-[#F8FAFC] flex items-center gap-2">
            <ListChecks size={18} className="text-[#10B981]" /> Anwesenheit Monatsauswertung
          </h3>
          <span className="px-3 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] font-black border border-[#10B981]/40 text-[10px] tracking-wider">
            {allUnits.length} Einheiten • {SEASON_MONTHS.length} Saison-Monate
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRegister(!showRegister)}
            className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 border border-[#334155]"
          >
            <FolderOpen size={14} /> Einheiten-Register
          </button>
          {isEditing && (
            <button
              onClick={() => setShowAddUnit(true)}
              className="bg-[#FFD54F] hover:bg-[#FFE082] text-[#0F0F0F] px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-md border border-[#FFD54F]"
            >
              <Plus size={14} /> EINHEIT
            </button>
          )}
        </div>
      </div>

      {/* EINHEITEN-REGISTER */}
      {showRegister && (
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4 mb-3 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black uppercase text-xs text-[#F8FAFC] flex items-center gap-2">
              <FolderOpen size={14} className="text-[#F59E0B]" /> Einheiten-Register (Session → Datum / Thema / Trainer / Belastung)
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#7E9BB5] font-bold uppercase">Neue Einheit vergibt automatisch die nächste Nummer EH #{((allUnits || []).reduce((max, u) => Math.max(max, u.sessionNum), 6) || 6) + 1}</span>
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto custom-scrollbar border border-[#334155] rounded-xl">
            <table className="w-full border-collapse text-[10px]">
              <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
                <tr>
                  <th className="p-2 text-center w-16 border-r border-[#334155] font-black">EH</th>
                  <th className="p-2 text-center w-40 border-r border-[#334155] font-black">Datum</th>
                  <th className="p-2 text-center w-20 border-r border-[#334155] font-black">Uhrzeit</th>
                  <th className="p-2 text-center w-20 border-r border-[#334155] font-black">Dauer</th>
                  <th className="p-2 text-center w-32 border-r border-[#334155] font-black">Trainer</th>
                  <th className="p-2 text-center w-28 border-r border-[#334155] font-black">Belastung</th>
                  <th className="p-2 text-center font-black">Thema / Schwerpunkt</th>
                  <th className="p-2 text-center w-16 font-black">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {allUnits.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-[#7E9BB5] font-bold uppercase">Noch keine Einheiten erfasst.</td></tr>
                )}
                {allUnits.map(u => (
                  <tr key={u.id} className="border-b border-[#1E293B]">
                    <td className="p-1.5 text-center font-black text-[#10B981]">#{u.sessionNum}</td>
                    <td className="p-1.5">
                      <input
                        type="date"
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.date ? toIsoPart(u.date) : ''}
                        onChange={e => saveMetaField(u.id, 'date', e.target.value)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="time"
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.time || ''}
                        onChange={e => saveMetaField(u.id, 'time', e.target.value)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        placeholder="z.B. 90"
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.duration || ''}
                        onChange={e => saveMetaField(u.id, 'duration', e.target.value)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        placeholder="Trainername"
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.trainer || ''}
                        onChange={e => saveMetaField(u.id, 'trainer', e.target.value)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-1.5">
                      <select
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.loadLevel || LOAD_LEVELS[0]}
                        onChange={e => saveMetaField(u.id, 'loadLevel', e.target.value)}
                        disabled={!isEditing}
                      >
                        {LOAD_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </td>
                    <td className="p-1.5">
                      <input
                        type="text"
                        placeholder="Thema / Schwerpunkt"
                        className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#F59E0B] focus:outline-none"
                        value={u.focus || ''}
                        onChange={e => saveMetaField(u.id, 'focus', e.target.value)}
                        disabled={!isEditing}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      {isEditing && (
                        <button
                          onClick={() => openEditUnit(u)}
                          title={`EH #${u.sessionNum} bearbeiten (inkl. Nummer ändern)`}
                          className="px-2 py-1 rounded-md bg-[#38BDF8]/10 hover:bg-[#38BDF8]/25 text-[#38BDF8] transition-all border border-[#38BDF8]/30 mr-1"
                        >
                          <Pencil size={12} />
                        </button>
                      )}
                      <DeleteUnitButton isEditing={isEditing} onDelete={() => deleteUnit(u)} label={`EH #${u.sessionNum}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[9px] text-[#7E9BB5] font-bold uppercase">
            Tipp: Einheiten ohne Datum erscheinen unter „Ohne Datum“ und erhöhen den Monatszähler erst nach Datumsvergabe.
          </p>
        </div>
      )}

      {/* + EINHEIT MODAL */}
      {showAddUnit && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black uppercase text-sm flex items-center gap-2 text-[#F8FAFC]">
                <Plus size={16} className="text-[#FFD54F]" /> Neue Einheit
              </h4>
              <button onClick={() => setShowAddUnit(false)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Datum *</label>
                  <input
                    type="date"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={newUnit.date}
                    onChange={e => setNewUnit(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={newUnit.time}
                    onChange={e => setNewUnit(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Dauer (Min)</label>
                  <input
                    type="text"
                    placeholder="z.B. 90"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={newUnit.duration}
                    onChange={e => setNewUnit(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Trainer</label>
                  <input
                    type="text"
                    placeholder="Trainername"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={newUnit.trainer}
                    onChange={e => setNewUnit(prev => ({ ...prev, trainer: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Belastungsstufe</label>
                <select
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                  value={newUnit.loadLevel}
                  onChange={e => setNewUnit(prev => ({ ...prev, loadLevel: e.target.value }))}
                >
                  {LOAD_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Thema / Schwerpunkt</label>
                <input
                  type="text"
                  placeholder="z.B. Ballbesitz, Umschalten, Standards"
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                  value={newUnit.focus}
                  onChange={e => setNewUnit(prev => ({ ...prev, focus: e.target.value }))}
                />
              </div>
              <button
                onClick={addUnit}
                disabled={!newUnit.date}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Save size={14} /> Einheit speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EINZELNE EINHEIT BEARBEITEN MODAL (inkl. Nummer ändern + Löschen) */}
      {editUnitTarget && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black uppercase text-sm flex items-center gap-2 text-[#F8FAFC]">
                <Pencil size={16} className="text-[#38BDF8]" /> EH #{editUnitTarget.sessionNum} bearbeiten
              </h4>
              <button onClick={() => setEditUnitTarget(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Einheit Nummer (EH #)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={editUnitForm.sessionNum}
                  onChange={e => setEditUnitForm(prev => ({ ...prev, sessionNum: e.target.value }))}
                  title="Nummer ändern verschiebt auch alle Anwesenheiten auf die neue EH"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Datum</label>
                  <input
                    type="date"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    value={editUnitForm.date}
                    onChange={e => setEditUnitForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    value={editUnitForm.time}
                    onChange={e => setEditUnitForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Dauer (Min)</label>
                  <input
                    type="text"
                    placeholder="z.B. 90"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    value={editUnitForm.duration}
                    onChange={e => setEditUnitForm(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Trainer</label>
                  <input
                    type="text"
                    placeholder="Trainername"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    value={editUnitForm.trainer}
                    onChange={e => setEditUnitForm(prev => ({ ...prev, trainer: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Belastungsstufe</label>
                <select
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={editUnitForm.loadLevel}
                  onChange={e => setEditUnitForm(prev => ({ ...prev, loadLevel: e.target.value }))}
                >
                  {LOAD_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Thema / Schwerpunkt</label>
                <input
                  type="text"
                  placeholder="z.B. Ballbesitz, Umschalten, Standards"
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={editUnitForm.focus}
                  onChange={e => setEditUnitForm(prev => ({ ...prev, focus: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveEditedUnit}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Speichern
                </button>
                <button
                  onClick={() => { const target = editUnitTarget; setEditUnitTarget(null); deleteUnit(target); }}
                  className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KOMPAKTSICHT: KADERÜBERSICHT */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
        {squadPlayers.map(p => {
          const counters = playerCounters.get(p.id) || { anwesend: 0, entschuldigt: 0, unentschuldigt: 0, krankVerletzt: 0, gesamt: 0 };
          const isSel = selectedPlayerId === p.id;
          return (
            <div
              key={p.id}
              className={`bg-[#121824] border rounded-xl p-3 shadow-md transition-all flex gap-3 items-center ${isSel ? 'border-[#10B981] ring-1 ring-[#10B981]/40' : 'border-[#334155] hover:border-[#10B981]/60'}`}
            >
              <div className="relative shrink-0">
                {p.image ? (
                  <img src={p.image} alt={p.lastName || ''} className="w-12 h-12 rounded-full object-cover border-2 border-[#334155]" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#1E293B] border-2 border-[#334155] flex items-center justify-center">
                    <User size={18} className="text-[#7E9BB5]" />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 bg-[#0F0F0F] border border-[#10B981] text-[#10B981] text-[8px] font-black rounded px-1 py-0.5">
                  #{p.number || p.nummer || '–'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-[12px] truncate text-[#F8FAFC] uppercase">{p.lastName || p.name}</div>
                <div className="text-[9px] font-bold uppercase text-[#0D9488]">{p.position}</div>
                <div className="flex flex-wrap gap-1.5 mt-1.5 text-[9px] font-black">
                  <span className="px-1.5 py-0.5 rounded bg-white text-black border border-slate-300" title="Anwesend">x {counters.anwesend}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[#2563EB] border border-slate-300" title="Entschuldigt">e {counters.entschuldigt}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[#DC2626] border border-slate-300" title="Unentschuldigt">u {counters.unentschuldigt}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white text-[#E11D48] border border-slate-300" title="Krank / Verletzt">k/v {counters.krankVerletzt}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayerId(isSel ? null : p.id)}
                className={`shrink-0 px-3 py-2 text-[9px] font-black uppercase rounded-lg transition-all border flex items-center gap-1 ${isSel ? 'bg-[#10B981] text-white border-[#10B981]' : 'bg-[#1E293B] text-[#7E9BB5] border-[#334155] hover:bg-[#334155] hover:text-[#F8FAFC]'}`}
              >
                <Search size={11} /> Unterliste
              </button>
            </div>
          );
        })}
      </div>

      {/* UNTERLISTE PRO SPIELER */}
      {selectedPlayer ? (
        <div className="bg-[#0A1628] border border-[#38BDF8]/30 rounded-2xl p-4 mb-3 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                {selectedPlayer.image ? (
                  <img src={selectedPlayer.image} alt={selectedPlayer.lastName || ''} className="w-14 h-14 rounded-full object-cover border-2 border-[#334155]" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#1E293B] border-2 border-[#334155] flex items-center justify-center">
                    <User size={20} className="text-[#7E9BB5]" />
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 bg-[#0F0F0F] border border-[#38BDF8] text-[#38BDF8] text-[8px] font-black rounded px-1 py-0.5">
                  #{selectedPlayer.number || selectedPlayer.nummer || '–'}
                </span>
              </div>
              <div>
                <h4 className="font-black uppercase text-sm text-[#F8FAFC]">{selectedPlayer.lastName || selectedPlayer.name}</h4>
                <span className="text-[10px] font-bold uppercase text-[#0D9488]">{selectedPlayer.position}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedPlayerId(null)}
              className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors text-xs font-bold uppercase flex items-center gap-1"
            >
              <X size={14} /> Schließen
            </button>
          </div>

          {/* MONATSÜBERSICHT für diesen Spieler (kompakt, direkt sichtbar) */}
          <div className="mb-3 overflow-auto custom-scrollbar border border-[#334155] rounded-lg">
            <table className="w-full border-collapse text-[10px]">
              <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
                <tr>
                  <th className="p-2 text-left border-r border-[#334155] font-black">Monat</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black">Einheiten</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black text-[#10B981]">Anwesend</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black text-[#2563EB]">Entsch.</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black text-[#DC2626]">Unentsch.</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black text-[#E11D48]">Krank/Verl.</th>
                  <th className="p-2 text-center border-r border-[#334155] font-black text-rose-400">Fehlzeiten</th>
                  <th className="p-2 text-center font-black text-[#38BDF8]">Quote</th>
                  <th className="p-2 text-center font-black">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {selectedMonthUnits.map(sm => {
                  const autoAnwesend = sm.units.filter(u => u.status === 'x' || u.status === 'Lg').length;
                  const autoEntsch = sm.units.filter(u => u.status === 'e').length;
                  const autoUnentsch = sm.units.filter(u => u.status === 'u').length;
                  const autoKrankVerl = sm.units.filter(u => u.status === 'k' || u.status === 'v').length;
                  const autoFehl = sm.units.length - autoAnwesend - autoEntsch - autoUnentsch - autoKrankVerl - sm.units.filter(u => u.status === 'P' || u.status === 'L').length;

                  // Manuelle Overrides (falls vorhanden)
                  const pmKey = `${selectedPlayer.id}_${sm.monthNum}`;
                  const pm = playerMonthMetaMap.get(pmKey) || {};
                  const pick = (f: string, auto: number) => {
                    const v = pm[f];
                    return v !== null && v !== undefined && v !== '' ? Number(v) : auto;
                  };
                  const einheiten = pick('einheiten', sm.units.length);
                  const anwesend = pick('anwesend', autoAnwesend);
                  const entsch = pick('entsch', autoEntsch);
                  const unentsch = pick('unentsch', autoUnentsch);
                  const krankVerl = pick('krankVerl', autoKrankVerl);
                  const fehl = pick('fehl', autoFehl);
                  const quote = einheiten > 0 ? Math.round((anwesend / einheiten) * 100) : 0;

                  const savePM = (field: string, raw: string) => {
                    const trimmed = raw.trim();
                    const num = parseInt(trimmed, 10);
                    const val = trimmed === '' || isNaN(num) ? null : num;
                    savePlayerMonthMeta({ id: pmKey, playerId: selectedPlayer.id, monthNum: sm.monthNum, ...pm, [field]: val });
                  };

                  const editableCls = 'p-1 text-center bg-[#0A0E17] border border-[#334155] rounded-md w-10 sm:w-14 text-[10px] font-black text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none';

                  return (
                    <tr key={sm.monthNum} className="border-b border-[#1E293B]">
                      <td className="p-2 font-black uppercase text-[#FAcc15]">
                        {sm.month}{sm.monthNum === 0 && <span className="text-[#7E9BB5]"> ({einheiten})</span>}
                      </td>
                      <td className="p-2 text-center font-black text-[#F8FAFC]">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={einheiten} className={editableCls} title="Einheiten manuell setzen" onBlur={e => savePM('einheiten', e.target.value)} />
                        ) : einheiten}
                      </td>
                      <td className="p-2 text-center font-black text-[#10B981]">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={anwesend} className={editableCls} title="Anwesend manuell setzen" onBlur={e => savePM('anwesend', e.target.value)} />
                        ) : anwesend}
                      </td>
                      <td className="p-2 text-center font-black text-[#2563EB]">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={entsch} className={editableCls} title="Entschuldigt manuell setzen" onBlur={e => savePM('entsch', e.target.value)} />
                        ) : entsch}
                      </td>
                      <td className="p-2 text-center font-black text-[#DC2626]">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={unentsch} className={editableCls} title="Unentschuldigt manuell setzen" onBlur={e => savePM('unentsch', e.target.value)} />
                        ) : unentsch}
                      </td>
                      <td className="p-2 text-center font-black text-[#E11D48]">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={krankVerl} className={editableCls} title="Krank/Verletzt manuell setzen" onBlur={e => savePM('krankVerl', e.target.value)} />
                        ) : krankVerl}
                      </td>
                      <td className="p-2 text-center font-black text-rose-400">
                        {isEditing ? (
                          <input type="number" min={0} defaultValue={fehl} className={editableCls} title="Fehlzeiten manuell setzen" onBlur={e => savePM('fehl', e.target.value)} />
                        ) : fehl}
                      </td>
                      <td className="p-2 text-center font-black text-[#38BDF8]">{quote}%</td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => setEditMonthNum(editMonthNum === sm.monthNum ? null : sm.monthNum)}
                          className={`px-2 py-1 rounded text-[9px] font-black uppercase border flex items-center gap-1 transition-colors ${editMonthNum === sm.monthNum ? 'bg-[#38BDF8] text-[#0F0F0F] border-[#38BDF8]' : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:bg-[#334155] hover:text-[#F8FAFC]'}`}
                        >
                          <Pencil size={11} /> {editMonthNum === sm.monthNum ? 'Schließen' : 'Bearbeiten'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* MONATS-BEARBEITUNG: Einheiten dieses Monats direkt anpassen */}
          {editMonthNum !== null && (
            <div className="bg-[#121824] border border-[#38BDF8]/40 rounded-xl p-3 mb-3">
              <h5 className="font-black uppercase text-[10px] text-[#F8FAFC] flex items-center gap-2 mb-2">
                <Pencil size={12} className="text-[#38BDF8]" /> Einheiten im {SEASON_MONTHS.find(m => m.num === editMonthNum)?.label || 'ohne Datum'} bearbeiten
              </h5>
              <div className="overflow-auto custom-scrollbar border border-[#334155] rounded-lg max-h-[340px]">
                <table className="w-full border-collapse text-[10px]">
                  <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
                    <tr>
                      <th className="p-2 text-left w-16 border-r border-[#334155] font-black">Einheit</th>
                      <th className="p-2 text-center w-32 border-r border-[#334155] font-black">Datum</th>
                      <th className="p-2 text-center w-20 border-r border-[#334155] font-black">Uhrzeit</th>
                      <th className="p-2 text-center w-20 border-r border-[#334155] font-black">Dauer</th>
                      <th className="p-2 text-center w-28 border-r border-[#334155] font-black">Trainer</th>
                      <th className="p-2 text-center w-20 border-r border-[#334155] font-black">Belast.</th>
                      <th className="p-2 text-left border-r border-[#334155] font-black">Thema / Schwerpunkt</th>
                      <th className="p-2 text-center w-20 font-black">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(unitsBySeasonMonth[editMonthNum] || []).length === 0 && (
                      <tr><td colSpan={8} className="p-3 text-center text-[#7E9BB5] font-bold uppercase">Keine Einheiten in diesem Monat.</td></tr>
                    )}
                    {(unitsBySeasonMonth[editMonthNum] || []).map(u => {
                      const rec = attendance.find(a => a.playerId === selectedPlayer.id);
                      const status = rec?.sessions?.[u.sessionNum] || '';
                      return (
                        <tr key={u.id} className="border-b border-[#1E293B]">
                          <td className="p-1.5 font-black text-[#10B981]">EH #{u.sessionNum}</td>
                          <td className="p-1.5">
                            <input
                              type="date"
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.date ? toIsoPart(u.date) : ''}
                              onChange={e => saveMetaField(u.id, 'date', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="time"
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.time || ''}
                              onChange={e => saveMetaField(u.id, 'time', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Min"
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.duration || ''}
                              onChange={e => saveMetaField(u.id, 'duration', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Trainer"
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.trainer || ''}
                              onChange={e => saveMetaField(u.id, 'trainer', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-1.5">
                            <select
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.loadLevel || LOAD_LEVELS[0]}
                              onChange={e => saveMetaField(u.id, 'loadLevel', e.target.value)}
                              disabled={!isEditing}
                            >
                              {LOAD_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </td>
                          <td className="p-1.5">
                            <input
                              type="text"
                              placeholder="Thema / Schwerpunkt"
                              className="w-full bg-[#0A0E17] border border-[#334155] rounded px-1.5 py-1 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                              value={u.focus || ''}
                              onChange={e => saveMetaField(u.id, 'focus', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-1.5 text-center">
                            <button
                              onClick={() => cycleStatus(selectedPlayer.id, u.sessionNum, status)}
                              disabled={!isEditing}
                              className={`px-2 py-0.5 rounded min-w-[30px] text-center text-[10px] font-black uppercase border ${getStatusColor(status)}`}
                              title={status ? `${getStatusLabel(status)} (Klick: nächstes)` : 'Kein Status = Fehlzeit (Klick: setzen)'}
                            >
                              {status || <span className="opacity-40">–</span>}
                            </button>
                            <div className="flex items-center justify-center gap-1 mt-1">
                              <button
                                onClick={() => openEditUnit(u)}
                                disabled={!isEditing}
                                title={`EH #${u.sessionNum} bearbeiten (inkl. Nummer ändern)`}
                                className="p-1 rounded bg-[#38BDF8]/10 hover:bg-[#38BDF8]/25 text-[#38BDF8] transition-all border border-[#38BDF8]/30"
                              >
                                <Pencil size={10} />
                              </button>
                              <DeleteUnitButton isEditing={isEditing} onDelete={() => deleteUnit(u)} label={`EH #${u.sessionNum}`} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[9px] text-[#7E9BB5] font-bold uppercase">
                Alle Felder direkt editierbar. Datum ändern verschiebt die Einheit in den entsprechenden Monat. Fehlzeiten werden automatisch mitgezählt.
              </p>
            </div>
          )}

          {/* ALLE EINHEITEN DES SPIELERS direkt sichtbar (wie die große Tabelle) */}
          <div className="bg-[#121824] border border-[#334155] rounded-xl p-3 mb-3">
            <h5 className="font-black uppercase text-[10px] text-[#F8FAFC] flex items-center gap-2 mb-2">
              <ListChecks size={12} /> Alle Einheiten von {selectedPlayer.lastName || selectedPlayer.name}
            </h5>
            <div className="overflow-auto custom-scrollbar border border-[#334155] rounded-lg max-h-[400px]">
              <table className="w-full border-collapse text-[10px]">
                <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
                  <tr>
                    <th className="p-2 text-left w-20 border-r border-[#334155] font-black">Einheit</th>
                    <th className="p-2 text-left w-28 border-r border-[#334155] font-black">Datum</th>
                    <th className="p-2 text-left w-28 border-r border-[#334155] font-black">Monat</th>
                    <th className="p-2 text-left border-r border-[#334155] font-black">Thema / Schwerpunkt</th>
                    <th className="p-2 text-center w-24 font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(richUnits || []).length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-[#7E9BB5] font-bold uppercase">Noch keine Einheiten erfasst.</td></tr>
                  )}
                  {(richUnits || []).map(u => {
                    const rec = attendance.find(a => a.playerId === selectedPlayer.id);
                    const status = rec?.sessions?.[u.sessionNum] || '';
                    const monat = (() => {
                      const m = monthOfUnit(u);
                      const sm = SEASON_MONTHS.find(x => x.num === m);
                      if (sm) return sm.label;
                      if (m === -1) return 'Winterpause';
                      return 'Ohne Datum';
                    })();
                    return (
                      <tr key={u.id} className="border-b border-[#1E293B]">
                        <td className="p-1.5 font-black text-[#10B981]">EH #{u.sessionNum}</td>
                        <td className="p-1.5 text-[#7E9BB5]">{u.date ? formatDateDe(u.date) : '–'}</td>
                        <td className="p-1.5 font-bold uppercase text-[#FAcc15]">{monat}</td>
                        <td className="p-1.5 text-[#F8FAFC]">{u.focus || '–'}</td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => cycleStatus(selectedPlayer.id, u.sessionNum, status)}
                            disabled={!isEditing}
                            className={`px-2 py-0.5 rounded min-w-[30px] text-center text-[10px] font-black uppercase border ${getStatusColor(status)}`}
                            title={status ? `${getStatusLabel(status)} (Klick: nächstes)` : 'Kein Status = Fehlzeit (Klick: setzen)'}
                          >
                            {status || <span className="opacity-40">–</span>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Filter & Suche für die Unterliste */}
          <div className="mt-4 bg-[#121824] border border-[#334155] rounded-xl p-3">
            <h5 className="font-black uppercase text-[10px] text-[#F8FAFC] flex items-center gap-2 mb-2">
              <Filter size={12} /> Alle Einheiten – Filter & Suche
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase text-[#7E9BB5]">Nach Monat</label>
                <select
                  className="bg-[#0A0E17] border border-[#334155] rounded px-2 py-1.5 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="">Alle Monate</option>
                  {SEASON_MONTHS.map(m => <option key={m.num} value={m.num} disabled={!unitsBySeasonMonth[m.num]?.length}>{m.label} ({unitsBySeasonMonth[m.num]?.length || 0})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase text-[#7E9BB5]">Nach Datum</label>
                <input
                  type="date"
                  className="bg-[#0A0E17] border border-[#334155] rounded px-2 py-1.5 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black uppercase text-[#7E9BB5]">Nach Thema / Schwerpunkt</label>
                <input
                  type="text"
                  placeholder="z.B. Ballbesitz"
                  className="bg-[#0A0E17] border border-[#334155] rounded px-2 py-1.5 text-[10px] text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                  value={filterFocus}
                  onChange={e => setFilterFocus(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-3 overflow-auto custom-scrollbar border border-[#334155] rounded-lg max-h-[300px]">
              <table className="w-full border-collapse text-[10px]">
                <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
                  <tr>
                    <th className="p-2 text-left w-20 border-r border-[#334155] font-black">Einheit</th>
                    <th className="p-2 text-left w-28 border-r border-[#334155] font-black">Datum</th>
                    <th className="p-2 text-left border-r border-[#334155] font-black">Thema / Schwerpunkt</th>
                    <th className="p-2 text-left border-r border-[#334155] font-black">Trainer / Belastung</th>
                    <th className="p-2 text-center w-24 font-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUnits.length === 0 && (
                    <tr><td colSpan={5} className="p-3 text-center text-[#7E9BB5] font-bold uppercase">Keine Einheiten gefunden.</td></tr>
                  )}
                  {filteredUnits.map(u => {
                    const rec = attendance.find(a => a.playerId === selectedPlayer.id);
                    const status = rec?.sessions?.[u.sessionNum] || '';
                    return (
                      <tr key={u.id} className="border-b border-[#1E293B]">
                        <td className="p-1.5 font-black text-[#10B981]">EH #{u.sessionNum}</td>
                        <td className="p-1.5 text-[#7E9BB5]">{u.date ? formatDateDe(u.date) : 'Ohne Datum'}</td>
                        <td className="p-1.5 text-[#F8FAFC]">{u.focus || '–'}</td>
                        <td className="p-1.5 text-[#7E9BB5]">{u.trainer || '–'} {u.loadLevel ? `• ${u.loadLevel}` : ''}</td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => cycleStatus(selectedPlayer.id, u.sessionNum, status)}
                            disabled={!isEditing}
                            className={`px-2 py-0.5 rounded min-w-[30px] text-center text-[10px] font-black uppercase border ${getStatusColor(status)}`}
                            title={status ? `${getStatusLabel(status)} (Klick: nächstes)` : 'Kein Status = Fehlzeit (Klick: setzen)'}
                          >
                            {status || <span className="opacity-40">–</span>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#121824] border border-dashed border-[#334155] rounded-2xl p-5 mb-3 text-center">
          <p className="text-[11px] font-black uppercase text-[#7E9BB5] flex items-center justify-center gap-2">
            <User size={14} /> Wähle einen Spieler über „🔍 Unterliste“, um seine Monatsaufteilung und Fehlzeiten zu sehen.
          </p>
        </div>
      )}

      {/* MONATSÜBERSICHT AM ENDE */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4 shadow-md">
        <h4 className="font-black uppercase text-xs text-[#F8FAFC] flex items-center gap-2 mb-3">
          <Shield size={14} className="text-[#10B981]" /> Monatsübersicht (Kader)
        </h4>
        <div className="overflow-auto custom-scrollbar border border-[#334155] rounded-xl">
          <table className="w-full border-collapse text-[10px]">
            <thead className="sticky top-0 bg-[#1E293B] text-[#F8FAFC] z-10">
              <tr>
                <th className="p-2 text-left border-r border-[#334155] font-black">Monat</th>
                <th className="p-2 text-center border-r border-[#334155] font-black">Einheiten</th>
                <th className="p-2 text-center border-r border-[#334155] font-black">Soll (Kader)</th>
                <th className="p-2 text-center border-r border-[#334155] font-black text-[#10B981]">Anwesend</th>
                <th className="p-2 text-center font-black text-rose-400">Fehlzeiten</th>
                <th className="p-2 text-center font-black text-[#38BDF8]">Quote</th>
              </tr>
            </thead>
            <tbody>
              {effectiveMonthly.map(s => {
                const quote = s.soll > 0 ? Math.round((s.anwesenheiten / s.soll) * 100) : 0;
                const editableCls = 'p-1 m-0 w-12 sm:w-16 text-center bg-[#0A0E17] border border-[#334155] rounded-md text-[10px] font-black text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none';
                return (
                  <tr key={s.monthNum} className="border-b border-[#1E293B]">
                    <td className="p-2 font-black uppercase text-[#FAcc15]">{s.month}</td>
                    <td className="p-2 text-center font-black text-[#F8FAFC]">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={s.einheiten}
                          className={editableCls}
                          title="Einheiten manuell setzen (leer = automatisch aus der Anwesenheit)"
                          onBlur={e => saveMonthField(s.monthNum, 'einheiten', e.target.value)}
                        />
                      ) : s.einheiten}
                    </td>
                    <td className="p-2 text-center font-black text-[#7E9BB5]">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={s.soll}
                          className={editableCls}
                          title="Soll (Kader) manuell setzen (leer = automatisch)"
                          onBlur={e => saveMonthField(s.monthNum, 'soll', e.target.value)}
                        />
                      ) : s.soll}
                    </td>
                    <td className="p-2 text-center font-black text-[#10B981]">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={s.anwesenheiten}
                          className={editableCls}
                          title="Anwesend manuell setzen (leer = automatisch)"
                          onBlur={e => saveMonthField(s.monthNum, 'anwesenheiten', e.target.value)}
                        />
                      ) : s.anwesenheiten}
                    </td>
                    <td className="p-2 text-center font-black text-rose-400">
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          defaultValue={s.fehlzeiten}
                          className={editableCls}
                          title="Fehlzeiten manuell setzen (leer = automatisch)"
                          onBlur={e => saveMonthField(s.monthNum, 'fehlzeiten', e.target.value)}
                        />
                      ) : s.fehlzeiten}
                    </td>
                    <td className="p-2 text-center font-black text-[#38BDF8]">{quote}%</td>
                  </tr>
                );
              })}
              <tr className="bg-[#1E293B]">
                <td className="p-2 font-black uppercase text-[#F8FAFC]">Gesamt</td>
                <td className="p-2 text-center font-black text-[#F8FAFC]">{effectiveMonthly.reduce((a, s) => a + s.einheiten, 0)}</td>
                <td className="p-2 text-center font-black text-[#7E9BB5]">{effectiveMonthly.reduce((a, s) => a + s.soll, 0)}</td>
                <td className="p-2 text-center font-black text-[#10B981]">{effectiveMonthly.reduce((a, s) => a + s.anwesenheiten, 0)}</td>
                <td className="p-2 text-center font-black text-rose-400">{effectiveMonthly.reduce((a, s) => a + s.fehlzeiten, 0)}</td>
                <td className="p-2 text-center font-black text-[#38BDF8]">
                  {(() => {
                    const soll = effectiveMonthly.reduce((a, s) => a + s.soll, 0);
                    const anw = effectiveMonthly.reduce((a, s) => a + s.anwesenheiten, 0);
                    return soll > 0 ? `${Math.round((anw / soll) * 100)}%` : '0%';
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[9px] text-[#7E9BB5] font-bold uppercase flex items-center gap-1.5">
          <Activity size={10} /> Im Bearbeiten-Modus sind alle Spalten tippbar. Leeres Feld = automatischer Wert (aus der Anwesenheit). Manuelle Werte überschreiben die automatische Berechnung.
        </p>
      </div>
    </div>
  );
};

export default AttendanceMonthsView;