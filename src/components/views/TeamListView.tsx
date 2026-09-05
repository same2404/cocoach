import React from 'react';
import { Player, Spieler } from '../../types';
import { Download, Phone, Mail, MapPin, Calendar, Activity, Edit2, Plus } from 'lucide-react';

interface TeamListViewProps {
  players: Spieler[];
  onEditPlayer?: (player: Spieler) => void;
  onAddPlayer?: () => void;
  isEditing: boolean;
}

export const TeamListView: React.FC<TeamListViewProps> = ({ players, onEditPlayer, onAddPlayer, isEditing }) => {
  const getCategoryBadge = (p: Spieler) => {
    const category = p.category || 'player';
    const ampel = p.loadAmpel || (p.isInjured || p.status === 'Verletzt' ? 'Rot' : p.status === 'Reha' ? 'Gelb' : 'Grün');

    const ampelBadge = ampel === 'Rot' ? (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 flex items-center gap-1" title="🔴 Keine Belastung / Ausfall">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse"></span> 🔴 Ausfall
      </span>
    ) : ampel === 'Gelb' ? (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 flex items-center gap-1" title="🟡 Teilbelastung (Vorsicht)">
        <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span> 🟡 Teil
      </span>
    ) : (
      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 flex items-center gap-1" title="🟢 Voll Belastbar (100%)">
        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span> 🟢 Voll
      </span>
    );

    switch (category) {
      case 'coach': 
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30">Trainer</span>;
      case 'staff': 
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#A855F7]/10 text-[#A855F7] border border-[#A855F7]/30">Funktionär</span>;
      case 'medical': 
        return <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#FB7185]/10 text-[#FB7185] border border-[#FB7185]/30">Physio / Arzt</span>;
      default: 
        return (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#1E293B] text-[#F8FAFC] border border-[#334155]">Spieler</span>
            {ampelBadge}
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-white text-[#0F172A] rounded-2xl border border-slate-200 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-[#F1F5F9]">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-[#0F172A] flex items-center gap-2">
            Team-Datenbank
          </h2>
          <p className="text-xs text-[#475569] font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
            <Activity size={13} className="text-[#10B981]" />
            Zentrales Register • {players.length} Mitglieder
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isEditing && onAddPlayer && (
            <button
              onClick={onAddPlayer}
              className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#059669] transition-all shadow-xs border border-[#10B981]"
            >
              <Plus size={15} />
              Hinzufügen
            </button>
          )}
        </div>
      </div>
      
      {/* Data Grid - Clean White Background */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-white">
        <table className="w-full border-collapse text-left text-[#0F172A] bg-white">
          <thead className="sticky top-0 z-10 bg-[#F1F5F9] border-b border-slate-200">
            <tr>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider">Status</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider">Name / Geburtsdatum</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider">Kontakt & Adresse</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider">Ausrüstung</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider">Position / Rolle</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider text-right">Einsatzzeit</th>
              <th className="px-5 py-3.5 text-[10px] font-black text-[#475569] uppercase tracking-wider text-right">Leistung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {players.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    {isEditing && onEditPlayer && (
                      <button 
                        onClick={() => onEditPlayer(p)}
                        className="p-1.5 text-[#64748B] hover:text-[#10B981] hover:bg-slate-100 rounded-lg transition-all border border-transparent hover:border-slate-200"
                        title="Bearbeiten"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {getCategoryBadge(p)}
                  </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-[#0F172A] group-hover:text-[#0D9488] transition-colors">
                    {p.lastName && p.firstName 
                      ? `${p.lastName}, ${p.firstName}` 
                      : p.lastName || p.firstName || p.name || 'Unbenannt'}
                  </div>
                  <div className="text-[11px] text-[#64748B] font-medium flex items-center gap-1 mt-0.5 font-mono">
                    <Calendar size={11} className="text-[#0D9488]" /> {p.geburtsdatum || '-'}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-col gap-1 max-w-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A] font-mono break-all">
                      <Phone size={12} className="text-[#64748B] shrink-0" /> <span className="truncate">{p.telefon || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <Mail size={12} className="text-[#64748B] shrink-0" /> <span className="truncate max-w-[200px]" title={p.email}>{p.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#64748B] italic">
                      <MapPin size={11} className="text-[#64748B] shrink-0" /> <span className="truncate max-w-[200px]" title={p.adresse}>{p.adresse || '-'}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {p.category === 'player' ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-bold text-[#0F172A] font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] w-3">O:</span>
                        <span className="text-[#0F172A]">{p.oberteil || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] w-3">K:</span>
                        <span className="text-[#0F172A]">{p.kurze_hose || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] w-3">L:</span>
                        <span className="text-[#0F172A]">{p.lange_hose || '-'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#64748B] w-3">S:</span>
                        <span className="text-[#0F172A]">{p.schuhe || '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#64748B] italic">N/A</span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="text-xs font-bold text-[#0F172A]">
                    {p.position || (p.category === 'coach' ? 'Trainer' : (p.category === 'staff' || p.category === 'medical') ? 'Funktionär' : '-')}
                  </div>
                  {p.number && (
                    <div className="text-[11px] font-black text-[#0D9488] mt-0.5 font-mono">
                      Trikot #{p.number}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  {p.category === 'player' ? (
                    <div className="inline-flex flex-col items-end gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono">
                      <div className="text-[11px] font-bold text-[#0F172A]">
                        Pflicht: <span className="text-[#0D9488] font-black">{p.einsatzzeitenGesamt || 0} MIN</span>
                      </div>
                      <div className="text-[11px] font-bold text-[#0F172A]">
                        Test: <span className="text-[#0284C7] font-black">{p.testEinsatzzeitenGesamt || 0} MIN</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#64748B] italic">N/A</span>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-right">
                  {p.category === 'player' ? (
                    <div className="inline-flex flex-col items-end gap-1 bg-slate-50 p-2 rounded-xl border border-slate-200 font-mono">
                      <div className="text-[11px] font-bold text-[#0F172A]">
                        Sprint: <span className="text-[#0D9488] font-black">{p.diagnostics?.sprintwert || '-'}</span>
                      </div>
                      <div className="text-[11px] font-bold text-[#0F172A]">
                        Yoyo: <span className="text-[#0284C7] font-black">{p.diagnostics?.yoyotest || '-'}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-[#64748B] italic">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
