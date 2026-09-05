import React, { useState } from 'react';
import { FinanceEntry, Spieler } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft, 
  ChevronRight,
  Target,
  AlertCircle,
  Calculator,
  Trash2,
  Users,
  Briefcase,
  Shield,
  User,
  Activity
} from 'lucide-react';

interface BudgetFinanceViewProps {
  players: Spieler[];
  financeMeta: {
    month: string;
    wins: number;
    draws: number;
    bonusPerPoint: number;
  };
  setFinanceMeta: React.Dispatch<React.SetStateAction<{
    month: string;
    wins: number;
    draws: number;
    bonusPerPoint: number;
  }>>;
  handleUpdateFinance: (playerId: string, field: string, value: any) => void;
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  isEditing?: boolean;
}

export const BudgetFinanceView: React.FC<BudgetFinanceViewProps> = ({
  players,
  financeMeta,
  setFinanceMeta,
  handleUpdateFinance,
  currentMonth,
  setCurrentMonth,
  isEditing = false
}) => {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '0000') {
      setIsUnlocked(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  // Group players by category and sort them
  const sortedAll = sortPlayers(players);
  const categorizedPersonnel = {
    player: sortedAll.filter(p => p.category === 'player'),
    coach: sortedAll.filter(p => p.category === 'coach'),
    staff: sortedAll.filter(p => p.category === 'staff'),
    medical: sortedAll.filter(p => p.category === 'medical')
  };

  // Calculations per player
  const playersWithCosts = players.map(p => {
    const grundgehalt = p.finance?.baseSalary || 0;
    const bonusPerMatch = p.finance?.bonusPerMatch || 0;
    const sideAgreementAmount = p.finance?.sideAgreementAmount || 0;
    const ist = p.finance?.ist || 0;
    const months = p.finance?.months ?? 12;
    
    // For simplicity, let's assume bonusPerMatch is what was previously seasonExtra
    // or just use it as a monthly cost for now.
    const kosten_monat = grundgehalt + bonusPerMatch;
    const kosten_jahr = (kosten_monat * months) + sideAgreementAmount;
    
    return {
      ...p,
      grundgehalt,
      bonusPerMatch,
      sideAgreementAmount,
      ist,
      months,
      kosten_monat,
      kosten_jahr
    };
  });

  // Totals
  const Gesamt_Grundgehalt_monat = playersWithCosts.reduce((sum, p) => sum + p.grundgehalt, 0);
  const Gesamt_Boni_monat = playersWithCosts.reduce((sum, p) => sum + p.bonusPerMatch, 0);
  const Gesamt_Nebenvereinbarung_jahr = playersWithCosts.reduce((sum, p) => sum + p.sideAgreementAmount, 0);
  const Gesamt_IST = playersWithCosts.reduce((sum, p) => sum + p.ist, 0);
  const Gesamt_Abloese_Zugang = players.reduce((sum, p) => sum + (p.finance?.transferFeeIn || 0), 0);
  const Gesamt_Abloese_Abgang = players.reduce((sum, p) => sum + (p.finance?.transferFeeOut || 0), 0);
  const Abloese_Saldo = Gesamt_Abloese_Abgang - Gesamt_Abloese_Zugang;
  
  const Gesamtkosten_Spieler_Monat = playersWithCosts.reduce((sum, p) => sum + p.kosten_monat, 0);
  const Gesamtkosten_Spieler_Jahr = playersWithCosts.reduce((sum, p) => sum + p.kosten_jahr, 0);

  // Point Premiums
  const gesamtpunkte = (financeMeta.wins * 3) + financeMeta.draws;
  const auszahlung = gesamtpunkte * financeMeta.bonusPerPoint;
  
  const totalPointBonuses = auszahlung * categorizedPersonnel.player.length;

  const Gesamtbudget_aktuell_monat = Gesamtkosten_Spieler_Monat + totalPointBonuses;
  const Gesamtbudget_aktuell_jahr = Gesamtkosten_Spieler_Jahr + (totalPointBonuses * 12); // Point bonuses are usually per match/month, assuming 12 for year here as it is team-wide.

  const changeMonth = (offset: number) => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + offset);
    setCurrentMonth(next);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  };

  const renderPersonnelTable = (title: string, personnel: Spieler[], icon: React.ReactNode) => {
    if (personnel.length === 0) return null;

    return (
      <>
        <tr className="bg-slate-950 text-amber-400">
          <td colSpan={13} className="px-3 py-2 border-y border-slate-800 bg-slate-950">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-black uppercase tracking-widest text-[10px] text-amber-400">{title}</span>
            </div>
          </td>
        </tr>
        {personnel.map((p) => {
          const grundgehalt = p.finance?.baseSalary || 0;
          const bonusPerMatch = p.finance?.bonusPerMatch || 0;
          const sideAgreementAmount = p.finance?.sideAgreementAmount || 0;
          const ist = p.finance?.ist || 0;
          const months = p.finance?.months ?? 12;
          const kosten_monat = grundgehalt + bonusPerMatch;
          const kosten_jahr = (kosten_monat * months) + sideAgreementAmount;

          return (
            <tr key={p.id} className="hover:bg-slate-800/90 transition-colors border-b border-slate-800 bg-slate-900">
              <td className="px-2 py-1.5 border-r border-slate-800 text-center font-bold text-slate-400">{(p as any).number || (p as any).nummer || (p as any).nr || '-'}</td>
              <td className="px-2.5 py-1.5 border-r border-slate-800 font-black uppercase text-white text-[11px]">{p.lastName || p.name}</td>
              <td className="px-2 py-1.5 border-r border-slate-800 text-center text-red-400 font-black text-[10px]">{(p as any).position || (p as any).pos || '-'}</td>
              <td className="px-2 py-1 border-r border-slate-800 text-right bg-slate-950/60">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-red-900/60 px-1.5 py-0.5 rounded text-right font-black text-red-400 text-[10px] focus:outline-none focus:border-red-500 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={p.finance?.transferFeeIn || 0}
                  onChange={(e) => handleUpdateFinance(p.id, 'transferFeeIn', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-right bg-slate-950/60">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-emerald-900/60 px-1.5 py-0.5 rounded text-right font-black text-emerald-400 text-[10px] focus:outline-none focus:border-emerald-500 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={p.finance?.transferFeeOut || 0}
                  onChange={(e) => handleUpdateFinance(p.id, 'transferFeeOut', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-right">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-right font-black text-white text-[10px] focus:outline-none focus:border-amber-400 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={grundgehalt}
                  onChange={(e) => handleUpdateFinance(p.id, 'baseSalary', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-right">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-right font-black text-white text-[10px] focus:outline-none focus:border-amber-400 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={bonusPerMatch}
                  onChange={(e) => handleUpdateFinance(p.id, 'bonusPerMatch', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-center bg-slate-950/60">
                <input 
                  type="number"
                  min="0"
                  max="12"
                  className={`w-full bg-slate-950 border border-slate-700 px-1 py-0.5 rounded text-center font-black text-amber-300 text-[10px] focus:outline-none focus:border-amber-400 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={months}
                  onChange={(e) => handleUpdateFinance(p.id, 'months', Math.min(12, Math.max(0, parseInt(e.target.value) || 0)))}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-right">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-slate-700 px-1.5 py-0.5 rounded text-right font-black text-white text-[10px] focus:outline-none focus:border-amber-400 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={sideAgreementAmount}
                  onChange={(e) => handleUpdateFinance(p.id, 'sideAgreementAmount', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1 border-r border-slate-800 text-right bg-slate-950/60">
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-blue-900/60 px-1.5 py-0.5 rounded text-right font-black text-blue-400 text-[10px] focus:outline-none focus:border-blue-400 ${!isEditing ? 'opacity-80 cursor-not-allowed' : ''}`}
                  value={ist}
                  onChange={(e) => handleUpdateFinance(p.id, 'ist', parseInt(e.target.value) || 0)}
                  disabled={!isEditing}
                />
              </td>
              <td className="px-2 py-1.5 border-r border-slate-800 text-right bg-slate-950 text-amber-300 font-extrabold text-[10px]">
                {formatCurrency(kosten_monat)}
              </td>
              <td className="px-2 py-1.5 border-r border-slate-800 text-right bg-slate-950 text-amber-300 font-extrabold text-[10px]">
                {formatCurrency(kosten_jahr)}
              </td>
              <td className="px-2 py-1 border-r border-slate-800">
                <input 
                  type="text"
                  className={`w-full bg-slate-950 text-slate-200 border border-slate-700 px-1.5 py-0.5 rounded italic text-[9px] focus:outline-none focus:border-amber-400 placeholder:text-slate-500 ${!isEditing ? 'cursor-not-allowed opacity-80' : ''}`}
                  value={p.finance?.sideAgreements || ''}
                  onChange={(e) => handleUpdateFinance(p.id, 'sideAgreements', e.target.value)}
                  placeholder={isEditing ? "Notizen..." : ""}
                  disabled={!isEditing}
                />
              </td>
            </tr>
          );
        })}
      </>
    );
  };

  if (!isUnlocked) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 p-4 h-full">
        <div className="bg-slate-900 border border-slate-800 p-8 w-full max-w-md text-center rounded-2xl shadow-2xl watermark-bg">
          <div className="w-16 h-16 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Euro size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2 text-white">Budget & Finanzen</h2>
          <p className="text-xs font-bold uppercase text-slate-400 mb-8 tracking-widest">Dieser Bereich ist passwortgeschützt</p>
          
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="relative">
              <input 
                type="password"
                placeholder="PASSWORT EINGEBEN..."
                className={`w-full p-4 bg-slate-950 border-2 border-slate-700 font-black text-center text-amber-400 focus:outline-none focus:border-amber-400 rounded-xl transition-all ${error ? 'border-red-500 animate-shake' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
              {error && <p className="text-[10px] font-black text-red-500 uppercase mt-2 tracking-widest">Falsches Passwort!</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 p-4 font-black uppercase tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-lg"
            >
              Bereich freischalten
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden watermark-bg">
      {/* 1. Kompakte Finanzübersicht */}
      <div className="p-2.5 grid grid-cols-9 gap-2 shrink-0 border-b border-black/10 bg-slate-950">
        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-blue-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Grundgehalt (Mtl.)</label>
          </div>
          <span className="text-sm font-black text-white">{formatCurrency(Gesamt_Grundgehalt_monat)}</span>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Briefcase size={12} className="text-orange-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Boni (Mtl.)</label>
          </div>
          <span className="text-sm font-black text-white">{formatCurrency(Gesamt_Boni_monat)}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro size={12} className="text-emerald-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Nebenvereinb. (Jahr)</label>
          </div>
          <span className="text-sm font-black text-white">{formatCurrency(Gesamt_Nebenvereinbarung_jahr)}</span>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Target size={12} className="text-purple-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">IST Aktuell</label>
          </div>
          <span className="text-sm font-black text-emerald-400">{formatCurrency(Gesamt_IST)}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-red-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Ablöse Zugänge</label>
          </div>
          <span className="text-sm font-black text-red-400">{formatCurrency(Gesamt_Abloese_Zugang)}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-emerald-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Ablöse Abgänge</label>
          </div>
          <span className="text-sm font-black text-emerald-400">{formatCurrency(Gesamt_Abloese_Abgang)}</span>
        </div>

        <div className={`bg-slate-900 border-2 p-2 flex flex-col justify-between rounded-[2px] ${Abloese_Saldo >= 0 ? 'border-emerald-500' : 'border-red-500'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Euro size={12} className={Abloese_Saldo >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <label className="text-[8px] font-black uppercase tracking-wider text-slate-300">Ablöse Saldo</label>
          </div>
          <span className={`text-sm font-black ${Abloese_Saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Abloese_Saldo)}</span>
        </div>

        <div className="bg-slate-900 text-white border-2 border-emerald-500 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Calculator size={12} className="text-emerald-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Budget (Monat)</label>
          </div>
          <span className="text-base font-black text-emerald-400 leading-none">{formatCurrency(Gesamtbudget_aktuell_monat)}</span>
        </div>

        <div className="bg-slate-900 text-white border-2 border-amber-500 p-2 flex flex-col justify-between rounded-[2px] shadow-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <Euro size={12} className="text-amber-400" />
            <label className="text-[8px] font-black uppercase tracking-wider text-amber-300">Budget (Jahr)</label>
          </div>
          <span className="text-base font-black text-amber-400 leading-none">{formatCurrency(Gesamtbudget_aktuell_jahr)}</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-2 p-2 pt-0 overflow-hidden bg-slate-950">
        {/* Left: Detailed List */}
        <div className="flex-1 bg-slate-950 border border-slate-800 flex flex-col overflow-hidden relative">
          <div className="p-2 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h3 className="font-black uppercase text-[10px] tracking-widest text-amber-400">Kader Finanzen</h3>
              <div className="flex items-center bg-slate-950 border border-slate-700 p-0.5 rounded">
                <button onClick={() => changeMonth(-1)} className="p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"><ChevronLeft size={12} /></button>
                <span className="px-3 text-[9px] font-black uppercase tracking-widest text-white">
                  {currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => changeMonth(1)} className="p-1 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar bg-slate-950">
            <table className="w-full border-collapse text-[9px] font-bold">
              <thead className="sticky top-0 bg-slate-950 text-amber-400 z-20 border-b-2 border-slate-800">
                <tr>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-8 text-slate-400">Nr</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left w-64 text-amber-400">Name</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-center w-10 text-amber-400">Pos</th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-red-400">Ablöse (Z)<br/><span className="text-[7px] opacity-70 text-slate-400">Zugang</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-emerald-400">Ablöse (A)<br/><span className="text-[7px] opacity-70 text-slate-400">Abgang</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-white">Grundgehalt<br/><span className="text-[7px] opacity-70 text-slate-400">Monat</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-white">Boni / Extras<br/><span className="text-[7px] opacity-70 text-slate-400">Monat</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-center w-12 text-amber-300">Monate<br/><span className="text-[7px] opacity-70 text-slate-400">Aktiv</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-white">Nebenvereinb.<br/><span className="text-[7px] opacity-70 text-slate-400">Jahr</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-blue-400">IST<br/><span className="text-[7px] opacity-70 text-slate-400">Aktuell</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-24 text-amber-300 bg-slate-900">Kosten<br/><span className="text-[7px] opacity-70 text-slate-400">Monat</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-right w-28 text-amber-300 bg-slate-900">Kosten<br/><span className="text-[7px] opacity-70 text-slate-400">Jahr</span></th>
                  <th className="px-2 py-1.5 border border-slate-800 text-left text-slate-300">Notizen</th>
                </tr>
              </thead>
              <tbody>
                {renderPersonnelTable('Spielerkader', categorizedPersonnel.player, <Users size={12} className="text-amber-400" />)}
                {renderPersonnelTable('Trainerteam', categorizedPersonnel.coach, <Shield size={12} className="text-amber-400" />)}
                {renderPersonnelTable('Funktionsteam', categorizedPersonnel.staff, <User size={12} className="text-amber-400" />)}
                {renderPersonnelTable('Ärztliche Abteilung', categorizedPersonnel.medical, <Activity size={12} className="text-red-400" />)}
              </tbody>
              <tfoot className="sticky bottom-0 bg-slate-950 font-black z-20 border-t-2 border-slate-800 text-white">
                <tr>
                  <td colSpan={3} className="px-2 py-2 text-right uppercase tracking-widest text-[10px] text-amber-400">Gesamt</td>
                  <td className="px-2 py-2 text-right text-red-400">{formatCurrency(Gesamt_Abloese_Zugang)}</td>
                  <td className="px-2 py-2 text-right text-emerald-400">{formatCurrency(Gesamt_Abloese_Abgang)}</td>
                  <td className="px-2 py-2 text-right text-white">{formatCurrency(Gesamt_Grundgehalt_monat)}</td>
                  <td className="px-2 py-2 text-right text-white">{formatCurrency(Gesamt_Boni_monat)}</td>
                  <td className="px-2 py-2 text-center text-amber-300">-</td>
                  <td className="px-2 py-2 text-right text-white">{formatCurrency(Gesamt_Nebenvereinbarung_jahr)}</td>
                  <td className="px-2 py-2 text-right text-blue-400">{formatCurrency(Gesamt_IST)}</td>
                  <td className="px-2 py-2 text-right bg-slate-900 text-amber-400">{formatCurrency(Gesamtkosten_Spieler_Monat)}</td>
                  <td className="px-2 py-2 text-right bg-slate-900 text-amber-400">{formatCurrency(Gesamtkosten_Spieler_Jahr)}</td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right: Point Bonus Calculator & Summaries */}
        <div className="w-64 space-y-2 shrink-0 flex flex-col">
          <section className="bg-slate-900 border border-slate-800 p-3 rounded">
            <h4 className="font-black uppercase text-[9px] tracking-widest flex items-center gap-2 mb-3 text-amber-400">
              <Target size={12} className="text-amber-400" /> Punktprämien
            </h4>
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Siege</label>
                  <input 
                    type="number"
                    className={`w-full bg-slate-950 border border-slate-700 p-1 font-black text-sm focus:outline-none text-center text-white focus:border-amber-400 rounded ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={financeMeta.wins}
                    onChange={(e) => setFinanceMeta({ ...financeMeta, wins: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Remis</label>
                  <input 
                    type="number"
                    className={`w-full bg-slate-950 border border-slate-700 p-1 font-black text-sm focus:outline-none text-center text-white focus:border-amber-400 rounded ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    value={financeMeta.draws}
                    onChange={(e) => setFinanceMeta({ ...financeMeta, draws: parseInt(e.target.value) || 0 })}
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <div>
                <label className="text-[7px] font-black uppercase text-slate-400 block mb-0.5">Prämie / Pkt (€)</label>
                <input 
                  type="number"
                  className={`w-full bg-slate-950 border border-slate-700 p-1 font-black text-sm focus:outline-none text-center text-white focus:border-amber-400 rounded ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  value={financeMeta.bonusPerPoint || 0}
                  onChange={(e) => setFinanceMeta({ ...financeMeta, bonusPerPoint: parseInt(e.target.value) || 0 })}
                  disabled={!isEditing}
                />
              </div>
              
              <div className="pt-2 border-t border-slate-800 mt-2">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] font-black uppercase text-slate-400">Punkte</span>
                  <span className="text-sm font-black text-white">{gesamtpunkte}</span>
                </div>
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[8px] font-black uppercase text-slate-400">Auszahlung / Spieler</span>
                  <span className="text-sm font-black text-amber-400">{formatCurrency(auszahlung)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-950 p-1.5 mt-1 border border-slate-800 rounded">
                  <span className="text-[8px] font-black uppercase text-slate-300">Gesamt Team</span>
                  <span className="text-base font-black text-amber-400">{formatCurrency(totalPointBonuses)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-slate-900 text-white border border-slate-800 p-3 flex-1 overflow-auto custom-scrollbar rounded">
            <h4 className="font-black uppercase text-[9px] tracking-widest flex items-center gap-2 mb-3 text-amber-400">
              <AlertCircle size={12} className="text-amber-400" /> Analyse
            </h4>
            
            <div className="space-y-3">
              <div>
                <h5 className="text-[8px] font-bold uppercase text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Monatliche Fixkosten</h5>
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-300">Kader Grund</span>
                  <span className="text-white">{formatCurrency(Gesamt_Grundgehalt_monat)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-400">Boni / Extras</span>
                  <span className="text-slate-300">{formatCurrency(Gesamt_Boni_monat)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black text-blue-400">
                  <span>IST Aktuell</span>
                  <span>{formatCurrency(Gesamt_IST)}</span>
                </div>
              </div>

              <div>
                <h5 className="text-[8px] font-bold uppercase text-slate-400 mb-1 border-b border-slate-800 pb-0.5">Jahresprojektion</h5>
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-300">Kader Gesamt</span>
                  <span className="text-white">{formatCurrency(Gesamtkosten_Spieler_Jahr)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-400">Boni / Extras</span>
                  <span className="text-slate-300">{playersWithCosts.reduce((sum, p) => sum + (p.bonusPerMatch * p.months), 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black">
                  <span className="text-slate-400">Nebenvereinb.</span>
                  <span className="text-slate-300">{formatCurrency(Gesamt_Nebenvereinbarung_jahr)}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <h5 className="text-[8px] font-bold uppercase mb-1 border-b border-slate-800 pb-0.5 text-amber-400">Transfer-Bilanz</h5>
                <div className="flex justify-between text-[11px] font-black text-red-400">
                  <span>Ablöse Zugänge</span>
                  <span>{formatCurrency(Gesamt_Abloese_Zugang)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-black text-emerald-400">
                  <span>Ablöse Abgänge</span>
                  <span>{formatCurrency(Gesamt_Abloese_Abgang)}</span>
                </div>
                <div className={`flex justify-between text-[13px] font-black mt-1 p-1.5 border border-slate-800 rounded bg-slate-950 ${Abloese_Saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  <span>Saldo</span>
                  <span>{formatCurrency(Abloese_Saldo)}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
