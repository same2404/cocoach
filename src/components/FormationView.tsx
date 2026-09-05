import React, { useState, useEffect } from 'react';
import { Player, ScoutingEntry, ExternalPerson } from '../types';
import { sortPlayers } from '../utils/playerSorting';
import { motion } from 'motion/react';
import { Shield, Users, GripVertical, UserCheck, X, Target, Trash2, Maximize2 } from 'lucide-react';
import { useSyncedState } from '../hooks/useSyncedState';
import { useClub } from '../contexts/ClubContext';

interface PositionData {
  id: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

interface FormationViewProps {
  players: Player[];
  scoutingCandidates?: ScoutingEntry[];
  formation: string;
  onFormationChange: (f: string) => void;
  isEditing?: boolean;
}

const DEFAULT_POSITIONS: Record<string, PositionData[]> = {
  '4-4-2': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 35, y: 75 },
    { id: 'IV2', label: 'IV', x: 65, y: 75 },
    { id: 'LV', label: 'LV', x: 15, y: 70 },
    { id: 'RV', label: 'RV', x: 85, y: 70 },
    { id: 'LM', label: 'LM/LW', x: 15, y: 45 },
    { id: 'RM', label: 'RM/RW', x: 85, y: 45 },
    { id: 'ZM1', label: 'ZM', x: 40, y: 50 },
    { id: 'ZM2', label: 'ZM', x: 60, y: 50 },
    { id: 'ST1', label: 'ST', x: 40, y: 20 },
    { id: 'ST2', label: 'ST', x: 60, y: 20 },
  ],
  '4-3-3': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 35, y: 75 },
    { id: 'IV2', label: 'IV', x: 65, y: 75 },
    { id: 'LV', label: 'LV', x: 15, y: 70 },
    { id: 'RV', label: 'RV', x: 85, y: 70 },
    { id: 'DM', label: 'DM', x: 50, y: 55 },
    { id: 'ZM1', label: 'ZM', x: 35, y: 45 },
    { id: 'ZM2', label: 'ZM', x: 65, y: 45 },
    { id: 'LW', label: 'LM/LW', x: 20, y: 20 },
    { id: 'RW', label: 'RM/RW', x: 80, y: 20 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
  ],
  '4-2-3-1': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 35, y: 75 },
    { id: 'IV2', label: 'IV', x: 65, y: 75 },
    { id: 'LV', label: 'LV', x: 15, y: 70 },
    { id: 'RV', label: 'RV', x: 85, y: 70 },
    { id: 'DM1', label: 'DM', x: 40, y: 55 },
    { id: 'DM2', label: 'DM', x: 60, y: 55 },
    { id: 'LM', label: 'LM/LW', x: 15, y: 35 },
    { id: 'OM', label: 'OM', x: 50, y: 35 },
    { id: 'RM', label: 'RM/RW', x: 85, y: 35 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
  ],
  '3-5-2': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 50, y: 75 },
    { id: 'IV2', label: 'IV', x: 30, y: 75 },
    { id: 'IV3', label: 'IV', x: 70, y: 75 },
    { id: 'DM1', label: 'DM', x: 40, y: 55 },
    { id: 'DM2', label: 'DM', x: 60, y: 55 },
    { id: 'LM', label: 'LM/LW', x: 15, y: 45 },
    { id: 'RM', label: 'RM/RW', x: 85, y: 45 },
    { id: 'OM', label: 'OM', x: 50, y: 35 },
    { id: 'ST1', label: 'ST', x: 40, y: 20 },
    { id: 'ST2', label: 'ST', x: 60, y: 20 },
  ],
  '3-4-3': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 50, y: 75 },
    { id: 'IV2', label: 'IV', x: 30, y: 75 },
    { id: 'IV3', label: 'IV', x: 70, y: 75 },
    { id: 'ZM1', label: 'ZM', x: 40, y: 55 },
    { id: 'ZM2', label: 'ZM', x: 60, y: 55 },
    { id: 'LM', label: 'LM/LW', x: 15, y: 45 },
    { id: 'RM', label: 'RM/RW', x: 85, y: 45 },
    { id: 'ST1', label: 'ST', x: 50, y: 15 },
    { id: 'LW', label: 'LM/LW', x: 25, y: 20 },
    { id: 'RW', label: 'RM/RW', x: 75, y: 20 },
  ],
  '5-3-2': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 50, y: 75 },
    { id: 'IV2', label: 'IV', x: 30, y: 75 },
    { id: 'IV3', label: 'IV', x: 70, y: 75 },
    { id: 'LV', label: 'LV', x: 15, y: 65 },
    { id: 'RV', label: 'RV', x: 85, y: 65 },
    { id: 'ZM1', label: 'ZM', x: 50, y: 45 },
    { id: 'ZM2', label: 'ZM', x: 30, y: 45 },
    { id: 'ZM3', label: 'ZM', x: 70, y: 45 },
    { id: 'ST1', label: 'ST', x: 40, y: 20 },
    { id: 'ST2', label: 'ST', x: 60, y: 20 },
  ],
  '5-4-1': [
    { id: 'TW', label: 'TW', x: 50, y: 90 },
    { id: 'IV1', label: 'IV', x: 50, y: 75 },
    { id: 'IV2', label: 'IV', x: 30, y: 75 },
    { id: 'IV3', label: 'IV', x: 70, y: 75 },
    { id: 'LV', label: 'LV', x: 15, y: 65 },
    { id: 'RV', label: 'RV', x: 85, y: 65 },
    { id: 'ZM1', label: 'ZM', x: 40, y: 45 },
    { id: 'ZM2', label: 'ZM', x: 60, y: 45 },
    { id: 'LM', label: 'LM/LW', x: 15, y: 40 },
    { id: 'RM', label: 'RM/RW', x: 85, y: 40 },
    { id: 'ST', label: 'ST', x: 50, y: 15 },
  ]
};

export const FormationView: React.FC<FormationViewProps> = ({ players, scoutingCandidates = [], formation, onFormationChange, isEditing = false }) => {
  const { activeClub } = useClub();
  const [posData, setPosData] = useSyncedState<PositionData[]>(`posData_${formation}`, () => {
    const savedPos = localStorage.getItem(`fca_posData_${formation}`);
    if (savedPos) return JSON.parse(savedPos);
    return DEFAULT_POSITIONS[formation] || DEFAULT_POSITIONS['4-4-2'];
  });
  const [rawAssignments, setAssignments] = useSyncedState<Record<string, any>>(`lineup_${formation}`, () => {
    const savedLineup = localStorage.getItem(`fca_lineup_${formation}`);
    if (savedLineup) {
      const parsed = JSON.parse(savedLineup);
      const migrated: Record<string, string[]> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        if (typeof val === 'string') migrated[key] = [val];
        else if (Array.isArray(val)) migrated[key] = val as string[];
      });
      return migrated;
    }
    return {};
  });

  const assignments = React.useMemo(() => {
    const normalized: Record<string, string[]> = {};
    Object.entries(rawAssignments).forEach(([key, val]) => {
      if (typeof val === 'string') normalized[key] = [val];
      else if (Array.isArray(val)) normalized[key] = val;
      else normalized[key] = [];
    });
    return normalized;
  }, [rawAssignments]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [manualInputSlot, setManualInputSlot] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const formations = ['4-4-2', '4-3-3', '4-2-3-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];

  interface Talent {
    id: string;
    name: string;
    position: string;
    positionId: string | null;
  }

  interface ExternalPerson {
    id: string;
    name: string;
    role: string;
    positionId: string | null;
  }

  const [transitionTalents, setTransitionTalents] = useSyncedState<Talent[]>('transition_talents_complex_v2', []);
  const [externalPersons, setExternalPersons] = useSyncedState<ExternalPerson[]>('external_persons_v1', []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-cleanup useEffect was removed to prevent data loss 
  // when synchronization delays occur across different clients.

  const [newTalentName, setNewTalentName] = useState('');
  const [newTalentPosition, setNewTalentPosition] = useState('');

  const [newExternalName, setNewExternalName] = useState('');
  const [newExternalRole, setNewExternalRole] = useState('Spieler');

  const handleDragEnd = (id: string, info: any) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((info.point.x - rect.left) / rect.width) * 100;
    const y = ((info.point.y - rect.top) / rect.height) * 100;

    const updated = posData.map(p => p.id === id ? { ...p, x, y } : p);
    setPosData(updated);
  };

  const handleAssign = (slotId: string, playerId: string | null) => {
    if (!isEditing) return;
    
    setAssignments((prev: Record<string, any>) => {
      const currentRaw = prev[slotId] || [];
      const current = (Array.isArray(currentRaw) ? currentRaw : [currentRaw]).filter(id => {
        if (!id) return false;
        if (id.startsWith('manual:')) return true;
        if (id.startsWith('talent:')) {
          const tId = id.replace('talent:', '');
          return transitionTalents.some(t => t.id === tId);
        }
        if (id.startsWith('external:')) {
          const eId = id.replace('external:', '');
          return externalPersons.some(e => e.id === eId);
        }
        const existsAsPlayer = players.some(p => p.id === id);
        const existsAsScout = scoutingCandidates.some(s => s.id === id);
        return existsAsPlayer || existsAsScout;
      });
      
      if (playerId === null) {
        // If we clear a slot, check if any talents or externals were there
        const removedTalents = current.filter((id: string) => id.startsWith('talent:'));
        const removedExternals = current.filter((id: string) => id.startsWith('external:'));
        
        if (removedTalents.length > 0) {
          setTransitionTalents(prev => prev.map(t => {
            const tId = `talent:${t.id}`;
            return removedTalents.includes(tId) ? { ...t, positionId: null } : t;
          }));
        }
        if (removedExternals.length > 0) {
          setExternalPersons(prev => prev.map(e => {
            const eId = `external:${e.id}`;
            return removedExternals.includes(eId) ? { ...e, positionId: null } : e;
          }));
        }
        return { ...prev, [slotId]: [] };
      }

      if (current.includes(playerId)) {
        // Removing a specific player/talent/external
        if (playerId.startsWith('talent:')) {
          const tId = playerId.replace('talent:', '');
          setTransitionTalents(prev => prev.map(t => t.id === tId ? { ...t, positionId: null } : t));
        } else if (playerId.startsWith('external:')) {
          const eId = playerId.replace('external:', '');
          setExternalPersons(prev => prev.map(e => e.id === eId ? { ...e, positionId: null } : e));
        }
        return { ...prev, [slotId]: current.filter((id: string) => id !== playerId) };
      } else if (current.length < 15) {
        // Adding a player/talent/external
        if (playerId.startsWith('talent:')) {
          const tId = playerId.replace('talent:', '');
          // If the talent had a previous position, remove it from that slot first
          setAssignments(p => {
            const next = { ...p };
            Object.keys(next).forEach(k => {
              if (Array.isArray(next[k])) {
                next[k] = next[k].filter((id: string) => id !== playerId);
              }
            });
            return next;
          });
          // Update talent's internal position state
          setTransitionTalents(prev => prev.map(t => t.id === tId ? { ...t, positionId: slotId } : t));
        } else if (playerId.startsWith('external:')) {
          const eId = playerId.replace('external:', '');
          setAssignments(p => {
            const next = { ...p };
            Object.keys(next).forEach(k => {
              if (Array.isArray(next[k])) {
                next[k] = next[k].filter((id: string) => id !== playerId);
              }
            });
            return next;
          });
          setExternalPersons(prev => prev.map(e => e.id === eId ? { ...e, positionId: slotId } : e));
        }
        return { ...prev, [slotId]: [...current, playerId] };
      }
      return { ...prev, [slotId]: current };
    });
  };

  // Sync: Remove talents/externals from board if they are deleted from lists
  useEffect(() => {
    setAssignments(prev => {
      let changed = false;
      const next = { ...prev };
      Object.entries(next).forEach(([slotId, ids]) => {
        const filtered = ids.filter((id: string) => {
          if (id.startsWith('talent:')) {
            const tId = id.replace('talent:', '');
            return transitionTalents.some(t => t.id === tId);
          }
          if (id.startsWith('external:')) {
            const eId = id.replace('external:', '');
            return externalPersons.some(e => e.id === eId);
          }
          return true;
        });
        if (filtered.length !== ids.length) {
          next[slotId] = filtered;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [transitionTalents, externalPersons]);

  const handleAddTalent = () => {
    if (!newTalentName.trim()) return;
    if (transitionTalents.length >= 15) {
      alert('Maximal 15 Talente erlaubt.');
      return;
    }
    const newTalent: Talent = {
      id: Date.now().toString(),
      name: newTalentName.trim(),
      position: newTalentPosition.trim().toUpperCase() || 'N/A',
      positionId: null
    };
    setTransitionTalents(prev => [...prev, newTalent]);
    setNewTalentName('');
    setNewTalentPosition('');
  };

  const handleDeleteTalent = (id: string) => {
    setTransitionTalents(prev => prev.filter(t => t.id !== id));
  };

  const handleAddExternal = () => {
    if (!newExternalName.trim()) return;
    if (externalPersons.length >= 20) {
      alert('Maximal 20 externe Personen erlaubt.');
      return;
    }
    const newPerson: ExternalPerson = {
      id: Date.now().toString(),
      name: newExternalName.trim(),
      role: newExternalRole,
      positionId: null
    };
    setExternalPersons(prev => [...prev, newPerson]);
    setNewExternalName('');
  };

  const handleDeleteExternal = (id: string) => {
    setExternalPersons(prev => prev.filter(e => e.id !== id));
  };

  const resetFormation = () => {
    const defaults = DEFAULT_POSITIONS[formation] || DEFAULT_POSITIONS['4-4-2'];
    setPosData(defaults);
  };

  return (
    <div 
      className={`flex flex-col h-full space-y-2.5 overflow-hidden transition-all duration-300 bg-slate-950 text-slate-100 p-2 sm:p-3 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-slate-950 p-4' : ''}`}
      onClick={() => {
        if (!isFullscreen) setIsFullscreen(true);
      }}
    >
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl shadow-xl flex justify-between items-center shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Shield size={16} className="text-emerald-400" />
          <div className="flex items-center gap-2">
            <h3 className="font-black uppercase text-xs sm:text-sm tracking-wider text-white leading-none">Kaderübersicht & Grundordnung</h3>
            <span className="text-slate-700 text-xs">|</span>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{activeClub.name} • Taktische Ausrichtung</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
              className="bg-red-600/90 text-white border border-red-500 p-1 hover:bg-red-600 rounded-lg shadow-md transition-colors mr-2"
            >
              <X size={14} />
            </button>
          )}
          {!isFullscreen && (
            <div className="flex items-center gap-1 text-slate-400 mr-2">
              <Maximize2 size={12} className="text-emerald-400" />
              <span className="text-[8px] font-black uppercase tracking-wider">Vollbild</span>
            </div>
          )}
          {isEditing && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                resetFormation();
              }}
              className="bg-slate-800 text-slate-200 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border border-slate-700 hover:bg-slate-700 transition-colors rounded-lg"
            >
              Reset
            </button>
          )}
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Grundordnung:</span>
          <select 
            onClick={(e) => e.stopPropagation()}
            className={`bg-slate-950 text-amber-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500 ${isEditing ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`}
            value={formation}
            onChange={(e) => isEditing && onFormationChange(e.target.value)}
            disabled={!isEditing}
          >
            {formations.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 flex gap-2 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Sidebars Container Left */}
        <div className="flex gap-2 shrink-0">
          {/* Transition Players & Talents Sidebar (w-56) */}
          <div className="w-56 bg-slate-950 border-2 border-slate-800 shadow-xl flex flex-col overflow-hidden">
            <div className="bg-amber-400 text-slate-950 p-2 flex justify-between items-center border-b border-slate-800">
              <h4 className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1 leading-none">
                <Target size={12} /> Talente
              </h4>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 bg-slate-950">
              {transitionTalents.map((talent) => {
                const id = `talent:${talent.id}`;
                const posLabel = posData.find(pd => pd.id === talent.positionId)?.label;

                return (
                  <div 
                    key={talent.id} 
                    draggable={isEditing}
                    onDragStart={(e) => {
                      if (!isEditing) return;
                      e.dataTransfer.setData('text/plain', id);
                      e.currentTarget.classList.add('opacity-50');
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('opacity-50');
                    }}
                    onClick={() => {
                      if (!isEditing) return;
                      if (!selectedSlot) return;
                      handleAssign(selectedSlot, id);
                    }}
                    className={`flex flex-col p-1.5 border border-slate-700 rounded transition-all group cursor-pointer ${talent.positionId ? 'bg-amber-950/40 border-amber-600' : 'bg-slate-900 hover:bg-slate-800'} ${!selectedSlot && isEditing ? 'hover:border-amber-400' : ''}`}
                    title={!selectedSlot && isEditing ? 'Zuerst Position auf dem Feld wählen' : ''}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-black bg-slate-950 text-amber-400 border border-slate-700 px-1.5 py-0.5 leading-none min-w-[28px] text-center rounded">
                            {talent.position}
                          </span>
                          <span className="text-[11px] font-black uppercase text-white truncate leading-none">
                            {talent.name}
                          </span>
                        </div>
                        {talent.positionId && (
                          <span className="text-[7px] font-black text-red-400 uppercase tracking-tighter mt-0.5">
                            • {posLabel}
                          </span>
                        )}
                        {!selectedSlot && isEditing && !talent.positionId && (
                          <span className="text-[6px] font-bold text-amber-400 uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            Zuerst Pos. wählen
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTalent(talent.id);
                        }}
                        className="text-white bg-red-600 hover:bg-red-700 transition-colors p-1 border border-red-800 rounded ml-1"
                        title="Diesen Eintrag löschen"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {transitionTalents.length === 0 && (
                <p className="text-[8px] font-bold uppercase text-slate-500 text-center py-4 italic">Keine Einträge</p>
              )}
            </div>

            <div className="p-2 border-t border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-1.5">
                <input 
                  type="text"
                  value={newTalentName}
                  onChange={(e) => setNewTalentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTalent();
                  }}
                  placeholder="NAME..."
                  className="w-full text-xs font-bold border border-slate-700 p-1.5 focus:outline-none focus:border-amber-400 rounded bg-slate-950 text-white placeholder:text-slate-500"
                />
                <input 
                  type="text"
                  value={newTalentPosition}
                  onChange={(e) => setNewTalentPosition(e.target.value)}
                  placeholder="POS (Z.B. ST)..."
                  className="w-full text-xs font-bold uppercase border border-slate-700 p-1.5 focus:outline-none focus:border-amber-400 rounded bg-slate-950 text-white placeholder:text-slate-500"
                />
                <button 
                  onClick={handleAddTalent}
                  className="w-full bg-amber-400 text-slate-950 text-xs font-black uppercase py-1.5 hover:bg-amber-300 transition-colors rounded border border-amber-300 font-black shadow"
                >
                  + Talent Hinzufügen
                </button>
              </div>
            </div>
          </div>

          {/* External Persons & Trainers Sidebar (w-56) */}
          <div className="w-56 bg-slate-950 border-2 border-slate-800 shadow-xl flex flex-col overflow-hidden">
            <div className="bg-slate-900 text-amber-400 p-2 flex justify-between items-center border-b border-slate-800">
              <h4 className="text-[10px] font-black uppercase tracking-tight flex items-center gap-1 leading-none">
                <Users size={12} /> Extern / Trainer
              </h4>
            </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-1.5 bg-slate-950">
              {externalPersons.map((person) => {
                const id = `external:${person.id}`;
                const posLabel = posData.find(pd => pd.id === person.positionId)?.label;

                return (
                  <div 
                    key={person.id} 
                    draggable={isEditing}
                    onDragStart={(e) => {
                      if (!isEditing) return;
                      e.dataTransfer.setData('text/plain', id);
                      e.currentTarget.classList.add('opacity-50');
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('opacity-50');
                    }}
                    onClick={() => {
                      if (!isEditing) return;
                      if (!selectedSlot) return;
                      handleAssign(selectedSlot, id);
                    }}
                    className={`flex flex-col p-1.5 border border-slate-700 rounded transition-all group cursor-pointer ${person.positionId ? 'bg-slate-900 border-blue-500' : 'bg-slate-900 hover:bg-slate-800'} ${!selectedSlot && isEditing ? 'hover:border-amber-400' : ''}`}
                    title={!selectedSlot && isEditing ? 'Zuerst Position auf dem Feld wählen' : ''}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col overflow-hidden">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 leading-none min-w-[28px] text-center rounded ${person.role === 'Trainer' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                            {person.role === 'Trainer' ? 'TR' : 'EX'}
                          </span>
                          <span className="text-[11px] font-black uppercase text-white truncate leading-none">
                            {person.name}
                          </span>
                        </div>
                        {person.positionId && (
                          <span className="text-[7px] font-black text-red-400 uppercase tracking-tighter mt-0.5">
                            • {posLabel}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExternal(person.id);
                        }}
                        className="text-white bg-red-600 hover:bg-red-700 transition-colors p-1 border border-red-800 rounded ml-1"
                        title="Diesen Eintrag löschen"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {externalPersons.length === 0 && (
                <p className="text-[8px] font-bold uppercase text-slate-500 text-center py-4 italic">Keine Einträge</p>
              )}
            </div>

            <div className="p-2 border-t border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-1.5">
                <input 
                  type="text"
                  value={newExternalName}
                  onChange={(e) => setNewExternalName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddExternal();
                  }}
                  placeholder="NAME..."
                  className="w-full text-xs font-bold border border-slate-700 p-1.5 focus:outline-none focus:border-amber-400 rounded bg-slate-950 text-white placeholder:text-slate-500"
                />
                <div className="flex gap-1">
                  {['Spieler', 'Trainer'].map(r => (
                    <button 
                      key={r} 
                      type="button" 
                      onClick={() => setNewExternalRole(r)}
                      className={`flex-1 text-[10px] font-black uppercase border border-slate-700 py-1 rounded transition-colors ${newExternalRole === r ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-950 text-white hover:bg-slate-800'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={handleAddExternal}
                  className="w-full bg-blue-600 text-white text-xs font-black uppercase py-1.5 hover:bg-blue-500 transition-colors rounded border border-blue-500 font-black shadow"
                >
                  + Person Hinzufügen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pitch Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-[#2d5a27] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
        >
          {/* Pitch Markings */}
          <div className="absolute inset-4 border-2 border-white/30 pointer-events-none">
            {/* Center Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1E293B]/30 -translate-y-1/2" />
            {/* Center Circle */}
            <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
            {/* Penalty Areas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-white/30 border-t-0" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 border-2 border-white/30 border-b-0" />
            {/* Goal Areas */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-white/30 border-t-0" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-12 border-2 border-white/30 border-b-0" />
          </div>

          {posData.map((pos) => {
            const assignedIds = assignments[pos.id] || [];
            const assignedPlayers = assignedIds.map(id => {
              if (id.startsWith('manual:')) return { id, name: id.replace('manual:', ''), sub: 'GAST', isManual: true };
              if (id.startsWith('talent:')) {
                const tId = id.replace('talent:', '');
                const talentObj = transitionTalents.find(t => t.id === tId);
                return { id, name: talentObj?.name || 'Talent', sub: 'TALENT', isManual: true };
              }
              if (id.startsWith('external:')) {
                const eId = id.replace('external:', '');
                const externalObj = externalPersons.find(e => e.id === eId);
                return { id, name: externalObj?.name || 'Gast', sub: externalObj?.role.toUpperCase() || 'EXTERN', isManual: true };
              }
              const p = players.find(player => player.id === id);
              if (p) return { id, name: (p.lastName || p.firstName || (p as any).name || 'Spieler'), sub: `#${p.number}`, isManual: false };
              const s = scoutingCandidates.find(scout => scout.id === id);
              if (s) return { id, name: (s.name || 'Scout'), sub: 'SCOUT', isManual: false };
              return { id, name: 'Unbekannt', sub: id, isManual: false };
            });

            const isSelected = selectedSlot === pos.id;

            return (
              <motion.div
                key={`${formation}-${pos.id}`}
                drag={isEditing}
                dragMomentum={false}
                onDragEnd={(_, info) => isEditing && handleDragEnd(pos.id, info)}
                initial={false}
                animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ touchAction: 'none' }}
              >
                <div 
                  onClick={() => isEditing && setSelectedSlot(isSelected ? null : pos.id)}
                  onDragOver={(e) => {
                    if (!isEditing) return;
                    e.preventDefault();
                    e.currentTarget.classList.add('ring-4', 'ring-[#C00000]', 'scale-105');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('ring-4', 'ring-[#C00000]', 'scale-105');
                  }}
                  onDrop={(e) => {
                    if (!isEditing) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('ring-4', 'ring-[#C00000]', 'scale-105');
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) handleAssign(pos.id, id);
                  }}
                  className={`bg-slate-900/95 border-2 border-slate-700 shadow-2xl w-32 sm:w-36 flex flex-col group transition-all rounded-lg overflow-hidden backdrop-blur-md ${isEditing ? 'cursor-move' : 'cursor-default'} ${isSelected ? 'ring-2 ring-amber-400 scale-110 z-20 border-amber-400' : 'hover:border-emerald-400'}`}
                >
                  <div className="bg-slate-950 text-amber-400 px-2 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-1">
                      <GripVertical size={10} className="text-slate-500" />
                      <span className="text-amber-300">{pos.label}</span>
                    </div>
                    {assignedPlayers.length > 0 && <UserCheck size={10} className="text-emerald-400" />}
                  </div>
                  <div className="p-1.5 min-h-[62px] flex flex-col items-center text-center bg-slate-900 space-y-1">
                    {manualInputSlot === pos.id ? (
                      <input 
                        autoFocus
                        className="w-full text-[10px] font-black uppercase text-center focus:outline-none bg-slate-950 text-white border-b border-amber-400 p-0.5"
                        placeholder="NAME..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAssign(pos.id, `manual:${(e.target as HTMLInputElement).value}`);
                            setManualInputSlot(null);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value) {
                            handleAssign(pos.id, `manual:${e.target.value}`);
                          }
                          setManualInputSlot(null);
                        }}
                      />
                    ) : assignedPlayers.length > 0 ? (
                      <div className="w-full h-full flex flex-col justify-start space-y-1">
                        {assignedPlayers.map((ap, idx) => (
                          <div key={`${ap.id}-${idx}`} className={`w-full py-1 px-1 bg-slate-950/80 rounded border border-slate-800 relative group/item flex flex-col items-center justify-center ${idx > 0 ? 'mt-1' : ''}`}>
                            <p className="text-[10px] sm:text-[11px] font-black uppercase text-white leading-tight truncate w-full text-center tracking-wide">{ap.name}</p>
                            <p className="text-[8px] font-black text-emerald-400 leading-none mt-0.5 tracking-wider">{ap.sub}</p>
                            {isEditing && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssign(pos.id, ap.id);
                                }}
                                className="absolute right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 text-red-400 hover:text-red-300 transition-opacity p-0.5 bg-slate-900 rounded border border-red-500/50"
                                title="Spieler entfernen"
                              >
                                <X size={10} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full opacity-30 h-full justify-center py-1">
                        <p className="text-[8px] font-bold text-slate-400 uppercase italic leading-none">Kein Spieler</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Quick Dropdown inside card */}
                  {isEditing && (
                    <div className="p-0.5 border-t border-black/10 bg-[#121824]">
                      <select 
                        className="w-full text-[6px] font-black uppercase bg-transparent focus:outline-none cursor-pointer"
                        value=""
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          if (e.target.value === 'ADD_MANUAL') {
                            setManualInputSlot(pos.id);
                          } else if (e.target.value) {
                            handleAssign(pos.id, e.target.value);
                          }
                        }}
                      >
                        <option value="">+ SPIELER</option>
                        <option value="ADD_MANUAL">+ GASTSPIELER</option>
                        <optgroup label="KADER">
                          {sortPlayers(players).map(p => (
                            <option key={p.id} value={p.id}>
                              {assignedIds.includes(p.id) ? '✓ ' : ''}#{p.number} {p.lastName}
                            </option>
                          ))}
                        </optgroup>
                        {transitionTalents.length > 0 && (
                          <optgroup label="ÜBERGANGSSPIELER & TALENTE">
                            {transitionTalents.map(t => (
                              <option key={t.id} value={`talent:${t.id}`}>
                                {assignedIds.includes(`talent:${t.id}`) ? '✓ ' : ''}{t.name} ({t.position})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {externalPersons.length > 0 && (
                          <optgroup label="EXTERNE PERSONEN & TRAINER">
                            {externalPersons.map(e => (
                              <option key={e.id} value={`external:${e.id}`}>
                                {assignedIds.includes(`external:${e.id}`) ? '✓ ' : ''}{e.name} ({e.role})
                              </option>
                            ))}
                          </optgroup>
                        )}
                        {scoutingCandidates.length > 0 && (
                          <optgroup label="SCOUTING">
                            {scoutingCandidates.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
                              <option key={c.id} value={c.id}>
                                {assignedIds.includes(c.id) ? '✓ ' : ''}{c.name} ({c.club})
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Sidebar Squad List */}
        <div className="w-44 bg-[#1E293B] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden watermark-bg shrink-0">
          <div className="bg-black text-white p-2 flex justify-between items-center">
            <h4 className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
              <Users size={12} /> Kader
            </h4>
            <span className="text-[8px] font-bold opacity-50">{players.length}</span>
          </div>
            
            <div className="p-1.5 bg-[#1E293B] border-b border-black">
              <p className="text-[7px] font-bold uppercase opacity-60 leading-tight">
                {selectedSlot 
                  ? 'Ziel wählen:' 
                  : 'Pos. wählen'}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-3">
              {/* Unified Player List */}
              <div className="space-y-1">
                {sortPlayers([
                  ...players.map(p => ({ ...p, isScout: false, isTalent: false, isExternal: false, displayName: p.lastName, displaySub: `#${p.number}` })),
                  ...scoutingCandidates.map(s => ({ ...s, isScout: true, isTalent: false, isExternal: false, displayName: s.name, displaySub: `S | ${s.club}` })),
                  ...transitionTalents.map(t => ({ 
                    id: `talent:${t.id}`, 
                    name: t.name, 
                    position: t.position,
                    isScout: false, 
                    isTalent: true, 
                    isExternal: false,
                    displayName: t.name, 
                    displaySub: t.position || 'TALENT' 
                  })),
                  ...externalPersons.map(e => ({
                    id: `external:${e.id}`,
                    name: e.name,
                    isScout: false,
                    isTalent: false,
                    isExternal: true,
                    displayName: e.name,
                    displaySub: e.role.toUpperCase()
                  }))
                ]).map(p => {
                  const assignedSlots = Object.entries(assignments)
                    .filter(([_, ids]) => ids.includes(p.id))
                    .map(([slotId]) => posData.find(pd => pd.id === slotId)?.label)
                    .filter(Boolean);
                  const isAssignedSomewhere = assignedSlots.length > 0;
                  const isTalent = (p as any).isTalent;
                  const isExternal = (p as any).isExternal;
                  
                  return (
                    <button
                      key={p.id}
                      draggable={isEditing}
                      onDragStart={(e) => {
                        if (!isEditing) return;
                        e.dataTransfer.setData('text/plain', p.id);
                        e.currentTarget.classList.add('opacity-50');
                      }}
                      onDragEnd={(e) => {
                        e.currentTarget.classList.remove('opacity-50');
                      }}
                      onClick={() => {
                        if (!isEditing) return;
                        if (!selectedSlot) return;
                        handleAssign(selectedSlot, p.id);
                      }}
                      title={!selectedSlot && isEditing ? 'Zuerst Position auf dem Feld wählen' : ''}
                      className={`w-full flex items-center justify-between p-1.5 border-2 transition-all group ${
                        isEditing 
                          ? 'border-black hover:bg-black hover:text-white cursor-pointer' 
                          : 'border-transparent opacity-60 cursor-default'
                      } ${isAssignedSomewhere ? (p.isScout ? 'bg-blue-50' : (isTalent ? 'bg-amber-50' : (isExternal ? 'bg-blue-100' : 'bg-green-50'))) : 'bg-[#1E293B]'} ${!selectedSlot && isEditing ? 'hover:border-amber-400' : ''}`}
                    >
                      <div className="flex items-center gap-1.5 max-w-full overflow-hidden">
                        <span className={`min-w-[14px] h-[14px] flex items-center justify-center text-[7px] font-black border border-black shrink-0 ${
                          isAssignedSomewhere 
                            ? (p.isScout ? 'bg-blue-500 text-white' : (isTalent ? 'bg-amber-500 text-white' : (isExternal ? 'bg-blue-700 text-white' : 'bg-green-500 text-white'))) 
                            : 'bg-[#1E293B]'
                        }`}>
                          {p.isScout ? 'S' : (isTalent ? 'T' : (isExternal ? 'E' : (p as any).number))}
                        </span>
                        <div className="text-left overflow-hidden">
                          <span className="text-[8px] font-black uppercase text-slate-900 group-hover:text-white truncate block leading-none">{p.displayName}</span>
                          <div className="flex items-center gap-1 overflow-hidden">
                            <span className="text-[6px] text-slate-500 group-hover:text-slate-300 font-bold uppercase truncate">{p.displaySub}</span>
                            {isAssignedSomewhere && (
                              <span className="text-[6px] font-black text-[#C00000] uppercase tracking-tighter shrink-0">
                                • {assignedSlots.join(',')}
                              </span>
                            )}
                          </div>
                          {!selectedSlot && isEditing && (
                            <span className="text-[5px] font-bold text-amber-600 uppercase mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              Zuerst Pos. wählen
                            </span>
                          )}
                        </div>
                      </div>
                      {isAssignedSomewhere && <UserCheck size={8} className={`${p.isScout ? 'text-blue-600' : (isTalent ? 'text-amber-600' : (isExternal ? 'text-blue-700' : 'text-green-600'))} group-hover:text-white shrink-0`} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedSlot && (
              <div className="p-1.5 border-t-2 border-black bg-[#121824]">
                <button 
                  onClick={() => handleAssign(selectedSlot, null)}
                  className="w-full bg-[#C00000] text-white py-1.5 text-[8px] font-black uppercase tracking-widest border-2 border-black hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                >
                  <X size={10} /> Räumen
                </button>
              </div>
            )}
          </div>
        </div>

      {/* Legend / Info */}
      <div className="bg-black text-white p-3 border-2 border-black flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#C00000]" />
            <span className="text-[10px] font-black uppercase tracking-widest">Kader: {players.length} Spieler</span>
          </div>
        </div>
        <p className="text-[9px] font-bold uppercase opacity-60 italic">
          Hinweis: Positionen können frei auf der Tafel verschoben werden.
        </p>
      </div>
    </div>
  );
};
