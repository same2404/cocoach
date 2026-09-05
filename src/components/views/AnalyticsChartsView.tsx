import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Activity, Target, BarChart3, Users, Zap } from 'lucide-react';
import { Player } from '../../types';

interface Props {
  player: Player;
  allPlayers: Player[];
}

const GRID_COLOR = '#1f2937';
const COLORS = ['#e94560', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899', '#F97316'];

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  fontSize: '10px',
  fontWeight: 'bold' as const,
  color: '#F8FAFC',
};

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; color?: string }> = ({ title, icon, children, color = '#e94560' }) => (
  <div className="bg-[#111827] border border-[#1f2937] rounded-2xl p-4">
    <div className="flex items-center gap-2 mb-3">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>{title}</span>
    </div>
    {children}
  </div>
);

const EmptyChart: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex items-center justify-center h-48 text-[11px] text-slate-500">{text}</div>
);

// ════════════════════════════════════════════════════════════════
// CHART 1: Kader-Zusammensetzung nach Position
// ════════════════════════════════════════════════════════════════
function PositionDistributionChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    const posMap: Record<string, number> = {};
    allPlayers.filter(p => p.category === 'player').forEach(p => {
      const pos = (p.position || 'Unbekannt').split('/')[0].trim();
      posMap[pos] = (posMap[pos] || 0) + 1;
    });
    return Object.entries(posMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [allPlayers]);

  if (data.length === 0) return <EmptyChart text="Keine Spieler vorhanden" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// CHART 2: Altersverteilung
// ════════════════════════════════════════════════════════════════
function AgeDistributionChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    const ageGroups: Record<string, number> = { 'U18': 0, '18-21': 0, '22-25': 0, '26-29': 0, '30+': 0 };
    allPlayers.filter(p => p.category === 'player' && p.age).forEach(p => {
      const age = p.age!;
      if (age < 18) ageGroups['U18']++;
      else if (age <= 21) ageGroups['18-21']++;
      else if (age <= 25) ageGroups['22-25']++;
      else if (age <= 29) ageGroups['26-29']++;
      else ageGroups['30+']++;
    });
    return Object.entries(ageGroups).map(([name, count]) => ({ name, count }));
  }, [allPlayers]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Spieler" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// CHART 3: Einsatzzeiten (Spielminuten)
// ════════════════════════════════════════════════════════════════
function PlayingTimeChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    return allPlayers
      .filter(p => p.category === 'player' && (p.einsatzzeitenGesamt || 0) > 0)
      .map(p => ({
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unbekannt',
        minuten: p.einsatzzeitenGesamt || 0,
        tore: p.tore || 0,
      }))
      .sort((a, b) => b.minuten - a.minuten)
      .slice(0, 15);
  }, [allPlayers]);

  if (data.length === 0) return <EmptyChart text="Keine Einsatzzeiten vorhanden — Spieler müssen im Kader erfasst sein" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9, fill: '#94A3B8' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
        <Bar dataKey="minuten" name="Spielminuten" fill="#e94560" radius={[0, 4, 4, 0]} />
        <Bar dataKey="tore" name="Tore" fill="#10B981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// CHART 4: Verletzungs-Status
// ════════════════════════════════════════════════════════════════
function InjuryStatusChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    const injured = allPlayers.filter(p => p.category === 'player' && p.isInjured).length;
    const fit = allPlayers.filter(p => p.category === 'player' && !p.isInjured).length;
    return [
      { name: 'Fit', value: fit, color: '#10B981' },
      { name: 'Verletzt', value: injured, color: '#EF4444' },
    ].filter(d => d.value > 0);
  }, [allPlayers]);

  if (data.every(d => d.value === 0)) return <EmptyChart text="Keine Spieler vorhanden" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={5} dataKey="value">
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// CHART 5: Kader-Übersicht ( Balkendiagramm )
// ════════════════════════════════════════════════════════════════
function SquadOverviewChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    const cats: Record<string, number> = { Spieler: 0, Trainer: 0, Staff: 0, Medizin: 0 };
    allPlayers.forEach(p => {
      if (p.category === 'player') cats.Spieler++;
      else if (p.category === 'coach') cats.Trainer++;
      else if (p.category === 'staff') cats.Staff++;
      else if (p.category === 'medical') cats.Medizin++;
    });
    return Object.entries(cats).filter(([, v]) => v > 0).map(([name, count]) => ({ name, count }));
  }, [allPlayers]);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="count" name="Anzahl" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// CHART 6: Load-Ampel Verteilung
// ════════════════════════════════════════════════════════════════
function LoadAmpelChart({ allPlayers }: { allPlayers: Player[] }) {
  const data = useMemo(() => {
    const ampel: Record<string, number> = { Grün: 0, Gelb: 0, Rot: 0, Keine: 0 };
    allPlayers.filter(p => p.category === 'player').forEach(p => {
      const la = p.loadAmpel || 'Keine';
      ampel[la] = (ampel[la] || 0) + 1;
    });
    return [
      { name: 'Grün', value: ampel['Grün'], color: '#10B981' },
      { name: 'Gelb', value: ampel['Gelb'], color: '#F59E0B' },
      { name: 'Rot', value: ampel['Rot'], color: '#EF4444' },
    ].filter(d => d.value > 0);
  }, [allPlayers]);

  if (data.length === 0) return <EmptyChart text="Keine Load-Ampel-Daten vorhanden" />;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
          {data.map((d, i) => <Cell key={i} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: '10px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════════════════════════
export default function AnalyticsChartsView({ player, allPlayers }: Props) {
  const [activeChart, setActiveChart] = useState<'all' | 'team' | 'development' | 'training' | 'match'>('all');

  const charts = [
    { key: 'team' as const, label: 'Kader', icon: <Users size={12} /> },
    { key: 'development' as const, label: 'Alter', icon: <TrendingUp size={12} /> },
    { key: 'training' as const, label: 'Einsatz', icon: <Activity size={12} /> },
    { key: 'match' as const, label: 'Status', icon: <Target size={12} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] p-4 lg:p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#e94560] to-[#c23152] flex items-center justify-center">
          <BarChart3 size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">Analytics Charts</h1>
          <p className="text-[9px] text-slate-500">Kader-Daten, Alter, Einsatzzeiten, Verletzungen</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setActiveChart('all')} className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all ${activeChart === 'all' ? 'bg-[#e94560] text-white border-[#e94560]' : 'bg-[#111827] text-slate-400 border-[#1f2937] hover:text-white'}`}>
          <BarChart3 size={11} className="inline mr-1" /> Alle Charts
        </button>
        {charts.map(c => (
          <button key={c.key} onClick={() => setActiveChart(c.key)} className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg border transition-all flex items-center gap-1 ${activeChart === c.key ? 'bg-[#e94560] text-white border-[#e94560]' : 'bg-[#111827] text-slate-400 border-[#1f2937] hover:text-white'}`}>
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className={`grid gap-4 ${activeChart === 'all' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        {(activeChart === 'all' || activeChart === 'team') && (
          <Card title="Kader-Zusammensetnung" icon={<Users size={14} />} color="#e94560">
            <PositionDistributionChart allPlayers={allPlayers} />
          </Card>
        )}
        {(activeChart === 'all' || activeChart === 'development') && (
          <Card title="Altersverteilung" icon={<TrendingUp size={14} />} color="#F59E0B">
            <AgeDistributionChart allPlayers={allPlayers} />
          </Card>
        )}
        {(activeChart === 'all' || activeChart === 'training') && (
          <Card title="Spielminuten & Tore" icon={<Activity size={14} />} color="#10B981">
            <PlayingTimeChart allPlayers={allPlayers} />
          </Card>
        )}
        {(activeChart === 'all' || activeChart === 'match') && (
          <Card title="Verletzungs-Status" icon={<Target size={14} />} color="#3B82F6">
            <InjuryStatusChart allPlayers={allPlayers} />
          </Card>
        )}
        {(activeChart === 'all') && (
          <Card title="Mannschaftsstruktur" icon={<Users size={14} />} color="#8B5CF6">
            <SquadOverviewChart allPlayers={allPlayers} />
          </Card>
        )}
        {(activeChart === 'all') && (
          <Card title="Load-Ampel" icon={<Zap size={14} />} color="#06B6D4">
            <LoadAmpelChart allPlayers={allPlayers} />
          </Card>
        )}
      </div>
    </div>
  );
}
