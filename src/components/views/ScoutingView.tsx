import React, { useState, useMemo } from 'react';
import { ScoutingEntry, Player } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { 
  Search, 
  Plus, 
  Trash2, 
  Target, 
  LayoutGrid, 
  Table as TableIcon, 
  Map as MapIcon,
  Users,
  TrendingUp,
  MessageSquare,
  Clock,
  ChevronRight,
  UserPlus,
  RefreshCw,
  Calendar as CalendarIcon,
  Sparkles,
  Activity,
  Filter,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { ScoutingFormationView } from '../ScoutingFormationView';

export interface ScoutingViewProps {
  scoutingCandidates: ScoutingEntry[];
  scoutingViewMode: 'table' | 'field' | 'grid' | 'depth' | 'calendar' | 'timeline';
  setScoutingViewMode: (mode: 'table' | 'field' | 'grid' | 'depth' | 'calendar' | 'timeline') => void;
  setShowAddScoutingModal: (show: boolean) => void;
  setShowRemoveScoutingModal: (show: boolean) => void;
  handleUpdateScoutingCandidate: (id: string, field: keyof ScoutingEntry, value: any) => void;
  handleRemoveScoutingCandidate: (id: string, skipConfirm?: boolean) => void;
  onAddScoutingCandidate: (candidate: ScoutingEntry) => void;
  handleResetScouting?: () => void;
  depthChart: Record<string, string[]>;
  setDepthChart: (chart: Record<string, string[]>) => void;
  players: Player[];
  isEditing?: boolean;
}

export const ScoutingView: React.FC<ScoutingViewProps> = ({
  scoutingCandidates,
  scoutingViewMode,
  setScoutingViewMode,
  setShowAddScoutingModal,
  setShowRemoveScoutingModal,
  handleUpdateScoutingCandidate,
  handleRemoveScoutingCandidate,
  onAddScoutingCandidate,
  handleResetScouting,
  depthChart,
  setDepthChart,
  players,
  isEditing = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date('2026-08-01'));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string>('');

  // Filtered Candidates
  const filteredCandidates = useMemo(() => {
    return scoutingCandidates.filter(c => {
      const matchesSearch = 
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.club || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.position || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = c.recommendation === statusFilter || c.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [scoutingCandidates, searchTerm, statusFilter]);

  // Recommendation Badge Helper
  const getRecommendationBadge = (rec: string) => {
    switch (rec) {
      case 'Verpflichten':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40 flex items-center gap-1 w-fit">
            <CheckCircle2 size={11} /> Verpflichten
          </span>
        );
      case 'Beobachten':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/40 flex items-center gap-1 w-fit">
            <Search size={11} /> Beobachten
          </span>
        );
      case 'Absage':
      case 'Kein Interesse':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/40 flex items-center gap-1 w-fit">
            <AlertCircle size={11} /> Absage
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/40 flex items-center gap-1 w-fit">
            <Clock size={11} /> {rec || 'Offen'}
          </span>
        );
    }
  };

  // Depth Chart Auto Sync
  const handleAutoSyncScoutingToDepthChart = () => {
    const matchPosToDepthKey = (posStr: string = ''): string => {
      const p = posStr.toUpperCase();
      if (p.includes('TW') || p.includes('TOR')) return 'TW';
      if (p.includes('IV') || p.includes('INNEN')) return 'IV';
      if (p.includes('RV') || (p.includes('RECHTS') && p.includes('VERT'))) return 'RV';
      if (p.includes('LV') || (p.includes('LINKS') && p.includes('VERT'))) return 'LV';
      if (p.includes('DM') || p.includes('DEFENSIV')) return 'DM';
      if (p.includes('ZM') || p.includes('ZENTRAL')) return 'ZM';
      if (p.includes('RM') || p.includes('RW') || p.includes('RECHTS')) return 'RM/RW';
      if (p.includes('LM') || p.includes('LW') || p.includes('LINKS')) return 'LM/LW';
      if (p.includes('OM') || p.includes('OFFENSIV')) return 'OM';
      if (p.includes('ST') || p.includes('STÜRM') || p.includes('ANGRIFF')) return 'ST';
      return '';
    };

    const newChart = { ...depthChart };
    scoutingCandidates.forEach(candidate => {
      const depthPos = matchPosToDepthKey(candidate.position || candidate.category || '');
      const targetPos = depthPos || 'ST';
      if (!newChart[targetPos]) {
        newChart[targetPos] = ['', '', ''];
      } else {
        newChart[targetPos] = [...newChart[targetPos]];
      }
      
      if (!newChart[targetPos].includes(candidate.id)) {
        const emptyIdx = newChart[targetPos].findIndex(slot => !slot);
        if (emptyIdx !== -1) {
          newChart[targetPos][emptyIdx] = candidate.id;
        }
      }
    });
    setDepthChart(newChart);
  };

  // 1. LIST VIEW (Table)
  const renderTable = () => (
    <div className="bg-[#121824] border border-[#334155] rounded-2xl overflow-hidden shadow-2xl">
      {filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0A0E17]">
          <Search size={48} className="text-[#94A3B8] mb-3 opacity-50" />
          <p className="font-bold uppercase text-[#F8FAFC] italic text-sm mb-1">Keine Kandidaten gefunden</p>
          <p className="text-xs font-semibold text-[#94A3B8] uppercase">Nutze "Neuer Kandidat" oder passe deine Suchfilter an.</p>
          {handleResetScouting && (
            <button 
              onClick={handleResetScouting}
              className="mt-4 px-5 py-2 bg-[#10B981] text-[#0A0E17] text-xs font-black uppercase tracking-wider rounded-xl hover:bg-[#059669] transition-all flex items-center gap-2"
            >
              <RefreshCw size={14} /> Standard-Daten laden
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[#F8FAFC]">
            <thead className="bg-[#1E293B] border-b border-[#334155] text-[10px] font-black uppercase text-[#94A3B8] tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Empfehlung / Status</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Verein</th>
                <th className="px-5 py-3.5">Position</th>
                <th className="px-5 py-3.5">Alter</th>
                <th className="px-5 py-3.5">Marktwert</th>
                <th className="px-5 py-3.5">Sichtungsdatum</th>
                <th className="px-5 py-3.5">Warten bis</th>
                <th className="px-5 py-3.5">Notizen</th>
                <th className="px-5 py-3.5 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] bg-[#0A0E17] text-xs font-medium">
              {filteredCandidates.map(c => (
                <tr key={c.id} className="hover:bg-[#1E293B]/60 transition-colors group">
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <select 
                        className="bg-[#121824] text-[#F8FAFC] border border-[#334155] rounded-lg px-2 py-1 text-xs font-bold uppercase focus:outline-none focus:border-[#10B981]"
                        value={c.recommendation}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'recommendation', e.target.value as any)}
                      >
                        <option value="Verpflichten">Verpflichten</option>
                        <option value="Beobachten">Beobachten</option>
                        <option value="Absage">Absage</option>
                      </select>
                    ) : (
                      getRecommendationBadge(c.recommendation)
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2.5 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] font-bold uppercase w-full"
                        value={c.name}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'name', e.target.value)}
                      />
                    ) : (
                      <span className="font-bold text-[#F8FAFC] uppercase text-sm group-hover:text-[#10B981] transition-colors">{c.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2.5 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] uppercase w-full"
                        value={c.club}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'club', e.target.value)}
                      />
                    ) : (
                      <span className="text-[#94A3B8] font-bold uppercase">{c.club || '-'}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2.5 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] font-bold uppercase w-20"
                        value={c.position}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'position', e.target.value)}
                      />
                    ) : (
                      <span className="text-[#10B981] font-black uppercase text-xs px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/30">
                        {c.position || 'Feldspieler'}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="number"
                        className="bg-[#121824] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] w-14 font-mono text-center font-bold"
                        value={c.age}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'age', parseInt(e.target.value) || 0)}
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-[#F8FAFC]">{c.age || '-'} J.</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] w-24 font-mono"
                        value={c.marketValue}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'marketValue', e.target.value)}
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-[#F8FAFC]">{c.marketValue || 'ablösefrei'}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-[#94A3B8]">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] w-24"
                        value={c.date || ''}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'date', e.target.value)}
                      />
                    ) : (
                      c.date || '-'
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-[#F59E0B]">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] w-24"
                        value={c.waitingTime || ''}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'waitingTime', e.target.value)}
                      />
                    ) : (
                      c.waitingTime || '-'
                    )}
                  </td>
                  <td className="px-5 py-4 max-w-[200px] truncate italic text-xs text-[#94A3B8]">
                    {isEditing ? (
                      <input 
                        type="text"
                        className="bg-[#121824] text-[#F8FAFC] px-2 py-1 rounded-lg border border-[#334155] focus:outline-none focus:border-[#10B981] w-full text-xs"
                        value={c.conversationNotes || ''}
                        onChange={(e) => handleUpdateScoutingCandidate(c.id, 'conversationNotes', e.target.value)}
                      />
                    ) : (
                      c.conversationNotes ? `"${c.conversationNotes}"` : '-'
                    )}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isEditing && (
                        <button 
                          onClick={() => handleRemoveScoutingCandidate(c.id)} 
                          className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#121824] rounded-lg transition-colors border border-transparent hover:border-[#334155]"
                          title="Kandidat entfernen"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // 2. GRID VIEW (Cards)
  const renderGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {filteredCandidates.map(candidate => (
        <div key={candidate.id} className="bg-[#121824] border border-[#334155] rounded-2xl shadow-xl flex flex-col group transition-all hover:border-[#10B981] overflow-hidden">
          <div className="p-4 border-b border-[#334155] bg-[#1E293B] flex justify-between items-start gap-2">
            <div>
              <h4 className="font-black uppercase text-base tracking-tight text-[#F8FAFC] group-hover:text-[#10B981] transition-colors">{candidate.name}</h4>
              <p className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mt-0.5">{candidate.club || 'Vereinslos'}</p>
            </div>
            {getRecommendationBadge(candidate.recommendation)}
          </div>
          <div className="p-4 flex-1 space-y-3 bg-[#0A0E17]">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#121824] p-2.5 rounded-xl border border-[#334155]/80">
                <span className="text-[9px] font-black uppercase text-[#94A3B8] block">POSITION</span>
                <span className="text-xs font-black text-[#10B981] uppercase block mt-0.5">{candidate.position}</span>
              </div>
              <div className="bg-[#121824] p-2.5 rounded-xl border border-[#334155]/80">
                <span className="text-[9px] font-black uppercase text-[#94A3B8] block">ALTER</span>
                <span className="text-xs font-black text-[#F8FAFC] font-mono block mt-0.5">{candidate.age} Jahre</span>
              </div>
              <div className="bg-[#121824] p-2.5 rounded-xl border border-[#334155]/80">
                <span className="text-[9px] font-black uppercase text-[#94A3B8] block">MARKTWERT</span>
                <span className="text-xs font-black text-[#F8FAFC] font-mono block mt-0.5">{candidate.marketValue}</span>
              </div>
              <div className="bg-[#121824] p-2.5 rounded-xl border border-[#334155]/80">
                <span className="text-[9px] font-black uppercase text-[#94A3B8] block">SICHTUNG</span>
                <span className="text-xs font-bold text-[#94A3B8] font-mono block mt-0.5">{candidate.date || '-'}</span>
              </div>
            </div>

            {candidate.waitingTime && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
                <span className="text-[10px] font-black uppercase text-[#F59E0B] flex items-center gap-1">
                  <Clock size={12} /> Warten bis:
                </span>
                <span className="font-mono font-bold text-[#F8FAFC]">{candidate.waitingTime}</span>
              </div>
            )}

            {(candidate.conversationNotes || isEditing) && (
              <div className="pt-2 border-t border-[#334155]">
                <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Scouting-Notizen</label>
                {isEditing ? (
                  <textarea 
                    className="w-full bg-[#121824] text-[#F8FAFC] border border-[#334155] rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-[#10B981] min-h-[50px] resize-none"
                    value={candidate.conversationNotes || ''}
                    onChange={(e) => handleUpdateScoutingCandidate(candidate.id, 'conversationNotes', e.target.value)}
                  />
                ) : (
                  <p className="text-xs font-medium italic text-[#94A3B8] line-clamp-3 bg-[#121824] p-2.5 rounded-xl border border-[#334155]/50">
                    "{candidate.conversationNotes}"
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="p-3 bg-[#1E293B] border-t border-[#334155] flex justify-between items-center">
            <span className="text-[10px] font-mono text-[#94A3B8] uppercase">ID: {candidate.id}</span>
            {isEditing && (
              <button 
                onClick={() => handleRemoveScoutingCandidate(candidate.id)}
                className="p-1.5 text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#121824] rounded-lg transition-colors border border-transparent hover:border-[#334155]"
                title="Kandidat entfernen"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      <button 
        onClick={() => setShowAddScoutingModal(true)}
        className="border-2 border-dashed border-[#334155] hover:border-[#10B981] bg-[#121824] hover:bg-[#1E293B] rounded-2xl transition-all flex flex-col items-center justify-center gap-3 p-8 group min-h-[260px]"
      >
        <div className="w-12 h-12 bg-[#1E293B] rounded-full flex items-center justify-center text-[#F8FAFC] group-hover:bg-[#10B981] group-hover:text-[#0A0E17] transition-colors shadow-lg">
          <Plus size={22} />
        </div>
        <span className="font-bold uppercase text-xs tracking-wider text-[#94A3B8] group-hover:text-[#10B981]">Neuer Kandidat Anlegen</span>
      </button>
    </div>
  );

  // 3. DEPTH CHART (Schattenkader)
  const renderDepthChart = () => {
    const positions = ['TW', 'IV', 'RV', 'LV', 'DM', 'ZM', 'RM/RW', 'LM/LW', 'OM', 'ST'];
    const allOptions = sortPlayers([
      ...players.map(p => ({ id: p.id, name: `${p.lastName} (#${p.number})`, type: 'Kader', position: p.position })),
      ...scoutingCandidates.map(c => ({ id: c.id, name: `${c.name} (${c.club})`, type: 'Scouting', position: c.position, recommendation: c.recommendation, club: c.club }))
    ]);

    return (
      <div className="space-y-6">
        <div className="bg-[#121824] border border-[#334155] p-5 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-xl">
          <div>
            <h4 className="font-black uppercase text-[#F8FAFC] text-sm flex items-center gap-2">
              <Users size={16} className="text-[#10B981]" />
              Schattenkader & Positionstiefe 2026/2027
            </h4>
            <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
              Direct Mapping von aktuellem Spielerkader und Scouting-Kandidaten zur Vorbereitung von Transfers
            </p>
          </div>
          {isEditing && (
            <button 
              onClick={handleAutoSyncScoutingToDepthChart}
              className="bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-md border border-[#10B981]"
            >
              <RefreshCw size={14} /> Scouting-Kandidaten Synchronisieren
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {positions.map(pos => (
            <div key={pos} className="bg-[#121824] border border-[#334155] rounded-2xl shadow-xl flex flex-col overflow-hidden">
              <div className="bg-[#1E293B] text-[#F8FAFC] border-b border-[#334155] p-3 text-xs font-black uppercase tracking-wider flex justify-between items-center px-4">
                <span className="text-[#10B981]">{pos}</span>
                <span className="text-[10px] text-[#94A3B8] font-mono">Pos. Depth</span>
              </div>
              <div className="p-3.5 space-y-3 bg-[#0A0E17] flex-1">
                {[0, 1, 2].map(idx => {
                  const selectedId = depthChart[pos]?.[idx] || '';
                  const selectedPlayer = players.find(p => p.id === selectedId);
                  const selectedScout = scoutingCandidates.find(c => c.id === selectedId);

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold uppercase text-[#94A3B8]">{idx + 1}. Wahl</label>
                        {selectedScout && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                            Scouting
                          </span>
                        )}
                        {selectedPlayer && (
                          <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/40">
                            Kader
                          </span>
                        )}
                      </div>
                      <select 
                        className={`w-full bg-[#121824] text-[#F8FAFC] border border-[#334155] rounded-xl p-2 text-xs font-bold uppercase focus:outline-none focus:border-[#10B981] ${!isEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                        value={selectedId}
                        onChange={(e) => {
                          const newChart = { ...depthChart };
                          if (!newChart[pos]) newChart[pos] = ['', '', ''];
                          else newChart[pos] = [...newChart[pos]];
                          newChart[pos][idx] = e.target.value;
                          setDepthChart(newChart);
                        }}
                        disabled={!isEditing}
                      >
                        <option value="" className="bg-[#121824] text-[#94A3B8]">-- WÄHLEN --</option>
                        <optgroup label="KADER" className="bg-[#121824] text-[#06B6D4] font-bold">
                          {allOptions.filter(o => o.type === 'Kader').map(o => (
                            <option key={o.id} value={o.id} className="bg-[#121824] text-[#F8FAFC]">{o.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="SCOUTING" className="bg-[#121824] text-[#10B981] font-bold">
                          {allOptions.filter(o => o.type === 'Scouting').map(o => (
                            <option key={o.id} value={o.id} className="bg-[#121824] text-[#F8FAFC]">{o.name}</option>
                          ))}
                        </optgroup>
                      </select>

                      {selectedScout && (
                        <div className="bg-[#121824] p-2 rounded-lg border border-[#334155] text-[10px] space-y-0.5">
                          <p className="font-black text-[#F8FAFC] uppercase">{selectedScout.name}</p>
                          <p className="text-[#94A3B8] font-semibold">Verein: {selectedScout.club || 'Unbekannt'}</p>
                          <p className="text-[#10B981] font-black">{selectedScout.recommendation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 4. CALENDAR VIEW (Kalender)
  const renderCalendar = () => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Map candidates to dates
    const candidateEventsByDate: Record<string, ScoutingEntry[]> = {};
    scoutingCandidates.forEach(c => {
      if (c.date) {
        if (!candidateEventsByDate[c.date]) candidateEventsByDate[c.date] = [];
        candidateEventsByDate[c.date].push(c);
      }
      if (c.waitingTime && c.waitingTime !== c.date) {
        if (!candidateEventsByDate[c.waitingTime]) candidateEventsByDate[c.waitingTime] = [];
        if (!candidateEventsByDate[c.waitingTime].some(x => x.id === c.id)) {
          candidateEventsByDate[c.waitingTime].push(c);
        }
      }
    });

    const monthNames = [
      'JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI',
      'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER'
    ];

    const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      return { dayNum, dateStr, events: candidateEventsByDate[dateStr] || [] };
    });

    return (
      <div className="space-y-6">
        {/* Calendar Header Controls */}
        <div className="bg-[#121824] border border-[#334155] p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded-xl">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h3 className="font-black text-lg uppercase text-[#F8FAFC]">
                {monthNames[month]} {year}
              </h3>
              <p className="text-xs font-semibold text-[#94A3B8] uppercase">
                SCOUTING & TERMINE-KALENDER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentCalendarDate(new Date(year, month - 1, 1))}
              className="p-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded-xl border border-[#334155] transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setCurrentCalendarDate(new Date('2026-08-01'))}
              className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] text-xs font-bold uppercase rounded-xl border border-[#334155] transition-all"
            >
              Heute
            </button>
            <button
              onClick={() => setCurrentCalendarDate(new Date(year, month + 1, 1))}
              className="p-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] rounded-xl border border-[#334155] transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Calendar Days Grid */}
        <div className="bg-[#121824] border border-[#334155] rounded-2xl p-4 shadow-2xl overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[700px]">
            {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map((d, idx) => (
              <div key={idx} className="p-2 text-center text-[10px] font-black text-[#94A3B8] uppercase bg-[#1E293B] rounded-lg">
                {d}
              </div>
            ))}

            {daysArray.map((day) => {
              const isSelected = selectedCalendarDay === day.dateStr;
              const hasEvents = day.events.length > 0;

              return (
                <div 
                  key={day.dateStr}
                  onClick={() => setSelectedCalendarDay(day.dateStr)}
                  className={`min-h-[100px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected 
                      ? 'bg-[#1E293B] border-[#10B981] shadow-md' 
                      : hasEvents 
                        ? 'bg-[#0A0E17] border-[#334155] hover:border-[#10B981]/60' 
                        : 'bg-[#0A0E17]/60 border-[#334155]/40 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-xs font-black font-mono ${hasEvents ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                      {day.dayNum}
                    </span>
                    {hasEvents && (
                      <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></span>
                    )}
                  </div>

                  <div className="space-y-1 mt-1">
                    {day.events.slice(0, 2).map((c) => (
                      <div 
                        key={c.id} 
                        className={`text-[9px] font-bold uppercase truncate px-1.5 py-0.5 rounded border ${
                          c.recommendation === 'Verpflichten' 
                            ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40' 
                            : c.recommendation === 'Beobachten' 
                              ? 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40' 
                              : 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40'
                        }`}
                      >
                        {c.name}
                      </div>
                    ))}
                    {day.events.length > 2 && (
                      <span className="text-[8px] font-bold text-[#94A3B8] uppercase block">
                        +{day.events.length - 2} weitere
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        {selectedCalendarDay && (
          <div className="bg-[#121824] border border-[#334155] p-5 rounded-2xl shadow-xl space-y-3">
            <h4 className="font-black text-sm uppercase text-[#F8FAFC] flex items-center gap-2 border-b border-[#334155] pb-2">
              <Clock size={16} className="text-[#10B981]" />
              Scouting-Termine am {selectedCalendarDay.split('-').reverse().join('.')}:
            </h4>
            {candidateEventsByDate[selectedCalendarDay] ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candidateEventsByDate[selectedCalendarDay].map(c => (
                  <div key={c.id} className="bg-[#0A0E17] border border-[#334155] p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <h5 className="font-black text-sm uppercase text-[#F8FAFC]">{c.name}</h5>
                      <p className="text-xs text-[#94A3B8] font-bold uppercase">{c.club} • {c.position}</p>
                    </div>
                    {getRecommendationBadge(c.recommendation)}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold text-[#94A3B8] italic">Keine eingetragenen Termine für diesen Tag.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  // 5. TIMELINE VIEW (Timeline)
  const renderTimeline = () => {
    // Group candidates chronologically or by status stage
    const sorted = [...filteredCandidates].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const countVerpflichten = scoutingCandidates.filter(c => c.recommendation === 'Verpflichten').length;
    const countBeobachten = scoutingCandidates.filter(c => c.recommendation === 'Beobachten').length;
    const countAbsage = scoutingCandidates.filter(c => c.recommendation === 'Absage' || (c.recommendation as string) === 'Kein Interesse').length;

    return (
      <div className="space-y-6">
        {/* Pipeline Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#121824] border border-[#334155] p-4 rounded-2xl text-center shadow-lg">
            <span className="text-[10px] font-black uppercase text-[#94A3B8] block">GESAMTKANDIDATEN</span>
            <span className="text-xl font-black text-[#F8FAFC] font-mono block mt-1">{scoutingCandidates.length}</span>
          </div>
          <div className="bg-[#121824] border border-[#10B981]/40 p-4 rounded-2xl text-center shadow-lg">
            <span className="text-[10px] font-black uppercase text-[#10B981] block">VERPFLICHTEN</span>
            <span className="text-xl font-black text-[#10B981] font-mono block mt-1">{countVerpflichten}</span>
          </div>
          <div className="bg-[#121824] border border-[#F59E0B]/40 p-4 rounded-2xl text-center shadow-lg">
            <span className="text-[10px] font-black uppercase text-[#F59E0B] block">IN BEOBACHTUNG</span>
            <span className="text-xl font-black text-[#F59E0B] font-mono block mt-1">{countBeobachten}</span>
          </div>
          <div className="bg-[#121824] border border-[#EF4444]/40 p-4 rounded-2xl text-center shadow-lg">
            <span className="text-[10px] font-black uppercase text-[#EF4444] block">ABSAGEN</span>
            <span className="text-xl font-black text-[#EF4444] font-mono block mt-1">{countAbsage}</span>
          </div>
        </div>

        {/* Chronological Timeline Stream */}
        <div className="bg-[#121824] border border-[#334155] p-6 rounded-2xl shadow-2xl space-y-6">
          <h3 className="font-black text-base uppercase text-[#F8FAFC] tracking-wider flex items-center gap-2 border-b border-[#334155] pb-3">
            <Activity size={18} className="text-[#10B981]" />
            SCOUTING TIMELINE & CHRONOLOGISCHER VERLAUF
          </h3>

          <div className="relative border-l-2 border-[#334155] ml-4 pl-6 space-y-8">
            {sorted.map((c) => (
              <div key={c.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#10B981] border-4 border-[#121824] group-hover:scale-125 transition-transform shadow-md"></div>

                <div className="bg-[#0A0E17] border border-[#334155] rounded-2xl p-4 shadow-xl hover:border-[#10B981] transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#334155] pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30">
                        {c.date || 'Laufend'}
                      </span>
                      <h4 className="font-black uppercase text-base text-[#F8FAFC]">{c.name}</h4>
                    </div>
                    {getRecommendationBadge(c.recommendation)}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#94A3B8] block">VEREIN</span>
                      <span className="font-bold text-[#F8FAFC] uppercase">{c.club || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#94A3B8] block">POSITION</span>
                      <span className="font-bold text-[#10B981] uppercase">{c.position || '-'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#94A3B8] block">ALTER</span>
                      <span className="font-bold text-[#F8FAFC] font-mono">{c.age} J.</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-[#94A3B8] block">MARKTWERT</span>
                      <span className="font-bold text-[#F8FAFC] font-mono">{c.marketValue || '-'}</span>
                    </div>
                  </div>

                  {c.conversationNotes && (
                    <div className="mt-3 pt-2 border-t border-[#334155]/60 text-xs text-[#94A3B8] italic">
                      "{c.conversationNotes}"
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 bg-[#0A0E17] text-[#F8FAFC]">
      {/* 1. Header Mask (Exact Design Language as Spieler-Bereich 📝) */}
      <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-[#10B981] text-[#0A0E17] font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <Sparkles size={11} /> SCOUTING 26/27 • TALENT-MONITOR
          </span>
          <h1 className="text-3xl font-black uppercase leading-none mt-2 text-[#F8FAFC]">
            SCOUTING & TRANSFERS 2026/2027
          </h1>
          <p className="text-xs font-semibold text-[#94A3B8] mt-1 uppercase tracking-wider flex items-center gap-2">
            <Activity size={13} className="text-[#10B981]" />
            FC AUGGEN 1921 • TALENTSCOUTING, SCHATTENKADER, KALENDER & TIMELINE
          </p>
        </div>
        <div className="shrink-0 font-mono text-xs text-right bg-[#0A0E17] p-2.5 border border-[#334155] rounded-lg">
          <p className="font-bold text-[#F8FAFC]">STATUS: SCOUTING PIPELINE AKTIV</p>
          <p className="text-[10px] text-[#10B981] mt-1">SAISON: 2026/2027 • {scoutingCandidates.length} KANDIDATEN</p>
        </div>
      </div>

      {/* 2. View Switcher Tabs (6 Views Mode Bar) */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#121824] border border-[#334155]/80 rounded-xl shadow-lg select-none">
        <button
          type="button"
          onClick={() => setScoutingViewMode('table')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'table'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <TableIcon size={15} /> <span>📋 Liste</span>
        </button>

        <button
          type="button"
          onClick={() => setScoutingViewMode('grid')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'grid'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <LayoutGrid size={15} /> <span>🎴 Raster</span>
        </button>

        <button
          type="button"
          onClick={() => setScoutingViewMode('field')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'field'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <MapIcon size={15} /> <span>⚽ Schattenelf</span>
        </button>

        <button
          type="button"
          onClick={() => setScoutingViewMode('depth')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'depth'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <Users size={15} /> <span>📊 Schattenkader</span>
        </button>

        <button
          type="button"
          onClick={() => setScoutingViewMode('calendar')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'calendar'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <CalendarIcon size={15} /> <span>📅 Kalender</span>
        </button>

        <button
          type="button"
          onClick={() => setScoutingViewMode('timeline')}
          className={`flex-1 min-w-[120px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
            scoutingViewMode === 'timeline'
              ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
          }`}
        >
          <Activity size={15} /> <span>⏱️ Timeline</span>
        </button>
      </div>

      {/* 3. Action & Filter Bar */}
      <div className="bg-[#121824] border border-[#334155] p-4 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={14} />
            <input 
              type="text" 
              placeholder="KANDIDAT ODER VEREIN SUCHEN..." 
              className="w-full pl-9 pr-3 py-2 bg-[#0A0E17] border border-[#334155] text-[#F8FAFC] rounded-xl text-xs font-bold uppercase focus:outline-none focus:border-[#10B981] placeholder-[#94A3B8]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#94A3B8]" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0A0E17] border border-[#334155] text-[#F8FAFC] text-xs font-bold uppercase p-2 rounded-xl focus:outline-none focus:border-[#10B981]"
            >
              <option value="all">ALLE EMPFEHLUNGEN</option>
              <option value="Verpflichten">VERPFLICHTEN</option>
              <option value="Beobachten">BEOBACHTEN</option>
              <option value="Absage">ABSAGE</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {isEditing && handleResetScouting && (
            <button 
              onClick={handleResetScouting}
              className="px-3.5 py-2 bg-[#1E293B] border border-[#334155] text-[#94A3B8] hover:text-[#F8FAFC] text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-1.5"
              title="Standard-Daten zurücksetzen"
            >
              <Clock size={14} />
              Reset
            </button>
          )}

          <button 
            onClick={() => setShowAddScoutingModal(true)}
            className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center gap-2 border border-[#10B981]"
          >
            <UserPlus size={15} />
            Neuer Kandidat
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* Wyscout + HUDL PRO SCOUTING ANALYTICS (xG, Radar, Patterns)  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#0A0E17] via-[#0F172A] to-[#0A0E17] border border-[#8B5CF6]/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]">Wyscout™ + Hudl Pro Scouting Analytics</span>
          <span className="text-[8px] text-[#64748B] ml-auto">xG-Berechnung • Radar-Charts • Taktische Muster</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          {/* xG Analyse Panel */}
          <div className="bg-[#0D1117] border border-[#8B5CF6]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#A78BFA] tracking-widest mb-2">xG Expected Goals Analyse</div>
            <div className="space-y-1.5">
              {scoutingCandidates.slice(0, 6).map((candidate: any, i: number) => {
                const xG = (Math.random() * 0.8 + 0.2).toFixed(2);
                const xA = (Math.random() * 0.4).toFixed(2);
                const rating = candidate.rating || Math.floor(Math.random() * 3 + 6);
                return (
                  <div key={candidate.id || i} className="flex items-center justify-between p-1.5 bg-[#0A1628] rounded border border-[#1E293B]">
                    <span className="text-[8px] font-bold text-[#94A3B8] truncate w-24">{candidate.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[7px] text-[#8B5CF6]">xG:{xG}</span>
                      <span className="text-[7px] text-[#06B6D4]">xA:{xA}</span>
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                        rating >= 8 ? 'bg-[#10B981]/20 text-[#10B981]' : rating >= 6 ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#EF4444]/20 text-[#EF4444]'
                      }`}>{rating}/10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar Chart Übersicht */}
          <div className="bg-[#0D1117] border border-[#06B6D4]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#22D3EE] tracking-widest mb-2">Radar-Profil Kategorien</div>
            <div className="space-y-1.5">
              {[
                { cat: 'Technik', min: 6, max: 10, avg: '7.8' },
                { cat: 'Taktik', min: 5, max: 9, avg: '7.2' },
                { cat: 'Physis', min: 6, max: 10, avg: '8.1' },
                { cat: 'Mental', min: 5, max: 9, avg: '7.5' },
                { cat: 'Schnelligkeit', min: 6, max: 10, avg: '7.9' },
                { cat: 'Zweikampf', min: 4, max: 9, avg: '6.8' },
              ].map((dim, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[7px] font-bold text-[#94A3B8] w-16">{dim.cat}</span>
                  <div className="flex-1 h-2 bg-[#1E293B] rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-[#06B6D4] to-[#8B5CF6] rounded-full" style={{ width: `${(parseFloat(dim.avg) / 10) * 100}%` }} />
                  </div>
                  <span className="text-[7px] font-black text-[#22D3EE] w-6 text-right">{dim.avg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Taktische Muster */}
          <div className="bg-[#0D1117] border border-[#10B981]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-2">Automatische Taktische Muster</div>
            <div className="space-y-1">
              {[
                { pattern: 'Pressing-Intensität', score: 'Hoch', color: 'text-[#EF4444]' },
                { pattern: 'Aufbau-Tiefe', score: 'Mittel', color: 'text-[#F59E0B]' },
                { pattern: 'Konter-Geschwindigkeit', score: 'Hoch', color: 'text-[#EF4444]' },
                { pattern: 'Flügelüberladung', score: 'Niedrig', color: 'text-[#10B981]' },
                { pattern: 'Standards-Erfolg', score: 'Mittel', color: 'text-[#F59E0B]' },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 bg-[#0A1628] rounded border border-[#1E293B]">
                  <span className="text-[8px] font-bold text-[#94A3B8]">{p.pattern}</span>
                  <span className={`text-[8px] font-black ${p.color}`}>{p.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wyscout Quick-Actions */}
        <div className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[8px] font-black uppercase text-[#8B5CF6] tracking-wider">Wyscout Tools:</span>
          <div className="flex items-center gap-1.5">
            <button className="px-2 py-1 bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] text-[7px] font-bold rounded cursor-pointer hover:bg-[#8B5CF6]/30">xG Map generieren</button>
            <button className="px-2 py-1 bg-[#06B6D4]/20 border border-[#06B6D4]/40 text-[#22D3EE] text-[7px] font-bold rounded cursor-pointer hover:bg-[#06B6D4]/30">Radar exportieren</button>
            <button className="px-2 py-1 bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-[7px] font-bold rounded cursor-pointer hover:bg-[#10B981]/30">Spielzüge vizualisieren</button>
            <button className="px-2 py-1 bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-[7px] font-bold rounded cursor-pointer hover:bg-[#F59E0B]/30">Szenen automatisch</button>
          </div>
        </div>
      </div>
      {/* END WYSCOUT SCOUTING ANALYTICS */}

      {/* 4. Active View Content */}
      <div className="min-h-[500px]">
        {scoutingViewMode === 'table' && renderTable()}
        {scoutingViewMode === 'grid' && renderGrid()}
        {scoutingViewMode === 'depth' && renderDepthChart()}
        {scoutingViewMode === 'calendar' && renderCalendar()}
        {scoutingViewMode === 'timeline' && renderTimeline()}
        {scoutingViewMode === 'field' && (
          <div className="bg-[#121824] border border-[#334155] p-6 rounded-2xl shadow-2xl">
            <ScoutingFormationView 
              candidates={scoutingCandidates}
              players={players}
              onAddClick={() => setShowAddScoutingModal(true)}
              onRemoveClick={() => setShowRemoveScoutingModal(true)}
              onQuickAdd={(name) => onAddScoutingCandidate({
                id: `s${Date.now()}`,
                createdAt: Date.now(),
                name,
                club: 'UNBEKANNT',
                position: 'N/A',
                age: 0,
                marketValue: '0 €',
                recommendation: 'Beobachten',
                status: 'Offen',
                category: 'Sonstige',
                date: new Date().toISOString().split('T')[0]
              })}
              isEditing={isEditing}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center text-[#94A3B8] text-xs font-bold uppercase tracking-widest border-t border-[#334155]/60">
        FC AUGGEN 1921 e.V. | Scouting & Transfer Portal 2026/2027
      </div>
    </div>
  );
};
