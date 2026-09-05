import React, { useState, useRef } from 'react';
import { Player } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { TenDayPlanSection } from '../TenDayPlanSection';
import { TenDayPlanUnit } from '../../data/tenDayPlan';
import { TrackerReportModal } from '../TrackerReportModal';
import { 
  Activity, 
  TrendingUp, 
  Timer, 
  Calendar,
  FileDown,
  Printer,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  X,
  Award,
  Users,
  Upload,
  Sparkles,
  FileText,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { fixOklchForHtml2Canvas } from '../../utils/pdfExportHelper';
import { apiFetch } from '../../lib/apiClient';

interface RunsSWViewProps {
  players: Player[];
  runRecords: any[];
  runMeta: any[];
  onUpdateRunRecord: (record: any) => void;
  onUpdateRunMeta: (meta: any) => void;
  onUpdatePlayer: (id: string, field: keyof Player, value: any) => void;
  isEditing?: boolean;
}

interface ParsedRun {
  runIndex: number;
  runName: string;
  runDate?: string;
  runContent?: string;
}

interface ParsedPlayerResult {
  playerName: string;
  matchedPlayerId?: string;
  runIndex: number;
  value: string;
}

interface ParsedRunData {
  runs: ParsedRun[];
  playerResults: ParsedPlayerResult[];
}

export const RunsSWView: React.FC<RunsSWViewProps> = ({
  players,
  runRecords,
  runMeta,
  onUpdateRunRecord,
  onUpdateRunMeta,
  onUpdatePlayer,
  isEditing = false
}) => {
  const sortedPlayers = sortPlayers(players);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showOnlyActiveRuns, setShowOnlyActiveRuns] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  // PDF & Tracker Import States
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [parsedRunData, setParsedRunData] = useState<ParsedRunData | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTrackerModal, setShowTrackerModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string>('');

  const handleUpdateRun = (playerId: string, runIdx: number, value: string) => {
    const existing = runRecords.find(r => r.playerId === playerId);
    if (existing) {
      onUpdateRunRecord({ 
        ...existing, 
        runs: { ...existing.runs, [runIdx]: value } 
      });
    } else {
      onUpdateRunRecord({ 
        id: playerId,
        playerId, 
        runs: { [runIdx]: value } 
      });
    }
  };

  const getRunMeta = (idx: number) => {
    return runMeta.find(m => m.id === `run_${idx}`) || { id: `run_${idx}`, name: `Lauf ${idx + 1}`, date: '', content: '' };
  };

  const handleUpdateRunMeta = (idx: number, field: string, value: string) => {
    const existing = getRunMeta(idx);
    onUpdateRunMeta({ ...existing, [field]: value });
  };

  const handleSyncTenDayPlan = (plan: TenDayPlanUnit[]) => {
    plan.forEach((unit, i) => {
      onUpdateRunMeta({
        id: `run_${i}`,
        name: `${unit.tag}: ${unit.title}`,
        date: unit.dateIso,
        content: `${unit.content} | Ziel: ${unit.goal}`
      });
    });
  };

  // Determine active run indices (where name or content or date is set, or records exist)
  const allRunIndices = Array.from({ length: 15 }, (_, i) => i);
  const activeRunIndices = allRunIndices.filter(i => {
    const meta = getRunMeta(i);
    const hasMeta = (meta.name && meta.name !== `Lauf ${i + 1}`) || meta.date || meta.content;
    const hasData = runRecords.some(r => r.runs && r.runs[i] && r.runs[i].trim() !== '');
    return hasMeta || hasData;
  });

  const displayedRunIndices = showOnlyActiveRuns && activeRunIndices.length > 0 
    ? activeRunIndices 
    : allRunIndices;

  // Filter players
  const filteredPlayers = sortedPlayers.filter(p => {
    const fullName = `${p.lastName} ${p.firstName}`.toLowerCase();
    const pos = (p.position || '').toLowerCase();
    const num = (p.number ? `#${p.number}` : '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          pos.includes(searchTerm.toLowerCase()) || 
                          num.includes(searchTerm.toLowerCase());
    
    if (selectedCategory === 'all') return matchesSearch;
    return matchesSearch && (p.category || 'player') === selectedCategory;
  });

  // Calculate statistics per run
  const getRunStats = (runIdx: number) => {
    let count = 0;
    runRecords.forEach(r => {
      if (r.runs && r.runs[runIdx] && r.runs[runIdx].trim() !== '') {
        count++;
      }
    });
    return { count };
  };

  // PDF File Upload Handler (via Gemini AI)
  const processPDFFile = async (file: File) => {
    if (!file) return;
    setIsParsingPDF(true);
    setUploadFileName(file.name);
    setPdfToast(`PDF / Dokument wird analysiert (${file.name})...`);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const commaIdx = base64Data.indexOf(',');
          const fileData = commaIdx !== -1 ? base64Data.substring(commaIdx + 1) : base64Data;
          const mimeType = file.type || 'application/pdf';

          const response = await apiFetch('/api/runs/parse-pdf', {
            method: 'POST',
            body: JSON.stringify({
              fileData,
              mimeType,
              squadPlayers: sortedPlayers.map(p => ({
                id: p.id,
                lastName: p.lastName,
                firstName: p.firstName,
                number: p.number
              }))
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Fehler beim Analysieren des Dokuments.');
          }

          const parsedRes: ParsedRunData = await response.json();
          setParsedRunData(parsedRes);
          setShowImportModal(true);
          setPdfToast("Dokument erfolgreich analysiert! Bitte Ergebnisse prüfen.");
        } catch (err: any) {
          console.error("PDF Parsing Error:", err);
          alert(`Fehler beim Einlesen: ${err.message || 'Die Datei konnte nicht gelesen werden.'}`);
          setPdfToast("Fehler beim Einlesen der PDF.");
        } finally {
          setIsParsingPDF(false);
          setTimeout(() => setPdfToast(null), 4000);
        }
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      console.error(e);
      setIsParsingPDF(false);
      setPdfToast("Fehler beim Verarbeiten der Datei.");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPDFFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPDFFile(e.dataTransfer.files[0]);
    }
  };

  // Apply parsed results to the table
  const handleConfirmImport = () => {
    if (!parsedRunData) return;

    // 1. Update Run Meta
    parsedRunData.runs.forEach(run => {
      const runIndex = Math.min(Math.max(run.runIndex, 0), 14);
      onUpdateRunMeta({
        id: `run_${runIndex}`,
        name: run.runName || `Lauf ${runIndex + 1}`,
        date: run.runDate || new Date().toISOString().split('T')[0],
        content: run.runContent || ''
      });
    });

    // 2. Group player results by player ID
    const resultsByPlayer: { [playerId: string]: { [runIdx: number]: string } } = {};

    parsedRunData.playerResults.forEach(res => {
      let targetPlayerId = res.matchedPlayerId;

      // Fallback matching by name if matchedPlayerId not directly provided
      if (!targetPlayerId && res.playerName) {
        const cleanSearch = res.playerName.toLowerCase().trim();
        const found = sortedPlayers.find(p => {
          const fn = `${p.lastName} ${p.firstName}`.toLowerCase();
          const fnRev = `${p.firstName} ${p.lastName}`.toLowerCase();
          return fn.includes(cleanSearch) || cleanSearch.includes(p.lastName.toLowerCase());
        });
        if (found) targetPlayerId = found.id;
      }

      if (targetPlayerId) {
        if (!resultsByPlayer[targetPlayerId]) {
          resultsByPlayer[targetPlayerId] = {};
        }
        const runIdx = Math.min(Math.max(res.runIndex, 0), 14);
        resultsByPlayer[targetPlayerId][runIdx] = res.value;
      }
    });

    // 3. Update records for each player
    Object.keys(resultsByPlayer).forEach(playerId => {
      const existing = runRecords.find(r => r.playerId === playerId);
      const newRuns = { ...(existing?.runs || {}), ...resultsByPlayer[playerId] };
      onUpdateRunRecord({
        id: playerId,
        playerId,
        runs: newRuns
      });
    });

    setShowImportModal(false);
    setParsedRunData(null);
    setPdfToast("Laufdaten erfolgreich in die Tabelle importiert!");
    setTimeout(() => setPdfToast(null), 3000);
  };

  // Export to PDF using html2canvas & jsPDF
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    setPdfToast("PDF wird generiert... Bitte warten.");

    try {
      const element = pdfContainerRef.current || document.getElementById('runs-pdf-report');
      if (!element) {
        throw new Error("Report element not found");
      }

      // Allow a brief tick for render
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(element as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          fixOklchForHtml2Canvas(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

      if (imgHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      } else {
        // Multi-page if necessary
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = position - pdfHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
      }

      const fileName = `Laeufe_Ausdauer_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      setPdfToast("PDF erfolgreich heruntergeladen!");
      setTimeout(() => setPdfToast(null), 3000);
    } catch (error) {
      console.error("PDF generation failed:", error);
      setPdfToast("PDF-Druckfenster wird geöffnet...");
      setTimeout(() => {
        setPdfToast(null);
        window.print();
      }, 800);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="flex flex-col h-full bg-[#0A0E17] border border-[#334155] text-[#F8FAFC] rounded-2xl overflow-hidden shadow-2xl relative min-h-screen"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Toast Notification */}
      {pdfToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#121824] text-[#F8FAFC] px-4 py-2.5 rounded-xl border border-[#10B981] shadow-2xl flex items-center gap-3 animate-bounce">
          <Activity size={18} className="text-[#10B981] animate-spin" />
          <span className="text-xs font-black uppercase tracking-wider">{pdfToast}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        accept=".pdf,image/*,.png,.jpg,.jpeg,.csv" 
        className="hidden" 
      />

      {/* Drag & Drop Overlay */}
      {dragActive && (
        <div className="absolute inset-0 z-40 bg-[#10B981]/90 backdrop-blur-xs border-4 border-dashed border-[#0A0E17] flex flex-col items-center justify-center p-6 text-white">
          <Upload size={48} className="animate-bounce mb-3" />
          <h2 className="text-2xl font-black uppercase tracking-tight">PDF oder Laufbericht hier ablegen</h2>
          <p className="text-xs font-bold uppercase mt-1">
            Das System extrahiert alle Läufe, Zeiten und Ergebnisse automatisch für deinen Kader
          </p>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="p-3 border-b border-[#334155] bg-[#121824] flex flex-wrap justify-between items-center gap-3 shrink-0 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#10B981]/20 text-[#10B981] rounded-xl border border-[#10B981]/30 shadow-xs">
            <Activity size={18} />
          </div>
          <div>
            <h3 className="font-black uppercase text-sm tracking-tight text-[#F8FAFC] leading-none">
              Läufe & Ausdauer (SW)
            </h3>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <TrendingUp size={11} className="text-[#10B981]" />
              Leistungsdiagnostik & Trainingssteuerung
            </p>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tracker Data Report Modal Button */}
          <button
            onClick={() => setShowTrackerModal(true)}
            className="flex items-center gap-1.5 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] px-3 py-1.5 rounded-xl border border-[#334155] font-black text-[10px] uppercase transition-all shadow-xs cursor-pointer"
            title="Tracker-Daten (ZIP, CSV, JSON, GPX, FIT, TCX) analysieren & Spielerbericht erzeugen"
          >
            <Activity size={13} className="text-[#10B981]" />
            <span>📊 Tracker-Bericht (ZIP/CSV/FIT)</span>
          </button>

          {/* AI PDF Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingPDF}
            className="flex items-center gap-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded-xl border border-[#10B981] font-black text-[10px] uppercase transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="PDF, Foto oder Leistungsdiagnostik-Bericht hochladen & automatisch importieren"
          >
            {isParsingPDF ? (
              <>
                <Loader2 size={13} className="animate-spin text-white" />
                <span>Analysiere PDF...</span>
              </>
            ) : (
              <>
                <Sparkles size={13} className="text-white" />
                <span>PDF hochladen & importieren</span>
              </>
            )}
          </button>

          {/* Search Box */}
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-2.5 text-[#94A3B8]" />
            <input 
              type="text"
              placeholder="Spieler suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#1E293B] border border-[#334155] rounded-xl text-xs font-bold text-[#F8FAFC] focus:outline-none focus:border-[#10B981] w-32 sm:w-40 placeholder:text-[#94A3B8]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 text-[#94A3B8] hover:text-[#F8FAFC]">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1 bg-[#202020] border border-[#2A2A2A] rounded-lg p-0.5 text-[10px] font-bold">
            <Filter size={12} className="ml-1.5 text-[#888888]" />
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-[#F5F5F5] font-bold focus:outline-none py-1 pr-2 cursor-pointer"
            >
              <option value="all" className="bg-[#202020] text-[#F5F5F5]">Alle Gruppen</option>
              <option value="player" className="bg-[#202020] text-[#F5F5F5]">Spielerkader</option>
              <option value="coach" className="bg-[#202020] text-[#F5F5F5]">Trainerteam</option>
              <option value="staff" className="bg-[#202020] text-[#F5F5F5]">Funktionsteam</option>
              <option value="medical" className="bg-[#202020] text-[#F5F5F5]">Sanitäter / Physio</option>
            </select>
          </div>

          {/* Filter Active Runs Toggle */}
          <button
            onClick={() => setShowOnlyActiveRuns(!showOnlyActiveRuns)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
              showOnlyActiveRuns 
                ? 'bg-[#FFD54F] text-[#0F0F0F] border-[#FFD54F] shadow-sm' 
                : 'bg-[#202020] text-[#C7C7C7] border-[#2A2A2A] hover:border-[#FFD54F]'
            }`}
            title="Nur Läufe mit eingetragenen Daten oder Namen anzeigen"
          >
            <CheckCircle2 size={12} />
            <span>{showOnlyActiveRuns ? 'Nur Aktive Läufe' : 'Alle 15 Läufe'}</span>
          </button>

          {/* Print / PDF Modal Button */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 bg-[#202020] text-[#F5F5F5] px-3 py-1.5 rounded-lg border border-[#2A2A2A] hover:bg-[#2A2A2A] text-[10px] font-black uppercase transition-all shadow-sm cursor-pointer"
            title="Druck- und PDF-Vorschau öffnen"
          >
            <Printer size={13} className="text-[#FFD54F]" />
            <span>Druckansicht</span>
          </button>

          {/* PDF Download Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF}
            className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1.5 rounded-lg border border-rose-600 hover:bg-rose-700 disabled:opacity-50 text-[10px] font-black uppercase transition-all shadow-sm cursor-pointer"
            title="Läufe & Ausdauer als PDF herunterladen"
          >
            <FileDown size={13} />
            <span>{isExportingPDF ? 'Erstelle PDF...' : 'PDF Download'}</span>
          </button>
        </div>
      </div>

      {/* Prominent Quick Upload Banner */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="bg-[#1A1A1A] hover:bg-[#202020] border-b border-[#2A2A2A] px-4 py-2 flex items-center justify-between cursor-pointer group transition-colors shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#FFD54F] rounded border border-[#FFD54F] text-[#0F0F0F] group-hover:scale-110 transition-transform">
            <Upload size={14} />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-[#F5F5F5] flex items-center gap-1.5">
              <span>PDF-Laufbericht / Leistungsdiagnostik importieren</span>
              <span className="bg-[#202020] text-[#FFD54F] text-[8px] font-black px-1.5 py-0.5 rounded uppercase border border-[#2A2A2A]">
                Auto-Parsing
              </span>
            </span>
            <p className="text-[10px] font-bold text-[#C7C7C7]">
              Lade ein PDF (z.B. Garmin, Polar, TRACKTICS, Excel-Liste oder Foto) hoch. Das System trägt Zeiten & Ergebnisse automatisch den Spielern ein.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#FFD54F] font-black text-xs uppercase group-hover:translate-x-1 transition-transform">
          <span>Datei auswählen</span>
          <Sparkles size={14} className="text-[#FFD54F]" />
        </div>
      </div>

      {/* Main Interactive Table & Plan Section */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-[#0F0F0F] p-3 space-y-4">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CATAPULT VECTOR GPS DASHBOARD (Profi-GPS-Tracking)           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-[#0A1628] via-[#0D1B2A] to-[#0A1628] border border-[#1E3A5F] rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#00FF88]">Catapult GPS Live-Dashboard</span>
            <span className="text-[8px] text-[#64748B] ml-auto">Vektor™ + AMS Integration</span>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
            {(() => {
              const playersWithGPS = sortedPlayers.filter((p: any) => p.trackerAnalysis?.totalDistanceKm > 0);
              const totalDist = playersWithGPS.reduce((s: number, p: any) => s + (p.trackerAnalysis?.totalDistanceKm || 0), 0);
              const avgDist = playersWithGPS.length ? (totalDist / playersWithGPS.length).toFixed(1) : '0.0';
              const maxSpeed = Math.max(0, ...playersWithGPS.map((p: any) => p.trackerAnalysis?.maxSpeedKmh || 0));
              const totalSprints = playersWithGPS.reduce((s: number, p: any) => s + (p.trackerAnalysis?.sprintCount || 0), 0);
              const avgSprints = playersWithGPS.length ? Math.round(totalSprints / playersWithGPS.length) : 0;
              const avgHR = playersWithGPS.length ? Math.round(playersWithGPS.reduce((s: number, p: any) => s + (p.trackerAnalysis?.avgHeartRateBpm || 0), 0) / playersWithGPS.length) : 0;
              const maxHR = Math.max(0, ...playersWithGPS.map((p: any) => p.trackerAnalysis?.maxHeartRateBpm || 0));
              const avgHS = playersWithGPS.length ? Math.round(playersWithGPS.reduce((s: number, p: any) => s + (p.trackerAnalysis?.highSpeedDistanceM || 0), 0) / playersWithGPS.length) : 0;
              const loadSum = playersWithGPS.reduce((s: number, p: any) => s + (p.trackerAnalysis?.workloadIndex || 0), 0);
              const avgLoad = playersWithGPS.length ? Math.round(loadSum / playersWithGPS.length) : 0;

              return [
                { label: 'Ø Distanz', value: `${avgDist}km`, color: 'text-[#00FF88]' },
                { label: 'Max Speed', value: `${maxSpeed}km/h`, color: 'text-[#38BDF8]' },
                { label: 'Ø Sprints', value: `${avgSprints}`, color: 'text-[#F59E0B]' },
                { label: 'Ø Herzfrequenz', value: `${avgHR}bpm`, color: 'text-[#EF4444]' },
                { label: 'Max HR', value: `${maxHR}bpm`, color: 'text-[#DC2626]' },
                { label: 'Ø High-Speed', value: `${avgHS}m`, color: 'text-[#8B5CF6]' },
                { label: 'Total Sprints', value: `${totalSprints}`, color: 'text-[#06B6D4]' },
                { label: 'Ø Load Index', value: `${avgLoad}`, color: 'text-[#EC4899]' },
              ].map((kpi, i) => (
                <div key={i} className="bg-[#0A1628] border border-[#1E3A5F] rounded-lg p-2 text-center hover:border-[#38BDF8]/40 transition-colors">
                  <div className="text-[7px] font-bold uppercase text-[#64748B] tracking-wider">{kpi.label}</div>
                  <div className={`text-sm font-black ${kpi.color}`}>{kpi.value}</div>
                </div>
              ));
            })()}
          </div>

          {/* ACWR + Belastungszonen */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
            {/* ACWR (Acute:Chronic Workload Ratio) */}
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#64748B] tracking-widest mb-2">ACWR – Akut:Chronisch Belastungsverhältnis</div>
              <div className="space-y-1.5">
                {sortedPlayers.filter((p: any) => p.category === 'player').slice(0, 8).map((player: any) => {
                  const load = player.trackerAnalysis?.workloadIndex || 0;
                  const chronic = 600;
                  const acwr = chronic > 0 ? (load / chronic) : 0;
                  const ratio = Math.min(acwr, 2.0);
                  const isDanger = acwr > 1.5;
                  const isSafe = acwr >= 0.8 && acwr <= 1.3;
                  const barColor = isDanger ? 'bg-[#EF4444]' : isSafe ? 'bg-[#10B981]' : 'bg-[#F59E0B]';
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-[#94A3B8] w-24 truncate">{player.firstName || player.name?.split(' ')[0]}</span>
                      <div className="flex-1 h-2 bg-[#1E293B] rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${(ratio / 2) * 100}%` }} />
                      </div>
                      <span className={`text-[8px] font-black w-10 text-right ${isDanger ? 'text-[#EF4444]' : isSafe ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                        {acwr.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#1E3A5F]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#EF4444]" /><span className="text-[7px] text-[#64748B]">Gefahr (&gt;1.5)</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#F59E0B]" /><span className="text-[7px] text-[#64748B]">Vorsicht</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#10B981]" /><span className="text-[7px] text-[#64748B]">Optimal (0.8–1.3)</span></div>
              </div>
            </div>

            {/* Belastungs-Zonen Visualizer */}
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#64748B] tracking-widest mb-2">Belastungs-Zonen (Catapult Vector™)</div>
              <div className="space-y-1.5">
                {sortedPlayers.filter((p: any) => p.category === 'player' && (p.trackerAnalysis?.totalDistanceKm || 0) > 0).slice(0, 8).map((player: any) => {
                  const hs = player.trackerAnalysis?.highSpeedDistanceM || 0;
                  const sprint = player.trackerAnalysis?.sprintDistanceM || 0;
                  const dist = player.trackerAnalysis?.totalDistanceKm || 0;
                  const total = dist * 1000 || 1;
                  const hsPct = Math.min((hs / total) * 100, 30);
                  const sprintPct = Math.min((sprint / total) * 100, 15);
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-[8px] font-bold text-[#94A3B8] w-24 truncate">{player.firstName || player.name?.split(' ')[0]}</span>
                      <div className="flex-1 h-3 bg-[#1E293B] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#334155] transition-all" style={{ width: `${100 - hsPct - sprintPct}%` }} title="Grundlage" />
                        <div className="h-full bg-[#F59E0B] transition-all" style={{ width: `${hsPct}%` }} title={`High-Speed: ${hs}m`} />
                        <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${sprintPct}%` }} title={`Sprint: ${sprint}m`} />
                      </div>
                      <span className="text-[7px] text-[#64748B] w-16 text-right">{sprint}m Sprint</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-[#1E3A5F]">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#334155]" /><span className="text-[7px] text-[#64748B]">Grundlage</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#F59E0B]" /><span className="text-[7px] text-[#64748B]">High-Speed</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded bg-[#EF4444]" /><span className="text-[7px] text-[#64748B]">Sprint</span></div>
              </div>
            </div>
          </div>

          {/* Verletzungsrisiko + Sprint-Analyse */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* RTP (Return to Play) Risk Matrix */}
            <div className="bg-[#0A1628] border border-[#EF4444]/30 rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#EF4444] tracking-widest mb-2">⚠ Verletzungsrisiko-Matrix (RTP)</div>
              <div className="space-y-1">
                {sortedPlayers.filter((p: any) => p.category === 'player').slice(0, 6).map((player: any) => {
                  const load = player.trackerAnalysis?.workloadIndex || 0;
                  const sprint = player.trackerAnalysis?.sprintCount || 0;
                  const riskScore = load > 800 && sprint > 25 ? 'HOCH' : load > 600 ? 'MITTEL' : 'NIEDRIG';
                  const riskColor = riskScore === 'HOCH' ? 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30' : riskScore === 'MITTEL' ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
                  return (
                    <div key={player.id} className={`flex items-center justify-between p-1.5 rounded border ${riskColor}`}>
                      <span className="text-[8px] font-bold">{player.firstName || player.name?.split(' ')[0]}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[7px]">{load} Load / {sprint} Sprints</span>
                        <span className="text-[7px] font-black">{riskScore}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sprint-Verteilung */}
            <div className="bg-[#0A1628] border border-[#38BDF8]/30 rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#38BDF8] tracking-widest mb-2">Sprint-Verteilung (Catapult AMS)</div>
              <div className="space-y-1">
                {[
                  { range: '0-5 Sprints', count: sortedPlayers.filter((p: any) => (p.trackerAnalysis?.sprintCount || 0) <= 5).length, color: 'bg-[#334155]' },
                  { range: '6-15 Sprints', count: sortedPlayers.filter((p: any) => { const s = p.trackerAnalysis?.sprintCount || 0; return s > 5 && s <= 15; }).length, color: 'bg-[#10B981]' },
                  { range: '16-25 Sprints', count: sortedPlayers.filter((p: any) => { const s = p.trackerAnalysis?.sprintCount || 0; return s > 15 && s <= 25; }).length, color: 'bg-[#F59E0B]' },
                  { range: '26+ Sprints', count: sortedPlayers.filter((p: any) => (p.trackerAnalysis?.sprintCount || 0) > 25).length, color: 'bg-[#EF4444]' },
                ].map((zone, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[8px] text-[#94A3B8] w-20">{zone.range}</span>
                    <div className="flex-1 h-4 bg-[#1E293B] rounded overflow-hidden">
                      <div className={`h-full ${zone.color} rounded flex items-center pl-1`} style={{ width: `${Math.min((zone.count / Math.max(sortedPlayers.filter((p: any) => p.category === 'player').length, 1)) * 100, 100)}%` }}>
                        {zone.count > 0 && <span className="text-[8px] font-black text-white">{zone.count}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GPS Heatmap Legende + Statistiken */}
            <div className="bg-[#0A1628] border border-[#8B5CF6]/30 rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#8B5CF6] tracking-widest mb-2">GPS Heatmap-Zonen (Spielfeld)</div>
              <div className="space-y-2">
                {sortedPlayers.filter((p: any) => p.category === 'player' && p.trackerAnalysis?.heatMapZone).slice(0, 5).map((player: any) => (
                  <div key={player.id} className="bg-[#0D1117] border border-[#1E293B] rounded p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black text-[#F8FAFC]">{player.firstName || player.name?.split(' ')[0]}</span>
                      <span className="text-[7px] text-[#8B5CF6]">{player.position}</span>
                    </div>
                    <div className="text-[8px] text-[#94A3B8]">{player.trackerAnalysis.heatMapZone}</div>
                  </div>
                ))}
                {sortedPlayers.filter((p: any) => p.trackerAnalysis?.heatMapZone).length === 0 && (
                  <div className="text-center py-4 text-[8px] text-[#64748B]">Noch keine GPS-Heatmap-Daten vorhanden</div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* END CATAPULT GPS DASHBOARD */}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CROSS-TAB: GPS ↔ MATCH ↔ TRAINING KORRELATION                */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-[#0D1117] via-[#111827] to-[#0D1117] border border-[#8B5CF6]/30 rounded-xl p-3 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[8px] font-black uppercase tracking-widest text-[#A78BFA]">GPS ↔ Match ↔ Training Korrelation</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Belastung vs Spielminuten */}
            <div className="bg-[#0A1628] border border-[#1E293B] rounded-lg p-2.5">
              <div className="text-[7px] font-bold text-[#64748B] uppercase mb-1.5">Belastung vs Einsatzzeiten</div>
              <div className="space-y-1">
                {sortedPlayers.filter((p: any) => p.category === 'player').slice(0, 8).map((player: any) => {
                  const load = (player.trackerAnalysis?.workloadIndex || 0);
                  const minutes = (player.einsatzzeitenGesamt || 0);
                  const maxLoad = 1200;
                  const maxMin = 2000;
                  return (
                    <div key={player.id} className="flex items-center gap-1.5">
                      <span className="text-[7px] text-[#94A3B8] w-16 truncate">{player.firstName || player.name?.split(' ')[0]}</span>
                      <div className="flex-1 h-2.5 bg-[#1E293B] rounded-full overflow-hidden flex">
                        <div className="h-full bg-[#06B6D4] rounded-l-full" style={{ width: `${Math.min((load / maxLoad) * 50, 50)}%` }} title={`Load: ${load}`} />
                        <div className="h-full bg-[#A855F7]" style={{ width: `${Math.min((minutes / maxMin) * 50, 50)}%` }} title={`Minuten: ${minutes}`} />
                      </div>
                      <span className="text-[6px] text-[#64748B] w-12 text-right">{minutes}min</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-1 pt-1 border-t border-[#1E293B]">
                <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#06B6D4] rounded" /><span className="text-[6px] text-[#64748B]">GPS Load</span></div>
                <div className="flex items-center gap-1"><div className="w-2 h-1 bg-[#A855F7] rounded" /><span className="text-[6px] text-[#64748B]">Spielminuten</span></div>
              </div>
            </div>

            {/* Fitness vs Belastungstoleranz */}
            <div className="bg-[#0A1628] border border-[#1E293B] rounded-lg p-2.5">
              <div className="text-[7px] font-bold text-[#64748B] uppercase mb-1.5">Fitness-Level & Belastungstoleranz</div>
              <div className="space-y-1">
                {sortedPlayers.filter((p: any) => p.category === 'player').slice(0, 8).map((player: any) => {
                  const load = (player.trackerAnalysis?.workloadIndex || 0);
                  const fitness = player.fitness || 'Unbekannt';
                  const fitnessPct = fitness === 'Sehr gut' ? 95 : fitness === 'Gut' ? 75 : fitness === 'Mittel' ? 55 : fitness === 'Schwach' ? 30 : 50;
                  return (
                    <div key={player.id} className="flex items-center gap-1.5">
                      <span className="text-[7px] text-[#94A3B8] w-16 truncate">{player.firstName || player.name?.split(' ')[0]}</span>
                      <div className="flex-1 h-2 bg-[#1E293B] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${fitnessPct >= 75 ? 'bg-[#10B981]' : fitnessPct >= 50 ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'}`} style={{ width: `${fitnessPct}%` }} />
                      </div>
                      <span className="text-[6px] text-[#64748B] w-12 text-right">{fitness}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 10-Tage-Aktiv Plan Module */}
        <TenDayPlanSection onSyncWithRunTable={handleSyncTenDayPlan} isEditing={isEditing} />

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-xl">
          <table className="w-full border-collapse text-[10px] font-bold">
          <thead className="sticky top-0 bg-[#202020] text-[#FFD54F] z-20 shadow-md border-b border-[#2A2A2A]">
            <tr>
              <th className="p-2 border-r border-[#2A2A2A] text-center w-10 align-top text-[#C7C7C7] font-black">Nr</th>
              <th className="p-2 border-r border-[#2A2A2A] text-left w-56 align-top text-[#F5F5F5] font-black">
                Spieler / Name
              </th>
              <th className="p-2 border-r border-[#2A2A2A] text-center w-16 align-top font-black text-[#FFD54F]">
                Pos
              </th>
              {displayedRunIndices.map((i) => {
                const meta = getRunMeta(i);
                const stats = getRunStats(i);
                return (
                  <th key={i} className="p-2 border-r border-[#2A2A2A] text-center min-w-[130px] max-w-[160px] bg-[#202020] group">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-1 border-b border-[#2A2A2A] pb-1">
                        <span className="text-[9px] font-black text-[#FFD54F] uppercase">#{i + 1}</span>
                        {stats.count > 0 && (
                          <span className="text-[8px] bg-[#1A1A1A] text-[#C7C7C7] px-1 py-0.2 rounded font-mono border border-[#2A2A2A]">
                            {stats.count} Sp.
                          </span>
                        )}
                      </div>

                      {/* Run Name Input */}
                      <input 
                        type="text"
                        className="bg-[#1A1A1A] text-[#F5F5F5] text-center focus:outline-none w-full text-[10px] font-black uppercase placeholder:text-[#888888] border border-[#2A2A2A] focus:border-[#FFD54F] rounded px-1 py-0.5"
                        value={meta.name}
                        onChange={(e) => handleUpdateRunMeta(i, 'name', e.target.value)}
                        placeholder={`Lauf ${i + 1}`}
                        disabled={!isEditing}
                      />

                      {/* Run Content Description */}
                      <textarea
                        placeholder="Inhalt / Distanz / Ziel..."
                        className="bg-[#1A1A1A] text-[#C7C7C7] text-center focus:outline-none w-full text-[8px] font-bold placeholder:text-[#888888] resize-none h-9 custom-scrollbar border border-[#2A2A2A] focus:border-[#FFD54F] rounded px-1 py-0.5"
                        value={meta.content || ''}
                        onChange={(e) => handleUpdateRunMeta(i, 'content', e.target.value)}
                        disabled={!isEditing}
                      />

                      {/* Run Date */}
                      <div className="flex items-center gap-1 justify-center bg-[#1A1A1A] border border-[#2A2A2A] rounded px-1 py-0.5">
                        <Calendar size={9} className="text-[#FFD54F] shrink-0" />
                        <input 
                          type="date"
                          className="bg-transparent text-center focus:outline-none w-full text-[8px] font-bold text-[#F5F5F5] appearance-none cursor-pointer"
                          value={meta.date}
                          onChange={(e) => handleUpdateRunMeta(i, 'date', e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {['player', 'coach', 'staff', 'medical'].map(category => {
              const categoryPlayers = filteredPlayers.filter(p => (p.category || 'player') === category);
              if (categoryPlayers.length === 0) return null;

              const categoryTitle = category === 'player' 
                ? 'SPIELERKADER' 
                : category === 'coach' 
                  ? 'TRAINERTEAM' 
                  : category === 'staff' 
                    ? 'FUNKTIONSTEAM' 
                    : 'SANITAETER / PHYSIO';

              return (
                <React.Fragment key={category}>
                  <tr className="bg-[#202020] border-y border-[#2A2A2A]">
                    <td colSpan={3 + displayedRunIndices.length} className="p-2 font-black uppercase text-[10px] tracking-widest text-[#FFD54F] bg-[#202020] border-l-4 border-l-[#FFD54F]">
                      {categoryTitle} ({categoryPlayers.length})
                    </td>
                  </tr>

                  {categoryPlayers.map((player, pIdx) => {
                    const record = runRecords.find(r => r.playerId === player.id);

                    return (
                      <tr key={player.id} className="hover:bg-[#202020] transition-colors border-b border-[#2A2A2A] bg-[#1A1A1A]">
                        <td className="p-2 border-r border-[#2A2A2A] text-center font-mono font-bold text-[#888888] text-[10px]">
                          {pIdx + 1}
                        </td>
                        <td className="p-2 border-r border-[#2A2A2A]">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-[#202020] text-[#F5F5F5] rounded border border-[#2A2A2A] text-[9px] font-black shrink-0 shadow-xs">
                              {player.category === 'player' ? `#${player.number || '?'}` : (player.category === 'coach' ? 'T' : (player.category === 'staff' ? 'F' : 'M'))}
                            </span>
                            <div className="flex flex-col leading-tight min-w-0">
                              <span className="text-[11px] font-black uppercase text-[#F5F5F5] truncate">
                                {player.lastName} {player.firstName}
                              </span>
                              <span className="text-[8px] font-bold text-[#888888] uppercase">
                                {player.category === 'player' ? 'Spieler' : 'Stab'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-2 border-r border-[#2A2A2A] text-center font-black text-rose-400 uppercase text-[10px]">
                          {player.position || '-'}
                        </td>
                        {displayedRunIndices.map((i) => {
                          const val = record?.runs ? record.runs[i] || '' : '';
                          return (
                            <td key={i} className="p-0 border-r border-[#2A2A2A]">
                              <input 
                                type="text"
                                className={`w-full h-full p-2.5 text-center bg-transparent font-black text-[#F5F5F5] text-xs focus:bg-[#202020] focus:text-[#FFD54F] focus:outline-none transition-colors ${!isEditing ? 'cursor-not-allowed opacity-90' : ''}`}
                                value={val}
                                onChange={(e) => handleUpdateRun(player.id, i, e.target.value)}
                                placeholder={isEditing ? "--" : ""}
                                disabled={!isEditing}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="p-3 bg-[#1A1A1A] text-[#F5F5F5] border-t border-[#2A2A2A] flex flex-wrap justify-between items-center gap-2 shrink-0">
        <div className="flex items-center gap-4 text-[10px] font-bold">
          <div className="flex items-center gap-1.5 text-[#FFD54F] font-black">
            <Timer size={14} />
            <span>Erfassung: Zeiten in MM:SS oder Distanz in Metern</span>
          </div>
          <span className="text-[#333333]">|</span>
          <div className="flex items-center gap-1 text-[#C7C7C7]">
            <Users size={13} className="text-[#888888]" />
            <span>{filteredPlayers.length} Spieler in Ansicht</span>
          </div>
        </div>
        <p className="text-[9px] font-bold text-[#888888] uppercase italic">
          FC Auggen • Performance & Leistungsdiagnostik
        </p>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* AI PARSED DATA IMPORT MODAL */}
      {/* ------------------------------------------------------------- */}
      {showImportModal && parsedRunData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#202020] text-[#F5F5F5] border-b border-[#2A2A2A] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#FFD54F] text-[#0F0F0F] rounded-lg border border-[#FFD54F]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black uppercase text-sm tracking-wide flex items-center gap-2">
                    <span>PDF-Analyse Auswertung</span>
                    <span className="text-[9px] font-bold bg-[#1A1A1A] text-[#FFD54F] px-2 py-0.5 rounded border border-[#2A2A2A]">
                      {uploadFileName}
                    </span>
                  </h3>
                  <p className="text-[10px] font-bold text-[#C7C7C7]">
                    Gefundene Läufe & Spieler-Laufzeiten aus dem Dokument
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowImportModal(false)} 
                className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#888888] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 bg-[#0F0F0F] space-y-6 custom-scrollbar">
              
              {/* Runs Identified Box */}
              <div>
                <h4 className="text-xs font-black uppercase text-[#F5F5F5] mb-2 flex items-center gap-1.5">
                  <Activity size={14} className="text-[#FFD54F]" />
                  <span>Erkannte Laufeinheiten ({parsedRunData.runs.length})</span>
                </h4>
                {parsedRunData.runs.length === 0 ? (
                  <p className="text-xs text-[#888888] italic">Keine expliziten Laufbezeichnungen gefunden (Verwende Standard slots).</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {parsedRunData.runs.map((r, idx) => (
                      <div key={idx} className="bg-[#1A1A1A] p-3 border border-[#2A2A2A] rounded-lg shadow-xs">
                        <div className="flex justify-between items-center text-[10px] font-black text-[#FFD54F] mb-1">
                          <span>SLOT #{r.runIndex + 1}</span>
                          {r.runDate && <span>{r.runDate}</span>}
                        </div>
                        <p className="font-black text-[#F5F5F5] text-xs uppercase">{r.runName}</p>
                        {r.runContent && <p className="text-[10px] text-[#C7C7C7] mt-0.5">{r.runContent}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Results Table */}
              <div>
                <h4 className="text-xs font-black uppercase text-[#F5F5F5] mb-2 flex items-center gap-1.5">
                  <Users size={14} className="text-[#FFD54F]" />
                  <span>Erkannte Spieler-Laufzeiten ({parsedRunData.playerResults.length} Einträge)</span>
                </h4>
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg overflow-hidden shadow-xs">
                  <table className="w-full text-[11px]">
                    <thead className="bg-[#202020] text-[#FFD54F] font-black text-[10px] uppercase border-b border-[#2A2A2A]">
                      <tr>
                        <th className="p-2 text-left">Gefundener Name</th>
                        <th className="p-2 text-left">Zugewiesener Spieler</th>
                        <th className="p-2 text-center">Lauf Slot</th>
                        <th className="p-2 text-center">Gemessener Wert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {parsedRunData.playerResults.map((item, idx) => {
                        const matchedPlayer = sortedPlayers.find(p => p.id === item.matchedPlayerId);
                        return (
                          <tr key={idx} className="hover:bg-[#202020]">
                            <td className="p-2 font-bold text-[#F5F5F5]">{item.playerName}</td>
                            <td className="p-2">
                              {matchedPlayer ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/80 text-[#00D47A] text-[10px] font-black uppercase border border-[#00D47A]/30">
                                  <Check size={10} />
                                  #{matchedPlayer.number || '?'} {matchedPlayer.lastName} {matchedPlayer.firstName}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-950/80 text-[#FACC15] text-[10px] font-black uppercase border border-[#FACC15]/30">
                                  <AlertCircle size={10} />
                                  Keine direkte Zuordnung
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-center font-bold text-[#C7C7C7]">
                              Lauf #{item.runIndex + 1}
                            </td>
                            <td className="p-2 text-center font-black text-[#FFD54F]">
                              {item.value}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#202020] border-t border-[#2A2A2A] flex justify-between items-center">
              <span className="text-xs font-bold text-[#C7C7C7]">
                Klicke auf "Daten übernehmen", um die Laufzeiten in die Haupttabelle einzufügen.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFD54F] rounded-lg text-xs font-bold text-[#F5F5F5] transition-colors cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-5 py-2 bg-[#FFD54F] text-[#0F0F0F] hover:bg-[#ffe082] rounded-lg border border-[#FFD54F] text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Check size={16} />
                  <span>Daten in Läufe-Tabelle übernehmen</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINT & PDF PREVIEW MODAL */}
      {/* ------------------------------------------------------------- */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 bg-[#202020] text-[#F5F5F5] border-b border-[#2A2A2A] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Printer size={20} className="text-[#FFD54F]" />
                <div>
                  <h3 className="font-black uppercase text-sm tracking-wide">Druck- & PDF-Vorschau</h3>
                  <p className="text-[10px] font-bold text-[#C7C7C7]">
                    Vorschau des Berichts für Läufe und Ausdauerwerte
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPrintModal(false)} 
                className="p-1.5 hover:bg-[#2A2A2A] rounded-lg text-[#888888] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content / Preview Area */}
            <div className="flex-1 overflow-auto p-6 bg-[#0F0F0F] custom-scrollbar flex justify-center">
              <div className="bg-[#1E293B] text-slate-900 border border-slate-300 p-8 shadow-2xl w-full max-w-4xl space-y-6 rounded-lg">
                
                {/* Print Document Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-red-700 uppercase">
                      FC AUGGEN • LEISTUNGSDIAGNOSTIK
                    </span>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                      Läufe & Ausdauer Übersicht
                    </h1>
                    <p className="text-xs font-bold text-slate-600">
                      Individualisierte Ausdauer- & Trainingssteuerung
                    </p>
                  </div>
                  <div className="text-right font-bold text-xs text-slate-600">
                    <p>Datum: {new Date().toLocaleDateString('de-DE')}</p>
                    <p>Spieler: {filteredPlayers.length}</p>
                  </div>
                </div>

                {/* Runs Summary Box */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-100 p-3 rounded-lg border border-slate-300">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-red-700 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500">Konfigurierte Läufe</p>
                      <p className="text-xs font-black text-slate-900">
                        {displayedRunIndices.length} von 15 Einheiten
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-slate-800 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500">Kaderteilnahme</p>
                      <p className="text-xs font-black text-slate-900">
                        {filteredPlayers.length} Erfasste Personen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-500">Status</p>
                      <p className="text-xs font-black text-slate-900">Aktueller Leistungstand</p>
                    </div>
                  </div>
                </div>

                {/* Printable Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-900 text-[10px]">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th className="border border-slate-900 p-2 text-center w-8">#</th>
                        <th className="border border-slate-900 p-2 text-left w-48">Spieler</th>
                        <th className="border border-slate-900 p-2 text-center w-12">Pos</th>
                        {displayedRunIndices.map((i) => {
                          const meta = getRunMeta(i);
                          return (
                            <th key={i} className="border border-slate-900 p-2 text-center min-w-[80px]">
                              <div className="font-black text-amber-400">{meta.name || `Lauf ${i + 1}`}</div>
                              {meta.content && <div className="text-[8px] text-slate-300 font-normal truncate">{meta.content}</div>}
                              {meta.date && <div className="text-[8px] text-slate-400">{meta.date}</div>}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlayers.map((player, idx) => {
                        const record = runRecords.find(r => r.playerId === player.id);
                        return (
                          <tr key={player.id} className={idx % 2 === 0 ? 'bg-[#1E293B]' : 'bg-slate-50'}>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-slate-600">
                              {player.number ? `#${player.number}` : idx + 1}
                            </td>
                            <td className="border border-slate-300 p-1.5 font-black text-slate-900 uppercase">
                              {player.lastName} {player.firstName}
                            </td>
                            <td className="border border-slate-300 p-1.5 text-center font-bold text-red-700">
                              {player.position || '-'}
                            </td>
                            {displayedRunIndices.map((i) => {
                              const val = record?.runs ? record.runs[i] || '-' : '-';
                              return (
                                <td key={i} className="border border-slate-300 p-1.5 text-center font-extrabold text-slate-900">
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="text-right text-[9px] font-bold text-slate-500 border-t border-slate-300 pt-3">
                  Erstellt von CoCoach System
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-[#202020] border-t border-[#2A2A2A] flex justify-between items-center">
              <span className="text-xs font-bold text-[#C7C7C7]">
                Nutzen Sie den Druckdialog, um das Dokument als PDF zu speichern.
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFD54F] rounded-lg text-xs font-bold text-[#F5F5F5] transition-colors cursor-pointer"
                >
                  Schließen
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-4 py-2 bg-rose-600 text-white rounded-lg border border-rose-600 hover:bg-rose-700 text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <FileDown size={14} />
                  <span>Als PDF speichern</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-[#FFD54F] text-[#0F0F0F] rounded-lg border border-[#FFD54F] hover:bg-[#ffe082] text-xs font-black uppercase flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Printer size={14} className="text-[#0F0F0F]" />
                  <span>Drucken</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* OFFSCREEN CONTAINER FOR HTML2CANVAS & PRINT REPORT GENERATION */}
      {/* ------------------------------------------------------------- */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none z-[-1000]" aria-hidden="true">
        <div 
          ref={pdfContainerRef} 
          id="runs-pdf-report"
          className="p-8 bg-[#1E293B] text-slate-900 font-sans"
          style={{ width: '1200px', backgroundColor: '#ffffff' }}
        >
          {/* Document Header */}
          <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <span className="text-xs font-black tracking-widest text-red-700 uppercase">
                FC AUGGEN • LEISTUNGSDIAGNOSTIK & TRAININGSSTEUERUNG
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 mt-1">
                LÄUFE & AUSDAUER - KATALOG
              </h1>
              <p className="text-xs font-bold text-slate-600">
                Erfasste Laufzeiten, Distanzen und Leistungsüberprüfungen aller Spieler
              </p>
            </div>
            <div className="text-right font-bold text-xs text-slate-700 bg-slate-100 p-3 rounded-lg border border-slate-300">
              <p><span className="text-slate-500 uppercase">Datum:</span> {new Date().toLocaleDateString('de-DE')}</p>
              <p><span className="text-slate-500 uppercase">Kaderstärke:</span> {filteredPlayers.length} Personen</p>
              <p><span className="text-slate-500 uppercase">Einheiten:</span> {displayedRunIndices.length} Läufe</p>
            </div>
          </div>

          {/* Table */}
          <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-6">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="border border-slate-900 p-2 text-center w-10">#</th>
                <th className="border border-slate-900 p-2 text-left w-60 font-black">Spieler / Name</th>
                <th className="border border-slate-900 p-2 text-center w-16 text-amber-400 font-black">Pos</th>
                {displayedRunIndices.map((i) => {
                  const meta = getRunMeta(i);
                  return (
                    <th key={i} className="border border-slate-900 p-2 text-center">
                      <div className="font-black text-amber-400 uppercase">{meta.name || `Lauf ${i + 1}`}</div>
                      {meta.content && <div className="text-[9px] font-medium text-slate-300">{meta.content}</div>}
                      {meta.date && <div className="text-[8px] text-slate-400 mt-0.5">{meta.date}</div>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {['player', 'coach', 'staff', 'medical'].map(category => {
                const categoryPlayers = filteredPlayers.filter(p => (p.category || 'player') === category);
                if (categoryPlayers.length === 0) return null;

                const categoryTitle = category === 'player' 
                  ? 'SPIELERKADER' 
                  : category === 'coach' 
                    ? 'TRAINERTEAM' 
                    : category === 'staff' 
                      ? 'FUNKTIONSTEAM' 
                      : 'SANITAETER / PHYSIO';

                return (
                  <React.Fragment key={category}>
                    <tr className="bg-slate-200 border-y-2 border-slate-900">
                      <td colSpan={3 + displayedRunIndices.length} className="p-2 font-black uppercase text-xs tracking-wider text-slate-900 bg-slate-200">
                        {categoryTitle}
                      </td>
                    </tr>
                    {categoryPlayers.map((player, pIdx) => {
                      const record = runRecords.find(r => r.playerId === player.id);
                      return (
                        <tr key={player.id} className={pIdx % 2 === 0 ? 'bg-[#1E293B]' : 'bg-slate-50'}>
                          <td className="border border-slate-300 p-2 text-center font-bold text-slate-600">
                            {player.number ? `#${player.number}` : pIdx + 1}
                          </td>
                          <td className="border border-slate-300 p-2 font-black text-slate-900 uppercase">
                            {player.lastName} {player.firstName}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-black text-red-700">
                            {player.position || '-'}
                          </td>
                          {displayedRunIndices.map((i) => {
                            const val = record?.runs ? record.runs[i] || '-' : '-';
                            return (
                              <td key={i} className="border border-slate-300 p-2 text-center font-extrabold text-slate-900">
                                {val}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center text-xs font-bold text-slate-600">
            <p>FC Auggen — Offizielles Dokument zur Trainings- & Ausdauersteuerung</p>
            <p>Exportiert am {new Date().toLocaleString('de-DE')}</p>
          </div>
        </div>
      </div>

      {/* TRACKER REPORT MODAL */}
      {showTrackerModal && (
        <TrackerReportModal
          players={players}
          onClose={() => setShowTrackerModal(false)}
          onUpdatePlayer={onUpdatePlayer}
        />
      )}
    </div>
  );
};
