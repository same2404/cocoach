import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Plus, Trash2, Pencil, X, BarChart2, Calendar, Shield, Activity, Info, TrendingUp, Users, ListChecks, Save } from 'lucide-react';
import { Spieler, Player, AttendanceRecord } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { useCollectionSync } from '../../hooks/useCollectionSync';
import { AttendanceMonthsView } from './AttendanceMonthsView';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';

interface TrainingAttendanceViewProps {
  players: Spieler[];
  attendance: AttendanceRecord[];
  onUpdateAttendance: (playerId: string, sessionNum: number, status: string) => void;
  onUpdatePlayer: (id: string, field: keyof Spieler, value: any) => void;
  onEditPlayer: (player: Spieler) => void;
  onDeletePlayer: (id: string) => void;
  onClearSession: (sessionNum: number) => void;
  onClearRangeSessions?: (start: number, end: number) => void;
  onClearAllSessions?: () => void;
  onAddPlayer?: () => void;
  isEditing: boolean;
}

/**
 * Anzeige-Deduplizierung: identische Spieler nur einmal rendern.
 * Rein kosmetisch – Datenbestand und Firestore bleiben unverändert.
 * Schlüssel ist die Spieler-ID; nur wenn keine ID existiert, wird auf
 * Name + Rückennummer zurückgefallen.
 */
const dedupePlayersForDisplay = (list: Spieler[]): Spieler[] => {
  const seen = new Set<string>();
  const result: Spieler[] = [];
  (list || []).forEach((player) => {
    const key = String(
      player?.id ?? `${player?.firstName || ''}|${player?.lastName || ''}|${(player as any)?.number ?? ''}`
    );
    if (seen.has(key)) return;
    seen.add(key);
    result.push(player);
  });
  return result;
};

const ATTENDANCE_OPTIONS = [
  { key: 'x', label: 'Anwesend', color: 'bg-white', textColor: 'bg-white text-[#000000] font-black border border-slate-300 shadow-xs' },
  { key: 'Lg', label: 'Legend (★)', color: 'bg-white', textColor: 'bg-white text-[#D97706] font-black border border-slate-300 shadow-xs' },
  { key: 'e', label: 'Entschuldigt', color: 'bg-white', textColor: 'bg-white text-[#2563EB] font-black border border-slate-300 shadow-xs' },
  { key: 'u', label: 'Unentschuldigt', color: 'bg-white', textColor: 'bg-white text-[#DC2626] font-black border border-slate-300 shadow-xs' },
  { key: 'k', label: 'Krank', color: 'bg-white', textColor: 'bg-white text-[#CA8A04] font-black border border-slate-300 shadow-xs' },
  { key: 'P', label: 'Privat', color: 'bg-white', textColor: 'bg-white text-[#9333EA] font-black border border-slate-300 shadow-xs' },
  { key: 'L', label: 'Lehrgang', color: 'bg-white', textColor: 'bg-white text-[#0D9488] font-black border border-slate-300 shadow-xs' },
  { key: 'v', label: 'Verletzt', color: 'bg-white', textColor: 'bg-white text-[#E11D48] font-black border border-slate-300 shadow-xs' },
  { key: '', label: 'Leeren', color: 'bg-transparent', textColor: 'text-[#94A3B8]/40 bg-[#1A1A1A]' },
];

export const TrainingAttendanceView: React.FC<TrainingAttendanceViewProps> = ({
  players,
  attendance,
  onUpdateAttendance,
  onUpdatePlayer,
  onEditPlayer,
  onDeletePlayer,
  onClearSession,
  onClearRangeSessions,
  onClearAllSessions,
  onAddPlayer,
  isEditing
}) => {
  const [activePopover, setActivePopover] = useState<{ playerId: string, sessionNum: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<'table' | 'month' | 'chart' | 'months'>('table');
  const [rangePreset, setRangePreset] = useState<string>('all');
  const [startSession, setStartSession] = useState<number>(6);
  const [endSession, setEndSession] = useState<number>(120);
  const [posFilter, setPosFilter] = useState<string>('all');
  const [chartType, setChartType] = useState<'vertical' | 'horizontal'>('vertical');
  const [monthKey, setMonthKey] = useState<string>('');

  // Einheiten-Register (Session-Nummer → Datum/Thema/Trainer/Belastung)
  const { data: unitMetaList, addOrUpdateItem: saveUnitMeta, removeItem: removeUnitMeta } = useCollectionSync<any>('attendance_unit_meta', 'id', undefined, 'asc', true);

  const unitMetaMap = useMemo(() => {
    const map = new Map<number, any>();
    (unitMetaList || []).forEach((u: any) => {
      const num = Number(u.sessionNum || u.id);
      if (!isNaN(num) && num > 0) map.set(num, u);
    });
    return map;
  }, [unitMetaList]);

  // Bearbeiten-Modal für eine Einheit
  const [editUnitNum, setEditUnitNum] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState({ sessionNum: '', date: '', time: '', duration: '', trainer: '', loadLevel: 'Mittel', focus: '' });
  const openUnitEditor = (num: number) => {
    const m = unitMetaMap.get(num) || {};
    setUnitForm({
      sessionNum: String(num),
      date: m.date || '',
      time: m.time || '',
      duration: m.duration || '',
      trainer: m.trainer || '',
      loadLevel: m.loadLevel || 'Mittel',
      focus: m.focus || '',
    });
    setEditUnitNum(num);
  };
  const saveUnitMetaForm = async () => {
    if (editUnitNum === null) return;
    const oldNum = editUnitNum;
    const newNum = parseInt(unitForm.sessionNum.trim(), 10);
    const safeNew = !isNaN(newNum) && newNum > 0 ? newNum : oldNum;
    const patch = {
      date: unitForm.date,
      time: unitForm.time,
      duration: unitForm.duration,
      trainer: unitForm.trainer,
      loadLevel: unitForm.loadLevel,
      focus: unitForm.focus,
    };
    if (safeNew !== oldNum) {
      // Anwesenheiten der alten Nummer auf die neue Nummer verschieben
      const moves = players.map(async p => {
        const rec = attendance.find(a => a.playerId === p.id);
        const status = rec?.sessions?.[oldNum] || '';
        if (status) {
          await onUpdateAttendance(p.id, safeNew, status);
          await onUpdateAttendance(p.id, oldNum, '');
        }
      });
      await Promise.all(moves);
      await saveUnitMeta({ id: String(safeNew), sessionNum: safeNew, ...patch });
      await removeUnitMeta(String(oldNum));
    } else {
      await saveUnitMeta({ id: String(oldNum), sessionNum: oldNum, ...patch });
    }
    setEditUnitNum(null);
  };
  const deleteEditUnit = async () => {
    if (editUnitNum === null) return;
    const num = editUnitNum;
    setEditUnitNum(null);
    await Promise.all(
      players.map(p => onUpdateAttendance(p.id, num, ''))
    );
    await removeUnitMeta(String(num));
  };

  // Find latest session with any attendance data
  const latestSessionWithData = React.useMemo(() => {
    let maxSession = 6;
    attendance.forEach(rec => {
      const sess = rec.sessions || {};
      Object.keys(sess).forEach(k => {
        const num = parseInt(k);
        if (!isNaN(num) && num > maxSession && sess[num]) {
          maxSession = num;
        }
      });
    });
    return maxSession;
  }, [attendance]);

  useEffect(() => {
    if (rangePreset === 'all') {
      setStartSession(6);
      setEndSession(120);
    } else if (rangePreset === 'vorrunde') {
      setStartSession(6);
      setEndSession(60);
    } else if (rangePreset === 'rueckrunde') {
      setStartSession(61);
      setEndSession(120);
    } else if (rangePreset === 'last10') {
      const end = latestSessionWithData;
      setStartSession(Math.max(6, end - 9));
      setEndSession(end);
    } else if (rangePreset === 'last20') {
      const end = latestSessionWithData;
      setStartSession(Math.max(6, end - 19));
      setEndSession(end);
    }
  }, [rangePreset, latestSessionWithData]);

  const getPositionCategory = (pos: string) => {
    const p = (pos || '').toUpperCase();
    if (p.includes('TW') || p.includes('TOR')) return 'Torwart';
    if (p.includes('IV') || p.includes('RV') || p.includes('LV') || p.includes('AV') || p.includes('ABW')) return 'Abwehr';
    if (p.includes('DM') || p.includes('ZM') || p.includes('OM') || p.includes('RM') || p.includes('LM') || p.includes('6') || p.includes('8') || p.includes('10')) return 'Mittelfeld';
    if (p.includes('ST') || p.includes('MS') || p.includes('LA') || p.includes('RA') || p.includes('FL') || p.includes('ANG')) return 'Angriff';
    return 'Sonstige';
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sessions = Array.from({ length: 115 }, (_, i) => i + 6);

  // ── Monats-Ansicht: Einheiten nach Monat (Datum aus Trainingsplan) ──
  const toMonthKey = (d: any) => (d ? String(d).slice(0, 7) : '');

  const unitMonths = useMemo(() => {
    const set = new Set<string>();
    unitMetaMap.forEach((m: any) => { const k = toMonthKey(m?.date); if (k) set.add(k); });
    return Array.from(set).sort();
  }, [unitMetaMap]);

  const seasonMonths = useMemo(() => {
    if (unitMonths.length === 0) return [] as string[];
    const out: string[] = [];
    let [y, m] = unitMonths[0].split('-').map(Number);
    const ey = 2027, em = 5;
    while (y < ey || (y === ey && m <= em)) {
      out.push(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }, [unitMonths]);

  useEffect(() => {
    if (monthKey) return;
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (seasonMonths.includes(cur)) setMonthKey(cur);
    else if (seasonMonths.length) setMonthKey(seasonMonths[seasonMonths.length - 1]);
  }, [seasonMonths, monthKey]);

  const monthUnitNums = useMemo(() => {
    if (!monthKey) return [] as number[];
    const list: number[] = [];
    unitMetaMap.forEach((m: any, num: number) => {
      if (toMonthKey(m?.date) === monthKey) list.push(num);
    });
    return list.sort((a, b) => String(unitMetaMap.get(a)?.date || '').localeCompare(String(unitMetaMap.get(b)?.date || '')) || a - b);
  }, [unitMetaMap, monthKey]);

  const monthLabel = (key: string) => {
    const names = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const [y, m] = key.split('-').map(Number);
    if (!y || !m) return key;
    return `${names[m - 1]} ${y}`;
  };

  const monthIdx = seasonMonths.indexOf(monthKey);
  const prevMonth = monthIdx > 0 ? seasonMonths[monthIdx - 1] : '';
  const nextMonth = monthIdx >= 0 && monthIdx < seasonMonths.length - 1 ? seasonMonths[monthIdx + 1] : '';

  const handleAddUnit = () => {
    if (!monthKey) return;
    let maxDated = 5;
    unitMetaMap.forEach((m: any, num: number) => {
      if (String(m?.date || '').length >= 10 && num > maxDated) maxDated = num;
    });
    const next = maxDated + 1;
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const day = monthKey === curKey ? String(now.getDate()).padStart(2, '0') : '01';
    saveUnitMeta({ id: String(next), sessionNum: next, date: `${monthKey}-${day}`, focus: '', time: '', duration: '', trainer: '', loadLevel: 'Mittel' });
  };

  const getStatusColor = (status: string) => {
    const option = ATTENDANCE_OPTIONS.find(o => o.key === status);
    return option ? option.textColor : 'text-gray-300';
  };

  const calculateStats = (playerId: string) => {
    const record = attendance.find(a => a.playerId === playerId);
    if (!record) return { gesamt: 0, vor: 0, rueck: 0, quote: '0.0 %' };

    const sessionsData = record.sessions || {};
    // Only consider sessions that are currently displayed (6-120)
    const sessionEntries = Object.entries(sessionsData)
      .filter(([num]) => sessions.includes(parseInt(num)));
    
    const sessionValues = sessionEntries.map(([_, status]) => status);
    const totalAttended = sessionValues.filter(s => s === 'x').length;
    
    const vorAttended = sessionEntries
      .filter(([num, status]) => parseInt(num) <= 60 && status === 'x').length;
    
    const rueckAttended = sessionEntries
      .filter(([num, status]) => parseInt(num) > 60 && status === 'x').length;

    // New calculation: Only players who were present for all sessions get 100%.
    // All other statuses (e=excused, u=unexcused, k=sick, P=private, L=course, v=injured) are counted in the denominator and calculated proportionally.
    const excused = sessionValues.filter(s => s === 'e').length;
    const unexcused = sessionValues.filter(s => s === 'u').length;
    const sick = sessionValues.filter(s => s === 'k').length;
    const privat = sessionValues.filter(s => s === 'P').length;
    const course = sessionValues.filter(s => s === 'L').length;
    const injured = sessionValues.filter(s => s === 'v').length;

    const relevantSessions = totalAttended + excused + unexcused + sick + privat + course + injured;
    
    let quote = '0.0 %';
    if (relevantSessions > 0) {
      quote = ((totalAttended / relevantSessions) * 100).toFixed(1) + ' %';
    }

    return {
      gesamt: totalAttended,
      vor: vorAttended,
      rueck: rueckAttended,
      quote
    };
  };

  const handleCellClick = (playerId: string, sessionNum: number, currentStatus: string) => {
    if (!isEditing) return;
    
    const currentIndex = ATTENDANCE_OPTIONS.findIndex(opt => opt.key === currentStatus);
    const nextIndex = (currentIndex + 1) % ATTENDANCE_OPTIONS.length;
    const nextStatus = ATTENDANCE_OPTIONS[nextIndex].key;
    
    onUpdateAttendance(playerId, sessionNum, nextStatus);
  };

  const renderTableSection = (title: string, category: string) => {
    const filteredPlayers = sortPlayers(dedupePlayersForDisplay(players).filter(p => {
      if (category === 'player') {
        const cat = (p.category || 'player').toLowerCase();
        return cat === 'player' || cat === 'spieler';
      }
      const cat = (p.category || 'player').toLowerCase();
      if (category === 'coach') return cat === 'coach' || cat === 'trainer';
      if (category === 'staff') return cat === 'staff' || cat === 'funktionär' || cat === 'betreuer' || cat === 'teammanager';
      if (category === 'medical') return cat === 'medical' || cat === 'medizinisch' || cat === 'arzt' || cat === 'ärztlich' || cat === 'physio';
      return false;
    }));
    
    return (
      <>
        <tr className="bg-slate-100 text-[#0D9488] font-black">
          <td colSpan={sessions.length + 10} className="p-2.5 font-black uppercase text-xs tracking-wider border-y border-slate-300 bg-slate-100 text-[#0D9488]">
            {title}
          </td>
        </tr>
        {filteredPlayers.map((player, idx) => {
          const stats = calculateStats(player.id);
          const record = attendance.find(a => a.playerId === player.id);
          const quoteVal = parseFloat(stats.quote) || 0;
          const isHighPerformer = quoteVal >= 80;

          return (
            <tr key={player.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 bg-white text-[#0F172A]">
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B] font-bold">{idx + 1}</td>
              <td className="p-2 border-r border-slate-200 font-bold text-[#0F172A]">
                <input 
                  type="text"
                  className={`w-full bg-transparent focus:outline-none ${!isEditing ? 'cursor-not-allowed text-[#0F172A]' : 'font-bold uppercase text-[#0F172A] focus:border-[#0D9488]'}`}
                  value={player.lastName || ''}
                  onChange={(e) => onUpdatePlayer(player.id, 'lastName', e.target.value)}
                  disabled={!isEditing}
                />
              </td>
              <td className="p-2 border-r border-slate-200 text-center uppercase text-[#0D9488] font-black">{player.position}</td>
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B] font-bold">{player.number || player.nummer}</td>
              <td className="p-2 border-r border-slate-200 text-center font-bold text-[#0F172A]">{stats.gesamt}</td>
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B]">{stats.vor}</td>
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B]">{stats.rueck}</td>
              <td className="p-2 border-r border-slate-200 text-center text-[9px] font-bold">
                {isHighPerformer ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-[#10B981] font-black border border-[#10B981]">
                    {stats.quote}
                  </span>
                ) : (
                  <span className="text-[#0F172A] font-semibold">{stats.quote}</span>
                )}
              </td>
              {isEditing && (
                <td className="p-2 border-r border-slate-200 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onEditPlayer(player)}
                      className="text-[#0D9488] hover:text-[#059669] transition-colors"
                      title="Bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => {
                        onDeletePlayer(player.id);
                      }}
                      className="text-[#DC2626] hover:text-rose-600 transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              )}
              {sessions.map(num => {
                const status = (record?.sessions && record.sessions[num]) || (record as any)?.[`sessions.${num}`] || '';
                const isPopoverActive = activePopover?.playerId === player.id && activePopover?.sessionNum === num;

                return (
                  <td 
                    key={num} 
                    className="p-0.5 border-r border-slate-200 text-center min-w-[32px] relative hover:bg-slate-100 transition-colors"
                  >
                    <div 
                      className={`w-full h-full min-h-[26px] flex items-center justify-center cursor-pointer rounded text-[11px] font-black select-none transition-all ${getStatusColor(status)}`}
                      onClick={() => handleCellClick(player.id, num, status)}
                      onContextMenu={(e) => {
                        if (!isEditing) return;
                        e.preventDefault();
                        setActivePopover({ playerId: player.id, sessionNum: num });
                      }}
                    >
                      {status}
                    </div>

                    {isPopoverActive && (
                      <div 
                        ref={popoverRef}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#1A1A1A] border-2 border-[#2A2A2A] shadow-2xl z-50 p-2.5 min-w-[160px] rounded-xl text-[#F5F5F5]"
                      >
                        <div className="grid grid-cols-4 gap-1">
                          {ATTENDANCE_OPTIONS.map(opt => (
                            <button
                              key={opt.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateAttendance(player.id, num, opt.key);
                                setActivePopover(null);
                              }}
                              className={`w-8 h-8 flex items-center justify-center font-black uppercase border hover:scale-105 transition-transform rounded ${opt.key === status ? 'bg-[#FFD54F] text-[#0F0F0F] border-[#FFD54F] font-black' : opt.textColor}`}
                              title={opt.label}
                            >
                              {opt.key || <X size={12} />}
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-[8px] uppercase font-bold text-center border-t border-[#2A2A2A] pt-1 text-[#C7C7C7]">
                          Status wählen
                        </div>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  };

  const renderMonthSection = (title: string, category: string) => {
    const filteredPlayers = sortPlayers(dedupePlayersForDisplay(players).filter(p => {
      if (category === 'player') {
        const cat = (p.category || 'player').toLowerCase();
        return cat === 'player' || cat === 'spieler';
      }
      const cat = (p.category || 'player').toLowerCase();
      if (category === 'coach') return cat === 'coach' || cat === 'trainer';
      if (category === 'staff') return cat === 'staff' || cat === 'funktionär' || cat === 'betreuer' || cat === 'teammanager';
      if (category === 'medical') return cat === 'medical' || cat === 'medizinisch' || cat === 'arzt' || cat === 'ärztlich' || cat === 'physio';
      return false;
    }));

    return (
      <>
        <tr className="bg-slate-100 text-[#0D9488] font-black">
          <td colSpan={monthUnitNums.length + 6} className="p-2.5 font-black uppercase text-xs tracking-wider border-y border-slate-300 bg-slate-100 text-[#0D9488]">
            {title}
          </td>
        </tr>
        {filteredPlayers.map((player, idx) => {
          const record = attendance.find(a => a.playerId === player.id);
          const sessionsData = record?.sessions || {};
          let attended = 0;
          let relevant = 0;
          monthUnitNums.forEach(num => {
            const st = sessionsData[num];
            if (st) {
              relevant++;
              if (st === 'x') attended++;
            }
          });
          const quote = relevant > 0 ? ((attended / relevant) * 100).toFixed(1) + ' %' : '0.0 %';

          return (
            <tr key={player.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 bg-white text-[#0F172A]">
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B] font-bold">{idx + 1}</td>
              <td className="p-2 border-r border-slate-200 font-bold text-[#0F172A]">{player.lastName}</td>
              <td className="p-2 border-r border-slate-200 text-center uppercase text-[#0D9488] font-black">{player.position}</td>
              <td className="p-2 border-r border-slate-200 text-center text-[#64748B] font-bold">{player.number || player.nummer}</td>
              <td className="p-2 border-r border-slate-200 text-center font-black text-[#10B981]">{attended}</td>
              <td className="p-2 border-r border-slate-200 text-center font-bold text-[#0F172A]">{quote}</td>
              {monthUnitNums.map(num => {
                const status = sessionsData[num] || '';
                return (
                  <td key={num} className="p-0.5 border-r border-slate-200 text-center min-w-[32px] hover:bg-slate-100 transition-colors">
                    <div
                      className={`w-full h-full min-h-[26px] flex items-center justify-center cursor-pointer rounded text-[11px] font-black select-none transition-all ${getStatusColor(status)}`}
                      onClick={() => handleCellClick(player.id, num, status)}
                    >
                      {status}
                    </div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A1A1A] border-2 border-[#2A2A2A] p-3.5 shadow-2xl text-xs font-bold font-sans rounded-xl text-[#F5F5F5]">
          <p className="font-black uppercase border-b border-[#2A2A2A] pb-1 mb-1 text-[#FFD54F]">{data.lastName}</p>
          <p className="text-[#C7C7C7]">Kumulierte Belastung: <span className="font-black text-[#F5F5F5]">{data.load} Pkt.</span></p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1 border-t border-dashed border-[#2A2A2A] pt-1 text-[10px]">
            <p className="text-[#00D47A]">Anwesend: <span className="font-bold text-[#F5F5F5]">{data.attended}</span></p>
            <p className="text-[#00C2A8]">Lehrgang: <span className="font-bold text-[#F5F5F5]">{data.course}</span></p>
            <p className="text-[#FB7185]">Verletzt: <span className="font-bold text-[#F5F5F5]">{data.injured}</span></p>
            <p className="text-[#60A5FA]">Entschuldigt: <span className="font-bold text-[#F5F5F5]">{data.excused}</span></p>
            <p className="text-[#FF4C4C]">Unentschuldigt: <span className="font-bold text-[#F5F5F5]">{data.unexcused}</span></p>
            <p className="text-[#FACC15]">Krank: <span className="font-bold text-[#F5F5F5]">{data.sick}</span></p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Compute chart data
  const chartData = React.useMemo(() => {
    const squadPlayers = players.filter(p => {
      const cat = (p.category || 'player').toLowerCase();
      return cat === 'player' || cat === 'spieler';
    });
    const filteredByPos = squadPlayers.filter(p => {
      if (posFilter === 'all') return true;
      return getPositionCategory(p.position) === posFilter;
    });

    return filteredByPos.map(player => {
      const record = attendance.find(a => a.playerId === player.id);
      let totalLoad = 0;
      let countAttended = 0;
      let countExcused = 0;
      let countUnexcused = 0;
      let countSick = 0;
      let countPrivate = 0;
      let countCourse = 0;
      let countInjured = 0;

      for (let s = startSession; s <= endSession; s++) {
        const status = (record?.sessions && record.sessions[s]) || (record as any)?.[`sessions.${s}`] || '';
        
        if (status === 'x') {
          totalLoad += 100;
          countAttended++;
        } else if (status === 'L') {
          totalLoad += 80;
          countCourse++;
        } else if (status === 'v') {
          totalLoad += 30;
          countInjured++;
        } else if (status === 'e') {
          countExcused++;
        } else if (status === 'u') {
          countUnexcused++;
        } else if (status === 'k') {
          countSick++;
        } else if (status === 'P') {
          countPrivate++;
        }
      }

      return {
        id: player.id,
        name: `${player.lastName || ''} (${player.number || player.nummer || '#'})`,
        lastName: player.lastName || '',
        load: totalLoad,
        attended: countAttended,
        excused: countExcused,
        unexcused: countUnexcused,
        sick: countSick,
        private: countPrivate,
        course: countCourse,
        injured: countInjured
      };
    }).sort((a, b) => b.load - a.load);
  }, [players, attendance, startSession, endSession, posFilter]);

  const dashboardStats = React.useMemo(() => {
    if (chartData.length === 0) {
      return { 
        max: 0, min: 0, avg: 0, topPerformer: 'Keine', 
        highCount: 0, medCount: 0, lowCount: 0, maxPossibleLoad: 100, totalSessions: 1 
      };
    }
    
    const loads = chartData.map(d => d.load);
    const sum = loads.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / chartData.length);
    const max = Math.max(...loads);
    const min = Math.min(...loads);
    
    const topPlayers = chartData.filter(d => d.load === max).map(d => d.lastName);
    const topPerformer = topPlayers.length > 0 ? topPlayers.join(', ') : 'Keine';
    
    const totalSessions = Math.max(1, endSession - startSession + 1);
    const maxPossibleLoad = totalSessions * 100;
    
    let highCount = 0;
    let medCount = 0;
    let lowCount = 0;
    
    chartData.forEach(d => {
      const pct = (d.load / maxPossibleLoad) * 100;
      if (pct >= 75) highCount++;
      else if (pct >= 40) medCount++;
      else lowCount++;
    });
    
    return {
      max,
      min,
      avg,
      topPerformer,
      highCount,
      medCount,
      lowCount,
      maxPossibleLoad,
      totalSessions
    };
  }, [chartData, startSession, endSession]);

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[#0A0E17] text-[#F8FAFC] p-2 sm:p-4 rounded-2xl border border-[#334155] shadow-xl overflow-hidden min-h-screen">
      <div className="p-4 border border-[#334155] bg-[#121824] text-[#F8FAFC] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center mb-3 shadow-md gap-3 w-full max-w-full">
        <div className="flex items-center gap-6 flex-wrap w-full max-w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-black uppercase text-sm sm:text-base tracking-wider text-[#F8FAFC]">Trainingsbeteiligung</h3>
            
            {/* View Mode Switcher */}
            <div className="flex bg-[#1E293B] p-1 rounded-xl border border-[#334155]">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3.5 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'table' ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'}`}
              >
                <Users size={12} /> Tabelle
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3.5 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'chart' ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'}`}
              >
                <BarChart2 size={12} /> Belastungsanalyse
              </button>
              <button
                onClick={() => setViewMode('months')}
                className={`px-3.5 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'months' ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'}`}
              >
                <ListChecks size={12} /> Monatsauswertung
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-3.5 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center gap-1.5 ${viewMode === 'month' ? 'bg-[#10B981] text-white font-black shadow-md border border-[#10B981]' : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155]'}`}
              >
                <Calendar size={12} /> Monat
              </button>
            </div>
          </div>

          {viewMode === 'table' && (
            <div className="text-[11px] font-bold uppercase text-[#F8FAFC] flex gap-2 flex-wrap items-center">
              {/* Standout Legend Badge */}
              <span className="px-3 py-1 rounded-md bg-[#10B981]/20 text-[#10B981] font-black border border-[#10B981]/40 text-[11px] tracking-wider flex items-center gap-1.5 shrink-0">
                ★ LEGEND HIGHLIGHT
              </span>
              <span className="flex items-center gap-1 bg-white text-[#000000] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#000000] font-black text-[11px]">x</span>
                <span className="text-[#000000] font-extrabold text-[10px]">=Anwesend</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#D97706] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#D97706] font-black text-[11px]">Lg</span>
                <span className="text-[#D97706] font-extrabold text-[10px]">=Legend</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#2563EB] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#2563EB] font-black text-[11px]">e</span>
                <span className="text-[#2563EB] font-extrabold text-[10px]">=Entschuldigt</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#DC2626] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#DC2626] font-black text-[11px]">u</span>
                <span className="text-[#DC2626] font-extrabold text-[10px]">=Unentschuldigt</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#CA8A04] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#CA8A04] font-black text-[11px]">k</span>
                <span className="text-[#CA8A04] font-extrabold text-[10px]">=Krank</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#9333EA] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#9333EA] font-black text-[11px]">P</span>
                <span className="text-[#9333EA] font-extrabold text-[10px]">=Privat</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#0D9488] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#0D9488] font-black text-[11px]">L</span>
                <span className="text-[#0D9488] font-extrabold text-[10px]">=Lehrgang</span>
              </span>
              <span className="flex items-center gap-1 bg-white text-[#E11D48] px-2.5 py-1 rounded-md border border-slate-300 font-black">
                <span className="text-[#E11D48] font-black text-[11px]">v</span>
                <span className="text-[#E11D48] font-extrabold text-[10px]">=Verletzt</span>
              </span>
              <span className="ml-2 text-[#94A3B8] italic text-[10px]">(Klick zum Durchschalten • Rechtsklick für Auswahl)</span>
            </div>
          )}
        </div>
        {isEditing && (
          <div className="flex items-center gap-2">
            {onClearRangeSessions && (
              <div className="flex gap-2">
                <button 
                  onClick={() => onClearRangeSessions(1, 54)}
                  className="bg-[#1E293B] hover:bg-[#334155] text-rose-400 border border-rose-800/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-sm"
                  title="Die ersten 54 Einheiten löschen"
                >
                  <Trash2 size={14} /> 1-54
                </button>
                {onClearAllSessions && (
                  <button 
                    onClick={onClearAllSessions}
                    className="bg-[#202020] hover:bg-[#2A2A2A] text-rose-400 border border-rose-800/80 px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 shadow-sm"
                    title="Alle Einheiten löschen"
                  >
                    <Trash2 size={14} /> ALLE
                  </button>
                )}
              </div>
            )}
            <button 
              onClick={onAddPlayer}
              className="bg-[#FFD54F] hover:bg-[#FFE082] text-[#0F0F0F] px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 shadow-md border border-[#FFD54F]"
            >
              <Plus size={14} /> HINZUFÜGEN
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CROSS-TAB: ANWESENHEIT ↔ BELASTUNG ↔ VERLETZUNG              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-[#0A1628] border border-[#38BDF8]/30 rounded-xl p-3 mb-3 shadow-lg">
        <div className="text-[8px] font-black uppercase text-[#38BDF8] tracking-widest mb-2">Anwesenheits-Analyse mit Belastungs- & Verletzungs-Verknüpfung</div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(() => {
            const totalPlayers = players.filter((p: any) => p.category === 'player').length;
            const injured = players.filter((p: any) => p.category === 'player' && p.isInjured).length;
            const highLoad = players.filter((p: any) => p.category === 'player' && (p.trackerAnalysis?.workloadIndex || 0) > 800).length;
            const gelb = players.filter((p: any) => p.category === 'player' && p.loadAmpel === 'Gelb').length;
            const rot = players.filter((p: any) => p.category === 'player' && p.loadAmpel === 'Rot').length;
            return [
              { label: 'Gesamtkader', value: `${totalPlayers}`, color: 'text-[#F8FAFC] bg-[#1E293B]' },
              { label: 'Verletzt', value: `${injured}`, color: injured > 0 ? 'text-[#EF4444] bg-[#EF4444]/10' : 'text-[#10B981] bg-[#10B981]/10' },
              { label: 'Hohe Belastung', value: `${highLoad}`, color: highLoad > 3 ? 'text-[#F59E0B] bg-[#F59E0B]/10' : 'text-[#64748B] bg-[#1E293B]' },
              { label: 'Ampel Gelb', value: `${gelb}`, color: 'text-[#F59E0B] bg-[#F59E0B]/10' },
              { label: 'Ampel Rot', value: `${rot}`, color: rot > 0 ? 'text-[#EF4444] bg-[#EF4444]/10' : 'text-[#64748B] bg-[#1E293B]' },
            ].map((item, i) => (
              <div key={i} className={`rounded-lg p-2 text-center border border-[#1E293B] ${item.color}`}>
                <div className="text-[7px] font-bold uppercase opacity-70">{item.label}</div>
                <div className="text-sm font-black">{item.value}</div>
              </div>
            ));
          })()}
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="flex-1 overflow-auto custom-scrollbar bg-white border border-slate-200 rounded-xl shadow-md">
          <table className="w-full border-collapse text-[10px] font-bold bg-white">
            <thead className="sticky top-0 bg-[#F1F5F9] text-[#0F172A] z-20 border-b-2 border-slate-300">
              <tr>
                <th className="p-2.5 border-r border-b border-slate-200 text-left w-10 text-[#64748B] font-bold">Nr</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-left w-48 text-[#0F172A] font-black">Spieler (Nachname)</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#0D9488] font-black">Pos</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#64748B] font-bold">Rück.Nr</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#0F172A] font-bold">Gesamt</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#64748B] font-medium">Vor.</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#64748B] font-medium">Rück.</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-16 text-[#10B981] font-black">Quote</th>
                {isEditing && <th className="p-2.5 border-r border-b border-slate-200 text-center w-20 text-rose-600 font-black">Aktion</th>}
                {sessions.map(num => {
                  const meta = unitMetaMap.get(num);
                  return (
                    <th key={num} className="p-1 border-r border-b border-slate-200 text-center w-8 min-w-[32px] text-[#0F172A] align-bottom">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => openUnitEditor(num)}
                          disabled={!isEditing}
                          title={meta
                            ? `EH ${num} · ${meta.date ? meta.date.split('T')[0] : 'kein Datum'} · ${meta.focus || 'kein Thema'} – bearbeiten`
                            : `EH ${num} bearbeiten (Datum/Thema/Trainer/Belastung)`}
                          className={`flex items-center justify-center gap-0.5 font-black ${isEditing ? 'hover:text-[#0D9488] cursor-pointer' : 'cursor-default'} transition-colors`}
                        >
                          <span>{num}</span>
                          {isEditing && <Pencil size={9} className="text-[#0D9488]" />}
                        </button>
                        {meta?.date && (
                          <span className="text-[7px] font-bold text-[#64748B] leading-tight">
                            {meta.date.split('T')[0].slice(5).split('-').reverse().join('.')}
                          </span>
                        )}
                        {isEditing && (
                          <button
                            onClick={() => onClearSession(num)}
                            className="text-rose-500 hover:text-rose-700 transition-colors"
                            title="Spalte leeren"
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {renderTableSection('Spielerkader', 'player')}
              {renderTableSection('Trainerteam', 'coach')}
              {renderTableSection('Funktionsteam (Leitung / Betreuung)', 'staff')}
              {renderTableSection('Medizinische Abteilung (Physio / Arzt)', 'medical')}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'month' ? (
        <div className="flex-1 overflow-auto custom-scrollbar bg-white border border-slate-200 rounded-xl shadow-md">
          <div className="px-3 py-2 bg-[#F1F5F9] border-b border-slate-200 text-[10px] font-bold text-[#64748B] flex items-center gap-2 flex-wrap">
            <button
              onClick={() => prevMonth && setMonthKey(prevMonth)}
              disabled={!prevMonth}
              className={`px-2 py-1 rounded border border-slate-300 transition-colors ${prevMonth ? 'hover:bg-slate-200 text-[#0F172A]' : 'text-slate-300 cursor-not-allowed'}`}
            >◀</button>
            <span className="font-black uppercase text-[#0D9488] text-xs min-w-[120px] text-center">{monthLabel(monthKey)}</span>
            <button
              onClick={() => nextMonth && setMonthKey(nextMonth)}
              disabled={!nextMonth}
              className={`px-2 py-1 rounded border border-slate-300 transition-colors ${nextMonth ? 'hover:bg-slate-200 text-[#0F172A]' : 'text-slate-300 cursor-not-allowed'}`}
            >▶</button>
            <select
              value={monthKey}
              onChange={e => setMonthKey(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1 bg-white text-[#0F172A] font-bold"
            >
              {seasonMonths.map(k => <option key={k} value={k}>{monthLabel(k)}</option>)}
            </select>
            <span>Team im Monat: <span className="font-black text-[#0F172A]">{monthUnitNums.length} Einheiten</span></span>
            {monthKey === '2026-12' && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-black">bis 15.12. – dann Winterpause</span>}
            {monthKey === '2027-01' && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-black">Winterpause</span>}
            {isEditing && (
              <button
                onClick={handleAddUnit}
                className="ml-auto bg-[#0D9488] hover:bg-[#0F766E] text-white px-3 py-1.5 rounded-lg font-black uppercase tracking-wider flex items-center gap-1 shadow-sm"
              >
                <Plus size={12} /> Einheit
              </button>
            )}
          </div>
          <table className="w-full border-collapse text-[10px] font-bold bg-white">
            <thead className="sticky top-0 bg-[#F1F5F9] text-[#0F172A] z-20 border-b-2 border-slate-300">
              <tr>
                <th className="p-2.5 border-r border-b border-slate-200 text-left w-10 text-[#64748B] font-bold">Nr</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-left w-48 text-[#0F172A] font-black">Spieler (Nachname)</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#0D9488] font-black">Pos</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-12 text-[#64748B] font-bold">Rück.Nr</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-16 text-[#10B981] font-black">Anwesend</th>
                <th className="p-2.5 border-r border-b border-slate-200 text-center w-16 text-[#0F172A] font-black">Quote</th>
                {monthUnitNums.map(num => {
                  const meta = unitMetaMap.get(num);
                  return (
                    <th key={num} className="p-1 border-r border-b border-slate-200 text-center w-8 min-w-[32px] text-[#0F172A] align-bottom">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => openUnitEditor(num)}
                          disabled={!isEditing}
                          title={meta
                            ? `EH ${num} · ${meta.date ? meta.date.split('T')[0] : 'kein Datum'} · ${meta.focus || 'kein Thema'}`
                            : `EH ${num}`}
                          className={`font-black ${isEditing ? 'hover:text-[#0D9488] cursor-pointer' : 'cursor-default'} transition-colors`}
                        >{num}</button>
                        {meta?.date && (
                          <span className="text-[7px] font-bold text-[#64748B] leading-tight">
                            {meta.date.split('T')[0].slice(5).split('-').reverse().join('.')}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {monthUnitNums.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-[#64748B] italic">
                    Keine Einheiten in {monthLabel(monthKey)}{monthKey === '2027-01' || monthKey === '2026-12' ? ' (Winterpause)' : ''}.
                  </td>
                </tr>
              ) : (
                <>
                  {renderMonthSection('Spielerkader', 'player')}
                  {renderMonthSection('Trainerteam', 'coach')}
                  {renderMonthSection('Funktionsteam (Leitung / Betreuung)', 'staff')}
                  {renderMonthSection('Medizinische Abteilung (Physio / Arzt)', 'medical')}
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : viewMode === 'chart' ? (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-[#0F0F0F] custom-scrollbar text-[#F5F5F5]">
          {/* Controls Box */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <Calendar size={14} className="text-[#FFD54F]" /> Zeitraum (Einheiten)
              </label>
              <select
                value={rangePreset}
                onChange={(e) => setRangePreset(e.target.value)}
                className="w-full border border-[#2A2A2A] p-2.5 font-bold focus:outline-none focus:border-[#FFD54F] bg-[#202020] text-[#F5F5F5] rounded-lg uppercase text-[11px]"
              >
                <option value="all">Gesamte Saison (6-120)</option>
                <option value="vorrunde">Vorrunde (6-60)</option>
                <option value="rueckrunde">Rückrunde (61-120)</option>
                <option value="last10">Letzte 10 Einheiten</option>
                <option value="last20">Letzte 20 Einheiten</option>
                <option value="custom">Individueller Bereich (Slider)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <User size={14} className="text-[#FFD54F]" /> Positionsgruppe
              </label>
              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                className="w-full border border-[#2A2A2A] p-2.5 font-bold focus:outline-none focus:border-[#FFD54F] bg-[#202020] text-[#F5F5F5] rounded-lg uppercase text-[11px]"
              >
                <option value="all">Alle Spieler</option>
                <option value="Torwart">Torwart (TW)</option>
                <option value="Abwehr">Abwehr (ABW)</option>
                <option value="Mittelfeld">Mittelfeld (MF)</option>
                <option value="Angriff">Angriff (ANG)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-black uppercase tracking-wider text-[#F5F5F5] flex items-center gap-1.5">
                <Activity size={14} className="text-[#FFD54F]" /> Diagramm-Typ
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as 'vertical' | 'horizontal')}
                className="w-full border border-[#2A2A2A] p-2.5 font-bold focus:outline-none focus:border-[#FFD54F] bg-[#202020] text-[#F5F5F5] rounded-lg uppercase text-[11px]"
              >
                <option value="vertical">Balkendiagramm (Vertikal)</option>
                <option value="horizontal">Säulendiagramm (Horizontal)</option>
              </select>
            </div>

            {rangePreset === 'custom' ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="font-bold uppercase text-[9px] text-[#C7C7C7]">Von: {startSession}</span>
                  <input
                    type="range"
                    min={6}
                    max={endSession}
                    value={startSession}
                    onChange={(e) => setStartSession(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#202020] rounded-lg appearance-none cursor-pointer accent-[#FFD54F]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-bold uppercase text-[9px] text-[#C7C7C7]">Bis: {endSession}</span>
                  <input
                    type="range"
                    min={startSession}
                    max={120}
                    value={endSession}
                    onChange={(e) => setEndSession(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#202020] rounded-lg appearance-none cursor-pointer accent-[#FFD54F]"
                  />
                </div>
              </div>
            ) : (
              <div className="p-2.5 border border-dashed border-[#2A2A2A] rounded-lg text-center text-[#C7C7C7] font-bold uppercase text-[10px] bg-[#202020]">
                Einheiten {startSession} bis {endSession} ({dashboardStats.totalSessions} Einheiten)
              </div>
            )}
          </div>

          {/* Stats Summary Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md flex items-center gap-4">
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg text-[#FFD54F]">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#C7C7C7] tracking-wider">Kader-Schnitt</p>
                <p className="text-lg font-black text-[#F5F5F5]">{dashboardStats.avg} Pkt.</p>
                <p className="text-[9px] text-[#C7C7C7] font-bold uppercase">v. max. {dashboardStats.maxPossibleLoad} Pkt.</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md flex items-center gap-4">
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg text-[#00D47A]">
                <TrendingUp size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase text-[#C7C7C7] tracking-wider">Höchste Belastung</p>
                <p className="text-base font-black truncate text-[#00D47A]" title={dashboardStats.topPerformer}>
                  {dashboardStats.topPerformer}
                </p>
                <p className="text-[9px] text-[#C7C7C7] font-bold uppercase">Wert: {dashboardStats.max} Pkt.</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md flex items-center gap-4">
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg text-[#FFD54F]">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#C7C7C7] tracking-wider">Aktive Spieler</p>
                <p className="text-lg font-black text-[#F5F5F5]">{chartData.length}</p>
                <p className="text-[9px] text-[#C7C7C7] font-bold uppercase">im Filterbereich</p>
              </div>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md flex items-center gap-4">
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg text-[#60A5FA]">
                <Shield size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-[#C7C7C7] tracking-wider">Belastungszonen</p>
                <div className="flex gap-2 mt-0.5 font-bold text-[10px]">
                  <span className="text-[#FF4C4C]" title="Hoch (>75%)">H: {dashboardStats.highCount}</span>
                  <span className="text-[#FACC15]" title="Mittel (40%-75%)">M: {dashboardStats.medCount}</span>
                  <span className="text-[#00D47A]" title="Gering (<40%)">G: {dashboardStats.lowCount}</span>
                </div>
                <p className="text-[9px] text-[#C7C7C7] font-bold uppercase">Grenzwerte (% v. Max)</p>
              </div>
            </div>
          </div>

          {/* Chart Board */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 md:p-6 rounded-xl shadow-md flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-3">
              <h4 className="font-black uppercase tracking-wider text-xs flex items-center gap-2 text-[#F5F5F5]">
                <BarChart2 size={16} className="text-[#FFD54F]" /> Kumulierte Belastungs-Kurve
              </h4>
              <span className="font-mono text-[9px] bg-[#202020] text-[#FFD54F] border border-[#2A2A2A] px-2.5 py-1 rounded-lg uppercase font-bold">
                Einheiten {startSession} - {endSession}
              </span>
            </div>

            <div className="w-full h-[450px]">
              {chartData.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-[#2A2A2A] text-[#C7C7C7] font-bold uppercase text-xs gap-2">
                  <Info size={24} className="text-[#C7C7C7]" />
                  Keine Daten im aktuellen Filterbereich verfügbar
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'vertical' ? (
                    <BarChart
                      data={chartData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 30, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#2A2A2A" />
                      <XAxis 
                        type="number" 
                        domain={[0, dashboardStats.maxPossibleLoad]} 
                        tick={{ fontSize: 9, fontWeight: 'bold', fill: '#C7C7C7' }}
                        tickFormatter={(val) => `${val} P`}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={140}
                        interval={0}
                        tick={{ fontSize: 9, fontWeight: 'black', fill: '#F5F5F5' }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="load" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => {
                          const maxPossible = dashboardStats.maxPossibleLoad;
                          const pct = (entry.load / maxPossible) * 100;
                          let fill = '#00D47A'; // green
                          if (pct >= 75) fill = '#FF4C4C'; // red
                          else if (pct >= 40) fill = '#FACC15'; // yellow
                          
                          return <Cell key={`cell-${index}`} fill={fill} stroke="#2A2A2A" strokeWidth={1} />;
                        })}
                      </Bar>
                    </BarChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke="#2A2A2A" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 9, fontWeight: 'black', fill: '#F5F5F5', angle: -45, textAnchor: 'end' }}
                        interval={0}
                        height={70}
                      />
                      <YAxis 
                        type="number" 
                        domain={[0, dashboardStats.maxPossibleLoad]}
                        tick={{ fontSize: 9, fontWeight: 'bold', fill: '#C7C7C7' }}
                        tickFormatter={(val) => `${val} P`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="load" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => {
                          const maxPossible = dashboardStats.maxPossibleLoad;
                          const pct = (entry.load / maxPossible) * 100;
                          let fill = '#00D47A'; // green
                          if (pct >= 75) fill = '#FF4C4C'; // red
                          else if (pct >= 40) fill = '#FACC15'; // yellow
                          
                          return <Cell key={`cell-${index}`} fill={fill} stroke="#2A2A2A" strokeWidth={1} />;
                        })}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Load Model Explanation Info */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] p-4 rounded-xl shadow-md text-xs flex flex-col gap-2 text-[#F5F5F5]">
            <h5 className="font-black uppercase text-[#FFD54F] tracking-wider flex items-center gap-1.5 border-b border-[#2A2A2A] pb-1.5">
              <Info size={14} className="text-[#FFD54F]" /> Wissenschaftliches Belastungsmodell
            </h5>
            <p className="text-[#C7C7C7] leading-relaxed">
              Die kumulierte Belastung wird tagesaktuell anhand der Anwesenheits- und Verbandstätigkeiten der Spieler berechnet. Verschiedene Statusmeldungen fließen mit unterschiedlichen Intensitätsfaktoren (Load Units) in die Berechnung ein:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-bold mt-1 text-[11px]">
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg flex justify-between items-center">
                <span className="text-[#F5F5F5]">Anwesend (x)</span>
                <span className="text-[#00D47A] font-black">100% (100 Pkt / EH)</span>
              </div>
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg flex justify-between items-center">
                <span className="text-[#F5F5F5]">Lehrgang (L)</span>
                <span className="text-[#2DD4BF] font-black">80% (80 Pkt / EH)</span>
              </div>
              <div className="p-2.5 bg-[#202020] border border-[#2A2A2A] rounded-lg flex justify-between items-center">
                <span className="text-[#F5F5F5]">Verletzt (v)</span>
                <span className="text-[#FB7185] font-black">30% (30 Pkt / EH)</span>
              </div>
            </div>
            <p className="text-[10px] text-[#C7C7C7]/70 italic mt-1 font-bold">
              * Entschuldigte Fehltage (e), Unentschuldigt (u), Krank (k) und Privat (P) werden mit 0 Load Units verbucht, da keine physische Belastung im Mannschaftstraining stattfindet.
            </p>
          </div>
        </div>
      ) : (
        <AttendanceMonthsView
          players={players}
          attendance={attendance}
          onUpdateAttendance={onUpdateAttendance}
          isEditing={isEditing}
        />
      )}

      {/* EINHEIT BEARBEITEN MODAL */}
      {editUnitNum !== null && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-black uppercase text-sm flex items-center gap-2 text-[#F8FAFC]">
                <Pencil size={16} className="text-[#FFD54F]" /> Einheit EH #{editUnitNum} bearbeiten
              </h4>
              <button onClick={() => setEditUnitNum(null)} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Einheit Nummer (EH #)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                  value={unitForm.sessionNum}
                  onChange={e => setUnitForm(prev => ({ ...prev, sessionNum: e.target.value }))}
                  title="Nummer ändern verschiebt auch alle Anwesenheiten auf die neue EH"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Datum</label>
                  <input
                    type="date"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={unitForm.date ? unitForm.date.split('T')[0] : ''}
                    onChange={e => setUnitForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Uhrzeit</label>
                  <input
                    type="time"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={unitForm.time}
                    onChange={e => setUnitForm(prev => ({ ...prev, time: e.target.value }))}
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
                    value={unitForm.duration}
                    onChange={e => setUnitForm(prev => ({ ...prev, duration: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Trainer</label>
                  <input
                    type="text"
                    placeholder="Trainername"
                    className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                    value={unitForm.trainer}
                    onChange={e => setUnitForm(prev => ({ ...prev, trainer: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Belastungsstufe</label>
                <select
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                  value={unitForm.loadLevel}
                  onChange={e => setUnitForm(prev => ({ ...prev, loadLevel: e.target.value }))}
                >
                  {['Niedrig', 'Mittel', 'Hoch', 'Sehr Hoch'].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-[#7E9BB5] mb-1">Thema / Schwerpunkt</label>
                <input
                  type="text"
                  placeholder="z.B. Ballbesitz, Umschalten, Standards"
                  className="w-full bg-[#0A0E17] border border-[#334155] rounded px-2 py-2 text-[11px] text-[#F8FAFC] focus:border-[#FFD54F] focus:outline-none"
                  value={unitForm.focus}
                  onChange={e => setUnitForm(prev => ({ ...prev, focus: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveUnitMetaForm}
                  className="flex-1 bg-[#10B981] hover:bg-[#059669] text-white font-black uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} /> Speichern
                </button>
                <button
                  onClick={deleteEditUnit}
                  className="flex-1 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-black uppercase text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> Löschen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
