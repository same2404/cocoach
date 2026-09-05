import React, { useState, useMemo } from 'react';
import { Player } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { 
  HeartPulse, 
  Plus, 
  Trash2, 
  Stethoscope, 
  Activity, 
  AlertCircle, 
  Calendar, 
  Users, 
  Briefcase, 
  Shield, 
  User, 
  Target, 
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface PhysioPlanViewProps {
  players: Player[];
  physioEntries: any[];
  onAddPhysioEntry: () => void;
  onUpdatePhysioEntry: (entry: any) => void;
  onUpdatePlayer: (id: string, field: keyof Player, value: any) => void;
  onDeletePlayer: (id: string) => void;
  onDeletePhysioEntry: (id: string) => void;
  setShowAddPlayerModal: (show: boolean) => void;
  isEditing?: boolean;
}

export const PhysioPlanView: React.FC<PhysioPlanViewProps> = ({
  players,
  physioEntries,
  onAddPhysioEntry,
  onUpdatePhysioEntry,
  onUpdatePlayer,
  onDeletePlayer,
  onDeletePhysioEntry,
  setShowAddPlayerModal,
  isEditing = false
}) => {
  const editable = true; // Physio records are always editable to allow continuous logging
  const sortedPlayers = useMemo(() => sortPlayers(players), [players]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALLE');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALLE');

  const [newEntry, setNewEntry] = useState<any>({
    playerId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Behandlung',
    diagnosis: '',
    treatment: '',
    status: 'In Behandlung',
    remarks: ''
  });

  const [quickAddError, setQuickAddError] = useState<string | null>(null);
  const [quickAddSuccess, setQuickAddSuccess] = useState<string | null>(null);

  const handleQuickAdd = () => {
    setQuickAddError(null);
    setQuickAddSuccess(null);

    if (!newEntry.playerId) {
      setQuickAddError('Bitte wählen Sie einen Spieler aus.');
      return;
    }
    if (!newEntry.date) {
      setQuickAddError('Bitte geben Sie ein gültiges Datum an.');
      return;
    }
    if (!newEntry.diagnosis || !newEntry.diagnosis.trim()) {
      setQuickAddError('Bitte geben Sie eine Diagnose oder Beschwerde an.');
      return;
    }

    const entryToSave = {
      ...newEntry,
      diagnosis: newEntry.diagnosis.trim(),
      treatment: (newEntry.treatment || '').trim(),
      remarks: (newEntry.remarks || '').trim(),
      id: Date.now().toString()
    };

    onUpdatePhysioEntry(entryToSave);

    // Synchronize player loadAmpel if applicable
    if (newEntry.playerId) {
      const val = newEntry.status || '';
      if (val.includes('Grün') || val === 'Spielfähig' || val === 'Wieder Fit') {
        onUpdatePlayer(newEntry.playerId, 'loadAmpel', 'Grün');
      } else if (val.includes('Gelb') || val === 'Reha-Phase' || val === 'In Behandlung') {
        onUpdatePlayer(newEntry.playerId, 'loadAmpel', 'Gelb');
      } else if (val.includes('Rot') || val === 'Langzeit' || val === 'Ausfall') {
        onUpdatePlayer(newEntry.playerId, 'loadAmpel', 'Rot');
      }
    }

    setQuickAddSuccess('Eintrag erfolgreich in der Akte gespeichert.');
    setTimeout(() => setQuickAddSuccess(null), 3000);

    // Reset new entry form
    setNewEntry({
      playerId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Behandlung',
      diagnosis: '',
      treatment: '',
      status: 'In Behandlung',
      remarks: ''
    });
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    const entry = physioEntries.find(item => item.id === id);
    if (entry) {
      onUpdatePhysioEntry({ ...entry, [field]: value });
    }
  };

  const handleDelete = (id: string) => {
    onDeletePhysioEntry(id);
  };

  // Grouped personnel counts
  const squadPlayers = sortedPlayers.filter(p => (p.category || 'player') === 'player');
  const fitCount = squadPlayers.filter(p => (p.loadAmpel || 'Grün') === 'Grün').length;
  const partialCount = squadPlayers.filter(p => p.loadAmpel === 'Gelb').length;
  const outCount = squadPlayers.filter(p => p.loadAmpel === 'Rot').length;
  const activeTreatmentsCount = physioEntries.filter(i => 
    i.status !== 'Spielfähig' && i.status !== 'Wieder Fit' && !i.status?.includes('Grün')
  ).length;
  const totalSquad = squadPlayers.length || 1;
  const availabilityRate = Math.round((fitCount / totalSquad) * 100);

  // Filtered physio entries
  const filteredEntries = useMemo(() => {
    return physioEntries.filter(item => {
      const player = players.find(p => p.id === item.playerId);
      const playerName = player ? `${player.firstName || ''} ${player.lastName || (player as any).name || ''}`.toLowerCase() : '';
      const diagnosis = (item.diagnosis || '').toLowerCase();
      const treatment = (item.treatment || '').toLowerCase();
      const matchesSearch = !searchTerm || playerName.includes(searchTerm.toLowerCase()) || diagnosis.includes(searchTerm.toLowerCase()) || treatment.includes(searchTerm.toLowerCase());

      const statusMatches = statusFilter === 'ALLE' || 
        (statusFilter === 'GRÜN' && (item.status?.includes('Grün') || item.status === 'Spielfähig' || item.status === 'Wieder Fit')) ||
        (statusFilter === 'GELB' && (item.status?.includes('Gelb') || item.status === 'In Behandlung' || item.status === 'Reha-Phase')) ||
        (statusFilter === 'ROT' && (item.status?.includes('Rot') || item.status === 'Langzeit' || item.status === 'Ausfall'));

      const catMatches = categoryFilter === 'ALLE' || (player && (player.category || 'player') === categoryFilter);

      return matchesSearch && statusMatches && catMatches;
    });
  }, [physioEntries, players, searchTerm, statusFilter, categoryFilter]);

  // Categorized personnel list for render grouping
  const categorizedPersonnel = {
    player: sortedPlayers.filter(p => (p.category || 'player') === 'player'),
    coach: sortedPlayers.filter(p => p.category === 'coach'),
    staff: sortedPlayers.filter(p => p.category === 'staff'),
    medical: sortedPlayers.filter(p => p.category === 'medical')
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden watermark-bg">
      {/* Top Header Bar */}
      <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30 shadow-xs">
            <HeartPulse size={18} className="animate-pulse text-amber-400" />
          </div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-black uppercase tracking-tight text-white">Physio- & Verletzungsplan</h2>
            <span className="text-slate-700 text-xs">|</span>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Medizinische Abteilung - Aktenführung & Belastung</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowAddPlayerModal(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            <Plus size={13} className="text-amber-400" /> Neuer Spieler
          </button>
          <button 
            onClick={onAddPhysioEntry}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95"
          >
            <Plus size={13} /> Neuer Eintrag
          </button>
        </div>
      </div>

      {/* 1. Kompakte Medizinübersicht (KPI Grid matching BudgetFinanceView) */}
      <div className="p-2.5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-9 gap-2 shrink-0 border-b border-slate-800 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-blue-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Kader Gesamt</label>
          </div>
          <span className="text-sm font-black text-white">{squadPlayers.length} Spieler</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 size={12} className="text-emerald-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">🟢 Fit (100%)</label>
          </div>
          <span className="text-sm font-black text-emerald-400">{fitCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity size={12} className="text-amber-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">🟡 Teilbelastung</label>
          </div>
          <span className="text-sm font-black text-amber-400">{partialCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle size={12} className="text-red-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">🔴 Ausfall / Rot</label>
          </div>
          <span className="text-sm font-black text-red-400">{outCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Stethoscope size={12} className="text-purple-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Akten Einträge</label>
          </div>
          <span className="text-sm font-black text-white">{physioEntries.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <HeartPulse size={12} className="text-pink-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">In Behandlung</label>
          </div>
          <span className="text-sm font-black text-amber-300">{activeTreatmentsCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-cyan-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Kader-Verfügbark.</label>
          </div>
          <span className="text-sm font-black text-cyan-400">{availabilityRate}%</span>
        </div>

        <div className="bg-slate-900 text-white border-2 border-emerald-500 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield size={12} className="text-emerald-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Spielfähig</label>
          </div>
          <span className="text-base font-black text-emerald-400 leading-none">{fitCount} / {totalSquad}</span>
        </div>

        <div className="bg-slate-900 text-white border-2 border-amber-500 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-amber-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-amber-300">Ampel-Status</label>
          </div>
          <span className="text-xs font-black text-amber-400 leading-none uppercase">
            {outCount > 3 ? '🔴 Eingeschränkt' : partialCount > 3 ? '🟡 Erhöhte Last' : '🟢 Optimal'}
          </span>
        </div>
      </div>

      {/* Main Content Area: Left Table & Right Form/Analysis Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row gap-2 p-2 pt-0 overflow-hidden bg-slate-950">
        
        {/* Left Column: Detailed Physio Akten Table */}
        <div className="flex-1 bg-slate-950 border border-slate-800 flex flex-col overflow-hidden relative rounded-sm">
          {/* Table Header Controls */}
          <div className="p-2 border-b border-slate-800 bg-slate-900 flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-amber-400 flex items-center gap-1.5">
                <Stethoscope size={13} /> Behandlungs- & Verletzungsakten
              </h3>
              <span className="text-slate-700 text-xs">|</span>
              <span className="text-[9px] font-extrabold uppercase text-slate-400">
                {filteredEntries.length} von {physioEntries.length} Einträgen
              </span>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={11} className="absolute left-2 top-2 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="SUCHEN (NAME, DIAGNOSE)..."
                  className="bg-slate-950 border border-slate-700 text-white text-[9px] font-bold pl-6 pr-2 py-1 rounded w-44 focus:outline-none focus:border-amber-400 placeholder:text-slate-600 uppercase"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                className="bg-slate-950 border border-slate-700 text-amber-400 text-[9px] font-black px-2 py-1 rounded focus:outline-none focus:border-amber-400 uppercase"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALLE" className="bg-slate-950 text-white">ALLE AMPEL-STATI</option>
                <option value="GRÜN" className="bg-slate-950 text-emerald-400">🟢 GRÜN (SPIELFÄHIG)</option>
                <option value="GELB" className="bg-slate-950 text-amber-400">🟡 GELB (TEILBELASTUNG)</option>
                <option value="ROT" className="bg-slate-950 text-red-400">🔴 ROT (AUSFALL)</option>
              </select>

              <select 
                className="bg-slate-950 border border-slate-700 text-slate-300 text-[9px] font-black px-2 py-1 rounded focus:outline-none focus:border-amber-400 uppercase"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="ALLE" className="bg-slate-950 text-white">ALLE KATEGORIEN</option>
                <option value="player" className="bg-slate-950 text-white">SPIELERKADER</option>
                <option value="coach" className="bg-slate-950 text-white">TRAINERTEAM</option>
                <option value="staff" className="bg-slate-950 text-white">FUNKTIONSTEAM</option>
                <option value="medical" className="bg-slate-950 text-white">ÄRZTLICHE ABTEILUNG</option>
              </select>
            </div>
          </div>

          {/* Quick Add Alerts */}
          {quickAddError && (
            <div className="bg-red-950/80 border-b border-red-800 text-red-400 px-3 py-1.5 text-[10px] font-black uppercase flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle size={13} />
                <span>{quickAddError}</span>
              </div>
              <button onClick={() => setQuickAddError(null)} className="hover:underline font-bold text-[9px]">X</button>
            </div>
          )}

          {quickAddSuccess && (
            <div className="bg-emerald-950/80 border-b border-emerald-800 text-emerald-400 px-3 py-1.5 text-[10px] font-black uppercase flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={13} />
                <span>{quickAddSuccess}</span>
              </div>
              <button onClick={() => setQuickAddSuccess(null)} className="hover:underline font-bold text-[9px]">X</button>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950">
            <table className="w-full border-collapse text-[9px] font-bold">
              <thead className="sticky top-0 bg-slate-950 text-amber-400 z-20 border-b-2 border-slate-800">
                <tr>
                  <th className="px-2.5 py-1.5 border border-slate-800 text-left w-48 text-amber-400 font-black uppercase">Spieler / Person</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-center w-28 text-slate-300 font-black uppercase">Datum</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-28 text-slate-300 font-black uppercase">Typ</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-48 text-white font-black uppercase">Diagnose / Beschwerde</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-48 text-white font-black uppercase">Behandlung</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-52 text-amber-300 font-black uppercase">Status & Ampel-Belastbarkeit</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left text-slate-400 font-black uppercase">Bemerkungen</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-center w-14 text-red-400 font-black uppercase">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {/* Inline Quick Add Row */}
                {editable && (
                  <tr className="bg-slate-900 border-b-2 border-amber-500/50">
                    <td className="p-1.5 border-r border-slate-800">
                      <div className="flex gap-1 items-center">
                        <select 
                          className="w-full bg-slate-950 border border-slate-700 text-white font-black uppercase text-[9px] p-1 rounded focus:outline-none focus:border-amber-400"
                          value={newEntry.playerId}
                          onChange={(e) => {
                            if (e.target.value === 'NEW_PLAYER') {
                              setShowAddPlayerModal(true);
                              setNewEntry({ ...newEntry, playerId: '' });
                            } else {
                              setNewEntry({ ...newEntry, playerId: e.target.value });
                            }
                          }}
                        >
                          <option value="" className="bg-slate-950 text-slate-500">-- SPIELER WÄHLEN --</option>
                          <option value="NEW_PLAYER" className="bg-slate-950 text-amber-400 font-black">+ NEUER SPIELER...</option>
                          <optgroup label="Spielerkader" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.player.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Trainerteam" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.coach.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Funktionsteam" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.staff.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Ärztliche Abteilung" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.medical.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <input 
                        type="date"
                        className="w-full bg-slate-950 border border-slate-700 text-white font-black text-[9px] p-1 rounded focus:outline-none focus:border-amber-400 text-center"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <select 
                        className="w-full bg-slate-950 border border-slate-700 text-white font-black uppercase text-[9px] p-1 rounded focus:outline-none focus:border-amber-400"
                        value={newEntry.type}
                        onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                      >
                        <option value="Behandlung" className="bg-slate-950 text-white">Behandlung</option>
                        <option value="Verletzung" className="bg-slate-950 text-white">Verletzung</option>
                        <option value="Reha" className="bg-slate-950 text-white">Reha</option>
                        <option value="Prävention" className="bg-slate-950 text-white">Prävention</option>
                      </select>
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <input 
                        type="text"
                        className="w-full bg-slate-950 border border-slate-700 text-white font-black uppercase text-[9px] p-1 rounded focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                        placeholder="NEUE DIAGNOSE..."
                        value={newEntry.diagnosis}
                        onChange={(e) => setNewEntry({ ...newEntry, diagnosis: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <input 
                        type="text"
                        className="w-full bg-slate-950 border border-slate-700 text-white font-black uppercase text-[9px] p-1 rounded focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                        placeholder="MASSAGE, EIS, PHYSIO..."
                        value={newEntry.treatment || ''}
                        onChange={(e) => setNewEntry({ ...newEntry, treatment: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <select 
                        className="w-full bg-slate-950 border border-slate-700 text-white font-black uppercase text-[9px] p-1 rounded focus:outline-none focus:border-amber-400"
                        value={newEntry.status}
                        onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                      >
                        <option value="In Behandlung" className="bg-slate-950 text-amber-400">🟡 In Behandlung (Gelb)</option>
                        <option value="🟢 Grün - Voll Belastbar (100%)" className="bg-slate-950 text-emerald-400">🟢 Grün - Voll Belastbar (100%)</option>
                        <option value="🟡 Gelb - Teilbelastung (Vorsicht)" className="bg-slate-950 text-amber-400">🟡 Gelb - Teilbelastung (Vorsicht)</option>
                        <option value="🔴 Rot - Ausfall / Keine Belastung" className="bg-slate-950 text-red-400">🔴 Rot - Ausfall / Keine Belastung</option>
                        <option value="Reha-Phase" className="bg-slate-950 text-amber-400">Reha-Phase (🟡 Gelb)</option>
                        <option value="Spielfähig" className="bg-slate-950 text-emerald-400">Spielfähig (🟢 Grün)</option>
                        <option value="Langzeit" className="bg-slate-950 text-red-400">Langzeit Ausfall (🔴 Rot)</option>
                      </select>
                    </td>
                    <td className="p-1.5 border-r border-slate-800">
                      <input 
                        type="text"
                        className="w-full bg-slate-950 border border-slate-700 text-slate-300 italic text-[9px] p-1 rounded focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                        placeholder="Bemerkungen..."
                        value={newEntry.remarks}
                        onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                      />
                    </td>
                    <td className="p-1.5 text-center">
                      <button 
                        onClick={handleQuickAdd}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-1 rounded transition-colors shadow-sm font-black w-full flex items-center justify-center"
                        title="Eintrag hinzufügen"
                      >
                        <Plus size={14} />
                      </button>
                    </td>
                  </tr>
                )}

                {/* Empty State */}
                {filteredEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500 italic uppercase tracking-wider text-[10px]">
                      Keine Physio-Einträge gefunden. Nutzen Sie die Schnell-Eingabemaske.
                    </td>
                  </tr>
                )}

                {/* Physio Entries List */}
                {filteredEntries.map((item) => {
                  const player = players.find(p => p.id === item.playerId);
                  const isGreen = (item.status || '').includes('Grün') || item.status === 'Spielfähig' || item.status === 'Wieder Fit';
                  const isYellow = (item.status || '').includes('Gelb') || item.status === 'Reha-Phase' || item.status === 'In Behandlung';
                  const isRed = (item.status || '').includes('Rot') || item.status === 'Langzeit' || item.status === 'Ausfall';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/90 transition-colors border-b border-slate-800 bg-slate-900">
                      <td className="p-2 border-r border-slate-800 font-black uppercase text-white">
                        <select 
                          className="w-full bg-transparent font-black uppercase text-white focus:outline-none"
                          value={item.playerId || ''}
                          onChange={(e) => handleUpdate(item.id, 'playerId', e.target.value)}
                        >
                          <optgroup label="Spielerkader" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.player.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Trainerteam" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.coach.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Funktionsteam" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.staff.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Ärztliche Abteilung" className="bg-slate-950 text-slate-400">
                            {categorizedPersonnel.medical.map(p => (
                              <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                      <td className="p-2 border-r border-slate-800 text-center">
                        <input 
                          type="date"
                          className="w-full bg-transparent font-black text-slate-300 focus:outline-none text-center"
                          value={item.date || ''}
                          onChange={(e) => handleUpdate(item.id, 'date', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-800">
                        <select 
                          className="w-full bg-transparent font-black uppercase text-slate-300 focus:outline-none"
                          value={item.type || 'Behandlung'}
                          onChange={(e) => handleUpdate(item.id, 'type', e.target.value)}
                        >
                          <option value="Behandlung" className="bg-slate-950 text-white">Behandlung</option>
                          <option value="Verletzung" className="bg-slate-950 text-white">Verletzung</option>
                          <option value="Reha" className="bg-slate-950 text-white">Reha</option>
                          <option value="Prävention" className="bg-slate-950 text-white">Prävention</option>
                        </select>
                      </td>
                      <td className="p-2 border-r border-slate-800">
                        <input 
                          type="text"
                          className="w-full bg-transparent font-black uppercase text-white focus:outline-none placeholder:text-slate-600"
                          placeholder="DIAGNOSE..."
                          value={item.diagnosis || ''}
                          onChange={(e) => handleUpdate(item.id, 'diagnosis', e.target.value)}
                        />
                      </td>
                      <td className="p-2 border-r border-slate-800">
                        <input 
                          type="text"
                          className="w-full bg-transparent font-black uppercase text-slate-200 focus:outline-none placeholder:text-slate-600"
                          placeholder="BEHANDLUNG..."
                          value={item.treatment || ''}
                          onChange={(e) => handleUpdate(item.id, 'treatment', e.target.value)}
                        />
                      </td>
                      <td className="p-1.5 border-r border-slate-800">
                        <select 
                          className={`w-full font-black uppercase text-[9px] p-1 rounded border focus:outline-none ${
                            isGreen ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' :
                            isYellow ? 'bg-amber-950/80 text-amber-400 border-amber-800' :
                            'bg-red-950/80 text-red-400 border-red-800'
                          }`}
                          value={item.status || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdate(item.id, 'status', val);
                            if (item.playerId) {
                              if (val.includes('Grün') || val === 'Spielfähig' || val === 'Wieder Fit') {
                                onUpdatePlayer(item.playerId, 'loadAmpel', 'Grün');
                              } else if (val.includes('Gelb') || val === 'Reha-Phase' || val === 'In Behandlung') {
                                onUpdatePlayer(item.playerId, 'loadAmpel', 'Gelb');
                              } else if (val.includes('Rot') || val === 'Langzeit' || val === 'Ausfall') {
                                onUpdatePlayer(item.playerId, 'loadAmpel', 'Rot');
                              }
                            }
                          }}
                        >
                          <option value="🟢 Grün - Voll Belastbar (100%)" className="bg-slate-950 text-emerald-400">🟢 Grün - Voll Belastbar (100%)</option>
                          <option value="🟡 Gelb - Teilbelastung (Vorsicht)" className="bg-slate-950 text-amber-400">🟡 Gelb - Teilbelastung (Vorsicht)</option>
                          <option value="🔴 Rot - Ausfall / Keine Belastung" className="bg-slate-950 text-red-400">🔴 Rot - Ausfall / Keine Belastung</option>
                          <option value="In Behandlung" className="bg-slate-950 text-amber-400">In Behandlung (🟡 Gelb)</option>
                          <option value="Reha-Phase" className="bg-slate-950 text-amber-400">Reha-Phase (🟡 Gelb)</option>
                          <option value="Spielfähig" className="bg-slate-950 text-emerald-400">Spielfähig (🟢 Grün)</option>
                          <option value="Langzeit" className="bg-slate-950 text-red-400">Langzeit Ausfall (🔴 Rot)</option>
                        </select>
                      </td>
                      <td className="p-2 border-r border-slate-800">
                        <input 
                          type="text"
                          className="w-full bg-transparent italic text-slate-400 focus:outline-none"
                          placeholder="Notizen..."
                          value={item.remarks || ''}
                          onChange={(e) => handleUpdate(item.id, 'remarks', e.target.value)}
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="text-red-400 hover:text-red-300 transition-colors p-1 rounded hover:bg-slate-800" 
                          title="Eintrag löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Form Mask & Medical Analytics Sidebar */}
        <div className="w-full md:w-72 space-y-2 shrink-0 flex flex-col">
          {/* Section 1: Formular-Maske (Quick Add Form Card matching Budget) */}
          <section className="bg-slate-900 border border-slate-800 p-3 rounded shadow-sm">
            <h4 className="font-black uppercase text-[9px] tracking-widest flex items-center gap-2 mb-3 text-amber-400">
              <Target size={12} className="text-amber-400" /> Physio-Eingabemaske
            </h4>

            <div className="space-y-2">
              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Spieler / Person</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-white focus:border-amber-400 rounded uppercase"
                  value={newEntry.playerId}
                  onChange={(e) => {
                    if (e.target.value === 'NEW_PLAYER') {
                      setShowAddPlayerModal(true);
                      setNewEntry({ ...newEntry, playerId: '' });
                    } else {
                      setNewEntry({ ...newEntry, playerId: e.target.value });
                    }
                  }}
                >
                  <option value="" className="bg-slate-950 text-slate-500">-- SPIELER WÄHLEN --</option>
                  <option value="NEW_PLAYER" className="bg-slate-950 text-amber-400 font-black">+ NEUER SPIELER...</option>
                  <optgroup label="Spielerkader" className="bg-slate-950 text-slate-400">
                    {categorizedPersonnel.player.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Trainerteam" className="bg-slate-950 text-slate-400">
                    {categorizedPersonnel.coach.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Funktionsteam" className="bg-slate-950 text-slate-400">
                    {categorizedPersonnel.staff.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Ärztliche Abteilung" className="bg-slate-950 text-slate-400">
                    {categorizedPersonnel.medical.map(p => (
                      <option key={p.id} value={p.id} className="bg-slate-950 text-white">{p.lastName || (p as any).name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Datum</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-white focus:border-amber-400 rounded text-center"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Typ</label>
                  <select 
                    className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-white focus:border-amber-400 rounded uppercase"
                    value={newEntry.type}
                    onChange={(e) => setNewEntry({ ...newEntry, type: e.target.value })}
                  >
                    <option value="Behandlung" className="bg-slate-950 text-white">Behandlung</option>
                    <option value="Verletzung" className="bg-slate-950 text-white">Verletzung</option>
                    <option value="Reha" className="bg-slate-950 text-white">Reha</option>
                    <option value="Prävention" className="bg-slate-950 text-white">Prävention</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Diagnose / Beschwerde</label>
                <input 
                  type="text"
                  placeholder="Z.B. ADDUKTORENMREIZUNG..."
                  className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-white focus:border-amber-400 rounded uppercase placeholder:text-slate-600"
                  value={newEntry.diagnosis}
                  onChange={(e) => setNewEntry({ ...newEntry, diagnosis: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Behandlung</label>
                <input 
                  type="text"
                  placeholder="Z.B. MASSAGE, KÜHLUNG..."
                  className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-white focus:border-amber-400 rounded uppercase placeholder:text-slate-600"
                  value={newEntry.treatment || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, treatment: e.target.value })}
                />
              </div>

              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Status & Belastbarkeit</label>
                <select 
                  className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-amber-400 focus:border-amber-400 rounded uppercase"
                  value={newEntry.status}
                  onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value })}
                >
                  <option value="In Behandlung" className="bg-slate-950 text-amber-400">🟡 In Behandlung (Gelb)</option>
                  <option value="🟢 Grün - Voll Belastbar (100%)" className="bg-slate-950 text-emerald-400">🟢 Grün - Voll Belastbar (100%)</option>
                  <option value="🟡 Gelb - Teilbelastung (Vorsicht)" className="bg-slate-950 text-amber-400">🟡 Gelb - Teilbelastung (Vorsicht)</option>
                  <option value="🔴 Rot - Ausfall / Keine Belastung" className="bg-slate-950 text-red-400">🔴 Rot - Ausfall / Keine Belastung</option>
                  <option value="Reha-Phase" className="bg-slate-950 text-amber-400">Reha-Phase (🟡 Gelb)</option>
                  <option value="Spielfähig" className="bg-slate-950 text-emerald-400">Spielfähig (🟢 Grün)</option>
                  <option value="Langzeit" className="bg-slate-950 text-red-400">Langzeit Ausfall (🔴 Rot)</option>
                </select>
              </div>

              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Bemerkungen</label>
                <input 
                  type="text"
                  placeholder="Zusatzinfos..."
                  className="w-full bg-slate-950 border border-slate-700 p-1.5 font-black text-xs focus:outline-none text-slate-200 focus:border-amber-400 rounded italic placeholder:text-slate-600"
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                />
              </div>

              <button 
                onClick={handleQuickAdd}
                className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 font-black uppercase tracking-[0.15em] text-xs rounded transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Eintrag speichern
              </button>
            </div>
          </section>

          {/* Section 2: Medizinische Analyse & Status-Verteilung Card */}
          <section className="bg-slate-900 text-white border border-slate-800 p-3 flex-1 overflow-auto custom-scrollbar rounded shadow-sm">
            <h4 className="font-black uppercase text-[9px] tracking-widest flex items-center gap-2 mb-3 text-amber-400">
              <AlertCircle size={12} className="text-amber-400" /> Ampel- & Kader-Analyse
            </h4>

            <div className="space-y-3">
              {/* Ampel Breakdown */}
              <div>
                <h5 className="text-[8px] font-bold uppercase text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Belastbarkeits-Quote</h5>
                
                <div className="space-y-1.5 mt-2">
                  <div>
                    <div className="flex justify-between text-[10px] font-black mb-0.5">
                      <span className="text-emerald-400">🟢 Voll Belastbar</span>
                      <span className="text-white">{fitCount} / {totalSquad}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, (fitCount / totalSquad) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-black mb-0.5">
                      <span className="text-amber-400">🟡 Teilbelastung</span>
                      <span className="text-white">{partialCount} / {totalSquad}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, (partialCount / totalSquad) * 100)}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-black mb-0.5">
                      <span className="text-red-400">🔴 Ausfall / Verletzung</span>
                      <span className="text-white">{outCount} / {totalSquad}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (outCount / totalSquad) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personnel Category Stats */}
              <div className="pt-2 border-t border-slate-800">
                <h5 className="text-[8px] font-bold uppercase text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Einträge nach Position</h5>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-slate-300">Spielerkader</span>
                  <span className="text-white">{physioEntries.filter(i => {
                    const p = players.find(x => x.id === i.playerId);
                    return !p || (p.category || 'player') === 'player';
                  }).length}</span>
                </div>
                <div className="flex justify-between text-[10px] font-black">
                  <span className="text-slate-400">Trainer- & Staffteam</span>
                  <span className="text-slate-300">{physioEntries.filter(i => {
                    const p = players.find(x => x.id === i.playerId);
                    return p && (p.category === 'coach' || p.category === 'staff' || p.category === 'medical');
                  }).length}</span>
                </div>
              </div>

              {/* Latest Treatment Log Highlights */}
              <div className="pt-2 border-t border-slate-800">
                <h5 className="text-[8px] font-bold uppercase mb-1 border-b border-slate-800 pb-0.5 text-amber-400">Aktuelle Akten-Aktivität</h5>
                <div className="space-y-1 mt-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {physioEntries.slice(0, 5).map((entry, idx) => {
                    const p = players.find(x => x.id === entry.playerId);
                    return (
                      <div key={idx} className="bg-slate-950 p-1.5 rounded border border-slate-800 text-[9px] flex justify-between items-center">
                        <div>
                          <span className="font-black text-white uppercase">{p ? (p.lastName || (p as any).name) : 'Unbekannt'}</span>
                          <span className="text-slate-500 text-[8px] block">{entry.diagnosis || 'Behandlung'}</span>
                        </div>
                        <span className="font-mono text-amber-400 text-[8px]">{entry.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer Info */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-slate-400 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope size={13} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
            Aktive Behandlungen: <strong className="text-amber-400">{activeTreatmentsCount}</strong> | Ausfälle: <strong className="text-red-400">{outCount}</strong>
          </span>
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
          FC Auggen - Medizinische Abteilung & Physio-System
        </p>
      </div>
    </div>
  );
};
