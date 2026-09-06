import React, { useMemo } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Area, AreaChart,
  Treemap, Cell
} from 'recharts';
import { Player } from '../../types';

export interface ReportInsights {
  proReport?: string;
  training?: string;
  datenblatt?: string;
  benchmarks?: string;
  wgTracker?: string;
  trackerUpload?: string;
  trackerVergleich?: string;
  trackerAnalyse?: string;
  spielanalyse?: string;
  videoClips?: string;
  crossTab?: string;
  analytics?: string;
}

interface PanelProps {
  player: Player;
  insights: ReportInsights;
  perf?: any;
  tactical?: any;
  timeline?: any[];
  heatmap?: any[];
}

/* ── Neon Design System ───────────────────────────────────────────── */
const neon = {
  panel: 'relative rounded-xl border bg-[#0b1120] overflow-hidden',
  title: 'text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300',
  sub: 'text-[8px] font-bold text-slate-500',
  insight: 'text-[10px] text-slate-300 leading-relaxed pt-2 border-t border-slate-800 mt-2',
};

/* Motion keyframes for the 12 diagrams — injected once. */
const PRO_MOTION_CSS = `
@keyframes proFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes proGlow { 0%,100%{box-shadow:0 0 12px rgba(56,189,248,.18)} 50%{box-shadow:0 0 26px rgba(56,189,248,.42)} }
@keyframes proScan { 0%{transform:translateX(-120%)} 100%{transform:translateX(260%)} }
@keyframes proPulse { 0%,100%{opacity:.35} 50%{opacity:.95} }
@keyframes proSwing { 0%,100%{transform:rotate(var(--s0,0deg))} 50%{transform:rotate(var(--s1,2deg))} }
@keyframes proDash { to { stroke-dashoffset: -24; } }
@keyframes proBeep { 0%,100%{transform:scale(1);opacity:.9} 50%{transform:scale(1.45);opacity:.3} }
`;

let injected = false;
function ensureProMotionStyle() {
  if (injected) return;
  injected = true;
  if (typeof document === 'undefined') return;
  const id = 'pro-report-motion';
  if (document.getElementById(id)) return;
  const st = document.createElement('style');
  st.id = id;
  st.textContent = PRO_MOTION_CSS;
  document.head.appendChild(st);
}

function NeonInsight({ value, label }: { value?: string; label: string }) {
  if (!value) return null;
  return (
    <div className={neon.insight}>
      <span className="text-[7px] font-black uppercase tracking-widest text-slate-500 block mb-0.5">{label}</span>
      <p className="text-[9px]">{value}</p>
    </div>
  );
}

function PanelShell({ title, sub, children, accent = '#38bdf8' }: { title: string; sub: string; children: React.ReactNode; accent?: string }) {
  ensureProMotionStyle();
  return (
    <div className={neon.panel} style={{ borderColor: accent + '55', animation: `proFloat 6s ease-in-out infinite, proGlow 4s ease-in-out infinite` }}>
      {/* scanning light sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10" style={{ mixBlendMode: 'screen' }}>
        <div className="absolute inset-y-0 w-1/3 opacity-40" style={{ background: 'linear-gradient(100deg, transparent, rgba(125,211,252,0.10), transparent)', animation: 'proScan 7s linear infinite' }} />
      </div>
      <div className="absolute top-2 right-3 text-[16px] leading-none select-none" style={{ color: accent + '33', animation: 'proPulse 2.4s ease-in-out infinite' }}>◈</div>
      <div className="px-3 pt-3 pb-2 relative z-0">
        <div className={neon.title} style={{ textShadow: `0 0 8px ${accent}` }}>{title}</div>
        <div className={neon.sub}>{sub}</div>
      </div>
      <div className="px-3 pb-3 relative z-0">{children}</div>
    </div>
  );
}

/* ── 1. TECHNIK — Neo-Radar-Chart (6 Achsen) ─────────────────────── */
export function PanelTechik({ player, insights }: PanelProps) {
  const data = useMemo(() => [
    { metric: 'Ballkontrolle', spieler: 82, team: 68 },
    { metric: 'Passqualität', spieler: 88, team: 72 },
    { metric: 'Dribbling', spieler: 75, team: 64 },
    { metric: 'Abschluss', spieler: 70, team: 60 },
    { metric: 'Erstkontakt', spieler: 85, team: 70 },
    { metric: 'Spielübersicht', spieler: 78, team: 66 },
  ], []);
  return (
    <PanelShell title="1. Technik" sub="Neo-Radar · 6 Achsen" accent="#38bdf8">
      <div className="h-44 print:h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="#1e3a5f" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#7dd3fc', fontSize: 7 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Team" dataKey="team" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.15} strokeWidth={1.5} />
            <Radar name="Spieler" dataKey="spieler" stroke="#4ade80" fill="#4ade80" fillOpacity={0.45} strokeWidth={2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <NeonInsight value={insights?.proReport} label="Technik-Analyse" />
    </PanelShell>
  );
}

/* ── 2. PHYSIS — Vertical Power Bars ─────────────────────────────── */
export function PanelPhysis({ player, insights }: PanelProps) {
  const data = useMemo(() => [
    { name: 'Sprint', value: 88, max: 100, color: '#38bdf8' },
    { name: 'Ausdauer', value: 74, max: 100, color: '#22d3ee' },
    { name: 'Geschw.', value: 82, max: 100, color: '#34d399' },
    { name: 'Sprungkraft', value: 65, max: 100, color: '#a78bfa' },
    { name: 'Kraft', value: 71, max: 100, color: '#fb7185' },
    { name: 'Bewegl.', value: 77, max: 100, color: '#facc15' },
  ], []);
  return (
    <PanelShell title="2. Physis" sub="Vertical Power Bars" accent="#22d3ee">
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke="#16233f" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 7 }} axisLine={{ stroke: '#1e3a5f' }} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 7.5 }} width={52} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1e3a5f', fontSize: 9 }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={10}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.75} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <NeonInsight value={insights?.datenblatt} label="Physis-Werte" />
    </PanelShell>
  );
}

/* ── 3. TAKTIK — Tactical Decision Tree ──────────────────────────── */
export function PanelTaktik({ player, insights }: PanelProps) {
  const steps = [
    { label: 'Balleroberung', sub: 'Gegenpressing', color: '#38bdf8' },
    { label: 'Positionsspiel', sub: 'Aufbau', color: '#22d3ee' },
    { label: 'Umschalten', sub: 'Schneller Wechsel', color: '#34d399' },
    { label: 'Pressing', sub: 'Hohe Linie', color: '#a78bfa' },
  ];
  return (
    <PanelShell title="3. Taktik" sub="Decision Tree · Entscheidungsbaum" accent="#a78bfa">
      <div className="flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black shrink-0" style={{ background: s.color + '22', border: `1px solid ${s.color}55`, color: s.color }}>
              {i + 1}
            </div>
            <div className="flex-1 rounded-md border px-2 py-1.5" style={{ borderColor: s.color + '44', background: s.color + '0a' }}>
              <div className="text-[8px] font-black" style={{ color: s.color }}>{s.label}</div>
              <div className="text-[7px] text-slate-500">{s.sub}</div>
            </div>
            {i < steps.length - 1 && (
              <svg width="10" height="12" viewBox="0 0 10 12" className="shrink-0 opacity-40">
                <path d="M5 0 L5 9 M2 6 L5 9 L8 6" stroke={s.color} strokeWidth="1.5" fill="none" />
              </svg>
            )}
          </div>
        ))}
      </div>
      <NeonInsight value={insights?.videoClips} label="Taktische Muster" />
    </PanelShell>
  );
}

/* ── 4. MENTALITÄT — Mental Strength Gauge ──────────────────────── */
export function PanelMental({ player, insights }: PanelProps) {
  const metrics = useMemo(() => [
    { label: 'Fokus', value: 82, color: '#34d399' },
    { label: 'Aggressiv.', value: 71, color: '#facc15' },
    { label: 'Druckresist.', value: 68, color: '#fb7185' },
    { label: 'Kommunik.', value: 75, color: '#38bdf8' },
    { label: 'Entscheid.', value: 79, color: '#a78bfa' },
  ], []);
  const avg = Math.round(metrics.reduce((s, m) => s + m.value, 0) / metrics.length);
  const angle = -90 + (avg / 100) * 180;
  const avgColor = avg >= 75 ? '#34d399' : avg >= 50 ? '#facc15' : '#fb7185';
  return (
    <PanelShell title="4. Mentalität" sub="Mental Strength Gauge" accent="#34d399">
      <div className="flex flex-col items-center">
        <div className="relative w-36 h-16 overflow-hidden">
          <svg viewBox="0 0 120 60" className="w-full h-full">
            <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#1e3a5f" strokeWidth="8" strokeLinecap="round" />
            <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke={avgColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(avg / 100) * 157} 157`} style={{ filter: `drop-shadow(0 0 6px ${avgColor})` }} />
            <line x1="60" y1="55" x2="60" y2="15" stroke="#fff" strokeWidth="1.5"
              transform={`rotate(${angle} 60 55)`} style={{ transformOrigin: '60px 55px', filter: 'drop-shadow(0 0 3px #fff)', animation: 'proSwing 3.2s ease-in-out infinite', ['--s0' as any]: `${angle - 2}deg`, ['--s1' as any]: `${angle + 2}deg` }} />
            <circle cx="60" cy="55" r="3" fill="#fff" style={{ filter: 'drop-shadow(0 0 4px #fff)', animation: 'proBeep 2s ease-in-out infinite' }} />
          </svg>
        </div>
        <div className="text-center -mt-1">
          <span className="text-[16px] font-black" style={{ color: avgColor }}>{avg}</span>
          <span className="text-[8px] text-slate-500 ml-1">/ 100</span>
        </div>
        <div className="flex gap-2 mt-1 flex-wrap justify-center">
          {metrics.map((m, i) => (
            <div key={i} className="text-center">
              <div className="text-[7px] font-bold" style={{ color: m.color }}>{m.value}</div>
              <div className="text-[6px] text-slate-500">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
      <NeonInsight value={insights?.analytics} label="Mentalprofil" />
    </PanelShell>
  );
}

/* ── 5. DEFENSIVE — Zone Heat Blocks ─────────────────────────────── */
export function PanelDefensive({ player, heatmap, insights }: PanelProps) {
  const zones = [
    { name: 'Defensiv-Drittel', pct: 42, color: '#ef4444' },
    { name: 'Mittelfeld-Zone', pct: 31, color: '#facc15' },
    { name: 'Pressing-Zone', pct: 18, color: '#22d3ee' },
    { name: 'Übergang', pct: 9, color: '#a78bfa' },
  ];
  return (
    <PanelShell title="5. Defensive" sub="Zone Heat Blocks" accent="#ef4444">
      <div className="relative bg-gradient-to-b from-[#052e16] to-[#031a0c] rounded-lg overflow-hidden border border-green-900" style={{ aspectRatio: '105/68' }}>
        <svg viewBox="0 0 105 68" className="absolute inset-0 w-full h-full">
          <rect x="0" y="0" width="105" height="68" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
          <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
          <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
          <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
          <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
          <rect x="0" y="0" width="35" height="68" fill="#ef4444" fillOpacity="0.12" rx="2" />
          <rect x="35" y="0" width="35" height="68" fill="#facc15" fillOpacity="0.08" rx="2" />
          <rect x="70" y="0" width="35" height="68" fill="#22d3ee" fillOpacity="0.06" rx="2" />
          {(heatmap || []).map((z: any, i: number) => {
            const intensity = Math.min(1, z.intensity);
            const color = intensity > 0.7 ? '#ef4444' : intensity > 0.45 ? '#facc15' : '#4ade80';
            return <circle key={i} cx={z.x} cy={z.y} r={3 + z.intensity * 4} fill={color} fillOpacity={intensity * 0.5} stroke={color} strokeOpacity={0.6} strokeWidth="0.3" />;
          })}
        </svg>
      </div>
      <div className="flex gap-2 mt-2 flex-wrap">
        {zones.map((z, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm" style={{ background: z.color }} />
            <span className="text-[7px] text-slate-400">{z.name} <span className="font-black" style={{ color: z.color }}>{z.pct}%</span></span>
          </div>
        ))}
      </div>
      <NeonInsight value={insights?.spielanalyse} label="Defensivzonen" />
    </PanelShell>
  );
}

/* ── 6. OFFENSIVE — Chance Flow Diagram ──────────────────────────── */
export function PanelOffensive({ player, insights }: PanelProps) {
  const flows = [
    { from: 'Ballbesitz', to: 'Halbfeld', val: 85, color: '#38bdf8' },
    { from: 'Halbfeld', to: 'Finaldrittel', val: 62, color: '#22d3ee' },
    { from: 'Finaldrittel', to: 'Abschluss', val: 38, color: '#34d399' },
    { from: 'Abschluss', to: 'Tor', val: 14, color: '#4ade80' },
  ];
  return (
    <PanelShell title="6. Offensive" sub="Chance Flow · Konversion" accent="#34d399">
      <div className="space-y-1.5">
        {flows.map((f, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-bold text-slate-400">{f.from}</span>
              <span className="text-[7px] font-black" style={{ color: f.color }}>{f.val}%</span>
            </div>
            <div className="h-3 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
              <div className="h-full rounded-sm transition-all" style={{ width: `${f.val}%`, background: `linear-gradient(90deg, ${f.color}44, ${f.color})`, boxShadow: `0 0 8px ${f.color}44` }} />
            </div>
            {i < flows.length - 1 && (
              <div className="flex justify-center my-0.5">
                <svg width="8" height="8" viewBox="0 0 8 8" className="opacity-40">
                  <path d="M4 0 L4 6 M2 4 L4 6 L6 4" stroke={f.color} strokeWidth="1.2" fill="none" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
      <NeonInsight value={insights?.trackerUpload} label="Offensivfluss" />
    </PanelShell>
  );
}

/* ── 7. SPIELANALYSE — 3D-Pitch Heatmap ──────────────────────────── */
export function PanelSpielanalyse({ player, heatmap, insights }: PanelProps) {
  const zones = heatmap || [];
  return (
    <PanelShell title="7. Spielanalyse" sub="3D-Pitch Heatmap" accent="#fb923c">
      <div className="relative" style={{ perspective: '400px' }}>
        <div className="relative bg-gradient-to-b from-[#052e16] to-[#031a0c] rounded-lg overflow-hidden border border-green-900" style={{ aspectRatio: '105/68', transform: 'rotateX(12deg)', transformOrigin: 'center bottom' }}>
          <svg viewBox="0 0 105 68" className="absolute inset-0 w-full h-full">
            <rect x="0" y="0" width="105" height="68" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
            <line x1="52.5" y1="0" x2="52.5" y2="68" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
            <circle cx="52.5" cy="34" r="9.15" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
            <rect x="0" y="13.85" width="16.5" height="40.3" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
            <rect x="88.5" y="13.85" width="16.5" height="40.3" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.35" />
            {zones.map((z: any, i: number) => {
              const intensity = Math.min(1, z.intensity);
              const r = 5 + intensity * 6;
              const color = intensity > 0.7 ? '#ef4444' : intensity > 0.45 ? '#facc15' : '#4ade80';
              return (
                <React.Fragment key={i}>
                  <circle cx={z.x} cy={z.y} r={r} fill={color} fillOpacity={intensity * 0.35} stroke={color} strokeOpacity={0.5} strokeWidth="0.4" />
                  <circle cx={z.x} cy={z.y} r={r * 0.4} fill={color} fillOpacity={intensity * 0.7} />
                </React.Fragment>
              );
            })}
          </svg>
        </div>
      </div>
      <NeonInsight value={insights?.crossTab} label="Spielanalyse" />
    </PanelShell>
  );
}

/* ── 8. TRACKER-ANALYSE — Impact Time Series ─────────────────────── */
export function PanelTracker({ player, insights }: PanelProps) {
  const data = useMemo(() =>
    ['0\'', '15\'', '30\'', '45\'', '60\'', '75\'', '90\''].map((m, i) => ({
      minute: m,
      speed: 28 - i * 0.8 + Math.round(Math.random() * 4),
      hr: 155 + i * 3 + Math.round(Math.random() * 8),
      accel: 3.5 - i * 0.15 + Math.round(Math.random() * 0.8 * 10) / 10,
    })), []);
  return (
    <PanelShell title="8. Tracker-Analyse" sub="Impact Time Series" accent="#fb7185">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <CartesianGrid stroke="#16233f" vertical={false} />
            <XAxis dataKey="minute" tick={{ fill: '#64748b', fontSize: 7 }} axisLine={{ stroke: '#1e3a5f' }} />
            <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1e3a5f', fontSize: 9 }} />
            <Line type="monotone" dataKey="speed" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} name="km/h" />
            <Line type="monotone" dataKey="hr" stroke="#fb7185" strokeWidth={2} dot={{ r: 2 }} name="BPM" />
            <Line type="monotone" dataKey="accel" stroke="#34d399" strokeWidth={1.5} dot={{ r: 1.5 }} name="m/s²" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <NeonInsight value={insights?.trackerAnalyse} label="Tracker-Daten" />
    </PanelShell>
  );
}

/* ── 9. HALBZEIT-VERGLEICH — Dual-Line-Chart ─────────────────────── */
export function PanelHalbzeit({ player, insights }: PanelProps) {
  const data = useMemo(() => [
    { metric: 'Ballbesitz', h1: 54, h2: 48 },
    { metric: 'Schüsse', h1: 8, h2: 5 },
    { metric: 'Ecken', h1: 4, h2: 2 },
    { metric: 'Fouls', h1: 6, h2: 9 },
    { metric: 'Zweikämpfe', h1: 42, h2: 38 },
  ], []);
  return (
    <PanelShell title="9. Halbzeit-Vergleich" sub="Dual-Line · H1 vs H2" accent="#facc15">
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
            <CartesianGrid stroke="#16233f" vertical={false} />
            <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 7 }} axisLine={{ stroke: '#1e3a5f' }} />
            <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1e3a5f', fontSize: 9 }} />
            <Line type="monotone" dataKey="h1" stroke="#38bdf8" strokeWidth={2} dot={{ r: 3, fill: '#38bdf8' }} name="1. Halbzeit" />
            <Line type="monotone" dataKey="h2" stroke="#facc15" strokeWidth={2} dot={{ r: 3, fill: '#facc15' }} name="2. Halbzeit" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <NeonInsight value={insights?.wgTracker} label="Halbzeit-Analyse" />
    </PanelShell>
  );
}

/* ── 10. BENCHMARKS — Neon Percentile Bars ───────────────────────── */
export function PanelBenchmarks({ player, insights }: PanelProps) {
  const data = useMemo(() => [
    { name: 'Sprint', pctl: 88, color: '#38bdf8' },
    { name: 'Passen', pctl: 76, color: '#22d3ee' },
    { name: 'Zweikampf', pctl: 62, color: '#34d399' },
    { name: 'Dribbling', pctl: 81, color: '#a78bfa' },
    { name: 'Kopfball', pctl: 45, color: '#fb7185' },
    { name: 'Ausdauer', pctl: 70, color: '#facc15' },
  ], []);
  return (
    <PanelShell title="10. Benchmarks" sub="Percentile Bars · Liga-Vergleich" accent="#a78bfa">
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-bold text-slate-400">{d.name}</span>
              <span className="text-[7px] font-black" style={{ color: d.color }}>P{d.pctl}</span>
            </div>
            <div className="relative h-2.5 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
              <div className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${d.pctl}%`, background: `linear-gradient(90deg, ${d.color}55, ${d.color})`, boxShadow: `0 0 8px ${d.color}44` }} />
              <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: '50%' }} />
              <div className="absolute inset-y-0 w-px bg-white/15" style={{ left: '25%' }} />
              <div className="absolute inset-y-0 w-px bg-white/15" style={{ left: '75%' }} />
            </div>
          </div>
        ))}
      </div>
      <NeonInsight value={insights?.benchmarks} label="Liga-Benchmark" />
    </PanelShell>
  );
}

/* ── 11. PASSNETZWERK — Node-Graph ───────────────────────────────── */
export function PanelPassnetzwerk({ player, insights }: PanelProps) {
  const nodes = useMemo(() => [
    { x: 20, y: 45, r: 9, label: 'IV', color: '#38bdf8' },
    { x: 45, y: 60, r: 8, label: 'DM', color: '#22d3ee' },
    { x: 60, y: 35, r: 8, label: 'ZM', color: '#34d399' },
    { x: 75, y: 55, r: 7, label: 'RA', color: '#fb7185' },
    { x: 82, y: 25, r: 8, label: 'ST', color: '#facc15' },
    { x: 40, y: 20, r: 6, label: 'LV', color: '#a78bfa' },
  ], []);
  const edges = useMemo(() => [
    [0, 1, 2, '#facc15'], [1, 2, 2, '#22d3ee'], [2, 3, 1.5, '#fb7185'],
    [1, 4, 2, '#facc15'], [2, 4, 2.5, '#22d3ee'], [3, 4, 1, '#4ade80'],
    [5, 2, 1, '#a78bfa'], [0, 5, 1.5, '#38bdf8'],
  ], []);
  return (
    <PanelShell title="11. Passnetzwerk" sub="Node-Graph · Verbindungen" accent="#22d3ee">
      <div className="relative aspect-[105/60] bg-[#052e16] rounded-lg overflow-hidden border border-green-900">
        <svg viewBox="0 0 105 60" className="absolute inset-0 w-full h-full">
          {edges.map((e, i) => (
            <line key={i} x1={nodes[e[0] as number].x} y1={nodes[e[0] as number].y} x2={nodes[e[1] as number].x} y2={nodes[e[1] as number].y} stroke={e[3] as string} strokeWidth={e[2] as number} opacity={0.7} strokeLinecap="round" />
          ))}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={n.r} fill={n.color} fillOpacity={0.35} stroke={n.color} strokeWidth={1} />
              <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={4.5} fontWeight={800}>{n.label}</text>
            </g>
          ))}
        </svg>
      </div>
      <NeonInsight value={insights?.trackerVergleich} label="Schlüsselverbindungen" />
    </PanelShell>
  );
}

/* ── 12. VIDEO-TIMELINE — Event Pins ─────────────────────────────── */
export function PanelVideo({ player, insights }: PanelProps) {
  const events = useMemo(() => [
    { min: 12, type: 'Tor', label: 'Tor 1:0', color: '#4ade80', y: 18 },
    { min: 23, type: 'Gelb', label: 'Gelbe Karte', color: '#facc15', y: 38 },
    { min: 35, type: 'Chance', label: 'Großchance', color: '#38bdf8', y: 22 },
    { min: 48, type: 'Wechsel', label: 'Einwechslung', color: '#a78bfa', y: 42 },
    { min: 67, type: 'Tor', label: 'Tor 1:1', color: '#fb7185', y: 28 },
    { min: 78, type: 'Rot', label: 'Rote Karte', color: '#ef4444', y: 35 },
    { min: 85, type: 'Elfer', label: 'Elfmeter', color: '#22d3ee', y: 20 },
  ], []);
  return (
    <PanelShell title="12. Video-Timeline" sub="Event Pins · Spielverlauf" accent="#fb7185">
      <div className="relative h-12 mb-2">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-700" />
        {events.map((e, i) => (
          <div key={i} className="absolute" style={{ left: `${(e.min / 90) * 100}%`, top: `${e.y}px` }}>
            <div className="w-2 h-2 rounded-full border border-white/50" style={{ background: e.color, boxShadow: `0 0 6px ${e.color}` }} />
            <div className="text-[6px] font-bold whitespace-nowrap mt-0.5" style={{ color: e.color, transform: 'translateX(-50%)', marginLeft: '4px' }}>
              {e.min}' {e.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-1 flex-wrap mt-2">
        {['Tor', 'Gelb', 'Chance', 'Wechsel', 'Rot', 'Elfer'].map((t, i) => {
          const c = events.find(e => e.type === t)?.color || '#64748b';
          return (
            <span key={i} className="text-[6px] font-bold px-1.5 py-0.5 rounded-sm border" style={{ borderColor: c + '44', color: c, background: c + '11' }}>{t}</span>
          );
        })}
      </div>
      <NeonInsight value={insights?.videoClips} label="Video-Events" />
    </PanelShell>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/* PDF-PARSER-AUSWERTUNG: 12 BEREICHE, JE EIN DIAGRAMM                */
/* Gespeist aus den geparsten Dokumentendaten (parsedDocData)          */
/* ═══════════════════════════════════════════════════════════════════ */
const pct = (v: any, def = 50) => {
  const n = Number(v);
  return isFinite(n) && n > 0 ? Math.max(5, Math.min(100, n)) : def;
};
function parseNum(raw: any, max: number, isTime = false) {
  if (raw == null) return null;
  const m = String(raw).replace(',', '.').match(/(-?\d+(\.\d+)?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (isTime && max === 5 && n > 2.5 && n < 100) {
    // Zeit (s) → in "Score" umrechnen: schneller = besser
    n = Math.max(1, Math.min(5, Math.round((500 - n * 100) / 40)));
  }
  if (!isTime && n > max) n = max;
  return isFinite(n) ? n : null;
}
function positionScore(pos: string | undefined, kind: string) {
  const p = String((pos || '').toUpperCase());
  const table: Record<string, Record<string, number>> = {
    build: { TW: 55, IV: 82, AV: 74, DM: 85, ZM: 80, OM: 75, RA: 68, LA: 68, ST: 60 },
    press: { TW: 40, IV: 70, AV: 72, DM: 78, ZM: 82, OM: 80, RA: 76, LA: 76, ST: 83 },
    counter: { TW: 30, IV: 58, AV: 74, DM: 76, ZM: 78, OM: 84, RA: 88, LA: 88, ST: 90 },
    depth: { TW: 30, IV: 55, AV: 76, DM: 70, ZM: 74, OM: 86, RA: 86, LA: 86, ST: 90 },
  };
  const row = table[kind] || {};
  for (const key of Object.keys(row)) {
    if (p.includes(key)) return row[key];
  }
  return 70;
}
function sprintPct(maxSpeed: number, sprints: number) {
  const speedScore = maxSpeed >= 30 ? 95 : maxSpeed >= 28 ? 88 : maxSpeed >= 26 ? 80 : maxSpeed >= 24 ? 70 : 58;
  const countScore = sprints >= 25 ? 90 : sprints >= 18 ? 78 : sprints >= 10 ? 65 : 50;
  return Math.round((speedScore + countScore) / 2);
}
function distPct(distKm: number) {
  return distKm >= 12 ? 92 : distKm >= 11 ? 84 : distKm >= 10 ? 74 : distKm >= 9 ? 62 : 48;
}
function hrPct(hr: number) {
  return hr >= 168 ? 90 : hr >= 156 ? 78 : hr >= 145 ? 65 : 52;
}
function jumpScore(raw: any) {
  const n = parseNum(raw, 60);
  if (n == null) return 58;
  return n >= 50 ? 88 : n >= 45 ? 78 : n >= 40 ? 66 : 52;
}

function PdfShell({ title, sub, children, accent }: { title: string; sub: string; children: React.ReactNode; accent: string }) {
  return (
    <div className="relative rounded-xl border bg-[#0b1120] overflow-hidden" style={{ borderColor: accent + '55', boxShadow: `0 0 14px ${accent}22` }}>
      <div className="px-3 pt-2 pb-1">
        <div className="text-[8px] font-black uppercase tracking-[0.15em] text-cyan-300">{title}</div>
        <div className="text-[7px] font-bold text-slate-500">{sub}</div>
      </div>
      <div className="px-2 pb-2">{children}</div>
    </div>
  );
}

export function PdfParsedCharts({ data, player, kpis }: { data: any; player?: any; kpis?: any }) {
  const ta = player?.trackerAnalysis || {};

  const radar = useMemo(() => [
    { metric: 'Ballkontrolle', value: pct(data?.ballControlPercent) || 80 },
    { metric: 'Passqualität', value: pct(data?.passAccuracy) || 78 },
    { metric: 'Dribbling', value: pct(data?.dribbleRating) || 72 },
    { metric: 'Abschluss', value: pct(data?.shootingAccuracy) || 69 },
    { metric: 'Zweikämpfe', value: pct(data?.tackleRate) || 74 },
    { metric: 'Erstkontakt', value: pct(data?.firstTouchRating) || 76 },
  ], [data]);

  const physis = useMemo(() => [
    { name: '10m Sprint', value: kpis?.kpi10m ? parseNum(kpis.kpi10m, 5, true) : null, max: 5, unit: 's', norm: true },
    { name: '30m Sprint', value: kpis?.kpi30m ? parseNum(kpis.kpi30m, 5, true) : null, max: 5, unit: 's', norm: true },
    { name: 'Yo-Yo Test', value: kpis?.kpiYoyo ? parseNum(kpis.kpiYoyo, 3000) : null, max: 3000, unit: 'm', norm: false },
    { name: 'Sprungkraft', value: kpis?.kpiJump ? parseNum(kpis.kpiJump, 60) : null, max: 60, unit: 'cm', norm: false },
    { name: 'High Speed', value: ta?.highSpeedDistanceM || ta?.highSpeedDistanceMeters ? Number(ta?.highSpeedDistanceM || ta?.highSpeedDistanceMeters || 0) : null, max: 1000, unit: 'm', norm: false },
  ], [kpis, ta]);

  const taktik = useMemo(() => [
    { label: 'Aufbau', v: pct(data?.buildUpScore) || pct(positionScore(player?.position, 'build')), c: '#38bdf8' },
    { label: 'Press.', v: pct(data?.pressingScore) || pct(positionScore(player?.position, 'press')), c: '#a78bfa' },
    { label: 'Umschalt.', v: pct(data?.counterScore) || pct(positionScore(player?.position, 'counter')), c: '#34d399' },
    { label: 'Tiefe', v: pct(data?.depthScore) || pct(positionScore(player?.position, 'depth')), c: '#facc15' },
  ], [data, player]);

  const mental = useMemo(() => pct(data?.mentalScore) || 78, [data]);
  const mentalAngle = -90 + (mental / 100) * 180;
  const mentalColor = mental >= 75 ? '#34d399' : mental >= 50 ? '#facc15' : '#fb7185';

  const trackDist = data?.trackerTotalDist ? Number(data.trackerTotalDist) : Number(ta?.totalDistanceKm) || 0;
  const trackMax = data?.trackerMaxSpeed ? Number(data.trackerMaxSpeed) : Number(ta?.maxSpeedKmh) || 0;
  const trackSprints = data?.trackerSprints ? Number(data.trackerSprints) : Number(ta?.sprintCount) || 0;
  const trackHR = data?.trackerAvgHr ? Number(data.trackerAvgHr) : Number(ta?.avgHeartRateBpm) || 0;
  const trackHigh = data?.trackerHighSpeed ? Number(data.trackerHighSpeed) : Number(ta?.highSpeedDistanceM || ta?.highSpeedDistanceMeters) || 0;

  const halfData = useMemo(() => [
    { metric: 'Distanz', h1: pct(data?.possessionH1, 52), h2: pct(data?.possessionH2, 48) },
    { metric: 'Lauf', h1: Math.round(pct(data?.intensityH1, 62)), h2: Math.round(pct(data?.intensityH2, 55)) },
    { metric: 'Sprint', h1: Math.round(pct(data?.sprintPercentile, 70)), h2: Math.round(pct(data?.sprintPercentile2, 58)) },
  ], [data]);

  const benchmarks = useMemo(() => [
    { name: 'Sprint', pctl: ta?.sprintCount ? sprintPct(ta?.maxSpeedKmh || 0, ta?.sprintCount || 0) : (pct(data?.sprintPercentile) || 78), c: '#38bdf8' },
    { name: 'Pass', pctl: pct(data?.passAccuracy) || (pct(data?.passPercentile) || 76), c: '#22d3ee' },
    { name: 'Zweika.', pctl: pct(data?.tackleRate) || (pct(data?.duelPercentile) || 68), c: '#34d399' },
    { name: 'Distanz', pctl: ta?.totalDistanceKm ? distPct(ta?.totalDistanceKm) : (pct(data?.distancePercentile) || 70), c: '#a78bfa' },
    { name: 'HR', pctl: ta?.avgHeartRateBpm ? hrPct(ta?.avgHeartRateBpm) : (pct(data?.hrPercentile) || 62), c: '#fb7185' },
    { name: 'Sprung', pctl: kpis?.kpiJump ? pct(jumpScore(kpis.kpiJump)) : (pct(data?.jumpPercentile) || 58), c: '#facc15' },
  ], [data, ta, kpis]);

  const netzNodes = [
    { x: 25, y: 40, r: 8, label: 'DM', c: '#22d3ee' },
    { x: 60, y: 30, r: 9, label: 'ZM', c: '#34d399' },
    { x: 80, y: 50, r: 7, label: 'RA', c: '#fb7185' },
    { x: 50, y: 55, r: 7, label: 'LV', c: '#a78bfa' },
    { x: 40, y: 25, r: 8, label: 'IV', c: '#38bdf8' },
  ];
  const netzEdges = [[0, 1, 2], [1, 2, 2.5], [2, 3, 1.5], [0, 4, 2], [1, 4, 1.5], [3, 1, 1]];

  const events = [
    { min: 24, label: 'Chance', c: '#38bdf8' },
    { min: 47, label: 'Tor', c: '#4ade80' },
    { min: 63, label: 'Wechsel', c: '#a78bfa' },
    { min: 79, label: 'Gelb', c: '#facc15' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
      {/* 1. Technik — Radar */}
      <PdfShell title="1. Technik" sub="Radar · Ball-Werte" accent="#38bdf8">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radar} outerRadius="62%">
              <PolarGrid stroke="#1e3a5f" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#7dd3fc', fontSize: 6 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.4} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </PdfShell>

      {/* 2. Physis — Horizontal Bars */}
      <PdfShell title="2. Physis" sub="Athletik-KPIs" accent="#22d3ee">
        <div className="space-y-1.5">
          {physis.map((p, i) => p.value != null ? (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-14 text-[6.5px] font-bold text-slate-400 shrink-0">{p.name}</span>
              <div className="flex-1 h-2 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
                <div className="h-full" style={{ width: `${Math.min(100, (p.value / p.max) * 100)}%`, background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }} />
              </div>
              <span className="text-[6.5px] font-black text-cyan-300 w-9 text-right">{p.value}{p.unit}</span>
            </div>
          ) : null)}
          {physis.every(p => p.value == null) && <div className="text-[7px] text-slate-500 text-center py-2">Keine Athletik-Daten</div>}
        </div>
      </PdfShell>

      {/* 3. Taktik — Decision Rail */}
      <PdfShell title="3. Taktik" sub="Spiel-Philosophie" accent="#a78bfa">
        <div className="space-y-1.5">
          {taktik.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-14 text-[6.5px] font-bold text-slate-400 shrink-0">{t.label}</span>
              <div className="flex-1 h-2 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
                <div className="h-full" style={{ width: `${t.v}%`, background: t.c, boxShadow: `0 0 6px ${t.c}` }} />
              </div>
              <span className="text-[6.5px] font-black w-7 text-right" style={{ color: t.c }}>{Math.round(t.v)}%</span>
            </div>
          ))}
        </div>
      </PdfShell>

      {/* 4. Mentalität — Gauge */}
      <PdfShell title="4. Mentalität" sub="Mental-Gauge" accent="#34d399">
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-12 overflow-hidden">
            <svg viewBox="0 0 120 60" className="w-full h-full">
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke="#1e3a5f" strokeWidth="8" strokeLinecap="round" />
              <path d="M 10 55 A 50 50 0 0 1 110 55" fill="none" stroke={mentalColor} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(mental / 100) * 157} 157`} style={{ filter: `drop-shadow(0 0 5px ${mentalColor})` }} />
              <line x1="60" y1="55" x2="60" y2="15" stroke="#fff" strokeWidth="1.5" transform={`rotate(${mentalAngle} 60 55)`} style={{ transformOrigin: '60px 55px' }} />
              <circle cx="60" cy="55" r="3" fill="#fff" />
            </svg>
          </div>
          <span className="text-[13px] font-black -mt-1" style={{ color: mentalColor }}>{Math.round(mental)}</span>
          <span className="text-[6px] text-slate-500 -mt-0.5">/{'100'} · Druckresistenz</span>
        </div>
      </PdfShell>

      {/* 5. Defensive — Pressing-Zonen */}
      <PdfShell title="5. Defensive" sub="Ballarbeit & Pressing" accent="#ef4444">
        <div className="space-y-1.5">
          {[
            { l: 'Workload', v: pct(ta?.workloadIndex) || pct(data?.workloadIndex) || 62, c: '#ef4444' },
            { l: 'High-Speed %', v: trackHigh > 0 ? Math.min(100, (trackHigh / Math.max(trackDist, 0.1)) * 6) : (pct(data?.highSpeedPercent) || 48), c: '#facc15' },
            { l: 'Abfangquote', v: pct(data?.interceptionRate) || 50, c: '#22d3ee' },
          ].map((z, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-16 text-[6.5px] font-bold text-slate-400 shrink-0">{z.l}</span>
              <div className="flex-1 h-2 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
                <div className="h-full" style={{ width: `${z.v}%`, background: z.c, boxShadow: `0 0 6px ${z.c}` }} />
              </div>
              <span className="text-[6.5px] font-black w-8 text-right text-slate-300">{Math.round(z.v)}%</span>
            </div>
          ))}
        </div>
      </PdfShell>

      {/* 6. Offensive — Chance Flow */}
      <PdfShell title="6. Offensive" sub="Tempo & Torgefahr" accent="#34d399">
        <div className="space-y-1.5">
          {[
            { l: 'Max Speed', v: trackMax > 0 ? Math.min(100, (trackMax / 34) * 100) : (pct(data?.possession) || 60), c: '#38bdf8' },
            { l: 'Sprints', v: trackSprints > 0 ? Math.min(100, (trackSprints / 35) * 100) : (pct(data?.dribbleRating) || 55), c: '#22d3ee' },
            { l: 'Passquote', v: pct(data?.passAccuracy) || 74, c: '#34d399' },
            { l: '2. Halbzeit-Tempo', v: pct(data?.intensityH2) || 52, c: '#4ade80' },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-14 text-[6.5px] font-bold text-slate-400 shrink-0">{f.l}</span>
              <div className="flex-1 h-2 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800">
                <div className="h-full" style={{ width: `${f.v}%`, background: `linear-gradient(90deg,#22d3ee44,#34d399)`, boxShadow: '0 0 6px #34d39955' }} />
              </div>
              <span className="text-[6.5px] font-black w-8 text-right text-emerald-300">{Math.round(f.v)}%</span>
            </div>
          ))}
        </div>
      </PdfShell>

      {/* 7. Spielanalyse — Tracker-Distanz (empirisch) */}
      <PdfShell title="7. Spielanalyse" sub="Laufleistung" accent="#fb923c">
        <div className="flex items-center justify-center py-1">
          <div className="text-center">
            <div className="text-[22px] font-black text-orange-300 leading-none">{trackDist > 0 ? trackDist.toFixed(1) : '—'}<span className="text-[8px] text-slate-400 ml-0.5">km</span></div>
            <div className="text-[7px] text-orange-400 font-bold uppercase mt-1">Gesamtdistanz</div>
          </div>
        </div>
        <div className="flex gap-1 justify-center mt-1">
          <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
            <div className="text-[9px] font-black text-cyan-300">{trackMax > 0 ? trackMax.toFixed(0) : '—'}</div>
            <div className="text-[5.5px] text-slate-500">Max km/h</div>
          </div>
          <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
            <div className="text-[9px] font-black text-amber-300">{trackSprints > 0 ? trackSprints : '—'}</div>
            <div className="text-[5.5px] text-slate-500">Sprints</div>
          </div>
          <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
            <div className="text-[9px] font-black text-rose-300">{trackHR > 0 ? trackHR : '—'}</div>
            <div className="text-[5.5px] text-slate-500">Ø HR</div>
          </div>
        </div>
      </PdfShell>

      {/* 8. Tracker-Analyse — High-Speed Zeitreihe */}
      <PdfShell title="8. Tracker-Analyse" sub="Belastungskurve" accent="#fb7185">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[
              { m: '1H', v: pct(data?.intensityH1) || (trackHR ? hrPct(Math.round(trackHR * 0.94)) : 55) },
              { m: '2H', v: pct(data?.intensityH2) || (trackHR ? hrPct(trackHR) : 50) },
              { m: 'Max', v: trackMax > 0 ? Math.min(100, (trackMax / 34) * 100) : 60 },
            ]} margin={{ top: 6, right: 6, bottom: 4, left: 6 }}>
              <CartesianGrid stroke="#16233f" vertical={false} />
              <XAxis dataKey="m" tick={{ fill: '#64748b', fontSize: 7 }} axisLine={{ stroke: '#1e3a5f' }} />
              <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1e3a5f', fontSize: 8 }} />
              <Line type="monotone" dataKey="v" stroke="#fb7185" strokeWidth={2} dot={{ r: 2.5, fill: '#fb7185' }} name="Intensität" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {trackDist > 0 && (
          <div className="mt-1 flex gap-1">
            <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
              <div className="text-[8px] font-black text-cyan-300">{trackDist.toFixed(1)}km</div>
              <div className="text-[5px] text-slate-500">Distanz</div>
            </div>
            <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
              <div className="text-[8px] font-black text-rose-300">{trackHR}bpm</div>
              <div className="text-[5px] text-slate-500">Ø HF</div>
            </div>
            <div className="flex-1 text-center bg-[#0f172a] border border-slate-800 rounded p-1">
              <div className="text-[8px] font-black text-amber-300">{trackHigh > 0 ? Math.round(trackHigh) : '—'}m</div>
              <div className="text-[5px] text-slate-500">HighSpeed</div>
            </div>
          </div>
        )}
      </PdfShell>

      {/* 9. Halbzeit-Vergleich — Dual Line */}
      <PdfShell title="9. Halbzeit-Vgl." sub="H1 vs H2" accent="#facc15">
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={halfData} margin={{ top: 6, right: 6, bottom: 4, left: 6 }}>
              <CartesianGrid stroke="#16233f" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 7 }} axisLine={{ stroke: '#1e3a5f' }} />
              <Tooltip contentStyle={{ background: '#0b1120', border: '1px solid #1e3a5f', fontSize: 8 }} />
              <Line type="monotone" dataKey="h1" stroke="#38bdf8" strokeWidth={1.5} dot={{ r: 2.5, fill: '#38bdf8' }} name="H1" />
              <Line type="monotone" dataKey="h2" stroke="#facc15" strokeWidth={1.5} dot={{ r: 2.5, fill: '#facc15' }} name="H2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PdfShell>

      {/* 10. Benchmarks — Percentile */}
      <PdfShell title="10. Benchmarks" sub="Liga-Perzentil" accent="#a78bfa">
        <div className="space-y-1.5">
          {benchmarks.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="w-12 text-[6.5px] font-bold text-slate-400 shrink-0">{b.name}</span>
              <div className="flex-1 h-2 bg-[#0f172a] rounded-sm overflow-hidden border border-slate-800 relative">
                <div className="h-full" style={{ width: `${b.pctl}%`, background: `linear-gradient(90deg,${b.c}55,${b.c})`, boxShadow: `0 0 6px ${b.c}44` }} />
                <div className="absolute inset-y-0 w-px bg-white/30" style={{ left: '50%' }} />
              </div>
              <span className="text-[6.5px] font-black w-7 text-right" style={{ color: b.c }}>P{b.pctl}</span>
            </div>
          ))}
        </div>
      </PdfShell>

      {/* 11. Passnetzwerk — Node Graph */}
      <PdfShell title="11. Passnetzwerk" sub="Zentral-Verbindungen" accent="#22d3ee">
        <div className="relative aspect-[105/55] bg-[#052e16] rounded-lg overflow-hidden border border-green-900">
          <svg viewBox="0 0 105 55" className="absolute inset-0 w-full h-full">
            {netzEdges.map((e, i) => (
              <line key={i} x1={netzNodes[e[0]].x} y1={netzNodes[e[0]].y} x2={netzNodes[e[1]].x} y2={netzNodes[e[1]].y} stroke="#22d3ee" strokeWidth={e[2]} opacity={0.65} strokeLinecap="round" />
            ))}
            {netzNodes.map((n, i) => (
              <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={n.c} fillOpacity={0.35} stroke={n.c} strokeWidth={1} />
            ))}
            {netzNodes.map((n, i) => (
              <text key={i} x={n.x} y={n.y} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={4.5} fontWeight={800}>{n.label}</text>
            ))}
          </svg>
        </div>
      </PdfShell>

      {/* 12. Video-Timeline — Event Pins */}
      <PdfShell title="12. Video-Timeline" sub="Spielereignisse" accent="#fb7185">
        <div className="relative h-14 mt-1">
          <div className="absolute top-3 left-0 right-0 h-px bg-slate-700" />
          {events.map((e, i) => (
            <div key={i} className="absolute" style={{ left: `${(e.min / 90) * 100}%`, top: 0 }}>
              <div className="w-2 h-2 rounded-full border border-white/50" style={{ background: e.c, boxShadow: `0 0 6px ${e.c}` }} />
              <div className="text-[5.5px] font-bold whitespace-nowrap mt-0.5" style={{ color: e.c }}>{e.min}' {e.label}</div>
            </div>
          ))}
        </div>
      </PdfShell>
    </div>
  );
}

/* ── 12er Raster Container ────────────────────────────────────────── */
export function NeonGrid12({ player, perf, tactical, timeline, heatmap, insights }: PanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      <PanelTechik player={player} insights={insights} />
      <PanelPhysis player={player} insights={insights} />
      <PanelTaktik player={player} insights={insights} />
      <PanelMental player={player} insights={insights} />
      <PanelDefensive player={player} insights={insights} heatmap={heatmap} />
      <PanelOffensive player={player} insights={insights} />
      <PanelSpielanalyse player={player} insights={insights} heatmap={heatmap} />
      <PanelTracker player={player} insights={insights} />
      <PanelHalbzeit player={player} insights={insights} />
      <PanelBenchmarks player={player} insights={insights} />
      <PanelPassnetzwerk player={player} insights={insights} />
      <PanelVideo player={player} insights={insights} />
    </div>
  );
}
