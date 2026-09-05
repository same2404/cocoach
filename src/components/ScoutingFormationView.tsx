import React, { useState, useRef } from 'react';
import { ScoutingEntry, Player } from '../types';
import { motion } from 'motion/react';
import { Shield, Users, GripVertical, Target, UserCheck, X, Plus, Trash2, MessageSquare, Clock, Search } from 'lucide-react';
import { useSyncedState } from '../hooks/useSyncedState';

interface PositionData {
  id: string;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

interface ScoutingFormationViewProps {
  candidates: ScoutingEntry[];
  players?: Player[];
  onAddClick: () => void;
  onRemoveClick: () => void;
  onQuickAdd: (name: string) => void;
  isEditing?: boolean;
}

const GRUNDORDNUNG_4231: PositionData[] = [
  { id: 'TW', label: 'TW', x: 50, y: 90 },
  { id: 'IV1', label: 'IV', x: 35, y: 75 },
  { id: 'IV2', label: 'IV', x: 65, y: 75 },
  { id: 'LV', label: 'LV', x: 15, y: 70 },
  { id: 'RV', label: 'RV', x: 85, y: 70 },
  { id: 'DM1', label: 'DM', x: 40, y: 55 },
  { id: 'DM2', label: 'DM', x: 60, y: 55 },
  { id: 'LM', label: 'Flügel', x: 15, y: 35 },
  { id: 'OM', label: 'Mittelfeld', x: 50, y: 35 },
  { id: 'RM', label: 'Flügel', x: 85, y: 35 },
  { id: 'ST', label: 'Sturm', x: 50, y: 15 },
];

const WITH_BALL_433: PositionData[] = [
  { id: 'TW', label: 'TW', x: 50, y: 90 },
  { id: 'IV1', label: 'IV', x: 35, y: 80 },
  { id: 'IV2', label: 'IV', x: 65, y: 80 },
  { id: 'LV', label: 'LV', x: 10, y: 55 },
  { id: 'RV', label: 'RV', x: 90, y: 55 },
  { id: 'DM', label: 'DM', x: 50, y: 65 },
  { id: 'ZM1', label: 'Mittelfeld', x: 35, y: 45 },
  { id: 'ZM2', label: 'Mittelfeld', x: 65, y: 45 },
  { id: 'LW', label: 'Flügel', x: 15, y: 20 },
  { id: 'RW', label: 'Flügel', x: 85, y: 20 },
  { id: 'ST', label: 'Sturm', x: 50, y: 15 },
];

export const ScoutingFormationView: React.FC<ScoutingFormationViewProps> = ({ candidates, players = [], onAddClick, onRemoveClick, onQuickAdd, isEditing = false }) => {
  const [withBall, setWithBall] = useState(false);
  const [activeTab, setActiveTab] = useState<'kader' | 'scouting'>('scouting');
  const [searchTerm, setSearchTerm] = useState('');
  
  const posKey = withBall ? 'scouting_pos_with_ball' : 'scouting_pos_grund';
  const lineupKey = withBall ? 'scouting_lineup_with_ball' : 'scouting_lineup_grund';

  const [posData, setPosData] = useSyncedState<PositionData[]>(posKey, () => {
    const saved = localStorage.getItem(withBall ? 'fca_scouting_pos_with_ball' : 'fca_scouting_pos_grund');
    if (saved) return JSON.parse(saved);
    return withBall ? WITH_BALL_433 : GRUNDORDNUNG_4231;
  });

  const [rawAssignments, setAssignments] = useSyncedState<Record<string, any>>(lineupKey, () => {
    const savedLineup = localStorage.getItem(withBall ? 'fca_scouting_lineup_with_ball' : 'fca_scouting_lineup_grund');
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

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = (id: string, info: any) => {
    if (!isEditing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((info.point.x - rect.left) / rect.width) * 100;
    const y = ((info.point.y - rect.top) / rect.height) * 100;

    const updated = posData.map(p => p.id === id ? { ...p, x, y } : p);
    setPosData(updated);
  };

  const handleAssign = (slotId: string, id: string) => {
    if (!isEditing) return;
    setAssignments((prev: Record<string, any>) => {
      const currentRaw = prev[slotId] || [];
      const current = (Array.isArray(currentRaw) ? currentRaw : [currentRaw]).filter(existingId => {
        if (!existingId) return false;
        if (existingId.startsWith('manual:')) return true;
        const existsAsPlayer = players.some(p => p.id === existingId);
        const existsAsScout = candidates.some(s => s.id === existingId);
        return existsAsPlayer || existsAsScout;
      });
      
      if (!current.includes(id) && current.length < 3) {
        return { ...prev, [slotId]: [...current, id] };
      }
      return { ...prev, [slotId]: current };
    });
  };

  const handleRemoveAssign = (slotId: string, id: string) => {
    if (!isEditing) return;
    setAssignments((prev: Record<string, any>) => {
      const currentRaw = prev[slotId] || [];
      const current = Array.isArray(currentRaw) ? currentRaw : [currentRaw];
      return { ...prev, [slotId]: current.filter((c: string) => c !== id) };
    });
  };

  const resetPositions = () => {
    if (!isEditing) return;
    const defaults = withBall ? WITH_BALL_433 : GRUNDORDNUNG_4231;
    setPosData(defaults);
  };

  const allOptions = [
    ...players.map(p => ({ id: p.id, name: `${p.lastName} (#${p.number})`, position: p.position, club: 'FC Auggen', type: 'kader', data: p })),
    ...candidates.map(c => ({ id: c.id, name: c.name, position: c.position, club: c.club, type: 'scouting', data: c }))
  ];

  const filteredOptions = allOptions.filter(o => 
    o.type === activeTab && 
    (o.name.toLowerCase().includes(searchTerm.toLowerCase()) || o.position.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full space-y-2 overflow-hidden bg-[#0F0F0F] text-[#F5F5F5] p-2 sm:p-4 rounded-2xl border border-[#2A2A2A] shadow-2xl">
      {/* Header - Minimalist */}
      <div className="flex justify-between items-center shrink-0 border-b border-[#2A2A2A] pb-2">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-[#FFD54F]" />
          <h3 className="font-bold text-sm uppercase tracking-tight text-[#FFD54F]">Scouting & Kaderplanung</h3>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button 
              onClick={resetPositions}
              className="text-xs font-medium text-[#C7C7C7] hover:text-[#FFD54F] transition-colors px-2"
            >
              Reset
            </button>
          )}
          <div className="flex bg-[#202020] rounded-xl border border-[#2A2A2A] p-0.5">
            <button 
              onClick={() => isEditing && setWithBall(false)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${!withBall ? 'bg-[#FFD54F] text-[#0F0F0F] shadow-sm font-black' : 'text-[#888888] hover:text-[#F5F5F5]'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={!isEditing}
            >
              4-2-3-1
            </button>
            <button 
              onClick={() => isEditing && setWithBall(true)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${withBall ? 'bg-[#FFD54F] text-[#0F0F0F] shadow-sm font-black' : 'text-[#888888] hover:text-[#F5F5F5]'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={!isEditing}
            >
              4-3-3
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Pitch Area */}
        <div 
          ref={containerRef}
          className="flex-1 relative bg-[#1c3818] rounded-xl overflow-hidden shadow-inner border border-[#2A2A2A]"
        >
          {/* Pitch Markings */}
          <div className="absolute inset-4 border border-white/20 pointer-events-none rounded-sm">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-[#1E293B]/20 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-32 h-32 border border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 border border-white/20 border-t-0" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-32 border border-white/20 border-b-0" />
          </div>

          {/* Draggable Position Groups */}
          {posData.map((pos) => {
            const assignedIds = assignments[pos.id] || [];
            const assignedPersons = assignedIds.map(id => allOptions.find(o => o.id === id)).filter(Boolean);

            return (
              <motion.div
                key={`${withBall ? 'wb' : 'gr'}-${pos.id}`}
                drag={isEditing}
                dragMomentum={false}
                onDragEnd={(_, info) => isEditing && handleDragEnd(pos.id, info)}
                initial={false}
                animate={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
                style={{ touchAction: 'none' }}
              >
                <div 
                  onDragOver={(e) => {
                    if (!isEditing) return;
                    e.preventDefault();
                    e.currentTarget.classList.add('ring-2', 'ring-[#FFD54F]', 'scale-105');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('ring-2', 'ring-[#FFD54F]', 'scale-105');
                  }}
                  onDrop={(e) => {
                    if (!isEditing) return;
                    e.preventDefault();
                    e.currentTarget.classList.remove('ring-2', 'ring-[#FFD54F]', 'scale-105');
                    const id = e.dataTransfer.getData('text/plain');
                    if (id) handleAssign(pos.id, id);
                  }}
                  className={`bg-[#1A1A1A]/95 backdrop-blur-sm rounded-lg shadow-xl w-40 flex flex-col group transition-all overflow-hidden border border-[#2A2A2A] ${isEditing ? 'cursor-move' : 'cursor-default'}`}
                >
                  <div className="bg-[#202020] text-[#FFD54F] px-2 py-1 text-[9px] font-bold uppercase tracking-widest flex justify-between items-center border-b border-[#2A2A2A]">
                    <div className="flex items-center gap-1">
                      <GripVertical size={10} className="opacity-40" />
                      <span>{pos.label}</span>
                    </div>
                    <span className="text-[8px] text-[#888888]">{assignedPersons.length} Spieler</span>
                  </div>
                  <div className="p-1.5 min-h-[60px] flex flex-col gap-1 justify-center">
                    {assignedPersons.length > 0 ? (
                      <>
                        {assignedPersons.map((person, idx) => (
                          <div key={idx} className="w-full bg-[#202020] border border-[#2A2A2A] rounded p-1.5 relative group/item">
                            <div className="flex justify-between items-start">
                              <p className="text-[9px] font-bold uppercase leading-tight truncate pr-4 text-[#F5F5F5]">{person?.name}</p>
                              {person?.type === 'scouting' && (
                                <span className={`shrink-0 text-[6px] font-black px-1 py-0.5 rounded-sm ${
                                  (person.data as ScoutingEntry).recommendation === 'Verpflichten' ? 'bg-[#00D47A] text-[#0F0F0F]' : 'bg-[#FFD54F] text-[#0F0F0F]'
                                }`}>
                                  {(person.data as ScoutingEntry).recommendation === 'Verpflichten' ? 'TOP' : 'BEOB.'}
                                </span>
                              )}
                            </div>
                            <p className="text-[7px] font-medium text-[#C7C7C7] truncate mt-0.5">{person?.club} • {person?.position}</p>
                            {isEditing && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveAssign(pos.id, person!.id); }} 
                                className="absolute top-1 right-1 opacity-0 group-hover/item:opacity-100 hover:text-[#FF4C4C] transition-opacity bg-[#1A1A1A] text-[#C7C7C7] rounded-full p-0.5 shadow-sm border border-[#2A2A2A]"
                              >
                                <X size={8} />
                              </button>
                            )}
                          </div>
                        ))}
                        {Array.from({ length: 3 - assignedPersons.length }).map((_, i) => (
                          <div key={`slot-${i}`} className="w-full border border-dashed border-[#2A2A2A] rounded p-1.5 opacity-40">
                            <p className="text-[8px] font-bold uppercase text-center text-[#888888]">Slot {assignedPersons.length + i + 1}</p>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="flex flex-col gap-1 w-full opacity-30">
                        <div className="border border-dashed border-[#2A2A2A] rounded p-1 text-[8px] font-bold uppercase text-center text-[#888888]">Slot 1</div>
                        <div className="border border-dashed border-[#2A2A2A] rounded p-1 text-[8px] font-bold uppercase text-center text-[#888888]">Slot 2</div>
                        <div className="border border-dashed border-[#2A2A2A] rounded p-1 text-[8px] font-bold uppercase text-center text-[#888888]">Slot 3</div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Sidebar Lists */}
        <div className="w-72 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] flex flex-col overflow-hidden shadow-xl">
          {/* Tabs */}
          <div className="flex bg-[#202020] border-b border-[#2A2A2A] p-1 gap-1">
            <button
              onClick={() => setActiveTab('kader')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'kader' 
                  ? 'bg-[#FFD54F] text-[#0F0F0F] font-black shadow-xs border border-[#FFD54F]' 
                  : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#202020]'
              }`}
            >
              Kader
            </button>
            <button
              onClick={() => setActiveTab('scouting')}
              className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'scouting' 
                  ? 'bg-[#FFD54F] text-[#0F0F0F] font-black shadow-xs border border-[#FFD54F]' 
                  : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#202020]'
              }`}
            >
              Scouting
            </button>
          </div>

          {/* Search & Actions */}
          <div className="p-3 bg-[#1A1A1A] border-b border-[#2A2A2A] space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" size={12} />
              <input 
                type="text" 
                placeholder="SUCHEN..." 
                className="w-full pl-8 pr-3 py-1.5 bg-[#202020] border border-[#2A2A2A] rounded-xl text-[10px] font-medium text-[#F5F5F5] focus:outline-none focus:border-[#FFD54F] transition-all placeholder:text-[#888888]"
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchTerm.trim() && activeTab === 'scouting') {
                    onQuickAdd(searchTerm.trim());
                    setSearchTerm('');
                  }
                }}
              />
            </div>
            {activeTab === 'scouting' && (
              <div className="flex gap-1">
                <button 
                  onClick={() => {
                    if (searchTerm.trim()) {
                      onQuickAdd(searchTerm.trim());
                      setSearchTerm('');
                    } else {
                      onAddClick();
                    }
                  }} 
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#FFD54F] text-[#0F0F0F] rounded-xl text-[9px] font-black uppercase hover:bg-[#ffe082] transition-colors shadow-xs border border-[#FFD54F]"
                >
                  <Plus size={10} /> {searchTerm.trim() ? 'Schnell hinzufügen' : 'Neu'}
                </button>
                {isEditing && (
                  <button onClick={onRemoveClick} className="px-2 py-1.5 bg-[#202020] text-[#FF4C4C] border border-[#2A2A2A] rounded-xl hover:bg-[#FF4C4C]/10 transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {filteredOptions.map(o => {
              const isAssigned = Object.values(assignments).some(arr => arr.includes(o.id));
              return (
                <div
                  key={o.id}
                  draggable={isEditing}
                  onDragStart={(e) => {
                    if (!isEditing) return;
                    e.dataTransfer.setData('text/plain', o.id);
                  }}
                  className={`bg-[#202020] p-2.5 rounded-xl border transition-all ${
                    isEditing ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                  } ${
                    isAssigned ? 'border-[#00D47A]/50 bg-[#00D47A]/10 text-[#F5F5F5]' : 'border-[#2A2A2A] hover:border-[#FFD54F]/40 text-[#F5F5F5]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#F5F5F5] truncate pr-2">{o.name}</span>
                    {isAssigned && <UserCheck size={12} className="text-[#00D47A] shrink-0" />}
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-medium text-[#C7C7C7]">
                    <span>{o.position}</span>
                    <span className="truncate pl-2">{o.club}</span>
                  </div>
                  {o.type === 'scouting' && (o.data as ScoutingEntry).recommendation && (
                    <div className="mt-2 flex items-center gap-2">
                       <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${
                          (o.data as ScoutingEntry).recommendation === 'Verpflichten' ? 'bg-[#00D47A] text-[#0F0F0F]' : 'bg-[#FFD54F] text-[#0F0F0F]'
                        }`}>
                          {(o.data as ScoutingEntry).recommendation}
                        </span>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="text-center py-8 text-[#888888] text-xs font-medium">
                Keine Spieler gefunden
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
