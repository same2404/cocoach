import React, { useState } from 'react';
import { Player } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { 
  Activity, 
  Plus, 
  Trash2, 
  Target, 
  TrendingUp, 
  Calendar, 
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users
} from 'lucide-react';

const INDIVIDUAL_FIELDS: { key: string; label: string }[] = [
  { key: 'ek', label: 'Erster Kontakt' },
  { key: 'o', label: 'Offene Stellung' },
  { key: 't', label: 'Torschuss' },
  { key: 'p', label: 'Passspiel' },
  { key: 's', label: 'Standards' },
  { key: 'a', label: 'Athletik' },
  { key: 'w', label: 'Technik' },
];

interface IndividualSteuerungViewProps {
  players: Player[];
  individualTrainingData: any[];
  selectedIndividualDate: string;
  setSelectedIndividualDate: (date: string) => void;
  handleUpdateIndividualTraining: (playerId: string, field: string, value: any) => void;
  onUpdatePlayer: (id: string, field: keyof Player, value: any) => void;
  onDeletePlayer: (id: string) => void;
  onAddPlayer?: () => void;
  onAddPlayerDirect?: (player: any) => void;
  isEditing?: boolean;
}

export const IndividualSteuerungView: React.FC<IndividualSteuerungViewProps> = ({
  players,
  individualTrainingData,
  selectedIndividualDate,
  setSelectedIndividualDate,
  handleUpdateIndividualTraining,
  onUpdatePlayer,
  onDeletePlayer,
  onAddPlayer,
  onAddPlayerDirect,
  isEditing = false
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [ampelFilter, setAmpelFilter] = React.useState<'ALLE' | 'Grün' | 'Gelb' | 'Rot'>('ALLE');
  const [newPlayer, setNewPlayer] = React.useState({
    lastName: '',
    firstName: '',
    number: '',
    position: '',
    category: 'player' as any
  });

  const sortedPlayers = sortPlayers(players).filter(p => p.category === 'player');

  const getPlayerAmpelStatus = (player: Player): 'Grün' | 'Gelb' | 'Rot' => {
    const record = individualTrainingData.find(r => r.playerId === player.id && r.date === selectedIndividualDate);
    if (record?.loadAmpel) return record.loadAmpel;
    if (player.loadAmpel) return player.loadAmpel;
    if (player.isInjured || player.status === 'Verletzt') return 'Rot';
    if (player.status === 'Reha' || player.status === 'Vorsicht' || record?.load === 'Pause') return 'Gelb';
    return 'Grün';
  };

  const ampelCounts = React.useMemo(() => {
    let green = 0;
    let yellow = 0;
    let red = 0;
    sortedPlayers.forEach(p => {
      const status = getPlayerAmpelStatus(p);
      if (status === 'Grün') green++;
      else if (status === 'Gelb') yellow++;
      else if (status === 'Rot') red++;
    });
    return { green, yellow, red, total: sortedPlayers.length };
  }, [sortedPlayers, individualTrainingData, selectedIndividualDate]);

  const filteredPlayers = sortedPlayers.filter(p => {
    const matchesSearch = p.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.number?.toString().includes(searchTerm);
    if (!matchesSearch) return false;

    if (ampelFilter !== 'ALLE') {
      const status = getPlayerAmpelStatus(p);
      return status === ampelFilter;
    }
    return true;
  });

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleQuickAddPlayer = () => {
    if (!newPlayer.lastName || !newPlayer.position) {
      setStatusMsg('Bitte Nachname und Position eingeben.');
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }
    const playerToSave: any = {
      ...newPlayer,
      id: `p${Date.now()}`,
      name: `${newPlayer.firstName} ${newPlayer.lastName}`.trim(),
      number: parseInt(newPlayer.number) || 0,
      status: 'Aktiv'
    };
    if (onAddPlayerDirect) {
      onAddPlayerDirect(playerToSave);
      setNewPlayer({
        lastName: '',
        firstName: '',
        number: '',
        position: '',
        category: 'player' as any
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0E17] text-white p-3 sm:p-6 rounded-2xl border border-[#334155] shadow-xl min-h-screen space-y-5">
      {/* ----------------- TOP HEADER / CONTROL BAR ----------------- */}
      <div className="bg-[#121824] border border-[#334155] rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/25 mb-2 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>FC Auggen • Performance &amp; Steuerung</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tight text-white flex items-center gap-2">
              <span>Individuelle Steuerung</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Belastungssteuerung, individuelle Schwerpunkte und Saisonziele im CoCoach-System.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-[#0A0E17] border border-[#334155] px-3 py-1.5 rounded-xl focus-within:border-[#F59E0B]/60 transition-all">
              <Search size={14} className="text-slate-500" />
              <input 
                type="text" 
                placeholder="SPIELER SUCHEN..." 
                className="bg-transparent text-white text-xs font-bold uppercase focus:outline-none w-36 sm:w-44 placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-[#0A0E17] border border-[#334155] px-3 py-1.5 rounded-xl">
              <Calendar size={14} className="text-slate-400" />
              <input 
                type="date"
                className="bg-transparent text-white text-xs font-black uppercase focus:outline-none cursor-pointer [color-scheme:dark]"
                value={selectedIndividualDate}
                onChange={(e) => setSelectedIndividualDate(e.target.value)}
              />
            </div>

            {isEditing && onAddPlayer && (
              <button 
                onClick={onAddPlayer}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg border border-[#10B981] cursor-pointer"
              >
                <Plus size={14} className="stroke-[3]" />
                <span>Spieler anlegen</span>
              </button>
            )}
          </div>
        </div>

        {/* Belastungs-Ampel Schnell-Filter & Status KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#334155]">
          <button
            onClick={() => setAmpelFilter('ALLE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              ampelFilter === 'ALLE'
                ? 'bg-white text-[#0A0E17] border-white shadow-lg'
                : 'bg-[#1E293B] text-white border-[#334155] hover:bg-[#0A1628]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${ampelFilter === 'ALLE' ? 'text-[#0A0E17]' : 'text-[#F59E0B]'}`}>
                Gesamtkader
              </span>
              <Users size={14} className={ampelFilter === 'ALLE' ? 'text-[#0A0E17]' : 'text-[#F59E0B]'} />
            </div>
            <div className="text-xl font-black mt-1">{ampelCounts.total} Spieler</div>
          </button>

          <button
            onClick={() => setAmpelFilter('Grün')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              ampelFilter === 'Grün'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg'
                : 'bg-[#1E293B] text-white border-[#334155] hover:border-emerald-500/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${ampelFilter === 'Grün' ? 'text-white' : 'text-emerald-400'}`}>
                100% Voll
              </span>
              <CheckCircle2 size={14} className={ampelFilter === 'Grün' ? 'text-white' : 'text-emerald-400'} />
            </div>
            <div className={`text-xl font-black mt-1 ${ampelFilter === 'Grün' ? 'text-white' : 'text-emerald-400'}`}>
              {ampelCounts.green}
            </div>
          </button>

          <button
            onClick={() => setAmpelFilter('Gelb')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              ampelFilter === 'Gelb'
                ? 'bg-amber-400 text-[#0A0E17] border-amber-400 shadow-lg'
                : 'bg-[#1E293B] text-white border-[#334155] hover:border-amber-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${ampelFilter === 'Gelb' ? 'text-[#0A0E17]' : 'text-amber-400'}`}>
                Teilbelastung
              </span>
              <AlertTriangle size={14} className={ampelFilter === 'Gelb' ? 'text-[#0A0E17]' : 'text-amber-400'} />
            </div>
            <div className={`text-xl font-black mt-1 ${ampelFilter === 'Gelb' ? 'text-[#0A0E17]' : 'text-amber-400'}`}>
              {ampelCounts.yellow}
            </div>
          </button>

          <button
            onClick={() => setAmpelFilter('Rot')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              ampelFilter === 'Rot'
                ? 'bg-[#FB7185] text-white border-[#FB7185] shadow-lg'
                : 'bg-[#1E293B] text-white border-[#334155] hover:border-[#FB7185]/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${ampelFilter === 'Rot' ? 'text-white' : 'text-rose-400'}`}>
                Ausfall / Schonung
              </span>
              <XCircle size={14} className={ampelFilter === 'Rot' ? 'text-white' : 'text-rose-400'} />
            </div>
            <div className={`text-xl font-black mt-1 ${ampelFilter === 'Rot' ? 'text-white' : 'text-rose-400'}`}>
              {ampelCounts.red}
            </div>
          </button>
        </div>
      </div>

      {/* ----------------- TABLE CONTAINER ----------------- */}
      <div className="flex-1 bg-[#121824] border border-[#334155] rounded-2xl shadow-lg overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full border-collapse text-left text-xs min-w-[1320px]">
            <thead className="sticky top-0 bg-[#0A0E17] text-white z-20 border-b border-[#334155]">
              <tr>
                <th className="p-3 border-r border-[#334155] text-center w-12 text-slate-500 font-black uppercase">Nr</th>
                <th className="p-3 border-r border-[#334155] text-left w-52 font-black uppercase">Spieler</th>
                <th className="p-3 border-r border-[#334155] text-center w-16 font-black uppercase text-[#F59E0B]">Pos</th>
                <th className="p-3 border-r border-[#334155] text-center w-40 font-black uppercase">Belastungs-Ampel</th>
                <th className="p-3 border-r border-[#334155] text-left w-32 font-black uppercase text-slate-500">Datum</th>
                <th className="p-3 border-r border-[#334155] text-left font-black uppercase">Individueller Schwerpunkt</th>
                <th className="p-3 border-r border-[#334155] text-left font-black uppercase text-slate-500">Saisonziele</th>
                <th className="p-3 border-r border-[#334155] text-left font-black uppercase text-slate-500">Status / Fortschritt</th>
                <th className="p-3 border-r border-[#334155] text-center w-24 font-black uppercase">Intensität</th>
                {INDIVIDUAL_FIELDS.map(f => (
                  <th key={f.key} className="p-2 border-r border-[#334155] text-center w-20 align-bottom text-slate-500 font-black text-[10px] leading-tight">{f.label}</th>
                ))}
                {isEditing && <th className="p-3 border-r border-[#334155] text-center w-12 text-[#FB7185] font-black uppercase">Aktion</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {/* Quick Add Player Row */}
              {isEditing && (
                <tr className="bg-[#0A1628] border-b border-[#334155]">
                  <td className="p-2 border-r border-[#334155]">
                    <input 
                      type="number"
                      className="w-full bg-[#0A0E17] text-white border border-[#334155] rounded p-1 font-bold text-center focus:outline-none focus:border-[#F59E0B]"
                      placeholder="NR"
                      value={newPlayer.number}
                      onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                    />
                  </td>
                  <td className="p-2 border-r border-[#334155]">
                    <div className="flex gap-1">
                      <input 
                        type="text"
                        className="bg-[#0A0E17] text-white border border-[#334155] rounded p-1 font-bold uppercase focus:outline-none w-1/2 px-1 focus:border-[#F59E0B]"
                        placeholder="VORNAME"
                        value={newPlayer.firstName}
                        onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                      />
                      <input 
                        type="text"
                        className="bg-[#0A0E17] text-white border border-[#334155] rounded p-1 font-bold uppercase focus:outline-none w-1/2 px-1 focus:border-[#F59E0B]"
                        placeholder="NACHNAME"
                        value={newPlayer.lastName}
                        onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                      />
                    </div>
                  </td>
                  <td className="p-2 border-r border-[#334155] text-center">
                    <input 
                      type="text"
                      className="w-full bg-[#0A0E17] text-[#F59E0B] border border-[#334155] rounded p-1 font-bold text-center focus:outline-none focus:border-[#F59E0B] uppercase"
                      placeholder="POS"
                      value={newPlayer.position}
                      onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                    />
                  </td>
                  <td colSpan={12} className="p-2 border-r border-[#334155]">
                    <div className="flex items-center justify-between">
                      <select 
                        className="bg-[#0A0E17] text-white border border-[#334155] rounded font-bold uppercase focus:outline-none text-[10px] px-2 py-1 cursor-pointer"
                        value={newPlayer.category}
                        onChange={(e) => setNewPlayer({ ...newPlayer, category: e.target.value as any })}
                      >
                        <option value="player">Spieler</option>
                        <option value="staff">Trainerteam</option>
                        <option value="official">Funktionär</option>
                      </select>
                      <button 
                        onClick={handleQuickAddPlayer}
                        className="bg-[#10B981] text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-[#059669] transition-all border border-[#10B981] cursor-pointer"
                      >
                        Direkt Hinzufügen
                      </button>
                      {statusMsg && (
                        <span className="text-[10px] font-black text-rose-400 uppercase bg-rose-500/10 px-2 py-1 rounded border border-rose-500/30 animate-pulse">
                          {statusMsg}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {['player', 'staff', 'official'].map(category => {
                const categoryPlayers = filteredPlayers.filter(p => (p.category || 'player') === category);
                if (categoryPlayers.length === 0) return null;

                return (
                  <React.Fragment key={category}>
                    <tr className="bg-[#0A1628] text-white">
                      <td colSpan={isEditing ? 17 : 16} className="px-4 py-2.5 font-black uppercase text-xs tracking-widest border-y border-[#334155] text-[#F59E0B] border-l-4 border-l-[#F59E0B]">
                        {category === 'player' ? '⚽ Spielerkader' : category === 'staff' ? '📋 Trainerteam' : '🛡️ Funktionäre'}
                      </td>
                    </tr>
                    {categoryPlayers.map((player, pIdx) => {
                      const record = individualTrainingData.find(r => r.playerId === player.id && r.date === selectedIndividualDate) || {
                        focus: '',
                        goals: '',
                        status: '',
                        load: 'Normal',
                        loadAmpel: undefined,
                        targetDate: '',
                        ek: '',
                        o: '',
                        t: '',
                        p: '',
                        s: '',
                        a: '',
                        w: ''
                      };

                      const currentAmpel = getPlayerAmpelStatus(player);

                      const handleAmpelChange = (newAmpel: 'Grün' | 'Gelb' | 'Rot') => {
                        handleUpdateIndividualTraining(player.id, 'loadAmpel', newAmpel);
                        onUpdatePlayer(player.id, 'loadAmpel', newAmpel);
                      };

                      return (
                        <tr key={player.id} className="hover:bg-[#0A1628] transition-colors border-b border-[#334155] bg-[#121824] text-white">
                          <td className="p-2.5 border-r border-[#334155] text-center text-slate-500 font-mono font-bold">{pIdx + 1}</td>
                          <td className="p-2.5 border-r border-[#334155]">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 flex items-center justify-center bg-[#0A0E17] text-white border border-[#334155] text-[10px] font-black shrink-0 rounded-lg">
                                {player.category === 'player' ? `#${player.number || '-'}` : (player.category === 'staff' ? 'T' : 'F')}
                              </span>
                              <div className="flex gap-1 flex-1">
                                <input 
                                  type="text"
                                  className={`bg-transparent focus:outline-none w-full text-white font-black uppercase text-xs ${!isEditing ? 'cursor-not-allowed' : 'focus:bg-[#0A0E17] focus:px-1.5 rounded border border-[#334155]'}`}
                                  value={player.lastName || ''}
                                  onChange={(e) => onUpdatePlayer(player.id, 'lastName', e.target.value)}
                                  disabled={!isEditing}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-2.5 border-r border-[#334155] text-center text-[#F59E0B] font-black text-xs">{player.position}</td>
                          
                          {/* Belastungs-Ampel (Grün / Gelb / Rot) */}
                          <td className="p-2 border-r border-[#334155] text-center bg-[#0A1628]">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleAmpelChange('Grün')}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  currentAmpel === 'Grün' 
                                    ? 'bg-emerald-500 text-white shadow-lg ring-2 ring-emerald-300/60 scale-105' 
                                    : 'bg-[#121824] text-emerald-400 border border-[#334155] opacity-40 hover:opacity-100'
                                }`}
                                title="🟢 GRÜN: 100% Voll belastbar & einsatzbereit"
                              >
                                🟢
                              </button>
                              <button
                                onClick={() => handleAmpelChange('Gelb')}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  currentAmpel === 'Gelb' 
                                    ? 'bg-amber-400 text-[#0A0E17] shadow-lg ring-2 ring-amber-300/60 scale-105' 
                                    : 'bg-[#121824] text-amber-400 border border-[#334155] opacity-40 hover:opacity-100'
                                }`}
                                title="🟡 GELB: Teilbelastung (z.B. max. 45 Min / Reduzierte Intensität)"
                              >
                                🟡
                              </button>
                              <button
                                onClick={() => handleAmpelChange('Rot')}
                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                                  currentAmpel === 'Rot' 
                                    ? 'bg-[#FB7185] text-white shadow-lg ring-2 ring-rose-300/60 scale-105' 
                                    : 'bg-[#121824] text-rose-400 border border-[#334155] opacity-40 hover:opacity-100'
                                }`}
                                title="🔴 ROT: Keine Belastung (Verletzt / Schonung / Reha)"
                              >
                                🔴
                              </button>
                            </div>
                            <div className="text-[9px] font-black uppercase mt-1">
                              {currentAmpel === 'Grün' && <span className="text-emerald-400 font-bold">Voll (100%)</span>}
                              {currentAmpel === 'Gelb' && <span className="text-amber-400 font-bold">Teil (Max 45m)</span>}
                              {currentAmpel === 'Rot' && <span className="text-rose-400 font-bold">Ausfall / Pause</span>}
                            </div>
                          </td>

                          <td className="p-2 border-r border-[#334155]">
                            <input 
                              type="date"
                              className={`w-full bg-[#0A0E17] text-white border border-[#334155] px-2 py-1 rounded-lg text-xs font-bold focus:outline-none focus:border-[#F59E0B] ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''} [color-scheme:dark]`}
                              value={record.targetDate || ''}
                              onChange={(e) => handleUpdateIndividualTraining(player.id, 'targetDate', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-2 border-r border-[#334155]">
                            <input 
                              type="text"
                              className={`w-full bg-[#0A0E17] text-white border border-[#334155] px-2.5 py-1 rounded-lg text-xs font-bold uppercase focus:outline-none focus:border-[#F59E0B] placeholder:text-slate-600 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                              placeholder={isEditing ? "Z.B. ABSCHLUSS..." : ""}
                              value={record.focus || ''}
                              onChange={(e) => handleUpdateIndividualTraining(player.id, 'focus', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-2 border-r border-[#334155]">
                            <input 
                              type="text"
                              className={`w-full bg-[#0A0E17] text-slate-300 border border-[#334155] px-2.5 py-1 rounded-lg text-xs italic font-medium focus:outline-none focus:border-[#F59E0B] placeholder:text-slate-600 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                              placeholder={isEditing ? "Ziele definieren..." : ""}
                              value={record.goals || ''}
                              onChange={(e) => handleUpdateIndividualTraining(player.id, 'goals', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-2 border-r border-[#334155]">
                            <input 
                              type="text"
                              className={`w-full bg-[#0A0E17] text-white border border-[#334155] px-2.5 py-1 rounded-lg text-xs font-bold focus:outline-none focus:border-[#F59E0B] placeholder:text-slate-600 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                              placeholder={isEditing ? "Fortschritt..." : ""}
                              value={record.status || ''}
                              onChange={(e) => handleUpdateIndividualTraining(player.id, 'status', e.target.value)}
                              disabled={!isEditing}
                            />
                          </td>
                          <td className="p-2 text-center border-r border-[#334155]">
                            <select 
                              className={`text-[9px] font-black uppercase p-1.5 border rounded-lg focus:outline-none cursor-pointer
                                ${record.load === 'Hoch' ? 'text-rose-300 border-rose-400/40 bg-rose-500/10' : 
                                  record.load === 'Niedrig' ? 'text-emerald-300 border-emerald-400/40 bg-emerald-500/10' : 
                                  record.load === 'Pause' ? 'text-amber-300 border-amber-400/40 bg-amber-500/10' : 
                                  'text-white border-[#334155] bg-[#0A0E17]'}`}
                              value={record.load || 'Normal'}
                              onChange={(e) => handleUpdateIndividualTraining(player.id, 'load', e.target.value)}
                              disabled={!isEditing}
                            >
                              <option value="Niedrig">Niedrig</option>
                              <option value="Normal">Normal</option>
                              <option value="Hoch">Hoch</option>
                              <option value="Pause">Pause</option>
                            </select>
                          </td>
                          {['ek', 'o', 't', 'p', 's', 'a', 'w'].map(field => (
                            <td key={field} className="p-1 border-r border-[#334155]">
                              <input 
                                type="text"
                                className={`w-full h-full p-1 text-center bg-[#0A0E17] text-white border border-[#334155] rounded text-xs font-bold focus:border-[#F59E0B] focus:outline-none ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                                value={record[field] || ''}
                                onChange={(e) => handleUpdateIndividualTraining(player.id, field, e.target.value)}
                                placeholder={isEditing ? "-" : ""}
                                disabled={!isEditing}
                              />
                            </td>
                          ))}
                          {isEditing && (
                            <td className="p-2 border-r border-[#334155] text-center">
                              <button 
                                onClick={() => {
                                  onDeletePlayer(player.id);
                                }}
                                className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                                title="Spieler löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ----------------- FOOTER / INSIGHT BAR ----------------- */}
      <div className="p-4 bg-[#121824] text-slate-400 border border-[#334155] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 rounded-2xl shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center text-[#F59E0B]">
            <TrendingUp size={16} />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-white">
            Individuelle Förderung &amp; Belastungsmanagement im CoCoach-Standard.
          </span>
        </div>
        <p className="text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider">
          FC Auggen • Saison 2026/27
        </p>
      </div>
    </div>
  );
};

export default IndividualSteuerungView;
