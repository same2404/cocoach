import React, { useState, useMemo } from 'react';
import { Spieler, Match, MatchMinuteRecord } from '../../types';
import { 
  Trophy, 
  MapPin, 
  Clock, 
  Shield, 
  Users, 
  Timer,
  Calendar,
  Flag,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Save,
  Activity,
  Target,
  LayoutGrid,
  List,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MatchManagementViewProps {
  players: Spieler[];
  matches: Match[];
  data: MatchMinuteRecord[];
  type: 'competitive' | 'test';
  onUpdateMatch: (id: string | number, field: keyof Match, value: any) => void;
  onUpdateMinutes: (type: 'competitive' | 'test', playerId: string, matchId: string | number, mins: number) => void;
  onUpdateAvailability: (type: 'competitive' | 'test', playerId: string, matchId: string | number, status: string) => void;
  onAddMatch: () => void;
  onDeleteMatch: (id: string | number) => void;
  isEditing?: boolean;
  opponents?: { id: string | number; name: string }[];
}

export const MatchManagementView: React.FC<MatchManagementViewProps> = ({
  players,
  matches,
  data,
  type,
  onUpdateMatch,
  onUpdateMinutes,
  onUpdateAvailability,
  onAddMatch,
  onDeleteMatch,
  isEditing = false,
  opponents = []
}) => {
  const [selectedMatchIndex, setSelectedMatchIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [localMatchData, setLocalMatchData] = useState<Partial<Match>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Ensure selectedMatchIndex is within bounds
  const safeIndex = Math.min(Math.max(0, selectedMatchIndex), matches.length - 1);
  const currentMatch = matches[safeIndex];

  // Sync local data when current match changes
  React.useEffect(() => {
    if (currentMatch) {
      setLocalMatchData(currentMatch);
    }
  }, [currentMatch?.id]);

  const handleLocalUpdate = (field: keyof Match, value: any) => {
    setLocalMatchData(prev => ({ ...prev, [field]: value }));
    onUpdateMatch(currentMatch.id, field, value);
  };

  // Sort players by position then number
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      const posOrder: Record<string, number> = { 'TW': 1, 'IV': 2, 'AV': 3, 'DM': 4, 'ZM': 5, 'OM': 6, 'WGL': 7, 'ST': 8 };
      const aOrder = posOrder[a.position] || 99;
      const bOrder = posOrder[b.position] || 99;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.number - b.number;
    });
  }, [players]);

  const parsedStats = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    const scorerCount: Record<string, number> = {};

    matches.forEach(m => {
      if (m.result && m.result.includes(':')) {
        const parts = m.result.split(':').map(p => parseInt(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const homeGoals = parts[0];
          const awayGoals = parts[1];
          const scored = m.isHome ? homeGoals : awayGoals;
          const conceded = m.isHome ? awayGoals : homeGoals;

          goalsScored += scored;
          goalsConceded += conceded;

          if (scored > conceded) {
            wins++;
          } else if (scored === conceded) {
            draws++;
          } else {
            losses++;
          }
        }
      }

      if (m.scorers) {
        const sParts = m.scorers.split(',');
        sParts.forEach(sp => {
          let name = sp.trim();
          if (!name) return;
          let count = 1;
          const matchCount = name.match(/\(([^)]+)\)/);
          if (matchCount && matchCount[1]) {
            const parsedCount = parseInt(matchCount[1]);
            if (!isNaN(parsedCount)) {
              count = parsedCount;
            }
            name = name.replace(/\([^)]+\)/, '').trim();
          }
          name = name.toUpperCase();
          if (name) {
            scorerCount[name] = (scorerCount[name] || 0) + count;
          }
        });
      }
    });

    const sortedScorers = Object.entries(scorerCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { wins, draws, losses, goalsScored, goalsConceded, sortedScorers };
  }, [matches]);

  if (!currentMatch && matches.length > 0) {
    setSelectedMatchIndex(0);
    return null;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#121824] border border-dashed border-[#334155] rounded-xl p-12">
        <Trophy size={64} className="text-[#94A3B8]/30 mb-4" />
        <h3 className="text-xl font-bold uppercase tracking-wider text-[#94A3B8] mb-6">Keine Spiele vorhanden</h3>
        <button 
          onClick={onAddMatch}
          className="bg-[#3A7BFF] text-white px-8 py-3.5 font-bold uppercase tracking-wider rounded-xl hover:bg-blue-600 transition-all shadow-xs"
        >
          Erstes Spiel anlegen
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#121824] text-[#F8FAFC] overflow-hidden">
      {/* View Switcher & Action Bar */}
      <div className="bg-[#121824] text-[#F8FAFC] p-3 flex items-center justify-between shrink-0 border-b border-[#334155]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-[#E8E8E8] p-1 rounded-xl border border-[#DADADA]">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'list' 
                  ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-[0_0_8px_rgba(0,194,255,0.4)] border border-[#00C2FF]' 
                  : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#D8D8D8]'
              }`}
            >
              <LayoutGrid size={14} />
              Übersicht
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                viewMode === 'detail' 
                  ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-[0_0_8px_rgba(0,194,255,0.4)] border border-[#00C2FF]' 
                  : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#D8D8D8]'
              }`}
            >
              <List size={14} />
              Details
            </button>
          </div>
          
          {viewMode === 'detail' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-[400px] md:max-w-[600px]">
              <div className="h-4 w-px bg-[#DDDDDD] mx-1" />
              {matches.map((match, idx) => (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatchIndex(idx)}
                  className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider transition-all shrink-0 rounded-lg border ${
                    safeIndex === idx 
                      ? 'bg-[#3A7BFF] text-white border-[#3A7BFF]' 
                      : 'bg-[#1E293B] text-[#94A3B8] border-[#334155] hover:border-[#3A7BFF]'
                  }`}
                >
                  {match.opponent || `S${idx + 1}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={onAddMatch}
          className="bg-[#2ECC71] hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition-all shrink-0 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider shadow-xs"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Neues Spiel</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          
          {viewMode === 'list' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold uppercase tracking-wider text-[#F8FAFC]">
                  Alle <span className="text-[#3A7BFF]">{type === 'competitive' ? 'Pflichtspiele' : 'Testspiele'}</span>
                </h2>
                <div className="text-[10px] font-bold uppercase text-[#94A3B8]">
                  {matches.length} Spiele insgesamt
                </div>
              </div>

              {/* Aggregierte Gesamtstatistik */}
              {matches.length > 0 && (
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs p-6 mb-6">
                  <h3 className="font-bold uppercase text-xs tracking-wider text-[#3A7BFF] mb-4 flex items-center gap-2">
                    <span>📊</span> Gesamtstatistik ({type === 'competitive' ? 'Pflichtspiele' : 'Testspiele'})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Stat Item 1 */}
                    <div className="border-r-0 md:border-r border-[#334155] last:border-0 pr-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Bilanz (S / U / N)</div>
                      <div className="text-2xl font-bold uppercase text-[#F8FAFC] mt-1">
                        <span className="text-[#2ECC71]">{parsedStats.wins}</span>
                        <span className="text-[#94A3B8]/30 mx-2">/</span>
                        <span className="text-[#94A3B8]">{parsedStats.draws}</span>
                        <span className="text-[#94A3B8]/30 mx-2">/</span>
                        <span className="text-rose-600">{parsedStats.losses}</span>
                      </div>
                      <div className="text-[9px] font-bold uppercase text-[#94A3B8] mt-1">
                        {matches.length} Spiele absolviert
                      </div>
                    </div>

                    {/* Stat Item 2 */}
                    <div className="border-r-0 md:border-r border-[#334155] last:border-0 pr-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Tore & Gegentore</div>
                      <div className="text-2xl font-bold uppercase text-[#F8FAFC] mt-1">
                        <span>{parsedStats.goalsScored}</span>
                        <span className="text-[#94A3B8]/30 font-light mx-2">:</span>
                        <span className="text-[#94A3B8]">{parsedStats.goalsConceded}</span>
                      </div>
                      <div className="text-[9px] font-bold uppercase text-[#94A3B8] mt-1">
                        Differenz: {parsedStats.goalsScored - parsedStats.goalsConceded >= 0 ? '+' : ''}{parsedStats.goalsScored - parsedStats.goalsConceded}
                      </div>
                    </div>

                    {/* Stat Item 3 */}
                    <div className="border-r-0 md:border-r border-[#334155] last:border-0 pr-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Erfolgsquote</div>
                      <div className="text-2xl font-bold uppercase text-[#3A7BFF] mt-1">
                        {matches.length > 0 ? Math.round((parsedStats.wins / matches.length) * 100) : 0}%
                      </div>
                      <div className="text-[9px] font-bold uppercase text-[#94A3B8] mt-1">
                        Siegwahrscheinlichkeit
                      </div>
                    </div>

                    {/* Stat Item 4 */}
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Top-Torschützen</div>
                      {parsedStats.sortedScorers.length > 0 ? (
                        <div className="space-y-1 mt-2">
                          {parsedStats.sortedScorers.map(([name, count]) => (
                            <div key={name} className="flex justify-between items-center text-[10px] font-bold uppercase text-[#F8FAFC]">
                              <span className="truncate max-w-[120px]">{name}</span>
                              <span className="font-bold text-[#3A7BFF]">{count} Tor{count > 1 ? 'e' : ''}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[9px] font-bold uppercase text-[#94A3B8] mt-2">Keine Torschützen erfasst</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...matches].sort((a,b) => {
                  const dateA = (a.date || '').split('.').reverse().join('-');
                  const dateB = (b.date || '').split('.').reverse().join('-');
                  return dateB.localeCompare(dateA);
                }).map((match) => (
                  <motion.div
                    key={match.id}
                    whileHover={{ y: -2 }}
                    className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs hover:border-[#3A7BFF] hover:shadow-md transition-all cursor-pointer group overflow-hidden"
                    onClick={() => {
                      const realIndex = matches.findIndex(m => m.id === match.id);
                      setSelectedMatchIndex(realIndex);
                      setViewMode('detail');
                    }}
                  >
                    <div className="p-4 bg-[#121824] border-b border-[#334155] flex justify-between items-start">
                      <div>
                        <div className="text-[8px] font-bold uppercase tracking-wider text-[#3A7BFF] mb-1">
                          {match.competition || (type === 'competitive' ? 'LIGA' : 'TEST')}
                        </div>
                        <div className="text-base font-bold uppercase truncate max-w-[180px] text-[#F8FAFC]">
                          {match.opponent || 'Unbekannt'}
                        </div>
                      </div>
                      <div className="bg-[#1E293B] border border-[#334155] text-[#F8FAFC] px-2.5 py-1 font-bold text-sm rounded-lg">
                        {match.result || '- : -'}
                      </div>
                    </div>
                    
                    <div className="p-4 grid grid-cols-2 gap-4 text-[#F8FAFC]">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#3A7BFF]" />
                        <span className="text-[10px] font-bold uppercase">{match.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#3A7BFF]" />
                        <span className="text-[10px] font-bold uppercase">{match.kickOff} Uhr</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-[#3A7BFF]" />
                        <span className="text-[10px] font-bold uppercase truncate">{match.location}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flag size={14} className="text-[#3A7BFF]" />
                        <span className="text-[10px] font-bold uppercase">{match.isHome ? 'Heim' : 'Auswärts'}</span>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex justify-end">
                      <div className="flex items-center gap-1 text-[8px] font-bold uppercase group-hover:text-[#3A7BFF] transition-colors leading-none text-[#94A3B8]">
                        Spiel bearbeiten <ExternalLink size={10} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : currentMatch ? (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* TOP: Match Info Card */}
              <motion.div 
                key={`match-info-${currentMatch.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs overflow-hidden"
              >
            <div className="bg-[#121824] border-b border-[#334155] p-6 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="bg-[#3A7BFF] text-white p-3 rounded-xl shadow-xs">
                  <Trophy size={24} />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-1">
                    {type === 'competitive' ? 'Pflichtspiel' : 'Testspiel'} Details
                  </h2>
                  <div className="flex items-center gap-3 relative">
                    <input 
                      type="text"
                      list="opponent-list-manage"
                      value={localMatchData.opponent || ''}
                      onChange={(e) => handleLocalUpdate('opponent', e.target.value)}
                      className="bg-transparent text-2xl font-bold uppercase outline-none border-b-2 border-transparent focus:border-[#3A7BFF] text-[#F8FAFC] placeholder:text-[#94A3B8]/40 w-full md:w-[400px]"
                      placeholder="GEGNER NAME..."
                    />
                    <datalist id="opponent-list-manage">
                      {opponents.map((opp) => (
                        <option key={opp.id} value={opp.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Ergebnis</label>
                  <input 
                    type="text"
                    value={localMatchData.result || ''}
                    onChange={(e) => handleLocalUpdate('result', e.target.value)}
                    className="bg-[#1E293B] text-center text-xl font-bold w-24 py-1 outline-none border border-[#334155] focus:border-[#3A7BFF] text-[#F8FAFC] rounded-lg"
                    placeholder="-:-"
                  />
                </div>
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-rose-50 hover:bg-rose-100 p-2.5 transition-colors rounded-xl text-rose-600 border border-rose-200"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border-t border-[#334155]">
              {/* Field: Date */}
              <div className="p-5 border-r border-b border-[#334155] flex items-start gap-3">
                <Calendar className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Datum / Spieltag</label>
                  <input 
                    type="text"
                    value={localMatchData.date || ''}
                    onChange={(e) => handleLocalUpdate('date', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="TT.MM.JJJJ"
                  />
                </div>
              </div>

              {/* Field: Kickoff */}
              <div className="p-5 border-r border-b border-[#334155] flex items-start gap-3">
                <Clock className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Anstoßzeit</label>
                  <input 
                    type="text"
                    value={localMatchData.kickOff || ''}
                    onChange={(e) => handleLocalUpdate('kickOff', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="00:00"
                  />
                </div>
              </div>

              {/* Field: Meeting Time */}
              <div className="p-5 border-r border-b border-[#334155] flex items-start gap-3">
                <Timer className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Treffpunkt (Zeit)</label>
                  <input 
                    type="text"
                    value={localMatchData.meetingTime || ''}
                    onChange={(e) => handleLocalUpdate('meetingTime', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="00:00"
                  />
                </div>
              </div>

              {/* Field: Location */}
              <div className="p-5 border-b border-[#334155] flex items-start gap-3">
                <MapPin className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Spielort</label>
                  <input 
                    type="text"
                    value={localMatchData.location || ''}
                    onChange={(e) => handleLocalUpdate('location', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="STADION / PLATZ..."
                  />
                </div>
              </div>

              {/* Field: Home/Away */}
              <div className="p-5 border-r border-[#334155] flex items-start gap-3">
                <Flag className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Heim / Auswärts</label>
                  <select 
                    value={localMatchData.isHome ? 'Heim' : 'Auswärts'}
                    onChange={(e) => handleLocalUpdate('isHome', e.target.value === 'Heim')}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC] bg-transparent appearance-none cursor-pointer"
                  >
                    <option value="Heim">Heimspiel</option>
                    <option value="Auswärts">Auswärtsspiel</option>
                  </select>
                </div>
              </div>

              {/* Field: Competition */}
              <div className="p-5 border-r border-[#334155] flex items-start gap-3">
                <Shield className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Wettbewerb</label>
                  <input 
                    type="text"
                    value={localMatchData.competition || ''}
                    onChange={(e) => handleLocalUpdate('competition', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="LIGA / POKAL..."
                  />
                </div>
              </div>

              {/* Field: Treffpunkt (Ort) */}
              <div className="p-5 border-r border-[#334155] flex items-start gap-3">
                <Target className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Treffpunkt (Ort)</label>
                  <input 
                    type="text"
                    value={localMatchData.meetingPoint || ''}
                    onChange={(e) => handleLocalUpdate('meetingPoint', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="ORT..."
                  />
                </div>
              </div>

              {/* Field: Result (Mobile only) */}
              <div className="p-5 flex md:hidden items-start gap-3">
                <Activity className="text-[#3A7BFF] shrink-0" size={18} />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase text-[#94A3B8] block mb-1">Ergebnis</label>
                  <input 
                    type="text"
                    value={localMatchData.result || ''}
                    onChange={(e) => handleLocalUpdate('result', e.target.value)}
                    className="w-full font-bold text-base outline-none focus:text-[#3A7BFF] text-[#F8FAFC]"
                    placeholder="-:-"
                  />
                </div>
              </div>
            </div>
          </motion.div>

              {/* MIDDLE: Scorers, Cards & Notes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs p-6">
                  <h3 className="font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2 text-[#F8FAFC]">
                    <span>⚽</span> Torschützen
                  </h3>
                  <input 
                    type="text"
                    value={localMatchData.scorers || ''}
                    onChange={(e) => handleLocalUpdate('scorers', e.target.value)}
                    className="w-full bg-[#121824] border border-[#334155] rounded-lg p-3 font-bold text-xs uppercase text-[#F8FAFC] focus:bg-[#1E293B] focus:border-[#3A7BFF] outline-none transition-all placeholder:text-[#94A3B8]/40"
                    placeholder="Z.B. Müller (2), Meier (45')..."
                  />
                </div>

                <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs p-6">
                  <h3 className="font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2 text-[#F8FAFC]">
                    <span>🟨</span> Karten (Gelb/Rot)
                  </h3>
                  <input 
                    type="text"
                    value={localMatchData.cards || ''}
                    onChange={(e) => handleLocalUpdate('cards', e.target.value)}
                    className="w-full bg-[#121824] border border-[#334155] rounded-lg p-3 font-bold text-xs uppercase text-[#F8FAFC] focus:bg-[#1E293B] focus:border-[#3A7BFF] outline-none transition-all placeholder:text-[#94A3B8]/40"
                    placeholder="Z.B. Müller (Gelb), Schmidt (Rot)..."
                  />
                </div>

                <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs p-6">
                  <h3 className="font-bold uppercase text-xs tracking-wider mb-3 flex items-center gap-2 text-[#F8FAFC]">
                    <span>📝</span> Notizen & Spielbericht
                  </h3>
                  <textarea 
                    value={localMatchData.notes || ''}
                    onChange={(e) => handleLocalUpdate('notes', e.target.value)}
                    className="w-full bg-[#121824] border border-[#334155] rounded-lg p-3 font-medium text-xs text-[#F8FAFC] focus:bg-[#1E293B] focus:border-[#3A7BFF] outline-none transition-all min-h-[80px] placeholder:text-[#94A3B8]/40"
                    placeholder="Spielbericht, Notizen zur Aufstellung, Sonstiges..."
                  />
                </div>
              </div>

              {/* BOTTOM: Player Minutes Table */}
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl shadow-xs overflow-hidden">
                <div className="bg-[#121824] p-4 border-b border-[#334155] flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-[#3A7BFF]" />
                    <h3 className="font-bold uppercase text-xs tracking-wider text-[#F8FAFC]">Spieler-Minuten</h3>
                  </div>
                  <div className="text-[10px] font-bold uppercase text-[#94A3B8]">
                    {players.length} Spieler im Kader
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#121824] border-b border-[#334155] text-[#F8FAFC]">
                        <th className="p-3 text-left text-[9px] font-bold uppercase tracking-wider w-16">Nr.</th>
                        <th className="p-3 text-left text-[9px] font-bold uppercase tracking-wider">Spielername</th>
                        <th className="p-3 text-center text-[9px] font-bold uppercase tracking-wider w-24">Pos.</th>
                        <th className="p-3 text-center text-[9px] font-bold uppercase tracking-wider w-36">Verfügbarkeit</th>
                        <th className="p-3 text-center text-[9px] font-bold uppercase tracking-wider w-32">Minuten</th>
                        <th className="p-3 text-right text-[9px] font-bold uppercase tracking-wider w-40">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPlayers.map((player) => {
                        const record = data.find(r => r.playerId === player.id);
                        const minutes = record?.minutes?.[currentMatch.id] || 0;
                        
                        return (
                          <tr key={player.id} className="border-b border-[#334155] hover:bg-[#F9F9F9] transition-colors">
                            <td className="p-3 font-bold text-[#94A3B8]">{player.number}</td>
                            <td className="p-3">
                              <div className="font-bold uppercase text-xs text-[#F8FAFC]">{player.lastName}</div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="bg-[#121824] border border-[#334155] text-[#F8FAFC] text-[9px] font-bold px-2 py-0.5 rounded-md">
                                {player.position}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <select 
                                className="w-full bg-[#121824] border border-[#334155] rounded-lg p-1.5 text-[10px] font-bold text-[#F8FAFC] focus:bg-[#1E293B] focus:border-[#3A7BFF] outline-none transition-all"
                                value={record?.matchAvailability?.[currentMatch.id] || ''}
                                onChange={(e) => onUpdateAvailability(type, player.id, currentMatch.id, e.target.value)}
                              >
                                <option value="">-</option>
                                <option value="Anwesend">Anwesend</option>
                                <option value="Verletzt">Verletzt</option>
                                <option value="Entschuldigt">Entschuldigt</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center">
                                <input 
                                  type="number"
                                  value={minutes || ''}
                                  onChange={(e) => onUpdateMinutes(type, player.id, currentMatch.id, parseInt(e.target.value) || 0)}
                                  className="w-20 bg-[#121824] border border-[#334155] rounded-lg p-1.5 text-center font-bold text-xs text-[#F8FAFC] focus:bg-[#1E293B] focus:border-[#3A7BFF] outline-none transition-all"
                                  placeholder="0"
                                />
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {minutes > 0 ? (
                                  <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase text-[#2ECC71]">
                                    <div className="w-2 h-2 bg-[#2ECC71] rounded-full" />
                                    Eingesetzt
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold uppercase text-[#94A3B8]/50">
                                    Nicht eingesetzt
                                  </span>
                                )}
                              </div>
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
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-[#94A3B8]">
              <Trophy size={64} className="mb-4 opacity-20" />
              <h3 className="text-xl font-bold uppercase">Kein Spiel ausgewählt</h3>
              <p className="text-xs font-bold uppercase mt-2">Wähle ein Spiel aus der Übersicht</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1E293B] border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-md p-6"
            >
              <h3 className="text-xl font-black uppercase mb-4">Spiel löschen?</h3>
              <p className="font-bold text-sm mb-6">Möchtest du dieses Spiel wirklich unwiderruflich löschen?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    onDeleteMatch(currentMatch.id);
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 bg-red-600 text-white py-3 font-black uppercase text-xs hover:bg-red-700 transition-colors border-2 border-black"
                >
                  Ja, löschen
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 text-black py-3 font-black uppercase text-xs hover:bg-gray-300 transition-colors border-2 border-black"
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
