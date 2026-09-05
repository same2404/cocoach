import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Calendar, 
  Activity, 
  Flame, 
  Zap, 
  ShieldAlert, 
  Smartphone, 
  Clock, 
  Target, 
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { TEN_DAY_ACTIV_PLAN, TEN_DAY_ACTIV_RULES, TenDayPlanUnit } from '../data/tenDayPlan';

interface TenDayPlanSectionProps {
  onSyncWithRunTable?: (plan: TenDayPlanUnit[]) => void;
  isEditing?: boolean;
}

export const TenDayPlanSection: React.FC<TenDayPlanSectionProps> = ({ 
  onSyncWithRunTable,
  isEditing = false 
}) => {
  const [completedDays, setCompletedDays] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('fc_auggen_10_day_plan_completed');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('fc_auggen_10_day_plan_completed', JSON.stringify(completedDays));
    } catch (e) {
      console.error(e);
    }
  }, [completedDays]);

  const toggleDayCompletion = (dayId: number) => {
    setCompletedDays(prev => ({
      ...prev,
      [dayId]: !prev[dayId]
    }));
  };

  const handleResetProgress = () => {
    setCompletedDays({});
  };

  const handleSyncClick = () => {
    if (onSyncWithRunTable) {
      onSyncWithRunTable(TEN_DAY_ACTIV_PLAN);
      setSyncSuccessToast('10-Tage-Plan wurde erfolgreich in die Lauf-Tabelle übernommen!');
      setTimeout(() => setSyncSuccessToast(null), 3500);
    }
  };

  const completedCount = Object.values(completedDays).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / TEN_DAY_ACTIV_PLAN.length) * 100);

  const getIntensityBadgeColor = (type: string) => {
    switch (type) {
      case 'Dauerlauf': return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800';
      case 'Intervall leicht': return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800';
      case 'Fahrtspiel': return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800';
      case 'Intervall intensiv': return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800';
      case 'Intervall': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800';
      case 'Sprints / Explosivität': return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] rounded-2xl p-4 sm:p-6 shadow-xl mb-6 relative overflow-hidden">
      {/* Background Accent Lines */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFD54F]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Sync Success Toast */}
      {syncSuccessToast && (
        <div className="absolute top-4 right-4 z-50 bg-[#FFD54F] text-[#0F0F0F] font-black text-xs px-4 py-2 rounded-xl shadow-lg border border-[#FFD54F] flex items-center gap-2 animate-bounce">
          <Sparkles size={16} />
          <span>{syncSuccessToast}</span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2A]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="bg-[#FFD54F] text-[#0F0F0F] font-black text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-[#FFD54F] shadow-xs flex items-center gap-1">
              <Flame size={12} className="animate-pulse" />
              Offizielles Vorbereitungsprogramm
            </span>
            <span className="bg-[#202020] text-[#F5F5F5] font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-md border border-[#2A2A2A] flex items-center gap-1">
              <Calendar size={12} className="text-[#FFD54F]" />
              17.06.2026 – 03.07.2026
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-[#F5F5F5] flex items-center gap-2">
            <span>10-Tage-Aktiv Plan</span>
            <span className="text-xs font-black text-[#FF4C4C] bg-[#FF4C4C]/10 px-2 py-0.5 rounded border border-[#FF4C4C]/30">
              Verbindlich abarbeiten
            </span>
          </h2>
          <p className="text-xs text-[#C7C7C7] font-medium mt-1">
            Vor-Vorbereitungsplan für alle Kader-Spieler des FC Auggen. Tracking über Adidas Running App an Athletik Klaus.
          </p>
        </div>

        {/* Progress & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Progress Bar */}
          <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-2.5 px-3 min-w-[150px]">
            <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-[#F5F5F5] mb-1">
              <span>Fortschritt</span>
              <span className="text-[#FFD54F] font-mono text-xs">{completedCount} / 10 ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-[#0F0F0F] h-2 rounded-full overflow-hidden border border-[#2A2A2A]">
              <div 
                className="bg-[#FFD54F] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {onSyncWithRunTable && (
            <button
              onClick={handleSyncClick}
              className="bg-[#FFD54F] hover:bg-[#ffe082] text-[#0F0F0F] font-black text-xs uppercase px-3.5 py-2.5 rounded-xl border border-[#FFD54F] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="10-Tage Plan Daten in die 15-Lauf Spalten der Haupttabelle übernehmen"
            >
              <Sparkles size={15} />
              <span>In Tabelle laden</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] p-2.5 rounded-xl border border-[#2A2A2A] transition-colors"
            title={isExpanded ? 'Plan einklappen' : 'Plan ausklappen'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="mt-5 space-y-6">
          {/* 10 Days Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TEN_DAY_ACTIV_PLAN.map((unit) => {
              const isDone = !!completedDays[unit.id];
              return (
                <div 
                  key={unit.id}
                  onClick={() => toggleDayCompletion(unit.id)}
                  className={`border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer group relative overflow-hidden ${
                    isDone 
                      ? 'bg-[#FFD54F]/10 border-[#FFD54F] shadow-md' 
                      : 'bg-[#202020] border-[#2A2A2A] hover:border-[#FFD54F]'
                  }`}
                >
                  {/* Top Day Header */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-black text-xs uppercase tracking-wider text-[#FFD54F] flex items-center gap-1">
                        <Calendar size={12} className="text-[#888888]" />
                        {unit.tag} • {unit.date}
                      </span>
                      <button 
                        type="button" 
                        className="text-[#888888] hover:text-[#F5F5F5] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDayCompletion(unit.id);
                        }}
                      >
                        {isDone ? (
                          <CheckSquare size={18} className="text-[#FFD54F] fill-[#FFD54F]" />
                        ) : (
                          <Square size={18} className="text-[#888888] group-hover:text-[#F5F5F5]" />
                        )}
                      </button>
                    </div>

                    <h4 className={`font-black text-sm uppercase tracking-tight mb-1.5 ${isDone ? 'line-through text-[#888888]' : 'text-[#F5F5F5]'}`}>
                      {unit.title}
                    </h4>

                    {/* Type & Intensity Badges */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${getIntensityBadgeColor(unit.type)}`}>
                        {unit.type}
                      </span>
                      <span className="bg-[#1A1A1A] text-[#F5F5F5] text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#2A2A2A]">
                        {unit.intensity}
                      </span>
                    </div>

                    {/* Content Details */}
                    <p className="text-[11px] text-[#F5F5F5] font-medium leading-relaxed mb-2 bg-[#1A1A1A] p-2 rounded-lg border border-[#2A2A2A]">
                      <strong className="font-bold block text-[9px] uppercase tracking-wider text-[#C7C7C7] mb-0.5">Inhalt:</strong>
                      {unit.content}
                    </p>
                  </div>

                  {/* Goal / Why Footer */}
                  <div className="pt-2 border-t border-[#2A2A2A] mt-1">
                    <p className="text-[10px] text-[#C7C7C7] font-medium italic flex items-start gap-1">
                      <Target size={12} className="text-[#FFD54F] shrink-0 mt-0.5" />
                      <span>{unit.goal}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase">
                      <span className={isDone ? 'text-[#FFD54F] font-bold' : 'text-[#888888]'}>
                        {isDone ? '[ x ] erledigt' : '[  ] ausstehend'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rahmenbedingungen & Vorgaben Section */}
          <div className="bg-[#202020] border border-[#2A2A2A] rounded-xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2A]">
              <h3 className="font-black text-sm uppercase tracking-wider text-[#FFD54F] flex items-center gap-2">
                <ShieldAlert size={16} className="text-[#FF4C4C]" />
                <span>Rahmenbedingungen & Vorgaben (verbindlich)</span>
              </h3>
              {completedCount > 0 && (
                <button
                  onClick={handleResetProgress}
                  className="text-[10px] font-bold uppercase text-[#888888] hover:text-[#FF4C4C] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>Fortschritt zurücksetzen</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Rule 1 */}
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A] space-y-1">
                <div className="flex items-center gap-1.5 text-[#F5F5F5] font-black uppercase text-[11px]">
                  <Activity size={14} className="text-[#FFD54F]" />
                  <span>1. Reihenfolge</span>
                </div>
                <p className="text-[#C7C7C7] text-[11px]">
                  {TEN_DAY_ACTIV_RULES.reihenfolge}
                </p>
              </div>

              {/* Rule 2 */}
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A] space-y-1">
                <div className="flex items-center gap-1.5 text-[#F5F5F5] font-black uppercase text-[11px]">
                  <Clock size={14} className="text-[#60A5FA]" />
                  <span>2. Ruhetage</span>
                </div>
                <p className="text-[#C7C7C7] text-[11px]">
                  {TEN_DAY_ACTIV_RULES.ruhetage}
                </p>
              </div>

              {/* Rule 3 */}
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A] space-y-1">
                <div className="flex items-center gap-1.5 text-[#F5F5F5] font-black uppercase text-[11px]">
                  <Flame size={14} className="text-[#FF4C4C]" />
                  <span>3. Verletzungsprophylaxe</span>
                </div>
                <p className="text-[#C7C7C7] text-[11px]">
                  {TEN_DAY_ACTIV_RULES.verletzungsprophylaxe}
                </p>
              </div>

              {/* Rule 4 */}
              <div className="bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A] space-y-1">
                <div className="flex items-center gap-1.5 text-[#F5F5F5] font-black uppercase text-[11px]">
                  <Smartphone size={14} className="text-[#00D47A]" />
                  <span>4. Datenübermittlung</span>
                </div>
                <p className="text-[#C7C7C7] text-[11px]">
                  {TEN_DAY_ACTIV_RULES.datenuebermittlung}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
