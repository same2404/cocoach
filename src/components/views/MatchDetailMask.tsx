import React from 'react';
import { Player, Match, MatchMinuteRecord } from '../../types';
import { 
  X, 
  MapPin, 
  Clock, 
  Shield, 
  Users, 
  Timer,
  Trophy,
  Flag,
  Calendar,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';

interface MatchDetailMaskProps {
  match: Match;
  players: Player[];
  data: MatchMinuteRecord[];
  onClose: () => void;
  onUpdateMatch?: (id: string | number, field: keyof Match, value: any) => void;
  isEditing?: boolean;
  opponents?: { id: string | number; name: string }[];
}

// Local state component to prevent hanging
const EditableTextarea = ({ value, onSave, placeholder, className }: { 
  value: string, 
  onSave: (val: string) => void, 
  placeholder?: string, 
  className?: string
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <textarea 
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) onSave(localValue);
      }}
    />
  );
};

const EditableInput = ({ value, onSave, placeholder, className, type = "text", listId }: { 
  value: string, 
  onSave: (val: string) => void, 
  placeholder?: string, 
  className?: string,
  type?: string,
  listId?: string
}) => {
  const [localValue, setLocalValue] = React.useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <input 
      type={type}
      list={listId}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) onSave(localValue);
      }}
    />
  );
};

export const MatchDetailMask: React.FC<MatchDetailMaskProps> = ({
  match,
  players,
  data,
  onClose,
  onUpdateMatch,
  isEditing = false,
  opponents = []
}) => {
  const parseMatchDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return new Date();
    let normalizedDate = dateStr;
    if (dateStr.includes('.')) {
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    const time = timeStr || "00:00";
    return new Date(`${normalizedDate}T${time}`);
  };

  const handleExportICS = () => {
    const matchDate = parseMatchDate(match.date, match.kickOff);
    const endDate = new Date(matchDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration

    const formatDateToICS = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//FC Auggen Match Manager//NONSGML v1.0//EN',
      'BEGIN:VEVENT',
      `UID:${match.id}-${Date.now()}@fc-auggen`,
      `DTSTAMP:${formatDateToICS(new Date())}`,
      `DTSTART:${formatDateToICS(matchDate)}`,
      `DTEND:${formatDateToICS(endDate)}`,
      `SUMMARY:Spiel FC Auggen vs. ${match.opponent}`,
      `DESCRIPTION:Spielort: ${match.location || 'Nicht festgelegt'}\\nTreffpunkt: ${match.meetingPoint || 'Nicht festgelegt'} (${match.meetingTime || '--:--'})\\nNotizen: ${match.notes || ''}\\nTorschützen: ${match.scorers || 'Keine'}\\nKarten: ${match.cards || 'Keine'}`,
      `LOCATION:${match.location || 'Nicht festgelegt'}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spiel_${match.opponent || 'match'}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter players who have minutes in this match
  const matchPlayers = players.map(player => {
    const record = data.find(r => r.playerId === player.id);
    const minutes = (record?.matchMinutes as any)?.[match.id] || (record as any)?.[`matchMinutes.${match.id}`] || 0;
    return { ...player, minutes };
  }).filter(p => p.minutes > 0 || isEditing);

  // Sort by position then number
  const sortedMatchPlayers = [...matchPlayers].sort((a, b) => {
    if (a.minutes > 0 && b.minutes === 0) return -1;
    if (a.minutes === 0 && b.minutes > 0) return 1;
    return 0;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 10 }}
        className="bg-white border border-[#DADADA] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col text-[#1A1A1A]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#F4F4F4] text-[#1A1A1A] p-5 flex justify-between items-start shrink-0 border-b border-[#DADADA]">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="text-[#4C6FFF]" size={18} />
              <span className="text-xs font-black uppercase tracking-wider text-[#4C6FFF]">Spielbericht &amp; Match-Details</span>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-[#4A4A4A] block mb-1">Gegner</label>
                {isEditing ? (
                  <div className="relative">
                    <EditableInput 
                      type="text"
                      listId="opponent-list-mask"
                      className="bg-white border border-[#DADADA] rounded-xl px-3 py-1.5 focus:border-[#4C6FFF] outline-none w-full text-xl md:text-3xl font-black uppercase text-[#1A1A1A]"
                      value={match.opponent || ''}
                      onSave={(val) => onUpdateMatch?.(match.id, 'opponent', val)}
                      placeholder="GEGNER EINTRAGEN..."
                    />
                    <datalist id="opponent-list-mask">
                      {opponents.map((opp) => (
                        <option key={opp.id} value={opp.name} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#1A1A1A]">
                    {match.opponent || 'KEIN GEGNER'}
                  </h2>
                )}
              </div>
              
              <div className="shrink-0 flex flex-col items-center justify-center bg-white px-5 py-2 border border-[#DADADA] rounded-xl shadow-xs">
                <label className="text-[10px] font-black uppercase text-[#4A4A4A] block mb-0.5">Ergebnis</label>
                {isEditing ? (
                  <EditableInput 
                    className="bg-transparent text-center text-2xl font-black w-24 outline-none text-[#FB7185] focus:border-b-2 focus:border-[#FB7185]"
                    value={match.result || ''}
                    onSave={(val) => onUpdateMatch?.(match.id, 'result', val)}
                    placeholder="-:-"
                  />
                ) : (
                  <span className="text-2xl font-black text-[#FB7185]">{match.result || '-:-'}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 items-center ml-4">
            <button
              onClick={handleExportICS}
              className="bg-[#4C6FFF] hover:bg-[#4C6FFF]/90 text-white font-black text-xs uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              title="In Kalender eintragen (ICS)"
            >
              <Download size={14} /> Kalender (.ics)
            </button>
            <button 
              onClick={onClose}
              className="bg-white text-[#1A1A1A] p-2 hover:bg-[#F4F4F4] transition-colors border border-[#DADADA] rounded-xl cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Info Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 border-b border-[#DADADA] bg-white">
          <div className="p-3.5 border-b md:border-b-0 md:border-r border-[#DADADA] flex items-center gap-3">
            <div className="bg-[#F4F4F4] border border-[#DADADA] p-2 rounded-xl text-[#4C6FFF] shrink-0">
              <MapPin size={18} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-[#4A4A4A] block">Spielort</label>
              {isEditing ? (
                <EditableInput 
                  className="bg-[#F4F4F4] border border-[#DADADA] rounded px-2 py-0.5 font-bold text-xs outline-none w-full text-[#1A1A1A] focus:bg-white"
                  value={match.location || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'location', val)}
                />
              ) : (
                <span className="font-bold text-xs uppercase text-[#1A1A1A]">{match.location || 'Nicht festgelegt'}</span>
              )}
            </div>
          </div>

          <div className="p-3.5 border-b md:border-b-0 md:border-r border-[#DADADA] flex items-center gap-3">
            <div className="bg-[#F4F4F4] border border-[#DADADA] p-2 rounded-xl text-[#4C6FFF] shrink-0">
              <Flag size={18} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-[#4A4A4A] block">Treffpunkt</label>
              {isEditing ? (
                <EditableInput 
                  className="bg-[#F4F4F4] border border-[#DADADA] rounded px-2 py-0.5 font-bold text-xs outline-none w-full text-[#1A1A1A] focus:bg-white"
                  value={match.meetingPoint || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'meetingPoint', val)}
                />
              ) : (
                <span className="font-bold text-xs uppercase text-[#1A1A1A]">{match.meetingPoint || 'Nicht festgelegt'}</span>
              )}
            </div>
          </div>

          <div className="p-3.5 border-b md:border-b-0 md:border-r border-[#DADADA] flex items-center gap-3">
            <div className="bg-[#F4F4F4] border border-[#DADADA] p-2 rounded-xl text-[#4C6FFF] shrink-0">
              <Clock size={18} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-[#4A4A4A] block">Spielbeginn</label>
              {isEditing ? (
                <EditableInput 
                  className="bg-[#F4F4F4] border border-[#DADADA] rounded px-2 py-0.5 font-bold text-xs outline-none w-full text-[#1A1A1A] focus:bg-white"
                  value={match.kickOff || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'kickOff', val)}
                />
              ) : (
                <span className="font-bold text-xs uppercase text-[#1A1A1A]">{match.kickOff || '--:--'} Uhr</span>
              )}
            </div>
          </div>

          <div className="p-3.5 flex items-center gap-3">
            <div className="bg-[#F4F4F4] border border-[#DADADA] p-2 rounded-xl text-[#4C6FFF] shrink-0">
              <Timer size={18} />
            </div>
            <div className="flex-1">
              <label className="text-[9px] font-black uppercase text-[#4A4A4A] block">Treffzeit</label>
              {isEditing ? (
                <EditableInput 
                  className="bg-[#F4F4F4] border border-[#DADADA] rounded px-2 py-0.5 font-bold text-xs outline-none w-full text-[#1A1A1A] focus:bg-white"
                  value={match.meetingTime || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'meetingTime', val)}
                />
              ) : (
                <span className="font-bold text-xs uppercase text-[#1A1A1A]">{match.meetingTime || '--:--'} Uhr</span>
              )}
            </div>
          </div>
        </div>

        {/* Player List & Einsatzzeiten */}
        <div className="flex-1 overflow-auto p-5 bg-[#F4F4F4] custom-scrollbar">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-[#4C6FFF]" />
            <h3 className="font-black uppercase text-xs tracking-wider text-[#1A1A1A]">Eingesetzte Spieler</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedMatchPlayers.map((player) => (
              <div 
                key={player.id}
                className={`flex items-center gap-3 p-3 border border-[#DADADA] rounded-xl bg-white shadow-xs transition-all ${player.minutes === 0 ? 'opacity-40' : ''}`}
              >
                <div className="w-9 h-9 bg-[#1A1A1A] text-[#FACC15] rounded-lg flex items-center justify-center font-black text-sm shrink-0">
                  {player.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black uppercase text-xs truncate text-[#1A1A1A]">{player.lastName}</div>
                  <div className="text-[10px] font-black text-[#4C6FFF] uppercase">{player.position}</div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase text-[#4A4A4A]">Min</span>
                  <span className="text-sm font-black text-[#1A1A1A]">{player.minutes}</span>
                </div>
              </div>
            ))}
            {sortedMatchPlayers.length === 0 && (
              <div className="col-span-full py-8 text-center border border-dashed border-[#DADADA] rounded-xl bg-white">
                <p className="font-bold text-[#4A4A4A] text-xs uppercase tracking-wider">Keine Spielerdaten für dieses Spiel vorhanden</p>
              </div>
            )}
          </div>

          {/* Scorers, Cards & Notes */}
          <div className="mt-6 pt-5 border-t border-[#DADADA] grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#DADADA] rounded-xl p-4 shadow-xs">
              <h4 className="font-black uppercase text-xs mb-2 flex items-center gap-1.5 text-[#FB7185]">
                <span>⚽</span> Torschützen
              </h4>
              {isEditing ? (
                <EditableInput 
                  className="w-full border border-[#DADADA] p-2 font-bold text-xs uppercase outline-none focus:border-[#4C6FFF] bg-[#F4F4F4] text-[#1A1A1A] rounded-lg"
                  placeholder="z.B. Müller (2), Meier (45')..."
                  value={match.scorers || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'scorers', val)}
                />
              ) : (
                <p className="font-bold text-xs uppercase bg-[#F4F4F4] p-2.5 rounded-lg border border-[#DADADA] text-[#1A1A1A]">
                  {match.scorers || 'Keine Torschützen eingetragen'}
                </p>
              )}
            </div>

            <div className="bg-white border border-[#DADADA] rounded-xl p-4 shadow-xs">
              <h4 className="font-black uppercase text-xs mb-2 flex items-center gap-1.5 text-amber-600">
                <span>🟨</span> Karten (Gelb/Rot)
              </h4>
              {isEditing ? (
                <EditableInput 
                  className="w-full border border-[#DADADA] p-2 font-bold text-xs uppercase outline-none focus:border-[#4C6FFF] bg-[#F4F4F4] text-[#1A1A1A] rounded-lg"
                  placeholder="z.B. Müller (Gelb), Schmidt (Rot)..."
                  value={match.cards || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'cards', val)}
                />
              ) : (
                <p className="font-bold text-xs uppercase bg-[#F4F4F4] p-2.5 rounded-lg border border-[#DADADA] text-[#1A1A1A]">
                  {match.cards || 'Keine Karten eingetragen'}
                </p>
              )}
            </div>

            <div className="col-span-full bg-white border border-[#DADADA] rounded-xl p-4 shadow-xs">
              <h4 className="font-black uppercase text-xs mb-2 flex items-center gap-1.5 text-[#1A1A1A]">
                <span>📝</span> Allgemeine Spielnotizen &amp; Taktikberichte
              </h4>
              {isEditing ? (
                <EditableTextarea 
                  className="w-full border border-[#DADADA] p-2.5 font-medium text-xs outline-none focus:border-[#4C6FFF] min-h-[90px] bg-[#F4F4F4] text-[#1A1A1A] rounded-lg"
                  placeholder="Allgemeine Spielnotizen, Aufstellungsdetails, Notizen..."
                  value={match.notes || ''}
                  onSave={(val) => onUpdateMatch?.(match.id, 'notes', val)}
                />
              ) : (
                <p className="font-medium text-xs whitespace-pre-wrap bg-[#F4F4F4] p-3 rounded-lg border border-[#DADADA] text-[#1A1A1A]">
                  {match.notes || 'Keine Spielnotizen vorhanden'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F4F4F4] border-t border-[#DADADA] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-[#4C6FFF]" />
            <span className="text-xs font-black uppercase tracking-wider text-[#1A1A1A]">FC Auggen 1921 e.V.</span>
          </div>
          <div className="text-xs font-black uppercase text-[#4A4A4A]">
            {match.isHome ? 'Heimspiel' : 'Auswärtsspiel'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
