import React, { useRef, useState } from 'react';
import { Share2, Save, Users, UserPlus, UserMinus, MessageSquare, Mail, Camera, Download, FileText, Copy, ChevronDown, Check, Upload, Edit, RefreshCw, MoreHorizontal, Printer } from 'lucide-react';

interface UniformMaskProps {
  title: string;
  children: React.ReactNode;
  onShareText?: () => void;
  onEmail?: () => void;
  onEdit?: () => void;
  onSave?: () => void;
  onManageSquad?: () => void;
  onAddPlayer?: () => void;
  onRemovePlayer?: () => void;
  onReset?: () => void;
  onDeduplicate?: () => void;
  onMigrate?: () => void;
  onOpenKaderAgent?: (preset?: 'beste_formation' | 'topform_startelf' | 'vollbild_ordnung' | 'laufwege_profi') => void;
  onOpen3DTacticBoard?: () => void;
  saveStatus?: 'idle' | 'saving' | 'success';
  isEditing?: boolean;
}

export const UniformMask: React.FC<UniformMaskProps> = ({ 
  title, 
  children, 
  onShareText, 
  onEmail, 
  onEdit, 
  onSave, 
  onManageSquad, 
  onAddPlayer, 
  onRemovePlayer, 
  onReset, 
  onDeduplicate, 
  onMigrate,
  onOpenKaderAgent,
  onOpen3DTacticBoard,
  saveStatus, 
  isEditing 
}) => {
  const maskRef = useRef<HTMLDivElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const hasRareActions = Boolean(onRemovePlayer || onEdit || onReset);

  return (
    <div ref={maskRef} className="relative flex flex-col h-full bg-[#0A0E17] text-[#F8FAFC] border border-[#334155]/60 rounded-xl shadow-2xl overflow-hidden print:border-0 print:shadow-none print:h-auto print:overflow-visible">

      {/* Header Mask Banner */}
      <header className="bg-gradient-to-r from-[#121824] via-[#1E293B] to-[#121824] text-[#F8FAFC] px-3 sm:px-5 py-2 border-b border-[#334155]/80 flex items-center justify-between gap-3 shrink-0 print:hidden shadow-md z-30 min-h-[48px] overflow-visible relative">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block shadow-[0_0_8px_rgba(245,158,11,0.8)] border border-[#FBBF24]" />
          <h2 className="text-xs sm:text-sm font-extrabold tracking-wide text-[#F8FAFC] leading-none whitespace-nowrap flex items-center gap-2">
            <span>{title}</span>
            <span className="hidden sm:inline-block text-[10px] bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 px-2 py-0.5 rounded font-mono font-bold">
              Pro Mask 26/27
            </span>
          </h2>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end py-0.5 shrink-0 max-w-full overflow-visible">
          {onEdit && (
            <button 
              onClick={onEdit}
              className={`px-3 py-1.5 border transition-all flex items-center gap-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 cursor-pointer ${
                isEditing 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                  : 'bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border-[#334155]'
              }`}
              title={isEditing ? 'Trainer-Bearbeitungsmodus ist AKTIV' : 'Trainer-Bearbeitungsmodus aktivieren'}
            >
              <Edit size={14} className={isEditing ? 'text-slate-950 font-black' : 'text-[#F59E0B]'} />
              <span className="text-[11px] font-bold hidden md:inline">
                {isEditing ? 'Bearbeiten AKTIV' : 'Bearbeiten'}
              </span>
            </button>
          )}

          {onSave && (
            <button 
              onClick={onSave}
              className={`px-3 py-1.5 border transition-all flex items-center gap-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 cursor-pointer ${
                saveStatus === 'success' ? 'bg-[#10B981] text-[#0A0E17] border-[#10B981] font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.5)]' : 
                saveStatus === 'saving' ? 'bg-[#F59E0B] text-[#0A0E17] border-[#F59E0B] font-extrabold animate-pulse' : 
                'bg-[#F59E0B] text-[#0A0E17] border-[#F59E0B] hover:bg-[#FBBF24] shadow-[0_0_12px_rgba(245,158,11,0.4)] font-extrabold'
              }`}
              title="Speichern"
            >
              <Save size={14} />
              <span className="text-[11px] font-bold hidden md:inline">
                {saveStatus === 'success' ? 'Gespeichert' : saveStatus === 'saving' ? 'Speichert...' : 'Speichern'}
              </span>
            </button>
          )}

          {onMigrate && (
            <button 
              onClick={onMigrate}
              className="bg-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/30 border border-[#F59E0B]/50 transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs active:scale-95 cursor-pointer"
              title="Lokale Daten in die Cloud übertragen"
            >
              <Upload size={14} />
              <span className="text-[11px] font-bold hidden md:inline">Cloud Sync</span>
            </button>
          )}

          {onManageSquad && (
            <button 
              onClick={onManageSquad}
              className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[#334155] transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs active:scale-95 cursor-pointer"
              title="Kader verwalten"
            >
              <Users size={14} className="text-[#F59E0B]" />
              <span className="text-[11px] hidden md:inline">Kader</span>
            </button>
          )}

          {onAddPlayer && (
            <button 
              onClick={onAddPlayer}
              className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] border border-[#334155] transition-all flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xs active:scale-95 cursor-pointer"
              title="Eintrag / Spieler hinzufügen"
            >
              <UserPlus size={14} className="text-[#10B981]" />
              <span className="text-[11px] hidden md:inline">Hinzufügen</span>
            </button>
          )}

          <button 
            onClick={onEmail}
            className="bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155] px-3 py-1.5 border border-[#334155] transition-all flex items-center gap-1.5 rounded-lg text-xs font-medium shadow-xs active:scale-95 cursor-pointer"
            title="Per E-Mail senden"
          >
            <Mail size={14} className="text-[#06B6D4]" />
            <span className="text-[11px] hidden md:inline">E-Mail</span>
          </button>

          <button 
            onClick={onShareText}
            className="bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155] px-3 py-1.5 border border-[#334155] transition-all flex items-center gap-1.5 rounded-lg text-xs font-medium shadow-xs active:scale-95 cursor-pointer"
            title="WhatsApp senden"
          >
            <MessageSquare size={14} className="text-[#10B981]" />
            <span className="text-[11px] hidden md:inline">WhatsApp</span>
          </button>

          {/* 3-Dots Action Dropdown (...) */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDropdown(!showDropdown);
              }}
              className={`p-1.5 border transition-all rounded-lg text-xs shadow-xs active:scale-95 flex items-center justify-center cursor-pointer ${
                showDropdown 
                  ? 'bg-amber-400 text-slate-950 border-amber-300' 
                  : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] border-[#334155]'
              }`}
              title="Weitere Trainer-Aktionen (...)"
            >
              <MoreHorizontal size={16} />
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-black/20" 
                  onClick={() => setShowDropdown(false)} 
                />
                <div 
                  className="absolute right-0 mt-2 w-56 bg-slate-900 border-2 border-amber-400/80 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] py-1.5 z-50 animate-fadeIn"
                >
                  <div className="px-3 py-1.5 border-b border-slate-800 text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center justify-between">
                    <span>Trainer-Aktionen</span>
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">Maske Pro</span>
                  </div>
                  {onEdit && (
                    <button
                      onClick={() => { onEdit(); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-amber-500/20 hover:text-amber-300 flex items-center gap-2 cursor-pointer font-bold transition-colors"
                    >
                      <Edit size={14} className="text-amber-400" />
                      <span>{isEditing ? '✓ Bearbeitung Beenden' : '✏️ Bearbeitungsmodus'}</span>
                    </button>
                  )}
                  {onAddPlayer && (
                    <button
                      onClick={() => { onAddPlayer(); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <UserPlus size={14} className="text-emerald-400" />
                      <span>➕ Inhalt / Eintrag hinzufügen</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      window.print();
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Printer size={14} className="text-sky-400" />
                    <span>🖨️ Drucken / PDF Export</span>
                  </button>
                  {onManageSquad && (
                    <button
                      onClick={() => { onManageSquad(); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Users size={14} className="text-amber-400" />
                      <span>👥 Kader verwalten</span>
                    </button>
                  )}
                  {onRemovePlayer && (
                    <button
                      onClick={() => { onRemovePlayer(); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-800 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <UserMinus size={14} className="text-rose-400" />
                      <span>🗑️ Einträge entfernen</span>
                    </button>
                  )}
                  {onReset && (
                    <button
                      onClick={() => { onReset(); setShowDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-xs text-white hover:bg-slate-800 flex items-center gap-2 border-t border-slate-800 cursor-pointer font-medium"
                    >
                      <RefreshCw size={14} className="text-slate-400" />
                      <span>🔄 Maske Reset / Sync</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Content Canvas */}
      <div className="flex-1 overflow-auto p-3 sm:p-5 bg-[#0A0E17] text-[#F8FAFC] print:p-0 print:bg-[#1E293B] print:overflow-visible custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

