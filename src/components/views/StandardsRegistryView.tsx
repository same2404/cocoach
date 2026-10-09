import React, { useMemo, useState } from 'react';
import {
  Target, ChevronDown, ChevronUp, ChevronRight, Images, Search, X,
  LayoutGrid, Shield, Swords, FileText,
} from 'lucide-react';
import {
  StandardEntry,
  StandardImageRef,
  StandardMatchType,
  StandardSide,
  describeStandard,
  indexAnalysesById,
  resolveImageRef,
} from '../../services/standardsRegistry';

interface StandardsRegistryViewProps {
  entries?: StandardEntry[];
  matchAnalyses?: any[];
}

type TypeFilter = 'alle' | StandardMatchType;
type SideFilter = 'alle' | StandardSide;

const TYPE_LABEL: Record<StandardMatchType, string> = {
  pflicht: 'Pflichtspiel',
  test: 'Testspiel',
  u23: 'U23',
};

const TYPE_COLOR: Record<StandardMatchType, string> = {
  pflicht: 'bg-red-500/20 text-red-300 border-red-500/40',
  test: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  u23: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const SIDE_LABEL: Record<StandardSide, string> = {
  own: 'Offensiv',
  opponent: 'Defensiv',
};

/** Bild-Referenz → echtes Bild. Fällt bewusst still zurück, wenn der Bericht fehlt. */
const ImageThumb: React.FC<{ src: string; alt: string; onClick: () => void }> = ({ src, alt, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 hover:border-cyan-400/60 transition-colors cursor-pointer group"
    title={alt}
  >
    <img src={src} alt={alt} className="w-full h-full object-cover" loading="lazy" />
    <span className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors" />
  </button>
);

const StandardsRegistryView: React.FC<StandardsRegistryViewProps> = ({ entries = [], matchAnalyses = [] }) => {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('alle');
  const [sideFilter, setSideFilter] = useState<SideFilter>('alle');
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const analysesById = useMemo(() => indexAnalysesById(matchAnalyses), [matchAnalyses]);

  const allTypes = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => e.detectedTypes.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [entries]);
  const [typeChip, setTypeChip] = useState<string>('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries
      .filter(e => typeFilter === 'alle' || e.matchType === typeFilter)
      .filter(e => sideFilter === 'alle' || e.side === sideFilter)
      .filter(e => !onlyWithImages || e.standardImageRefs.length > 0)
      .filter(e => !typeChip || e.detectedTypes.includes(typeChip))
      .filter(e => {
        if (!q) return true;
        return [e.opponent, e.matchDate, e.text, ...e.detectedTypes]
          .join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => (b.matchDate || '').localeCompare(a.matchDate || ''));
  }, [entries, typeFilter, sideFilter, onlyWithImages, typeChip, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, StandardEntry[]>();
    for (const e of filtered) {
      const key = e.analysisId;
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const stats = useMemo(() => ({
    total: entries.length,
    withStandards: entries.filter(e => e.text || e.standardImageRefs.length > 0).length,
    images: entries.reduce((sum, e) => sum + e.standardImageRefs.length, 0),
    allImages: entries.reduce((sum, e) => sum + e.imageRefs.length, 0),
  }), [entries]);

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="h-full flex flex-col bg-[#0A0F1A] text-white overflow-hidden">
      {/* Kopf */}
      <div className="px-4 py-3 border-b border-white/10 bg-[#0E1526] shrink-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Target size={16} className="text-cyan-400" />
              Standards-Registry
            </h1>
            <p className="text-[9px] text-slate-500 mt-0.5">
              Vollständig aus Spielberichten generiert · keine Altdaten
            </p>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-wider">
            <span className="text-slate-400">Einträge <b className="text-white">{stats.total}</b></span>
            <span className="text-slate-400">mit Inhalt <b className="text-cyan-400">{stats.withStandards}</b></span>
            <span className="text-slate-400">Standard-Bilder <b className="text-amber-400">{stats.images}</b></span>
            <span className="text-slate-400">alle Bilder <b className="text-slate-200">{stats.allImages}</b></span>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Gegner, Datum, Text …"
              className="pl-6 pr-2 py-1 bg-black/40 border border-white/10 rounded-lg text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/50 w-52"
            />
          </div>

          <FilterGroup value={typeFilter} onChange={setTypeFilter}
            options={[['alle', 'Alle Spiele'], ['pflicht', 'Pflicht'], ['test', 'Test'], ['u23', 'U23']]} />
          <FilterGroup value={sideFilter} onChange={setSideFilter}
            options={[['alle', 'Beide Seiten'], ['own', 'Offensiv'], ['opponent', 'Defensiv']]} />

          <button
            type="button"
            onClick={() => setOnlyWithImages(v => !v)}
            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-colors ${
              onlyWithImages
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <Images size={10} className="inline mr-1" />Nur mit Bildern
          </button>

          {allTypes.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {allTypes.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeChip(prev => (prev === t ? '' : t))}
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer transition-colors ${
                    typeChip === t
                      ? 'bg-violet-500/25 text-violet-200 border-violet-400/60'
                      : 'bg-black/40 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
            <Target size={28} className="opacity-40" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em]">Keine Standards gefunden</p>
            <p className="text-[9px] text-slate-600 max-w-sm text-center">
              Die Registry wird automatisch aus den Spielberichten erzeugt. Sobald ein Bericht
              Standards-Text oder -Bilder enthält, erscheint er hier.
            </p>
          </div>
        )}

        {grouped.map(([analysisId, sides]) => {
          const meta = sides[0];
          const isOpen = !!expanded[analysisId];
          return (
            <div key={analysisId} className="bg-[#0E1526] border border-white/10 rounded-xl overflow-hidden">
              {/* Spiel-Kopf */}
              <button
                type="button"
                onClick={() => toggle(analysisId)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-black text-white">vs {meta.opponent}</span>
                    {meta.result && <span className="text-[10px] font-bold text-slate-400">{meta.result}</span>}
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${TYPE_COLOR[meta.matchType]}`}>
                      {TYPE_LABEL[meta.matchType]}
                    </span>
                    {meta.isHome === false && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border bg-white/5 text-slate-400 border-white/10">Auswärts</span>
                    )}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    {meta.matchDate || 'ohne Datum'} · {describeStandard(meta)}
                  </div>
                </div>
                {isOpen ? <ChevronUp size={14} className="text-slate-500 shrink-0" /> : <ChevronDown size={14} className="text-slate-500 shrink-0" />}
              </button>

              {isOpen && (
                <div className="border-t border-white/10 p-3 space-y-3">
                  {sides.map(entry => {
                    const standardImages = entry.standardImageRefs
                      .map(r => ({ ref: r, src: resolveImageRef(r, analysesById) }))
                      .filter((x): x is { ref: StandardImageRef; src: string } => !!x.src);
                    const otherImages = entry.imageRefs
                      .filter(r => !entry.standardImageRefs.some(s => s.imageId === r.imageId))
                      .map(r => ({ ref: r, src: resolveImageRef(r, analysesById) }))
                      .filter((x): x is { ref: StandardImageRef; src: string } => !!x.src);

                    return (
                      <div key={entry.id} className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
                        <div className="px-2.5 py-1.5 bg-white/[0.03] border-b border-white/10 flex items-center gap-2 flex-wrap">
                          {entry.side === 'own'
                            ? <Swords size={11} className="text-cyan-400" />
                            : <Shield size={11} className="text-red-400" />}
                          <span className={`text-[9px] font-black uppercase tracking-widest ${entry.side === 'own' ? 'text-cyan-300' : 'text-red-300'}`}>
                            {SIDE_LABEL[entry.side]}
                          </span>
                          {entry.detectedTypes.map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-violet-500/20 text-violet-200 border border-violet-400/40">
                              {t}
                            </span>
                          ))}
                          <span className="ml-auto text-[8px] text-slate-600 font-mono">
                            {standardImages.length} Standard-Bilder
                          </span>
                        </div>

                        <div className="p-2.5 space-y-2.5">
                          <div className="flex gap-2">
                            <FileText size={12} className="text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                              {entry.text || <span className="text-slate-600 italic">Kein Standard-Text im Spielbericht.</span>}
                            </p>
                          </div>

                          {standardImages.length > 0 && (
                            <div>
                              <div className="text-[8px] font-black uppercase tracking-widest text-amber-400/80 mb-1.5 flex items-center gap-1">
                                <LayoutGrid size={9} /> Standards Bilder
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {standardImages.map(({ ref, src }) => (
                                  <ImageThumb
                                    key={ref.imageId}
                                    src={src}
                                    alt={`${ref.groupLabel} ${ref.index + 1}`}
                                    onClick={() => setLightbox({ src, alt: `${ref.groupLabel} – Bild ${ref.index + 1} (${describeStandard(entry)})` })}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {otherImages.length > 0 && (
                            <details className="group">
                              <summary className="text-[8px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-300 cursor-pointer select-none flex items-center gap-1">
                                <ChevronRight size={9} className="transition-transform group-open:rotate-90" />
                                Weitere Bilder aus diesem Bericht ({otherImages.length})
                              </summary>
                              <div className="flex gap-2 flex-wrap mt-2">
                                {otherImages.map(({ ref, src }) => (
                                  <ImageThumb
                                    key={ref.imageId}
                                    src={src}
                                    alt={`${ref.groupLabel} ${ref.index + 1}`}
                                    onClick={() => setLightbox({ src, alt: `${ref.groupLabel} – Bild ${ref.index + 1} (${describeStandard(entry)})` })}
                                  />
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-6 cursor-pointer"
        >
          <div className="max-w-5xl max-h-full flex flex-col gap-2" onClick={e => e.stopPropagation()}>
            <img src={lightbox.src} alt={lightbox.alt} className="max-h-[80vh] max-w-full object-contain rounded-lg" />
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 flex-1">{lightbox.alt}</span>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterGroup: React.FC<{
  value: string;
  onChange: (v: any) => void;
  options: Array<[string, string]>;
}> = ({ value, onChange, options }) => (
  <div className="flex items-center gap-0.5 bg-black/40 border border-white/10 rounded-lg p-0.5">
    {options.map(([v, label]) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors ${
          value === v ? 'bg-cyan-500/25 text-cyan-200' : 'text-slate-500 hover:text-white'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

export { StandardsRegistryView };
export default StandardsRegistryView;
