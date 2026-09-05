import React, { useState } from 'react';
import { MeetingEntry, Player, ScoutingEntry } from '../../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  Trash2, 
  User, 
  Target, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react';

interface MeetingsCalendarViewProps {
  players: Player[];
  scoutingCandidates: ScoutingEntry[];
  meetingsData: MeetingEntry[];
  handleAddMeetingEntry: () => void;
  handleUpdateMeetingEntry: (id: string, field: keyof MeetingEntry, value: any) => void;
  handleRemoveMeetingEntry: (id: string) => void;
  handleResetMeetings?: () => void;
  handleImportMeetings?: () => void;
  onAddScoutingCandidate: (candidate: ScoutingEntry) => void;
  onOpenGoogleCalendar?: () => void;
  isEditing?: boolean;
}

export const MeetingsCalendarView: React.FC<MeetingsCalendarViewProps> = ({
  players,
  scoutingCandidates,
  meetingsData,
  handleAddMeetingEntry,
  handleUpdateMeetingEntry,
  handleRemoveMeetingEntry,
  handleResetMeetings,
  handleImportMeetings,
  onOpenGoogleCalendar,
  isEditing = false
}) => {
  console.log('MeetingsCalendarView rendered with meetingsData:', meetingsData);
  const [filter, setFilter] = useState<'all' | 'kader' | 'scouting'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Offen' | 'Zusage' | 'Absage'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredMeetings = meetingsData
    .filter(m => {
      // Type filter
      let matchesType = true;
      if (filter === 'kader') {
        matchesType = players.some(p => {
          const playerNameLower = m.playerName.toLowerCase();
          const pLastNameLower = (p.lastName || '').toLowerCase();
          return playerNameLower.includes(pLastNameLower);
        });
      }
      else if (filter === 'scouting') {
        matchesType = scoutingCandidates.some(c => {
          const playerNameLower = m.playerName.toLowerCase();
          const cNameLower = (c.name || '').toLowerCase();
          return playerNameLower.includes(cNameLower);
        });
      }

      // Status filter
      let matchesStatus = true;
      if (statusFilter !== 'all') matchesStatus = (m.status || 'Offen') === statusFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter) matchesDate = m.date === dateFilter;

      return matchesType && matchesStatus && matchesDate;
    });

  const sortByDateTime = (a: MeetingEntry, b: MeetingEntry) => {
    const dateA = a.date + ' ' + (a.time || '00:00');
    const dateB = b.date + ' ' + (b.time || '00:00');
    return dateB.localeCompare(dateA);
  };

  const handleDelete = (id: string) => {
    handleRemoveMeetingEntry(id);
  };

  const MeetingCard: React.FC<{ meeting: MeetingEntry }> = ({ meeting }) => {
    const isPlayer = players.some(p => 
      meeting.playerName.toLowerCase().includes(p.lastName.toLowerCase())
    );
    const isScouting = scoutingCandidates.some(c => 
      meeting.playerName.toLowerCase().includes(c.name.toLowerCase())
    );
    const categoryBorder = isScouting ? 'border-emerald-500/50' : isPlayer ? 'border-sky-500/50' : 'border-slate-800';

    return (
      <div className={`bg-slate-900 border rounded-2xl shadow-xl flex flex-col overflow-hidden group transition-all hover:border-amber-400/50 ${categoryBorder}`}>
        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <input 
                  type="date"
                  value={meeting.date}
                  onChange={(e) => handleUpdateMeetingEntry(meeting.id, 'date', e.target.value)}
                  className="text-xs font-bold bg-slate-900 text-slate-100 border border-slate-700 rounded-lg px-2 py-0.5 focus:outline-none focus:border-amber-400"
                />
                <input 
                  type="time"
                  value={meeting.time}
                  onChange={(e) => handleUpdateMeetingEntry(meeting.id, 'time', e.target.value)}
                  className="text-xs font-bold bg-slate-900 text-slate-100 border border-slate-700 rounded-lg px-2 py-0.5 focus:outline-none focus:border-amber-400 w-20"
                />
              </div>
            ) : (
              <>
                <span className="text-xs font-black text-amber-400">{meeting.date.split('-').reverse().join('.')}</span>
                <span className="text-xs text-slate-600">|</span>
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1"><Clock size={11} className="text-amber-400/80" /> {meeting.time}</span>
              </>
            )}
          </div>
          {isEditing && (
            <button 
              onClick={() => {
                handleDelete(meeting.id);
              }} 
              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Termin löschen"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        
        <div className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isScouting ? <Target size={15} className="text-emerald-400" /> : <User size={15} className="text-sky-400" />}
              <h4 className="font-black uppercase text-sm tracking-wide text-slate-100">
                {meeting.playerName.split(',')[0]}
              </h4>
              {meeting.isScout && (
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  + SCOUT
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <MapPin size={11} className="text-slate-500" /> {meeting.location}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Gesprächsnotizen</label>
            <textarea 
              className={`w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-400 min-h-[60px] resize-none ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder={isEditing ? "Notizen eintragen..." : ""}
              value={meeting.notes}
              onChange={(e) => handleUpdateMeetingEntry(meeting.id, 'notes', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Grund der Zusage/Absage</label>
            <textarea 
              className={`w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2.5 text-xs font-semibold focus:outline-none focus:border-amber-400 min-h-[40px] resize-none ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder={isEditing ? "Grund angeben..." : ""}
              value={meeting.reason || ''}
              onChange={(e) => handleUpdateMeetingEntry(meeting.id, 'reason', e.target.value)}
              disabled={!isEditing}
            />
          </div>

          {isEditing && (
            <select 
              value={meeting.status || 'Offen'}
              onChange={(e) => handleUpdateMeetingEntry(meeting.id, 'status', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-amber-400"
            >
              <option value="Offen">Offen</option>
              <option value="Zusage">Zusage</option>
              <option value="Absage">Absage</option>
            </select>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden rounded-2xl border border-slate-800 shadow-2xl">
      {/* Sidebar */}
      <div className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black uppercase text-xs tracking-wider text-amber-400 flex items-center gap-2">
              <CalendarIcon size={14} /> Datum Filter
            </h3>
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-[10px] font-bold uppercase text-rose-400 hover:underline"
              >
                Löschen
              </button>
            )}
          </div>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-xl p-2 text-xs font-bold focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="p-4 space-y-6">
          {onOpenGoogleCalendar && (
            <button
              onClick={onOpenGoogleCalendar}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 mb-3"
            >
              <CalendarIcon size={15} className="text-amber-400" />
              <span>Google Kalender</span>
            </button>
          )}

          {isEditing && (
            <button 
              onClick={handleAddMeetingEntry}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 py-3 text-xs font-black uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-95 mb-4"
            >
              <Plus size={15} /> NEUER TERMIN
            </button>
          )}
          <div>
            <h4 className="font-black uppercase text-xs tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Filter size={14} className="text-amber-400" /> Typ Filter
            </h4>
            <div className="space-y-1.5">
              {[
                { id: 'all', label: 'Alle Termine', color: 'bg-amber-400' },
                { id: 'kader', label: 'Kader-Gespräche', color: 'bg-sky-400' },
                { id: 'scouting', label: 'Scouting-Termine', color: 'bg-emerald-400' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id as any)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider
                    ${filter === f.id ? 'border-amber-400/60 bg-slate-950 text-amber-400' : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'}`}
                >
                  <span className={`w-2.5 h-2.5 ${f.color} rounded-full`}></span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-black uppercase text-xs tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <RefreshCw size={14} className="text-amber-400" /> Status Filter
            </h4>
            <div className="space-y-1.5">
              {[
                { id: 'all', label: 'Alle Status', color: 'bg-slate-400' },
                { id: 'Offen', label: 'Offen', color: 'bg-amber-400' },
                { id: 'Zusage', label: 'Zusage', color: 'bg-emerald-400' },
                { id: 'Absage', label: 'Absage', color: 'bg-rose-500' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider
                    ${statusFilter === f.id ? 'border-amber-400/60 bg-slate-950 text-amber-400' : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'}`}
                >
                  <span className={`w-2.5 h-2.5 ${f.color} rounded-full`}></span>
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 space-y-2">
          {isEditing && handleImportMeetings && (
            <button 
              onClick={handleImportMeetings}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} /> TERMINE IMPORTIEREN
            </button>
          )}
          {isEditing && handleResetMeetings && (
            <button 
              onClick={handleResetMeetings}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> DATEN ZURÜCKSETZEN
            </button>
          )}
        </div>
      </div>

      {/* Main Kanban View */}
      <div className="flex-1 overflow-x-auto bg-slate-950 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400">Gesprächskalender</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Terminplanung & Gesprächsdokumentation</p>
        </div>
        <div className="flex gap-6 h-[calc(100%-70px)] min-w-[1000px]">
          {/* Column: Zusage */}
          <div className="flex-1 flex flex-col min-w-[320px]">
            <div className="bg-slate-900 border border-emerald-800/80 text-emerald-400 p-3.5 rounded-2xl mb-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                Zusagen
              </h3>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                {filteredMeetings.filter(m => m.status === 'Zusage').length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {filteredMeetings.filter(m => m.status === 'Zusage').sort(sortByDateTime).map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>

          {/* Column: Offen */}
          <div className="flex-1 flex flex-col min-w-[320px]">
            <div className="bg-slate-900 border border-amber-800/80 text-amber-400 p-3.5 rounded-2xl mb-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" />
                Offen
              </h3>
              <span className="bg-amber-950 text-amber-300 border border-amber-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                {filteredMeetings.filter(m => (m.status || 'Offen') === 'Offen').length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {filteredMeetings.filter(m => (m.status || 'Offen') === 'Offen').sort(sortByDateTime).map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>

          {/* Column: Absage */}
          <div className="flex-1 flex flex-col min-w-[320px]">
            <div className="bg-slate-900 border border-rose-800/80 text-rose-400 p-3.5 rounded-2xl mb-4 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-wider text-xs flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-rose-400 rounded-full animate-pulse" />
                Absagen
              </h3>
              <span className="bg-rose-950 text-rose-300 border border-rose-800 text-xs px-2.5 py-0.5 rounded-full font-black">
                {filteredMeetings.filter(m => m.status === 'Absage').length}
              </span>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
              {filteredMeetings.filter(m => m.status === 'Absage').sort(sortByDateTime).map(meeting => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
