import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Player, TrackerAcademyReport } from '../../types';
import { sortPlayers } from '../../utils/playerSorting';
import { generateTrackerAcademyReport } from '../../utils/trackerReportCalculator';
import { fixOklchForHtml2Canvas } from '../../utils/pdfExportHelper';
import { formatSessionDate } from '../../utils/dateUtils';
import JSZip from 'jszip';
import { 
  Activity, 
  Upload, 
  FileText, 
  Sparkles, 
  CheckCircle2, 
  Printer, 
  Search, 
  User, 
  BarChart2, 
  History, 
  Lock, 
  FileArchive,
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Target,
  Trash2 
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface TrackerAcademyReportViewProps {
  players: Player[];
  trackerAcademyReports: TrackerAcademyReport[];
  saveTrackerAcademyReport: (report: TrackerAcademyReport) => Promise<any>;
  deleteTrackerAcademyReport: (id: string) => Promise<any>;
  onUpdatePlayer?: (id: string, field: keyof Player, value: any) => void;
  selectedPlayerId?: string;
  onSelectPlayer?: (id: string) => void;
}

export const TrackerAcademyReportView: React.FC<TrackerAcademyReportViewProps> = ({
  players,
  trackerAcademyReports = [],
  saveTrackerAcademyReport,
  deleteTrackerAcademyReport,
  onUpdatePlayer,
  selectedPlayerId: propSelectedPlayerId,
  onSelectPlayer
}) => {
  const onlyPlayers = useMemo(() => {
    return players.filter(p => {
      const cat = p.category;
      if (cat && (cat as string) !== 'player') return false;
      const pos = (p.position || '').toLowerCase();
      if (pos.includes('trainer') || pos.includes('physio') || pos.includes('manager') || pos.includes('athletik') || pos.includes('arzt') || pos.includes('betreuer') || pos.includes('funktionär')) return false;
      return true;
    });
  }, [players]);

  const sortedPlayers = useMemo(() => {
    return sortPlayers(onlyPlayers);
  }, [onlyPlayers]);
  const pdfReportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Selected Player
  const [internalSelectedPlayerId, setInternalSelectedPlayerId] = useState<string>(() => propSelectedPlayerId || sortedPlayers[0]?.id || '');

  useEffect(() => {
    if (propSelectedPlayerId) {
      setInternalSelectedPlayerId(propSelectedPlayerId);
    }
  }, [propSelectedPlayerId]);

  const activePlayerId = propSelectedPlayerId || internalSelectedPlayerId;

  const setSelectedPlayerId = (id: string) => {
    setInternalSelectedPlayerId(id);
    if (onSelectPlayer) {
      onSelectPlayer(id);
    }
  };
  
  // Selected Report ID (for history viewing)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Import / Upload / Simulation Modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [rawText, setRawText] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [posFilter, setPosFilter] = useState<string>('ALLE');

  const selectedPlayer = useMemo(() => {
    return sortedPlayers.find(p => p.id === activePlayerId) || sortedPlayers[0];
  }, [sortedPlayers, activePlayerId]);

  // All reports for the selected player (sorted newest first)
  const playerReports = useMemo(() => {
    if (!selectedPlayer) return [];
    return trackerAcademyReports
      .filter(r => r.playerId === selectedPlayer.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [trackerAcademyReports, selectedPlayer]);

  // ── Kumulierte WG-Tracker Gesamtauswertung ─────────────────────────────
  // WO die Daten liegen: als `trackerHistory` im WG-Tracker (📍 rote
  // Stecknadel) des Spielers – alle archivierten BIN-Sessions.
  // ZIEL: diese Rohdaten vorne in der Tracker-Analyse kumuliert anzeigen.
  const cumulativeTracker = useMemo(() => {
    const hist = ((selectedPlayer as any)?.trackerHistory || []) as any[];
    if (!hist.length) return null;

    let totalDistanceKm = 0, maxSpeedKmh = 0, sumAvgSpeed = 0, avgSpeedCount = 0;
    let sumAvgHr = 0, avgHrCount = 0, maxHeartRateBpm = 0, totalDurationSec = 0, totalSprints = 0;
    let zone1Min = 0, zone2Min = 0, zone3Min = 0, zone4Min = 0, zonesCount = 0;
    let totalSprintDistanceM = 0, sprintDistanceCount = 0;
    const dates: string[] = [];

    for (const h of hist) {
      const distKm = h.gesamtDistanzMeter !== undefined ? h.gesamtDistanzMeter / 1000 : (h.totalDistanceKm || 0);
      if (distKm) totalDistanceKm += distKm;

      const ms = h.maxGeschwindigkeitKmh ?? h.maxSpeedKmh;
      if (ms) maxSpeedKmh = Math.max(maxSpeedKmh, Number(ms));

      const as = h.durchschnittsGeschwindigkeitKmh ?? h.avgSpeedKmh;
      if (as) { sumAvgSpeed += Number(as); avgSpeedCount++; }

      const ah = h.durchschnittsHerzfrequenz ?? h.avgHeartRateBpm;
      if (ah) { sumAvgHr += Number(ah); avgHrCount++; }

      const mh = h.maxHerzfrequenz ?? h.maxHeartRateBpm;
      if (mh) maxHeartRateBpm = Math.max(maxHeartRateBpm, Number(mh));

      totalDurationSec += Number(h.gesamtDauerSekunden || h.durationSec || 0);
      totalSprints += Array.isArray(h.sprints) ? h.sprints.length : Number(h.sprintCount || 0);

      // Kumulierte Belastungszonen (Minuten)
      const z = h.belastungsZonen;
      if (z && typeof z === 'object') {
        zonesCount++;
        zone1Min += Number(z.zone1LockerMin || 0);
        zone2Min += Number(z.zone2NormalMin || 0);
        zone3Min += Number(z.zone3IntensivMin || 0);
        zone4Min += Number(z.zone4SehrIntensivMin || 0);
      }

      // Kumulierte Sprint-Distanz (Meter)
      const sd = h.sprintDistanceM ?? h.sprintDistance;
      if (sd !== undefined) { totalSprintDistanceM += Number(sd); sprintDistanceCount++; }

      const d = h.datum || h.date || h.sessionDate;
      if (d) dates.push(String(d));
    }

    dates.sort();
    return {
      sessions: hist.length,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      avgDistanceKm: Number((totalDistanceKm / hist.length).toFixed(2)),
      maxSpeedKmh: Number(maxSpeedKmh.toFixed(1)),
      avgSpeedKmh: avgSpeedCount ? Number((sumAvgSpeed / avgSpeedCount).toFixed(1)) : 0,
      avgHeartRateBpm: avgHrCount ? Math.round(sumAvgHr / avgHrCount) : 0,
      maxHeartRateBpm,
      totalDurationMin: Math.round(totalDurationSec / 60),
      totalSprints,
      zone1Min: Math.round(zone1Min),
      zone2Min: Math.round(zone2Min),
      zone3Min: Math.round(zone3Min),
      zone4Min: Math.round(zone4Min),
      totalZoneMin: Math.round(zone1Min + zone2Min + zone3Min + zone4Min),
      hasZones: zonesCount > 0,
      totalSprintDistanceM: Math.round(totalSprintDistanceM),
      hasSprintDistance: sprintDistanceCount > 0,
      firstDate: dates[0],
      lastDate: dates[dates.length - 1],
    };
  }, [selectedPlayer]);

  // Calculate Team Average Overall Score across all reports
  const teamAverageOverall = useMemo(() => {
    if (trackerAcademyReports.length === 0) return 76;
    const sum = trackerAcademyReports.reduce((acc, r) => acc + (r.overallScore || 75), 0);
    return Math.round(sum / trackerAcademyReports.length);
  }, [trackerAcademyReports]);

  // Active Report to display (either user-selected from history or latest)
  const activeReport = useMemo<TrackerAcademyReport | null>(() => {
    if (selectedReportId) {
      const found = trackerAcademyReports.find(r => r.id === selectedReportId);
      if (found) return found;
    }
    if (playerReports.length > 0) return playerReports[0];

    // If no report exists yet for this player, auto-generate a initial baseline report
    if (selectedPlayer) {
      return generateTrackerAcademyReport(selectedPlayer, {}, teamAverageOverall, 'Basis-Telemetrie');
    }
    return null;
  }, [selectedReportId, playerReports, trackerAcademyReports, selectedPlayer, teamAverageOverall]);

  // Check if duplicate reports exist for the selected player (same date or file name)
  const hasDuplicates = useMemo(() => {
    if (playerReports.length <= 1) return false;
    const seen = new Set<string>();
    for (const r of playerReports) {
      const key = `${r.analysisDate}_${r.rawFileName || ''}`;
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  }, [playerReports]);

  // Handle instant report deletion
  const handleDeleteReport = (reportId: string) => {
    if (!reportId) return;
    deleteTrackerAcademyReport(reportId);
    if (selectedReportId === reportId) {
      setSelectedReportId(null);
    }
    setToastMessage('Bericht erfolgreich gelöscht!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Handle cleanup of duplicates (keeps newest per date/filename)
  const handleCleanupDuplicates = () => {
    if (!playerReports || playerReports.length <= 1) return;
    const seen = new Map<string, string>();
    const duplicateIdsToDelete: string[] = [];

    for (const r of playerReports) {
      const key = `${r.analysisDate}_${r.rawFileName || ''}`;
      if (seen.has(key)) {
        duplicateIdsToDelete.push(r.id);
      } else {
        seen.set(key, r.id);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      duplicateIdsToDelete.forEach(id => {
        deleteTrackerAcademyReport(id);
      });
      if (selectedReportId && duplicateIdsToDelete.includes(selectedReportId)) {
        setSelectedReportId(null);
      }
      setToastMessage(`${duplicateIdsToDelete.length} doppelte ${duplicateIdsToDelete.length === 1 ? 'Session' : 'Sessions'} bereinigt!`);
      setTimeout(() => setToastMessage(null), 4000);
    } else {
      setToastMessage('Keine Duplikate gefunden.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Toast handler
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Kumulierte WG-Tracker-Daten (aus trackerHistory / rote Stecknadel) in
  // einen eigenen Bericht überführen, damit die Gesamtbilanz auch in der
  // Berichts-Historie dauerhaft verfügbar ist.
  const handleCreateCumulativeReport = async () => {
    if (!selectedPlayer || !cumulativeTracker) return;
    try {
      const metrics = {
        totalDistanceKm: cumulativeTracker.avgDistanceKm,
        maxSpeedKmh: cumulativeTracker.maxSpeedKmh,
        avgSpeedKmh: cumulativeTracker.avgSpeedKmh,
        sprintCount: Math.round(cumulativeTracker.totalSprints / cumulativeTracker.sessions),
        avgHeartRateBpm: cumulativeTracker.avgHeartRateBpm,
        maxHeartRateBpm: cumulativeTracker.maxHeartRateBpm,
        sessionDate: cumulativeTracker.lastDate,
      };
      const report = generateTrackerAcademyReport(
        selectedPlayer,
        metrics,
        teamAverageOverall,
        `WG-Tracker Kumulation (${cumulativeTracker.sessions} Sessions)`
      );
      report.id = `tar_${selectedPlayer.id}_cum_${Date.now()}`;
      await saveTrackerAcademyReport(report);
      setSelectedReportId(report.id);
      showToast('Kumulierter WG-Tracker-Bericht erstellt!');
    } catch (e: any) {
      showToast(`Fehler beim Erstellen: ${e?.message || e}`);
    }
  };

  // Helper function to extract tracker telemetry metrics and recording date from any string content
  const extractMetricsFromText = (fileContent: string) => {
    const metrics: any = {};
    try {
      const parsed = JSON.parse(fileContent);
      const extractedDate = parsed.sessionDate || parsed.datum || parsed.date || parsed.recordingDate || parsed.session_date || parsed.aufnahmeDatum || parsed.Datum || parsed.Date || undefined;
      const extractedTime = parsed.sessionTime || parsed.uhrzeit || parsed.time || parsed.recordingTime || parsed.Time || undefined;

      return {
        sessionDate: extractedDate,
        sessionTime: extractedTime,
        datum: extractedDate,
        uhrzeit: extractedTime,
        totalDistanceKm: parsed.distanceKm || parsed.totalDistance || parsed.distance || parsed.gesamtDistanzKm || (parsed.gesamtDistanzMeter ? parsed.gesamtDistanzMeter / 1000 : undefined),
        maxSpeedKmh: parsed.maxSpeedKmh || parsed.maxSpeed || parsed.topSpeed || parsed.maxGeschwindigkeitKmh || undefined,
        avgSpeedKmh: parsed.avgSpeedKmh || parsed.avgSpeed || parsed.durchschnittsGeschwindigkeitKmh || undefined,
        sprintCount: parsed.sprints || parsed.sprintCount || (parsed.sprints && Array.isArray(parsed.sprints) ? parsed.sprints.length : undefined),
        highSpeedDistanceMeters: parsed.highSpeedDistance || parsed.highSpeedMeters || parsed.highSpeedDistanceMeters || undefined,
        avgHeartRateBpm: parsed.avgHr || parsed.avgHeartRate || parsed.durchschnittsHerzfrequenz || undefined,
        maxHeartRateBpm: parsed.maxHr || parsed.maxHeartRate || parsed.maxHerzfrequenz || undefined,
        hrRecoveryDropBpm: parsed.hrRecovery || parsed.hrDrop || undefined,
        accelerationsCount: parsed.accelerations || parsed.accelerationsCount || undefined,
        repeatSprintDropoffPercent: parsed.repeatSprintDropoff || parsed.rsaDropoff || undefined
      };
    } catch {
      // Regex parsing for CSV or TXT exports
      const distMatch = fileContent.match(/(\d+[.,]\d+)\s*km/i) || fileContent.match(/dist(?:ance)?\s*[:=,]\s*(\d+[.,]\d+)/i);
      const speedMatch = fileContent.match(/(\d+[.,]\d+)\s*km\/h/i) || fileContent.match(/speed\s*[:=,]\s*(\d+[.,]\d+)/i);
      const sprintsMatch = fileContent.match(/(\d+)\s*sprints/i) || fileContent.match(/sprints\s*[:=,]\s*(\d+)/i);
      const hrMatch = fileContent.match(/(\d+)\s*bpm/i) || fileContent.match(/hr\s*[:=,]\s*(\d+)/i);

      // Date matching in CSV / TXT
      const isoDateMatch = fileContent.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      const deDateMatch = fileContent.match(/\b([0-3]\d\.[01]\d\.(202\d))\b/);
      if (isoDateMatch) {
        metrics.sessionDate = isoDateMatch[1];
        metrics.datum = isoDateMatch[1];
      } else if (deDateMatch) {
        const parts = deDateMatch[1].split('.');
        const converted = `${parts[2]}-${parts[1]}-${parts[0]}`;
        metrics.sessionDate = converted;
        metrics.datum = converted;
      }

      if (distMatch) metrics.totalDistanceKm = parseFloat(distMatch[1].replace(',', '.'));
      if (speedMatch) metrics.maxSpeedKmh = parseFloat(speedMatch[1].replace(',', '.'));
      if (sprintsMatch) metrics.sprintCount = parseInt(sprintsMatch[1], 10);
      if (hrMatch) metrics.avgHeartRateBpm = parseInt(hrMatch[1], 10);
    }
    return metrics;
  };

  // Automatic Data Import / ZIP Parsing with STRICT player locking
  const handleProcessTrackerUpload = async (simulatedInput?: any) => {
    if (!selectedPlayer) {
      alert("Bitte wähle zuerst einen Spieler aus.");
      return;
    }

    // Explicitly lock target player ID to prevent jumping to another player
    const targetPlayer = selectedPlayer;
    const targetPlayerId = selectedPlayer.id;

    setIsProcessing(true);
    showToast(`Einlesen & Entpacken für ${targetPlayer.firstName} ${targetPlayer.lastName} läuft...`);

    try {
      let metrics: any = simulatedInput || {};
      let sourceName = uploadFile?.name || (simulatedInput ? 'Live-Tracker Import (GPS Telemetrie)' : 'Manueller Text-Import');

      if (!simulatedInput) {
        if (uploadFile) {
          const fileNameLower = uploadFile.name.toLowerCase();

          // Check if file name or lastModified provides recording date
          let fileDate = '';
          const nameIsoMatch = uploadFile.name.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
          const nameDeMatch = uploadFile.name.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
          const nameCompactMatch = uploadFile.name.match(/\b(202\d)([01]\d)([0-3]\d)\b/);
          if (nameIsoMatch) {
            fileDate = nameIsoMatch[1];
          } else if (nameDeMatch) {
            fileDate = `${nameDeMatch[3]}-${nameDeMatch[2]}-${nameDeMatch[1]}`;
          } else if (nameCompactMatch) {
            fileDate = `${nameCompactMatch[1]}-${nameCompactMatch[2]}-${nameCompactMatch[3]}`;
          } else if (uploadFile.lastModified && uploadFile.lastModified > 0) {
            const modDate = new Date(uploadFile.lastModified);
            if (!isNaN(modDate.getTime()) && modDate.getFullYear() >= 2020) {
              fileDate = modDate.toISOString().split('T')[0];
            }
          }

          // 1. Handling ZIP Files via JSZip
          if (fileNameLower.endsWith('.zip')) {
            sourceName = `ZIP Archive: ${uploadFile.name}`;
            const zip = new JSZip();
            const contents = await zip.loadAsync(uploadFile);
            let combinedText = '';

            // Iterate through all files inside ZIP
            const entries = Object.keys(contents.files);
            for (const filename of entries) {
              const zipEntry = contents.files[filename];
              if (!zipEntry.dir && !filename.startsWith('__MACOSX')) {
                const text = await zipEntry.async('string');
                combinedText += `\n--- FILE: ${filename} ---\n` + text;
              }
            }

            metrics = extractMetricsFromText(combinedText);
          } else {
            // Standard CSV / JSON / TXT
            const fileContent = await uploadFile.text();
            metrics = extractMetricsFromText(fileContent);
          }

          if (fileDate && !metrics.sessionDate) {
            metrics.sessionDate = fileDate;
            metrics.datum = fileDate;
          }
        } else if (rawText.trim()) {
          metrics = extractMetricsFromText(rawText);
        }
      }

      // Generate report strictly for targetPlayer
      const newReport = generateTrackerAcademyReport(targetPlayer, metrics, teamAverageOverall, sourceName);

      // Save to Firestore without overwriting existing records
      await saveTrackerAcademyReport(newReport);

      // Ensure state remains strictly locked to the target player
      setSelectedPlayerId(targetPlayerId);
      setSelectedReportId(newReport.id);

      // Optional update player's quick tracker summary field
      if (onUpdatePlayer) {
        onUpdatePlayer(targetPlayerId, 'trackerAnalysis', {
          totalDistanceKm: newReport.metrics.totalDistanceKm,
          maxSpeedKmh: newReport.metrics.maxSpeedKmh,
          sprintCount: newReport.metrics.sprintCount,
          avgHeartRateBpm: newReport.metrics.avgHeartRateBpm,
          maxHeartRateBpm: newReport.metrics.maxHeartRateBpm,
          tacticalSummary: newReport.classification,
          datum: newReport.analysisDate,
          sessionDate: newReport.analysisDate,
          uploadDate: newReport.analysisDate
        });
      }

      setShowImportModal(false);
      setRawText('');
      setUploadFile(null);
      showToast(`✅ Tracker-Bericht für ${targetPlayer.firstName} ${targetPlayer.lastName} zugewiesen & gespeichert!`);
    } catch (err: any) {
      console.error("Error processing tracker report:", err);
      alert(`Fehler beim Verarbeiten der Tracker-Datei: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!pdfReportRef.current) return;
    showToast("PDF-Export wird vorbereitet...");
    try {
      const canvas = await html2canvas(pdfReportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
        onclone: (clonedDoc) => {
          fixOklchForHtml2Canvas(clonedDoc);
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const cleanName = activeReport ? activeReport.playerName.replace(/\s+/g, '_') : 'Spielerbericht';
      pdf.save(`Spielerbericht_${cleanName}_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("✅ PDF erfolgreich gedruckt und heruntergeladen!");
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Fehler beim Erstellen der PDF-Datei.");
    }
  };

  // Helper color badges
  const getScoreColorClass = (score: number) => {
    if (score >= 88) return 'bg-emerald-500 text-white border-emerald-600';
    if (score >= 75) return 'bg-teal-500 text-white border-teal-600';
    if (score >= 62) return 'bg-amber-500 text-white border-amber-600';
    return 'bg-rose-500 text-white border-rose-600';
  };

  const getScoreBarBg = (score: number) => {
    if (score >= 88) return 'bg-emerald-500';
    if (score >= 75) return 'bg-teal-500';
    if (score >= 62) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const filteredPlayersList = sortedPlayers.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || (p as any).name || ''}`.toLowerCase();
    const pos = (p.position || '').toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || pos.includes(searchTerm.toLowerCase());
    if (posFilter === 'ALLE') return matchesSearch;
    return matchesSearch && p.position === posFilter;
  });

  return (
    <div className="flex flex-col h-full bg-[#0F172A] text-slate-100 p-2 sm:p-4 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden min-h-screen">
      
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[300] bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl border border-emerald-400 flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Banner */}
      <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-md mb-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-600 to-rose-700 rounded-xl text-white shadow-lg border border-red-500">
            <Activity size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Tracker-Analyse
              </h2>
              <span className="bg-red-600/30 text-red-300 border border-red-500/50 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                FC Auggen AI System
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Vollautomatische ZIP/GPS-Telemetrie-Auswertung | 5 Leistungsbereiche &amp; Integrierte Trainerberichte
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-95 border border-red-400"
          >
            <Upload size={16} />
            <span>Tracker / ZIP-Daten Einlesen</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl font-bold text-xs border border-slate-600 transition-all active:scale-95"
          >
            <Printer size={16} />
            <span>Bericht Drucken / PDF</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Sidebar (Player Selection & History) | Right Main Panel (Integrated Player Report) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* Left Column: Player Selector & Report History (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Player Search & List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <User size={14} className="text-red-500" />
                Spieler-Auswahl ({filteredPlayersList.length})
              </span>
              
              {/* Position Filter */}
              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 rounded-lg px-2 py-1 outline-none focus:border-red-500"
              >
                <option value="ALLE">Alle Positionen</option>
                <option value="ST">Stürmer (ST)</option>
                <option value="RA">Flügel (RA/LA)</option>
                <option value="ZM">Mittelfeld (ZM/DM/OM)</option>
                <option value="RV">Außenverteidiger (RV/LV)</option>
                <option value="IV">Innenverteidiger (IV)</option>
                <option value="TW">Torwart (TW)</option>
              </select>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Spieler suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 rounded-xl pl-9 pr-3 py-2 outline-none focus:border-red-500"
              />
            </div>

            {/* Players Roster List */}
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredPlayersList.map(p => {
                const name = `${p.firstName || ''} ${p.lastName}`.trim();
                const isSelected = p.id === activePlayerId;
                const reportsCount = trackerAcademyReports.filter(r => r.playerId === p.id).length;

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlayerId(p.id);
                      setSelectedReportId(null); // Default to latest for selected player
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-red-600/20 border-red-500 text-white font-bold shadow-md ring-1 ring-red-500'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                        isSelected ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {p.number || '?'}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold leading-tight truncate flex items-center gap-1">
                          <span>{name}</span>
                          {isSelected && <span title="Spieler-Zuordnung fixiert"><Lock size={10} className="text-red-400 shrink-0" /></span>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold">{p.position || 'Kader'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {reportsCount > 0 && (
                        <span className="text-[10px] font-black bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-full">
                          {reportsCount} {reportsCount === 1 ? 'Bericht' : 'Berichte'}
                        </span>
                      )}
                      <ChevronRight size={14} className={isSelected ? 'text-red-400' : 'text-slate-600'} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Historical Tracker Reports Browser for Selected Player */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col gap-3 flex-1">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <History size={14} className="text-amber-500" />
                Berichts-Historie ({playerReports.length})
              </span>
              <div className="flex items-center gap-2">
                {hasDuplicates && (
                  <button
                    onClick={handleCleanupDuplicates}
                    className="text-[10px] text-amber-300 hover:text-amber-200 font-black bg-amber-950/80 hover:bg-amber-900 px-2 py-0.5 rounded-md border border-amber-600/60 transition-all flex items-center gap-1 cursor-pointer"
                    title="Doppelte Berichte / Uploads für diesen Spieler automatisch entfernen"
                  >
                    <span>🧹 Duplikate bereinigen</span>
                  </button>
                )}
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800">
                  Unverändert erhalten
                </span>
              </div>
            </div>

            {playerReports.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs rounded-xl border border-dashed border-slate-800">
                <Activity size={28} className="mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="font-bold text-slate-300">Keine früheren Berichte für {selectedPlayer?.firstName} {selectedPlayer?.lastName}</p>
                <p className="text-[10px] mt-1 text-slate-400">
                  Lade eine ZIP- oder Tracker-Datei hoch, um den ersten Bericht zu generieren.
                </p>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="mt-3 bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 px-3 py-1.5 rounded-lg text-[10px] font-bold"
                >
                  Tracker / ZIP Einlesen
                </button>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-72 pr-1 custom-scrollbar">
                {playerReports.map((rep, idx) => {
                  const isActive = activeReport?.id === rep.id;
                  return (
                    <div
                      key={rep.id}
                      onClick={() => setSelectedReportId(rep.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500 shadow-md ring-1 ring-amber-400'
                          : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white">{formatSessionDate(rep.analysisDate)}</span>
                          {idx === 0 && (
                            <span className="bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[9px] font-black px-1.5 py-0.2 rounded-full">
                              NEUESTE
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">
                          {rep.rawFileName || 'GPS / Puls Telemetrie'}
                        </p>
                        <p className="text-[10px] text-slate-300 font-semibold mt-1">
                          Distanz: {rep.metrics.totalDistanceKm} km | Sprints: {rep.metrics.sprintCount}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg border ${getScoreColorClass(rep.overallScore)}`}>
                          {rep.overallScore} Pkt
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReport(rep.id);
                          }}
                          className="text-slate-400 hover:text-red-400 hover:bg-red-950/60 p-1.5 rounded-lg transition-colors text-xs font-bold flex items-center gap-1 cursor-pointer"
                          title="Diesen Bericht löschen"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Simulate Button */}
            <div className="mt-auto pt-2 border-t border-slate-800">
              <button
                onClick={() => handleProcessTrackerUpload({})}
                disabled={isProcessing}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Simuliere neue Tracker-Telemetrie</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: INTEGRATED PLAYER REPORT DOCUMENT (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col">
          
          {/* ── KUMULIERTE WG-TRACKER GESAMTAUSWERTUNG (vorne) ── */}
          {selectedPlayer && cumulativeTracker && (
            <div className="mb-4 bg-slate-900 border border-red-500/40 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none" title="Datenquelle: WG-Tracker (rote Stecknadel)">📍</span>
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Kumulierte WG-Tracker Gesamtauswertung
                  </h3>
                  <span className="bg-red-600/30 text-red-300 border border-red-500/50 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                    Archivierte BIN-Daten · rote Stecknadel
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">
                  {cumulativeTracker.sessions} Session{cumulativeTracker.sessions === 1 ? '' : 's'}
                  {cumulativeTracker.firstDate && cumulativeTracker.lastDate
                    ? ` · ${formatSessionDate(cumulativeTracker.firstDate)} – ${formatSessionDate(cumulativeTracker.lastDate)}`
                    : ''}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { label: 'Gesamt-Distanz', value: `${cumulativeTracker.totalDistanceKm} km` },
                  { label: 'Ø Distanz / Session', value: `${cumulativeTracker.avgDistanceKm} km` },
                  { label: 'Top-Speed', value: `${cumulativeTracker.maxSpeedKmh} km/h` },
                  { label: 'Ø Speed', value: `${cumulativeTracker.avgSpeedKmh} km/h` },
                  { label: 'Sprints gesamt', value: `${cumulativeTracker.totalSprints}` },
                  { label: 'Ø Herzfrequenz', value: `${cumulativeTracker.avgHeartRateBpm} bpm` },
                  { label: 'Max Herzfrequenz', value: `${cumulativeTracker.maxHeartRateBpm} bpm` },
                  { label: 'Gesamt-Zeit', value: `${cumulativeTracker.totalDurationMin} min` },
                  { label: 'Sprint-Distanz', value: cumulativeTracker.totalSprintDistanceM > 0 ? `${(cumulativeTracker.totalSprintDistanceM / 1000).toFixed(2)} km` : '–' },
                  { label: 'Sessions', value: `${cumulativeTracker.sessions}` },
                  { label: 'Zeitraum', value: cumulativeTracker.firstDate && cumulativeTracker.lastDate
                      ? `${formatSessionDate(cumulativeTracker.firstDate)} – ${formatSessionDate(cumulativeTracker.lastDate)}`
                      : '–' },
                ].map((item, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700/60 rounded-xl px-3 py-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">{item.label}</span>
                    <span className="text-sm font-black text-white">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Kumulierte Belastungszonen (Zone 1-4) */}
              {cumulativeTracker.hasZones && cumulativeTracker.totalZoneMin > 0 && (
                <div className="mt-3 bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                      Kumulierte Belastungszonen
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Gesamt: {cumulativeTracker.totalZoneMin} min
                    </span>
                  </div>
                  {/* Proportionaler Zonen-Balken */}
                  <div className="w-full h-2.5 rounded-full overflow-hidden flex border border-slate-700">
                    <div className="bg-sky-500" style={{ width: `${(cumulativeTracker.zone1Min / cumulativeTracker.totalZoneMin) * 100}%` }} title={`Zone 1: ${cumulativeTracker.zone1Min} min`} />
                    <div className="bg-emerald-500" style={{ width: `${(cumulativeTracker.zone2Min / cumulativeTracker.totalZoneMin) * 100}%` }} title={`Zone 2: ${cumulativeTracker.zone2Min} min`} />
                    <div className="bg-amber-500" style={{ width: `${(cumulativeTracker.zone3Min / cumulativeTracker.totalZoneMin) * 100}%` }} title={`Zone 3: ${cumulativeTracker.zone3Min} min`} />
                    <div className="bg-rose-500" style={{ width: `${(cumulativeTracker.zone4Min / cumulativeTracker.totalZoneMin) * 100}%` }} title={`Zone 4: ${cumulativeTracker.zone4Min} min`} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {[
                      { label: 'Zone 1 · Locker', value: `${cumulativeTracker.zone1Min} min`, dot: 'bg-sky-500' },
                      { label: 'Zone 2 · Normal', value: `${cumulativeTracker.zone2Min} min`, dot: 'bg-emerald-500' },
                      { label: 'Zone 3 · Intensiv', value: `${cumulativeTracker.zone3Min} min`, dot: 'bg-amber-500' },
                      { label: 'Zone 4 · Sehr intensiv', value: `${cumulativeTracker.zone4Min} min`, dot: 'bg-rose-500' },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-900/60 border border-slate-700/60 rounded-lg px-3 py-2 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
                        <div className="min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block truncate">{item.label}</span>
                          <span className="text-sm font-black text-white">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
                <p className="text-[10px] text-slate-500 font-medium">
                  Quelle: WG-Tracker (📍 rote Stecknadel) – alle {cumulativeTracker.sessions} archivierten BIN-Sessions dieses Spielers zusammengefasst.
                </p>
                <button
                  onClick={handleCreateCumulativeReport}
                  className="bg-red-600/30 hover:bg-red-600/60 text-red-200 hover:text-white border border-red-500/60 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                  title="Kumulierte Gesamtbilanz als Bericht in der Historie dauerhaft speichern"
                >
                  <Sparkles size={12} />
                  <span>Als kumulierten Bericht speichern</span>
                </button>
              </div>
            </div>
          )}

          {!activeReport ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <FileText size={48} className="mx-auto mb-4 opacity-40 text-red-500" />
              <h3 className="text-lg font-black uppercase text-white">Kein Bericht geladen</h3>
              <p className="text-xs mt-2 max-w-md mx-auto">
                Wähle links einen Spieler aus oder lade Tracker-Daten hoch, um den integrierten Spielerbericht anzuzeigen.
              </p>
            </div>
          ) : (
            
            /* Integrated Player Report Document Container (Printable Paper Layout) */
            <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border-4 border-slate-900 p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden" ref={pdfReportRef}>
              
              {/* Report Document Header */}
              <div className="border-b-4 border-slate-900 pb-4 flex flex-wrap justify-between items-start gap-4 bg-slate-50 -mx-6 -mt-6 p-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-md tracking-wider">
                      Fußballschule FC Auggen
                    </span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Integrierter Spielerbericht
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 mt-2">
                    {activeReport.playerName}
                  </h1>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-1">
                    Position: <span className="text-red-700 font-extrabold">{activeReport.position}</span> | Alter: {activeReport.age || 22} Jahre | Team: FC Auggen 26/27
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded-lg font-black text-xs uppercase tracking-widest border border-slate-700">
                      Aufnahme-Datum: {formatSessionDate(activeReport.analysisDate)}
                    </div>
                    {activeReport.id && (
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(activeReport.id)}
                        className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white border border-red-300 hover:border-red-600 px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                        title="Diesen Bericht / diese Session löschen"
                      >
                        <Trash2 size={13} />
                        <span>Löschen</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase">
                    Quelle: {activeReport.rawFileName || 'GPS Telemetrie'}
                  </p>
                  <p className="text-[9px] font-bold text-emerald-700 uppercase mt-0.5">
                    ✅ Session-Aufnahmedatum erfasst
                  </p>
                </div>
              </div>

              {/* 1. SPIELERPROFIL & OVERALL SUMMARY BADGE */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-100 p-4 rounded-xl border-2 border-slate-300">
                
                {/* Overall Score Box */}
                <div className="flex flex-col items-center justify-center bg-slate-900 text-white p-4 rounded-xl border-2 border-slate-900 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gesamtbewertung (Overall Score)
                  </span>
                  <div className="text-4xl font-black tracking-tight text-amber-400 my-1">
                    {activeReport.overallScore} <span className="text-base text-slate-400 font-normal">/ 100</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-700/60 mt-1">
                    {activeReport.classification}
                  </span>
                </div>

                {/* Team Average Comparison */}
                <div className="flex flex-col justify-center bg-white p-4 rounded-xl border border-slate-300">
                  <span className="text-[10px] font-black uppercase text-slate-500">Teamvergleich</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-900">{activeReport.overallScore}</span>
                    <span className="text-xs font-bold text-slate-500">vs. Team Schnitt ({activeReport.teamAverageOverall})</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-700 mt-2">
                    {activeReport.overallScore >= activeReport.teamAverageOverall ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        <ArrowUpRight size={14} /> +{activeReport.overallScore - activeReport.teamAverageOverall} Punkte über dem Teamdurchschnitt
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <ArrowDownRight size={14} /> -{activeReport.teamAverageOverall - activeReport.overallScore} Punkte unter dem Teamdurchschnitt
                      </span>
                    )}
                  </p>
                </div>

                {/* Key Telemetry Quick Stats */}
                <div className="bg-white p-4 rounded-xl border border-slate-300 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-500">Kern-Telemetrie</span>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800 mt-1">
                    <div>
                      <span className="text-[9px] text-slate-500 block">Distanz:</span>
                      {activeReport.metrics.totalDistanceKm} km
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Max Speed:</span>
                      {activeReport.metrics.maxSpeedKmh} km/h
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Sprints:</span>
                      {activeReport.metrics.sprintCount}
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 block">Ø Herzfrequenz:</span>
                      {activeReport.metrics.avgHeartRateBpm} bpm
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. LEISTUNGSÜBERSICHT (5 CATEGORIES TEXT + SCORES) */}
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b-2 border-slate-900 pb-1 mb-3 flex items-center gap-2">
                  <BarChart2 size={16} className="text-red-600" />
                  2. Leistungsübersicht nach 5 Kategorien
                </h3>

                <div className="space-y-3">
                  
                  {/* Category 1: Ausdauer */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase text-slate-900">1. Ausdauer</span>
                        <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                          Aerobe Kapazität
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {activeReport.categories.ausdauer.analysisText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div 
                          className={`h-full ${getScoreBarBg(activeReport.categories.ausdauer.score)}`} 
                          style={{ width: `${activeReport.categories.ausdauer.score}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${getScoreColorClass(activeReport.categories.ausdauer.score)}`}>
                        {activeReport.categories.ausdauer.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Category 2: Belastungsstruktur */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase text-slate-900">2. Belastungsstruktur</span>
                        <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          Belastung vs. Erholung
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {activeReport.categories.belastungsstruktur.analysisText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div 
                          className={`h-full ${getScoreBarBg(activeReport.categories.belastungsstruktur.score)}`} 
                          style={{ width: `${activeReport.categories.belastungsstruktur.score}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${getScoreColorClass(activeReport.categories.belastungsstruktur.score)}`}>
                        {activeReport.categories.belastungsstruktur.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Category 3: Gesamtfitness */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase text-slate-900">3. Gesamtfitness</span>
                        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          Physische Bereitschaft
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {activeReport.categories.gesamtfitness.analysisText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div 
                          className={`h-full ${getScoreBarBg(activeReport.categories.gesamtfitness.score)}`} 
                          style={{ width: `${activeReport.categories.gesamtfitness.score}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${getScoreColorClass(activeReport.categories.gesamtfitness.score)}`}>
                        {activeReport.categories.gesamtfitness.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Category 4: Endgeschwindigkeit */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase text-slate-900">4. Endgeschwindigkeit</span>
                        <span className="text-[10px] font-extrabold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md">
                          Peak Velocity
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {activeReport.categories.endgeschwindigkeit.analysisText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div 
                          className={`h-full ${getScoreBarBg(activeReport.categories.endgeschwindigkeit.score)}`} 
                          style={{ width: `${activeReport.categories.endgeschwindigkeit.score}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${getScoreColorClass(activeReport.categories.endgeschwindigkeit.score)}`}>
                        {activeReport.categories.endgeschwindigkeit.score} / 100
                      </span>
                    </div>
                  </div>

                  {/* Category 5: Repeat Sprint Ability */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs uppercase text-slate-900">5. Wiederholte Ausdauerleistung (RSA)</span>
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                          Repeat Sprint Ability
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium mt-1">
                        {activeReport.categories.repeatSprintAbility.analysisText}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-28 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
                        <div 
                          className={`h-full ${getScoreBarBg(activeReport.categories.repeatSprintAbility.score)}`} 
                          style={{ width: `${activeReport.categories.repeatSprintAbility.score}%` }} 
                        />
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-lg border ${getScoreColorClass(activeReport.categories.repeatSprintAbility.score)}`}>
                        {activeReport.categories.repeatSprintAbility.score} / 100
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* 3 & 4. STÄRKEN & VERBESSERUNGSPOTENZIALE (2-COLUMN GRID) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Strengths */}
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl">
                  <h4 className="text-xs font-black uppercase text-emerald-900 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    Stärken des Spielers
                  </h4>
                  <ul className="space-y-1.5 text-xs font-medium text-emerald-950">
                    {activeReport.strengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvement Areas */}
                <div className="bg-teal-50 border border-teal-300 p-4 rounded-xl">
                  <h4 className="text-xs font-black uppercase text-teal-900 flex items-center gap-1.5 mb-2">
                    <Target size={16} className="text-teal-700" />
                    Verbesserungspotenziale
                  </h4>
                  <ul className="space-y-1.5 text-xs font-medium text-teal-950">
                    {activeReport.improvementAreas.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* 5. TRAINEREMPFEHLUNG (TRAINING MEASURES & LOAD CONTROL) */}
              <div className="bg-slate-900 text-white p-5 rounded-xl border-2 border-slate-900">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 mb-3">
                  <Sparkles size={16} />
                  5. Trainerempfehlung &amp; Belastungssteuerung
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-extrabold text-slate-300 block mb-1">Konkrete Trainingsmaßnahmen:</span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {activeReport.trainerRecommendations.measures.map((m, idx) => (
                        <li key={idx} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 flex items-start gap-2">
                          <span className="text-amber-400 font-black">✓</span>
                          <span className="text-slate-200 font-medium">{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <span className="font-extrabold text-slate-300 block">Fokusbereiche (Nächste 2–4 Wochen):</span>
                      <p className="text-slate-300 font-normal mt-0.5 leading-relaxed">
                        {activeReport.trainerRecommendations.focusAreasNextWeeks}
                      </p>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-300 block">Hinweise zur Belastungssteuerung:</span>
                      <p className="text-slate-300 font-normal mt-0.5 leading-relaxed">
                        {activeReport.trainerRecommendations.loadControlNotes}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. EMBEDDED VISUAL CHARTS (AM ENDE DES BERICHTS EINGEFÜGT) */}
              <div className="border-t-2 border-slate-900 pt-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center gap-2">
                  <BarChart2 size={16} className="text-red-600" />
                  6. Visualisierungs-Balkendiagramme (Visuelle Ergänzung)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-300">
                  
                  {/* Chart 1: Category Scores Bar Chart */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <span className="text-[11px] font-black uppercase text-slate-700 block mb-3 border-b pb-1">
                      Balkendiagramm: 5 Leistungsbereiche
                    </span>
                    <div className="space-y-3">
                      {[
                        { label: 'Ausdauer', val: activeReport.categories.ausdauer.score, color: 'bg-blue-600' },
                        { label: 'Belastungsstruktur', val: activeReport.categories.belastungsstruktur.score, color: 'bg-amber-600' },
                        { label: 'Gesamtfitness', val: activeReport.categories.gesamtfitness.score, color: 'bg-emerald-600' },
                        { label: 'Endgeschwindigkeit', val: activeReport.categories.endgeschwindigkeit.score, color: 'bg-rose-600' },
                        { label: 'Repeat Sprint Ability', val: activeReport.categories.repeatSprintAbility.score, color: 'bg-purple-600' }
                      ].map((item, i) => (
                        <div key={i} className="text-[11px] font-bold text-slate-800">
                          <div className="flex justify-between mb-1">
                            <span className="uppercase tracking-wide">{item.label}</span>
                            <span className="font-extrabold">{item.val} / 100</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                            <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chart 2: Overall vs Team Average */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-700 block mb-3 border-b pb-1">
                        Vergleichsdiagramm: Overall Score vs. Teamdurchschnitt
                      </span>

                      <div className="space-y-4 my-2">
                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-900 mb-1">
                            <span>{activeReport.playerName} (Gesamt)</span>
                            <span className="text-red-600 font-extrabold">{activeReport.overallScore} Pkt</span>
                          </div>
                          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                            <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${activeReport.overallScore}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                            <span>FC Auggen Teamdurchschnitt</span>
                            <span>{activeReport.teamAverageOverall} Pkt</span>
                          </div>
                          <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                            <div className="h-full bg-slate-500 transition-all duration-500" style={{ width: `${activeReport.teamAverageOverall}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-lg text-[10px] font-medium text-slate-600 border border-slate-200 mt-2">
                      💡 Die Balkendiagramme dienen als visuelle Ergänzung zum textlichen Spielerbericht.
                    </div>
                  </div>

                </div>
              </div>

              {/* Report Footer */}
              <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                <span>FC Auggen Fußballschule | AI-gestützte Leistungsdiagnostik</span>
                <span>Dokument-ID: {activeReport.id}</span>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* IMPORT / UPLOAD / ZIP MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              &times;
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Upload size={20} className="text-red-500" />
              <h3 className="text-lg font-black uppercase text-white">
                Tracker-Daten &amp; ZIP-Ordner Einlesen
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Importiere Tracker-Dateien (ZIP, CSV, JSON, GPX, FIT, TCX) oder füge GPS/HR-Telemetrie-Text ein.
            </p>

            {/* Target Player Lock Banner */}
            <div className="mb-4 bg-red-950/60 border border-red-500/60 p-3 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-red-200 font-bold">
                <Lock size={16} className="text-red-400 shrink-0" />
                <span>
                  Zugewiesener Spieler: <strong className="text-white underline">{selectedPlayer?.firstName} {selectedPlayer?.lastName}</strong> ({selectedPlayer?.position})
                </span>
              </div>
              <span className="text-[10px] bg-red-600 text-white font-black px-2 py-0.5 rounded-full uppercase">
                Zuordnung fixiert
              </span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  setUploadFile(e.dataTransfer.files[0]);
                }
              }}
              className={`p-6 border-2 border-dashed rounded-xl text-center transition-all cursor-pointer ${
                dragActive ? 'border-red-500 bg-red-600/10 scale-102' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive size={36} className="mx-auto mb-2 text-amber-400" />
              <p className="text-xs font-bold text-white">
                {uploadFile ? `Ausgewählt: ${uploadFile.name}` : 'Klicke hier oder ziehe eine ZIP- / Tracker-Datei hinein'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Unterstützt .ZIP, .CSV, .JSON, GPX, FIT, TCX &amp; Text-Exporte
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".zip,.csv,.json,.txt,.fit,.gpx,.tcx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadFile(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Raw Text Input Fallback */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Oder GPS / Puls Telemetrie-Text kopieren &amp; einfügen:
              </label>
              <textarea
                rows={3}
                placeholder="Beispiel: Distanz: 9.8 km, Speed: 32.4 km/h, Sprints: 18, HR: 165 bpm..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-xs text-white rounded-xl p-2.5 outline-none focus:border-red-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-700"
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleProcessTrackerUpload()}
                disabled={isProcessing}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2"
              >
                {isProcessing ? 'Verarbeite & Erstelle Bericht...' : 'Einlesen & Bericht Generieren'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
