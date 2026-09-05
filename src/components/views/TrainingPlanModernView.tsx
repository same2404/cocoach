import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Calendar,
  Users,
  Clock,
  Activity,
  MessageSquareText,
  Maximize2,
  Minimize2,
  Printer,
  Dumbbell,
  Zap,
  Timer
} from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useCollectionSync } from '../../hooks/useCollectionSync';
import { TrainingSession } from '../../types';
import { useClub } from '../../contexts/ClubContext';
import { normalizeDateToISO } from '../../lib/dateUtils';
import { db } from '../../firebase';

interface TrainingPlanModernViewProps {
  players?: any[];
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
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

const compressImage = (base64: string, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
  });
};

const ImageUpload: React.FC<{
  images: string[];
  onAdd: (base64: string | string[]) => void;
  onRemove: (idx: number) => void;
  isEditing?: boolean;
  compact?: boolean;
}> = ({ images, onAdd, onRemove, isEditing = true, compact }) => {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const processFiles = async (blobs: File[]) => {
    const processed = await Promise.all(
      blobs.map(async (blob) => {
        const base64 = await fileToBase64(blob);
        return compressImage(base64);
      })
    );
    if (processed.length === 1) onAdd(processed[0]);
    else onAdd(processed);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) await processFiles(files);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!isEditing) return;
    const items = e.clipboardData.items;
    const blobs: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) blobs.push(blob);
      }
    }
    if (blobs.length > 0) await processFiles(blobs);
  };

  return (
    <div onPaste={handlePaste} className="flex flex-wrap items-center gap-2 mt-3">
      {(images || []).map((img, idx) => (
        <div key={idx} className="relative group">
          <img
            src={img}
            alt={`Bild ${idx + 1}`}
            onClick={() => isEditing && setLightbox(img)}
            className="h-20 rounded-lg border border-[#334155] object-cover cursor-pointer hover:opacity-80 transition-opacity"
          />
          {isEditing && (
            <button
              onClick={() => onRemove(idx)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E11D48] text-white flex items-center justify-center text-[10px] font-black cursor-pointer shadow hover:bg-[#BE123C]"
              title="Bild entfernen"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {isEditing && (
        <label className={`flex ${compact ? 'h-20 w-20' : 'p-2'} flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#334155] text-slate-400 hover:border-[#10B981] hover:text-[#10B981] cursor-pointer transition-colors text-center`}>
          <Plus size={16} />
          <span className="text-[8px] font-black uppercase">Bild hinzufügen</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
        </label>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-[500] bg-black/80 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Vollbild" className="max-w-full max-h-full rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
};

const STATUS_LABEL: Record<string, string> = {
  '1': 'ANW',
  A: 'AUFBAU',
  B: 'VERLETZT',
  k: 'KRANK',
  e: 'ENTSC',
  Aktiv: 'ANW',
  U23: 'U23',
  U19: 'U19',
};

const STATUS_ORDER = ['1', 'B', 'k', 'A', 'e'];

function statusColor(status: string): string {
  if (status === '1' || !status || status === 'Aktiv') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
  if (status === 'A') return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
  if (status === 'B') return 'bg-red-500/15 text-red-300 border-red-500/40';
  if (status === 'k') return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
  if (status === 'e') return 'bg-blue-500/15 text-blue-300 border-blue-500/40';
  return 'bg-slate-500/15 text-slate-300 border-slate-600/40';
}

const COLLECTION = 'training_sessions';

export const TrainingPlanModernView: React.FC<TrainingPlanModernViewProps> = ({ players }) => {
  const { activeClub } = useClub();
  const { data: sessions, loading } = useCollectionSync<TrainingSession>(COLLECTION, 'id', 'date', 'asc', true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const na = normalizeDateToISO(a.date) || '';
      const nb = normalizeDateToISO(b.date) || '';
      return na.localeCompare(nb);
    });
  }, [sessions]);

  const selected = useMemo(() => sortedSessions.find(s => s.id === selectedId) || null, [sortedSessions, selectedId]);

  const flashNote = useCallback((msg: string) => {
    setSaveNote(msg);
    setTimeout(() => setSaveNote(null), 1500);
  }, []);

  const saveField = useCallback((id: string, field: string, value: any) => {
    const docRef = doc(db, COLLECTION, id);
    setDoc(docRef, { [field]: value }, { merge: true })
      .then(() => flashNote('Gespeichert ✓'))
      .catch((err) => {
        console.error('Fehler beim Speichern der Trainingseinheit:', err);
        flashNote('Speichern fehlgeschlagen');
      });
  }, [flashNote]);

  const addNewSession = useCallback(() => {
    const now = new Date();
    const iso = now.toISOString().split('T')[0];
    const newSession: TrainingSession = {
      id: `ts${Date.now()}`,
      date: iso,
      weekday: new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(now),
      group: 'CoCoach',
      load: 'Mittel',
      loadLevel: 5,
      duration: '90 Min',
      weeklyFocus: '',
      sessionFocus: '',
      trainer: 'Amin',
      intensity: 'Mittel',
      location: '',
      opponent: '',
      players: (players || []).map(p => ({ name: p.lastName || '', position: p.position || '', status: '1' as any, category: p.category })),
      content: { warmup: '', warmupDuration: '', main1: '', main1Duration: '', main2: '', main2Duration: '', closing: '', closingDuration: '' },
      importantInfo: '',
      remarks: '',
    };
    const docRef = doc(db, COLLECTION, newSession.id);
    setDoc(docRef, newSession)
      .then(() => {
        setSelectedId(newSession.id);
        flashNote('Neue Einheit erstellt ✓');
      })
      .catch((err) => {
        console.error('Fehler beim Erstellen der Einheit:', err);
        flashNote('Erstellen fehlgeschlagen');
      });
  }, [players, flashNote]);

  const deleteTraining = useCallback((id: string) => {
    const docRef = doc(db, COLLECTION, id);
    deleteDoc(docRef)
      .then(() => {
        if (selectedId === id) setSelectedId(null);
        flashNote('Einheit gelöscht');
      })
      .catch((err) => {
        console.error('Fehler beim Löschen der Einheit:', err);
      });
  }, [selectedId, flashNote]);

  const togglePlayerStatus = useCallback((pIdx: number, currentStatus: string) => {
    if (!selected) return;
    if (pIdx < 0) return;
    const norm = currentStatus === 'Aktiv' ? '1' : currentStatus;
    const idx = STATUS_ORDER.indexOf(norm);
    const next = STATUS_ORDER[(idx < 0 ? 0 : idx + 1) % STATUS_ORDER.length];
    const updated = (selected.players || []).map((p: any, i: number) => (i === pIdx ? { ...p, status: next as any } : p));
    saveField(selected.id, 'players', updated);
  }, [selected, saveField]);

  const formatDateLong = useCallback((dateStr: string) => {
    const iso = normalizeDateToISO(dateStr);
    if (!iso) return dateStr;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }, []);

  const formatDateShort = useCallback((dateStr: string) => {
    const iso = normalizeDateToISO(dateStr);
    if (!iso) return dateStr;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
  }, []);

  const isToday = useCallback((dateStr: string) => {
    const iso = normalizeDateToISO(dateStr);
    const todayIso = new Date().toISOString().split('T')[0];
    return iso === todayIso;
  }, []);

  const isUpcoming = useCallback((dateStr: string) => {
    const iso = normalizeDateToISO(dateStr);
    if (!iso) return false;
    const todayIso = new Date().toISOString().split('T')[0];
    return iso > todayIso;
  }, []);

  const playerGroups = useMemo(() => {
    const groups: { key: string; title: string; accent: string; players: any[] }[] = [
      { key: 'player', title: 'Spielerkader', accent: 'text-[#10B981]', players: [] },
      { key: 'coach', title: 'Trainerteam', accent: 'text-sky-400', players: [] },
      { key: 'staff', title: 'Funktionsteam', accent: 'text-purple-400', players: [] },
      { key: 'medical', title: 'Medizinische Abteilung', accent: 'text-rose-400', players: [] },
    ];
    const fallback = groups[0];
    (selected?.players || []).forEach((p: any) => {
      const cat = (p.category || '').toLowerCase();
      const group = groups.find(g => g.key === cat) || fallback;
      group.players.push(p);
    });
    return groups.filter(g => g.players.length > 0);
  }, [selected]);

  const playerList = ((selected?.players || []) as any[]).filter((p: any) => {
    const cat = (p.category || '').toLowerCase();
    return cat !== 'coach' && cat !== 'staff' && cat !== 'medical';
  });
  const totalAnwesend = playerList.filter(p => p.status === '1' || !p.status).length;
  const totalVerletzt = playerList.filter(p => p.status === 'B').length;
  const totalKrank = playerList.filter(p => p.status === 'k').length;

  const sessionAttendance = useCallback((s: TrainingSession) => {
    const list = (s.players || []).filter((p: any) => {
      const c = (p.category || '').toLowerCase();
      return c !== 'coach' && c !== 'staff' && c !== 'medical';
    });
    const present = list.filter((p: any) => p.status === '1' || !p.status || p.status === 'Aktiv').length;
    return { total: list.length, present };
  }, []);

  const sessionIdentity = useCallback((s: TrainingSession) => {
    const focus = s.weeklyFocus || s.sessionFocus || s.group || 'Trainingseinheit';
    const dur = s.duration || '—';
    return { focus, dur };
  }, []);

  const contentBlocks = selected ? [
    { key: 'warmup' as const, title: 'Aktivierung', icon: Timer, color: '#10B981', text: selected.content?.warmup, images: (selected.content?.warmupImages || []) as string[] },
    { key: 'main1' as const, title: 'Hauptteil', icon: Dumbbell, color: '#F59E0B', text: selected.content?.main1, images: (selected.content?.main1Images || []) as string[] },
    { key: 'main2' as const, title: 'SP Hauptteil 2', icon: Zap, color: '#EF4444', text: selected.content?.main2, images: (selected.content?.main2Images || []) as string[] },
    { key: 'closing' as const, title: 'Schluss', icon: Timer, color: '#10B981', text: selected.content?.closing, images: (selected.content?.closingImages || []) as string[] },
  ] : [];

  const imagesFieldForBlock = (blockKey: string): keyof TrainingSession['content'] => {
    return `${blockKey}Images` as keyof TrainingSession['content'];
  };

  const addImagesToBlock = useCallback((blockKey: string, data: string | string[]) => {
    if (!selected) return;
    const imagesField = imagesFieldForBlock(blockKey);
    const newImages = [
      ...((selected.content?.[imagesField] as string[]) || []),
      ...(Array.isArray(data) ? data : [data]),
    ];
    const content = { ...(selected.content || {}) };
    (content as any)[imagesField] = newImages;
    saveField(selected.id, 'content', content);
  }, [selected, saveField]);

  const removeImageFromBlock = useCallback((blockKey: string, idx: number) => {
    if (!selected) return;
    const imagesField = imagesFieldForBlock(blockKey);
    const newImages = ((selected.content?.[imagesField] as string[]) || []).filter((_, i) => i !== idx);
    const content = { ...(selected.content || {}) };
    (content as any)[imagesField] = newImages;
    saveField(selected.id, 'content', content);
  }, [selected, saveField]);

  const setContentField = useCallback((blockKey: string, value: string) => {
    if (!selected) return;
    const content = { ...(selected.content || {}) };
    content[blockKey] = value;
    saveField(selected.id, 'content', content);
  }, [selected, saveField]);

  const addTopImages = useCallback((field: string, data: string | string[]) => {
    if (!selected) return;
    const newImages = [...((selected as any)[field] || []), ...(Array.isArray(data) ? data : [data])];
    saveField(selected.id, field, newImages);
  }, [selected, saveField]);

  const removeTopImages = useCallback((field: string, idx: number) => {
    if (!selected) return;
    const newImages = ((selected as any)[field] || []).filter((_: string, i: number) => i !== idx);
    saveField(selected.id, field, newImages);
  }, [selected, saveField]);

  const textareaCls = 'w-full bg-[#0A0E17] border border-[#334155] text-white text-xs font-medium rounded-lg px-2.5 py-2 focus:outline-none focus:border-[#10B981] placeholder:text-slate-600 leading-relaxed resize-y min-h-[80px]';

  const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const printTrainingPhases = useCallback(() => {
    if (!selected) return;
    const title = `${esc(activeClub.name)} · Trainingsphasen`;
    const dateLabel = formatDateLong(selected.date) || '—';
    const phaseBlocks = contentBlocks.map((b, i) => {
      const text = esc(b.text);
      const imgs = (b.images || []).map((img: string, idx: number) =>
        `<div style="margin-bottom:8px;page-break-inside:avoid;"><img src="${img}" alt="Bild ${idx + 1}" style="max-width:100%;max-height:260px;border:1px solid #ccc;border-radius:6px;"/></div>`
      ).join('');
      return `
        <div style="margin-bottom:16px;border:1px solid #ddd;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
          <div style="background:${b.color};color:#fff;padding:8px 14px;font-weight:700;font-size:15px;letter-spacing:1px;">${i + 1}. ${esc(b.title)}</div>
          <div style="padding:14px 16px;font-size:14px;line-height:1.55;color:#222;white-space:pre-wrap;">${text || 'Kein Inhalt eingetragen.'}</div>
          ${imgs}
        </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 0; background: #fff; color: #111; }
  .sheet { max-width: 900px; margin: 0 auto; padding: 28px; }
  .header { border-bottom: 3px solid #111; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .header h1 { margin: 0; font-size: 22px; letter-spacing: 1px; text-transform: uppercase; }
  .header .sub { font-size: 12px; color: #555; margin-top: 4px; }
  .header .date { font-size: 13px; font-weight: 600; color: #333; text-align: right; }
  @media print { .sheet { padding: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1>${esc(activeClub.name)} · Trainingsphasen</h1>
        <div class="sub">Schwerpunkt: ${esc(selected.sessionFocus || '—')}</div>
      </div>
      <div class="date">${dateLabel}</div>
    </div>
    ${phaseBlocks}
  </div>
  <script>
    window.onload = function () { window.print(); };
  <\/script>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=920,height=800');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
    }
  }, [selected, activeClub, contentBlocks, formatDateLong]);

  return (
    <div className={`flex flex-col h-full ${isFullscreen ? 'fixed inset-0 z-[300]' : ''} bg-[#0A0E17] rounded-2xl border border-[#334155] shadow-xl overflow-hidden`}>
      {isFullscreen && (
        <div className="flex items-center justify-between bg-[#121824] border-b border-[#334155] px-4 py-2 shrink-0">
          <span className="text-xs font-black uppercase text-[#F59E0B] tracking-wider">Vollbild-Modus — ESC zum Schließen</span>
          <button onClick={() => setIsFullscreen(false)} className="flex items-center gap-1 bg-[#1E293B] border border-[#334155] text-white px-3 py-1.5 font-black text-[10px] uppercase rounded-lg hover:border-[#F59E0B]/50 cursor-pointer">
            <Minimize2 size={12} /> Schließen
          </button>
        </div>
      )}

      {saveNote && (
        <div className="fixed z-[400] top-4 right-4 bg-[#10B981] text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg">
          {saveNote}
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {/* ══════════ SIDEBAR — Einheiten-Liste ══════════ */}
        <aside className="w-60 lg:w-72 shrink-0 bg-[#121824] border-r border-[#334155] flex flex-col min-h-0">
          <div className="p-4 border-b border-[#334155]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500">{activeClub.name}</div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Trainingsplan</h2>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-black text-slate-400 bg-[#0A0E17] border border-[#334155] rounded-lg px-2 py-1">
                <Calendar size={12} /> {sortedSessions.length}
              </span>
            </div>
            <button onClick={addNewSession} className="w-full flex items-center justify-center gap-2 bg-[#10B981] text-white px-4 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#059669] transition-colors cursor-pointer shadow-lg">
              <Plus size={16} /> Neue Einheit
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            {loading && sortedSessions.length === 0 && (
              <div className="text-center py-10 text-xs font-bold text-slate-500">Lade Einheiten…</div>
            )}
            {!loading && sortedSessions.length === 0 && (
              <div className="text-center py-10">
                <Calendar className="mx-auto mb-3 text-slate-600" size={32} />
                <p className="text-xs font-bold text-slate-400">Noch keine Einheiten vorhanden.</p>
              </div>
            )}
            {sortedSessions.map(s => {
              const active = s.id === selectedId;
              const upcoming = isUpcoming(s.date);
              const today = isToday(s.date);
              const att = sessionAttendance(s);
              const identity = sessionIdentity(s);
              const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                    active
                      ? 'bg-[#0A1628] border-[#F59E0B] shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                      : 'bg-[#1E293B] border-[#334155] hover:border-[#10B981]/60 hover:bg-[#0A1628]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-black ${today ? 'text-[#F59E0B]' : active ? 'text-[#F59E0B]' : 'text-slate-300'}`}>
                      {formatDateShort(s.date)}
                    </span>
                    {today ? (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B]">Heute</span>
                    ) : upcoming ? (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">Kommend</span>
                    ) : (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-500/15 text-slate-400 border border-slate-600/30">Vergangen</span>
                    )}
                  </div>
                  <div className="font-bold text-slate-100 text-xs truncate mb-2 leading-snug">
                    {identity.focus}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[9px] font-black uppercase ${attPct >= 90 ? 'text-emerald-300' : attPct >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>
                      {att.present}/{att.total} anwesend
                    </span>
                    <span className={`text-[9px] font-black ${attPct >= 90 ? 'text-emerald-300' : attPct >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>
                      {attPct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <Clock size={11} /> {identity.dur}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <Users size={11} /> {att.total}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ══════════ DETAIL — Rechter Bereich ══════════ */}
        <main className="flex-1 bg-[#0A0E17] overflow-y-auto min-w-0">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <Calendar className="text-slate-700 mb-4" size={48} />
              <p className="text-sm font-black text-slate-400">Wähle links eine Trainingseinheit aus</p>
              <p className="text-xs text-slate-500 mt-1">oder erstelle über „Neue Einheit“ einen Trainingsplan.</p>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                <button onClick={() => setIsFullscreen(!isFullscreen)} className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] text-white px-3 py-2 font-black text-[10px] uppercase rounded-lg hover:border-[#F59E0B]/50 cursor-pointer">
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />} {isFullscreen ? 'Normal' : 'Vollbild'}
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 bg-[#10B981] text-white px-3 py-2 font-black text-[10px] uppercase rounded-lg hover:bg-[#059669] cursor-pointer">
                    <Printer size={14} /> Drucken
                  </button>
                  <button onClick={printTrainingPhases} className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] text-white px-3 py-2 font-black text-[10px] uppercase rounded-lg hover:border-[#F59E0B]/50 cursor-pointer">
                    <Activity size={14} className="text-[#F59E0B]" /> Trainingsphasen drucken
                  </button>
                  <button onClick={() => deleteTraining(selected.id)} className="flex items-center gap-1.5 bg-[#E11D48]/15 text-[#E11D48] border border-[#E11D48]/40 px-3 py-2 font-black text-[10px] uppercase rounded-lg hover:bg-[#E11D48]/25 cursor-pointer">
                    <Trash2 size={14} /> Löschen
                  </button>
                </div>
              </div>

              {/* Header - Dokumentkopf */}
              <div className="bg-[#121824] border border-[#334155] rounded-lg mb-6 overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#334155] px-4 py-2.5">
                  <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Trainingsplan</h1>
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#F59E0B]">{activeClub.name}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-x sm:divide-y lg:divide-y-0 divide-[#334155]">
                  {/* Datum */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Datum</div>
                    <input type="date" className="w-full bg-[#0A0E17] border border-[#334155] text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981] [color-scheme:dark]" value={normalizeDateToISO(selected.date) || selected.date || ''} onChange={(e) => saveField(selected.id, 'date', e.target.value)} />
                  </div>
                  {/* Wochentag */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Wochentag</div>
                    <input type="text" className="w-full bg-transparent border border-transparent text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981]" value={selected.weekday || ''} placeholder="—" onChange={(e) => saveField(selected.id, 'weekday', e.target.value)} />
                  </div>
                  {/* T-Gruppe */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">T-Gruppe</div>
                    <div className="text-[11px] font-bold px-1.5 py-1 text-white">{activeClub.name}</div>
                  </div>
                  {/* Belastung */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Belastung</div>
                    <div className="flex items-center gap-1">
                      <select className="flex-1 bg-[#0A0E17] border border-[#334155] text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981] cursor-pointer" value={selected.load || 'Mittel'} onChange={(e) => saveField(selected.id, 'load', e.target.value)}>
                        <option value="Niedrig">Niedrig</option>
                        <option value="Mittel">Mittel</option>
                        <option value="Hoch">Hoch</option>
                        <option value="Sehr hoch">Sehr hoch</option>
                      </select>
                      <input type="number" min={0} max={9} className="w-10 bg-[#0A0E17] border border-[#334155] text-white text-[11px] font-bold rounded-md px-1 py-1 text-center focus:outline-none focus:border-[#10B981]" value={selected.loadLevel ?? 5} onChange={(e) => saveField(selected.id, 'loadLevel', parseInt(e.target.value) || 0)} />
                    </div>
                  </div>
                  {/* Dauer */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Dauer</div>
                    <input type="text" className="w-full bg-transparent border border-transparent text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981]" value={selected.duration || ''} placeholder="—" onChange={(e) => saveField(selected.id, 'duration', e.target.value)} />
                  </div>
                  {/* Schwerpunkt Einheit */}
                  <div className="px-3 py-2 col-span-2 sm:col-span-2 lg:col-span-3">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Schwerpunkt Einheit</div>
                    <input type="text" className="w-full bg-transparent border border-transparent text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981]" value={selected.sessionFocus || ''} placeholder="Ballbesitz, Umschalten..." onChange={(e) => saveField(selected.id, 'sessionFocus', e.target.value)} />
                  </div>
                  {/* Trainer */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Trainer</div>
                    <input type="text" className="w-full bg-transparent border border-transparent text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981]" value={selected.trainer || ''} placeholder="—" onChange={(e) => saveField(selected.id, 'trainer', e.target.value)} />
                  </div>
                  {/* Ort */}
                  <div className="px-3 py-2">
                    <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1">Ort</div>
                    <input type="text" className="w-full bg-transparent border border-transparent text-white text-[11px] font-bold rounded-md px-1.5 py-1 focus:outline-none focus:border-[#10B981]" value={selected.location || ''} placeholder="—" onChange={(e) => saveField(selected.id, 'location', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Spieler-Tabelle */}
              <div className="bg-[#121824] border border-[#334155] rounded-lg overflow-hidden mb-6">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#334155]">
                  <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
                    <Users size={14} className="text-[#F59E0B]" /> Spielerübersicht
                  </h2>
                  <span className="text-[9px] font-bold text-slate-400">Klick auf Status: ANW › VERLETZT › KRANK › AUFBAU › ENTSCHULDIGT</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0A0E17]">
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155] border-r border-[#334155] w-8">Nr</th>
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155] border-r border-[#334155]">Spieler</th>
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155] border-r border-[#334155] w-20">Position</th>
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155] border-r border-[#334155] w-28">Status</th>
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155] border-r border-[#334155] w-24">Erwärmung</th>
                        <th className="px-3 py-2 text-[8px] font-black uppercase tracking-wider text-slate-400 border-b border-[#334155]">Intensität</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rows = (playerGroups.find(g => g.key === 'player')?.players || []);
                        if (rows.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="px-3 py-3 text-center text-[10px] font-bold text-slate-500 border-b border-[#334155]">Keine Spieler eingetragen</td>
                            </tr>
                          );
                        }
                        return rows.map((p: any, i: number) => {
                          const pIdx = (selected.players || []).indexOf(p);
                          return (
                            <tr key={i} className="bg-[#121824] hover:bg-[#0A1628]">
                              <td className="px-3 py-1.5 text-[10px] font-black text-slate-500 border-b border-r border-[#334155]">{i + 1}</td>
                              <td className="px-3 py-1.5 text-[11px] font-bold text-white border-b border-r border-[#334155]">{p.name}</td>
                              <td className="px-3 py-1.5 text-[10px] font-bold text-[#F59E0B] border-b border-r border-[#334155]">{p.position}</td>
                              <td className="px-3 py-1.5 border-b border-r border-[#334155]">
                                <button onClick={() => togglePlayerStatus(pIdx, p.status)} className={`text-[9px] font-black px-2 py-0.5 rounded-full border cursor-pointer transition-all hover:scale-105 ${statusColor(p.status)}`}>
                                  {STATUS_LABEL[p.status] || (p.status || 'ANW')}
                                </button>
                              </td>
                              <td className="px-3 py-1.5 border-b border-r border-[#334155] text-slate-600"></td>
                              <td className="px-3 py-1.5 border-b border-[#334155] text-slate-600"></td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Anwesenheits-Summary */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-[#0A1628] border border-[#334155] rounded-lg mb-6">
                <span className="text-[10px] font-bold text-slate-400">Anwesenheit:</span>
                <span className="text-[10px] font-black text-slate-200">Gesamt <span className="text-white">{playerList.length}</span></span>
                <span className="text-[10px] font-black text-emerald-300">Anwesend {totalAnwesend}</span>
                <span className="text-[10px] font-black text-red-300">Verletzt {totalVerletzt}</span>
                <span className="text-[10px] font-black text-amber-300">Krank {totalKrank}</span>
              </div>

              {/* Trainingsphasen */}
              <div className="bg-[#121824] border border-[#334155] rounded-lg overflow-hidden mb-6">
                <div className="px-4 py-2.5 border-b border-[#334155]">
                  <h2 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-white">
                    <Activity size={14} className="text-[#F59E0B]" /> Trainingsphasen
                  </h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                  {contentBlocks.map((b, i) => (
                    <div key={i} className="rounded-lg overflow-hidden border border-[#334155] flex flex-col">
                      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: b.color }}>
                        <b.icon size={13} className="text-white" />
                        <span className="text-[11px] font-black uppercase tracking-wider text-white">{b.title}</span>
                      </div>
                      <div className="flex-1 p-2.5 bg-[#121824]">
                        <textarea
                          className={textareaCls}
                          style={{ minHeight: '150px' }}
                          placeholder={`Übungen für ${b.title}...`}
                          value={b.text || ''}
                          onChange={(e) => setContentField(b.key, e.target.value)}
                        />
                        <ImageUpload
                          images={b.images}
                          onAdd={(data) => addImagesToBlock(b.key, data)}
                          onRemove={(idx) => removeImageFromBlock(b.key, idx)}
                          isEditing
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Statistik + Bemerkungen */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
                {/* Statistik-Box */}
                <div className="lg:col-span-2 bg-[#121824] border border-[#334155] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-[#1E293B] border border-[#334155] rounded-lg text-[#F59E0B]">
                      <Users size={14} />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Statistik</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-[#0A0E17] border border-[#334155] rounded-lg p-2 text-center">
                      <div className="text-lg font-black text-white">{playerList.length}</div>
                      <div className="text-[8px] font-black uppercase text-slate-500">Spieler</div>
                    </div>
                    <div className="bg-[#0A0E17] border border-[#334155] rounded-lg p-2 text-center">
                      <div className="text-lg font-black text-[#F59E0B]">{playerList.filter(p => (p.position || '').toUpperCase().startsWith('TW')).length}</div>
                      <div className="text-[8px] font-black uppercase text-slate-500">TW</div>
                    </div>
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1.5">Wichtige Infos für die Spieler</div>
                  <textarea
                    className={textareaCls}
                    placeholder="Hinweise für die Spieler..."
                    value={selected.importantInfo || ''}
                    onChange={(e) => saveField(selected.id, 'importantInfo', e.target.value)}
                  />
                  <ImageUpload
                    images={(selected.importantInfoImages || []) as string[]}
                    onAdd={(data) => addTopImages('importantInfoImages', data)}
                    onRemove={(idx) => removeTopImages('importantInfoImages', idx)}
                    isEditing
                  />
                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 mb-1.5 mt-3">Kennzeichnungen</div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] rounded-lg px-2 py-1.5">
                      <span className="w-4 h-4 rounded bg-emerald-500" />
                      <span className="text-[10px] font-black text-white">1 · ANW</span>
                      <span className="text-[10px] font-black text-slate-400">{totalAnwesend}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] rounded-lg px-2 py-1.5">
                      <span className="w-4 h-4 rounded bg-red-500" />
                      <span className="text-[10px] font-black text-white">A · AUFBAU</span>
                      <span className="text-[10px] font-black text-slate-400">{playerList.filter(p => p.status === 'A').length}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] rounded-lg px-2 py-1.5">
                      <span className="w-4 h-4 rounded bg-amber-400" />
                      <span className="text-[10px] font-black text-white">B · VERLETZT</span>
                      <span className="text-[10px] font-black text-slate-400">{totalVerletzt}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] rounded-lg px-2 py-1.5">
                      <span className="w-4 h-4 rounded bg-sky-500" />
                      <span className="text-[10px] font-black text-white">K · KRANK</span>
                      <span className="text-[10px] font-black text-slate-400">{totalKrank}</span>
                    </div>
                  </div>
                </div>

                {/* Bemerkungen-Feld */}
                <div className="lg:col-span-3 bg-[#121824] border border-[#334155] rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 flex items-center justify-center bg-[#1E293B] border border-[#334155] rounded-lg text-[#F59E0B]">
                      <MessageSquareText size={14} />
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Bemerkungen</span>
                  </div>
                  <textarea
                    className={textareaCls}
                    style={{ minHeight: '160px' }}
                    placeholder="Trainer-Notizen..."
                    value={selected.remarks || ''}
                    onChange={(e) => saveField(selected.id, 'remarks', e.target.value)}
                  />
                  <ImageUpload
                    images={(selected.remarksImages || []) as string[]}
                    onAdd={(data) => addTopImages('remarksImages', data)}
                    onRemove={(idx) => removeTopImages('remarksImages', idx)}
                    isEditing
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="text-center text-[9px] text-slate-500 border-t border-[#334155] pt-4 mt-6">
                Erstellt mit CoCoach — {activeClub.name} · Änderungen werden automatisch gespeichert.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
