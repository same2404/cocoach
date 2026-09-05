import React, { useState, useCallback, useEffect } from 'react';
import { useClub } from '../contexts/ClubContext';
import { Bot, Loader2, CheckCircle2, AlertCircle, Globe, Search, Building2 } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';

type Phase = 'input' | 'scraping' | 'merging' | 'review' | 'done';
type SourceKind = 'fussball_de' | 'kicker' | 'club_website';
type SourceStatus = 'pending' | 'loading' | 'done' | 'error';
type SectionKey = 'squad' | 'table' | 'matches';

interface SourceItem { id: string; label: string; url: string; kind: SourceKind; status: SourceStatus; }
interface RawPlayer { firstName?: string; lastName?: string; name?: string; position?: string; number?: number; }
interface RawMatch { opponent?: string; homeTeam?: string; awayTeam?: string; date?: string; time?: string; isHome?: boolean; competition?: string; }
interface TableInfo {
  position: number; teamName: string; played: number; won: number;
  drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number;
}
interface ScrapedPayload { squad?: RawPlayer[]; matches?: RawMatch[]; table?: Partial<TableInfo>; league?: string; }
interface MergedData { squad: RawPlayer[]; matches: RawMatch[]; table: TableInfo | null; league?: string; }

export interface NaomiResult {
  clubId: string;
  clubName: string;
  players: any[];
  matches: any[];
  table: TableInfo | null;
  league?: string;
}

interface NaomiAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReady: (data: NaomiResult) => void;
  presetClubId?: string;
  presetClubName?: string;
  presetFussballUrl?: string;
  presetWebsite?: string;
  autoStart?: boolean;
}

const PHASES: { key: Phase; label: string }[] = [
  { key: 'input', label: 'Eingabe' },
  { key: 'scraping', label: 'Scraping' },
  { key: 'merging', label: 'Merge' },
  { key: 'review', label: 'Prüfung' },
  { key: 'done', label: 'Fertig' },
];

const STATUS_LABELS: Record<SourceStatus, string> = {
  pending: 'Wartet', loading: 'Läuft', done: 'Fertig', error: 'Fehler',
};

function splitName(raw: RawPlayer): { firstName: string; lastName: string } {
  const first = raw.firstName?.trim();
  const last = raw.lastName?.trim();
  if (first || last) return { firstName: first || '', lastName: last || '' };
  const parts = (raw.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Unbekannt', lastName: 'Spieler' };
  if (parts.length === 1) return { firstName: '', lastName: parts[0] };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

function normalizeTable(t: Partial<TableInfo>): TableInfo {
  return {
    position: Number(t.position) || 1,
    teamName: t.teamName || 'Unbekannt',
    played: Number(t.played) || 0,
    won: Number(t.won) || 0,
    drawn: Number(t.drawn) || 0,
    lost: Number(t.lost) || 0,
    goalsFor: Number(t.goalsFor) || 0,
    goalsAgainst: Number(t.goalsAgainst) || 0,
    points: Number(t.points) || 0,
  };
}

function mergeResults(payloads: ScrapedPayload[]): MergedData {
  const squad: RawPlayer[] = [];
  const matches: RawMatch[] = [];
  let table: TableInfo | null = null;
  let league: string | undefined;
  payloads.forEach(p => {
    if (!p) return;
    if (Array.isArray(p.squad)) squad.push(...p.squad);
    if (Array.isArray(p.matches)) matches.push(...p.matches);
    if (!table && p.table) table = normalizeTable(p.table);
    if (!league && p.league) league = p.league;
  });
  return { squad, matches, table, league };
}

const SourceIcon = ({ kind }: { kind: SourceKind }) => {
  if (kind === 'fussball_de') return <Globe size={16} className="text-sky-400 shrink-0" />;
  if (kind === 'kicker') return <Search size={16} className="text-orange-400 shrink-0" />;
  return <Building2 size={16} className="text-purple-400 shrink-0" />;
};

const StatusIcon = ({ status }: { status: SourceStatus }) => {
  if (status === 'loading') return <Loader2 size={16} className="animate-spin text-sky-400 shrink-0" />;
  if (status === 'done') return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
  if (status === 'error') return <AlertCircle size={16} className="text-rose-400 shrink-0" />;
  return <Bot size={16} className="text-slate-500 shrink-0" />;
};

export const NaomiAgentModal: React.FC<NaomiAgentModalProps> = ({
  isOpen,
  onClose,
  onDataReady,
  presetClubId,
  presetClubName,
  presetFussballUrl,
  presetWebsite,
  autoStart,
}) => {
  const { activeClub } = useClub();
  const effectiveClubId = presetClubId || activeClub.id;
  const effectiveClubName = presetClubName || activeClub.name;

  const [clubName, setClubName] = useState('');
  const [fussballUrl, setFussballUrl] = useState('');
  const [clubWebsite, setClubWebsite] = useState('');
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [phase, setPhase] = useState<Phase>('input');
  const [mergedData, setMergedData] = useState<MergedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);

  useEffect(() => {
    if (isOpen && presetClubName) {
      setClubName(presetClubName);
      setFussballUrl(presetFussballUrl || '');
      setClubWebsite(presetWebsite || '');
    }
  }, [isOpen, presetClubName, presetFussballUrl, presetWebsite]);

  const scrapeSource = useCallback(async (url: string, source: SourceKind, name: string): Promise<ScrapedPayload> => {
    const res = await apiFetch('/api/naomi/scrape', {
      method: 'POST',
      body: JSON.stringify({ url, source, clubName: name }),
    });
    if (!res.ok) throw new Error(`Scraping fehlgeschlagen (HTTP ${res.status})`);
    const result = await res.json();
    return result.data as ScrapedPayload;
  }, []);

  const handleStartScrape = async () => {
    const name = clubName.trim();
    if (!name) return;
    setError(null);
    setExpandedSection(null);

    const items: SourceItem[] = [];
    if (fussballUrl.trim()) {
      items.push({ id: 'fussball', label: 'fussball.de', url: fussballUrl.trim(), kind: 'fussball_de', status: 'pending' });
    }
    items.push({
      id: 'kicker',
      label: 'kicker.de',
      url: `https://www.kicker.de/suche?words=${encodeURIComponent(name)}`,
      kind: 'kicker',
      status: 'pending',
    });
    if (clubWebsite.trim()) {
      items.push({ id: 'website', label: 'Vereinswebsite', url: clubWebsite.trim(), kind: 'club_website', status: 'pending' });
    }

    setSources(items);
    setPhase('scraping');

    const payloads: ScrapedPayload[] = [];

    for (const item of items) {
      setSources(prev => prev.map(s => (s.id === item.id ? { ...s, status: 'loading' } : s)));
      try {
        const res = await apiFetch('/api/naomi/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: item.url, source: item.kind, clubName: name }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        if (result.data) payloads.push(result.data);
        setSources(prev => prev.map(s => (s.id === item.id ? { ...s, status: 'done' } : s)));
      } catch {
        setSources(prev => prev.map(s => (s.id === item.id ? { ...s, status: 'error' } : s)));
      }
    }

    setPhase('merging');
    const merged = mergeResults(payloads);
    if (!merged.squad.length && !merged.table && !merged.matches.length) {
      setError('Keine verwertbaren Daten gefunden. Bitte Vereinsname und URLs prüfen.');
      setPhase('input');
      return;
    }
    setMergedData(merged);
    setPhase('review');
  };

  const handleSave = () => {
    if (!mergedData) return;

    const players = mergedData.squad.map((raw, index) => {
      const { firstName, lastName } = splitName(raw);
      return {
        id: `${lastName}_${firstName}`.toLowerCase().replace(/[^a-z0-9]/g, ''),
        number: raw.number ?? index + 1,
        firstName,
        lastName,
        position: raw.position || 'ZM',
        category: 'player',
      };
    });

    const matches = mergedData.matches.map((m, index) => {
      const isHome = m.isHome ?? true;
      return {
        id: `naomi-${Date.now()}-${index + 1}`,
        opponent: m.opponent || (isHome ? m.awayTeam : m.homeTeam) || 'Unbekannter Gegner',
        location: isHome ? 'Heimspiel' : 'Auswärtsspiel',
        isHome,
        kickOff: m.time || '15:00',
        meetingTime: m.time || '14:15',
        date: m.date,
        competition: m.competition,
      };
    });

    onDataReady({
      clubId: effectiveClubId,
      clubName: effectiveClubName,
      players,
      matches,
      table: mergedData.table,
      league: mergedData.league,
    });
    setPhase('done');
  };

  if (!isOpen) return null;

  const activeIdx = PHASES.findIndex(p => p.key === phase);
  const inputClass = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none';
  const labelClass = 'block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1';

  const reviewStats: { key: SectionKey; label: string; value: string; sub: string }[] = mergedData
    ? [
        { key: 'squad', label: 'Kader', value: String(mergedData.squad.length), sub: 'Spieler erfasst' },
        { key: 'table', label: 'Tabelle', value: mergedData.table ? `Platz ${mergedData.table.position}` : '–', sub: mergedData.table?.teamName || 'Keine Tabellendaten' },
        { key: 'matches', label: 'Spiele', value: String(mergedData.matches.length), sub: 'Partien erfasst' },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Bot size={22} className="text-white" /></div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-white">Naomi Daten-Agent</h2>
              <p className="text-xs text-emerald-100">
                {presetClubName ? `Daten laden für: ${effectiveClubName}` : 'Vereinsdaten von fussball.de, kicker.de & Vereinssite importieren'}
              </p>
            </div>
          </div>
          <button onClick={onClose} title="Schließen" className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-lg leading-none cursor-pointer">×</button>
        </header>

        <div className="flex items-center gap-1.5 px-5 py-3 border-b border-slate-800 shrink-0">
          {PHASES.map((p, i) => {
            const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'todo';
            return (
              <React.Fragment key={p.key}>
                {i > 0 && <div className="flex-1 h-px bg-slate-700" />}
                <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${state === 'active' ? 'text-emerald-400' : state === 'done' ? 'text-slate-300' : 'text-slate-600'}`}>
                  {state === 'done' ? <CheckCircle2 size={12} /> : state === 'active' ? <Loader2 size={12} className="animate-spin" /> : <span className="w-2.5 h-2.5 rounded-full border border-current" />}
                  {p.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'input' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Vereinsname *</label>
                <input value={clubName} onChange={e => setClubName(e.target.value)} placeholder="z.B. FC Auggen e.V." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>fussball.de URL</label>
                <input value={fussballUrl} onChange={e => setFussballUrl(e.target.value)} placeholder="https://www.fussball.de/verein/..." className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Vereinswebsite</label>
                <input value={clubWebsite} onChange={e => setClubWebsite(e.target.value)} placeholder="https://fc-auggen.de" className={inputClass} />
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 font-semibold mb-1">Naomi lädt automatisch von:</p>
                <div className="flex flex-wrap gap-2">
                  {fussballUrl.trim() && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400 bg-sky-400/10 px-2 py-1 rounded-lg">
                      <Globe size={10} /> fussball.de
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded-lg">
                    <Search size={10} /> kicker.de
                  </span>
                  {clubWebsite.trim() && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-400 bg-purple-400/10 px-2 py-1 rounded-lg">
                      <Building2 size={10} /> Vereinswebsite
                    </span>
                  )}
                </div>
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl px-3 py-2 text-sm">
                  <AlertCircle size={16} className="shrink-0" />{error}
                </div>
              )}
              <button onClick={handleStartScrape} disabled={!clubName.trim()} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-wider rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer">
                <Bot size={18} /> Scraping starten — Alle Quellen abrufen
              </button>
            </div>
          )}

          {(phase === 'scraping' || phase === 'merging') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Loader2 size={16} className="animate-spin text-emerald-400" />
                {phase === 'merging' ? 'Daten werden zusammengeführt…' : 'Quellen werden analysiert — Naomi wartet auf alle Ergebnisse…'}
              </div>
              {sources.map(s => (
                <div key={s.id} className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <SourceIcon kind={s.kind} />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white">{s.label}</div>
                      <div className="text-[11px] text-slate-500 truncate">{s.url}</div>
                    </div>
                  </div>
                  <span className={`ml-3 text-[10px] font-bold uppercase tracking-wider ${s.status === 'done' ? 'text-emerald-400' : s.status === 'error' ? 'text-rose-400' : s.status === 'loading' ? 'text-sky-400' : 'text-slate-500'}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {phase === 'review' && mergedData && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {reviewStats.map(stat => (
                  <button
                    key={stat.key}
                    onClick={() => setExpandedSection(expandedSection === stat.key ? null : stat.key)}
                    className={`rounded-xl border p-3 text-left transition-colors cursor-pointer ${expandedSection === stat.key ? 'border-emerald-500 bg-emerald-950/40' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
                    <div className="text-lg font-black text-white">{stat.value}</div>
                    <div className="text-[11px] text-slate-500 truncate">{stat.sub}</div>
                  </button>
                ))}
              </div>

              {expandedSection === 'squad' && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {mergedData.squad.slice(0, 50).map((p, i) => {
                    const n = splitName(p);
                    return (
                      <div key={i} className="flex justify-between text-sm text-slate-300 py-1 border-b border-slate-700/50 last:border-0">
                        <span>{n.firstName} {n.lastName}</span>
                        <span className="text-slate-500">{p.position || 'ZM'}{p.number ? ` · #${p.number}` : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {expandedSection === 'table' && mergedData.table && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 space-y-1">
                  <div className="flex justify-between"><span>Verein</span><span className="font-bold text-white">{mergedData.table.teamName}</span></div>
                  <div className="flex justify-between"><span>Platz</span><span>{mergedData.table.position}</span></div>
                  <div className="flex justify-between"><span>Spiele</span><span>{mergedData.table.played}</span></div>
                  <div className="flex justify-between"><span>S / U / N</span><span>{mergedData.table.won} / {mergedData.table.drawn} / {mergedData.table.lost}</span></div>
                  <div className="flex justify-between"><span>Tore</span><span>{mergedData.table.goalsFor}:{mergedData.table.goalsAgainst}</span></div>
                  <div className="flex justify-between"><span>Punkte</span><span className="font-bold text-emerald-400">{mergedData.table.points}</span></div>
                </div>
              )}

              {expandedSection === 'matches' && (
                <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {mergedData.matches.slice(0, 34).map((m, i) => {
                    const home = m.isHome ?? true;
                    return (
                      <div key={i} className="flex justify-between text-sm text-slate-300 py-1 border-b border-slate-700/50 last:border-0">
                        <span>{m.date || 'Datum offen'} · {home ? 'Heim' : 'Auswärts'}</span>
                        <span className="text-slate-400">{m.opponent || (home ? m.awayTeam : m.homeTeam) || 'Gegner offen'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center gap-3 py-8">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Daten erfolgreich gespeichert!</h3>
              <p className="text-sm text-slate-400 text-center">Kader, Spielplan und Tabelle wurden in die App übernommen.</p>
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold cursor-pointer">Schließen</button>
            </div>
          )}
        </div>

        {phase === 'review' && (
          <div className="border-t border-slate-800 p-4 flex gap-3 shrink-0">
            <button onClick={() => { setPhase('input'); setMergedData(null); }} className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold cursor-pointer">Anpassen</button>
            <button onClick={handleSave} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black uppercase tracking-wider rounded-xl py-2.5 flex items-center justify-center gap-2 cursor-pointer">
              <CheckCircle2 size={16} /> Speichern & übernehmen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
