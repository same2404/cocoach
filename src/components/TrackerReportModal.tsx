import React, { useState } from 'react';
import { Player } from '../types';
import { apiFetch } from '../lib/apiClient';
import { 
  Activity, 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Loader2, 
  X, 
  TrendingUp, 
  User, 
  Zap, 
  Heart, 
  Compass, 
  Share2, 
  Copy
} from 'lucide-react';

interface TrackerReportModalProps {
  players: Player[];
  onClose: () => void;
  onUpdatePlayer?: (id: string, field: keyof Player, value: any) => void;
}

export const TrackerReportModal: React.FC<TrackerReportModalProps> = ({
  players,
  onClose,
  onUpdatePlayer
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [rawText, setRawText] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [reportResult, setReportResult] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId);

  const handleAnalyzeTrackerData = async () => {
    if (!rawText.trim() && !file) {
      alert("Bitte lade eine Tracker-Datei hoch (ZIP, CSV, JSON, GPX, FIT, TCX) oder füge Tracker-Text ein.");
      return;
    }

    setIsLoading(true);
    setToastMsg("TeamAgent analysiert Tracker-Daten & erstellt Spielerbericht...");

    try {
      let fileData: string | undefined = undefined;
      let mimeType: string | undefined = undefined;
      let fileName: string | undefined = file?.name;

      if (file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const commaIdx = base64.indexOf(',');
        fileData = commaIdx !== -1 ? base64.substring(commaIdx + 1) : base64;
        mimeType = file.type || 'application/octet-stream';
      }

      const squadPlayersPayload = players.map(p => {
        const pAny = p as any;
        const pName = p.lastName ? `${p.firstName || ''} ${p.lastName}`.trim() : (pAny.name || '');
        return {
          id: p.id,
          lastName: p.lastName || pName.split(' ').pop() || '',
          firstName: p.firstName || pName.split(' ')[0] || '',
          position: p.position || 'Kader',
          number: p.number || '?'
        };
      });

      const selectedAny = selectedPlayer as any;
      const pName = selectedPlayer ? (selectedPlayer.lastName ? `${selectedPlayer.firstName || ''} ${selectedPlayer.lastName}`.trim() : (selectedAny?.name || 'Spieler')) : undefined;

      const response = await apiFetch('/api/tracker-report/parse', {
        method: 'POST',
        body: JSON.stringify({
          rawText: rawText.trim() || undefined,
          fileData,
          mimeType,
          fileName,
          squadPlayers: squadPlayersPayload,
          previousData: selectedPlayer ? {
            name: pName,
            avgDist: selectedPlayer.trackerAnalysis?.totalDistanceKm || 8.5,
            maxSpeed: selectedPlayer.trackerAnalysis?.maxSpeedKmh || 31.0,
            sprints: selectedPlayer.trackerAnalysis?.sprintCount || 20
          } : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Fehler bei der Analyse der Tracker-Daten.");
      }

      const result = await response.json();
      setReportResult(result);
      if (result.matchedPlayerId && !selectedPlayerId) {
        setSelectedPlayerId(result.matchedPlayerId);
      }
      setToastMsg("Spielerbericht von TeamAgent erfassungsbereit!");
    } catch (err: any) {
      console.error("Tracker Report Analysis Error:", err);
      alert(`Fehler: ${err.message || 'Die Analyse ist fehlgeschlagen.'}`);
      setToastMsg("Fehler bei der Auswertung.");
    } finally {
      setIsLoading(false);
      setTimeout(() => setToastMsg(null), 4000);
    }
  };

  const handleApplyToPlayer = () => {
    if (!reportResult) return;
    const pId = selectedPlayerId || reportResult.matchedPlayerId;
    if (!pId) {
      alert("Bitte wähle einen Spieler aus der Kaderliste aus, dem diese Daten zugeordnet werden sollen.");
      return;
    }

    if (onUpdatePlayer && reportResult.newTrackerData) {
      const d = reportResult.newTrackerData;
      const updatedTrackerAnalysis = {
        totalDistanceKm: d.distanceKm,
        maxSpeedKmh: d.maxSpeedKmh,
        sprintCount: d.sprints,
        avgHeartRateBpm: d.avgHrBpm,
        maxHeartRateBpm: d.maxHrBpm,
        tacticalSummary: reportResult.interpretation?.trainerAssessment || 'Tracker-Daten erfolgreich analysiert.',
        uploadDate: new Date().toISOString().split('T')[0]
      };

      onUpdatePlayer(pId, 'trackerAnalysis', updatedTrackerAnalysis);
      alert(`✅ Tracker-Daten wurden dem Spieler erfolgreich zugeordnet und in Firestore synchronisiert!`);
    }
  };

  const handleCopyReport = () => {
    if (reportResult?.formattedReportText) {
      navigator.clipboard.writeText(reportResult.formattedReportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1E293B] border-4 border-black w-full max-w-3xl p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 my-8">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b-4 border-black pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-red-600 text-white flex items-center justify-center border-2 border-black font-black">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-900 tracking-wider">
                SPIELERBERICHT: TRACKER-DATEN (ZIP, CSV, JSON, GPX, FIT, TCX)
              </h3>
              <p className="text-xs text-slate-600 font-bold">
                Automatischer Upload, Datenextraktion & Trainer-Auswertung (TeamAgent)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-black hover:bg-slate-100 border border-black transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* TOAST MESSAGE */}
        {toastMsg && (
          <div className="bg-amber-400 text-black p-2 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2">
            <Sparkles size={16} className="animate-spin text-red-700" /> {toastMsg}
          </div>
        )}

        {/* INPUT SECTION */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* FILE UPLOAD */}
          <div className="bg-slate-50 border-2 border-black p-3 space-y-2">
            <label className="block text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <Upload size={14} className="text-red-600" /> 1. Tracker-Datei hochladen (.zip, .csv, .json, .gpx, .fit, .tcx)
            </label>
            <input
              type="file"
              accept=".zip,.csv,.json,.gpx,.fit,.tcx,.pdf,.txt"
              onChange={handleFileChange}
              className="w-full text-xs font-mono file:mr-2 file:py-1 file:px-2 file:border-2 file:border-black file:text-xs file:font-black file:bg-amber-400 file:text-black cursor-pointer"
            />
            {file && (
              <p className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-400 p-1">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* PLAYER SELECTOR */}
          <div className="bg-slate-50 border-2 border-black p-3 space-y-2">
            <label className="block text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
              <User size={14} className="text-red-600" /> 2. Spieler auswählen (oder automatische Erkennung nutzen)
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full bg-[#1E293B] border-2 border-black p-2 text-xs font-bold"
            >
              <option value="">-- Automatische Erkennung --</option>
              {players.map(p => {
                const pAny = p as any;
                const displayName = p.lastName ? `${p.lastName}, ${p.firstName || ''}` : (pAny.name || `Spieler #${p.number || ''}`);
                return (
                  <option key={p.id} value={p.id}>
                    {displayName} ({p.position || 'Kader'}, #{p.number || '?'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* RAW TEXT / DATA INPUT */}
        <div className="space-y-1">
          <label className="block text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
            <FileText size={14} className="text-red-600" /> ODER Tracker-Daten / Telemetrie-Text manuell einfügen:
          </label>
          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="z.B. Spieler: Lucas Höfler, Distanz: 9.8 km, Max Speed: 32.4 km/h, Avg Speed: 8.4 km/h, Sprints: 24, Puls Ø: 162 bpm, Puls max: 184 bpm..."
            className="w-full bg-[#1E293B] border-2 border-black p-2 text-xs font-mono"
          />
        </div>

        {/* ANALYZE BUTTON */}
        <button
          onClick={handleAnalyzeTrackerData}
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-xs font-black uppercase py-2.5 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> TeamAgent extrahiert Daten & vergleicht...
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-amber-300" /> 📊 TRACKER-DATEN ANALYSIEREN & SPIELERBERICHT ERZEUGEN
            </>
          )}
        </button>

        {/* REPORT DISPLAY RESULT */}
        {reportResult && (
          <div className="bg-amber-50 border-3 border-black p-4 space-y-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <h4 className="text-xs font-black uppercase text-red-700 flex items-center gap-1.5">
                <Activity size={16} /> ERZEUGTER TRAINER-BERICHT (FC AUGGEN SYSTEM)
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className="bg-[#1E293B] hover:bg-slate-100 text-slate-900 border border-black text-[11px] font-bold px-2 py-1 flex items-center gap-1"
                >
                  <Copy size={12} /> {copied ? 'Kopiert! ✓' : 'Bericht kopieren'}
                </button>
                <button
                  onClick={handleApplyToPlayer}
                  className="bg-[#00C2FF] hover:bg-[#00B0E6] text-[#0A0A0A] border border-[#00C2FF] text-[11px] font-black px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                >
                  <Check size={12} className="text-[#0A0A0A]" /> Zuordnen & Speichern
                </button>
              </div>
            </div>

            {/* LEVEL 3 POSITION-SPECIFIC BADGE */}
            {reportResult.positionSpecificAnalysis && (
              <div className="bg-[#E8E8E8] border border-[#DADADA] p-2.5 text-[#F8FAFC] text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#00C2FF] font-black uppercase flex items-center gap-1">
                    <Compass size={14} /> POSITIONS-SPEZIFISCHE LAUFWEGE (LEVEL 3)
                  </span>
                  <span className="bg-red-600 px-1.5 py-0.5 text-[10px] font-black uppercase rounded">
                    {reportResult.position || 'Kader'}
                  </span>
                </div>
                <p className="text-slate-300 font-bold">
                  {reportResult.positionSpecificAnalysis.level3Evaluation}
                </p>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 pt-1 font-mono">
                  <span>📍 Muster: {reportResult.positionSpecificAnalysis.characteristicRunPattern}</span>
                  <span>🗺️ Heatmap: {reportResult.positionSpecificAnalysis.heatmapZones}</span>
                </div>
              </div>
            )}

            {/* PREVIEW OF FORMATTED REPORT TEXT */}
            <div className="bg-[#1E293B] border-2 border-black p-3 font-mono text-xs text-slate-900 leading-relaxed whitespace-pre-wrap selection:bg-amber-300 selection:text-black">
              {reportResult.formattedReportText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
