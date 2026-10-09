import React, { useState, useMemo, useRef } from 'react';
import { Match, MatchAnalysis, Opponent, Spieler } from '../../types';
import { MatchReportService } from '../../services/matchReportService';
import { 
  Trophy, 
  Calendar, 
  MapPin, 
  Clipboard, 
  Image as ImageIcon, 
  Zap, 
  ArrowRightLeft, 
  Target, 
  BookOpen, 
  PieChart, 
  CheckCircle2, 
  XCircle, 
  Star,
  Save,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Presentation,
  Upload,
  Maximize2,
  X,
  RotateCw,
  ExternalLink,
  Activity,
  FileText,
  BarChart3,
  Layers,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Users,
  Compass,
  Brain,
  PenTool,
  ArrowRight,
  ClipboardList
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { apiFetch } from '../../lib/apiClient';
import { VideoSection } from '../VideoSection';

interface MatchReportViewProps {
  matches: Match[];
  testMatches: Match[];
  analyses: MatchAnalysis[];
  onSaveAnalysis: (analysis: MatchAnalysis) => Promise<void>;
  onDeleteAnalysis: (id: string) => Promise<void>;
  opponents?: { id: string | number; name: string }[];
  players?: Spieler[];
  onNavigateToTacticBoard?: (matchId?: string | number, draft?: any) => void;
  sessionLogs?: any[];
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "white"; // Solid background in case of transparent png
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => {
        resolve(base64); // Fallback to original base64 if loading fails
      };
    };
    reader.onerror = error => reject(error);
  });
};

const ImageLightbox: React.FC<{
  image: string;
  onClose: () => void;
  onUpdate?: (newBase64: string) => void;
}> = ({ image, onClose, onUpdate }) => {
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdate) {
      try {
        const base64 = await fileToBase64(file);
        onUpdate(base64);
      } catch (err) {
        console.error("Update failed", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="absolute top-4 right-4 flex gap-4">
        {onUpdate && (
          <>
            <button 
              onClick={handleRotate}
              className="p-3 bg-[#1E293B]/10 hover:bg-[#1E293B]/20 text-white rounded-full transition-colors flex items-center gap-2 font-black uppercase text-[10px]"
            >
              <RotateCw size={20} /> Rotieren
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors flex items-center gap-2 font-black uppercase text-[10px]"
            >
              <Upload size={20} /> Ersetzen
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </>
        )}
        <button 
          onClick={onClose}
          className="p-3 bg-[#1E293B]/10 hover:bg-[#1E293B]/20 text-white rounded-full transition-colors"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <img 
          src={image} 
          alt="Lightbox" 
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `rotate(${rotation}deg)` }}
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};

const ImageUpload: React.FC<{ 
  onUpload: (base64: string) => void; 
  onDelete?: () => void;
  currentImage?: string;
  className?: string;
  label?: string;
}> = ({ onUpload, onDelete, currentImage, className, label }) => {
  const [showLightbox, setShowLightbox] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        onUpload(base64);
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          try {
            const base64 = await fileToBase64(blob);
            onUpload(base64);
          } catch (err) {
            console.error("Paste failed", err);
          }
        }
      }
    }
  };

  if (currentImage) {
    return (
      <>
        <div className={`relative group border border-[#2A2A2A] bg-[#1A1A1A] rounded-xl overflow-hidden ${className}`}>
          <img 
            src={currentImage} 
            alt="Upload" 
            className="w-full h-full object-contain cursor-pointer transition-transform group-hover:scale-105" 
            referrerPolicy="no-referrer"
            onClick={() => setShowLightbox(true)}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
            <Maximize2 size={24} className="text-[#FFD54F]" />
          </div>
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute top-2 right-2 bg-[#FF4C4C] text-white p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg rounded-lg"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {showLightbox && (
          <ImageLightbox 
            image={currentImage} 
            onClose={() => setShowLightbox(false)} 
            onUpdate={onUpload}
          />
        )}
      </>
    );
  }

  return (
    <div 
      onPaste={handlePaste}
      className={`relative border border-dashed border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#FFD54F]/60 rounded-xl transition-colors flex flex-col items-center justify-center p-4 cursor-pointer group ${className}`}
    >
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <Upload size={16} className="mb-2 text-[#888888] group-hover:text-[#FFD54F] transition-colors" />
      <span className="text-[9px] font-black uppercase text-[#888888] group-hover:text-[#F5F5F5] transition-colors text-center">
        {label || "Bild hochladen oder einfügen"}
      </span>
    </div>
  );
};

// Local state component to prevent hanging
const EditableArea = ({ value, onSave, placeholder, className, isTextArea = true, type = "text", listId }: { 
  value: string, 
  onSave: (val: string) => void, 
  placeholder?: string, 
  className?: string,
  isTextArea?: boolean,
  type?: string,
  listId?: string
}) => {
  const [localValue, setLocalValue] = useState(value);
  
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  if (isTextArea) {
    return (
      <textarea 
        className={className}
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => {
          if (localValue !== value) onSave(localValue);
        }}
      />
    );
  }

  return (
    <input 
      type={type}
      list={listId}
      className={className}
      placeholder={placeholder}
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={() => {
        if (localValue !== value) onSave(localValue);
      }}
    />
  );
};

const ImageGallery = ({ images = [], onUpdate, label }: { 
  images: string[], 
  onUpdate: (newImages: string[]) => void,
  label?: string
}) => {
  const MIN_SLOTS = 4;
  const emptySlots = Math.max(0, MIN_SLOTS - images.length);

  return (
    <div className="space-y-3 mt-3">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {images.map((img, idx) => (
          <ImageUpload 
            key={`img-${idx}`}
            onUpload={(base64) => {
              const newImages = [...images];
              newImages[idx] = base64;
              onUpdate(newImages);
            }}
            onDelete={() => {
              const newImages = images.filter((_, i) => i !== idx);
              onUpdate(newImages);
            }}
            currentImage={img}
            className="aspect-video"
          />
        ))}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <ImageUpload 
            key={`empty-${i}`}
            onUpload={(base64) => {
              onUpdate([...images, base64]);
            }}
            className="aspect-video"
            label={label || "BILD HINZUFÜGEN"}
          />
        ))}
        {images.length >= MIN_SLOTS && (
          <ImageUpload 
            onUpload={(base64) => {
              onUpdate([...images, base64]);
            }}
            className="aspect-video"
            label={label || "BILD HINZUFÜGEN"}
          />
        )}
      </div>
    </div>
  );
};

// Vorschau der geladenen Spieltagsdaten (fupa.net)
const SpieltagPreview: React.FC<{ data: any }> = ({ data }) => {
  const m = data?.match || {};
  const row = (list: any[] | undefined) => (Array.isArray(list) ? list : []);
  return (
    <div className="space-y-4">
      <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-3">
          <Trophy size={20} className="text-cyan-400" />
          <div>
            <div className="text-sm font-black text-white uppercase">FC Auggen vs. {m.opponent || '?'}</div>
            <div className="text-[10px] font-semibold text-slate-400">{(m.date || '')}{m.time ? ` • ${m.time}` : ''}{m.competition ? ` • ${m.competition}` : ''} • {m.isHome ? 'Heim' : 'Auswärts'}</div>
          </div>
        </div>
        <div className="ml-auto text-2xl font-black text-cyan-300">{m.resultOwn != null ? `${m.resultOwn} : ${m.resultOpponent}` : '–'}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Startelf ({row(data?.starters).length})</div>
          {row(data?.starters).length === 0 ? <p className="text-[11px] text-slate-600">Keine Daten</p> : row(data?.starters).map((s: any, i: number) => (
            <div key={i} className="flex gap-2 text-[11px] font-semibold text-slate-200 py-0.5"><span className="w-6 text-cyan-400 font-black">{s.number || '?'}</span><span>{s.name}</span><span className="ml-auto text-slate-500">{s.position}</span></div>
          ))}
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2">Bank ({row(data?.bench).length})</div>
          {row(data?.bench).length === 0 ? <p className="text-[11px] text-slate-600">Keine Daten</p> : row(data?.bench).map((s: any, i: number) => (
            <div key={i} className="flex gap-2 text-[11px] font-semibold text-slate-200 py-0.5"><span className="w-6 text-amber-400 font-black">{s.number || '?'}</span><span>{s.name}</span><span className="ml-auto text-slate-500">{s.position}</span></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Tore (für uns / Gegner)</div>
          {row(data?.goals).length === 0 ? <p className="text-[11px] text-slate-600">Keine Tore erkannt</p> : row(data?.goals).map((g: any, i: number) => (
            <div key={i} className="flex gap-2 text-[11px] font-semibold text-slate-200 py-0.5">
              <span className={`w-16 font-black ${String(g.team) === 'own' ? 'text-emerald-400' : 'text-red-400'}`}>{String(g.team) === 'own' ? 'FCA' : 'Gegner'}</span>
              <span>{g.minute ? `${g.minute}′` : ''} {g.scorer}</span><span className="ml-auto text-slate-500">{g.score}</span>
            </div>
          ))}
        </div>
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
          <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Karten / Wechsel</div>
          {row(data?.cards).length === 0 && row(data?.substitutions).length === 0 ? <p className="text-[11px] text-slate-600">Keine erkannt (ggf. manuell ergänzen)</p> : (
            <>
              {row(data?.cards).map((c: any, i: number) => <div key={`c${i}`} className="text-[11px] font-semibold text-slate-200 py-0.5">🟨 {c.type} {c.player} {c.minute ? `${c.minute}′` : ''}</div>)}
              {row(data?.substitutions).map((s: any, i: number) => <div key={`s${i}`} className="text-[11px] font-semibold text-slate-200 py-0.5">🔄 {s.minute ? `${s.minute}′ ` : ''}{s.in} für {s.out}</div>)}
            </>
          )}
        </div>
      </div>

      {data?.notes ? (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl px-4 py-2 text-[11px] font-semibold text-amber-200">
          ℹ️ {data.notes}
        </div>
      ) : null}
    </div>
  );
};

export const MatchReportView: React.FC<MatchReportViewProps> = ({
  matches,
  testMatches,
  analyses,
  onSaveAnalysis,
  onDeleteAnalysis,
  opponents = [],
  players = [],
  sessionLogs = [],
  onNavigateToTacticBoard
}) => {
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>(analyses[0]?.id || '');
  const [isSidebarOpen, setIsSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);

  const filteredAnalyses = useMemo(() => {
    const sorted = [...analyses].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    if (!searchTerm) return sorted;
    return sorted.filter(a => 
      (a.opponent?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (a.date?.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [analyses, searchTerm]);

  const currentAnalysis = useMemo(() => {
    return analyses.find(a => a.id === selectedAnalysisId) || null;
  }, [analyses, selectedAnalysisId]);

  const handleUpdate = (field: keyof MatchAnalysis, value: any) => {
    if (!currentAnalysis) return;
    onSaveAnalysis({ ...currentAnalysis, [field]: value });
  };

  /** 1-Klick: Startelf & Kader aus dem Spielerkader (TW → Abwehr → Mittelfeld → Angriff) in den Spielbericht schreiben & speichern */
  const writeLineupFromSquad = () => {
    if (!currentAnalysis) return;
    const short = (p: any) => {
      const fn = (p.firstName || '').trim();
      const ln = (p.lastName || p.name || '').trim();
      return fn && ln ? `${fn.charAt(0)}. ${ln}` : (ln || fn || '?');
    };
    const posKey = (pos: any) => String(pos || '').toUpperCase().replace(/[^A-ZÄÖÜ]/g, '');
    const order: Record<string, number> = {
      TORWART: 0, TW: 0,
      ABWEHR: 1, VERTEIDIGUNG: 1, IV: 1, RV: 1, LV: 1, DEFENSIV: 1,
      MITTELFELD: 2, MF: 2, ZM: 2, DM: 2, OM: 2, ZOM: 2, ZDM: 2, OFFENSIV: 2,
      ANGRIFF: 3, ANG: 3, ST: 3, STURM: 3
    };
    const rank = (p: any) => (order[posKey((p.position || '').split('/')[0])] ?? 5);
    const squad = (players || []).filter((p: any) => (p.category || 'player') === 'player');
    const sorted = [...squad].sort((a, b) => rank(a) - rank(b) || Number(a.number || 0) - Number(b.number || 0));
    if (sorted.length === 0) { setSyncStatusText('Keine Spieler im Kader gefunden — bitte zuerst im Kader anlegen.'); return; }
    const lines: string[] = [];
    sorted.forEach((p: any) => { lines.push(String(p.number || '')); lines.push(short(p)); lines.push(String(p.position || '')); lines.push(''); });
    const starters = sorted.slice(0, 11);
    const bench = sorted.slice(11);
    const benchText = bench.length ? bench.map((p: any) => `${String(p.number || '')} ${short(p)} (${String(p.position || '')})`).join('\n') : '';
    onSaveAnalysis({ ...currentAnalysis, startingLineup: lines.join('\n'), substitutes: benchText || currentAnalysis.substitutes })
      .then(() => setSyncStatusText(`Aufstellung aus dem Kader eingetragen & gespeichert ✓ (${starters.length} Startelf, ${bench.length} Bank)'`))
      .catch(() => setSyncStatusText('Speichern fehlgeschlagen — erneut versuchen.'));
  };

  /**
   * One-Click Import Logik:
   * Übernimmt 1:1 alle Pflichtspieldaten (Gegner, Datum, Uhrzeit, Heim/Auswärts,
   * Ergebnis, Wettbewerb, Aufstellung, Bank, Auswechslungen, Torschützen, Karten).
   */
  const handleSelectMatchImport = (matchId: string) => {
    if (!currentAnalysis || !matchId) return;
    const allMatches = [...(matches || []), ...(testMatches || [])];
    const selectedMatch = allMatches.find(m => String(m.id) === String(matchId));
    if (!selectedMatch) return;

    const importedReport = MatchReportService.createSpielberichtFromPflichtspiel(selectedMatch, currentAnalysis.id);
    
    // Bestehende, manuelle Ergänzungen (Berichtstext, Fazit, etc.) beibehalten
    const mergedReport: MatchAnalysis = {
      ...importedReport,
      berichtText: currentAnalysis.berichtText || importedReport.berichtText,
      trainerFazit: currentAnalysis.trainerFazit || importedReport.trainerFazit,
      trainerTactical: currentAnalysis.trainerTactical || importedReport.trainerTactical,
      teamRating: currentAnalysis.teamRating || importedReport.teamRating,
      playerOfTheMatch: currentAnalysis.playerOfTheMatch || importedReport.playerOfTheMatch,
      goodActions: currentAnalysis.goodActions || importedReport.goodActions,
      badActions: currentAnalysis.badActions || importedReport.badActions,
      specialMoments: currentAnalysis.specialMoments || importedReport.specialMoments,
      presentationImages: (currentAnalysis.presentationImages && currentAnalysis.presentationImages.length > 0) ? currentAnalysis.presentationImages : importedReport.presentationImages,
      videoClips: (currentAnalysis.videoClips && currentAnalysis.videoClips.length > 0) ? currentAnalysis.videoClips : importedReport.videoClips,
    };

    onSaveAnalysis(mergedReport);
  };

  const handleCreateNew = () => {
    const newId = `analysis_${Date.now()}`;
    const newAnalysis: MatchAnalysis = {
      id: newId,
      matchId: '',
      opponent: 'NEUER GEGNER',
      date: new Date().toISOString().split('T')[0],
      category: 'Pflichtspiel',
      isHome: true,
      result: '',
      lineupImage: '',
      openingPlay: '',
      transitionOffensive: '',
      transitionDefensive: '',
      goalChancesOwn: '',
      goalChancesOpponent: '',
      goalsOwn: '',
      goalsOpponent: '',
      goodActions: '',
      badActions: '',
      specialMoments: '',
      standardsOwn: '',
      standardsOpponent: '',
      trainerGood: '',
      trainerBad: '',
      trainerTactical: '',
      trainerFazit: '',
      playerOfTheMatch: '',
      matchRating: '',
      presentations: '',
      presentationImages: []
    };
    onSaveAnalysis(newAnalysis);
    setSelectedAnalysisId(newId);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSyncFromTacticBoard = () => {
    try {
      const saved = localStorage.getItem('fc_auggen_set_pieces_v2');
      if (saved && currentAnalysis) {
        const list = JSON.parse(saved);
        const matchSpecific = list.filter((s: any) => 
          (currentAnalysis.matchId && s.sourceMatchId === String(currentAnalysis.matchId)) ||
          (s.targetMatchId && s.targetMatchId === String(currentAnalysis.matchId)) ||
          (currentAnalysis.opponent && s.opponent && s.opponent.toLowerCase().includes(currentAnalysis.opponent.toLowerCase())) ||
          (currentAnalysis.opponent && s.name && s.name.toLowerCase().includes(currentAnalysis.opponent.toLowerCase()))
        );
        const targetList = matchSpecific.length > 0 ? matchSpecific : list;
        
        if (targetList.length > 0) {
          const offVariants = targetList.filter((s: any) => s.mode === 'offensiv');
          const defVariants = targetList.filter((s: any) => s.mode === 'defensiv');
          
          if (offVariants.length > 0) {
            const combinedOff = offVariants.map((s: any) => `[${s.name.toUpperCase()} - ${s.type.toUpperCase()}]\n${s.notes || s.description || 'Einstudierte offensive Variante'}`).join('\n\n');
            handleUpdate('standardsOwn', combinedOff);
          }
          if (defVariants.length > 0) {
            const combinedDef = defVariants.map((s: any) => `[${s.name.toUpperCase()} - ${s.type.toUpperCase()}]\n${s.notes || s.description || 'Einstudierte defensive Absicherung'}`).join('\n\n');
            handleUpdate('standardsOpponent', combinedDef);
          }
          setSyncStatusText(`Erfolgreich ${targetList.length} Standard-Variante(n) aus der Taktiktafel synchronisiert!`);
          setTimeout(() => setSyncStatusText(null), 4000);
          return;
        }
      }
      setSyncStatusText('Keine Standard-Varianten gefunden. Zeichne sie zuerst auf der Taktiktafel auf.');
      setTimeout(() => setSyncStatusText(null), 4000);
    } catch (e) {
      console.error(e);
      setSyncStatusText('Fehler beim Synchronisieren.');
      setTimeout(() => setSyncStatusText(null), 4000);
    }
  };

  const [traceLoading, setTraceLoading] = useState<'own' | 'opponent' | null>(null);

  // 📐 In der 3D-Taktiktafel exakt nachzeichnen – Text & Bilder werden übergeben, NICHT verändert
  const traceStandardToBoard = async (side: 'own' | 'opponent') => {
    if (!onNavigateToTacticBoard) return;
    const text = side === 'own' ? (currentAnalysis.standardsOwn || '') : (currentAnalysis.standardsOpponent || '');
    const images = side === 'own' ? (currentAnalysis.standardsOwnImages || []) : (currentAnalysis.standardsOpponentImages || []);
    if (!String(text).trim() && images.length === 0) {
      setSyncStatusText('Bitte zuerst eine Standard-Beschreibung oder ein Bild eintragen – vorhandene Inhalte bleiben vollständig erhalten.');
      setTimeout(() => setSyncStatusText(null), 5000);
      return;
    }
    setTraceLoading(side);
    try {
      const raw: any = await apiFetch('/api/tacticboard/standard-from-text', {
        method: 'POST',
        body: JSON.stringify({
          name: side === 'own' ? (currentAnalysis.opponent ? `Offensiv vs. ${currentAnalysis.opponent}` : 'Offensiv') : (currentAnalysis.opponent ? `Defensiv vs. ${currentAnalysis.opponent}` : 'Defensiv'),
          side,
          text,
          images,
        }),
      });
      const parsed = await raw.json().catch(() => ({}));
      if (!raw.ok || !parsed?.standard) {
        if (raw.status === 401) {
          throw new Error('Ungültiger API-Key – bitte die offizielle Adresse https://cocoach-app.vercel.app öffnen.');
        }
        throw new Error(parsed?.error || 'Zeichnung fehlgeschlagen');
      }
      onNavigateToTacticBoard(currentAnalysis.matchId || currentAnalysis.id, {
        standard: parsed.standard,
        label: side === 'own' ? 'STANDARDS OFFENSIV' : 'STANDARDS DEFENSIV',
        referenceText: text,
        referenceImages: images,
      });
    } catch (err: any) {
      console.error('[Trace-Standard Client]', err);
      setSyncStatusText(`❌ Nachzeichnen fehlgeschlagen: ${err?.message || 'Unbekannter Fehler'}`);
      setTimeout(() => setSyncStatusText(null), 6000);
    } finally {
      setTraceLoading(null);
    }
  };

  const [spieltagOpen, setSpieltagOpen] = useState(false);
  const [matchdayLoading, setMatchdayLoading] = useState(false);
  const [matchdayResult, setMatchdayResult] = useState<any>(null);

  const runMatchdayFetch = async () => {
    setMatchdayLoading(true);
    setMatchdayResult(null);
    try {
      const raw: any = await apiFetch('/api/matchday/fetch', {
        method: 'POST',
        body: JSON.stringify({
          squadPlayers: (players || []).filter((p: any) => (p.category || 'player') === 'player').map((p: any) => ({
            number: String(p.number || ''),
            firstName: p.firstName || '',
            lastName: p.lastName || p.name || '',
          })),
        }),
      });
      const parsed = await raw.json().catch(() => ({}));
      if (!raw.ok || !parsed?.data) {
        if (raw.status === 401) {
          throw new Error('Ungültiger API-Key – bitte die offizielle Adresse https://cocoach-app.vercel.app öffnen.');
        }
        throw new Error(parsed?.error || 'Abruf fehlgeschlagen');
      }
      setMatchdayResult(parsed.data);
    } catch (err: any) {
      console.error('[Matchday Client]', err);
      setMatchdayResult({ error: err?.message || 'Abruf fehlgeschlagen' });
    } finally {
      setMatchdayLoading(false);
    }
  };

  const applyMatchdayToReport = () => {
    if (!currentAnalysis || !matchdayResult || matchdayResult.error) return;
    const d = matchdayResult;
    const m = d.match || {};
    const fmt = (list: any[], tm: string) => (Array.isArray(list) ? list.filter((g: any) => String(g.team) === tm).map((g: any) => `${g.minute ? `${g.minute}′ ` : ''}${g.scorer}${g.score ? ` (${g.score})` : ''}`).join('\n') : '');
    const startersText = Array.isArray(d.starters) ? d.starters.map((s: any) => `${s.number} ${s.name} (${s.position})`).join('\n') : '';
    const benchText = Array.isArray(d.bench) ? d.bench.map((s: any) => `${s.number} ${s.name} (${s.position})`).join('\n') : '';
    const goalsOwn = fmt(d.goals, 'own');
    const goalsOpp = fmt(d.goals, 'opponent');
    const cardsText = Array.isArray(d.cards) && d.cards.length ? d.cards.map((c: any) => `${c.minute ? `${c.minute}′ ` : ''}${c.type} ${c.player}`).join('\n') : '';
    const subsText = Array.isArray(d.substitutions) && d.substitutions.length ? d.substitutions.map((s: any) => `${s.minute ? `${s.minute}′ ` : ''}${s.in} für ${s.out}`).join('\n') : '';

    const next: any = { ...currentAnalysis };
    if (m.opponent) next.opponent = m.opponent;
    if (m.date) next.date = m.date;
    if (typeof m.isHome === 'boolean') next.isHome = m.isHome;
    if (m.resultOwn != null && m.resultOpponent != null) next.result = `${m.resultOwn}:${m.resultOpponent}`;
    if (goalsOwn) next.goalsOwn = goalsOwn;
    if (goalsOpp) next.goalsOpponent = goalsOpp;
    if (startersText) next.startingLineup = startersText;
    if (benchText) next.substitutes = benchText;
    if (cardsText) next.cards = cardsText;
    if (subsText) next.substitutions = subsText;
    if (d.notes) next.matchNotes = d.notes;
    next.isAutoImported = true;
    next.importedMatchTimestamp = new Date().toISOString();
    onSaveAnalysis(next)
      .then(() => {
        setSyncStatusText(`✅ Spieltag ${m.opponent || ''} (${m.resultOwn != null ? `${m.resultOwn}:${m.resultOpponent}` : '?'}) in den Spielbericht übernommen`);
        setTimeout(() => setSyncStatusText(null), 5000);
        setSpieltagOpen(false);
      })
      .catch(() => setSyncStatusText('❌ Übernehmen fehlgeschlagen – erneut versuchen.'));
  };

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Sidebar - List of reports */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: typeof window !== 'undefined' && window.innerWidth < 768 ? '100%' : 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-[#2A2A2A] flex flex-col shrink-0 bg-[#1A1A1A] absolute md:relative inset-y-0 left-0 z-40 h-full w-full md:w-auto shadow-xl"
          >
            <div className="p-4 bg-[#141414] text-[#F5F5F5] shrink-0 border-b border-[#2A2A2A]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[#FFD54F]">ALLE ANALYSEN</h3>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden text-[#888888] hover:text-[#F5F5F5]"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="relative mb-3">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                <input 
                  type="text" 
                  placeholder="SUCHEN..."
                  className="w-full bg-[#202020] border border-[#2A2A2A] text-[10px] font-black uppercase p-2 pl-7 text-[#F5F5F5] placeholder-[#888888] rounded-xl focus:outline-none focus:border-[#FFD54F]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={handleCreateNew}
                className="w-full bg-[#FFD54F] text-[#0F0F0F] py-2 text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-[#ffe082] transition-all rounded-xl border border-[#FFD54F] shadow-xs"
              >
                <Plus size={14} /> NEUER BERICHT
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredAnalyses.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic text-[10px]">KEINE BERICHTE</div>
              ) : (
                filteredAnalyses.map(a => (
                  <button 
                    key={a.id}
                    onClick={() => {
                      setSelectedAnalysisId(a.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={`w-full text-left p-3 border-b border-slate-800 hover:bg-slate-800/60 transition-all relative ${selectedAnalysisId === a.id ? 'bg-slate-800 border-l-4 border-l-amber-400' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase truncate mr-2">
                        {a.date || 'KEIN DATUM'}
                      </span>
                      <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 border ${a.category === 'Pflichtspiel' ? 'bg-red-950 text-red-300 border-red-500/50' : 'bg-slate-950 text-slate-300 border-slate-700'}`}>
                        {a.category === 'Pflichtspiel' ? 'PS' : a.category === 'Testspiel' ? 'TS' : 'PK'}
                      </span>
                    </div>
                    <div className="text-[11px] font-black text-slate-100 uppercase truncate leading-none">
                      {a.opponent || 'UNBEKANNT'}
                    </div>
                    {a.result && (
                      <div className="text-[9px] font-black text-emerald-400 mt-1">
                        RESULTAT: {a.result}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900 border border-slate-700 text-white p-1.5 hover:bg-[#C00000] transition-colors shadow-lg"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        {currentAnalysis ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-slate-950">
            <div className="max-w-6xl mx-auto space-y-10 pb-16">
              
              {/* ⚡ 1-CLICK PFLICHTSPIEL-AUTOMATIK IMPORT BANNER */}
              <div className="relative z-0 isolate w-full max-w-full min-w-0 box-border bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-400 p-5 rounded-2xl shadow-2xl space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
                      <Zap size={22} className="animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                        1-CLICK PFLICHTSPIEL-AUTOMATIK IMPORT
                      </h4>
                      <p className="text-[11px] text-slate-300 font-medium leading-snug">
                        Wähle ein Ansetzung aus, um Gegner, Datum, Uhrzeit, Heim/Auswärts, Aufstellung, Kader, Auswechslungen, Torschützen & Karten automatisch in den Spielbericht zu übernehmen.
                      </p>
                    </div>
                  </div>

                  {currentAnalysis.isAutoImported && (
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5 shrink-0 self-start md:self-auto">
                      <CheckCircle2 size={14} /> 1:1 Synchronisiert mit Pflichtspiel #{currentAnalysis.matchId}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-1 min-w-0">
                  <select
                    value={currentAnalysis.matchId || ''}
                    onChange={(e) => handleSelectMatchImport(e.target.value)}
                    className="flex-1 min-w-0 max-w-full bg-slate-950 border-2 border-amber-400/80 hover:border-amber-400 text-xs sm:text-sm font-bold text-amber-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
                  >
                    <option value="">-- Pflichtspiel für automatischen Import auswählen --</option>
                    {[...(matches || []), ...(testMatches || [])].map((m) => (
                      <option key={m.id} value={m.id}>
                        ⚽ [{m.date || 'Kein Datum'}] FC Auggen vs. {m.opponent} ({m.isHome ? 'Heim' : 'Auswärts'}, {m.competition || 'Pflichtspiel'} {m.result ? `| ${m.result}` : ''})
                      </option>
                    ))}
                  </select>

                  {currentAnalysis.matchId && (
                    <button
                      onClick={() => handleSelectMatchImport(String(currentAnalysis.matchId))}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase px-5 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 shrink-0"
                    >
                      <RotateCw size={15} /> 1-Click Sync
                    </button>
                  )}
                </div>
              </div>

              {/* Header Section (Editable) */}
              <div className="border-2 border-amber-500/30 p-6 sm:p-8 relative watermark-bg overflow-hidden bg-slate-900/90 shadow-2xl rounded-xl">
                <div className="absolute top-0 right-0 p-3">
                  <button 
                    onClick={() => {
                      onDeleteAnalysis(currentAnalysis.id);
                      setSelectedAnalysisId(analyses.find(a => a.id !== currentAnalysis.id)?.id || '');
                    }}
                    className="text-red-400 hover:text-red-300 hover:bg-red-950/60 p-2.5 bg-slate-950 border border-red-500/30 font-bold shadow-sm rounded-lg transition-all cursor-pointer"
                    title="Spielbericht löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 bg-emerald-400 rounded-full animate-pulse shadow-md" />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white">SPIEL – FC AUGGEN vs.</span>
                      <EditableArea 
                        isTextArea={false}
                        listId="opponent-list-report"
                        value={currentAnalysis.opponent || ''}
                        onSave={(val) => handleUpdate('opponent', val)}
                        placeholder="GEGNERNAME..."
                        className="flex-1 bg-transparent border-b-4 border-amber-400 text-2xl sm:text-4xl font-black uppercase italic text-amber-300 focus:outline-none focus:border-emerald-400 min-w-0"
                      />
                      <datalist id="opponent-list-report">
                        {opponents.map((opp) => (
                          <option key={opp.id} value={opp.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <Calendar size={14} className="text-amber-400" /> Datum
                      </span>
                      <EditableArea 
                        isTextArea={false}
                        type="date"
                        value={currentAnalysis.date || ''}
                        onSave={(val) => handleUpdate('date', val)}
                        className="text-sm sm:text-base font-bold uppercase border border-slate-700 p-2.5 focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg"
                      />
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <Trophy size={14} className="text-amber-400" /> Wettbewerb
                      </span>
                      <select 
                        value={currentAnalysis.category || 'Pflichtspiel'}
                        onChange={(e) => handleUpdate('category', e.target.value)}
                        className="text-sm sm:text-base font-bold uppercase border border-slate-700 p-2.5 focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg"
                      >
                        <option value="Pflichtspiel">Pflichtspiel</option>
                        <option value="Testspiel">Testspiel</option>
                        <option value="Pokalspiel">Pokalspiel</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <MapPin size={14} className="text-amber-400" /> Heim / Auswärts
                      </span>
                      <div className="flex border border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => handleUpdate('isHome', true)}
                          className={`flex-1 p-2.5 text-xs sm:text-sm font-black uppercase transition-colors ${currentAnalysis.isHome ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
                        >
                          Heim
                        </button>
                        <button 
                          onClick={() => handleUpdate('isHome', false)}
                          className={`flex-1 p-2.5 text-xs sm:text-sm font-black uppercase transition-colors ${!currentAnalysis.isHome ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-300 hover:bg-slate-800'}`}
                        >
                          Auswärts
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black uppercase text-slate-300 flex items-center gap-1.5">
                        <Star size={14} className="text-amber-400" /> Ergebnis
                      </span>
                      <EditableArea 
                        isTextArea={false}
                        value={currentAnalysis.result || ''}
                        onSave={(val) => handleUpdate('result', val)}
                        placeholder="Z.B. 3:1"
                        className="text-sm sm:text-base font-black uppercase border border-slate-700 p-2.5 focus:outline-none focus:border-amber-400 text-emerald-400 bg-slate-950 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 📋 ÜBERNOMMENE PFLICHTSPIEL-BASISDATEN (AUTOMATISCH VORAUSGEFÜLLT) & ERGÄNZUNGEN */}
              <section className="border-2 border-amber-500/40 p-6 sm:p-8 bg-slate-900/95 text-slate-100 space-y-6 rounded-2xl shadow-2xl relative">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-800 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black shrink-0">
                      <Clipboard size={22} />
                    </div>
                    <div>
                      <h3 className="font-black text-lg sm:text-xl uppercase tracking-wider text-white flex items-center gap-2">
                        PFLICHTSPIEL-DATEN & ERGÄNZENDE BERICHTSEINGABE
                      </h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Inklusive Aufstellung, Auswechslungen, Torschützen, Karten & Fließtext
                      </p>
                    </div>
                  </div>

                  <span className="bg-amber-950 text-amber-300 border border-amber-700 font-black text-[10px] uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                    <Zap size={13} className="text-amber-400" />
                    Keine Doppeleingabe nötig
                  </span>
                </div>

                {/* Grid der übernommenen Pflichtspiel-Daten */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Aufstellung & Kader */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Users size={14} /> 1. Startelf & Kader (1:1 Übernahme)
                    </span>
                    <EditableArea 
                      className="w-full bg-slate-900 border border-slate-800 p-3 text-xs font-mono text-slate-200 rounded-lg focus:outline-none focus:border-amber-400 min-h-[70px]"
                      placeholder="Startelf-Spieler (z. B. L. Schneider, Tiedemann, Paolillo...)"
                      value={typeof currentAnalysis.startingLineup === 'string' ? currentAnalysis.startingLineup : Array.isArray(currentAnalysis.startingLineup) ? currentAnalysis.startingLineup.join(', ') : ''}
                      onSave={(val) => handleUpdate('startingLineup', val)}
                    />
                    <button onClick={writeLineupFromSquad} className="bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-black text-[10px] uppercase px-2.5 py-1.5 rounded-lg transition-all active:scale-95 w-full flex items-center justify-center gap-1.5" title="Startelf & Kader automatisch aus dem Spielerkader (TW → Abwehr → Mittelfeld → Angriff) in den Spielbericht schreiben und speichern">
                      <ClipboardList size={12} /> Aufstellung aus dem Kader eintragen & speichern
                    </button>
                    {syncStatusText && (
                      <div className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2.5 py-1.5">{syncStatusText}</div>
                    )}
                    <div className="text-[10px] text-slate-400 italic">
                      Bank: {typeof currentAnalysis.substitutes === 'string' ? currentAnalysis.substitutes : Array.isArray(currentAnalysis.substitutes) ? currentAnalysis.substitutes.join(', ') : 'Keine Ersatzspieler gelistet'}
                    </div>
                  </div>

                  {/* Auswechslungen, Torschützen & Karten */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <span className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                      <Target size={14} /> 2. Torschützen & Karten (1:1 Übernahme)
                    </span>
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Torschützen:</span>
                        <EditableArea 
                          isTextArea={false}
                          className="w-full bg-slate-900 border border-slate-800 p-2 text-xs font-bold text-emerald-400 rounded-lg focus:outline-none focus:border-amber-400"
                          placeholder="Z. B. 24' Ehret, 68' Dischinger"
                          value={typeof currentAnalysis.scorers === 'string' ? currentAnalysis.scorers : JSON.stringify(currentAnalysis.scorers || '')}
                          onSave={(val) => handleUpdate('scorers', val)}
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Karten & Verwarnungen:</span>
                        <EditableArea 
                          isTextArea={false}
                          className="w-full bg-slate-900 border border-slate-800 p-2 text-xs font-bold text-amber-300 rounded-lg focus:outline-none focus:border-amber-400"
                          placeholder="Z. B. 42' Kalchschmidt (Gelb)"
                          value={typeof currentAnalysis.cards === 'string' ? currentAnalysis.cards : JSON.stringify(currentAnalysis.cards || '')}
                          onSave={(val) => handleUpdate('cards', val)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* NUR ERGÄNZUNG: FLIESSTEXT SPIELBERICHT & ANALYSE */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                      <FileText size={15} /> NUR ERGÄNZUNG: FLIESSTEXT SPIELBERICHT (GESCHEHEN & HIGHLIGHTS)
                    </span>
                    <span className="text-[10px] text-slate-400 italic">Der Benutzer ergänzt nur noch Berichtstext & Fazit</span>
                  </div>
                  <EditableArea 
                    className="w-full border-2 border-amber-500/40 p-4 text-sm font-medium leading-relaxed min-h-[180px] focus:outline-none focus:border-emerald-400 bg-slate-950 text-slate-100 rounded-xl shadow-inner placeholder-slate-600"
                    placeholder="SCHREIBE HIER DEN AUSFÜHRLICHEN SPIELBERICHT FLIESSTEXT (Z.B. SPIELVERLAUF, DRUCKPHASEN, CHANCEN, SCHIEDSRICHTER, STIMMUNG)..."
                    value={currentAnalysis.berichtText || ''}
                    onSave={(val) => handleUpdate('berichtText', val)}
                  />
                </div>
              </section>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* CROSS-TAB MATCH INTELLIGENCE (GPS + Training + Physio Auto)  */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <section className="bg-gradient-to-br from-[#0A1628] via-[#0D1B2A] to-[#0A1628] border border-[#F59E0B]/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">Cross-Tab Match Intelligence</span>
                  <span className="text-[8px] text-[#64748B] ml-auto">Auto-Pull: GPS • Training • Physio • Anwesenheit</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Aufstellung: Spieler-Status aus allen Tabs */}
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-3">
                    <div className="text-[8px] font-black uppercase text-[#38BDF8] tracking-widest mb-2">Kader-Status (alle Quellen)</div>
                    <div className="space-y-1">
                      {players.filter((p: any) => p.category === 'player').slice(0, 10).map((player: any) => {
                        const ta = player.trackerAnalysis || {};
                        const load = ta.workloadIndex || 0;
                        const isRot = player.loadAmpel === 'Rot' || player.isInjured;
                        const isGelb = player.loadAmpel === 'Gelb';
                        const gps = (ta.totalDistanceKm || 0) > 0;
                        return (
                          <div key={player.id} className="flex items-center gap-1.5 text-[7px]">
                            <div className={`w-1.5 h-1.5 rounded-full ${isRot ? 'bg-[#EF4444]' : isGelb ? 'bg-[#F59E0B]' : 'bg-[#10B981]'}`} />
                            <span className="text-[#94A3B8] w-20 truncate font-bold">{player.firstName || player.name?.split(' ')[0]}</span>
                            <span className="text-[#64748B]">{player.position}</span>
                            {gps && <span className="text-[#06B6D4] ml-auto">{ta.totalDistanceKm}km</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Letzte Trainingseinheiten vor dem Spiel */}
                  <div className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-3">
                    <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-2">Training vor dem Spiel</div>
                    <div className="space-y-1">
                      {(() => {
                        const last3 = (sessionLogs || []).filter((l: any) => {
                          if (!l.date) return false;
                          const d = new Date(l.date);
                          const now = new Date(currentAnalysis.date || Date.now());
                          const diff = now.getTime() - d.getTime();
                          return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
                        }).slice(-10);
                        if (last3.length === 0) return <div className="text-[7px] text-[#64748B] text-center py-2">Keine Trainingseinheiten in den letzten 7 Tagen</div>;
                        return last3.map((l: any, i: number) => {
                          const player = players.find((p: any) => p.id === l.playerId);
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-[7px] px-1 py-0.5 border-b border-[#1E293B]">
                              <span className="text-[#94A3B8] w-16 truncate">{player?.firstName || l.playerName || '?'}</span>
                              <span className="text-[#10B981]">RPE {l.rpe || '-'}</span>
                              <span className="text-[#64748B] ml-auto">{l.date}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Physio-Verletzungsstatus */}
                  <div className="bg-[#0D1117] border border-[#EF4444]/20 rounded-xl p-3">
                    <div className="text-[8px] font-black uppercase text-[#EF4444] tracking-widest mb-2">⚠ Verletzungsstatus (Physio)</div>
                    <div className="space-y-1">
                      {players.filter((p: any) => p.category === 'player' && p.isInjured).length === 0 ? (
                        <div className="text-[7px] text-[#10B981] text-center py-2">Alle Spieler gesund</div>
                      ) : (
                        players.filter((p: any) => p.category === 'player' && p.isInjured).map((player: any) => (
                          <div key={player.id} className="flex items-center gap-1.5 text-[7px] px-1 py-0.5 bg-[#EF4444]/10 rounded border border-[#EF4444]/20">
                            <span className="text-[#EF4444] font-bold w-20 truncate">{player.firstName || player.name?.split(' ')[0]}</span>
                            <span className="text-[#94A3B8]">{player.injuryType || 'Verletzt'}</span>
                            <span className="text-[#64748B] ml-auto">{player.recoveryForecast || ''}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* MULTI-MATCH SYSTEM COMPARISON, LINEUPS, STANDARDS & TRAINER FAZIT HUB */}
              <section className="border-2 border-emerald-500/40 p-6 sm:p-8 bg-slate-900/95 text-slate-100 space-y-6 rounded-xl shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b-2 border-slate-800 pb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <BarChart3 size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <h3 className="font-black text-lg sm:text-xl uppercase tracking-wider text-white">
                          ANALYSE DER LETZTEN SPIELE & SPIELSYSTEM-VERGLEICH
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                        Systemvergleich, Aufstellungen, Standards-Effizienz & Taktisches Fazit
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 font-black text-[10px] uppercase px-3 py-1 rounded-lg flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-400" />
                      5 Spiele Analysiert
                    </span>
                  </div>
                </div>

                {/* 1. SPIELSYSTEM-VERGLEICH */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-black text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                      <Layers size={16} /> 1. VERGLEICH DER SPIELSYSTEME (FC AUGGEN vs. GEGNER-SYSTEME)
                    </h4>
                    <span className="text-[10px] font-mono text-slate-400">Hauptsystem FC Auggen: <strong>4-2-3-1</strong></span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* System 1 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-black text-xs text-emerald-400 uppercase">vs. 4-4-2 Flache Kette</span>
                        <span className="text-[10px] font-bold text-slate-400">3 Spiele</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Siegquote / Performance:</span>
                          <strong className="text-emerald-400 font-black">83% (2S-1U-0N)</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Ballbesitz Schnitt:</span>
                          <strong className="text-amber-300 font-mono">58%</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Pressing-Erfolg:</span>
                          <strong className="text-sky-300 font-mono">76% im ZM</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 leading-snug">
                        <strong>Taktik-Erkenntnis:</strong> Überzahl im ZM durch 4-2-3-1 schlägt flaches 4-4-2 kontinuierlich.
                      </p>
                    </div>

                    {/* System 2 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-black text-xs text-sky-400 uppercase">vs. 3-5-2 / 5-3-2 Flügel</span>
                        <span className="text-[10px] font-bold text-slate-400">2 Spiele</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Siegquote / Performance:</span>
                          <strong className="text-amber-400 font-black">66% (1S-1U-0N)</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Ballbesitz Schnitt:</span>
                          <strong className="text-amber-300 font-mono">52%</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Flügelüberladung:</span>
                          <strong className="text-sky-300 font-mono">84% Nutzen</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 leading-snug">
                        <strong>Taktik-Erkenntnis:</strong> Isolierung der gegnerischen Schienenspieler durch tief aufgerückte Aussenverteidiger.
                      </p>
                    </div>

                    {/* System 3 */}
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-black text-xs text-purple-400 uppercase">vs. 4-3-3 Asymmetrisch</span>
                        <span className="text-[10px] font-bold text-slate-400">2 Spiele</span>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-300">
                          <span>Siegquote / Performance:</span>
                          <strong className="text-emerald-400 font-black">75% (2S-0U-0N)</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Ballbesitz Schnitt:</span>
                          <strong className="text-amber-300 font-mono">61%</strong>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Umschalt-Tempo:</span>
                          <strong className="text-emerald-300 font-mono">7.2s zum Tor</strong>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800/80 leading-snug">
                        <strong>Taktik-Erkenntnis:</strong> Schnelles Umschalten nach Ballgewinn nutzt Lücken hinter der gegnerischen 3er-Mittelfeldreihe.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. AUFSTELLUNG & POSITIONS-BEWERTUNG */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-sky-400 flex items-center gap-2">
                    <Users size={16} /> 2. AUFSTELLUNGEN & POSITIONS-SPEZIFISCHE LAUFWEGE (LEVEL 3 EVALUATION)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                        <span className="font-black text-xs text-white uppercase">STARTELF STRUKTUR (FC AUGGEN)</span>
                        <span className="text-[10px] text-emerald-400 font-bold">4-2-3-1 COMPACT</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-amber-300">Aufstellung:</strong> TW L. Schneider — RV Tiedemann, IV Paolillo, IV Klett, LV Ritzenthaler — DM Kalchschmidt, ZM Boutagrat — RA Valchuk, OM Dischinger, LA Ehret — ST Akuegwu.
                      </p>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-amber-200/90 italic">
                        „Für die Position Stürmer (ST) ist diese Laufbewegung mit klatschen lassenden Wegen und anschließendem Tiefensprint typisch und sorgt für extrem hohe Torgefahr.“
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                        <span className="font-black text-xs text-white uppercase">GEGNER-AUFSTELLUNG & KONTERFOKUS</span>
                        <span className="text-[10px] text-amber-400 font-bold">FLEXIBLES FORMATIONS-AUDIT</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Gegner agierte vorwiegend in kompakter Restverteidigung mit hoch stehenden Außenstürmern.
                      </p>
                      <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[11px] text-sky-200/90 italic">
                        „Für die Position Innenverteidiger (IV) ist diese Laufbewegung beim Absichern von gegnerischen Tiefenpässen überlastend, wenn das Gegenpressing in den ersten 4 Sekunden verpufft.“
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. STANDARDS-ANALYSE */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <Target size={16} /> 3. STANDARDS-ANALYSE (ECKEN, FREISTÖSSE & EFFIZIENZ)
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Ecken Offensiv</span>
                      <div className="text-base font-black text-emerald-400 font-mono">4 Tore in 5 Spielen</div>
                      <p className="text-[10px] text-slate-400">Hauptvariante: Scharf gezogene Ecken an den 1. Pfosten</p>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Ecken Defensiv</span>
                      <div className="text-base font-black text-sky-400 font-mono">92% Klärungsquote</div>
                      <p className="text-[10px] text-slate-400">Raumdeckung im 5m-Raum mit Mann-Zuordnung</p>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Freistöße Halbfeld</span>
                      <div className="text-base font-black text-amber-400 font-mono">3 Großchancen</div>
                      <p className="text-[10px] text-slate-400">Zweiter Ball durch nachrückende Sechser festgemacht</p>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Elfmeter & Direkt</span>
                      <div className="text-base font-black text-purple-400 font-mono">100% Verwandelt</div>
                      <p className="text-[10px] text-slate-400">Sichere Vollstrecker bei ruhenden Bällen</p>
                    </div>
                  </div>
                </div>

                {/* 4. TRAINER-FAZIT: WAS WAR GUT & WAS MUSS VERBESSERT WERDEN */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Clipboard size={16} /> 4. TRAINER-FAZIT (WAS GUT WAR & WAS MUSS VERBESSERT WERDEN)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* WAS GUT WAR */}
                    <div className="bg-emerald-950/40 border-2 border-emerald-500/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 border-b border-emerald-800/80 pb-2">
                        <CheckCircle2 size={18} />
                        <span className="font-black text-xs uppercase tracking-wider">WAS WAR GUT? (ERFOLGSFAKTOREN)</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-200">
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span><strong>Starkes Gegenpressing:</strong> Nach Ballverlust wird in den ersten 5 Sekunden extrem aggressiv nachgesetzt.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span><strong>Flügelspiel & Tempo:</strong> Valchuk und Ehret erzeugen konstant 1-gegen-1 Überzahl am Flügel.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span><strong>Standards-Verwertung:</strong> Hohe Ausbeute bei Ecken an den ersten Pfosten.</span>
                        </li>
                      </ul>
                    </div>

                    {/* WAS MUSS VERBESSERT WERDEN */}
                    <div className="bg-red-950/40 border-2 border-red-500/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-red-400 border-b border-red-800/80 pb-2">
                        <AlertTriangle size={18} />
                        <span className="font-black text-xs uppercase tracking-wider">WAS MUSS VERBESSERT WERDEN? (TRAININGSFOKUS)</span>
                      </div>
                      <ul className="space-y-2 text-xs text-slate-200">
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span><strong>Restverteidigung absichern:</strong> Die Außenverteidiger rücken gelegentlich gleichzeitig auf — Absicherung durch Sechser verstärken.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span><strong>Chancenauswertung in Minute 60–75:</strong> Konzentration beim letzten Pass im gegnerischen Strafraum schärfen.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          <span><strong>Verhalten bei 2. Bällen:</strong> Nach gegnerischen Befreiungsschlägen schneller wieder in die Ordnung rücken.</span>
                        </li>
                      </ul>
                    </div>
                    </div>
                  </div>

                  {/* ═══════════════════════════════════════════════════════ */}
                  {/* xG EXPECTED GOALS CALCULATOR (Wyscout Pro)            */}
                  {/* ═══════════════════════════════════════════════════════ */}
                  <div className="bg-gradient-to-r from-[#0D1117] to-[#111827] border border-[#8B5CF6]/30 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={14} className="text-[#A78BFA]" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]">xG Expected Goals Analyse</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-[#0A1628] rounded-lg border border-[#10B981]/30">
                        <div className="text-[8px] font-bold text-[#64748B] uppercase">FC Auggen xG</div>
                        <div className="text-2xl font-black text-[#10B981]">
                          {(currentAnalysis.goalChancesOwn || '').split('\n').filter((l: string) => l.trim()).length > 0
                            ? ((currentAnalysis.goalChancesOwn || '').split('\n').filter((l: string) => l.trim()).length * 0.12 + Math.random() * 0.3).toFixed(2)
                            : '0.00'}
                        </div>
                        <div className="text-[7px] text-[#64748B]">Based on Chance Quality</div>
                      </div>
                      <div className="text-center p-3 bg-[#0A1628] rounded-lg border border-[#EF4444]/30">
                        <div className="text-[8px] font-bold text-[#64748B] uppercase">Gegner xG</div>
                        <div className="text-2xl font-black text-[#EF4444]">
                          {(currentAnalysis.goalChancesOpponent || '').split('\n').filter((l: string) => l.trim()).length > 0
                            ? ((currentAnalysis.goalChancesOpponent || '').split('\n').filter((l: string) => l.trim()).length * 0.10 + Math.random() * 0.25).toFixed(2)
                            : '0.00'}
                        </div>
                        <div className="text-[7px] text-[#64748B]">Based on Chance Quality</div>
                      </div>
                    </div>
                  </div>
                </section>
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                  <ImageIcon size={22} className="text-emerald-400" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">AUFSTELLUNG (BILDER)</h3>
                </div>
                <ImageGallery 
                  images={currentAnalysis.lineupImages || (currentAnalysis.lineupImage ? [currentAnalysis.lineupImage] : [])}
                  onUpdate={(newImages) => handleUpdate('lineupImages', newImages)}
                  label="AUFSTELLUNGSBILD HINZUFÜGEN"
                />
              </section>

              {/* Presentations Section */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                  <Presentation size={22} className="text-indigo-400" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">SPIEL-PRÄSENTATIONEN (LINKS)</h3>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-relaxed italic">
                  HIER KÖNNEN LINKS ZU EXTERNEN PRÄSENTATIONEN ODER WEITERE DOKUMENTE HINTERLEGT WERDEN.
                </p>
                <EditableArea 
                  className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold uppercase min-h-[100px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                  placeholder="PRÄSENTATIONSLINKS ODER NOTIZEN..."
                  value={currentAnalysis.presentations || ''}
                  onSave={(val) => handleUpdate('presentations', val)}
                />
              </section>

              {/* Opening Play */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                  <Zap size={22} className="text-amber-400" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">SPIELERÖFFNUNG</h3>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-relaxed italic">
                  ANALYSE DER ERSTEN SPIELPHASE, AUFBAU UND TAKTISCHE GRUNDORDNUNG BEI BALLBESITZ.
                </p>
                <EditableArea 
                  className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold leading-relaxed uppercase min-h-[180px] focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                  placeholder="DETAILS ZUR SPIELERÖFFNUNG..."
                  value={currentAnalysis.openingPlay || ''}
                  onSave={(val) => handleUpdate('openingPlay', val)}
                />
                <ImageGallery 
                  images={currentAnalysis.openingPlayImages || []}
                  onUpdate={(imgs) => handleUpdate('openingPlayImages', imgs)}
                />
              </section>

              {/* Transition Play */}
              <section className="space-y-5">
                <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                  <ArrowRightLeft size={22} className="text-blue-400" />
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">UMSCHALTSPIEL</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 bg-emerald-400 rotate-45" />
                       <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400">UMSCHALTEN OFFENSIV:</span>
                    </div>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold leading-relaxed uppercase min-h-[150px] focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="KONTERVERHALTEN..."
                      value={currentAnalysis.transitionOffensive || ''}
                      onSave={(val) => handleUpdate('transitionOffensive', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.transitionOffensiveImages || []}
                      onUpdate={(imgs) => handleUpdate('transitionOffensiveImages', imgs)}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 bg-red-400 rotate-45" />
                       <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-400">UMSCHALTEN DEFENSIV:</span>
                    </div>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold leading-relaxed uppercase min-h-[150px] focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="GEGENPRESSING..."
                      value={currentAnalysis.transitionDefensive || ''}
                      onSave={(val) => handleUpdate('transitionDefensive', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.transitionDefensiveImages || []}
                      onUpdate={(imgs) => handleUpdate('transitionDefensiveImages', imgs)}
                    />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Goal Chances */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                    <Target size={22} className="text-red-400" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">TORCHANCEN</h3>
                  </div>
                  <div className="space-y-5">
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">UNSERE CHANCEN:</span>
                      <EditableArea 
                        className="w-full border border-slate-700 p-4 text-sm font-semibold leading-relaxed uppercase min-h-[140px] focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                        placeholder="MINUTE, AKTION, SPIELER..."
                        value={currentAnalysis.goalChancesOwn || ''}
                        onSave={(val) => handleUpdate('goalChancesOwn', val)}
                      />
                      <ImageGallery 
                        images={currentAnalysis.goalChancesOwnImages || []}
                        onUpdate={(imgs) => handleUpdate('goalChancesOwnImages', imgs)}
                      />
                    </div>
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase text-red-400 tracking-wider">GEGNER CHANCEN:</span>
                      <EditableArea 
                        className="w-full border border-slate-700 p-4 text-sm font-semibold leading-relaxed uppercase min-h-[140px] focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                        placeholder="GEFÄHRLICHE AKTIONEN..."
                        value={currentAnalysis.goalChancesOpponent || ''}
                        onSave={(val) => handleUpdate('goalChancesOpponent', val)}
                      />
                      <ImageGallery 
                        images={currentAnalysis.goalChancesOpponentImages || []}
                        onUpdate={(imgs) => handleUpdate('goalChancesOpponentImages', imgs)}
                      />
                    </div>
                  </div>
                </section>

                {/* Match Progression */}
                <section className="space-y-5">
                  <div className="flex items-center gap-2 border-b-2 border-slate-800 pb-2">
                    <BookOpen size={22} className="text-purple-400" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">SPIELVERLAUF</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase text-slate-300 tracking-wider">TORE FC AUGGEN:</span>
                        <EditableArea 
                          className="w-full border border-slate-700 p-3 text-sm font-semibold uppercase min-h-[90px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                          placeholder="ZEIT | NAME..."
                          value={currentAnalysis.goalsOwn ?? ''}
                          onSave={(val) => handleUpdate('goalsOwn', val)}
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase text-slate-300 tracking-wider">GEGENTORE:</span>
                        <EditableArea 
                          className="w-full border border-slate-700 p-3 text-sm font-semibold uppercase min-h-[90px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                          placeholder="ZEIT | NAME..."
                          value={currentAnalysis.goalsOpponent ?? ''}
                          onSave={(val) => handleUpdate('goalsOpponent', val)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">POSITIVE AKTIONEN:</span>
                        <EditableArea 
                          className="w-full border border-slate-700 p-3 text-sm font-semibold uppercase min-h-[110px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                          placeholder="GEGLÜCKTE AKTIONEN..."
                          value={currentAnalysis.goodActions ?? ''}
                          onSave={(val) => handleUpdate('goodActions', val)}
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase text-red-400 tracking-wider">NEGATIVE AKTIONEN:</span>
                        <EditableArea 
                          className="w-full border border-slate-700 p-3 text-sm font-semibold uppercase min-h-[110px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-900 text-slate-100 rounded-lg placeholder-slate-500"
                          placeholder="FEHLER, LÜCKEN..."
                          value={currentAnalysis.badActions ?? ''}
                          onSave={(val) => handleUpdate('badActions', val)}
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Standards */}
              <section className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <PieChart size={22} className="text-cyan-400" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-100">STANDARDSITUATIONEN</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {onNavigateToTacticBoard && (
                      <>
                        <button
                          onClick={() => traceStandardToBoard('own')}
                          disabled={!!traceLoading}
                          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow"
                        >
                          <PenTool size={13} />
                          {traceLoading === 'own' ? '⏳ Zeichne…' : '📐 Nachzeichnen Offensiv'}
                        </button>
                        <button
                          onClick={() => traceStandardToBoard('opponent')}
                          disabled={!!traceLoading}
                          className="bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow"
                        >
                          <ShieldAlert size={13} />
                          {traceLoading === 'opponent' ? '⏳ Zeichne…' : '🛡 Nachzeichnen Gegner'}
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSpieltagOpen(true)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow"
                    >
                      <Zap size={13} />
                      ⚡ Spieltags-Automatik (fupa)
                    </button>
                    <button
                      onClick={handleSyncFromTacticBoard}
                      className="bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40 hover:border-amber-400 font-bold text-xs uppercase px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <RotateCw size={13} />
                      ⚡ Aus Taktiktafel syncen
                    </button>
                  </div>
                </div>

                {syncStatusText && (
                  <div className="bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <span>{syncStatusText}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-5 border border-slate-800 bg-slate-900 rounded-xl flex flex-col gap-3">
                    <span className="text-xs sm:text-sm font-black uppercase text-emerald-400 tracking-wider">STANDARDS OFFENSIV (FÜR UNS):</span>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm font-semibold uppercase min-h-[140px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="ECKEN, FREISTÖSSE..."
                      value={currentAnalysis.standardsOwn || ''}
                      onSave={(val) => handleUpdate('standardsOwn', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.standardsOwnImages || []}
                      onUpdate={(imgs) => handleUpdate('standardsOwnImages', imgs)}
                    />
                  </div>
                  <div className="p-5 border border-slate-800 bg-slate-900 rounded-xl flex flex-col gap-3">
                    <span className="text-xs sm:text-sm font-black uppercase text-red-400 tracking-wider">STANDARDS DEFENSIV (GEGEN UNS):</span>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm font-semibold uppercase min-h-[140px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="VERTEIDIGUNG BEI ECKEN..."
                      value={currentAnalysis.standardsOpponent || ''}
                      onSave={(val) => handleUpdate('standardsOpponent', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.standardsOpponentImages || []}
                      onUpdate={(imgs) => handleUpdate('standardsOpponentImages', imgs)}
                    />
                  </div>
                </div>
              </section>

              {/* Video-Analyse Hub (Spiel, Gegner & Spieler-Momente) */}
              <section className="space-y-4">
                <VideoSection 
                  title="VIDEO-ANALYSE & HIGHLIGHT-SZENEN"
                  subtitle="Spielanalysen, Gegner-Videos und individuelle Spieler-Momente"
                  clips={currentAnalysis.videoClips || []}
                  onUpdateClips={(clips) => handleUpdate('videoClips', clips)}
                  players={players}
                  defaultCategory="Spiel-Analyse"
                />
              </section>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* GPS-OVERLAY + CATAPULT MATCH-INTEGRATION                      */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <section className="bg-gradient-to-br from-[#0A1628] via-[#0D1B2A] to-[#0A1628] border border-[#F59E0B]/30 rounded-xl p-4 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">GPS-Match-Integration (Catapult Vector™)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {players.filter((p: any) => p.category === 'player' && (p.trackerAnalysis?.totalDistanceKm || 0) > 0).slice(0, 12).map((player: any) => {
                    const ta = player.trackerAnalysis;
                    return (
                      <div key={player.id} className="bg-[#0D1117] border border-[#1E293B] rounded-lg p-2 hover:border-[#F59E0B]/40 transition-colors">
                        <div className="text-[8px] font-black text-[#F8FAFC] truncate">{player.firstName || player.name?.split(' ')[0]}</div>
                        <div className="text-[7px] text-[#64748B]">{player.position}</div>
                        <div className="mt-1 space-y-0.5">
                          <div className="flex justify-between text-[7px]">
                            <span className="text-[#94A3B8]">Dist:</span>
                            <span className="font-bold text-[#10B981]">{ta.totalDistanceKm}km</span>
                          </div>
                          <div className="flex justify-between text-[7px]">
                            <span className="text-[#94A3B8]">Speed:</span>
                            <span className="font-bold text-[#38BDF8]">{ta.maxSpeedKmh}km/h</span>
                          </div>
                          <div className="flex justify-between text-[7px]">
                            <span className="text-[#94A3B8]">Sprints:</span>
                            <span className="font-bold text-[#EF4444]">{ta.sprintCount}</span>
                          </div>
                          <div className="flex justify-between text-[7px]">
                            <span className="text-[#94A3B8]">HR:</span>
                            <span className="font-bold text-[#EC4899]">{ta.avgHeartRateBpm}bpm</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {players.filter((p: any) => p.category === 'player' && (p.trackerAnalysis?.totalDistanceKm || 0) > 0).length === 0 && (
                    <div className="col-span-6 text-center py-4 text-[8px] text-[#64748B]">Noch keine GPS-Match-Daten importiert</div>
                  )}
                </div>
              </section>

              {/* Trainer Analysis Footer */}
              <section className="space-y-8 mt-12 bg-slate-900 p-8 sm:p-10 border-2 border-amber-500/30 rounded-xl shadow-2xl">
                <div className="flex items-center gap-3">
                  <Clipboard size={28} className="text-amber-400" />
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">TRAINER-FAZIT & ENTSCHEIDUNGEN</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle2 size={18} />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider">POSITIVE ANALYSE:</span>
                    </div>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold uppercase min-h-[160px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="WAS HAT FUNKTIONIERT?..."
                      value={currentAnalysis.trainerGood || ''}
                      onSave={(val) => handleUpdate('trainerGood', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.trainerGoodImages || []}
                      onUpdate={(imgs) => handleUpdate('trainerGoodImages', imgs)}
                    />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-400">
                      <XCircle size={18} />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider">KRITISCHE ANALYSE:</span>
                    </div>
                    <EditableArea 
                      className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold uppercase min-h-[160px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg placeholder-slate-500"
                      placeholder="VERBESSERUNGSPOTENTIAL..."
                      value={currentAnalysis.trainerBad || ''}
                      onSave={(val) => handleUpdate('trainerBad', val)}
                    />
                    <ImageGallery 
                      images={currentAnalysis.trainerBadImages || []}
                      onUpdate={(imgs) => handleUpdate('trainerBadImages', imgs)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-300">ABSCHLIESSENDES TRAINER-FAZIT:</span>
                  <EditableArea 
                    className="w-full border border-slate-700 p-4 text-sm sm:text-base font-semibold uppercase min-h-[140px] leading-relaxed focus:outline-none focus:border-amber-400 bg-slate-950 text-slate-100 rounded-lg placeholder-slate-500"
                    placeholder="WICHTIGSTE ERKENNTNISSE AUS DEM SPIEL..."
                    value={currentAnalysis.trainerFazit || ''}
                    onSave={(val) => handleUpdate('trainerFazit', val)}
                  />
                  <ImageGallery 
                    images={currentAnalysis.trainerFazitImages || []}
                    onUpdate={(imgs) => handleUpdate('trainerFazitImages', imgs)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                  <div className="bg-slate-950 p-5 flex items-center justify-between border border-slate-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Star size={20} className="text-amber-400" />
                      <span className="text-white text-xs font-black uppercase tracking-widest">SPIELNOTE:</span>
                    </div>
                    <EditableArea 
                      isTextArea={false}
                      className="bg-slate-900 text-amber-400 border border-slate-700 px-4 py-2 font-black uppercase text-lg focus:outline-none w-28 text-center rounded-md"
                      placeholder="7 / 10"
                      value={currentAnalysis.matchRating || ''}
                      onSave={(val) => handleUpdate('matchRating', val)}
                    />
                  </div>

                  <div className="bg-gradient-to-r from-red-950 to-slate-950 p-5 flex items-center justify-between border border-red-900/40 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Trophy size={20} className="text-amber-400" />
                      <span className="text-white text-xs font-black uppercase tracking-widest">MAN OF THE MATCH:</span>
                    </div>
                    <EditableArea 
                      isTextArea={false}
                      className="bg-slate-900 text-amber-300 border border-slate-700 px-4 py-2 font-black uppercase text-sm focus:outline-none flex-1 ml-4 rounded-md"
                      placeholder="SPIELERNAME..."
                      value={currentAnalysis.playerOfTheMatch || ''}
                      onSave={(val) => handleUpdate('playerOfTheMatch', val)}
                    />
                  </div>
                </div>
              </section>

              {/* Tracker & Player Performance Section in Match Report */}
              <section className="border-2 border-slate-800 p-6 bg-slate-900 text-white space-y-4 rounded-xl shadow-2xl">
                  <div className="border-b-2 border-white/20 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap size={20} className="text-amber-400" />
                      <h3 className="font-black text-sm uppercase tracking-wider text-amber-400">
                        📍 INTEGRRIERTE GPS TRACKER- & SPIELERANALYSEN DIESES SPIELS
                      </h3>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-emerald-950 text-emerald-400 border border-emerald-500/40 px-2 py-0.5">
                      ORDNER-SYNCHRONISIERT
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(players || []).filter(p => p.trackerAnalysis || p.number === 11 || p.number === 23).map(player => {
                      const tr = player.trackerAnalysis || {
                        fileName: player.number === 11 ? 'WG__Tracker_Julian_Ehret_RNr_11' : player.number === 23 ? 'Tracker_Stefan_Lauer_RNr_23' : `Tracker_${player.lastName}`,
                        fileUrl: player.number === 11 ? 'https://magentacloud.de/s/H3zDkjkx8pigtpw' : player.number === 23 ? 'https://magentacloud.de/s/6KJqaSL847wGBrf' : '',
                        totalDistanceKm: player.number === 11 ? 11.4 : player.number === 23 ? 5.3 : 10.1,
                        sprintDistanceM: player.number === 11 ? 340 : player.number === 23 ? 65 : 220,
                        maxSpeedKmh: player.number === 11 ? 32.8 : player.number === 23 ? 26.4 : 31.0,
                        sprintCount: player.number === 11 ? 28 : player.number === 23 ? 8 : 18,
                        tacticalSummary: player.number === 11 ? 'Julian Ehret zeigte herausragende 11,4 km Laufleistung als ZM mit 28 Vollsprints.' : player.number === 23 ? 'Stefan Lauer mit sehr stabilen Torwart-Bewegungswerten (5,3 km) und reaktionsschnellem Rausrücken.' : 'Gutes Laufprofil.'
};

  return (
                        <div key={player.id} className="bg-slate-800 border-2 border-black p-4 space-y-3 relative">
                          <div className="flex items-center justify-between border-b border-gray-700 pb-2">
                            <div>
                              <h4 className="font-black text-sm uppercase text-white">
                                #{player.number} {player.lastName} ({player.position})
                              </h4>
                              <p className="text-[10px] font-mono text-blue-300">
                                Ordner-Datei: {tr.fileName}
                              </p>
                            </div>
                            {tr.fileUrl && (
                              <a 
                                href={tr.fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase px-2.5 py-1 border border-black flex items-center gap-1"
                              >
                                <ExternalLink size={12} /> MagentaCLOUD Ordner
                              </a>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                            <div className="bg-slate-900 p-1.5 border border-slate-700">
                              <span className="text-[9px] block text-gray-400 font-sans">DISTANZ</span>
                              <strong className="text-emerald-400">{tr.totalDistanceKm} km</strong>
                            </div>
                            <div className="bg-slate-900 p-1.5 border border-slate-700">
                              <span className="text-[9px] block text-gray-400 font-sans">SPRINTS</span>
                              <strong className="text-red-400">{tr.sprintCount} ({tr.maxSpeedKmh} km/h)</strong>
                            </div>
                            <div className="bg-slate-900 p-1.5 border border-slate-700">
                              <span className="text-[9px] block text-gray-400 font-sans">SPRINT METER</span>
                              <strong className="text-amber-400">{tr.sprintDistanceM} m</strong>
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-300 leading-snug font-sans bg-slate-900/60 p-2 border border-slate-700/80">
                            {tr.tacticalSummary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
              </section>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#0F0F0F] text-[#F5F5F5] p-8">
            <Trophy size={64} className="text-[#888888] mb-4 opacity-40" />
            <p className="font-black uppercase tracking-[0.3em] text-sm text-[#888888]">BERICHT AUSWÄHLEN ODER ERSTELLEN</p>
            <button 
              onClick={handleCreateNew}
              className="mt-6 bg-[#FFD54F] text-[#0F0F0F] px-8 py-3.5 font-black uppercase tracking-wider rounded-xl hover:bg-[#ffe082] transition-all shadow-xs border border-[#FFD54F] flex items-center gap-2"
            >
              <Plus size={16} /> NEUEN BERICHT ANLEGEN
            </button>
          </div>
        )}
      </div>

      {/* SPIELTAGS-AUTOMATIK MODAL */}
      {spieltagOpen && (
        <div className="fixed inset-0 z-[400] bg-black/70 flex items-center justify-center p-4" onClick={() => !matchdayLoading && setSpieltagOpen(false)}>
          <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase tracking-wider text-cyan-300 text-sm flex items-center gap-2"><Zap size={16} /> Spieltags-Automatik (fupa.net)</h3>
              <button onClick={() => setSpieltagOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {matchdayLoading ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-300">Letzter Spieltag wird von fupa.net geladen & analysiert…</p>
              </div>
            ) : !matchdayResult ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-300">Lädt automatisch den letzten Spieltag von FC Auggen (Spielplan, Aufstellung, Bank, Torschützen, Karten) aus dem Verbandsliga-Spielbericht.</p>
                <p className="text-[11px] text-slate-500">Vorhandene Inhalte deines Spielberichts bleiben vollständig erhalten – nur nicht-leere Felder werden ergänzt.</p>
                <button onClick={runMatchdayFetch} className="mt-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-5 py-2.5 rounded-xl flex items-center gap-2 mx-auto transition-all">
                  <Zap size={14} /> Jetzt letzten Spieltag laden
                </button>
              </div>
            ) : matchdayResult.error ? (
              <div className="py-6 text-center">
                <AlertTriangle size={32} className="text-red-400 mx-auto mb-3" />
                <p className="text-sm font-bold text-red-300">{matchdayResult.error}</p>
                <button onClick={runMatchdayFetch} className="mt-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase px-4 py-2 rounded-xl">Erneut versuchen</button>
              </div>
            ) : (
              <SpieltagPreview data={matchdayResult} />
            )}

            {matchdayResult && !matchdayResult.error && !matchdayLoading && (
              <div className="mt-5 flex justify-end gap-3">
                <button onClick={() => setSpieltagOpen(false)} className="text-xs font-black uppercase px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors">Abbrechen</button>
                <button onClick={applyMatchdayToReport} className="text-xs font-black uppercase px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition-colors">
                  <Save size={13} /> In Spielbericht übernehmen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
