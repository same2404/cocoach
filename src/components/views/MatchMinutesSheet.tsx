import React, { useState } from 'react';
import { Player, Match, MatchMinuteRecord } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { 
  Timer, 
  Plus, 
  Trash2, 
  Pencil,
  ChevronRight, 
  MapPin, 
  Clock, 
  Shield,
  Activity,
  History,
  Maximize2,
  Flag
} from 'lucide-react';
import { MatchDetailMask } from './MatchDetailMask';
import { AnimatePresence } from 'motion/react';

interface MatchMinutesSheetProps {
  players: Player[];
  matches: Match[];
  data: MatchMinuteRecord[];
  type: 'competitive' | 'test';
  onUpdateMatch: (id: string | number, field: keyof Match, value: any) => void;
  onUpdateMinutes: (type: 'competitive' | 'test', playerId: string, matchId: string | number, mins: number) => void;
  onUpdatePlayer: (id: string, field: keyof Player, value: any) => void;
  onEditPlayer: (player: Player) => void;
  onDeletePlayer: (id: string) => void;
  onDeleteMatch: (id: string | number) => void;
  onAddMatch: () => void;
  isEditing?: boolean;
  opponents?: { id: string | number; name: string }[];
}

export const MatchMinutesSheet: React.FC<MatchMinutesSheetProps> = ({
  players,
  matches,
  data,
  type,
  onUpdateMatch,
  onUpdateMinutes,
  onUpdatePlayer,
  onEditPlayer,
  onDeletePlayer,
  onDeleteMatch,
  onAddMatch,
  isEditing = false,
  opponents = []
}) => {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const sortedPlayers = sortPlayers(players);
  const columnCount = type === 'competitive' ? 32 : 20;
  
  const displayMatches = Array.from({ length: columnCount }, (_, i) => {
    const match = matches.find(m => m.index === i);
    return match || { id: -(i + 1), index: i, opponent: '', location: '', isHome: true, kickOff: '', meetingTime: '' } as Match;
  });

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border border-[#DADADA] rounded-2xl shadow-sm overflow-hidden text-[#1A1A1A]">
      <div className="p-4 border-b border-[#DADADA] bg-[#F4F4F4] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Timer size={16} className="text-[#4C6FFF]" />
            <h3 className="font-black uppercase text-xs tracking-wider text-[#1A1A1A]">
              {type === 'competitive' ? 'Einsatzminuten Pflichtspiele' : 'Einsatzminuten Testspiele'}
            </h3>
          </div>
          {isEditing && (
            <button 
              onClick={onAddMatch}
              className="bg-[#FACC15] text-[#1A1A1A] px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-xl border border-[#FACC15] hover:bg-[#FACC15]/90 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Spiel hinzufügen
            </button>
          )}
          <div className="flex items-center gap-1 text-xs font-bold uppercase text-[#4A4A4A]">
            <Activity size={12} className="text-[#4C6FFF]" />
            <span>Saison 2026/27</span>
          </div>
        </div>
        {!isEditing && (
          <p className="text-xs font-bold uppercase text-[#4A4A4A] italic hidden sm:block">
            Bearbeitungsmodus aktivieren zum Anpassen.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full border-collapse text-xs font-bold text-[#1A1A1A]">
          <thead className="sticky top-0 bg-[#F4F4F4] text-[#1A1A1A] z-20 border-b border-[#DADADA]">
            <tr>
              <th className="p-2.5 border-r border-[#DADADA] text-left w-10 uppercase tracking-wider text-[#4A4A4A]">Nr</th>
              <th className="p-2.5 border-r border-[#DADADA] text-center w-12 uppercase tracking-wider text-[#4A4A4A]">#</th>
              <th className="p-2.5 border-r border-[#DADADA] text-left w-52 uppercase tracking-wider">Spieler</th>
              <th className="p-2.5 border-r border-[#DADADA] text-center w-12 uppercase tracking-wider text-[#4C6FFF]">Pos</th>
              <th className="p-2.5 border-r border-[#DADADA] text-center w-20 uppercase tracking-wider text-[#1A1A1A]">Gesamt</th>
              {isEditing && <th className="p-2.5 border-r border-[#DADADA] text-center w-20 uppercase tracking-wider text-[#FB7185]">Aktion</th>}
              {displayMatches.map((match) => (
                <th key={match.id} className="p-0 border-r border-[#DADADA] min-w-[120px]">
                  <div className="flex flex-col bg-[#F4F4F4]">
                    <div className="p-2 border-b border-[#DADADA] flex flex-col gap-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-[#4A4A4A] w-7">GEG</span>
                        <input 
                          type="text"
                          list="opponent-list-sheet"
                          className={`bg-white border border-[#DADADA] rounded px-1 text-[10px] font-black uppercase flex-1 focus:outline-none focus:border-[#4C6FFF] ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                          value={match.opponent || ''}
                          onChange={(e) => onUpdateMatch(match.id, 'opponent', e.target.value)}
                          placeholder={isEditing ? "..." : ""}
                          disabled={!isEditing}
                        />
                        <datalist id="opponent-list-sheet">
                          {opponents.map((opp) => (
                            <option key={opp.id} value={opp.name} />
                          ))}
                        </datalist>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-[#4A4A4A] w-7">ORT</span>
                        <input 
                          type="text"
                          className={`bg-white border border-[#DADADA] rounded px-1 text-[9px] font-bold uppercase flex-1 focus:outline-none focus:border-[#4C6FFF] ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                          value={match.location || ''}
                          onChange={(e) => onUpdateMatch(match.id, 'location', e.target.value)}
                          placeholder={isEditing ? "..." : ""}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-bold text-[#4A4A4A] w-7">ZEIT</span>
                        <input 
                          type="text"
                          className={`bg-white border border-[#DADADA] rounded px-1 text-[9px] font-bold uppercase flex-1 focus:outline-none focus:border-[#4C6FFF] ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                          value={match.kickOff || ''}
                          onChange={(e) => onUpdateMatch(match.id, 'kickOff', e.target.value)}
                          placeholder={isEditing ? "..." : ""}
                          disabled={!isEditing}
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-[#4A4A4A] w-7">RES</span>
                        <input 
                          type="text"
                          className={`bg-[#FB7185]/10 border border-[#FB7185]/30 rounded px-1 text-[10px] font-black uppercase flex-1 focus:outline-none focus:border-[#FB7185] text-[#FB7185] ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                          value={(match as any).result || ''}
                          onChange={(e) => onUpdateMatch(match.id, 'result' as any, e.target.value)}
                          placeholder={isEditing ? "..." : ""}
                          disabled={!isEditing}
                        />
                      </div>
                      {match.id !== undefined && (typeof match.id === 'string' || (typeof match.id === 'number' && match.id > 0)) && (
                        <div className="flex gap-1 mt-1 border-t border-[#DADADA] pt-1">
                          <button 
                            onClick={() => setSelectedMatch(match)}
                            className="flex-1 bg-white hover:bg-[#DADADA] text-[#1A1A1A] border border-[#DADADA] py-1 rounded flex justify-center transition-colors cursor-pointer"
                            title="Match Maske öffnen"
                          >
                            <Maximize2 size={10} />
                          </button>
                          {isEditing && (
                            <button 
                              onClick={() => {
                                onDeleteMatch(match.id);
                              }}
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 py-1 rounded flex justify-center transition-colors cursor-pointer"
                              title="Spiel löschen"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#DADADA]">
            {['player', 'coach', 'staff', 'medical'].map(category => {
              const filteredPlayers = sortedPlayers.filter(p => (p.category || 'player') === category);
              if (filteredPlayers.length === 0) return null;

              return (
                <React.Fragment key={category}>
                  <tr className="bg-[#1A1A1A] text-[#FACC15]">
                    <td colSpan={columnCount + (isEditing ? 6 : 5)} className="p-2.5 font-black uppercase text-xs tracking-widest border-y border-[#DADADA] border-l-4 border-l-[#FACC15]">
                      {category === 'player' ? '⚽ Spielerkader' : category === 'coach' ? '📋 Trainerteam' : category === 'staff' ? '🛡️ Funktionsteam' : '🩺 Ärztliche Abteilung'}
                    </td>
                  </tr>
                  {filteredPlayers.map((player, pIdx) => {
                    const record = data.find(r => r.playerId === player.id);
                    const totalMins = Object.values(record?.matchMinutes || {}).reduce((a, b) => a + b, 0);

                    return (
                      <tr key={player.id} className="hover:bg-[#F9FAFB] transition-colors border-b border-[#DADADA] bg-white text-[#1A1A1A]">
                        <td className="p-2.5 border-r border-[#DADADA] text-center text-[#4A4A4A]">{pIdx + 1}</td>
                        <td className="p-2.5 border-r border-[#DADADA] text-center font-black">
                          {player.category === 'player' ? player.number : (player.category === 'coach' ? 'T' : (player.category === 'staff' ? 'F' : 'M'))}
                        </td>
                        <td className="p-2.5 border-r border-[#DADADA]">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <input 
                                type="text"
                                className="bg-transparent focus:outline-none w-full text-xs font-bold uppercase"
                                value={player.lastName || ''}
                                onChange={(e) => onUpdatePlayer(player.id, 'lastName', e.target.value)}
                              />
                            </div>
                          ) : (
                            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
                              {player.lastName}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 border-r border-[#DADADA] text-center text-[#4C6FFF] text-xs font-black">{player.position}</td>
                        <td className="p-2.5 border-r border-[#DADADA] text-center font-black bg-[#F4F4F4] text-[#1A1A1A]">{totalMins}</td>
                        {isEditing && (
                          <td className="p-2.5 border-r border-[#DADADA] text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => onEditPlayer(player)}
                                className="text-[#4C6FFF] hover:underline transition-colors cursor-pointer"
                                title="Bearbeiten"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  onDeletePlayer(player.id);
                                }}
                                className="text-rose-600 hover:underline transition-colors cursor-pointer"
                                title="Löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                        {displayMatches.map(match => (
                          <td key={match.id} className="p-0 border-r border-[#DADADA]">
                            <input 
                              type="number"
                              className={`w-full h-full p-2 text-center bg-transparent font-black focus:bg-white focus:border-[#4C6FFF] focus:outline-none text-xs ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                              value={record?.matchMinutes?.[match.id] || record?.[`matchMinutes.${match.id}`] || ''}
                              onChange={(e) => onUpdateMinutes(type, player.id, match.id, parseInt(e.target.value) || 0)}
                              placeholder={isEditing ? "0" : ""}
                              disabled={!isEditing || (typeof match.id === 'number' && match.id < 0)}
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-[#F4F4F4] text-[#4A4A4A] border-t border-[#DADADA] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <History size={14} className="text-[#4C6FFF]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">
              Gesamtminuten Kader: {data.reduce((sum, r) => sum + Object.values(r.matchMinutes || {}).reduce((a, b) => a + b, 0), 0)}
            </span>
          </div>
        </div>
        <p className="text-xs font-bold uppercase text-[#4A4A4A]">
          FC Auggen • CoCoach Performance System
        </p>
      </div>

      <AnimatePresence>
        {selectedMatch && (
          <MatchDetailMask 
            match={selectedMatch}
            players={players}
            data={data}
            onClose={() => setSelectedMatch(null)}
            onUpdateMatch={onUpdateMatch}
            isEditing={isEditing}
            opponents={opponents}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
