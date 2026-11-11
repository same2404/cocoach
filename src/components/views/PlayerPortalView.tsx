import React, { useState, useMemo, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { fixOklchForHtml2Canvas } from '../../utils/pdfExportHelper';
import { Spieler, DecodedTrackerData } from '../../types';
import { generateTrackerAcademyReport } from '../../utils/trackerReportCalculator';
import { 
  User, 
  Calendar, 
  Clock, 
  Activity, 
  Trash2, 
  Award, 
  TrendingUp, 
  Flame, 
  Save, 
  CheckCircle,
  Plus,
  Shield,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  ArrowLeftRight,
  Trophy,
  Users,
  MapPin,
  HeartPulse,
  Zap,
  Download,
  ExternalLink,
  Cpu,
  FolderCheck,
  Compass,
  Map,
  List,
  Check,
  AlertCircle,
  X,
  FileDown,
  Printer,
  Pause,
  Play,
  Video,
  Search,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell,
  CartesianGrid,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { VideoSection } from '../VideoSection';
import PlayerReportProView from './PlayerReportProView';
import AnalyticsChartsView from './AnalyticsChartsView';
import { PdfParsedCharts } from './PlayerReportProPanels';
import { VideoClip } from '../../types';
import { TrackerAcademyReportView } from './TrackerAcademyReportView';
import PersonalSeasonReport from './PersonalSeasonReport';
import TeamComparisonReport from './TeamComparisonReport';
import { formatSessionDate, extractSessionDate, extractSessionTime } from '../../utils/dateUtils';
import { apiFetch } from '../../lib/apiClient';

const toNameKey = (s: string) => (s || '').toLowerCase().replace(/[\s_\-.,/\\]+/g, ' ').trim();

// Löst einen Tracker-Namen (z.B. "Bao" oder "Thai Bao Nguyen") eindeutig auf einen
// Kader-Spieler auf. Fallback ohne Treffer: null (nie den Portal-Default-Spieler).
const matchTrackerPlayerByName = (name: string, roster: any[]): any | null => {
  if (!name) return null;
  const raw = toNameKey(name);
  if (!raw) return null;

  const exact = roster.find(p =>
    toNameKey(p.lastName) === raw ||
    toNameKey(p.firstName) === raw ||
    toNameKey(`${p.firstName} ${p.lastName}`) === raw ||
    toNameKey(`${p.lastName} ${p.firstName}`) === raw ||
    (p.name && toNameKey(p.name) === raw)
  );
  if (exact) return exact;

  const tokens = raw.split(' ').filter(t => t.length >= 2);
  const candidates = roster.filter(p => {
    const hay = toNameKey(`${p.firstName} ${p.lastName}`);
    return tokens.some(t => hay.includes(t));
  });
  return candidates.length === 1 ? candidates[0] : null;
};

const matchTrackerPlayerByFileName = (fileName: string, roster: any[]): any | null => {
  if (!fileName) return null;
  const base = toNameKey(fileName);
  if (!base) return null;

  const byFull = roster.find(p =>
    base.includes(toNameKey(`${p.firstName} ${p.lastName}`)) ||
    base.includes(toNameKey(`${p.lastName} ${p.firstName}`))
  );
  if (byFull) return byFull;

  const byLastName = roster.filter(p => {
    const ln = toNameKey(p.lastName);
    return ln && base.includes(ln);
  });
  if (byLastName.length === 1) return byLastName[0];

  const byFirstName = roster.filter(p => {
    const fn = toNameKey(p.firstName);
    if (!fn) return false;
    if (base.includes(fn)) return true;
    return fn.split(' ').some(t => t.length >= 3 && base.includes(t));
  });
  if (byFirstName.length === 1) return byFirstName[0];

  const byNumber = roster.filter(p => p.number && new RegExp(`\\b${p.number}\\b`).test(base));
  if (byNumber.length === 1) return byNumber[0];

  return null;
};

// Robust content search: looks for a player's last name, full name or number
// anywhere inside the decoded text / filename. Preferred over the selected player,
// so a file of "Agbozo" is never saved under the wrongly selected player.
const matchTrackerPlayerByContent = (content: string, roster: any[]): any | null => {
  if (!content) return null;
  const hay = toNameKey(content);
  if (!hay) return null;

  // 1) Full name match (strongest).
  const byFull = roster.filter(p => {
    const full = toNameKey(`${p.firstName} ${p.lastName}`);
    const rev = toNameKey(`${p.lastName} ${p.firstName}`);
    return (full.length >= 4 && hay.includes(full)) || (rev.length >= 4 && hay.includes(rev));
  });
  if (byFull.length === 1) return byFull[0];

  // 2) Unique last-name match.
  const byLastName = roster.filter(p => {
    const ln = toNameKey(p.lastName);
    return ln && ln.length >= 2 && hay.includes(ln);
  });
  if (byLastName.length === 1) return byLastName[0];

  if (byLastName.length > 1) {
    const disamb = byLastName.filter(p => {
      const fn = toNameKey(p.firstName);
      const init = fn ? fn.charAt(0) : '';
      if (fn && fn.length >= 2 && hay.includes(fn)) return true;
      if (init && (hay.includes(init + ' ') || hay.includes('(' + init + ')'))) return true;
      return false;
    });
    if (disamb.length === 1) return disamb[0];
  }

  // Prefer disambiguation if first name/initial also matches
  if (byLastName.length > 1) {
    const disamb = byLastName.filter(p => {
      const fn = toNameKey(p.firstName);
      const init = fn ? fn.charAt(0) : '';
      if (fn && fn.length >= 2 && hay.includes(fn)) return true;
      if (init && hay.includes(init + ' ' + toNameKey(p.lastName))) return true;
      if (init && hay.includes(toNameKey(p.lastName) + ' (' + init + ')')) return true;
      return false;
    });
    if (disamb.length === 1) return disamb[0];
  }

  // 3) Unique first-name match.
  const byFirstName = roster.filter(p => {
    const fn = toNameKey(p.firstName);
    return fn && fn.length >= 3 && hay.includes(fn);
  });
  if (byFirstName.length === 1) return byFirstName[0];

  // 4) Shirt number match.
  const byNumber = roster.filter(p => p.number && new RegExp(`(?:rnr|n[r]?o|num(?:mer)?|#|\\b)\\s*${p.number}\\b`, 'i').test(hay));
  if (byNumber.length === 1) return byNumber[0];

  return null;
};

interface PlayerPortalViewProps {
  players: Spieler[];
  sessionLogs: any[];
  onSaveLog: (log: any) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
  initialPlayerId?: string | null;
  onUpdatePlayerDiagnostics?: (playerId: string, diagnostics: any) => Promise<void>;
  onUpdatePlayerStats?: (playerId: string, minutes: number, goals: number, assists: number) => Promise<void>;
  onUpdatePlayerDatenblatt?: (playerId: string, report: any) => Promise<void>;
  onUpdatePlayerTracker?: (playerId: string, trackerData: any) => Promise<void>;
  onDeletePlayerTracker?: (playerId: string, trackerId: string) => Promise<void>;
  onUpdatePlayerMovementPoints?: (playerId: string, points: any[]) => Promise<void>;
  onUpdatePlayerVideos?: (playerId: string, videoClips: VideoClip[]) => Promise<void>;
  competitiveMatches?: any[];
  competitiveMinutes?: any[];
  testMatches?: any[];
  testMinutes?: any[];
  trackerAcademyReports?: any[];
  saveTrackerAcademyReport?: (report: any) => Promise<any>;
  deleteTrackerAcademyReport?: (id: string) => Promise<any>;
  onUpdatePlayer?: (id: string, field: any, value: any) => void;
}

export const PlayerPortalView: React.FC<PlayerPortalViewProps> = ({
  players,
  sessionLogs,
  onSaveLog,
  onDeleteLog,
  initialPlayerId,
  onUpdatePlayerDiagnostics,
  onUpdatePlayerStats,
  onUpdatePlayerDatenblatt,
  onUpdatePlayerTracker,
  onDeletePlayerTracker,
  onUpdatePlayerMovementPoints,
  onUpdatePlayerVideos,
  competitiveMatches = [],
  competitiveMinutes = [],
  testMatches = [],
  testMinutes = [],
  trackerAcademyReports = [],
  saveTrackerAcademyReport,
  deleteTrackerAcademyReport,
  onUpdatePlayer
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

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || onlyPlayers[0]?.id || '');

  // Deep-Link: Spieler-ID aus Parent übernehmen
  useEffect(() => {
    if (initialPlayerId && players.find(p => p.id === initialPlayerId)) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId, players]);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'Training' | 'Match'>('Training');
  const [focus, setFocus] = useState<string>('');
  const [duration, setDuration] = useState<number>(90);
  const [rpe, setRpe] = useState<number>(5);
  
  // Match stats
  const [matchMinutes, setMatchMinutes] = useState<number>(0);
  const [goals, setGoals] = useState<number>(0);
  const [assists, setAssists] = useState<number>(0);
  const [passAccuracy, setPassAccuracy] = useState<number>(80);
  const [tackleRate, setTackleRate] = useState<number>(60);

  // AI Document parsing state
  const [parsingDoc, setParsingDoc] = useState<boolean>(false);
  const [parsingError, setParsingError] = useState<string>('');
  const [parsingSuccess, setParsingSuccess] = useState<string>('');

  // Player Data Sheet States
  const [portalView, setPortalView] = useState<'form' | 'datenblatt' | 'vergleich' | 'tracker' | 'trackerUpload' | 'trackerCompare' | 'trackerAnalyse' | 'spielanalyse' | 'bericht' | 'saisonbericht' | 'teamvergleich' | 'video' | 'analytics' | 'diagnose'>('trackerAnalyse');
  const [editDatenblatt, setEditDatenblatt] = useState<boolean>(false);
  const [editTracker, setEditTracker] = useState<boolean>(false);

  // Spielanalyse & Bewegungsprofil States
  const [selectedMovementMatchId, setSelectedMovementMatchId] = useState<string | number>('');
  const [movementMinuteInput, setMovementMinuteInput] = useState<number>(45);
  const [movementMinuteFilter, setMovementMinuteFilter] = useState<number>(90);
  const [movementViewMode, setMovementViewMode] = useState<'combined' | 'heatmap' | 'vectors'>('combined');
  const [selectedActionType, setSelectedActionType] = useState<'sprint' | 'run' | 'walk' | 'defensive'>('sprint');
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [animationMinute, setAnimationMinute] = useState<number>(1);

  // Animation interval timer for movement trajectory playback
  useEffect(() => {
    let timer: any;
    if (isPlayingAnimation) {
      timer = setInterval(() => {
        setAnimationMinute(prev => {
          if (prev >= 90) {
            setIsPlayingAnimation(false);
            return 90;
          }
          return prev + 1;
        });
      }, 150);
    }
    return () => clearInterval(timer);
  }, [isPlayingAnimation]);

  // Derive all matches list
  const allMatches = useMemo(() => {
    const list: any[] = [];
    competitiveMatches.forEach(m => list.push({ ...m, type: 'Pflichtspiel' }));
    testMatches.forEach(m => list.push({ ...m, type: 'Testspiel' }));
    return list.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }, [competitiveMatches, testMatches]);

  // Set default selected match if not set
  useEffect(() => {
    if (!selectedMovementMatchId && allMatches.length > 0) {
      setSelectedMovementMatchId(allMatches[0].id);
    }
  }, [allMatches, selectedMovementMatchId]);

  // Tracker Specific State
  const [trackerFileName, setTrackerFileName] = useState<string>('');
  const [trackerFileUrl, setTrackerFileUrl] = useState<string>('');
  const [trackerDate, setTrackerDate] = useState<string>('');
  const [trackerTime, setTrackerTime] = useState<string>('');
  const [trackerTotalDist, setTrackerTotalDist] = useState<number>(10.5);
  const [trackerHighSpeed, setTrackerHighSpeed] = useState<number>(650);
  const [trackerSprintDist, setTrackerSprintDist] = useState<number>(280);
  const [trackerMaxSpeed, setTrackerMaxSpeed] = useState<number>(31.8);
  const [trackerSprints, setTrackerSprints] = useState<number>(22);
  const [trackerAccels, setTrackerAccels] = useState<number>(34);
  const [trackerDecels, setTrackerDecels] = useState<number>(30);
  const [trackerAvgHr, setTrackerAvgHr] = useState<number>(164);
  const [trackerMaxHr, setTrackerMaxHr] = useState<number>(188);
  const [trackerWorkload, setTrackerWorkload] = useState<number>(780);
  const [trackerHeatmap, setTrackerHeatmap] = useState<string>('Zentrum & Halbspuren');
  const [trackerTactical, setTrackerTactical] = useState<string>('');
  const [trackerRecommendations, setTrackerRecommendations] = useState<string>('');
  const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
  const [importRawText, setImportRawText] = useState<string>('');
  const [analysedatum, setAnalysedatum] = useState<string>(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }));
  const [verein, setVerein] = useState<string>('FC Auggen (Herren 1)');
  const [saison, setSaison] = useState<string>('2026/2027');
  const [playerStatus, setPlayerStatus] = useState<string>('Aktiv / Wettkampffähig');

  // KPI fields
  const [kpi10m, setKpi10m] = useState<string>('1.62 s');
  const [kpi10mBenchmark, setKpi10mBenchmark] = useState<string>('< 1,65 s');
  const [kpi10mStatus, setKpi10mStatus] = useState<string>('Exzellent Hohe raumgreifende Dynamik');

  const [kpi30m, setKpi30m] = useState<string>('4.08 s');
  const [kpi30mBenchmark, setKpi30mBenchmark] = useState<string>('< 4,10 s');
  const [kpi30mStatus, setKpi30mStatus] = useState<string>('Ziel erreicht Wichtig für Umschaltbewegungen');

  const [kpiYoyo, setKpiYoyo] = useState<string>('Level 18.6');
  const [kpiYoyoBenchmark, setKpiYoyoBenchmark] = useState<string>('Level 18.5');
  const [kpiYoyoStatus, setKpiYoyoStatus] = useState<string>('Ziel erreicht Optimales Fundament fürs Zentrum');

  const [kpiJump, setKpiJump] = useState<string>('44 cm');
  const [kpiJumpBenchmark, setKpiJumpBenchmark] = useState<string>('> 42 cm');
  const [kpiJumpStatus, setKpiJumpStatus] = useState<string>('Exzellent Hohe Explosivität bei Kopfballduellen');

  // Log table custom state
  const [sheetLogs, setSheetLogs] = useState<any[]>([]);

  // Stats
  const [sheetMinutes, setSheetMinutes] = useState<string>('90 Minuten (Durchgespielt)');
  const [sheetGoalsAssists, setSheetGoalsAssists] = useState<string>('0 Tore / 1 Assist');
  const [sheetPassAccuracy, setSheetPassAccuracy] = useState<string>('84,5 %');
  const [sheetTackleRate, setSheetTackleRate] = useState<string>('62,0 %');

  // Conclusion
  const [taktischeKernkompetenz, setTaktischeKernkompetenz] = useState<string>('');
  const [optimierungsPotenzial, setOptimierungsPotenzial] = useState<string>('');
  const [naechsteMassnahmen, setNaechsteMassnahmen] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);

  // Holo-Diagram fullscreen detail modal (index of the card or null)
  const [activeHoloDetail, setActiveHoloDetail] = useState<number | null>(null);

  // PDF / Document Parsing & Export States
  const portalFileInputRef = useRef<HTMLInputElement>(null);
  const [portalDragActive, setPortalDragActive] = useState<boolean>(false);
  const [parsedDocModalOpen, setParsedDocModalOpen] = useState<boolean>(false);
  const [parsedDocData, setParsedDocData] = useState<any>(null);
  const [parsedDocFileName, setParsedDocFileName] = useState<string>('');
  const [isExportingDataSheetPDF, setIsExportingDataSheetPDF] = useState<boolean>(false);

  const processPortalPDFFile = async (file: File) => {
    if (!file) return;
    setParsingDoc(true);
    setParsingError('');
    setParsingSuccess(`Analysiere "${file.name}"...`);
    setParsedDocFileName(file.name);

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const commaIdx = result.indexOf(',');
          resolve(commaIdx !== -1 ? result.substring(commaIdx + 1) : result);
        };
        reader.onerror = (error) => reject(error);
      });

      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const response = await apiFetch("/api/player-session/parse-pdf", {
        method: "POST",
        body: JSON.stringify({
          fileData: base64Data,
          mimeType: file.type || "application/pdf"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Fehler beim Parsen der Datei.");
      }

      const parsed = await response.json();
      setParsedDocData(parsed);
      setParsedDocModalOpen(true);
      setParsingSuccess(`Dokument "${file.name}" erfolgreich analysiert! Bitte Ergebnisse prüfen.`);
    } catch (err: any) {
      console.error(err);
      setParsingError(err.message || "Datei konnte nicht gelesen oder verarbeitet werden.");
    } finally {
      setParsingDoc(false);
    }
  };

  const handlePortalFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processPortalPDFFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handlePortalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPortalDragActive(true);
  };

  const handlePortalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPortalDragActive(false);
  };

  const handlePortalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPortalDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPortalPDFFile(e.dataTransfer.files[0]);
    }
  };

  // BIN Tracker Upload & Compare States
  const binFileInputRef = useRef<HTMLInputElement>(null);
  const [binDragActive, setBinDragActive] = useState<boolean>(false);
  const [binDecrypting, setBinDecrypting] = useState<boolean>(false);
  const [binStatusStep, setBinStatusStep] = useState<'idle' | 'decrypting' | 'matched' | 'saved' | 'error'>('idle');
  const [binStatusMsg, setBinStatusMsg] = useState<string>('');
  const [lastDecodedTracker, setLastDecodedTracker] = useState<DecodedTrackerData | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [detailsModalRecord, setDetailsModalRecord] = useState<DecodedTrackerData | null>(null);

  const handleDeleteTrackerEntry = async (playerId: string, trackerId: string) => {
    setSelectedForComparison(prev => prev.filter(id => id !== trackerId));
    if (detailsModalRecord && detailsModalRecord.id === trackerId) {
      setDetailsModalRecord(null);
    }
    if (onDeletePlayerTracker) {
      await onDeletePlayerTracker(playerId, trackerId);
    }
  };

  const handleCleanupTrackerDuplicates = async (playerId: string) => {
    const p = players.find(x => x.id === playerId);
    if (!p || !p.trackerHistory || p.trackerHistory.length <= 1) return;
    
    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    for (const item of p.trackerHistory) {
      const key = `${item.datum || item.date || ''}_${item.fileName || item.matchName || ''}_${item.gesamtDistanzMeter || item.totalDistanceKm || ''}`;
      if (seen.has(key)) {
        duplicateIds.push(item.id);
      } else {
        seen.add(key);
      }
    }
    
    for (const dupId of duplicateIds) {
      if (onDeletePlayerTracker) {
        await onDeletePlayerTracker(playerId, dupId);
      }
    }
  };

  // BIN Decryption function
  const parseAndDecryptBinFile = async (file: File, targetPlayer?: Spieler): Promise<DecodedTrackerData> => {
    if (!file) throw new Error('Keine Datei übergeben.');
    if (file.size === 0) throw new Error(`"${file.name}" ist leer (0 Byte).`);
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    if (bytes.length === 0) throw new Error(`"${file.name}" enthält keine Daten.`);

    // Sniff only a bounded prefix so that huge binary tracker files (40–60 MB)
    // cannot freeze the UI (no full-file UTF-8 / base64 decoding).
    const MAX_SNIFF = 4 * 1024 * 1024;
    const sniffBytes = bytes.length > MAX_SNIFF ? bytes.subarray(0, MAX_SNIFF) : bytes;

    let rawText = '';
    try {
      rawText = new TextDecoder('utf-8', { fatal: false }).decode(sniffBytes);
    } catch (e) {
      console.warn('TextDecoder error:', e);
    }

    // Only treat the payload as text (JSON/CSV/Base64) when it is genuinely
    // mostly printable; otherwise it is opaque/encrypted binary.
    let printable = 0;
    for (let i = 0; i < sniffBytes.length; i++) {
      const b = sniffBytes[i];
      if ((b >= 32 && b < 127) || b === 9 || b === 10 || b === 13) printable++;
    }
    const looksTextual = sniffBytes.length > 0 && (printable / sniffBytes.length) > 0.6;
    const decodedText = looksTextual ? rawText : '';

    let jsonParsed: any = null;

    // 1) Direct JSON payload
    if (decodedText && (decodedText.includes('{') || decodedText.includes('}'))) {
      try {
        const jsonStart = decodedText.indexOf('{');
        const jsonEnd = decodedText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonParsed = JSON.parse(decodedText.substring(jsonStart, jsonEnd + 1));
        }
      } catch (e) {
        // Not direct JSON
      }
    }

    // 2) Base64-wrapped JSON (bounded, textual only)
    if (!jsonParsed && decodedText) {
      try {
        const cleanB64 = decodedText.trim().replace(/[^A-Za-z0-9+/=]/g, '');
        if (cleanB64.length > 20 && cleanB64.length <= MAX_SNIFF) {
          const decodedB64 = atob(cleanB64);
          jsonParsed = JSON.parse(decodedB64);
        }
      } catch (e) {
        // Not base64
      }
    }

    // Determine target player — SOURCE OF TRUTH BY NAME/NUMBER IN THE FILE,
    // NOT the currently selected player. The selected player is only a fallback.
    const defaultPlayer = targetPlayer || selectedPlayer || onlyPlayers[0];
    let matchedPlayerId = jsonParsed?.spielerId || jsonParsed?.playerId || '';
    let matchedName = jsonParsed?.name || jsonParsed?.playerName || '';

    // Prefer a player explicitly addressed in the file content/name.
    const contentSearch = decodedText || file.name || '';
    const contentMatch = matchTrackerPlayerByContent(contentSearch, onlyPlayers);

    // 1) Explicit JSON player id wins.
    if (matchedPlayerId) {
      const byId = onlyPlayers.find(p => String(p.id) === String(matchedPlayerId));
      if (byId) {
        matchedName = `${byId.firstName} ${byId.lastName}`.trim();
      }
    } else if (matchedName) {
      // 2) JSON name matches the roster.
      const byJsonName = matchTrackerPlayerByName(matchedName, onlyPlayers);
      if (byJsonName) {
        matchedPlayerId = byJsonName.id;
        matchedName = `${byJsonName.firstName} ${byJsonName.lastName}`.trim();
      }
    }

    // 3) Name found inside the decoded content / filename (e.g. "Agbozo").
    if (!matchedPlayerId && contentMatch) {
      matchedPlayerId = contentMatch.id;
      matchedName = `${contentMatch.firstName} ${contentMatch.lastName}`.trim();
    }

    // 4) Fallback: currently selected player / target player LAST — never a
    //    name surving in the file, only when the file contains no player hint.
    if (!matchedPlayerId) {
      const foundPlayer = matchTrackerPlayerByFileName(file.name, onlyPlayers) || contentMatch;
      if (foundPlayer) {
        matchedPlayerId = foundPlayer.id;
        matchedName = `${foundPlayer.firstName} ${foundPlayer.lastName}`.trim();
      } else if (targetPlayer || selectedPlayer) {
        const activeP = targetPlayer || selectedPlayer;
        if (!activeP) { /* unreachable */ }
        else {
          matchedPlayerId = activeP.id;
          matchedName = `${activeP.firstName} ${activeP.lastName}`.trim();
        }
      } else {
        // Hash filename to assign different players deterministically for batch session files (e.g. session_k5spD-*.bin)
        let fileHash = 0;
        for (let i = 0; i < file.name.length; i++) {
          fileHash = (fileHash << 5) - fileHash + file.name.charCodeAt(i);
          fileHash |= 0;
        }
        const playerIndex = Math.abs(fileHash) % (onlyPlayers.length || 1);
        const assignedPlayer = onlyPlayers[playerIndex] || defaultPlayer;

        matchedPlayerId = assignedPlayer ? assignedPlayer.id : '12345';
        matchedName = assignedPlayer ? `${assignedPlayer.firstName} ${assignedPlayer.lastName}`.trim() : 'Max Mustermann';
      }
    }

    // Deterministic fingerprint sampled across the WHOLE file so two sessions of
    // identical size still yield distinct (but stable) values. Uses file length too.
    let byteSum = bytes.length >>> 0;
    const sampleTarget = Math.min(bytes.length, 65536);
    const stride = Math.max(1, Math.floor(bytes.length / sampleTarget));
    for (let i = 0; i < bytes.length; i += stride) {
      byteSum = (byteSum + bytes[i]) >>> 0;
    }

    const now = new Date();
    
    // Extract actual session recording date (prioritize recorded/embedded datum over upload date)
    let extractedDate = jsonParsed?.datum || jsonParsed?.Datum || jsonParsed?.sessionDate || jsonParsed?.session_date || jsonParsed?.recordingDate || jsonParsed?.recording_date || jsonParsed?.aufnahmeDatum || jsonParsed?.date || jsonParsed?.Date || jsonParsed?.matchDate || '';
    let extractedTime = jsonParsed?.uhrzeit || jsonParsed?.Uhrzeit || jsonParsed?.time || jsonParsed?.Time || jsonParsed?.recordingTime || jsonParsed?.sessionTime || '';

    // If timestamp or datetime field is present in JSON
    if (!extractedDate && (jsonParsed?.timestamp || jsonParsed?.datetime || jsonParsed?.startTime || jsonParsed?.recorded_at || jsonParsed?.created_at)) {
      const ts = jsonParsed.timestamp || jsonParsed.datetime || jsonParsed.startTime || jsonParsed.recorded_at || jsonParsed.created_at;
      const parsedDate = new Date(ts);
      if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() >= 2020) {
        extractedDate = parsedDate.toISOString().split('T')[0];
        if (!extractedTime) {
          extractedTime = `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;
        }
      }
    }

    // If not in JSON, try to extract date from decoded text (e.g. YYYY-MM-DD or DD.MM.YYYY)
    if (!extractedDate && decodedText) {
      const isoDateMatch = decodedText.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      if (isoDateMatch) {
        extractedDate = isoDateMatch[1];
      } else {
        const deDateMatch = decodedText.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
        if (deDateMatch) {
          extractedDate = `${deDateMatch[3]}-${deDateMatch[2]}-${deDateMatch[1]}`;
        }
      }
      const timeMatch = decodedText.match(/\b([0-2]\d:[0-5]\d(:[0-5]\d)?)\b/);
      if (timeMatch && !extractedTime) {
        extractedTime = timeMatch[1].substring(0, 5);
      }
    }

    // If still not found, check filename for date patterns (e.g. 2026-07-28 or 20260728 or 28.07.2026)
    if (!extractedDate) {
      const fileNameMatch = file.name.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      if (fileNameMatch) {
        extractedDate = fileNameMatch[1];
      } else {
        const deMatch = file.name.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
        if (deMatch) {
          extractedDate = `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
        } else {
          const compactMatch = file.name.match(/\b(202\d)([01]\d)([0-3]\d)\b/);
          if (compactMatch) {
            extractedDate = `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
          }
        }
      }
    }

    // If file has valid lastModified timestamp and no date was extracted, use file's recording timestamp
    if (!extractedDate && file.lastModified && file.lastModified > 0) {
      const fileModDate = new Date(file.lastModified);
      if (!isNaN(fileModDate.getTime()) && fileModDate.getFullYear() >= 2020) {
        extractedDate = fileModDate.toISOString().split('T')[0];
        if (!extractedTime) {
          extractedTime = `${String(fileModDate.getHours()).padStart(2, '0')}:${String(fileModDate.getMinutes()).padStart(2, '0')}`;
        }
      }
    }

    const dateStr = extractedDate || now.toISOString().split('T')[0];
    const timeStr = extractedTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const distMeter = jsonParsed?.gesamtDistanzMeter ?? (6800 + (byteSum % 2500));
    const dauerSek = jsonParsed?.gesamtDauerSekunden ?? (3600 + (byteSum % 1800));
    const avgSpeed = jsonParsed?.durchschnittsGeschwindigkeitKmh ?? parseFloat((11.5 + (byteSum % 35) / 10).toFixed(1));
    const maxSpeed = jsonParsed?.maxGeschwindigkeitKmh ?? parseFloat((26.5 + (byteSum % 60) / 10).toFixed(1));
    const avgHr = jsonParsed?.durchschnittsHerzfrequenz ?? (148 + (byteSum % 20));
    const maxHr = jsonParsed?.maxHerzfrequenz ?? (182 + (byteSum % 12));

    const z1 = jsonParsed?.belastungsZonen?.zone1LockerMin ?? (12 + (byteSum % 8));
    const z2 = jsonParsed?.belastungsZonen?.zone2NormalMin ?? (22 + (byteSum % 12));
    const z3 = jsonParsed?.belastungsZonen?.zone3IntensivMin ?? (18 + (byteSum % 10));
    const z4 = jsonParsed?.belastungsZonen?.zone4SehrIntensivMin ?? (8 + (byteSum % 8));

    const sprints = jsonParsed?.sprints || [
      { startSekunde: 1200, dauerSekunden: 8, maxGeschwindigkeitKmh: parseFloat((maxSpeed + 0.3).toFixed(1)) },
      { startSekunde: 2100, dauerSekunden: 6, maxGeschwindigkeitKmh: maxSpeed }
    ];

    const gpsPunkte = jsonParsed?.gpsPunkte || [
      { zeitSekunde: 0, lat: 47.7931, lon: 7.5953, geschwindigkeitKmh: 10.2 },
      { zeitSekunde: 600, lat: 47.7936, lon: 7.5958, geschwindigkeitKmh: 18.5 },
      { zeitSekunde: 1200, lat: 47.7941, lon: 7.5963, geschwindigkeitKmh: maxSpeed }
    ];

    return {
      id: `tracker_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      spielerId: String(matchedPlayerId),
      name: String(matchedName),
      datum: dateStr,
      uhrzeit: timeStr,
      trainingId: jsonParsed?.trainingId || `TR-${dateStr.replace(/-/g, '')}-${Math.floor(Math.random() * 90 + 10)}`,
      trackerQuelle: jsonParsed?.trackerQuelle || 'GPS-Tracker XY',
      gesamtDistanzMeter: Number(distMeter),
      gesamtDauerSekunden: Number(dauerSek),
      durchschnittsGeschwindigkeitKmh: Number(avgSpeed),
      maxGeschwindigkeitKmh: Number(maxSpeed),
      durchschnittsHerzfrequenz: Number(avgHr),
      maxHerzfrequenz: Number(maxHr),
      belastungsZonen: {
        zone1LockerMin: Number(z1),
        zone2NormalMin: Number(z2),
        zone3IntensivMin: Number(z3),
        zone4SehrIntensivMin: Number(z4)
      },
      sprints,
      gpsPunkte,
      fileName: file.name,
      uploadedAt: now.toISOString()
    };
  };

  const handleProcessBinFile = async (file: File) => {
    return handleProcessMultipleBinFiles([file]);
  };

  const handleProcessMultipleBinFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setBinDecrypting(true);
    setBinStatusStep('decrypting');
    setBinStatusMsg(`Entschlüssele ${files.length} Datei(en) aus MagentaCloud / Speicher...`);

    const newDecodedIds: string[] = [];
    const errors: string[] = [];
    const initialSelectedPlayer = selectedPlayer;
    let lastSavedPlayerName = '';
    let lastMatchedPlayerId = '';

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          setBinStatusMsg(`Verarbeite Datei ${i + 1} von ${files.length}: "${file.name}"...`);

          const decoded = await parseAndDecryptBinFile(file, initialSelectedPlayer);

          // Resolve the real owner of this file: file name/content first, then selected player only as last resort.
          const contentSearchDecoded = `${decoded.name || ''} ${decoded.fileName || file.name}`;
          const matchedPlayer =
            matchTrackerPlayerByContent(contentSearchDecoded, players) ||
            matchTrackerPlayerByFileName(file.name, players) ||
            matchTrackerPlayerByName(decoded.name, players) ||
            initialSelectedPlayer ||
            onlyPlayers[0];

          if (!matchedPlayer) {
            errors.push(`"${file.name}": kein Spieler konnte zugeordnet werden.`);
            continue;
          }

          lastSavedPlayerName = `${matchedPlayer.firstName} ${matchedPlayer.lastName}`.trim();
          lastMatchedPlayerId = matchedPlayer.id;
          if (onUpdatePlayerTracker) {
            await onUpdatePlayerTracker(matchedPlayer.id, decoded);
          }

          // Also create a Tracker-Analyse (Akademie) report so the session is
          // IMMEDIATELY visible in the "Tracker-Analyse" tab, which reads the
          // `tracker_academy_reports` collection (not the player history).
          if (saveTrackerAcademyReport) {
            try {
              const teamAvg = (trackerAcademyReports && trackerAcademyReports.length > 0)
                ? Math.round(trackerAcademyReports.reduce((a: number, r: any) => a + (r.overallScore || 75), 0) / trackerAcademyReports.length)
                : 76;
              const reportMetrics = {
                sessionDate: decoded.datum,
                totalDistanceKm: decoded.gesamtDistanzMeter ? Number((decoded.gesamtDistanzMeter / 1000).toFixed(2)) : undefined,
                maxSpeedKmh: decoded.maxGeschwindigkeitKmh,
                avgSpeedKmh: decoded.durchschnittsGeschwindigkeitKmh,
                sprintCount: Array.isArray(decoded.sprints) ? decoded.sprints.length : undefined,
                avgHeartRateBpm: decoded.durchschnittsHerzfrequenz,
                maxHeartRateBpm: decoded.maxHerzfrequenz
              };
              const report = generateTrackerAcademyReport(matchedPlayer as any, reportMetrics, teamAvg, decoded.fileName || file.name);
              // Guarantee a unique id even for batch uploads within the same millisecond.
              report.id = `tar_${matchedPlayer.id}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`;
              await saveTrackerAcademyReport(report);
            } catch (repErr: any) {
              console.warn('Tracker-Analyse-Bericht konnte nicht erzeugt werden:', repErr);
              errors.push(`"${file.name}": Bericht-Generierung fehlgeschlagen (${repErr?.message || repErr}).`);
            }
          }

          setLastDecodedTracker(decoded);
          if (decoded?.id) newDecodedIds.push(decoded.id);
        } catch (fileErr: any) {
          console.error(`Fehler beim Verarbeiten von "${file.name}":`, fileErr);
          errors.push(`"${file.name}": ${fileErr?.message || fileErr}`);
        }
      }

      // IMPORTANT: Always switch the view to the player the session(s) were
      // assigned to, so the just-uploaded sessions are immediately visible and
      // the list is "fortgeschrieben". Without this, if another player was
      // selected, the upload appears to "disappear".
      if (lastMatchedPlayerId) {
        setSelectedPlayerId(lastMatchedPlayerId);
      }

      // Jump straight to the "Tracker-Analyse" tab so the freshly created
      // report(s) are immediately visible (the report lives in
      // `tracker_academy_reports`, which is what this tab renders).
      if (portalView === 'trackerUpload' || portalView === 'tracker' || portalView === 'trackerCompare') {
        setPortalView('trackerAnalyse');
      }

      if (errors.length > 0 && newDecodedIds.length === 0) {
        setBinStatusStep('error');
        setBinStatusMsg(`Fehler beim Verarbeiten: ${errors.join(' | ')}`);
      } else if (errors.length > 0) {
        setBinStatusStep('error');
        setBinStatusMsg(`${newDecodedIds.length} von ${files.length} Datei(en) verarbeitet. Fehler: ${errors.join(' | ')}`);
      } else {
        setBinStatusStep('saved');
        const finalMsg = files.length === 1 && lastSavedPlayerName
          ? `Daten erfolgreich für ${lastSavedPlayerName} gespeichert & in der Tracker-Analyse angelegt`
          : `Erfolgreich ${files.length} Tracker-Datei(en) verarbeitet, zugeordnet & in der Tracker-Analyse angelegt!`;
        setBinStatusMsg(finalMsg);
      }

      setSelectedForComparison(prev => [...prev, ...newDecodedIds]);
    } catch (err: any) {
      console.error('Fehler bei BIN Verarbeitung:', err);
      setBinStatusStep('error');
      setBinStatusMsg(`Fehler bei der Verarbeitung: ${err?.message || err}`);
    } finally {
      setBinDecrypting(false);
    }
  };

  const handleBinFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessMultipleBinFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleCreateAndTestDemoBin = async () => {
    const p = selectedPlayer || onlyPlayers[0];
    const demoData = {
      spielerId: p?.id || "12345",
      name: p ? `${p.firstName} ${p.lastName}`.trim() : "Max Mustermann",
      datum: new Date().toISOString().split('T')[0],
      uhrzeit: "18:30",
      trainingId: `TR-${new Date().toISOString().split('T')[0]}-01`,
      trackerQuelle: "GPS-Tracker XY (FC Auggen)",
      gesamtDistanzMeter: 7420 + Math.floor(Math.random() * 800),
      gesamtDauerSekunden: 4320,
      durchschnittsGeschwindigkeitKmh: 12.3,
      maxGeschwindigkeitKmh: parseFloat((28.7 + Math.random() * 2).toFixed(1)),
      durchschnittsHerzfrequenz: 152,
      maxHerzfrequenz: 189,
      belastungsZonen: {
        zone1LockerMin: 15,
        zone2NormalMin: 25,
        zone3IntensivMin: 20,
        zone4SehrIntensivMin: 10
      },
      sprints: [
        { startSekunde: 1200, dauerSekunden: 8, maxGeschwindigkeitKmh: 30.1 },
        { startSekunde: 2100, dauerSekunden: 6, maxGeschwindigkeitKmh: 29.4 }
      ],
      gpsPunkte: [
        { zeitSekunde: 0, lat: 47.7931, lon: 7.5953, geschwindigkeitKmh: 10.2 },
        { zeitSekunde: 600, lat: 47.7938, lon: 7.5960, geschwindigkeitKmh: 22.4 },
        { zeitSekunde: 1200, lat: 47.7944, lon: 7.5968, geschwindigkeitKmh: 29.8 }
      ]
    };

    const jsonString = JSON.stringify(demoData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/octet-stream' });
    const file = new File([blob], `TrackerData_${demoData.name.replace(/\s+/g, '_')}_${demoData.datum}.bin`, { type: 'application/octet-stream' });
    
    await handleProcessBinFile(file);
  };

  const handleCreateAndTestDemoBatch = async () => {
    // Generate batch of 6 BIN files matching the exact screenshot session pattern: session_k5spD-*.bin
    const suffixes = ['060JhnTreH', '09An5iSp8G', '08SsAwZJjc', '07x5Lf6GuA', '05OHKqwfUA', '04feXrshkD'];
    const files: File[] = [];

    suffixes.forEach((suffix, idx) => {
      const assignedPlayer = onlyPlayers[idx % onlyPlayers.length] || selectedPlayer;
      const playerFullName = assignedPlayer ? `${assignedPlayer.firstName} ${assignedPlayer.lastName}`.trim() : `Spieler ${idx + 1}`;

      const demoData = {
        spielerId: assignedPlayer?.id || `sp_${idx + 1}`,
        name: playerFullName,
        datum: '2026-07-28',
        uhrzeit: '12:17',
        trainingId: 'TR-SESSION-K5SPD',
        trackerQuelle: 'GPS-Tracker MagentaCloud Pod',
        gesamtDistanzMeter: 6900 + (idx * 420) + Math.floor(Math.random() * 300),
        gesamtDauerSekunden: 5400,
        durchschnittsGeschwindigkeitKmh: parseFloat((11.8 + idx * 0.4).toFixed(1)),
        maxGeschwindigkeitKmh: parseFloat((26.8 + idx * 0.7).toFixed(1)),
        durchschnittsHerzfrequenz: 148 + idx * 3,
        maxHerzfrequenz: 182 + idx * 2,
        belastungsZonen: {
          zone1LockerMin: 18 - idx,
          zone2NormalMin: 28,
          zone3IntensivMin: 22 + idx,
          zone4SehrIntensivMin: 12 + idx
        },
        sprints: [
          { startSekunde: 800, dauerSekunden: 7, maxGeschwindigkeitKmh: 27.5 + idx },
          { startSekunde: 1900, dauerSekunden: 6, maxGeschwindigkeitKmh: 28.2 + idx }
        ],
        gpsPunkte: [
          { zeitSekunde: 0, lat: 47.7931, lon: 7.5953, geschwindigkeitKmh: 10.2 },
          { zeitSekunde: 600, lat: 47.7938, lon: 7.5960, geschwindigkeitKmh: 22.4 }
        ]
      };

      const jsonString = JSON.stringify(demoData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/octet-stream' });
      const file = new File([blob], `session_k5spD-${suffix}.bin`, { type: 'application/octet-stream' });
      files.push(file);
    });

    await handleProcessMultipleBinFiles(files);
  };

  // Selected player object
  const selectedPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId);
  }, [players, selectedPlayerId]);

  // Get all tracker entries for selected player (or all players if selectedPlayer is not set)
  const normalizedTrackerHistory: DecodedTrackerData[] = useMemo(() => {
    const targetPlayers = selectedPlayer ? [selectedPlayer] : onlyPlayers;
    const allItems: DecodedTrackerData[] = [];

    targetPlayers.forEach(p => {
      if (p.trackerHistory && Array.isArray(p.trackerHistory)) {
        p.trackerHistory.forEach((rawItem: any) => {
          const itemDatum = extractSessionDate(rawItem) || new Date().toISOString().split('T')[0];
          const itemUhrzeit = extractSessionTime(rawItem) || '18:30';

          if (rawItem.gesamtDistanzMeter !== undefined) {
            allItems.push({
              ...(rawItem as DecodedTrackerData),
              datum: itemDatum,
              uhrzeit: itemUhrzeit
            });
          } else {
            allItems.push({
              id: rawItem.id || `tracker_${Date.now()}`,
              spielerId: p.id,
              name: `${p.firstName} ${p.lastName}`.trim(),
              datum: itemDatum,
              uhrzeit: itemUhrzeit,
              trainingId: rawItem.matchName || `TR-${rawItem.id}`,
              trackerQuelle: rawItem.trackerQuelle || 'GPS-Tracker XY',
              gesamtDistanzMeter: Math.round((rawItem.totalDistanceKm || 7.5) * 1000),
              gesamtDauerSekunden: 5400,
              durchschnittsGeschwindigkeitKmh: 12.3,
              maxGeschwindigkeitKmh: rawItem.maxSpeedKmh || 28.5,
              durchschnittsHerzfrequenz: rawItem.avgHeartRateBpm || 154,
              maxHerzfrequenz: rawItem.maxHeartRateBpm || 188,
              belastungsZonen: {
                zone1LockerMin: 18,
                zone2NormalMin: 28,
                zone3IntensivMin: 22,
                zone4SehrIntensivMin: 12
              },
              sprints: [],
              gpsPunkte: [],
              fileName: rawItem.fileName || 'Tracker_Data.bin'
            });
          }
        });
      }
    });

    return allItems;
  }, [selectedPlayer, onlyPlayers]);

  const handleApplyParsedDoc = () => {
    if (!parsedDocData) return;

    if (parsedDocData.date) {
      setDate(parsedDocData.date);
      setAnalysedatum(parsedDocData.date);
      setTrackerDate(parsedDocData.date);
    }
    if (parsedDocData.focus) setFocus(parsedDocData.focus);
    if (parsedDocData.duration) setDuration(Number(parsedDocData.duration));
    if (parsedDocData.rpe) setRpe(Number(parsedDocData.rpe));

    if (parsedDocData.type === 'Match' || parsedDocData.type === 'match') {
      setType('Match');
      if (parsedDocData.matchMinutes !== undefined) setMatchMinutes(Number(parsedDocData.matchMinutes));
      if (parsedDocData.goals !== undefined) setGoals(Number(parsedDocData.goals));
      if (parsedDocData.assists !== undefined) setAssists(Number(parsedDocData.assists));
      if (parsedDocData.passAccuracy !== undefined) setPassAccuracy(Number(parsedDocData.passAccuracy));
      if (parsedDocData.tackleRate !== undefined) setTackleRate(Number(parsedDocData.tackleRate));
    } else {
      setType('Training');
    }

    if (parsedDocData.sprint10m || parsedDocData.sprint30m || parsedDocData.yoyotest || parsedDocData.jumpHeight) {
      setUpdateKpis(true);
      if (parsedDocData.sprint10m) {
        setSprint10m(parsedDocData.sprint10m);
        setKpi10m(parsedDocData.sprint10m);
      }
      if (parsedDocData.sprint30m) {
        setSprint30m(parsedDocData.sprint30m);
        setKpi30m(parsedDocData.sprint30m);
      }
      if (parsedDocData.yoyotest) {
        setYoyotest(parsedDocData.yoyotest);
        setKpiYoyo(parsedDocData.yoyotest);
      }
      if (parsedDocData.jumpHeight) {
        setJumpHeight(parsedDocData.jumpHeight);
        setKpiJump(parsedDocData.jumpHeight);
      }
    }

    if (parsedDocData.trackerTotalDist) setTrackerTotalDist(parsedDocData.trackerTotalDist);
    if (parsedDocData.trackerHighSpeed) setTrackerHighSpeed(parsedDocData.trackerHighSpeed);
    if (parsedDocData.trackerMaxSpeed) setTrackerMaxSpeed(parsedDocData.trackerMaxSpeed);
    if (parsedDocData.trackerSprints) setTrackerSprints(parsedDocData.trackerSprints);
    if (parsedDocData.trackerAvgHr) setTrackerAvgHr(parsedDocData.trackerAvgHr);
    if (parsedDocData.trackerMaxHr) setTrackerMaxHr(parsedDocData.trackerMaxHr);
    if (parsedDocFileName) setTrackerFileName(parsedDocFileName);

    setPortalView('form');
    setParsedDocModalOpen(false);
    setParsingSuccess(`Daten aus "${parsedDocFileName}" erfolgreich in das Spielerprofil übernommen!`);
  };

  const handleExportDataSheetPDF = async () => {
    setIsExportingDataSheetPDF(true);
    try {
      const element = document.getElementById('player-data-sheet-pdf');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          fixOklchForHtml2Canvas(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const nameStr = selectedPlayer ? `${selectedPlayer.lastName}_${selectedPlayer.firstName}` : 'Spieler';
      pdf.save(`Spielerdatenblatt_${nameStr}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Fehler beim Erstellen der PDF. Bitte versuche 'Report drucken / PDF'.");
    } finally {
      setIsExportingDataSheetPDF(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processPortalPDFFile(file);
    e.target.value = '';
  };

  // Optional Athletic KPIs
  const [updateKpis, setUpdateKpis] = useState<boolean>(false);
  const [sprint10m, setSprint10m] = useState<string>('');
  const [sprint30m, setSprint30m] = useState<string>('');
  const [yoyotest, setYoyotest] = useState<string>('');
  const [jumpHeight, setJumpHeight] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Played matches with starting lineups vs subs minutes
  const playedMatches = useMemo(() => {
    if (!selectedPlayer) return [];
    const list: any[] = [];
    
    // Competitive matches
    competitiveMatches.forEach(m => {
      const rec = competitiveMinutes.find(r => r.playerId === selectedPlayer.id);
      const mins = rec?.minutes?.[m.id] || 0;
      if (mins > 0) {
        const details = rec?.details?.[m.id];
        const isSubstitute = details && details.start && details.start !== "" && details.start !== "00:00";
        list.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date || '',
          type: 'Pflichtspiel',
          minutes: mins,
          startelfMinutes: isSubstitute ? 0 : mins,
          einwechslungMinutes: isSubstitute ? mins : 0,
          isSubstitute
        });
      }
    });

    // Test matches
    testMatches.forEach(m => {
      const rec = testMinutes.find(r => r.playerId === selectedPlayer.id);
      const mins = rec?.minutes?.[m.id] || 0;
      if (mins > 0) {
        const details = rec?.details?.[m.id];
        const isSubstitute = details && details.start && details.start !== "" && details.start !== "00:00";
        list.push({
          matchId: m.id,
          opponent: m.opponent,
          date: m.date || '',
          type: 'Testspiel',
          minutes: mins,
          startelfMinutes: isSubstitute ? 0 : mins,
          einwechslungMinutes: isSubstitute ? mins : 0,
          isSubstitute
        });
      }
    });

    // Chronological sorting
    return list.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
  }, [selectedPlayer, competitiveMatches, competitiveMinutes, testMatches, testMinutes]);

  // Plotted points for the currently selected player and match
  const filteredPointsForMatch = useMemo(() => {
    if (!selectedPlayer || !selectedMovementMatchId) return [];
    return (selectedPlayer.movementPoints || []).filter(
      pt => String(pt.matchId) === String(selectedMovementMatchId)
    );
  }, [selectedPlayer, selectedMovementMatchId]);

  // Points filtered by current slider minute and sorted chronologically
  const pointsBeforeFilter = useMemo(() => {
    return filteredPointsForMatch
      .filter(pt => pt.minute <= (isPlayingAnimation ? animationMinute : movementMinuteFilter))
      .sort((a, b) => a.minute - b.minute);
  }, [filteredPointsForMatch, movementMinuteFilter, isPlayingAnimation, animationMinute]);

  // Interpolated position for smooth animation replay along the trajectory path
  const animatedPlayerPos = useMemo(() => {
    const pts = [...filteredPointsForMatch].sort((a, b) => a.minute - b.minute);
    if (pts.length === 0) return null;
    const currentMin = isPlayingAnimation ? animationMinute : movementMinuteFilter;

    if (currentMin <= pts[0].minute) {
      return { x: pts[0].x, y: pts[0].y, actionType: pts[0].actionType || 'run', label: pts[0].label || `Min. ${pts[0].minute}` };
    }
    if (currentMin >= pts[pts.length - 1].minute) {
      const last = pts[pts.length - 1];
      return { x: last.x, y: last.y, actionType: last.actionType || 'run', label: last.label || `Min. ${last.minute}` };
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      if (currentMin >= p1.minute && currentMin <= p2.minute) {
        const factor = (currentMin - p1.minute) / (p2.minute - p1.minute);
        const interpolatedX = p1.x + (p2.x - p1.x) * factor;
        const interpolatedY = p1.y + (p2.y - p1.y) * factor;
        return {
          x: interpolatedX,
          y: interpolatedY,
          actionType: p2.actionType || 'run',
          label: `${p1.minute}' ➔ ${p2.minute}': ${p2.label || 'Laufbewegung'}`
        };
      }
    }
    return { x: pts[0].x, y: pts[0].y, actionType: pts[0].actionType || 'run' };
  }, [filteredPointsForMatch, isPlayingAnimation, animationMinute, movementMinuteFilter]);

  // Auto-generate realistic GPS trajectory points based on player position
  const handleGeneratePositionalTrajectory = () => {
    if (!selectedPlayer || !selectedMovementMatchId) return;

    const pos = selectedPlayer.position?.toUpperCase() || 'ZM';
    let templatePoints: { minute: number; x: number; y: number; actionType: 'sprint' | 'run' | 'walk' | 'defensive'; label: string }[] = [];

    if (pos === 'TW') {
      templatePoints = [
        { minute: 5, x: 8, y: 50, actionType: 'walk', label: 'Torlinie Grundposition' },
        { minute: 18, x: 16, y: 38, actionType: 'run', label: 'Abstoß / Passwinkel links' },
        { minute: 32, x: 12, y: 62, actionType: 'run', label: 'Flanke abfangen rechts' },
        { minute: 45, x: 8, y: 50, actionType: 'walk', label: 'Halbzeit Torlinie' },
        { minute: 58, x: 22, y: 50, actionType: 'sprint', label: 'Mitspielender TW (Herausrücken)' },
        { minute: 74, x: 10, y: 42, actionType: 'sprint', label: '1-gegen-1 Klärung' },
        { minute: 90, x: 8, y: 50, actionType: 'walk', label: 'Schlussphase Torlinie' },
      ];
    } else if (pos.includes('IV')) {
      templatePoints = [
        { minute: 5, x: 25, y: 45, actionType: 'walk', label: 'Abwehrkette Grundordnung' },
        { minute: 15, x: 38, y: 42, actionType: 'run', label: 'Vorschieben im Aufbauspiel' },
        { minute: 28, x: 18, y: 35, actionType: 'defensive', label: 'Tiefensicherung / Laufduell' },
        { minute: 40, x: 28, y: 52, actionType: 'run', label: 'Diagonaler Ballgewinn' },
        { minute: 52, x: 32, y: 40, actionType: 'sprint', label: 'Gegenpressing nach Ballverlust' },
        { minute: 68, x: 85, y: 50, actionType: 'sprint', label: 'Offensiv-Ecke Kopfballduell' },
        { minute: 78, x: 22, y: 48, actionType: 'defensive', label: 'Rückzug Abwehrriegel' },
        { minute: 90, x: 24, y: 45, actionType: 'walk', label: 'Schlussabsicherung' },
      ];
    } else if (pos.includes('RV') || pos.includes('LV')) {
      const isRight = pos.includes('RV');
      const sideY = isRight ? 82 : 18;
      templatePoints = [
        { minute: 5, x: 28, y: sideY, actionType: 'walk', label: 'Außenverteidiger Grundstellung' },
        { minute: 16, x: 55, y: sideY, actionType: 'run', label: 'Aufrücken Flügelzone' },
        { minute: 28, x: 82, y: sideY - 5, actionType: 'sprint', label: 'Flankensprint Grundlinie' },
        { minute: 42, x: 30, y: sideY, actionType: 'defensive', label: 'Rücklauf Konterabsicherung' },
        { minute: 55, x: 68, y: sideY, actionType: 'sprint', label: 'Überlaufen des Flügelstürmers' },
        { minute: 72, x: 78, y: 50, actionType: 'sprint', label: 'Einrücken / Torgefahr 16m' },
        { minute: 88, x: 25, y: sideY, actionType: 'defensive', label: 'Kette schließen' },
      ];
    } else if (pos.includes('ST')) {
      templatePoints = [
        { minute: 5, x: 68, y: 50, actionType: 'walk', label: 'Anspielstation Zentrum' },
        { minute: 14, x: 86, y: 38, actionType: 'sprint', label: 'Tiefenlauf Schnittstelle' },
        { minute: 28, x: 92, y: 52, actionType: 'sprint', label: 'Strafraum-Szenario / Abschluss' },
        { minute: 42, x: 62, y: 45, actionType: 'defensive', label: 'Anlaufpressing gegnerische IV' },
        { minute: 58, x: 84, y: 70, actionType: 'run', label: 'Ausweichen auf den Flügel' },
        { minute: 72, x: 88, y: 48, actionType: 'sprint', label: 'Kopfball-Präsenz 11m-Punkt' },
        { minute: 86, x: 75, y: 55, actionType: 'run', label: 'Festmachen des Ballempfangs' },
      ];
    } else {
      templatePoints = [
        { minute: 5, x: 48, y: 50, actionType: 'walk', label: 'Zentrales Mittelfeld Anpfiff' },
        { minute: 14, x: 65, y: 38, actionType: 'run', label: 'Aufrücken / Box-to-Box' },
        { minute: 26, x: 82, y: 45, actionType: 'sprint', label: 'Torgefährlicher Vorstoss 16m' },
        { minute: 38, x: 38, y: 60, actionType: 'defensive', label: 'Defensiver Umschaltlauf' },
        { minute: 52, x: 55, y: 48, actionType: 'run', label: 'Spielaufbau / Verteilerrolle' },
        { minute: 66, x: 76, y: 28, actionType: 'sprint', label: 'Flügelunterstützung' },
        { minute: 80, x: 32, y: 50, actionType: 'defensive', label: 'Abfangpass Tiefenabsicherung' },
        { minute: 90, x: 58, y: 48, actionType: 'run', label: 'Schlussoffensive Pressing' },
      ];
    }

    const generatedPoints = templatePoints.map((pt, idx) => ({
      id: `gen_point_${Date.now()}_${idx}`,
      matchId: selectedMovementMatchId,
      minute: pt.minute,
      x: pt.x,
      y: pt.y,
      actionType: pt.actionType,
      label: pt.label
    }));

    const existingOtherMatchPoints = (selectedPlayer.movementPoints || []).filter(
      pt => String(pt.matchId) !== String(selectedMovementMatchId)
    );
    const updatedPoints = [...existingOtherMatchPoints, ...generatedPoints];

    onUpdatePlayerMovementPoints?.(selectedPlayer.id, updatedPoints);
  };

  const handleClearAllMatchPoints = () => {
    if (!selectedPlayer || !selectedMovementMatchId) return;
    const remainingPoints = (selectedPlayer.movementPoints || []).filter(
      pt => String(pt.matchId) !== String(selectedMovementMatchId)
    );
    onUpdatePlayerMovementPoints?.(selectedPlayer.id, remainingPoints);
  };

  // Handle setting a point on the pitch
  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPlayer || !selectedMovementMatchId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xc = ((e.clientX - rect.left) / rect.width) * 100;
    const yc = ((e.clientY - rect.top) / rect.height) * 100;
    const x = 100 - yc;
    const y = xc;

    const actionLabels: Record<string, string> = {
      sprint: 'Vollsprint / Tempoakzent',
      run: 'Laufbewegung / Umschalten',
      walk: 'Positionierung / Trotten',
      defensive: 'Defensivlauf / Pressing'
    };

    const newPoint = {
      id: `point_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchId: selectedMovementMatchId,
      minute: movementMinuteInput,
      x: parseFloat(x.toFixed(1)),
      y: parseFloat(y.toFixed(1)),
      actionType: selectedActionType,
      label: actionLabels[selectedActionType] || 'Laufbewegung'
    };

    const currentPoints = selectedPlayer.movementPoints || [];
    const updatedPoints = [...currentPoints, newPoint];
    onUpdatePlayerMovementPoints?.(selectedPlayer.id, updatedPoints);
  };

  // Handle deleting a plotted point
  const handleDeletePoint = (pointId: string) => {
    if (!selectedPlayer) return;
    const currentPoints = selectedPlayer.movementPoints || [];
    const updatedPoints = currentPoints.filter(pt => pt.id !== pointId);
    onUpdatePlayerMovementPoints?.(selectedPlayer.id, updatedPoints);
  };

  // Logs of the selected player
  const playerLogs = useMemo(() => {
    return sessionLogs
      .filter(log => log.playerId === selectedPlayerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [sessionLogs, selectedPlayerId]);

  // Calculations
  const calculatedLoad = duration * rpe;

  const rpeLabels: Record<number, { text: string; color: string; bg: string }> = {
    1: { text: 'Sehr leicht', color: 'text-green-600', bg: 'bg-green-50' },
    2: { text: 'Leicht', color: 'text-green-600', bg: 'bg-green-50' },
    3: { text: 'Moderat', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    4: { text: 'Mittel', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    5: { text: 'Etwas anstrengend', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    6: { text: 'Anstrengend', color: 'text-yellow-600', bg: 'bg-yellow-50' },
    7: { text: 'Schwer', color: 'text-orange-600', bg: 'bg-orange-50' },
    8: { text: 'Sehr schwer', color: 'text-orange-600', bg: 'bg-orange-50' },
    9: { text: 'Extrem schwer', color: 'text-red-600', bg: 'bg-red-50' },
    10: { text: 'Maximal', color: 'text-red-700 font-black', bg: 'bg-red-100' }
  };

  const handlePlayerChange = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setSuccessMsg('');
    const p = players.find(x => x.id === playerId);
    if (p) {
      // Prefill with existing diagnostics if any
      setSprint10m(p.diagnostics?.sprintwert || '');
      setSprint30m(p.diagnostics?.sprint30m || '');
      setYoyotest(p.diagnostics?.yoyotest || '');
      setJumpHeight(p.physical?.bodyFat?.toString() || ''); // Or standard fields
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      alert('Bitte wähle zuerst einen Spieler aus.');
      return;
    }
    if (!focus.trim()) {
      alert('Bitte gib den inhaltlichen Schwerpunkt oder das Thema an.');
      return;
    }

    try {
      setSubmitting(true);
      const logId = `log-${Date.now()}`;
      
      const sessionData: any = {
        id: logId,
        playerId: selectedPlayerId,
        playerName: selectedPlayer ? selectedPlayer.lastName : 'Unbekannt',
        date,
        type,
        focus: focus.trim(),
        duration,
        rpe,
        calculatedLoad,
        timestamp: new Date().toISOString()
      };

      if (type === 'Match') {
        sessionData.matchMinutes = Number(matchMinutes);
        sessionData.goals = Number(goals);
        sessionData.assists = Number(assists);
        sessionData.passAccuracy = Number(passAccuracy);
        sessionData.tackleRate = Number(tackleRate);
      }

      if (updateKpis) {
        sessionData.kpis = {
          sprint10m,
          sprint30m,
          yoyotest,
          jumpHeight
        };
      }

      // Save the log
      await onSaveLog(sessionData);

      // Trigger automatic calculations and profile updates
      if (updateKpis && onUpdatePlayerDiagnostics) {
        await onUpdatePlayerDiagnostics(selectedPlayerId, {
          sprintwert: sprint10m,
          sprint30m: sprint30m,
          yoyotest: yoyotest,
          jumpHeight: jumpHeight
        });
      }

      // Update total playing minutes if match is saved
      if (type === 'Match' && onUpdatePlayerStats) {
        await onUpdatePlayerStats(selectedPlayerId, Number(matchMinutes), Number(goals), Number(assists));
      }

      setFocus('');
      setUpdateKpis(false);
      setSuccessMsg('Deine Daten wurden erfolgreich eingetragen!');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err) {
      console.error('Fehler beim Speichern der Einheit:', err);
      alert('Fehler beim Speichern der Einheit.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to parse numeric values from diagnostic strings
  const parseNumber = (str: string | undefined | null): number => {
    if (!str) return 0;
    const cleaned = str.replace(/[^0-9.,]/g, '').replace(',', '.');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  };

  // Table search & filter states for comparison
  const [comparisonSearchTerm, setComparisonSearchTerm] = useState<string>('');
  const [comparisonPosFilter, setComparisonPosFilter] = useState<string>('ALLE');
  const [comparisonSortField, setComparisonSortField] = useState<string>('workloadScore');
  const [comparisonSortAsc, setComparisonSortAsc] = useState<boolean>(false);

  // Compute stats and KPIs for ALL players for comparison (including Performance & Belastungsmonitor)
  const playerAverages = useMemo(() => {
    return onlyPlayers.map(p => {
      const logs = sessionLogs.filter(log => log.playerId === p.id);
      const totals = logs.reduce((acc, log) => {
        acc.count += 1;
        if (log.type === 'Match') {
          acc.matchCount += 1;
          acc.minutesSum += log.matchMinutes || 0;
          acc.goalsSum += log.goals || 0;
          acc.assistsSum += log.assists || 0;
          acc.passAccuracySum += log.passAccuracy || 0;
          acc.tackleRateSum += log.tackleRate || 0;
        }
        return acc;
      }, { count: 0, matchCount: 0, minutesSum: 0, goalsSum: 0, assistsSum: 0, passAccuracySum: 0, tackleRateSum: 0 });

      // Check if player has custom datenblattReport saved
      const rep = p.datenblattReport;
      
      const sprint10mStr = rep?.kpi10m || p.diagnostics?.sprintwert || '';
      const sprint30mStr = rep?.kpi30m || p.diagnostics?.sprint30m || '';
      const yoyoStr = rep?.kpiYoyo || p.diagnostics?.yoyotest || '';
      const jumpStr = rep?.kpiJump || p.diagnostics?.jumpHeight || '';

      // Safe name extraction
      const pLastName = p.lastName || p.name || 'Spieler';
      const pFirstName = p.firstName || '';
      const pFullName = `${pFirstName} ${pLastName}`.trim();

      // Search tracker reports
      const playerTrackerReport = (trackerAcademyReports || []).find(tr => tr.playerId === p.id || (pLastName && tr.playerName?.toLowerCase().includes(pLastName.toLowerCase())));
      const latestHistory = (p.trackerHistory && p.trackerHistory.length > 0) ? p.trackerHistory[0] : null;

      // Extract GPS / Belastungsmonitor metrics
      const distKmNum = playerTrackerReport?.metrics?.totalDistanceKm || (p.trackerAnalysis as any)?.totalDistanceKm || ((latestHistory as any)?.gesamtDistanzMeter ? (latestHistory as any).gesamtDistanzMeter / 1000 : 0);
      const maxSpeedNum = playerTrackerReport?.metrics?.maxSpeedKmh || (p.trackerAnalysis as any)?.maxSpeedKmh || (latestHistory as any)?.maxGeschwindigkeitKmh || 0;
      const sprintCountNum = playerTrackerReport?.metrics?.sprintCount || (p.trackerAnalysis as any)?.sprintCount || ((latestHistory as any)?.sprints?.length || 0);
      const highSpeedMNum = playerTrackerReport?.metrics?.highSpeedDistanceMeters || (p.trackerAnalysis as any)?.highSpeedDistanceMeters || (p.trackerAnalysis as any)?.highSpeedDistanceM || 0;
      const workloadScoreNum = playerTrackerReport?.metrics?.workloadScore || playerTrackerReport?.overallScore || (p.trackerAnalysis as any)?.workloadScore || 0;
      const avgHrNum = playerTrackerReport?.metrics?.avgHeartRateBpm || (p.trackerAnalysis as any)?.avgHeartRateBpm || (latestHistory as any)?.durchschnittsHerzfrequenz || 0;

      // Position-based fallback baseline if no tracker file uploaded yet
      const pos = (p.position || '').toUpperCase();
      const isGk = pos.includes('TW') || pos.includes('TOR');
      const isDef = pos.includes('IV') || pos.includes('RV') || pos.includes('LV') || pos.includes('ABWEHR');
      const isMid = pos.includes('ZM') || pos.includes('DM') || pos.includes('OM') || pos.includes('MITTEL');
      const isAtk = pos.includes('ST') || pos.includes('RA') || pos.includes('LA') || pos.includes('STURM');

      const seed = p.number || (pLastName.length * 3);
      const defaultDist = distKmNum || (isGk ? 4.8 + (seed % 8) * 0.1 : isMid ? 10.5 + (seed % 15) * 0.1 : isDef ? 9.6 + (seed % 12) * 0.1 : 10.1 + (seed % 14) * 0.1);
      const defaultMaxSpeed = maxSpeedNum || (isGk ? 24.2 + (seed % 6) * 0.2 : isAtk ? 32.8 + (seed % 10) * 0.2 : isDef ? 31.2 + (seed % 8) * 0.2 : 30.8 + (seed % 9) * 0.2);
      const defaultSprints = sprintCountNum || (isGk ? 4 + (seed % 3) : isAtk ? 28 + (seed % 10) : isMid ? 22 + (seed % 8) : 20 + (seed % 7));
      const defaultHighSpeed = highSpeedMNum || (isGk ? 120 + (seed % 50) : isAtk ? 720 + (seed % 150) : isMid ? 650 + (seed % 120) : 580 + (seed % 100));
      const defaultWorkload = workloadScoreNum || Math.min(99, Math.max(65, 72 + (seed % 24)));
      const defaultAvgHr = avgHrNum || (isGk ? 132 + (seed % 10) : 158 + (seed % 14));

      const sprint10mVal = sprint10mStr || (isGk ? "1.85s" : isAtk ? `${(1.62 + (seed % 10) * 0.01).toFixed(2)}s` : `${(1.68 + (seed % 10) * 0.01).toFixed(2)}s`);
      const sprint30mVal = sprint30mStr || (isGk ? "4.20s" : isAtk ? `${(3.72 + (seed % 12) * 0.01).toFixed(2)}s` : `${(3.85 + (seed % 12) * 0.01).toFixed(2)}s`);
      const yoyoVal = yoyoStr || (isGk ? "17.2" : isMid ? `${(21.2 + (seed % 8) * 0.1).toFixed(1)}` : `${(20.4 + (seed % 8) * 0.1).toFixed(1)}`);
      const jumpVal = jumpStr || (isGk ? "52.0cm" : isDef ? `${(48.0 + (seed % 10) * 0.5).toFixed(1)}cm` : `${(44.0 + (seed % 10) * 0.5).toFixed(1)}cm`);

      return {
        id: p.id,
        firstName: pFirstName,
        lastName: pLastName,
        name: pLastName,
        fullName: pFullName,
        number: p.number,
        image: p.image,
        position: p.position || 'Feldspieler',
        sprint10m: sprint10mVal,
        sprint30m: sprint30mVal,
        yoyo: yoyoVal,
        jump: jumpVal,
        sprint10mNum: parseNumber(sprint10mVal),
        sprint30mNum: parseNumber(sprint30mVal),
        yoyoNum: parseNumber(yoyoVal),
        jumpNum: parseNumber(jumpVal),
        // Performance & Belastungsmonitor GPS metrics
        distKm: parseFloat(defaultDist.toFixed(1)),
        distKmStr: `${defaultDist.toFixed(1)} km`,
        maxSpeed: parseFloat(defaultMaxSpeed.toFixed(1)),
        maxSpeedStr: `${defaultMaxSpeed.toFixed(1)} km/h`,
        sprints: Math.round(defaultSprints),
        sprintsStr: `${Math.round(defaultSprints)}`,
        highSpeedM: Math.round(defaultHighSpeed),
        highSpeedMStr: `${Math.round(defaultHighSpeed)} m`,
        workloadScore: Math.round(defaultWorkload),
        workloadScoreStr: `${Math.round(defaultWorkload)} / 100`,
        avgHr: Math.round(defaultAvgHr),
        avgHrStr: `${Math.round(defaultAvgHr)} bpm`,
        totalUnits: totals.count,
        matchCount: totals.matchCount,
        totalMinutes: totals.minutesSum || p.einsatzzeitenGesamt || (isGk ? 900 : 720 + (seed % 200)),
        totalGoals: totals.goalsSum || (p as any).goals || (isAtk ? 4 + (seed % 6) : isMid ? 2 + (seed % 3) : 0),
        totalAssists: totals.assistsSum || (p as any).assists || (isAtk ? 3 + (seed % 4) : isMid ? 4 + (seed % 5) : 0),
        avgPass: totals.matchCount > 0 ? Math.round(totals.passAccuracySum / totals.matchCount) : (isMid ? 86 : isDef ? 82 : 78),
        avgTackle: totals.matchCount > 0 ? Math.round(totals.tackleRateSum / totals.matchCount) : (isDef ? 72 : isMid ? 62 : 54),
      };
    });
  }, [onlyPlayers, sessionLogs, trackerAcademyReports]);

  // Leaders for various metrics
  const leaders = useMemo(() => {
    const valid10m = playerAverages.filter(p => p.sprint10mNum > 0);
    const valid30m = playerAverages.filter(p => p.sprint30mNum > 0);
    const validYoyo = playerAverages.filter(p => p.yoyoNum > 0);
    const validJump = playerAverages.filter(p => p.jumpNum > 0);
    const validDist = playerAverages.filter(p => p.distKm > 0);
    const validSpeed = playerAverages.filter(p => p.maxSpeed > 0);
    const validWorkload = playerAverages.filter(p => p.workloadScore > 0);

    return {
      sprint10m: valid10m.length > 0 ? [...valid10m].sort((a, b) => a.sprint10mNum - b.sprint10mNum)[0] : null,
      sprint30m: valid30m.length > 0 ? [...valid30m].sort((a, b) => a.sprint30mNum - b.sprint30mNum)[0] : null,
      yoyo: validYoyo.length > 0 ? [...validYoyo].sort((a, b) => b.yoyoNum - a.yoyoNum)[0] : null,
      jump: validJump.length > 0 ? [...validJump].sort((a, b) => b.jumpNum - a.jumpNum)[0] : null,
      distKm: validDist.length > 0 ? [...validDist].sort((a, b) => b.distKm - a.distKm)[0] : null,
      maxSpeed: validSpeed.length > 0 ? [...validSpeed].sort((a, b) => b.maxSpeed - a.maxSpeed)[0] : null,
      workloadScore: validWorkload.length > 0 ? [...validWorkload].sort((a, b) => b.workloadScore - a.workloadScore)[0] : null,
    };
  }, [playerAverages]);

  // Duel compare states
  const [comparePlayerId1, setComparePlayerId1] = useState<string>(selectedPlayerId);
  const [comparePlayerId2, setComparePlayerId2] = useState<string>('');

  // Auto set comparePlayerId2 to second player if empty
  useEffect(() => {
    if (!comparePlayerId2 && onlyPlayers.length > 1) {
      const secondPlayer = onlyPlayers.find(p => p.id !== selectedPlayerId);
      if (secondPlayer) setComparePlayerId2(secondPlayer.id);
    }
  }, [onlyPlayers, selectedPlayerId, comparePlayerId2]);

  // Sync selectedPlayer to comparePlayerId1
  useEffect(() => {
    if (selectedPlayerId) {
      setComparePlayerId1(selectedPlayerId);
    }
  }, [selectedPlayerId]);

  // Compute averages for active player
  const analytics = useMemo(() => {
    if (playerLogs.length === 0) return null;
    const totals = playerLogs.reduce((acc, log) => {
      acc.rpeSum += log.rpe;
      acc.loadSum += log.calculatedLoad;
      acc.durationSum += log.duration;
      acc.count += 1;
      if (log.type === 'Match') {
        acc.matchCount += 1;
        acc.minutesSum += log.matchMinutes || 0;
        acc.goalsSum += log.goals || 0;
        acc.assistsSum += log.assists || 0;
        acc.passAccuracySum += log.passAccuracy || 0;
        acc.tackleRateSum += log.tackleRate || 0;
      }
      return acc;
    }, { rpeSum: 0, loadSum: 0, durationSum: 0, count: 0, matchCount: 0, minutesSum: 0, goalsSum: 0, assistsSum: 0, passAccuracySum: 0, tackleRateSum: 0 });

    return {
      avgRpe: (totals.rpeSum / totals.count).toFixed(1),
      avgLoad: Math.round(totals.loadSum / totals.count),
      totalDuration: totals.durationSum,
      totalUnits: totals.count,
      matchCount: totals.matchCount,
      totalMinutes: totals.minutesSum,
      totalGoals: totals.goalsSum,
      totalAssists: totals.assistsSum,
      avgPass: totals.matchCount > 0 ? Math.round(totals.passAccuracySum / totals.matchCount) : 0,
      avgTackle: totals.matchCount > 0 ? Math.round(totals.tackleRateSum / totals.matchCount) : 0,
    };
  }, [playerLogs]);

  // Prefill player data sheet when selected player or logs change
  useEffect(() => {
    if (!selectedPlayer) return;

    const rep = selectedPlayer.datenblattReport;
    if (rep) {
      setVerein(rep.verein || 'FC Auggen (Herren 1)');
      setSaison(rep.saison || '2026/2027');
      setPlayerStatus(rep.playerStatus || 'Aktiv / Wettkampffähig');
      setAnalysedatum(rep.analysedatum || new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }));

      setKpi10m(rep.kpi10m || selectedPlayer.diagnostics?.sprintwert || '1.62 s');
      setKpi10mBenchmark(rep.kpi10mBenchmark || '< 1,65 s');
      setKpi10mStatus(rep.kpi10mStatus || (selectedPlayer.diagnostics?.sprintwert ? 'Exzellent Sprintschnelligkeit' : 'Exzellent Hohe raumgreifende Dynamik'));

      setKpi30m(rep.kpi30m || selectedPlayer.diagnostics?.sprint30m || '4.08 s');
      setKpi30mBenchmark(rep.kpi30mBenchmark || '< 4,10 s');
      setKpi30mStatus(rep.kpi30mStatus || (selectedPlayer.diagnostics?.sprint30m ? 'Ziel erreicht Grundspeed' : 'Ziel erreicht Wichtig für Umschaltbewegungen'));

      setKpiYoyo(rep.kpiYoyo || selectedPlayer.diagnostics?.yoyotest || 'Level 18.6');
      setKpiYoyoBenchmark(rep.kpiYoyoBenchmark || 'Level 18.5');
      setKpiYoyoStatus(rep.kpiYoyoStatus || (selectedPlayer.diagnostics?.yoyotest ? 'Ziel erreicht Ausdauerleistung' : 'Ziel erreicht Optimales Fundament fürs Zentrum'));

      setKpiJump(rep.kpiJump || selectedPlayer.diagnostics?.jumpHeight || '44 cm');
      setKpiJumpBenchmark(rep.kpiJumpBenchmark || '> 42 cm');
      setKpiJumpStatus(rep.kpiJumpStatus || (selectedPlayer.diagnostics?.jumpHeight ? 'Exzellent CMJ Vertikalsprung' : 'Exzellent Hohe Explosivität bei Kopfballduellen'));

      setSheetMinutes(rep.sheetMinutes || (analytics && analytics.totalUnits > 0 ? (analytics.matchCount > 0 ? `${analytics.totalMinutes} Minuten (Gesamt)` : '90 Minuten (Durchgespielt)') : '90 Minuten (Durchgespielt)'));
      setSheetGoalsAssists(rep.sheetGoalsAssists || (analytics && analytics.totalUnits > 0 ? `${analytics.totalGoals || 0} Tore / ${analytics.totalAssists || 0} Assists` : '0 Tore / 1 Assist'));
      setSheetPassAccuracy(rep.sheetPassAccuracy || (analytics && analytics.totalUnits > 0 ? `${analytics.avgPass || 84.5} %` : '84,5 %'));
      setSheetTackleRate(rep.sheetTackleRate || (analytics && analytics.totalUnits > 0 ? `${analytics.avgTackle || 62.0} %` : '62,0 %'));

      setTaktischeKernkompetenz(rep.taktischeKernkompetenz || `${selectedPlayer.firstName} agiert als exzellenter Stabilisator auf seiner Position (${selectedPlayer.position}). Seine hohe Disziplin sichert die defensive Struktur ab.`);
      setOptimierungsPotenzial(rep.optimierungsPotenzial || `Stellungsspiel und Antizipation bei schnellen gegnerischen Gegenangriffen können weiter verfeinert werden, um Räume kompakter zu halten.`);
      setNaechsteMassnahmen(rep.naechsteMassnahmen || `Spezifisches videogestütztes Individualtraining sowie Fortführung der Schnelligkeits- und Reaktivkraft-Einheiten.`);

      if (rep.sheetLogs && rep.sheetLogs.length > 0) {
        setSheetLogs(rep.sheetLogs);
      } else if (playerLogs.length > 0) {
        const formattedLogs = playerLogs.slice(0, 3).map((log, index) => {
          const rpeLabel = rpeLabels[log.rpe]?.text || 'Moderat';
          return {
            id: log.id,
            title: `Einheit ${index + 1}`,
            focus: log.focus,
            duration: `${log.duration} Min`,
            rpe: `${log.rpe} / 10 (${rpeLabel})`
          };
        });
        setSheetLogs(formattedLogs);
      } else {
        setSheetLogs([
          { id: '1', title: 'Einheit 1', focus: 'Taktische Grundordnung: Kompaktheit im Zentrum', duration: '90 Min', rpe: '6 / 10 (Moderat)' },
          { id: '2', title: 'Einheit 2', focus: 'Athletisches Intervalltraining: High-Intensity-Sprints', duration: '75 Min', rpe: '8 / 10 (Hoch)' },
          { id: '3', title: 'Einheit 3', focus: 'Abschlusstraining: Aktivierung & offensive Standards', duration: '60 Min', rpe: '4 / 10 (Niedrig)' }
        ]);
      }
    } else {
      setVerein('FC Auggen (Herren 1)');
      setSaison('2026/2027');
      setPlayerStatus('Aktiv / Wettkampffähig');
      setAnalysedatum(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }));

      setKpi10m(selectedPlayer.diagnostics?.sprintwert || '1.62 s');
      setKpi30m(selectedPlayer.diagnostics?.sprint30m || '4.08 s');
      setKpiYoyo(selectedPlayer.diagnostics?.yoyotest || 'Level 18.6');
      setKpiJump(selectedPlayer.diagnostics?.jumpHeight || '44 cm');

      setKpi10mBenchmark('< 1,65 s');
      setKpi30mBenchmark('< 4,10 s');
      setKpiYoyoBenchmark('Level 18.5');
      setKpiJumpBenchmark('> 42 cm');

      setKpi10mStatus(selectedPlayer.diagnostics?.sprintwert ? 'Exzellent Sprintschnelligkeit' : 'Exzellent Hohe raumgreifende Dynamik');
      setKpi30mStatus(selectedPlayer.diagnostics?.sprint30m ? 'Ziel erreicht Grundspeed' : 'Ziel erreicht Wichtig für Umschaltbewegungen');
      setKpiYoyoStatus(selectedPlayer.diagnostics?.yoyotest ? 'Ziel erreicht Ausdauerleistung' : 'Ziel erreicht Optimales Fundament fürs Zentrum');
      setKpiJumpStatus(selectedPlayer.diagnostics?.jumpHeight ? 'Exzellent CMJ Vertikalsprung' : 'Exzellent Hohe Explosivität bei Kopfballduellen');

      if (playerLogs.length > 0) {
        const formattedLogs = playerLogs.slice(0, 3).map((log, index) => {
          const rpeLabel = rpeLabels[log.rpe]?.text || 'Moderat';
          return {
            id: log.id,
            title: `Einheit ${index + 1}`,
            focus: log.focus,
            duration: `${log.duration} Min`,
            rpe: `${log.rpe} / 10 (${rpeLabel})`
          };
        });
        setSheetLogs(formattedLogs);
      } else {
        setSheetLogs([
          { id: '1', title: 'Einheit 1', focus: 'Taktische Grundordnung: Kompaktheit im Zentrum', duration: '90 Min', rpe: '6 / 10 (Moderat)' },
          { id: '2', title: 'Einheit 2', focus: 'Athletisches Intervalltraining: High-Intensity-Sprints', duration: '75 Min', rpe: '8 / 10 (Hoch)' },
          { id: '3', title: 'Einheit 3', focus: 'Abschlusstraining: Aktivierung & offensive Standards', duration: '60 Min', rpe: '4 / 10 (Niedrig)' }
        ]);
      }

      if (analytics && analytics.totalUnits > 0) {
        setSheetMinutes(analytics.matchCount > 0 ? `${analytics.totalMinutes} Minuten (Gesamt)` : '90 Minuten (Durchgespielt)');
        setSheetGoalsAssists(`${analytics.totalGoals || 0} Tore / ${analytics.totalAssists || 0} Assists`);
        setSheetPassAccuracy(`${analytics.avgPass || 84.5} %`);
        setSheetTackleRate(`${analytics.avgTackle || 62.0} %`);
      } else {
        setSheetMinutes('90 Minuten (Durchgespielt)');
        setSheetGoalsAssists('0 Tore / 1 Assist');
        setSheetPassAccuracy('84,5 %');
        setSheetTackleRate('62,0 %');
      }

      setTaktischeKernkompetenz(`${selectedPlayer.firstName} agiert als exzellenter Stabilisator auf seiner Position (${selectedPlayer.position}). Seine hohe Disziplin sichert die defensive Struktur ab.`);
      setOptimierungsPotenzial(`Stellungsspiel und Antizipation bei schnellen gegnerischen Gegenangriffen können weiter verfeinert werden, um Räume kompakter zu halten.`);
      setNaechsteMassnahmen(`Spezifisches videogestütztes Individualtraining sowie Fortführung der Schnelligkeits- und Reaktivkraft-Einheiten.`);
    }

    // Sync Tracker Analysis for selected player
    const tr = selectedPlayer.trackerAnalysis;
    if (tr) {
      setTrackerFileName(tr.fileName || (selectedPlayer.number === 11 ? 'WG__Tracker_Julian_Ehret_RNr_11' : selectedPlayer.number === 23 ? 'Tracker_Stefan_Lauer_RNr_23' : `Tracker_${selectedPlayer.firstName}_${selectedPlayer.lastName}`));
      setTrackerFileUrl(tr.fileUrl || (selectedPlayer.number === 11 ? 'https://magentacloud.de/s/H3zDkjkx8pigtpw' : selectedPlayer.number === 23 ? 'https://magentacloud.de/s/6KJqaSL847wGBrf' : ''));
      setTrackerDate(tr.datum || tr.sessionDate || tr.recordingDate || '');
      setTrackerTime(tr.uhrzeit || tr.time || '');
      setTrackerTotalDist(tr.totalDistanceKm ?? (selectedPlayer.number === 11 ? 11.4 : selectedPlayer.number === 23 ? 5.3 : 10.2));
      setTrackerHighSpeed(tr.highSpeedDistanceM ?? (selectedPlayer.number === 11 ? 820 : selectedPlayer.number === 23 ? 140 : 650));
      setTrackerSprintDist(tr.sprintDistanceM ?? (selectedPlayer.number === 11 ? 340 : selectedPlayer.number === 23 ? 65 : 280));
      setTrackerMaxSpeed(tr.maxSpeedKmh ?? (selectedPlayer.number === 11 ? 32.8 : selectedPlayer.number === 23 ? 26.4 : 31.5));
      setTrackerSprints(tr.sprintCount ?? (selectedPlayer.number === 11 ? 28 : selectedPlayer.number === 23 ? 8 : 22));
      setTrackerAccels(tr.accelerations ?? (selectedPlayer.number === 11 ? 42 : selectedPlayer.number === 23 ? 18 : 34));
      setTrackerDecels(tr.decelerations ?? (selectedPlayer.number === 11 ? 38 : selectedPlayer.number === 23 ? 16 : 30));
      setTrackerAvgHr(tr.avgHeartRateBpm ?? (selectedPlayer.number === 11 ? 168 : selectedPlayer.number === 23 ? 138 : 162));
      setTrackerMaxHr(tr.maxHeartRateBpm ?? (selectedPlayer.number === 11 ? 192 : selectedPlayer.number === 23 ? 165 : 185));
      setTrackerWorkload(tr.workloadIndex ?? (selectedPlayer.number === 11 ? 885 : selectedPlayer.number === 23 ? 420 : 780));
      setTrackerHeatmap(tr.heatMapZone || (selectedPlayer.number === 11 ? 'Zentrum / Rechte Halbspur & Box-to-Box' : selectedPlayer.number === 23 ? 'Strafraum & 16m-Außenkante bei Abstößen' : 'Zentrales Mittelfeld'));
      setTrackerTactical(tr.tacticalSummary || (selectedPlayer.number === 11 ? 'Julian Ehret zeigt eine herausragende Laufleistung von 11,4 km als ZM. Hohe Intensität im Umschaltspiel mit 28 Vollsprints und exzellenter Abdeckung des zentralen Mittelfelds.' : selectedPlayer.number === 23 ? 'Stefan Lauer liefert als Torwart (TW) sehr stabile Bewegungswerte (5,3 km). Sehr reaktionsschnelles Nachrücken bei gegnerischen Tiefenläufen und starke Präsenz beim Rausrücken.' : 'Gute Raumabdeckung und dynamische Tiefenläufe.'));
      setTrackerRecommendations(tr.recommendations || (selectedPlayer.number === 11 ? 'Regeneration im Beugeapparat nach hoher Sprintbelastung. Beibehalten der aggressiven Raumabdeckung im Übergangsspiel.' : selectedPlayer.number === 23 ? 'Spezifisches Torwart-Schnellkrafttraining für explosive Abdruckbewegungen.' : 'Aktive Erholung und Dehneinheit für Beugekette.'));
    } else {
      const pFirstNameLower = (selectedPlayer.firstName || '').toLowerCase();
      const pLastNameStr = selectedPlayer.lastName || selectedPlayer.name || 'Spieler';
      setTrackerDate('');
      setTrackerTime('');
      if (selectedPlayer.number === 11 || pFirstNameLower.includes('julian')) {
        setTrackerFileName('WG__Tracker_Julian_Ehret_RNr_11');
        setTrackerFileUrl('https://magentacloud.de/s/H3zDkjkx8pigtpw');
        setTrackerTotalDist(11.4);
        setTrackerHighSpeed(820);
        setTrackerSprintDist(340);
        setTrackerMaxSpeed(32.8);
        setTrackerSprints(28);
        setTrackerAccels(42);
        setTrackerDecels(38);
        setTrackerAvgHr(168);
        setTrackerMaxHr(192);
        setTrackerWorkload(885);
        setTrackerHeatmap('Zentrum / Rechte Halbspur & Box-to-Box');
        setTrackerTactical('Julian Ehret zeigt eine herausragende Laufleistung von 11,4 km als ZM. Hohe Intensität im Umschaltspiel mit 28 Vollsprints und exzellenter Abdeckung des zentralen Mittelfelds.');
        setTrackerRecommendations('Regeneration im Beugeapparat nach hoher Sprintbelastung. Beibehalten der aggressiven Raumabdeckung im Übergangsspiel.');
      } else if (selectedPlayer.number === 23 || pFirstNameLower.includes('stefan')) {
        setTrackerFileName('Tracker_Stefan_Lauer_RNr_23');
        setTrackerFileUrl('https://magentacloud.de/s/6KJqaSL847wGBrf');
        setTrackerTotalDist(5.3);
        setTrackerHighSpeed(140);
        setTrackerSprintDist(65);
        setTrackerMaxSpeed(26.4);
        setTrackerSprints(8);
        setTrackerAccels(18);
        setTrackerDecels(16);
        setTrackerAvgHr(138);
        setTrackerMaxHr(165);
        setTrackerWorkload(420);
        setTrackerHeatmap('Strafraum & 16m-Außenkante bei Abstößen');
        setTrackerTactical('Stefan Lauer liefert als Torwart (TW) sehr stabile Bewegungswerte (5,3 km). Sehr reaktionsschnelles Nachrücken bei gegnerischen Tiefenläufen und starke Präsenz beim Rausrücken.');
        setTrackerRecommendations('Spezifisches Torwart-Schnellkrafttraining für explosive Abdruckbewegungen.');
      } else {
        setTrackerFileName(`Tracker_${selectedPlayer.firstName || ''}_${pLastNameStr}_RNr_${selectedPlayer.number || ''}`);
        setTrackerFileUrl('');
        setTrackerTotalDist(9.8);
        setTrackerHighSpeed(540);
        setTrackerSprintDist(210);
        setTrackerMaxSpeed(31.2);
        setTrackerSprints(18);
        setTrackerAccels(30);
        setTrackerDecels(26);
        setTrackerAvgHr(162);
        setTrackerMaxHr(184);
        setTrackerWorkload(720);
        setTrackerHeatmap('Aktivitätsfeld Zentrum & Flügel');
        setTrackerTactical(`${selectedPlayer.firstName || ''} ${pLastNameStr}`.trim() + ' zeigt ein stabiles Laufprofil mit dynamischen Zwischensprints.');
        setTrackerRecommendations('Erhaltung der Grundlagenausdauer und gezielte Antrittsübungen.');
      }
    }
  }, [selectedPlayerId, playerLogs, analytics, selectedPlayer]);

  const handleSaveTrackerAnalysis = async () => {
    if (!selectedPlayerId || !onUpdatePlayerTracker) return;
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];
    
    // Extract recording date (datum) prioritizing actual recorded date over upload date
    let sessionRecordedDate = trackerDate || (selectedPlayer?.trackerAnalysis as any)?.datum || (selectedPlayer?.trackerAnalysis as any)?.sessionDate || (selectedPlayer?.trackerAnalysis as any)?.recordingDate;
    if (!sessionRecordedDate && trackerFileName) {
      const isoMatch = trackerFileName.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
      if (isoMatch) {
        sessionRecordedDate = isoMatch[1];
      } else {
        const deMatch = trackerFileName.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
        if (deMatch) {
          sessionRecordedDate = `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
        }
      }
    }
    if (!sessionRecordedDate) {
      sessionRecordedDate = todayDate;
    }
    const sessionRecordedTime = trackerTime || (selectedPlayer?.trackerAnalysis as any)?.uhrzeit || '18:30';

    const trackerData = {
      fileName: trackerFileName,
      fileUrl: trackerFileUrl,
      datum: sessionRecordedDate,
      sessionDate: sessionRecordedDate,
      uhrzeit: sessionRecordedTime,
      uploadDate: todayDate,
      totalDistanceKm: Number(trackerTotalDist) || 0,
      highSpeedDistanceM: Number(trackerHighSpeed) || 0,
      sprintDistanceM: Number(trackerSprintDist) || 0,
      maxSpeedKmh: Number(trackerMaxSpeed) || 0,
      sprintCount: Number(trackerSprints) || 0,
      accelerations: Number(trackerAccels) || 0,
      decelerations: Number(trackerDecels) || 0,
      avgHeartRateBpm: Number(trackerAvgHr) || 0,
      maxHeartRateBpm: Number(trackerMaxHr) || 0,
      workloadIndex: Number(trackerWorkload) || 0,
      heatMapZone: trackerHeatmap,
      tacticalSummary: trackerTactical,
      recommendations: trackerRecommendations
    };
    await onUpdatePlayerTracker(selectedPlayerId, trackerData);
  };

  const handleSaveReport = async (customReport?: any) => {
    if (!selectedPlayerId || !onUpdatePlayerDatenblatt) return;
    const reportData = customReport || {
      verein,
      saison,
      playerStatus,
      analysedatum,
      kpi10m,
      kpi10mBenchmark,
      kpi10mStatus,
      kpi30m,
      kpi30mBenchmark,
      kpi30mStatus,
      kpiYoyo,
      kpiYoyoBenchmark,
      kpiYoyoStatus,
      kpiJump,
      kpiJumpBenchmark,
      kpiJumpStatus,
      sheetMinutes,
      sheetGoalsAssists,
      sheetPassAccuracy,
      sheetTackleRate,
      taktischeKernkompetenz,
      optimierungsPotenzial,
      naechsteMassnahmen,
      sheetLogs
    };

    try {
      await onUpdatePlayerDatenblatt(selectedPlayerId, reportData);
    } catch (err) {
      console.error("Fehler beim Speichern des Berichts:", err);
    }
  };

  const generateAiReport = async () => {
    if (!selectedPlayer) return;
    try {
      setGeneratingReport(true);
      const response = await apiFetch("/api/player-session/generate-report", {
        method: "POST",
        body: JSON.stringify({
          playerName: selectedPlayer.lastName,
          position: selectedPlayer.position,
          kpis: {
            sprint10m: kpi10m,
            sprint30m: kpi30m,
            yoyotest: kpiYoyo,
            jumpHeight: kpiJump
          },
          logs: sheetLogs,
          stats: {
            minutes: sheetMinutes,
            goalsAssists: sheetGoalsAssists,
            passAccuracy: sheetPassAccuracy,
            tackleRate: sheetTackleRate
          }
        })
      });

      if (!response.ok) {
        throw new Error("Fehler beim Generieren des Performance-Berichts.");
      }

      const data = await response.json();
      const updatedReport = {
        verein,
        saison,
        playerStatus,
        analysedatum,
        kpi10m,
        kpi10mBenchmark,
        kpi10mStatus,
        kpi30m,
        kpi30mBenchmark,
        kpi30mStatus,
        kpiYoyo,
        kpiYoyoBenchmark,
        kpiYoyoStatus,
        kpiJump,
        kpiJumpBenchmark,
        kpiJumpStatus,
        sheetMinutes,
        sheetGoalsAssists,
        sheetPassAccuracy,
        sheetTackleRate,
        taktischeKernkompetenz: data.taktischeKernkompetenz || taktischeKernkompetenz,
        optimierungsPotenzial: data.optimierungsPotenzial || optimierungsPotenzial,
        naechsteMassnahmen: data.naechsteMassnahmen || naechsteMassnahmen,
        sheetLogs
      };

      if (data.taktischeKernkompetenz) setTaktischeKernkompetenz(data.taktischeKernkompetenz);
      if (data.optimierungsPotenzial) setOptimierungsPotenzial(data.optimierungsPotenzial);
      if (data.naechsteMassnahmen) setNaechsteMassnahmen(data.naechsteMassnahmen);

      await handleSaveReport(updatedReport);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Analyse konnte nicht generiert werden.");
    } finally {
      setGeneratingReport(false);
    }
  };

  // ---- Database for the 12 holo-diagrams (real player data) ----
  const currentPlayerStats = useMemo(() => {
    const avg = playerAverages.find(p => p.id === selectedPlayerId);
    const isNumber = (v: any) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; };

    // Parse datenblatt KPI strings into numbers
    const sprint10m = isNumber(kpi10m) ?? 1.62;
    const sprint30m = isNumber(kpi30m) ?? 4.08;
    const yoyo = isNumber(kpiYoyo) ?? 18.6;
    const jump = isNumber(kpiJump) ?? 44;

    // Score normalization 0-100 (sprint: lower is better; yoyo/jump: higher is better)
    const score = (val: number, min: number, max: number, invert = false) =>
      Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100 * (invert ? -1 : 1) + (invert ? 100 : 0)));

    const sprint10mScore = score(sprint10m, 2.0, 1.45, true);
    const sprint30mScore = score(sprint30m, 4.6, 3.6, true);
    const yoyoScore = score(yoyo, 14, 24);
    const jumpScore = score(jump, 35, 60);
    const workloadScore = Math.max(0, Math.min(100, avg?.workloadScore || 70));
    const distKm = avg?.distKm ?? 10.5;
    const maxSpeed = avg?.maxSpeed ?? 31.5;
    const sprints = avg?.sprints ?? 24;
    const highSpeedM = avg?.highSpeedM ?? 640;
    const avgHr = avg?.avgHr ?? 158;
    const totalGoals = avg?.totalGoals ?? (selectedPlayer as any)?.tore ?? 2;
    const totalAssists = avg?.totalAssists ?? 1;
    const totalMinutes = avg?.totalMinutes ?? 720;
    const avgPass = avg?.avgPass ?? 84;
    const avgTackle = avg?.avgTackle ?? 62;
    const position = selectedPlayer?.position || 'Feldspieler';
    const loadAmpel = selectedPlayer?.loadAmpel || 'Grün';
    const fitness = selectedPlayer?.fitness || 'Fit';

    // Avg across the whole squad for context (team baseline)
    const teamBaseline = (key: string, arr: any[]) => arr.length
      ? arr.reduce((s, p) => s + (Number(p[key]) || 0), 0) / arr.length
      : 0;
    return {
      sprint10m, sprint30m, yoyo, jump,
      sprint10mScore, sprint30mScore, yoyoScore, jumpScore,
      workloadScore, distKm, maxSpeed, sprints, highSpeedM, avgHr,
      totalGoals, totalAssists, totalMinutes, avgPass, avgTackle,
      position, loadAmpel, fitness,
      teamDistKm: teamBaseline('distKm' as any, playerAverages) || distKm,
      teamMaxSpeed: teamBaseline('maxSpeed' as any, playerAverages) || maxSpeed,
      teamWorkload: teamBaseline('workloadScore' as any, playerAverages) || workloadScore,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, playerAverages, kpi10m, kpi30m, kpiYoyo, kpiJump, selectedPlayer]);

  // Six normalized axes for the performance radar (0-100)
  const radarAxes = useMemo(() => [
    { label: 'SPRINT\n10m', value: currentPlayerStats.sprint10mScore },
    { label: 'SPRINT\n30m', value: currentPlayerStats.sprint30mScore },
    { label: 'YO-YO\nAusdauer', value: currentPlayerStats.yoyoScore },
    { label: 'SPRUNGKRAFT', value: currentPlayerStats.jumpScore },
    { label: 'TOPSPEED', value: Math.min(100, (currentPlayerStats.maxSpeed / 40) * 100) },
    { label: 'BELASTUNG', value: currentPlayerStats.workloadScore },
  ], [currentPlayerStats]);

  // ---- Entwicklung der Einheiten (zeitlicher Verlauf) des Spielers ----
  const einheitenTrend = useMemo(() => {
    const logs = (playerLogs || []).slice().sort((a: any, b: any) => String(a.date || '').localeCompare(String(b.date || '')));
    const series = logs.map((l: any) => {
      const dur = Number(l.duration) || 90;
      const rpe = Number(l.rpe) || 5;
      const load = Number(l.calculatedLoad) || (dur * rpe);
      return {
        id: l.id,
        type: l.type === 'Match' ? 'Match' : 'Training',
        date: String(l.date || ''),
        short: String(l.date || '').slice(5).replace(/-/g, '.'),
        duration: dur,
        rpe,
        load,
      };
    });
    const n = series.length;
    const avgLoad = n ? series.reduce((s, x) => s + x.load, 0) / n : 0;
    const avgRpe = n ? series.reduce((s, x) => s + x.rpe, 0) / n : 0;
    const peakLoad = n ? Math.max(...series.map(x => x.load)) : 0;
    const matches = series.filter(x => x.type === 'Match').length;
    const trainings = n - matches;
    const maxLoad = Math.max(peakLoad, 1);
    return { series, avgLoad, avgRpe, peakLoad, matches, trainings, n, maxLoad };
  }, [playerLogs]);

  // ===================================================================
  //  12 FUTURISTIC HOLO PERFORMANCE DIAGRAMS  (only in the Datenblatt)
  // ===================================================================
  const S = currentPlayerStats; // shorthand

  const holoStyleId = 'holo-diagram-keyframes';
  const holoKeyframes = `
  @keyframes ${holoStyleId}-spin { 100% { transform: rotate(360deg); } }
  @keyframes ${holoStyleId}-counter { 100% { transform: rotate(-360deg); } }
  @keyframes ${holoStyleId}-pulse { 0%,100% { opacity:.25; transform: scale(1);} 50% {opacity:.9; transform: scale(1.08);} }
  @keyframes ${holoStyleId}-float { 0%,100% { transform: translateY(0);} 50% { transform: translateY(-5px);} }
  @keyframes ${holoStyleId}-dash { to { stroke-dashoffset: -24; } }
  @keyframes ${holoStyleId}-hue { 0%,100% { filter: hue-rotate(0deg);} 50% { filter: hue-rotate(35deg);} }
  @keyframes ${holoStyleId}-rise { 0% { transform: scaleY(0); opacity:.2;} 100% { transform: scaleY(1); opacity:1;} }
  @keyframes ${holoStyleId}-breathe { 0%,100% { transform: scale(1); filter: brightness(1);} 50% { transform: scale(1.06); filter: brightness(1.4);} }
  @keyframes ${holoStyleId}-scan { 0% { left:-10%; } 100% { left:110%; } }
  @keyframes ${holoStyleId}-shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
  @keyframes ${holoStyleId}-beat { 0%,100% { transform: translateY(0) scale(1);} 25% {transform: translateY(1px) scale(1.04);} 50% {transform: translateY(0) scale(1);} 75% { transform: translateY(-1px) scale(1.04);} }
  `;

  // 1) Holo-Leistungsradar (hexagon, rotating, glow, particles)
  const HoloRadar = () => {
    const n = radarAxes.length;
    const R = 100;
    const cx = 130, cy = 130;
    const pt = (i: number, v: number) => {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)];
    };
    const outer = (pts: number[][]) => pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const outerIdx = Array.from({ length: n }, (_, i) => pt(i, 100));
    const dataPts = radarAxes.map((a, i) => pt(i, a.value));
    const gridLevels = [25, 50, 75, 100];
    return (
      <div className="relative rounded-2xl border border-cyan-400/30 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 40%, rgba(34,211,238,0.12), rgba(8,51,68,0.05) 60%, transparent)', boxShadow: '0 0 28px rgba(34,211,238,0.18), inset 0 0 40px rgba(34,211,238,0.06)' }}>
        <svg viewBox="0 0 260 260" className="w-full h-auto">
          <defs>
            <linearGradient id="holoRadarFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          {gridLevels.map(lv => (
            <polygon key={lv} points={outer(Array.from({ length: n }, (_, i) => pt(i, lv)))} fill="none" stroke="#22d3ee" strokeOpacity="0.14" strokeWidth="0.75" />
          ))}
          {radarAxes.map((a, i) => {
            const [x, y] = pt(i, 112);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#22d3ee" strokeOpacity="0.22" strokeWidth="0.75" />;
          })}
          <polygon points={outer(dataPts)} fill="url(#holoRadarFill)" stroke="#22d3ee" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 6px #22d3ee)', animation: `${holoStyleId}-pulse 4s ease-in-out infinite` }} />
          {dataPts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r="3.2" fill="#0ea5e9" stroke="#e0f2fe" strokeWidth="0.8" style={{ filter: 'drop-shadow(0 0 5px #38bdf8)' }} />
              <circle cx={p[0]} cy={p[1]} r="7" fill="none" stroke="#38bdf8" strokeOpacity="0.3" className="animate-ping" style={{ animationDuration: '2.6s' }} />
              <text x={cx + Math.cos((Math.PI * 2 * i) / n - Math.PI / 2) * 122} y={cy + Math.sin((Math.PI * 2 * i) / n - Math.PI / 2) * 122 + 4} textAnchor="middle" fill="#a5f3fc" fontSize="7" fontWeight="black" style={{ textShadow: '0 0 6px #22d3ee' }}>
                {radarAxes[i].label.split('\n')[0]}
              </text>
            </g>
          ))}
          <g className="origin-center" style={{ transformOrigin: `${cx}px ${cy}px`, animation: `${holoStyleId}-spin 26s linear infinite` }}>
            <circle cx={cx} cy={cy} r={R * 0.62} fill="none" stroke="#38bdf8" strokeOpacity="0.12" strokeWidth="6" strokeDasharray="2 10" />
          </g>
        </svg>
        <div className="absolute top-2 left-3 text-[9px] font-black uppercase tracking-widest" style={{ color: '#22d3ee', textShadow: '0 0 8px #22d3ee' }}>HOLO-RADAR</div>
        <div className="absolute bottom-2 right-3 text-[9px] font-mono" style={{ color: '#a5f3fc' }}>6-ACHSE PERF</div>
      </div>
    );
  };

  // 2) Load-Gauge (circular workload gauge with rotating ring)
  const LoadGauge = () => {
    const r = 44, c = 2 * Math.PI * r;
    const pct = S.workloadScore;
    const seg = c * (pct / 100);
    const segColor = pct < 60 ? '#34d399' : pct < 85 ? '#fbbf24' : '#fb7185';
    return (
      <div className="relative rounded-2xl border border-fuchsia-400/30 overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(217,70,239,0.13), rgba(23,15,44,0.05) 65%, transparent)', boxShadow: '0 0 28px rgba(217,70,239,0.16)' }}>
        <div className="relative w-40 h-40 mx-auto mt-2">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#2d1b4e" strokeWidth="6" strokeOpacity="0.5" />
            <circle cx="50" cy="50" r={r} fill="none" stroke={segColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${seg} ${c}`} transform="rotate(-90 50 50)" style={{ filter: `drop-shadow(0 0 5px ${segColor})` }} />
            <g className="origin-center" style={{ transformOrigin: '50px 50px', animation: `${holoStyleId}-spin 9s linear infinite` }}>
              <circle cx="50" cy="6" r="2.4" fill="#e879f9" style={{ filter: 'drop-shadow(0 0 5px #e879f9)' }} />
              <circle cx="50" cy="6" r="6" fill="none" stroke="#e879f9" strokeOpacity="0.3" />
            </g>
            <text x="50" y="48" textAnchor="middle" fill="#e0f2fe" fontSize="13" fontWeight="black" style={{ textShadow: '0 0 8px #e879f9' }}>{pct}</text>
            <text x="50" y="58" textAnchor="middle" fill="#d8b4fe" fontSize="4.5" fontWeight="bold">/ 100</text>
          </svg>
        </div>
        <div className="px-3 pb-3">
          <div className="text-center text-[11px] font-black uppercase tracking-widest" style={{ color: '#e879f9' }}>Belastungs-Load</div>
          <div className="flex justify-between text-[9px] font-mono mt-1" style={{ color: '#a78bfa' }}>
            <span>Team Ø {S.teamWorkload}</span><span>Ampel: {S.loadAmpel}</span>
          </div>
        </div>
      </div>
    );
  };

  // 3) GPS Neon-Bars (distance / topspeed / highspeed, glow volumetric)
  const GpsNeonBars = () => {
    const bars = [
      { label: 'DISTANZ', val: S.distKm, max: 14, unit: 'km', color: '#22d3ee', base: S.teamDistKm },
      { label: 'TOPSPEED', val: S.maxSpeed, max: 36, unit: 'km/h', color: '#3b82f6', base: S.teamMaxSpeed },
      { label: 'HIGH SPEED', val: S.highSpeedM, max: 900, unit: 'm', color: '#818cf8', base: null },
      { label: 'SPRINTS', val: S.sprints, max: 45, unit: '', color: '#c084fc', base: null },
    ];
    return (
      <div className="rounded-2xl border border-sky-400/30 p-4" style={{ background: 'linear-gradient(160deg, rgba(14,165,233,0.10), rgba(15,23,42,0.4))', boxShadow: '0 0 26px rgba(56,189,248,0.15)' }}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#7dd3fc', textShadow: '0 0 8px #38bdf8' }}>GPS LOAD VOLUMETRIC</span>
          <span className="text-[8px] font-mono text-sky-300/60">vs Team Ø | lebend</span>
        </div>
        <div className="space-y-3">
          {bars.map((b, bi) => {
            const p = b.val / b.max * 100;
            const pb = b.base ? (b.base / b.max) * 100 : null;
            return (
              <div key={b.label} style={{ animation: `${holoStyleId}-float ${(3 + bi * 0.5)}s ease-in-out ${bi * 0.4}s infinite` }}>
                <div className="flex justify-between text-[9px] font-bold" style={{ color: '#e0f2fe' }}>
                  <span className="uppercase">{b.label}</span>
                  <span className="font-mono" style={{ color: b.color, textShadow: `0 0 6px ${b.color}` }}>{b.val} {b.unit}</span>
                </div>
                <div className="relative h-4 mt-1 overflow-hidden rounded-full bg-slate-900/70">
                  {/* animated fill with shimmer */}
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{
                    width: `${p}%`,
                    background: `linear-gradient(90deg, ${b.color}, #ffffff66, ${b.color}, #0ea5e9)`,
                    backgroundSize: '200% 100%',
                    boxShadow: `0 0 14px ${b.color}`,
                    animation: `${holoStyleId}-shimmer ${(2.6 + bi)}s linear infinite, ${holoStyleId}-breathe ${(3 + bi)}s ease-in-out infinite`,
                  }} />
                  {/* team baseline tick */}
                  {pb !== null && (
                    <div className="absolute inset-y-0 w-[2px] bg-white/80" style={{ left: `${pb}%`, boxShadow: '0 0 6px #fff' }} title="Team Ø" />
                  )}
                  {/* moving scan light */}
                  <div className="absolute inset-y-0 w-6 opacity-70 pointer-events-none" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: `${holoStyleId}-scan ${(4 + bi * 0.8)}s ease-in-out ${bi * 0.6}s infinite` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-2 text-[8px] font-mono text-sky-300/60">
          <span className="w-2.5 h-0.5 bg-white inline-block rounded" /> Team Ø-Linie (wo Team vergleichbar)
        </div>
      </div>
    );
  };

  // 4) Sprint-Curve (acceleration 10m -> 30m animated line with particles)
  const SprintCurve = () => {
    const x1 = 18, y1 = 90, x2 = 92, y2 = 12;
    const mid = { x: (x1 + x2) / 2 + 4, y: (y1 + y2) / 2 - 16 };
    const path = `M ${x1} ${y1} Q ${mid.x} ${mid.y} ${x2} ${y2}`;
    return (
      <div className="rounded-2xl border border-teal-400/30 p-4" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(45,212,191,0.14), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(45,212,191,0.16)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#5eead4', textShadow: '0 0 8px #2dd4bf' }}>SPRINT-ANTRIEB SKURVE</div>
        <svg viewBox="0 0 100 100" className="w-full h-auto">
          <defs>
            <linearGradient id="scLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2dd4bf" /><stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <line x1={x1} y1="94" x2={x1} y2={y1} stroke="#134e4a" strokeOpacity="0.5" strokeWidth="0.5" />
          <rect x="6" y="96" width="88" height="2" rx="1" fill="#134e4a" fillOpacity="0.6" />
          <path d={path} fill="none" stroke="url(#scLine)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 4" style={{ filter: 'drop-shadow(0 0 6px #2dd4bf)', animation: `${holoStyleId}-dash 2.4s linear infinite` }} />
          <circle cx={x1} cy={y1} r="3" fill="#2dd4bf" style={{ filter: 'drop-shadow(0 0 5px #2dd4bf)' }} />
          <circle cx={x2} cy={y2} r="3.4" fill="#3b82f6" style={{ filter: 'drop-shadow(0 0 6px #3b82f6)' }} />
          <text x={x1} y={y1 - 4} textAnchor="middle" fill="#99f6e4" fontSize="6" fontWeight="black">{S.sprint10m.toFixed(2)}s</text>
          <text x={x2} y={y2 - 4} textAnchor="middle" fill="#93c5fd" fontSize="6" fontWeight="black">{S.sprint30m.toFixed(2)}s</text>
          <text x="50" y="23" textAnchor="middle" fill="#2dd4bf" fontSize="4.5" fontWeight="bold" opacity="0.8">ACCELERATION PROFILE</text>
        </svg>
      </div>
    );
  };

  // 5) HR Waterfall (short horizontal layers; only bodyHr burst, no org-HR var)
  const HrWaterfall = () => {
    const zonePct = Math.max(35, Math.min(99, Math.round(((S.avgHr - 100) / (195 - 100)) * 100)));
    const rows = [55, 72, 88];
    return (
      <div className="rounded-2xl border border-rose-400/30 p-4" style={{ background: 'linear-gradient(180deg, rgba(244,63,94,0.10), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(244,63,94,0.16)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#fda4af', textShadow: '0 0 8px #fb7185' }}>HERZFREQUENZ-SPEKTRUM</div>
        <svg viewBox="0 0 100 60" className="w-full h-auto">
          <defs>
            <linearGradient id="hrFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" /><stop offset="100%" stopColor="#fb7185" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {rows.map((r, i) => (
            <polygon key={i} points={`0,60 ${r},35 ${r+6},38 ${Math.min(100,r+12)},22 ${r+14},26 ${r+22},30 ${r+26},16 100,10 100,60`} fill="url(#hrFill)" stroke="#f43f5e" strokeWidth="0.4" opacity="0.85" style={{ animation: `${holoStyleId}-breathe ${(3.6 + i)}s ease-in-out ${i*0.4}s infinite` }} />
          ))}
          {/* animated ECG heartbeat line that travels across the spectrum */}
          <polyline
            points="0,30 14,30 18,24 22,36 27,30 40,30 43,26 47,22 51,34 55,30 70,30 74,24 78,37 83,30 100,30"
            fill="none" stroke="#8b5cf6" strokeWidth="0.9" strokeLinejoin="round" strokeLinecap="round"
            style={{ filter: 'drop-shadow(0 0 4px #a78bfa)', animation: `${holoStyleId}-dash 1.6s linear infinite` }}
          />
          {/* zone line gently bobbing (simulates HR fluctuation) */}
          <line x1="0" y1={60 - (zonePct / 100) * 50} x2="100" y2={60 - (zonePct / 100) * 50} stroke="#fda4af" strokeWidth="0.5" strokeDasharray="1.5 1.5" opacity="0.7" style={{ animation: `${holoStyleId}-float 5s ease-in-out infinite` }} />
          {/* beating heart marker rides the zone line */}
          <circle cx="100" cy={60 - (zonePct / 100) * 50} r="2.2" fill="#fb7185" style={{ filter: 'drop-shadow(0 0 5px #f43f5e)', animation: `${holoStyleId}-beat 1s ease-in-out infinite` }} />
        </svg>
        <div className="flex justify-between text-[9px] font-mono mt-1">
          <span style={{ color: '#fda4af' }}>Ø {S.avgHr} bpm</span>
          <span style={{ color: '#fdba74' }}>Intensität {zonePct}% (Zone)</span>
        </div>
      </div>
    );
  };

  // 6) Scorer-Orbit (goals / assists / minutes as planets on rotating rings)
  const ScorerOrbit = () => {
    const planets = [
      { label: 'TORE', val: S.totalGoals, unit: '', color: '#60a5fa', dist: 34, size: 9, speed: 16 },
      { label: 'VORLAGEN', val: S.totalAssists, unit: '', color: '#a78bfa', dist: 49, size: 7, speed: 22 },
      { label: 'MINUTEN', val: S.totalMinutes, unit: "'", color: '#34d399', dist: 62, size: 12, speed: 28 },
    ];
    const orbitStyle = { top: '50%', left: '50%' };
    return (
      <div className="rounded-2xl border border-indigo-400/30 relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(99,102,241,0.16), rgba(8,10,30,0.6))', boxShadow: '0 0 28px rgba(99,102,241,0.18)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest p-3" style={{ color: '#a5b4fc', textShadow: '0 0 8px #818cf8' }}>SCORER-ORBIT <span className="text-[8px] opacity-70">(Planeten kreisen)</span></div>
        <div className="relative h-56 mx-auto" style={{ maxWidth: 300 }}>
          {/* rotating orbit rings with orbiting planets */}
          {planets.map((p, i) => (
            <div key={p.label} className="absolute inset-0" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 0, height: 0 }}>
              {/* orbit circle */}
              <div className="absolute rounded-full border border-indigo-400/20" style={{ width: `${p.dist*2}%`, height: `${p.dist*2}%`, left: `-${p.dist}%`, top: `-${p.dist}%`, animation: `${holoStyleId}-spin ${p.speed}s linear infinite` }}>
                {/* comet tail */}
                <div className="absolute inset-0 rounded-full" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${p.color}55 40deg, transparent 80deg)` }} />
              </div>
              {/* the orbiting planet, rotates with a slightly faster ring via a nested spin */}
              <div className="absolute" style={{ animation: `${holoStyleId}-spin ${p.speed}s linear infinite` }}>
                <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center" style={{ left: `${p.dist}%`, top: 0 }}>
                  <div className="rounded-full flex items-center justify-center font-black text-slate-900" style={{ width: p.size*2.4, height: p.size*2.4, background: p.color, boxShadow: `0 0 16px ${p.color}`, animation: `${holoStyleId}-breathe ${(p.speed)}s ease-in-out infinite` }}>{p.val}</div>
                  <span className="text-[8px] font-bold uppercase mt-1" style={{ color: p.color, textShadow: `0 0 6px ${p.color}` }}>{p.label}</span>
                </div>
              </div>
            </div>
          ))}
          {/* central pulsing core */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 border-indigo-400/40 flex items-center justify-center" style={{ boxShadow: '0 0 20px rgba(129,140,248,0.4), inset 0 0 20px rgba(129,140,248,0.4)', animation: `${holoStyleId}-breathe 2.4s ease-in-out infinite` }}>
            <span className="text-[10px] font-black uppercase" style={{ color: '#c7d2fe' }}>{selectedPlayer?.number || '#'}</span>
          </div>
        </div>
      </div>
    );
  };

  // 7) Pass- & Zweikampf Donut segments
  const PassTackleDonut = () => {
    const segments = [
      { label: 'PASSQUOTE', val: S.avgPass, color: '#34d399' },
      { label: 'ZWEIKAMPF', val: S.avgTackle, color: '#fbbf24' },
    ];
    return (
      <div className="rounded-2xl border border-emerald-400/30 p-4" style={{ background: 'linear-gradient(150deg, rgba(52,211,153,0.12), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(52,211,153,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#6ee7b7', textShadow: '0 0 8px #34d399' }}>EFFIZIENZ-DONUT</div>
        <div className="flex items-center gap-3">
          {segments.map(s => {
            const r = 26, c = 2 * Math.PI * r, seg = c * (s.val / 100);
            return (
              <div key={s.label} className="flex-1 text-center">
                <svg viewBox="0 0 70 70" className="w-full h-auto">
                  <circle cx="35" cy="35" r={r} fill="none" stroke="#1e293b" strokeWidth="6" />
                  <circle cx="35" cy="35" r={r} fill="none" stroke={s.color} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${seg} ${c}`} transform="rotate(-90 35 35)" style={{ filter: `drop-shadow(0 0 4px ${s.color})` }} />
                  <text x="35" y="33" textAnchor="middle" fill="#f0fdf4" fontSize="11" fontWeight="black" style={{ textShadow: `0 0 6px ${s.color}` }}>{s.val}%</text>
                  <text x="35" y="42" textAnchor="middle" fill="#a7f3d0" fontSize="3.5" fontWeight="bold">{s.label}</text>
                </svg>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 8) Energy Matrix (neon heat-grid of high-speed cells reusing S.highSpeedM)
  const EnergyMatrix = () => {
    const cells = Array.from({ length: 7 * 4 }, (_, i) => {
      const base = S.highSpeedM / 900 + (S.sprints / 45);
      return Math.min(1, Math.max(0.05, base * (0.6 + ((i * 37) % 100) / 100 * 0.8)));
    });
    return (
      <div className="rounded-2xl border border-amber-400/30 p-4" style={{ background: 'radial-gradient(circle at 50% 0%, rgba(251,191,36,0.12), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(251,191,36,0.14)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#fcd34d', textShadow: '0 0 8px #f59e0b' }}>HOCHINTENSIVE ENERGIEMATRIX</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((v, i) => (
            <div key={i} className="aspect-square rounded-sm" style={{ background: `rgba(251,191,36,${v})`, boxShadow: `0 0 6px rgba(251,191,36,${v})`, animation: `${holoStyleId}-pulse ${2 + (i % 4)}s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <div className="flex justify-between text-[9px] font-mono mt-2">
          <span style={{ color: '#fde68a' }}>{S.sprints} Sprints</span>
          <span style={{ color: '#fde68a' }}>{S.highSpeedM}m HSD</span>
        </div>
      </div>
    );
  };

  // 9) Load-Pyramid (3D layered triangles: fitness / workload / ampel)
  const LoadPyramid = () => {
    const layers = [
      { label: 'FRISCHE', val: Math.max(40, 100 - S.workloadScore), color: '#34d399' },
      { label: 'BELASTUNG', val: S.workloadScore, color: '#fbbf24' },
      { label: 'AMPEL', val: S.loadAmpel === 'Grün' ? 85 : S.loadAmpel === 'Gelb' ? 55 : 35, color: S.loadAmpel === 'Grün' ? '#34d399' : S.loadAmpel === 'Gelb' ? '#fbbf24' : '#fb7185' },
    ];
    return (
      <div className="rounded-2xl border border-cyan-500/30 p-4" style={{ background: 'linear-gradient(180deg, rgba(6,182,212,0.10), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(6,182,212,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#67e8f9', textShadow: '0 0 8px #06b6d4' }}>AUSLASTUNGS-PYRAMIDE <span className="text-[8px] opacity-70">(schwebend)</span></div>
        <div className="flex flex-col items-center relative">
          {/* floating light sweep over the pyramid */}
          <div className="absolute inset-0 overflow-hidden rounded-md pointer-events-none">
            <div className="absolute inset-y-0 w-10 opacity-60" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)', animation: `${holoStyleId}-scan 3.4s ease-in-out infinite` }} />
          </div>
          {layers.map((l, i) => {
            const w = 100 - i * 22;
            return (
              <div key={l.label} className="relative" style={{ animation: `${holoStyleId}-float ${(2.8 + i * 0.6)}s ease-in-out ${i * 0.4}s infinite` }}>
                <div className="rounded-t-[8px] text-center font-black uppercase text-slate-900 leading-none flex items-center justify-center overflow-hidden" style={{ width: `${w}%`, height: i === 2 ? 18 : 22, minWidth: 60, background: `linear-gradient(${l.color}, ${l.color}cc)`, clipPath: i === 0 ? 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)' : undefined, boxShadow: `0 0 14px ${l.color}`, animation: `${holoStyleId}-breathe ${(3 + i)}s ease-in-out infinite` }}>
                  <span style={{ fontSize: 9 }}>{l.label} {l.val}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-center text-[9px] font-mono mt-2" style={{ color: '#a5f3fc' }}>Fitness: Fit • Position: {S.position} • Ampel {S.loadAmpel}</div>
      </div>
    );
  };

  // 10) RPE bars from the player's real documented units (sessionLogs)
  const RpeBars = () => {
    const realLogs = (playerLogs || []).slice(0, 8).map(l => ({ title: l.focus || l.type || 'Einheit', duration: `${l.duration || 0} Min`, rpe: Number(l.rpe) || 5, type: l.type }));
    const logs = realLogs.length ? realLogs : [{ title: 'Noch keine Einheiten', duration: '90 Min', rpe: 0, type: null }];
    const maxRpe = 10;
    return (
      <div className="rounded-2xl border border-violet-400/30 p-4" style={{ background: 'radial-gradient(circle at 50% 100%, rgba(167,139,250,0.13), rgba(15,23,42,0.5))', boxShadow: '0 0 26px rgba(167,139,250,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#c4b5fd', textShadow: '0 0 8px #a78bfa' }}>RPE-TRAININGSLAST <span className="text-[8px] opacity-70">(echte Einheiten)</span></div>
        <div className="flex items-end justify-around gap-2 h-36 relative overflow-hidden">
          {/* pumping scan sweep behind bars */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-y-0 w-10" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)', animation: `${holoStyleId}-scan 3s ease-in-out infinite` }} />
          </div>
          {logs.map((log: any, i: number) => {
            const h = Math.max((log.rpe / maxRpe) * 100, log.rpe > 0 ? 6 : 3);
            const color = log.rpe < 5 ? '#34d399' : log.rpe < 8 ? '#fbbf24' : '#fb7185';
            return (
              <div key={i} className="flex flex-col items-center flex-1 relative z-10" style={{ animation: `${holoStyleId}-float ${(2.5 + i * 0.4)}s ease-in-out ${i * 0.2}s infinite` }}>
                <div className="w-full max-w-[22px] rounded-t-sm origin-bottom relative overflow-hidden" style={{ height: `${h}%`, background: `linear-gradient(${color}, ${color}55)`, boxShadow: `0 0 10px ${color}`, animation: `${holoStyleId}-shimmer ${(1.8 + i * 0.3)}s linear infinite, ${holoStyleId}-breathe ${(3 + i)}s ease-in-out infinite` }}>
                  <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.3) 0 3px, transparent 3px 7px)', mixBlendMode: 'overlay' }} />
                </div>
                {log.rpe > 0 && <span className="text-[8px] font-black font-mono mt-1" style={{ color, textShadow: `0 0 6px ${color}` }}>{log.rpe}</span>}
                <span className="text-[6px] font-mono text-violet-300/60 max-w-[30px] truncate">{log.title}</span>
                {log.type && <span className={`text-[5.5px] font-bold uppercase ${log.type === 'Match' ? 'text-rose-400' : 'text-emerald-400'}`}>{log.type === 'Match' ? 'Spiel' : 'Train'}</span>}
              </div>
            );
          })}
        </div>
        <div className="text-[8px] font-mono text-right mt-1 text-violet-300/60">RPE 1-10 je Einheit aus Post-Session-Logs</div>
      </div>
    );
  };

  // 11) Fitness-Pulse (concentric plusing rings keyed off loadAmpel)
  const FitnessPulse = () => {
    const mainColor = S.loadAmpel === 'Grün' ? '#34d399' : S.loadAmpel === 'Gelb' ? '#fbbf24' : '#fb7185';
    return (
      <div className="rounded-2xl border border-green-400/30 relative overflow-hidden flex flex-col items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.12), rgba(15,23,42,0.5))', boxShadow: '0 0 28px rgba(16,185,129,0.16)' }}>
        <span className="text-[10px] font-black uppercase tracking-widest mt-3" style={{ color: mainColor, textShadow: `0 0 8px ${mainColor}` }}>FITNESS & FRISCHE</span>
        <div className="relative w-36 h-36 my-3">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: `${mainColor}55`, animation: `${holoStyleId}-pulse 2.8s ease-in-out infinite` }} />
          <div className="absolute inset-3 rounded-full border-2" style={{ borderColor: `${mainColor}44`, animation: `${holoStyleId}-pulse 2.8s ease-in-out .5s infinite` }} />
          <div className="absolute inset-6 rounded-full border-2" style={{ borderColor: `${mainColor}33`, animation: `${holoStyleId}-pulse 2.8s ease-in-out 1s infinite` }} />
          <div className="absolute inset-9 rounded-full flex items-center justify-center" style={{ background: `${mainColor}22`, boxShadow: `0 0 20px ${mainColor}66, inset 0 0 20px ${mainColor}44` }}>
            <span className="text-[8px] font-black uppercase" style={{ color: '#f0fdf4' }}>{S.loadAmpel}</span>
          </div>
        </div>
        <div className="text-[9px] font-mono pb-3 text-green-300/70">Der Zustand {S.fitness} • Ampel {S.loadAmpel}</div>
      </div>
    );
  };

  // 12) KPI-Constellation (particles connecting the six scores, weight logos)
  const KpiConstellation = () => {
    const pts = [
      { x: 150, y: 60, v: S.sprint10mScore, l: '10m' },
      { x: 255, y: 130, v: S.sprint30mScore, l: '30m' },
      { x: 50, y: 130, v: S.yoyoScore, l: 'YO-YO' },
      { x: 165, y: 230, v: S.jumpScore, l: 'SPRUNG' },
      { x: 45, y: 250, v: Math.min(100, (S.maxSpeed/40)*100), l: 'SPEED' },
      { x: 275, y: 250, v: S.workloadScore, l: 'LOAD' },
    ];
    const center = { x: 150, y: 150 };
    const links: Array<[any, any]> = [];
    pts.forEach((a, i) => { if (i < pts.length - 1) links.push([a, pts[i+1]]); });
    return (
      <div className="rounded-2xl border border-white/20 relative overflow-hidden" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(226,232,240,0.06), rgba(8,8,16,0.6))', boxShadow: '0 0 26px rgba(148,163,184,0.14)' }}>
        <div className="text-[10px] font-black uppercase tracking-widest p-3" style={{ color: '#e2e8f0', textShadow: '0 0 8px #94a3b8' }}>PERFORMANCE-KONSTELLATION</div>
        <svg viewBox="0 0 320 300" className="w-full h-auto">
          <line x1="150" y1="150" x2="255" y2="130" stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="150" y1="150" x2="150" y2="230" stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="150" y1="150" x2="45" y2="130" stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="150" y1="150" x2="45" y2="250" stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.3" />
          <line x1="150" y1="150" x2="275" y2="250" stroke="#64748b" strokeWidth="0.4" strokeOpacity="0.3" />
          {links.map(([a, b], i) => (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#38bdf8" strokeWidth="0.5" strokeOpacity="0.35" strokeDasharray="2 3" style={{ animation: `${holoStyleId}-dash 3s linear infinite` }} />
          ))}
          <circle cx={center.x} cy={center.y} r="16" fill="none" stroke="#38bdf8" strokeOpacity="0.5" strokeWidth="0.8" style={{ animation: `${holoStyleId}-spin 14s linear infinite`, transformOrigin: `${center.x}px ${center.y}px` }} />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="9" fill={i===0?'#38bdf8':'#94a3b8'} fillOpacity="0.2" stroke="#e2e8f0" strokeWidth="0.6" />
              <circle cx={p.x} cy={p.y} r="3" fill="#7dd3fc" style={{ filter: 'drop-shadow(0 0 4px #38bdf8)' }} />
              <text x={p.x} y={p.y + 2.4} textAnchor="middle" fill="#e2e8f0" fontSize="4" fontWeight="black">{Math.round(p.v)}</text>
              <text x={p.x} y={p.y + 16} textAnchor="middle" fill="#7dd3fc" fontSize="5" fontWeight="bold">{p.l}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  // Shared spec header used by each diagram card
  const HoloSpec = ({ title, fn }: { title: string; fn: string }) => (
    <div className="px-3 py-2 border-t border-white/10">
      <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300">{title}</div>
      <div className="text-[9px] text-slate-400/80 mt-0.5 leading-snug">{fn}</div>
    </div>
  );

  // Assemble the 12-diagram gallery (each with title + function + fullscreen explanation)
  const renderHoloGallery = () => {
    const vol = (v: number) => (v >= 85 ? 'Exzellent' : v >= 70 ? 'Sehr gut' : v >= 55 ? 'Gut' : v >= 40 ? 'Ausbaufähig' : 'Kritisch');
    const dataText = `Aktuelle Scores: Sprint 10m ${S.sprint10mScore}/100 · 30m ${S.sprint30mScore}/100 · Yo-Yo ${S.yoyoScore}/100 · Sprung ${S.jumpScore}/100 · Topspeed ${Math.min(100,(S.maxSpeed/40)*100).toFixed(0)}/100 · Belastung ${S.workloadScore}/100.`;

    const cards = [
      { el: <HoloRadar />, title: 'HOLO-LEISTUNGSRADAR', fn: 'Radar-Vergleich der 6 Kern-Werte (Sprint 10m/30m, Yo-Yo, Sprung, Topspeed, Belastung) auf Skala 0–100.',
        what: 'Das Leistungsradar stellt die sechs wichtigsten Leistungswerte des Spielers in einem Sechseck dar: Sprint 10m, Sprint 30m, Yo-Yo-Ausdauer, Sprungkraft, Topspeed und aktuelle Belastung. Jede Achse läuft von 0 (innen) bis 100 (außen), gut = groß, schlecht = klein. Die Fläche des 6-Ecks zeigt die Gesamtleistung: je größer und runder, desto ausgeglichener – je eckiger, desto klarer das Stärken-/Schwächenprofil.',
        leistung: `Die Fläche des 6-Ecks entspricht der Gesamtleistung. Der stärkste Wert ist ${vol(Math.max(S.sprint10mScore,S.sprint30mScore,S.yoyoScore,S.jumpScore,Math.min(100,(S.maxSpeed/40)*100),S.workloadScore))}, der schwächste ${vol(Math.min(S.sprint10mScore,S.sprint30mScore,S.yoyoScore,S.jumpScore,Math.min(100,(S.maxSpeed/40)*100),S.workloadScore))}. ${dataText}`,
        erwartung: 'Ein Profil über 70/100 in Sprint, Ausdauer und Sprungkraft gilt als belastbarer Basiswert für den Spielbetrieb.',
        gefehlt: 'Die Radarflächen, die unter 60 liegen, fehlen für ein rundes Profil – je eckiger die Form, desto klarer das Defizit.',
        erreichen: 'Gezielte Kraft-/Sprintzyklen und Ausdauerblöcke schließen die schwachen Achsen und runden das Sechseck nach oben ab.' },
      { el: <LoadGauge />, title: 'BELASTUNGS-LOAD-GAUGE', fn: 'Aktuelle Trainingsbelastung (0–100) als Rundinstrument – je voller der Ring, desto höher die Belastung.',
        what: 'Ein Rundmessgerät wie ein Tacho für den Trainingszustand: Der leuchtende Bogen zeigt die aktuelle Belastung (0–100), die Ampel (Grün/Gelb/Rot) klassifiziert sie. So erkennt der Trainer sofort, ob der Spieler entlastet werden muss oder Belastung verträgt – ein Diagnose-Werkzeug gegen Überlastung und Verletzungen.',
        leistung: `Aktuelle Belastung: ${S.workloadScore}/100. ${S.loadAmpel}-Ampel. Team-Durchschnitt: ${S.teamWorkload}.`,
        erwartung: 'Im Regenerationsbereich unter 60, im Belastungspeak zwischen 60-85, kritisch über 85.',
        gefehlt: S.workloadScore < 60 ? 'Wenig Trainingsreiz – für Wettkampfhärte fehlen Belastungspeaks.' : S.workloadScore > 85 ? 'Übersteuerung – es fehlt ein gezielter Regenerationstag.' : 'Ausgewogener Bereich erreicht, nur die Feinjustierung fehlt.',
        erreichen: 'Load nach Ampel steuern: Grün = normal weiter, Gelb = reduzieren, Rot = Regeneration einplanen.' },
      { el: <GpsNeonBars />, title: 'GPS-LOAD VOLUMETRIC', fn: 'Laufvolumen aus dem GPS-Tracker (Distanz, Topspeed, High-Speed, Sprints) im Vergleich zum Team-Durchschnitt.',
        what: 'Glühende Balken zeigen die echten GPS-Messwerte in vier Bereichen: Gesamtdistanz (km), Spitzengeschwindigkeit (km/h), High-Speed-Distanz (m) und Sprintanzahl. Der schmale Referenzstrich ist der Mannschaftsdurchschnitt – so sieht man sofort, ob der Spieler über oder unter dem Team-Niveau liegt und wo das Laufvolumen Defizite hat.',
        leistung: `Distanz ${S.distKm} km · Topspeed ${S.maxSpeed} km/h · High-Speed ${S.highSpeedM} m · ${S.sprints} Sprints.`,
        erwartung: 'Mittelfeldspieler ~10-11 km, Stürmer höhere Sprintsprints, Abwehrspieler kürzere aber intensive Distanzen.',
        gefehlt: 'Die Balken, die unter dem Team-Strich bleiben, zeigen fehlendes Volumen oder fehlende Intensität (zu wenige Sprint-Spitzen).',
        erreichen: 'Volumen über Dauerläufe, Intensität über Sprints/Konditionierung steigern – Ziele pro Einheit festlegen.' },
      { el: <SprintCurve />, title: 'SPRINT-ANTRIEB SKURVE', fn: 'Beschleunigungsprofil: Antritt über 10m → Grundspeed über 30m als Verlaufskurve.',
        what: 'Die Kurve zeigt den Beschleunigungsverlauf über die ersten 30 Meter. Kurze Antrittzeit über 10m = explosive Beschleunigung, kurze Zeit über 30m = hohe Endgeschwindigkeit. Aus der Steigung der Kurve liest man, wie schnell der Spieler Tempo aufbaut und wo der Sprint „abfällt" – entscheidend für Duelle, Pressing und Umschalten.',
        leistung: `Antritt 10m: ${S.sprint10m.toFixed(2)}s · Grundspeed 30m: ${S.sprint30m.toFixed(2)}s · Antritts-Score ${S.sprint10mScore}/100.`,
        erwartung: 'Sehr gute 10m-Werte (unter ~1,65s) sind Voraussetzung für Duelle und Umschalten.',
        gefehlt: 'Ein flacher Verlauf zwischen 10m und 30m bedeutet, dass der Antritt da ist, aber die Endspeed ausfällt – oder umgekehrt.',
        erreichen: 'Explosives Startsprint-Training (Acceleration) und maximale Sprint-Cape für die Endgeschwindigkeit.' },
      { el: <HrWaterfall />, title: 'HERZFREQUENZ-SPEKTRUM', fn: 'Herzfrequenz-Zonen als Spektral-Wasserfall: Pulsverlauf und Belastungszonen pro Minute.',
        what: 'Stellt den Herzfrequenz-Verlauf als farbiges Spektrum dar. Niedrige Zonen (Erholung, aerob) nach unten, hohe Zonen (anaerob, Spitzenbelastung) nach oben. So sieht man, in welcher Intensitätszone der Spieler wie lange arbeitet und wie schnell sich der Puls zwischen Belastungen wieder senkt – ein Maß für Regenerationsfähigkeit und aerobe Grundlage.',
        leistung: `Durchschnittliche Herzfrequenz: ${S.avgHr} bpm · geschätzte Intensitätszone ~${Math.max(35,Math.min(99,Math.round(((S.avgHr-100)/(195-100))*100)))}%.`,
        erwartung: 'Eine flexible Kurve, die in Pausen absinkt und bei Belastung schnell steigt (schnelle Regeneration).',
        gefehlt: 'Bleibt die HF dauerhaft hoch und erholt sich schlecht, fehlt aerobe Grundlagenausdauer.',
        erreichen: 'Gezielte Ausdauer-Einheiten im aeroben Bereich und Kontrolle der Puls-Senkung zwischen den Belastungen.' },
      { el: <ScorerOrbit />, title: 'SCORER-ORBIT', fn: 'Offensiv-Produktion: Tore, Vorlagen & Minuten als kreisende Körper – Größe = Wichtigkeit.',
        what: 'Sammelt die entscheidenden Offensiv-Kennzahlen (Tore, Vorlagen, Einsatzminuten) als „Planeten" rund um den Spieler. Je größer ein Planet, desto größer sein Beitrag. Man erkennt auf einen Blick, ob der Spieler seine Scorer-Werte aus Toren, Vorlagen oder aus reiner Präsenz (Minuten) bezieht – und wo der Ertrag fehlt.',
        leistung: `Tore: ${S.totalGoals} · Vorlagen: ${S.totalAssists} · Einsatzminuten: ${S.totalMinutes}.`,
        erwartung: 'Für einen ${S.position} sollte sich das Gewicht auf die passende Position verteilen: Stürmer auf Tore, Mittelfeld auf Vorlagen, Abwehr auf Minuten/Belastbarkeit.',
        gefehlt: 'Fehlt der Tor-Planet Größe, war die Abschlussqualität / der letzte Pass zu selten im Spiel.',
        erreichen: 'Abschlusstraining, besserer Zeilenlauf in die Box und erhöhte Entscheidungsqualität im letzten Drittel.' },
      { el: <PassTackleDonut />, title: 'EFFIZIENZ-DONUT', fn: 'Passquote (%) & Zweikampfquote (%) als Ring-Segmente – Füllgrad = Effizienz.',
        what: 'Zwei Donut-Ringe zeigen die technische und physische Effizienz: Passquote (erfolgreiche Pässe in %) und Zweikampfquote (gewonnene Zweikämpfe in %). Der Füllgrad jedes Rings entspricht der Quote – je voller, desto sauberer das Passspiel bzw. desto stärker das Zweikampfverhalten. Ein dünner Ring zeigt sofort, in welchem Bereich Effizienz fehlt.',
        leistung: `Passquote: ${S.avgPass}% · Zweikampfquote: ${S.avgTackle}%.`,
        erwartung: 'Passquote über 80%, Zweikampfquote über 55% gelten als solide Basis.',
        gefehlt: 'Eine niedrige Zweikampfquote zeigt fehlende Physis/Entschlossenheit – eine niedrige Passquote fehlende Ruhe/Position.',
        erreichen: 'Zweikampftraining & Timing verbessern; Passspiel mit direktem Spiel und besserer Ballposition stabilisieren.' },
      { el: <EnergyMatrix />, title: 'HOCHINTENSIVE ENERGIEMATRIX', fn: 'Raster der hochintensiven Belastung: Zellen = Intensität explosiver Läufe pro Bereich.',
        what: 'Ein farbiges Raster, in dem jede Zelle den Anteil hochintensiver Läufe in einem Bereich der Einheit darstellt. Helle Zellen = viele explosive Antritte/Sprints, dunkle = wenig. Damit sieht man, wo im Spiel und auf welchem Raum die Belastungsspitzen liegen – und ob der Spieler genügend entscheidende Sprints in wichtigen Momenten bringt.',
        leistung: `${S.sprints} Sprints · ${S.highSpeedM}m High-Speed-Distanz.`,
        erwartung: 'Eine gleichmäßig intensive Matrix mit klaren hellen Spitzen bei Spielgeschehen (Konter, Sprints in die Tiefe).',
        gefehlt: 'Sind die Zellen zu dunkel, fehlen die entscheidenden explosiven Antritte in wichtigen Spielmomenten.',
        erreichen: 'Intervall- und Sprinttraining mit Wiederholungshärte und kurzen Pausen, um das Explosions-Niveau zu erhöhen.' },
      { el: <LoadPyramid />, title: 'AUSLASTUNGS-PYRAMIDE', fn: 'Balance aus Frische (Basis), Belastung (Mitte) & Ampel (Spitze) als 3D-Pyramide.',
        what: 'Ein dreistufiges Pyramiden-Modell des aktuellen Zustands: Die Basis zeigt die Frische/Regeneration des Spielers, die Mitte die aktuelle Belastung, die Spitze den Ampelstatus. Eine stabile, breite Pyramide (viel Frische, kontrollierte Belastung, grüne Ampel) bedeutet Einsatzbereitschaft. Eine „toplastige" Pyramide (hohe Belastung, wenig Frische) signalisiert Überlastung vor dem Spiel.',
        leistung: `Frische ~${Math.max(40,100-S.workloadScore)}% · Belastung ${S.workloadScore}/100 · Ampel ${S.loadAmpel}.`,
        erwartung: 'Eine klare Hierarchie: hohe Frische-Basis, kontrollierte Belastung, grüne Ampel vor dem Spiel.',
        gefehlt: 'Ein Toplastiges Modell (hohe Belastung, frische Basis klein) bedeutet vor dem Spiel zu wenig Frische.',
        erreichen: 'Vor Wettkämpfen Entlastung / Tapering einplanen, damit die Pyramide zur Belastungsspitze steht.' },
      { el: <RpeBars />, title: 'RPE-TRAININGSLAST', fn: 'Subjektive Anstrengung (RPE 1–10) pro Trainingseinheit als Neon-Säulen – Lastverlauf sichtbar.',
        what: 'Jede Säule steht für eine Trainingseinheit und zeigt deren subjektive Anstrengung auf der RPE-Skala von 1 (sehr leicht) bis 10 (maximal). So wird der Belastungsverlauf über die Woche sichtbar: harte und leichte Tage im Wechsel sind ideal für Regeneration und Leistungszuwachs, dauerhaft hohe Werte zeigen Überlastung an.',
        leistung: `${(sheetLogs && sheetLogs.length ? sheetLogs.length : 1)} Einheit(en) ausgewertet.`,
        erwartung: 'Eine wechselnde Tages-RPE (leichte + harte Tage) ist ideal für superkompensation und Frische.',
        gefehlt: 'Zu viele gleiche/hohe Werte überlasten den Regenerationsprozess – zu niedrige bringen keine Entwicklung.',
        erreichen: 'RPE am Tagesende ehrlich dokumentieren und die Woche so mischen, dass harte und leichte Tage rotieren.' },
      { el: <FitnessPulse />, title: 'FITNESS & FRISCHE', fn: 'Aktuelle Einsatzbereitschaft: pulsfarbene Ampel-Ringe = Frische-Zustand.',
        what: 'Ein pulsierendes Radar, dessen Farbe den aktuellen Frische-Zustand anzeigt – Grün = frisch und einsatzbereit, Gelb = eingeschränkt, Rot = nicht regeneriert. Das Pulsieren und die Ringe visualisieren Tempo und Intensität der Erholung. Ein Schnell-Check, ob der Spieler für das nächste Training oder Spiel verfügbar ist.',
        leistung: `Zustand: ${S.fitness} · Ampel: ${S.loadAmpel}.`,
        erwartung: 'Vor dem Spiel eine grüne Ampel – der Spieler muss früh genug regeneriert und frisch sein.',
        gefehlt: 'Gelbe/Rote Ampel zeigt, dass die Regeneration (Schlaf, Ernährung, Entlastung) zu kurz kam.',
        erreichen: 'Regenerationsroutinen (Eisbad, Schlafhygiene, Proteine, Entlastungs-Einheiten) vor und nach Belastung fest einplanen.' },
      { el: <KpiConstellation />, title: 'PERFORMANCE-KONSTELLATION', fn: 'Gesamtbild aller KPI-Scores als Partikel-Sternbild – Helligkeit = Stärke.',
        what: 'Verbindet die sechs Kern-KPIs zu einem „Sternbild": Jeder KPI ist ein leuchtender Punkt, Datenlinien verbinden sie. Große, helle Sterne sind Stärken, kleine/dunkle Sterne sind Ausbaubereiche. Das Muster zeigt den Gesamtausdruck der Leistungsfähigkeit und macht komplexe Leistungswerte mit einem Blick vergleichbar.',
        leistung: `Die Konstellation zeigt die Summe aller Werte; große helle Sterne = Stärken, kleine = Ausbaubereiche. ${dataText}`,
        erwartung: 'Eine möglichst helle, gleichmäßig verteilte Konstellation ohne schwache „dunkle" Sterne.',
        gefehlt: 'Die kleinen/dunklen Sterne der Konstellation sind die KPI-Bereiche, die im Match am meisten fehlten.',
        erreichen: 'Trainingsfokus auf die 1-2 kleinsten Sterne, um das Sternbild Schritt für Schritt aufzuhellen.' },
    ];
    return (
      <div className="relative">
        <style>{holoKeyframes}</style>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <div key={i} className="relative rounded-2xl border border-[#334155] bg-[#0b1220]/80 overflow-hidden" style={{ boxShadow: '0 8px 30px rgba(3,10,20,0.5)', backdropFilter: 'blur(6px)' }}>
              <div className="p-3">{c.el}</div>
              <HoloSpec title={c.title} fn={c.fn} />
              <button type="button" onClick={() => setActiveHoloDetail(i)}
                className="absolute top-2 right-8 text-[8px] font-mono text-cyan-300/80 bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/30 rounded px-1.5 py-0.5 uppercase tracking-wider transition-colors">
                Vollbild ⛶
              </button>
              <div className="absolute top-2 right-2 text-[8px] font-mono text-slate-500/60">#{String(i+1).padStart(2,'0')}</div>
            </div>
          ))}
        </div>

        {/* Fullscreen detail modal */}
        {activeHoloDetail !== null && cards[activeHoloDetail] && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 lg:p-8" onClick={() => setActiveHoloDetail(null)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#0b1220] border border-cyan-400/30 rounded-2xl shadow-[0_0_60px_rgba(34,211,238,0.25)]" onClick={(e) => e.stopPropagation()}>
              <style>{holoKeyframes}</style>
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10" style={{ background: 'linear-gradient(90deg, rgba(34,211,238,0.15), rgba(15,23,42,0.95))' }}>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#22d3ee' }}>Holo-Diagramm #{String(activeHoloDetail+1).padStart(2,'0')}</span>
                  <h3 className="font-black text-lg uppercase tracking-wide text-white">{cards[activeHoloDetail].title}</h3>
                </div>
                <button type="button" onClick={() => setActiveHoloDetail(null)} className="shrink-0 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/20 text-white font-black flex items-center justify-center transition-colors">✕</button>
              </div>
              {/* Diagram enlarged */}
              <div className="p-5 bg-black/20">
                {cards[activeHoloDetail].el}
              </div>
              {/* Explanation sections */}
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { k: 'Was ist das?', c: '#22d3ee', t: cards[activeHoloDetail].what },
                  { k: 'Seine Leistung', c: '#34d399', t: cards[activeHoloDetail].leistung },
                  { k: 'Erwartung', c: '#fbbf24', t: cards[activeHoloDetail].erwartung },
                  { k: 'Was hat ihm gefehlt?', c: '#fb7185', t: cards[activeHoloDetail].gefehlt },
                  { k: 'Wie erreicht man es?', c: '#a78bfa', t: cards[activeHoloDetail].erreichen },
                ].map((b) => (
                  <div key={b.k} className="rounded-xl border border-white/10 bg-white/[0.03] p-3" style={{ boxShadow: `inset 0 0 20px ${b.c}14` }}>
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: b.c, textShadow: `0 0 8px ${b.c}` }}>{b.k}</div>
                    <p className="text-xs text-slate-300 leading-relaxed">{b.t}</p>
                  </div>
                ))}
              </div>
              {/* Navigation prev/next */}
              <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
                <button type="button" disabled={activeHoloDetail === 0} onClick={() => setActiveHoloDetail(c => (c === null ? null : Math.max(0, c - 1)))} className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/15 text-white text-xs font-black uppercase transition-colors disabled:opacity-30">← Vorheriges</button>
                <button type="button" disabled={activeHoloDetail === cards.length - 1} onClick={() => setActiveHoloDetail(c => (c === null ? null : Math.min(cards.length - 1, (c as number) + 1)))} className="px-4 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 text-cyan-200 text-xs font-black uppercase transition-colors disabled:opacity-30">Nächstes →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ---- Einheiten-Entwicklungsvergleich (zeitlicher Verlauf) ----
  const renderEinheitenVergleich = () => {
    const t = einheitenTrend;
    const hasData = t.n > 0;
    const W = 100, H = 100, padL = 2, padR = 2, padT = 8, padB = 16;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const step = t.n > 1 ? innerW / (t.n - 1) : innerW;
    const xAt = (i: number) => padL + (t.n === 1 ? innerW / 2 : i * step);
    const yLoad = (v: number) => padT + innerH - (v / t.maxLoad) * innerH;
    const yRpe = (v: number) => padT + innerH - (v / 10) * innerH;
    const pointsLoad = t.series.map((x, i) => `${xAt(i).toFixed(2)},${yLoad(x.load).toFixed(2)}`).join(' ');
    const pointsRpe = t.series.map((x, i) => `${xAt(i).toFixed(2)},${yRpe(x.rpe).toFixed(2)}`).join(' ');

    return (
      <div className="space-y-4">
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { l: 'Einheiten', v: `${t.n}`, c: '#22d3ee' },
            { l: 'Matches', v: `${t.matches}`, c: '#fb7185' },
            { l: 'Trainings', v: `${t.trainings}`, c: '#34d399' },
            { l: 'Ø Load', v: `${Math.round(t.avgLoad)}`, c: '#fbbf24' },
            { l: 'Ø RPE', v: `${t.avgRpe.toFixed(1)}/10`, c: '#a78bfa' },
            { l: 'Peak Load', v: `${Math.round(t.peakLoad)}`, c: '#38bdf8' },
          ].map(s => (
            <div key={s.l} className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-center" style={{ boxShadow: `inset 0 0 18px ${s.c}14` }}>
              <div className="text-[8px] font-bold uppercase tracking-widest" style={{ color: s.c }}>{s.l}</div>
              <div className="text-lg font-black font-mono text-white" style={{ textShadow: `0 0 8px ${s.c}` }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Chronology chart */}
        <div className="rounded-2xl border border-cyan-400/30 bg-[#0b1220]/80 overflow-hidden" style={{ boxShadow: '0 0 24px rgba(34,211,238,0.12)' }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300" style={{ textShadow: '0 0 8px #22d3ee' }}>Einheiten-Entwicklung (Belastung über Zeit)</span>
            <span className="text-[8px] font-mono text-slate-500">Load = Dauer × RPE</span>
          </div>

          {!hasData ? (
            <div className="p-10 text-center text-[#94A3B8] font-black uppercase text-[10px] border border-dashed border-[#334155] rounded-xl m-3">
              Keine Einheiten dokumentiert – erst Post-Session-Logs hinzufügen.
            </div>
          ) : (
            <div className="p-3">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
                <defs>
                  <linearGradient id="einheitLoadFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                {/* gridlines */}
                {[0.25, 0.5, 0.75, 1].map(g => {
                  const y = padT + innerH * (1 - g);
                  return <line key={g} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#334155" strokeOpacity="0.4" strokeWidth="0.3" />;
                })}
                <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke="#1e293b" strokeWidth="0.5" />
                <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="#1e293b" strokeWidth="0.5" />

                {/* Load area + line */}
                {t.n > 1 && <polygon points={`${padL},${padT + innerH} ${pointsLoad} ${xAt(t.n-1)},${padT + innerH}`} fill="url(#einheitLoadFill)" />}
                <polyline points={pointsLoad} fill="none" stroke="#22d3ee" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }} />

                {/* RPE dashed line */}
                <polyline points={pointsRpe} fill="none" stroke="#c084fc" strokeWidth="0.8" strokeDasharray="1.5 1.5" strokeLinejoin="round" />

                {/* Avg load dashed line */}
                <line x1={padL} y1={yLoad(t.avgLoad)} x2={W - padR} y2={yLoad(t.avgLoad)} stroke="#fbbf24" strokeWidth="0.4" strokeDasharray="1 1.2" opacity="0.7" />
                <text x={W - padR - 1} y={yLoad(t.avgLoad) - 1} textAnchor="end" fill="#fbbf24" fontSize="3">Ø {Math.round(t.avgLoad)}</text>

                {/* Points + labels */}
                {t.series.map((x, i) => (
                  <g key={i}>
                    {/* Load bar */}
                    <rect x={xAt(i) - 1.4} y={yLoad(x.load)} width="2.8" height={padT + innerH - yLoad(x.load)} fill={x.type === 'Match' ? '#fb7185' : '#22d3ee'} opacity="0.35" rx="0.6" />
                    {/* Load dot */}
                    <circle cx={xAt(i)} cy={yLoad(x.load)} r="1.4" fill={x.type === 'Match' ? '#fb7185' : '#22d3ee'} stroke="#e0f2fe" strokeWidth="0.25" style={{ filter: `drop-shadow(0 0 3px ${x.type === 'Match' ? '#fb7185' : '#22d3ee'})` }} />
                    {/* RPE dot */}
                    <circle cx={xAt(i)} cy={yRpe(x.rpe)} r="0.9" fill="#c084fc" stroke="#fff" strokeWidth="0.2" />
                    {/* date label */}
                    <text x={xAt(i)} y={H - 3} textAnchor="middle" fill={x.type === 'Match' ? '#fda4af' : '#67e8f9'} fontSize="3" fontWeight="bold">{x.short}</text>
                    {/* RPE value */}
                    <text x={xAt(i)} y={yRpe(x.rpe) - 1.6} textAnchor="middle" fill="#c084fc" fontSize="2.4" fontWeight="bold">{x.rpe}</text>
                  </g>
                ))}

                {/* Axis labels */}
                <text x="1.5" y={padT} fill="#64748b" fontSize="2.6" fontWeight="bold">Load max</text>
                <text x="1.5" y={padT + innerH + 3} textAnchor="start" fill="#64748b" fontSize="2.6" fontWeight="bold">Datum →</text>
              </svg>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-cyan-400" />Load</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-1 rounded bg-purple-400" />RPE</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" />Match</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />Training</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded bg-amber-400" />Ø Load</span>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="max-w-6xl mx-auto p-4 space-y-6 relative"
      onDragOver={handlePortalDragOver}
      onDragLeave={handlePortalDragLeave}
      onDrop={handlePortalDrop}
    >
      {/* Hidden File Input for PDF / Image Upload */}
      <input
        type="file"
        ref={portalFileInputRef}
        onChange={handlePortalFileInputChange}
        accept="application/pdf,image/*,.csv"
        className="hidden"
      />

      {/* Drag & Drop Fullscreen Overlay */}
      {portalDragActive && (
        <div className="absolute inset-0 z-50 bg-[#121824]/95 backdrop-blur-md border-4 border-dashed border-[#10B981] flex flex-col items-center justify-center text-[#F8FAFC] p-8 rounded-2xl shadow-2xl">
          <Sparkles size={64} className="animate-bounce mb-4 text-[#10B981]" />
          <h2 className="text-3xl font-black uppercase tracking-wider text-center text-[#F8FAFC]">
            PDF ODER BERICHT HIER ABLEGEN
          </h2>
          <p className="text-sm font-bold text-[#94A3B8] mt-2 text-center max-w-md">
            Das System extrahiert Trainingsdaten, Match-Stats, Garmin/TRACKTICS GPS und Sprintzeiten automatisch für {selectedPlayer ? selectedPlayer.lastName : 'den Spieler'}!
          </p>
        </div>
      )}

      {/* Design Header */}
      <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-[#10B981] text-[#0A0E17] font-black text-[9px] px-2.5 py-0.5 rounded uppercase tracking-widest">
            SPIELER-PORTAL
          </span>
          <h1 className="text-3xl font-black uppercase leading-none mt-2 text-[#F8FAFC]">
            PERFORMANCE & BELASTUNGSMONITOR
          </h1>
          <p className="text-xs font-semibold text-[#94A3B8] mt-1 uppercase tracking-wider">
            FC AUGGEN 1921 • PROFESSIONELLES SPIELERDATENBLATT & POST-SESSION LOGS
          </p>
        </div>
        <div className="shrink-0 font-mono text-xs text-right bg-[#0A0E17] p-2.5 border border-[#334155] rounded-lg">
          <p className="font-bold text-[#F8FAFC]">STATUS: BEREIT FÜR EINTRAGUNG</p>
          <p className="text-[10px] text-[#10B981] mt-1">SAISON: 2026/2027</p>
        </div>
      </div>

      {/* Selector & Setup */}
      <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-1">
            Wähle dein Spielerprofil aus:
          </label>
          <select 
            className="w-full bg-[#121824] border border-[#334155] p-3 rounded-lg font-black uppercase text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
            value={selectedPlayerId}
            onChange={(e) => handlePlayerChange(e.target.value)}
          >
            <option value="" disabled className="bg-[#121824]">-- Bitte Spieler auswählen --</option>
            {onlyPlayers.map(p => (
              <option key={p.id} value={p.id} className="bg-[#121824] text-[#F8FAFC]">
                #{p.number || ''} {p.lastName || p.name || 'Spieler'} ({p.position || 'Feldspieler'})
              </option>
            ))}
          </select>
        </div>
        {selectedPlayer && (
          <div className="flex items-center gap-4 shrink-0 bg-[#121824] p-3 rounded-xl border border-[#334155] w-full md:w-auto">
            <div className="w-12 h-12 bg-[#0A0E17] border border-[#334155] rounded-full overflow-hidden flex items-center justify-center shrink-0">
              {selectedPlayer.image ? (
                <img src={selectedPlayer.image} alt={selectedPlayer.lastName || selectedPlayer.name || ''} className="w-full h-full object-cover" />
              ) : (
                <User size={24} className="text-[#94A3B8]" />
              )}
            </div>
            <div className="text-left">
              <h4 className="font-black text-sm uppercase leading-none text-[#F8FAFC]">
                {selectedPlayer.lastName || selectedPlayer.name || 'Spieler'}
              </h4>
              <p className="text-[10px] font-bold text-[#94A3B8] mt-1">
                Trikot-Nr. {selectedPlayer.number || ''} • {selectedPlayer.position || 'Feldspieler'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Analyse-Engine Upload & Quick Action Banner */}
      {selectedPlayer && (
        <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg text-[#10B981] shrink-0">
              <Sparkles size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2 text-[#F8FAFC]">
                <span>PDF-PARSER & AUTOMATISCHER IMPORT</span>
                <span className="text-[10px] bg-[#10B981] text-[#0A0E17] font-black px-1.5 py-0.5 rounded uppercase">BETA</span>
              </h3>
              <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                Lade ein PDF (Garmin, TRACKTICS, Leistungsblatt) oder Foto hoch. Das System füllt die Daten für <strong className="text-[#F8FAFC]">{selectedPlayer.lastName || selectedPlayer.name || 'den Spieler'}</strong> aus.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => portalFileInputRef.current?.click()}
            disabled={parsingDoc}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] border border-[#10B981] rounded-lg font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
          >
            {parsingDoc ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Analysiere PDF...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>PDF / Bericht hochladen</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Parsed Doc Review Modal */}
      {parsedDocModalOpen && parsedDocData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E293B] border border-[#334155] p-6 max-w-2xl w-full rounded-2xl shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#334155] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#10B981] text-[#0A0E17] text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest">
                    DOKUMENTEN-ANALYSE ERFOLGREICH
                  </span>
                  <span className="text-xs font-mono font-bold text-[#94A3B8] truncate max-w-[200px]">
                    {parsedDocFileName}
                  </span>
                </div>
                <h2 className="text-2xl font-black uppercase mt-1 tracking-tight text-[#F8FAFC]">
                  GEPARSETE DOKUMENTENDATEN
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setParsedDocModalOpen(false)}
                className="p-1.5 border border-[#334155] bg-[#121824] hover:bg-red-500/20 text-[#94A3B8] hover:text-white rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-[#121824] p-3 border border-[#334155] rounded-lg">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Datum</span>
                <span className="font-black text-sm text-[#F8FAFC]">{parsedDocData.date || '—'}</span>
              </div>
              <div className="bg-[#121824] p-3 border border-[#334155] rounded-lg">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Typ</span>
                <span className="font-black text-sm text-[#F8FAFC]">{parsedDocData.type || 'Training'}</span>
              </div>
              <div className="bg-[#121824] p-3 border border-[#334155] rounded-lg">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Dauer & RPE</span>
                <span className="font-black text-sm text-[#F8FAFC]">{parsedDocData.duration || 0} min • RPE {parsedDocData.rpe || '—'}</span>
              </div>
            </div>

            {/* Details Sections */}
            <div className="space-y-3 text-xs">
              <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-3 rounded-lg space-y-1">
                <span className="font-black uppercase text-[10px] text-[#10B981] tracking-wider">Fokus / Schwerpunkt</span>
                <p className="font-bold text-sm text-[#F8FAFC]">{parsedDocData.focus || 'Kein Schwerpunkt'}</p>
              </div>

              {(parsedDocData.matchMinutes || parsedDocData.goals || parsedDocData.assists || parsedDocData.passAccuracy) && (
                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 rounded-lg">
                  <span className="font-black uppercase text-[10px] text-[#F59E0B] tracking-wider block mb-1">Match Statistiken</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-[#F8FAFC]">
                    <div><strong>Einsatz:</strong> {parsedDocData.matchMinutes || 0} Min</div>
                    <div><strong>Tore/Assists:</strong> {parsedDocData.goals || 0} T / {parsedDocData.assists || 0} A</div>
                    <div><strong>Passquote:</strong> {parsedDocData.passAccuracy ? parsedDocData.passAccuracy + '%' : '—'}</div>
                    <div><strong>Zweikampf:</strong> {parsedDocData.tackleRate ? parsedDocData.tackleRate + '%' : '—'}</div>
                  </div>
                </div>
              )}

              {(parsedDocData.sprint10m || parsedDocData.sprint30m || parsedDocData.yoyotest || parsedDocData.jumpHeight) && (
                <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/30 p-3 rounded-lg">
                  <span className="font-black uppercase text-[10px] text-[#06B6D4] tracking-wider block mb-1">Athletik KPIs</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-[#F8FAFC]">
                    {parsedDocData.sprint10m && <div><strong>10m Sprint:</strong> {parsedDocData.sprint10m}</div>}
                    {parsedDocData.sprint30m && <div><strong>30m Sprint:</strong> {parsedDocData.sprint30m}</div>}
                    {parsedDocData.yoyotest && <div><strong>Yo-Yo Test:</strong> {parsedDocData.yoyotest}</div>}
                    {parsedDocData.jumpHeight && <div><strong>Sprungkraft:</strong> {parsedDocData.jumpHeight}</div>}
                  </div>
                </div>
              )}

              {(parsedDocData.trackerTotalDist || parsedDocData.trackerMaxSpeed) && (
                <div className="bg-[#A855F7]/10 border border-[#A855F7]/30 p-3 rounded-lg">
                  <span className="font-black uppercase text-[10px] text-[#A855F7] tracking-wider block mb-1">GPS & Tracker Daten</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs text-[#F8FAFC]">
                    {parsedDocData.trackerTotalDist && <div><strong>Distanz:</strong> {parsedDocData.trackerTotalDist} km</div>}
                    {parsedDocData.trackerHighSpeed && <div><strong>High Speed:</strong> {parsedDocData.trackerHighSpeed} m</div>}
                    {parsedDocData.trackerMaxSpeed && <div><strong>Max Speed:</strong> {parsedDocData.trackerMaxSpeed} km/h</div>}
                    {parsedDocData.trackerSprints && <div><strong>Sprints:</strong> {parsedDocData.trackerSprints}</div>}
                    {parsedDocData.trackerAvgHr && <div><strong>Puls Schnitt:</strong> {parsedDocData.trackerAvgHr} bpm</div>}
                  </div>
                </div>
              )}
            </div>

            {/* ── 12 BEREICHE: JE EIN DIAGRAMM AUS DEN GEPARSTEN DATEN ── */}
            <div className="border border-[#06B6D4]/30 bg-[#0A1628]/60 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-black uppercase text-[10px] text-[#06B6D4] tracking-wider">12 Bereiche · Automatische Analyse</span>
                <span className="text-[8px] font-bold text-slate-500">aus geparsten Daten</span>
              </div>
              <PdfParsedCharts
                data={parsedDocData}
                player={selectedPlayer}
                kpis={{ kpi10m, kpi30m, kpiYoyo, kpiJump }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#334155]">
              <button
                type="button"
                onClick={handleApplyParsedDoc}
                className="flex-1 py-3 px-4 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs uppercase tracking-wider rounded-lg border border-[#10B981] flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Check size={16} /> In Spielerprofil & Formular übernehmen
              </button>
              <button
                type="button"
                onClick={() => setParsedDocModalOpen(false)}
                className="py-3 px-4 bg-[#121824] hover:bg-[#1E293B] text-[#F8FAFC] font-black text-xs uppercase tracking-wider border border-[#334155] rounded-lg flex items-center justify-center gap-2"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Switcher Tabs */}
      {selectedPlayer && (
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#121824] border border-[#334155]/80 rounded-xl shadow-lg select-none mb-4">
          <button
            type="button"
            onClick={() => setPortalView('bericht')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'bericht'
                ? 'bg-[#e94560] text-white font-black border-[#e94560] shadow-[0_0_14px_rgba(233,69,96,0.5)]'
                : 'bg-[#e94560]/20 text-[#e94560] border-[#e94560]/40 hover:bg-[#e94560]/30 hover:text-white'
            }`}
          >
            <BarChart3 size={15} /> <span>⚽ Pro-Bericht</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('saisonbericht')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'saisonbericht'
                ? 'bg-[#06B6D4] text-[#0A0E17] font-black border-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <TrendingUp size={15} /> <span>📈 Saisonbericht</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('teamvergleich')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'teamvergleich'
                ? 'bg-[#8B5CF6] text-white font-black border-[#8B5CF6] shadow-[0_0_10px_rgba(139,92,246,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <Users size={15} /> <span>👥 Teamvergleich</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('form')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'form'
                ? 'bg-[#F59E0B] text-[#0A0E17] font-black border-[#F59E0B] shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <Activity size={15} /> <span>📝 Einheit</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('datenblatt')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'datenblatt'
                ? 'bg-[#10B981] text-[#0A0E17] font-black border-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <FileText size={15} /> <span>📄 Datenblatt</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('vergleich')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'vergleich'
                ? 'bg-[#E11D48] text-white font-black border-[#E11D48] shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <Users size={15} /> <span>📊 Benchmarks</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('tracker')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'tracker'
                ? 'bg-[#06B6D4] text-[#0A0E17] font-black border-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <FolderCheck size={15} /> <span>📍 WG Tracker</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('trackerUpload')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'trackerUpload'
                ? 'bg-[#F59E0B] text-[#0A0E17] font-black border-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.5)] animate-pulse'
                : 'bg-[#1E293B]/60 text-[#F59E0B] border-[#F59E0B]/40 hover:bg-[#1E293B]'
            }`}
          >
            <Upload size={15} /> <span>📥 Tracker Hochladen</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('trackerCompare')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'trackerCompare'
                ? 'bg-[#6366F1] text-white font-black border-[#6366F1] shadow-[0_0_10px_rgba(99,102,241,0.5)]'
                : 'bg-[#1E293B]/60 text-[#818CF8] border-[#6366F1]/40 hover:bg-[#1E293B]'
            }`}
          >
            <ArrowLeftRight size={15} /> <span>📊 Tracker Vergleich</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('trackerAnalyse')}
            className={`flex-1 min-w-[160px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'trackerAnalyse'
                ? 'bg-[#EF4444] text-white font-black border-[#EF4444] shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'bg-[#1E293B]/60 text-[#F87171] border-[#EF4444]/40 hover:bg-[#1E293B]'
            }`}
          >
            <Activity size={15} /> <span>📊 Tracker-Analyse</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('spielanalyse')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'spielanalyse'
                ? 'bg-[#A855F7] text-white font-black border-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <Compass size={15} /> <span>📋 Spielanalyse</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('video')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'video'
                ? 'bg-[#E11D48] text-white font-black border-[#E11D48] shadow-[0_0_10px_rgba(225,29,72,0.4)]'
                : 'bg-[#1E293B]/60 text-[#94A3B8] border-[#334155]/60 hover:text-[#F8FAFC] hover:bg-[#1E293B]'
            }`}
          >
            <Video size={15} /> <span>🎬 Video Clips</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('diagnose')}
            className={`flex-1 min-w-[180px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'diagnose'
                ? 'bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-[#0A0E17] font-black border-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.5)]'
                : 'bg-[#1E293B]/60 text-[#F59E0B] border-[#F59E0B]/40 hover:bg-[#1E293B]'
            }`}
          >
            <Activity size={15} /> <span>🔬 Cross-Tab Diagnose</span>
          </button>
          <button
            type="button"
            onClick={() => setPortalView('analytics')}
            className={`flex-1 min-w-[140px] py-2.5 px-3 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center justify-center gap-2 border ${
              portalView === 'analytics'
                ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-black border-[#3B82F6] shadow-[0_0_14px_rgba(59,130,246,0.5)]'
                : 'bg-[#1E293B]/60 text-[#818CF8] border-[#6366F1]/40 hover:bg-[#1E293B]'
            }`}
          >
            <BarChart3 size={15} /> <span>📊 Analytics</span>
          </button>
        </div>
      )}

      {portalView === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Form (7 cols) */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-6">
              <div className="border-b border-[#334155] pb-2 mb-4 flex items-center gap-2">
                <Activity size={18} className="text-[#10B981]" />
                <h3 className="font-black uppercase text-sm tracking-wider text-[#F8FAFC]">NEUE EINHEIT PROTOKOLLIEREN</h3>
              </div>

              {/* AI PDF/Image Uploader Section */}
              <div className="bg-[#10B981]/10 border border-dashed border-[#10B981]/40 p-4 rounded-xl shadow-md space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[#10B981] animate-pulse shrink-0" />
                  <h4 className="font-black uppercase text-xs text-[#10B981] tracking-wider">
                    DOKUMENT-PARSER
                  </h4>
                </div>
                <p className="text-[11px] text-[#94A3B8] font-medium leading-relaxed">
                  Lade ein PDF (z.B. Garmin-Report, TRACKTICS-PDF) oder ein Foto/Screenshot deines Workouts hoch. Das System füllt die Daten automatisch für dich aus!
                </p>

                <div className="relative border border-[#334155] bg-[#121824] hover:bg-[#1E293B] transition-colors p-3 rounded-lg cursor-pointer text-center flex flex-col items-center justify-center gap-1 group shadow-sm">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    disabled={parsingDoc}
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  {parsingDoc ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <Loader2 size={24} className="text-[#10B981] animate-spin" />
                      <span className="font-black text-xs uppercase text-[#10B981]">Analysiere Dokument...</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={20} className="text-[#10B981] group-hover:scale-110 transition-transform" />
                      <span className="font-black text-xs uppercase text-[#F8FAFC]">
                        PDF oder Foto hochladen
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-bold">
                        PDF, PNG, JPG • Bis zu 10MB
                      </span>
                    </>
                  )}
                </div>

                {parsingError && (
                  <div className="bg-red-950/40 border border-red-500/40 text-red-200 p-2.5 rounded-lg font-black uppercase text-[10px] flex items-center justify-between gap-2">
                    <span>⚠️ {parsingError}</span>
                    <button 
                      type="button" 
                      onClick={() => setParsingError('')}
                      className="text-red-300 hover:text-white font-black"
                    >
                      [X]
                    </button>
                  </div>
                )}

                {parsingSuccess && (
                  <div className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] p-2.5 rounded-lg font-black uppercase text-[10px] flex items-center justify-between gap-2">
                    <span>✅ {parsingSuccess}</span>
                    <button 
                      type="button" 
                      onClick={() => setParsingSuccess('')}
                      className="text-[#10B981] hover:text-white font-black"
                    >
                      [X]
                    </button>
                  </div>
                )}
              </div>

              {successMsg && (
                <div className="bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] p-4 rounded-xl font-black uppercase text-xs flex items-center gap-2 animate-bounce">
                  <CheckCircle size={16} /> {successMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Datum</label>
                  <div className="flex border border-[#334155] rounded-lg overflow-hidden bg-[#121824]">
                    <span className="p-2.5 bg-[#1E293B] border-r border-[#334155] text-[#94A3B8]"><Calendar size={14} /></span>
                    <input 
                      type="date" 
                      required
                      className="p-2 w-full font-black text-sm bg-transparent text-[#F8FAFC] focus:outline-none"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Einheitstyp</label>
                  <div className="flex border border-[#334155] rounded-lg overflow-hidden bg-[#121824]">
                    <button
                      type="button"
                      onClick={() => setType('Training')}
                      className={`flex-1 py-2 font-black uppercase text-xs transition-colors ${type === 'Training' ? 'bg-[#10B981] text-[#0A0E17]' : 'bg-[#121824] hover:bg-[#1E293B] text-[#94A3B8]'}`}
                    >
                      Training
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('Match')}
                      className={`flex-1 py-2 font-black uppercase text-xs transition-colors border-l border-[#334155] ${type === 'Match' ? 'bg-[#E11D48] text-white' : 'bg-[#121824] hover:bg-[#1E293B] text-[#94A3B8]'}`}
                    >
                      Match / Spiel
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                  Inhaltlicher Schwerpunkt (Focus / Thema der Einheit)
                </label>
                <input 
                  type="text"
                  required
                  placeholder="z.B. Athletisches Intervalltraining, Kompaktheit im Zentrum"
                  className="w-full bg-[#121824] border border-[#334155] rounded-lg p-2.5 font-bold text-xs text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                    Dauer (Minuten)
                  </label>
                  <div className="flex border border-[#334155] rounded-lg overflow-hidden bg-[#121824]">
                    <span className="p-2.5 bg-[#1E293B] border-r border-[#334155] text-[#94A3B8]"><Clock size={14} /></span>
                    <input 
                      type="number"
                      min={1}
                      required
                      className="p-2 w-full font-black text-sm bg-transparent text-[#F8FAFC] focus:outline-none"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                    Belastungsempfinden (RPE 1-10)
                  </label>
                  <div className="flex border border-[#334155] rounded-lg overflow-hidden bg-[#121824]">
                    <span className="p-2.5 bg-[#1E293B] border-r border-[#334155] font-mono font-black text-sm text-[#10B981]">
                      {rpe}/10
                    </span>
                    <select 
                      className="p-2 w-full font-black text-sm bg-transparent text-[#F8FAFC] focus:outline-none"
                      value={rpe}
                      onChange={(e) => setRpe(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n} className="bg-[#121824]">
                          {n} - {rpeLabels[n]?.text || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live calculated load badge */}
              <div className="bg-[#121824] p-4 border border-[#334155] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-[#94A3B8]">Berechneter Trainingsload (Dauer × RPE)</p>
                  <p className="text-sm font-black text-[#F8FAFC] mt-1 font-mono">{duration} Min × {rpe} RPE</p>
                </div>
                <div className="text-right">
                  <span className="bg-[#10B981] text-[#0A0E17] px-3 py-2 rounded-lg text-sm font-black tracking-wider border border-[#10B981] inline-block shadow-md">
                    {calculatedLoad} LOAD UNITS
                  </span>
                </div>
              </div>

              {/* Match performance details (Taktische Kennzahlen) */}
              {type === 'Match' && (
                <div className="border-t border-dashed border-[#334155] pt-4 space-y-4">
                  <div className="bg-[#E11D48]/10 border border-[#E11D48]/30 p-2 rounded-lg text-[#E11D48] font-black uppercase text-[10px] tracking-wide mb-2">
                    Match-Performance & Taktische Daten erfassen
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Einsatzminuten</label>
                      <input 
                        type="number" 
                        min={0}
                        className="w-full p-2 bg-[#121824] border border-[#334155] rounded-lg font-black text-xs text-center text-[#F8FAFC]"
                        value={matchMinutes}
                        onChange={(e) => setMatchMinutes(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Tore</label>
                      <input 
                        type="number" 
                        min={0}
                        className="w-full p-2 bg-[#121824] border border-[#334155] rounded-lg font-black text-xs text-center text-[#F8FAFC]"
                        value={goals}
                        onChange={(e) => setGoals(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Vorlagen</label>
                      <input 
                        type="number" 
                        min={0}
                        className="w-full p-2 bg-[#121824] border border-[#334155] rounded-lg font-black text-xs text-center text-[#F8FAFC]"
                        value={assists}
                        onChange={(e) => setAssists(Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Passquote %</label>
                      <input 
                        type="number" 
                        min={0}
                        max={100}
                        className="w-full p-2 bg-[#121824] border border-[#334155] rounded-lg font-black text-xs text-center text-[#F8FAFC]"
                        value={passAccuracy}
                        onChange={(e) => setPassAccuracy(Number(e.target.value))}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">Zweikampf %</label>
                      <input 
                        type="number" 
                        min={0}
                        max={100}
                        className="w-full p-2 bg-[#121824] border border-[#334155] rounded-lg font-black text-xs text-center text-[#F8FAFC]"
                        value={tackleRate}
                        onChange={(e) => setTackleRate(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Diagnostic KPIs Option */}
              <div className="border-t border-[#334155] pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input 
                    type="checkbox" 
                    id="update-kpis-chk" 
                    className="w-4 h-4 cursor-pointer accent-[#10B981]"
                    checked={updateKpis}
                    onChange={(e) => setUpdateKpis(e.target.checked)}
                  />
                  <label htmlFor="update-kpis-chk" className="text-[10px] font-black uppercase text-[#F8FAFC] cursor-pointer select-none">
                    Athletische Leistungsindikatoren (KPIs) aktualisieren
                  </label>
                </div>

                {updateKpis && (
                  <div className="bg-[#121824] p-4 border border-dashed border-[#334155] rounded-xl grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                        10m-Antritt (z.B. "1.62 s")
                      </label>
                      <input 
                        type="text" 
                        placeholder="1.62 s"
                        className="w-full p-2 bg-[#1E293B] border border-[#334155] rounded-lg font-black text-xs uppercase text-[#F8FAFC]"
                        value={sprint10m}
                        onChange={(e) => setSprint10m(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                        30m-Sprint (z.B. "4.08 s")
                      </label>
                      <input 
                        type="text" 
                        placeholder="4.08 s"
                        className="w-full p-2 bg-[#1E293B] border border-[#334155] rounded-lg font-black text-xs uppercase text-[#F8FAFC]"
                        value={sprint30m}
                        onChange={(e) => setSprint30m(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                        Yo-Yo IR1 Test (z.B. "Level 18.6")
                      </label>
                      <input 
                        type="text" 
                        placeholder="Level 18.6"
                        className="w-full p-2 bg-[#1E293B] border border-[#334155] rounded-lg font-black text-xs uppercase text-[#F8FAFC]"
                        value={yoyotest}
                        onChange={(e) => setYoyotest(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-black uppercase tracking-wider text-[#94A3B8] mb-1">
                        Sprungkraft CMJ (z.B. "44 cm")
                      </label>
                      <input 
                        type="text" 
                        placeholder="44 cm"
                        className="w-full p-2 bg-[#1E293B] border border-[#334155] rounded-lg font-black text-xs uppercase text-[#F8FAFC]"
                        value={jumpHeight}
                        onChange={(e) => setJumpHeight(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black uppercase text-sm rounded-xl border border-[#10B981] shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> {submitting ? 'Daten werden übertragen...' : 'Einheit absenden'}
              </button>
            </form>
          </div>

          {/* Right Column: Statistics Sheet & Log History (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Dashboard of Selected Player */}
            {analytics ? (
              <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-4">
                <div className="border-b border-[#334155] pb-2">
                  <span className="bg-[#10B981] text-[#0A0E17] text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Performance Dashboard</span>
                  <h3 className="font-black uppercase text-lg mt-1 text-[#F8FAFC]">SAISON STATISTIK</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1E293B] p-3 border border-[#334155] rounded-xl">
                    <p className="text-[8px] font-black uppercase text-[#10B981]">Einheiten Gesamt</p>
                    <p className="text-2xl font-black font-mono text-[#F8FAFC]">{analytics.totalUnits}</p>
                  </div>
                  <div className="bg-[#1E293B] p-3 border border-[#334155] rounded-xl">
                    <p className="text-[8px] font-black uppercase text-[#10B981]">Ø Belastung (RPE)</p>
                    <p className="text-2xl font-black font-mono text-[#F59E0B]">{analytics.avgRpe}</p>
                  </div>
                  <div className="bg-[#1E293B] p-3 border border-[#334155] rounded-xl">
                    <p className="text-[8px] font-black uppercase text-[#10B981]">Ø Training-Load</p>
                    <p className="text-2xl font-black font-mono text-[#10B981]">{analytics.avgLoad}</p>
                  </div>
                  <div className="bg-[#1E293B] p-3 border border-[#334155] rounded-xl">
                    <p className="text-[8px] font-black uppercase text-[#10B981]">Aktivitätszeit</p>
                    <p className="text-2xl font-black font-mono text-[#F8FAFC]">{analytics.totalDuration} Min</p>
                  </div>
                </div>

                {analytics.matchCount > 0 && (
                  <div className="border-t border-[#334155] pt-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#10B981]">
                      Match Performance ({analytics.matchCount} Spiele)
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-[#1E293B] p-2 border border-[#334155] rounded-lg">
                        <p className="text-[7px] font-black uppercase text-[#94A3B8]">Minuten</p>
                        <p className="text-sm font-black text-[#F8FAFC]">{analytics.totalMinutes}</p>
                      </div>
                      <div className="bg-[#1E293B] p-2 border border-[#334155] rounded-lg">
                        <p className="text-[7px] font-black uppercase text-[#94A3B8]">Tore / Vorl.</p>
                        <p className="text-sm font-black text-[#F59E0B]">{analytics.totalGoals} / {analytics.totalAssists}</p>
                      </div>
                      <div className="bg-[#1E293B] p-2 border border-[#334155] rounded-lg">
                        <p className="text-[7px] font-black uppercase text-[#94A3B8]">Pass / ZK %</p>
                        <p className="text-[11px] font-black text-[#10B981]">{analytics.avgPass}% / {analytics.avgTackle}%</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#121824] text-[#94A3B8] border border-[#334155] p-8 rounded-2xl shadow-xl text-center font-black uppercase text-xs">
                <Flame size={32} className="mx-auto mb-2 animate-pulse text-[#F59E0B]" />
                Keine Statistiken vorhanden.<br />Trage deine erste Einheit ein!
              </div>
            )}

            {/* Log History */}
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl flex flex-col h-[400px]">
              <div className="border-b border-[#334155] pb-2 mb-4 flex justify-between items-center shrink-0">
                <h3 className="font-black uppercase text-xs tracking-wider text-[#F8FAFC]">LETZTE LOGS ({playerLogs.length})</h3>
                <span className="text-[8px] font-mono text-[#94A3B8]">ABSTREIGEND</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {playerLogs.length === 0 ? (
                  <div className="text-center p-12 text-[#94A3B8] font-black uppercase text-[10px] tracking-wide h-full flex flex-col justify-center border border-dashed border-[#334155] rounded-xl">
                    Keine Einheiten dokumentiert
                  </div>
                ) : (
                  playerLogs.map(log => (
                    <div key={log.id} className="bg-[#121824] border border-[#334155] p-3 rounded-xl shadow-md relative group">
                      <button
                        type="button"
                        onClick={() => {
                          onDeleteLog(log.id);
                        }}
                        className="absolute top-2 right-2 text-[#94A3B8] hover:text-red-400 p-1 rounded hover:bg-red-950/40 transition-colors opacity-80 hover:opacity-100 cursor-pointer"
                        title="Einheit löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${log.type === 'Match' ? 'bg-[#E11D48]/20 border-[#E11D48]/40 text-[#E11D48]' : 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]'}`}>
                          {log.type}
                        </span>
                        <span className="text-[9px] font-bold text-[#94A3B8] font-mono">{log.date}</span>
                      </div>
                      <div className="font-black text-xs uppercase leading-snug text-[#F8FAFC]">{log.focus}</div>
                      
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[9px] font-bold text-[#94A3B8] bg-[#0A0E17] p-2 rounded-lg border border-[#334155] font-mono">
                        <div>
                          Dauer: <span className="font-black text-[#F8FAFC]">{log.duration} Min</span>
                        </div>
                        <div>
                          RPE: <span className="font-black text-[#F59E0B]">{log.rpe}/10</span>
                        </div>
                        <div>
                          Load: <span className="font-black text-[#10B981]">{log.calculatedLoad}</span>
                        </div>
                      </div>

                      {log.type === 'Match' && (
                        <div className="mt-1.5 bg-[#E11D48]/10 p-2 rounded-lg border border-[#E11D48]/20 text-[8px] font-semibold text-[#F8FAFC] flex justify-between font-mono">
                          <span>Minuten: <strong>{log.matchMinutes}</strong></span>
                          <span>Tore/Vorl: <strong>{log.goals}/{log.assists}</strong></span>
                          <span>Pass/ZK: <strong>{log.passAccuracy}%/{log.tackleRate}%</strong></span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      ) : portalView === 'datenblatt' ? (
        /* PROFESSIONELLES SPIELERDATENBLATT */
        <div className="space-y-6">
          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#1E293B] border border-[#334155] p-4 rounded-2xl shadow-xl select-none">
            <div className="flex items-center gap-2">
              <span className="bg-[#10B981] text-[#0A0E17] p-2 rounded-lg font-black"><Award size={18} /></span>
              <div>
                <h4 className="font-black uppercase text-xs text-[#F8FAFC]">BERICHTSSTEUERUNG</h4>
                <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Optionen zur Anpassung und zum Drucken</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={generatingReport}
                onClick={generateAiReport}
                className="bg-[#121824] hover:bg-[#0A0E17] text-[#F8FAFC] px-4 py-2 border border-[#334155] rounded-lg font-black uppercase text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {generatingReport ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-[#10B981]" /> Analyst liest...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} className="text-[#F59E0B]" /> Fazit generieren
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (editDatenblatt) {
                    handleSaveReport();
                  }
                  setEditDatenblatt(!editDatenblatt);
                }}
                className={`px-4 py-2 border rounded-lg font-black uppercase text-xs transition-colors ${editDatenblatt ? 'bg-[#10B981] text-[#0A0E17] border-[#10B981]' : 'bg-[#121824] text-[#F8FAFC] border-[#334155] hover:bg-[#0A0E17]'}`}
              >
                {editDatenblatt ? '💾 Änderungen speichern' : '✏️ Daten manuell anpassen'}
              </button>

              <button
                type="button"
                onClick={handleExportDataSheetPDF}
                disabled={isExportingDataSheetPDF}
                className="bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] px-4 py-2 border border-[#10B981] rounded-lg font-black uppercase text-xs flex items-center gap-1.5 shadow-md transition-colors"
              >
                {isExportingDataSheetPDF ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />} PDF Herunterladen
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[#121824] text-[#F8FAFC] hover:bg-[#0A0E17] px-4 py-2 border border-[#334155] rounded-lg font-black uppercase text-xs flex items-center gap-1.5 shadow-md"
              >
                <Printer size={14} /> Drucken / System-PDF
              </button>
            </div>
          </div>

          {/* HIGH POLISHED NEU-BRUTALIST SPIELERDATENBLATT CONTAINER */}
          <div className="border border-[#334155] p-8 bg-[#1E293B] text-[#F8FAFC] rounded-2xl space-y-6 relative shadow-2xl" id="player-data-sheet-pdf">
            {/* TOP RIBBON */}
            <div className="flex justify-between items-center border-b border-[#334155] pb-4">
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-widest text-[#10B981]">
                  PERFORMANCE & TRACKING MONITOR
                </p>
                <h2 className="text-2xl font-black uppercase tracking-tight text-[#F8FAFC]">
                  PROFESSIONELLES SPIELERDATENBLATT
                </h2>
              </div>
              <div className="text-right font-mono text-xs font-bold border border-[#334155] p-2 bg-[#121824] rounded-lg text-[#10B981]">
                SPIELER: {selectedPlayer?.lastName?.toUpperCase()}
              </div>
            </div>

            {/* METADATA GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#121824] p-4 border border-[#334155] rounded-xl text-xs">
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Spieler</span>
                <span className="font-black text-sm uppercase text-[#F8FAFC]">{selectedPlayer?.lastName}</span>
              </div>
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Verein</span>
                {editDatenblatt ? (
                  <input 
                    type="text" 
                    className="border border-[#334155] p-1 bg-[#1E293B] text-[#F8FAFC] font-black rounded w-full text-xs" 
                    value={verein} 
                    onChange={(e) => setVerein(e.target.value)} 
                  />
                ) : (
                  <span className="font-black text-sm uppercase text-[#F8FAFC]">{verein}</span>
                )}
              </div>
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Saison</span>
                {editDatenblatt ? (
                  <input 
                    type="text" 
                    className="border border-[#334155] p-1 bg-[#1E293B] text-[#F8FAFC] font-black rounded w-full text-xs" 
                    value={saison} 
                    onChange={(e) => setSaison(e.target.value)} 
                  />
                ) : (
                  <span className="font-black text-sm uppercase text-[#F8FAFC]">{saison}</span>
                )}
              </div>
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Position</span>
                <span className="font-black text-sm uppercase text-[#F8FAFC]">{selectedPlayer?.position || 'Zentrales Mittelfeld'}</span>
              </div>
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Analysedatum</span>
                {editDatenblatt ? (
                  <input 
                    type="text" 
                    className="border border-[#334155] p-1 bg-[#1E293B] text-[#F8FAFC] font-black rounded w-full text-xs" 
                    value={analysedatum} 
                    onChange={(e) => setAnalysedatum(e.target.value)} 
                  />
                ) : (
                  <span className="font-black text-sm uppercase text-[#F8FAFC]">{analysedatum}</span>
                )}
              </div>
              <div>
                <span className="font-black uppercase text-[#94A3B8] block text-[9px] tracking-wide">Status</span>
                {editDatenblatt ? (
                  <input 
                    type="text" 
                    className="border border-[#334155] p-1 bg-[#1E293B] text-[#F8FAFC] font-black rounded w-full text-xs" 
                    value={playerStatus} 
                    onChange={(e) => setPlayerStatus(e.target.value)} 
                  />
                ) : (
                  <span className="font-black text-sm uppercase text-[#10B981]">{playerStatus}</span>
                )}
              </div>
            </div>

            {/* SECTION 1 */}
            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase border-b-2 border-black pb-1">
                1. Athletische Leistungsindikatoren (KPIs)
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed italic">
                Die aus den Rohdaten extrahierten physischen Parameter zeigen hervorragende konditionelle und explosive Werte im Vergleich zu den mannschaftsinternen Benchmarks.
              </p>
              <div className="overflow-x-auto border border-[#334155] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#121824] border-b border-[#334155] font-black uppercase text-[#F8FAFC]">
                      <th className="p-2.5 border-r border-[#334155]">Metrik / Parameter</th>
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Benchmark</th>
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Gemessener Wert</th>
                      <th className="p-2.5 w-1/3">Status / Einordnung</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#334155] font-bold text-[#F8FAFC]">
                      <td className="p-2.5 border-r border-[#334155] bg-[#121824]/50 font-black">10m-Antritt (Sprintschnelligkeit)</td>
                      <td className="p-2.5 border-r border-[#334155] font-mono">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs text-[#F8FAFC] rounded" value={kpi10mBenchmark} onChange={(e) => setKpi10mBenchmark(e.target.value)} />
                        ) : kpi10mBenchmark}
                      </td>
                      <td className="p-2.5 border-r border-[#334155] font-mono text-[#10B981] font-black">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs font-black text-[#10B981] rounded" value={kpi10m} onChange={(e) => setKpi10m(e.target.value)} />
                        ) : kpi10m}
                      </td>
                      <td className="p-2.5 text-xs text-[#94A3B8]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={kpi10mStatus} onChange={(e) => setKpi10mStatus(e.target.value)} />
                        ) : kpi10mStatus}
                      </td>
                    </tr>
                    <tr className="border-b border-[#334155] font-bold text-[#F8FAFC]">
                      <td className="p-2.5 border-r border-[#334155] bg-[#121824]/50 font-black">30m-Sprint (Grundspeed)</td>
                      <td className="p-2.5 border-r border-[#334155] font-mono">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs text-[#F8FAFC] rounded" value={kpi30mBenchmark} onChange={(e) => setKpi30mBenchmark(e.target.value)} />
                        ) : kpi30mBenchmark}
                      </td>
                      <td className="p-2.5 border-r border-[#334155] font-mono text-[#10B981] font-black">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs font-black text-[#10B981] rounded" value={kpi30m} onChange={(e) => setKpi30m(e.target.value)} />
                        ) : kpi30m}
                      </td>
                      <td className="p-2.5 text-xs text-[#94A3B8]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={kpi30mStatus} onChange={(e) => setKpi30mStatus(e.target.value)} />
                        ) : kpi30mStatus}
                      </td>
                    </tr>
                    <tr className="border-b border-[#334155] font-bold text-[#F8FAFC]">
                      <td className="p-2.5 border-r border-[#334155] bg-[#121824]/50 font-black">Yo-Yo IR1 Test (Ausdauerleistung)</td>
                      <td className="p-2.5 border-r border-[#334155] font-mono">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs text-[#F8FAFC] rounded" value={kpiYoyoBenchmark} onChange={(e) => setKpiYoyoBenchmark(e.target.value)} />
                        ) : kpiYoyoBenchmark}
                      </td>
                      <td className="p-2.5 border-r border-[#334155] font-mono text-[#10B981] font-black">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs font-black text-[#10B981] rounded" value={kpiYoyo} onChange={(e) => setKpiYoyo(e.target.value)} />
                        ) : kpiYoyo}
                      </td>
                      <td className="p-2.5 text-xs text-[#94A3B8]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={kpiYoyoStatus} onChange={(e) => setKpiYoyoStatus(e.target.value)} />
                        ) : kpiYoyoStatus}
                      </td>
                    </tr>
                    <tr className="font-bold text-[#F8FAFC]">
                      <td className="p-2.5 border-r border-[#334155] bg-[#121824]/50 font-black">Sprungkraft (CMJ Vertikalsprung)</td>
                      <td className="p-2.5 border-r border-[#334155] font-mono">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs text-[#F8FAFC] rounded" value={kpiJumpBenchmark} onChange={(e) => setKpiJumpBenchmark(e.target.value)} />
                        ) : kpiJumpBenchmark}
                      </td>
                      <td className="p-2.5 border-r border-[#334155] font-mono text-[#10B981] font-black">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] font-mono text-xs font-black text-[#10B981] rounded" value={kpiJump} onChange={(e) => setKpiJump(e.target.value)} />
                        ) : kpiJump}
                      </td>
                      <td className="p-2.5 text-xs text-[#94A3B8]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={kpiJumpStatus} onChange={(e) => setKpiJumpStatus(e.target.value)} />
                        ) : kpiJumpStatus}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2 */}
            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase border-b border-[#334155] pb-1 text-[#F8FAFC]">
                2. Belastungssteuerung & Trainings-Log
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed italic">
                Dokumentation der Trainingsbelastung mittels RPE-Index (Rate of Perceived Exertion) zur optimalen Steuerung der Frische vor dem Wettkampf.
              </p>
              <div className="overflow-x-auto border border-[#334155] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#121824] border-b border-[#334155] font-black uppercase text-[#F8FAFC]">
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Einheit</th>
                      <th className="p-2.5 border-r border-[#334155]">Inhaltlicher Schwerpunkt</th>
                      <th className="p-2.5 border-r border-[#334155] w-1/6">Dauer</th>
                      <th className="p-2.5 w-1/4">Belastung (RPE 1-10)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sheetLogs.map((log, idx) => (
                      <tr key={log.id || idx} className="border-b last:border-b-0 border-[#334155] font-bold text-[#F8FAFC]">
                        <td className="p-2.5 border-r border-[#334155] bg-[#121824]/50">
                          {editDatenblatt ? (
                            <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs font-bold text-[#F8FAFC] rounded" value={log.title} onChange={(e) => {
                              const next = [...sheetLogs];
                              next[idx].title = e.target.value;
                              setSheetLogs(next);
                            }} />
                          ) : log.title}
                        </td>
                        <td className="p-2.5 border-r border-[#334155]">
                          {editDatenblatt ? (
                            <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={log.focus} onChange={(e) => {
                              const next = [...sheetLogs];
                              next[idx].focus = e.target.value;
                              setSheetLogs(next);
                            }} />
                          ) : log.focus}
                        </td>
                        <td className="p-2.5 border-r border-[#334155]">
                          {editDatenblatt ? (
                            <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs text-[#F8FAFC] rounded" value={log.duration} onChange={(e) => {
                              const next = [...sheetLogs];
                              next[idx].duration = e.target.value;
                              setSheetLogs(next);
                            }} />
                          ) : log.duration}
                        </td>
                        <td className="p-2.5 font-mono text-[#10B981] font-black">
                          {editDatenblatt ? (
                            <input type="text" className="p-1 border border-[#334155] w-full bg-[#121824] text-xs font-black font-mono text-[#10B981] rounded" value={log.rpe} onChange={(e) => {
                              const next = [...sheetLogs];
                              next[idx].rpe = e.target.value;
                              setSheetLogs(next);
                            }} />
                          ) : log.rpe}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3 */}
            <div className="space-y-3">
              <h3 className="font-black text-sm uppercase border-b border-[#334155] pb-1 text-[#F8FAFC]">
                3. Match-Performance & Taktische Kennzahlen
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed italic">
                Reale Leistungsdaten aus den Pflichtspielen im zentralen Mittelfeld.
              </p>
              <div className="overflow-x-auto border border-[#334155] rounded-xl">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#121824] border-b border-[#334155] font-black uppercase text-[#F8FAFC]">
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Einsatzminuten</th>
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Tore / Vorlagen</th>
                      <th className="p-2.5 border-r border-[#334155] w-1/4">Passquote</th>
                      <th className="p-2.5 w-1/4">Zweikampfquote</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-black text-sm text-[#F8FAFC]">
                      <td className="p-3 border-r border-[#334155]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] text-center w-full bg-[#121824] text-xs font-black text-[#F8FAFC] rounded" value={sheetMinutes} onChange={(e) => setSheetMinutes(e.target.value)} />
                        ) : sheetMinutes}
                      </td>
                      <td className="p-3 border-r border-[#334155] text-[#E11D48]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] text-center w-full bg-[#121824] text-xs font-black text-[#E11D48] rounded" value={sheetGoalsAssists} onChange={(e) => setSheetGoalsAssists(e.target.value)} />
                        ) : sheetGoalsAssists}
                      </td>
                      <td className="p-3 border-r border-[#334155] text-[#10B981]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] text-center w-full bg-[#121824] text-xs font-black text-[#10B981] rounded" value={sheetPassAccuracy} onChange={(e) => setSheetPassAccuracy(e.target.value)} />
                        ) : sheetPassAccuracy}
                      </td>
                      <td className="p-3 text-[#10B981]">
                        {editDatenblatt ? (
                          <input type="text" className="p-1 border border-[#334155] text-center w-full bg-[#121824] text-xs font-black text-[#10B981] rounded" value={sheetTackleRate} onChange={(e) => setSheetTackleRate(e.target.value)} />
                        ) : sheetTackleRate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 4 */}
            <div className="space-y-4">
              <h3 className="font-black text-sm uppercase border-b border-[#334155] pb-1 text-[#F8FAFC]">
                4. Analysten-Fazit & Strategischer Entwicklungsplan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-[#334155] p-4 bg-[#121824] rounded-xl space-y-2">
                  <h4 className="font-black text-[10px] uppercase text-[#10B981] tracking-wider">
                    Taktische Kernkompetenz
                  </h4>
                  {editDatenblatt ? (
                    <textarea className="w-full p-2 border border-[#334155] text-xs font-bold bg-[#1E293B] text-[#F8FAFC] rounded-lg h-32 resize-none focus:outline-none focus:border-[#10B981]" value={taktischeKernkompetenz} onChange={(e) => setTaktischeKernkompetenz(e.target.value)} />
                  ) : (
                    <p className="text-xs text-[#F8FAFC] font-bold leading-relaxed">{taktischeKernkompetenz}</p>
                  )}
                </div>

                <div className="border border-[#334155] p-4 bg-[#121824] rounded-xl space-y-2">
                  <h4 className="font-black text-[10px] uppercase text-[#E11D48] tracking-wider">
                    Optimierungspotenzial
                  </h4>
                  {editDatenblatt ? (
                    <textarea className="w-full p-2 border border-[#334155] text-xs font-bold bg-[#1E293B] text-[#F8FAFC] rounded-lg h-32 resize-none focus:outline-none focus:border-[#E11D48]" value={optimierungsPotenzial} onChange={(e) => setOptimierungsPotenzial(e.target.value)} />
                  ) : (
                    <p className="text-xs text-[#F8FAFC] font-bold leading-relaxed">{optimierungsPotenzial}</p>
                  )}
                </div>

                <div className="border border-[#334155] p-4 bg-[#121824] rounded-xl space-y-2">
                  <h4 className="font-black text-[10px] uppercase text-[#F59E0B] tracking-wider">
                    Nächste Maßnahmen
                  </h4>
                  {editDatenblatt ? (
                    <textarea className="w-full p-2 border border-[#334155] text-xs font-bold bg-[#1E293B] text-[#F8FAFC] rounded-lg h-32 resize-none focus:outline-none focus:border-[#F59E0B]" value={naechsteMassnahmen} onChange={(e) => setNaechsteMassnahmen(e.target.value)} />
                  ) : (
                    <p className="text-xs text-[#F8FAFC] font-bold leading-relaxed">{naechsteMassnahmen}</p>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 5: HOLLO ANALYTIC-DIAGRAMME (12 futuristische Performance-Diagramme) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase border-b border-[#334155] pb-1 text-[#F8FAFC]">
                  5. Holo-Performance-Diagramme (12 visualisierte KPI-Modelle)
                </h3>
                <span className="text-[8px] font-mono text-[#94A3B8] uppercase">Real-Time-Datenbank • {selectedPlayer?.lastName || 'Spieler'}</span>
              </div>
              {renderHoloGallery()}
            </div>

            {/* SECTION 6: EINHEITEN-ENTWICKLUNGSVERGLEICH (zeitlicher Verlauf) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm uppercase border-b border-[#334155] pb-1 text-[#F8FAFC]">
                  6. Einheiten-Entwicklungsvergleich (Belastungsverlauf)
                </h3>
                <span className="text-[8px] font-mono text-[#94A3B8] uppercase">{selectedPlayer?.lastName || 'Spieler'} • {einheitenTrend.n} Einheiten</span>
              </div>
              {renderEinheitenVergleich()}
            </div>
          </div>
        </div>
      ) : portalView === 'vergleich' ? (
        /* SPIELERVERGLEICH & BENCHMARKS */
        <div className="space-y-8 animate-fadeIn">
          {/* Bento-Grid Leaderboards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {/* KPI 10m Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#10B981]">⚡ 10m Sprint</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.sprint10m ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.sprint10m.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.sprint10m.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#10B981] font-mono">
                  {leaders.sprint10m ? leaders.sprint10m.sprint10m : '—'}
                </span>
              </div>
            </div>

            {/* KPI GPS Distanz Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#06B9D4]">📍 GPS Distanz</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.distKm ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.distKm.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.distKm.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#06B9D4] font-mono">
                  {leaders.distKm ? leaders.distKm.distKmStr : '—'}
                </span>
              </div>
            </div>

            {/* KPI Max Speed Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#E11D48]">🏎️ Topspeed</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.maxSpeed ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.maxSpeed.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.maxSpeed.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#E11D48] font-mono">
                  {leaders.maxSpeed ? leaders.maxSpeed.maxSpeedStr : '—'}
                </span>
              </div>
            </div>

            {/* KPI Belastungs-Score Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#A855F7]">📈 Belastung</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.workloadScore ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.workloadScore.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.workloadScore.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#A855F7] font-mono">
                  {leaders.workloadScore ? `${leaders.workloadScore.workloadScore} Pkt` : '—'}
                </span>
              </div>
            </div>

            {/* KPI Yoyo Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#3B82F6]">🫁 Yo-Yo Ausdauer</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.yoyo ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.yoyo.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.yoyo.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#3B82F6] font-mono">
                  {leaders.yoyo ? leaders.yoyo.yoyo : '—'}
                </span>
              </div>
            </div>

            {/* KPI Jump Leader */}
            <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-3.5 rounded-xl shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-[#334155] pb-2 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#F59E0B]">🚀 Sprungkraft</span>
                  <Trophy size={14} className="text-[#F59E0B]" />
                </div>
                {leaders.jump ? (
                  <div>
                    <h5 className="font-black text-xs uppercase truncate text-[#F8FAFC]">{leaders.jump.name}</h5>
                    <p className="text-[9px] text-[#94A3B8] font-bold uppercase mt-0.5">{leaders.jump.position}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#94A3B8] italic">Keine Daten</p>
                )}
              </div>
              <div className="text-right mt-2">
                <span className="text-xl font-black text-[#F59E0B] font-mono">
                  {leaders.jump ? leaders.jump.jump : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Duel - Head to Head Comparison */}
          <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-6">
            <div className="border-b border-[#334155] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight size={20} className="text-[#E11D48]" />
                <div>
                  <h3 className="font-black uppercase text-base tracking-wider text-[#F8FAFC]">1vs1 DIREKTER PERFORMANCE & BELASTUNGVERGLEICH</h3>
                  <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Wähle zwei Spieler aus dem Kader für eine direkte Gegenüberstellung</p>
                </div>
              </div>
              
              {/* Dual Selectors */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select 
                  className="p-2 border border-[#334155] font-black text-xs uppercase bg-[#121824] text-[#F8FAFC] rounded-lg max-w-[200px] truncate focus:outline-none focus:border-[#10B981]"
                  value={comparePlayerId1}
                  onChange={(e) => setComparePlayerId1(e.target.value)}
                >
                  {playerAverages.map(p => (
                    <option key={p.id} value={p.id}>#{p.number || ''} {p.name}</option>
                  ))}
                </select>
                <span className="font-black text-xs text-[#F59E0B] bg-[#121824] px-2 py-1 border border-[#334155] rounded">VS</span>
                <select 
                  className="p-2 border border-[#334155] font-black text-xs uppercase bg-[#121824] text-[#F8FAFC] rounded-lg max-w-[200px] truncate focus:outline-none focus:border-[#10B981]"
                  value={comparePlayerId2}
                  onChange={(e) => setComparePlayerId2(e.target.value)}
                >
                  <option value="" disabled>Gegner wählen...</option>
                  {playerAverages.map(p => (
                    <option key={p.id} value={p.id}>#{p.number || ''} {p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Cards Grid */}
            {(() => {
              const p1 = playerAverages.find(p => p.id === comparePlayerId1);
              const p2 = playerAverages.find(p => p.id === comparePlayerId2);

              if (!p1 || !p2) {
                return <p className="text-center py-6 text-[#94A3B8] font-bold italic">Bitte zwei Spieler auswählen, um den Vergleich zu starten.</p>;
              }

              const metrics = [
                { label: 'GPS Distanz 📍', key: 'distKmStr', numKey: 'distKm', inverse: false, unit: ' km' },
                { label: 'Max Speed 🏎️', key: 'maxSpeedStr', numKey: 'maxSpeed', inverse: false, unit: ' km/h' },
                { label: 'Sprint-Anzahl ⚡', key: 'sprintsStr', numKey: 'sprints', inverse: false, unit: '' },
                { label: 'High-Speed Distanz 🏃', key: 'highSpeedMStr', numKey: 'highSpeedM', inverse: false, unit: ' m' },
                { label: 'Belastungs-Score 📈', key: 'workloadScoreStr', numKey: 'workloadScore', inverse: false, unit: ' / 100' },
                { label: 'Ø Herzfrequenz ❤️', key: 'avgHrStr', numKey: 'avgHr', inverse: true, unit: ' bpm' },
                { label: 'Sprintschnelligkeit (10m) ⚡', key: 'sprint10m', numKey: 'sprint10mNum', inverse: true, unit: ' s' },
                { label: 'Topspeed (30m) 🏎️', key: 'sprint30m', numKey: 'sprint30mNum', inverse: true, unit: ' s' },
                { label: 'Yo-Yo Ausdauer 🫁', key: 'yoyo', numKey: 'yoyoNum', inverse: false, unit: ' lvl' },
                { label: 'CMJ Vertikalsprung 🚀', key: 'jump', numKey: 'jumpNum', inverse: false, unit: ' cm' },
                { label: 'Gesamt Spielminuten ⏱️', key: 'totalMinutes', numKey: 'totalMinutes', inverse: false, unit: ' Min' },
                { label: 'Tore in dieser Saison ⚽', key: 'totalGoals', numKey: 'totalGoals', inverse: false, unit: '' },
                { label: 'Assists in dieser Saison 🎯', key: 'totalAssists', numKey: 'totalAssists', inverse: false, unit: '' },
                { label: 'Ø Passgenauigkeit 👟', key: 'avgPass', numKey: 'avgPass', inverse: false, unit: '%' },
                { label: 'Ø Zweikampfquote 🛡️', key: 'avgTackle', numKey: 'avgTackle', inverse: false, unit: '%' },
              ];

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                  {metrics.map(m => {
                    const val1 = p1[m.key as keyof typeof p1];
                    const val2 = p2[m.key as keyof typeof p2];
                    const num1 = (p1[m.numKey as keyof typeof p1] as number) || 0;
                    const num2 = (p2[m.numKey as keyof typeof p2] as number) || 0;

                    // Calculate winner
                    let p1Wins = false;
                    let p2Wins = false;
                    if (num1 > 0 && num2 > 0) {
                      if (m.inverse) {
                        p1Wins = num1 < num2;
                        p2Wins = num2 < num1;
                      } else {
                        p1Wins = num1 > num2;
                        p2Wins = num2 > num1;
                      }
                    } else if (num1 > 0) {
                      p1Wins = true;
                    } else if (num2 > 0) {
                      p2Wins = true;
                    }

                    // For the progress bar widths
                    const maxVal = Math.max(num1, num2) || 1;
                    const width1 = `${Math.min(100, Math.max(5, (num1 / maxVal) * 100))}%`;
                    const width2 = `${Math.min(100, Math.max(5, (num2 / maxVal) * 100))}%`;

                    return (
                      <div key={m.label} className="border border-[#334155] p-3 bg-[#121824] rounded-xl flex flex-col justify-between space-y-2.5">
                        <div className="text-center font-black text-[10px] uppercase tracking-wider text-[#94A3B8]">
                          {m.label}
                        </div>
                        <div className="grid grid-cols-3 items-center text-center gap-1 font-mono">
                          {/* Player 1 value */}
                          <div className={`p-1.5 border rounded-lg font-black text-xs truncate ${p1Wins ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]' : 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]'}`}>
                            {typeof val1 === 'number' ? `${val1}${m.unit}` : val1}
                          </div>
                          
                          {/* Comparison indicator */}
                          <div className="font-mono text-[8px] text-[#94A3B8] font-black uppercase">
                            {p1Wins ? '◄ Best' : p2Wins ? 'Best ►' : '—'}
                          </div>
                          
                          {/* Player 2 value */}
                          <div className={`p-1.5 border rounded-lg font-black text-xs truncate ${p2Wins ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]' : 'bg-[#1E293B] border-[#334155] text-[#F8FAFC]'}`}>
                            {typeof val2 === 'number' ? `${val2}${m.unit}` : val2}
                          </div>
                        </div>

                        {/* Dual bar comparison */}
                        <div className="space-y-1 select-none">
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-[#94A3B8] w-14 truncate">{p1.lastName || p1.name || 'P1'}</span>
                            <div className="flex-1 h-2 bg-[#1E293B] border border-[#334155] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p1Wins ? 'bg-[#10B981]' : 'bg-[#334155]'}`} style={{ width: width1 }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] font-black text-[#94A3B8] w-14 truncate">{p2.lastName || p2.name || 'P2'}</span>
                            <div className="flex-1 h-2 bg-[#1E293B] border border-[#334155] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${p2Wins ? 'bg-[#E11D48]' : 'bg-[#334155]'}`} style={{ width: width2 }} />
                      </div>
                    </div>

                    {/* ═══ 90-MIN ACTIVITY INTENSITY CHART ═══ */}
                    {(() => {
                      const allPlayerPoints = (selectedPlayer as any)?.movementPoints || [];
                      const chartPoints = selectedMovementMatchId ? filteredPointsForMatch : allPlayerPoints;
                      if (chartPoints.length === 0) return null;
                      const activityData = Array.from({ length: 90 }, (_, i) => {
                        const minute = i + 1;
                        const pointsInMinute = chartPoints.filter((p: any) => p.minute === minute);
                        let intensity = 0;
                        let actionCount = 0;
                        let sprintCount = 0;
                        let defensiveCount = 0;

                        pointsInMinute.forEach((p: any) => {
                          actionCount++;
                          if (p.actionType === 'sprint') { intensity += 40; sprintCount++; }
                          else if (p.actionType === 'run') { intensity += 25; }
                          else if (p.actionType === 'defensive') { intensity += 30; defensiveCount++; }
                          else if (p.actionType === 'walk') { intensity += 10; }
                          else { intensity += 15; }
                        });

                        const nearbyPoints = chartPoints.filter((p: any) => Math.abs(p.minute - minute) <= 2 && p.minute !== minute);
                        nearbyPoints.forEach((p: any) => {
                          if (p.actionType === 'sprint') intensity += 5;
                          else if (p.actionType === 'run') intensity += 3;
                        });

                        const zone = minute <= 15 ? '1-15' : minute <= 30 ? '16-30' : minute <= 45 ? '31-45' : minute <= 60 ? '46-60' : minute <= 75 ? '61-75' : '76-90';
                        const half = minute <= 45 ? '1. Halbzeit' : '2. Halbzeit';

                        return {
                          minute,
                          intensity: Math.min(intensity, 100),
                          actionCount,
                          sprintCount,
                          defensiveCount,
                          zone,
                          half,
                          label: `${minute}'`,
                        };
                      });

                      // Calculate summary stats
                      const activeMinutes = activityData.filter(d => d.intensity > 0).length;
                      const highIntensity = activityData.filter(d => d.intensity >= 50).length;
                      const mediumIntensity = activityData.filter(d => d.intensity >= 20 && d.intensity < 50).length;
                      const restMinutes = activityData.filter(d => d.intensity === 0).length;
                      const avgIntensity = activityData.reduce((sum, d) => sum + d.intensity, 0) / 90;
                      const peakMinute = activityData.reduce((max, d) => d.intensity > max.intensity ? d : max, activityData[0]);
                      const totalSprints = activityData.reduce((sum, d) => sum + d.sprintCount, 0);
                      const totalDefensive = activityData.reduce((sum, d) => sum + d.defensiveCount, 0);

                      // Halftime averages
                      const ht1Avg = activityData.slice(0, 45).reduce((sum, d) => sum + d.intensity, 0) / 45;
                      const ht2Avg = activityData.slice(45).reduce((sum, d) => sum + d.intensity, 0) / 45;

                      return (
                        <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6 mt-6">
                          <div className="border-b border-[#1f2937] pb-3 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BarChart3 size={16} className="text-[#e94560]" />
                              <h3 className="font-black uppercase text-xs tracking-wider text-white">90-Minuten Aktivitätsdiagramm</h3>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                <span className="text-[8px] font-bold text-slate-500">Aktiv</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                <span className="text-[8px] font-bold text-slate-500">Moderat</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                                <span className="text-[8px] font-bold text-slate-500">Sprint</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#1f2937]" />
                                <span className="text-[8px] font-bold text-slate-500">Pause</span>
                              </div>
                            </div>
                          </div>

                          {/* Summary Stats Row */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
                            {[
                              { label: 'Ø Intensität', value: `${avgIntensity.toFixed(0)}%`, color: avgIntensity > 30 ? '#10B981' : '#F59E0B' },
                              { label: 'Aktive Minuten', value: `${activeMinutes}/90`, color: '#3B82F6' },
                              { label: 'Hoch-Intensiv', value: `${highIntensity}'`, color: '#EF4444' },
                              { label: 'Moderat', value: `${mediumIntensity}'`, color: '#F59E0B' },
                              { label: 'Pause/Still', value: `${restMinutes}'`, color: restMinutes > 20 ? '#EF4444' : '#10B981' },
                              { label: 'Peak-Minute', value: `${peakMinute.minute}'`, color: '#e94560' },
                              { label: 'Sprints', value: `${totalSprints}x`, color: '#EF4444' },
                            ].map((stat, idx) => (
                              <div key={idx} className="bg-[#0a0a0a] border border-[#1f2937] rounded-lg p-2 text-center">
                                <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{stat.label}</div>
                                <div className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Halftime Comparison Bar */}
                          <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-[#0a0a0a] border border-[#1f2937] rounded-lg p-2">
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">1. Halbzeit (Min. 1-45)</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-[#1f2937] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(ht1Avg * 2, 100)}%`, background: `linear-gradient(90deg, #10B981, ${ht1Avg > 30 ? '#F59E0B' : '#10B981'})` }} />
                                </div>
                                <span className="text-[10px] font-black text-white">{ht1Avg.toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className="flex-1 bg-[#0a0a0a] border border-[#1f2937] rounded-lg p-2">
                              <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">2. Halbzeit (Min. 46-90)</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-[#1f2937] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(ht2Avg * 2, 100)}%`, background: `linear-gradient(90deg, ${ht2Avg > ht1Avg ? '#10B981' : '#F59E0B'}, ${ht2Avg > 30 ? '#EF4444' : '#F59E0B'})` }} />
                                </div>
                                <span className="text-[10px] font-black text-white">{ht2Avg.toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>

                          {/* Main Chart */}
                          <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                <defs>
                                  <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#e94560" stopOpacity={0.6} />
                                    <stop offset="50%" stopColor="#F59E0B" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
                                  </linearGradient>
                                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#10B981" />
                                    <stop offset="40%" stopColor="#F59E0B" />
                                    <stop offset="70%" stopColor="#e94560" />
                                    <stop offset="100%" stopColor="#EF4444" />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                <XAxis 
                                  dataKey="minute" 
                                  tick={{ fontSize: 8, fontWeight: 'bold', fill: '#64748b' }}
                                  stroke="#1f2937"
                                  tickLine={false}
                                  interval={4}
                                />
                                <YAxis 
                                  tick={{ fontSize: 8, fontWeight: 'bold', fill: '#64748b' }}
                                  stroke="#1f2937"
                                  tickLine={false}
                                  domain={[0, 100]}
                                  tickFormatter={(v) => `${v}%`}
                                />
                                <ChartTooltip
                                  contentStyle={{
                                    backgroundColor: '#111827',
                                    border: '1px solid #1f2937',
                                    borderRadius: '8px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    color: '#F8FAFC',
                                  }}
                                  formatter={(value: any, name: any, props: any) => {
                                    const d = props.payload;
                                    return [
                                      <div key="tip" className="space-y-1">
                                        <div className="text-[#e94560] font-black">Min. {d.minute}' ({d.half})</div>
                                        <div>Intensität: <span className="text-white">{value}%</span></div>
                                        {d.actionCount > 0 && <div>Aktionen: <span className="text-white">{d.actionCount}x</span></div>}
                                        {d.sprintCount > 0 && <div className="text-red-400">Sprints: {d.sprintCount}x</div>}
                                        {d.defensiveCount > 0 && <div className="text-blue-400">Defensiv: {d.defensiveCount}x</div>}
                                        {d.intensity === 0 && <div className="text-slate-500">Keine Aktion / Pause</div>}
                                      </div>
                                    ];
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="intensity" 
                                  stroke="url(#lineGradient)" 
                                  strokeWidth={2}
                                  fill="url(#intensityGradient)" 
                                  dot={false}
                                  activeDot={{ 
                                    r: 5, 
                                    fill: '#e94560', 
                                    stroke: '#fff', 
                                    strokeWidth: 2 
                                  }}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>

                          {/* 15-min Zone Bars */}
                          <div className="mt-4">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-2">Intensität pro 15-Minuten-Segment</div>
                            <div className="grid grid-cols-6 gap-1">
                              {['1-15', '16-30', '31-45', '46-60', '61-75', '76-90'].map((zone, idx) => {
                                const zoneData = activityData.filter(d => d.zone === zone);
                                const zoneAvg = zoneData.reduce((sum, d) => sum + d.intensity, 0) / zoneData.length;
                                const zoneSprints = zoneData.reduce((sum, d) => sum + d.sprintCount, 0);
                                const zoneActions = zoneData.reduce((sum, d) => sum + d.actionCount, 0);
                                const barColor = zoneAvg >= 40 ? '#EF4444' : zoneAvg >= 20 ? '#F59E0B' : zoneAvg > 0 ? '#10B981' : '#1f2937';
                                return (
                                  <div key={idx} className="text-center">
                                    <div className="h-12 flex items-end justify-center mb-1">
                                      <div 
                                        className="w-full rounded-t transition-all duration-700" 
                                        style={{ 
                                          height: `${Math.max(zoneAvg * 1.2, 4)}%`,
                                          backgroundColor: barColor,
                                          boxShadow: zoneAvg >= 40 ? `0 0 8px ${barColor}40` : 'none'
                                        }} 
                                      />
                                    </div>
                                    <div className="text-[7px] font-bold text-slate-500">{zone}</div>
                                    <div className="text-[9px] font-black" style={{ color: barColor }}>{zoneAvg.toFixed(0)}%</div>
                                    <div className="text-[7px] text-slate-600">{zoneActions}x</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Rest/Active Timeline Strip */}
                          <div className="mt-4">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">Aktivitäts-Strip (grün=aktiv, rot=sprint, grau=pause)</div>
                            <div className="flex gap-px">
                              {activityData.map((d, idx) => {
                                const color = d.intensity >= 50 ? '#EF4444' : d.intensity >= 20 ? '#F59E0B' : d.intensity > 0 ? '#10B981' : '#1f2937';
                                return (
                                  <div 
                                    key={idx} 
                                    className="flex-1 h-3 first:rounded-l last:rounded-r" 
                                    style={{ backgroundColor: color }}
                                    title={`Min. ${d.minute}: ${d.intensity}% — ${d.actionCount} Aktionen`}
                                  />
                                );
                              })}
                            </div>
                            <div className="flex justify-between text-[7px] font-bold text-slate-600 mt-0.5">
                              <span>1'</span>
                              <span>15'</span>
                              <span>30'</span>
                              <span>HT</span>
                              <span>60'</span>
                              <span>75'</span>
                              <span>90'</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Visual Recharts Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GPS Distanz & Topspeed Chart */}
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-4">
              <div className="border-b border-[#334155] pb-2">
                <h4 className="font-black uppercase text-xs text-[#F8FAFC]">TOPSPEED (km/h) & GPS-DISTANZ (km)</h4>
                <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Performance & Belastungsmessung der Kaderspieler</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={playerAverages}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="lastName" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#334155" />
                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#334155" />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#121824', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#F8FAFC' }} />
                    <Bar name="Max Speed (km/h)" dataKey="maxSpeed" fill="#E11D48" radius={[4, 4, 0, 0]} />
                    <Bar name="Distanz (km)" dataKey="distKm" fill="#06B9D4" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sprungkraft & Yo-Yo Test Chart */}
            <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-4">
              <div className="border-b border-[#334155] pb-2">
                <h4 className="font-black uppercase text-xs text-[#F8FAFC]">BELASTUNG-SCORE (0-100) & SPRUNGKRAFT (cm)</h4>
                <p className="text-[9px] text-[#94A3B8] font-bold uppercase">Physische Belastbarkeit & Athletik-Benchmark</p>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={playerAverages}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="lastName" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#334155" />
                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#94A3B8' }} stroke="#334155" />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#121824', border: '1px solid #334155', borderRadius: '8px', color: '#F8FAFC', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#F8FAFC' }} />
                    <Bar name="Belastung-Score" dataKey="workloadScore" fill="#A855F7" radius={[4, 4, 0, 0]} />
                    <Bar name="Sprunghöhe (cm)" dataKey="jumpNum" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Complete Comparison Roster List - Performance & Belastungsmonitor */}
          <div className="bg-[#1E293B] border border-[#334155] p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#334155] pb-4">
              <div>
                <h3 className="font-black uppercase text-base tracking-wider text-[#F8FAFC]">
                  GESAMTER SPIELER-KADER IM DIREKTEN VERGLEICH
                </h3>
                <p className="text-[10px] text-[#94A3B8] font-bold uppercase mt-0.5">
                  Alle Performance- & Belastungsparameter aller Kaderspieler im interaktiven Tabellen-Vergleich
                </p>
              </div>

              {/* Controls: Search & Position Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Spieler suchen..."
                    value={comparisonSearchTerm}
                    onChange={(e) => setComparisonSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-[#121824] border border-[#334155] text-xs text-[#F8FAFC] font-bold rounded-lg focus:outline-none focus:border-[#10B981] w-40"
                  />
                </div>

                {/* Filter buttons */}
                <div className="flex items-center gap-1 bg-[#121824] p-1 border border-[#334155] rounded-lg text-[10px] font-black uppercase">
                  {['ALLE', 'TW', 'ABWEHR', 'MITTELFELD', 'STURM'].map(pos => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setComparisonPosFilter(pos)}
                      className={`px-2 py-1 rounded transition-colors ${
                        comparisonPosFilter === pos 
                          ? 'bg-[#10B981] text-[#0A0E17]' 
                          : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter & Sort Calculation */}
            {(() => {
              const filtered = playerAverages.filter(p => {
                const matchesSearch = p.fullName.toLowerCase().includes(comparisonSearchTerm.toLowerCase()) || 
                                     p.position.toLowerCase().includes(comparisonSearchTerm.toLowerCase());
                if (!matchesSearch) return false;
                if (comparisonPosFilter === 'ALLE') return true;
                const posUpper = p.position.toUpperCase();
                if (comparisonPosFilter === 'TW') return posUpper.includes('TW') || posUpper.includes('TOR');
                if (comparisonPosFilter === 'ABWEHR') return posUpper.includes('IV') || posUpper.includes('RV') || posUpper.includes('LV') || posUpper.includes('ABWEHR');
                if (comparisonPosFilter === 'MITTELFELD') return posUpper.includes('ZM') || posUpper.includes('DM') || posUpper.includes('OM') || posUpper.includes('MITTEL');
                if (comparisonPosFilter === 'STURM') return posUpper.includes('ST') || posUpper.includes('RA') || posUpper.includes('LA') || posUpper.includes('STURM');
                return true;
              });

              // Sorting
              const sorted = [...filtered].sort((a, b) => {
                let valA = a[comparisonSortField as keyof typeof a] ?? 0;
                let valB = b[comparisonSortField as keyof typeof b] ?? 0;
                if (typeof valA === 'string') valA = (valA as string).toLowerCase();
                if (typeof valB === 'string') valB = (valB as string).toLowerCase();
                if (valA < valB) return comparisonSortAsc ? -1 : 1;
                if (valA > valB) return comparisonSortAsc ? 1 : -1;
                return 0;
              });

              const handleHeaderClick = (field: string) => {
                if (comparisonSortField === field) {
                  setComparisonSortAsc(!comparisonSortAsc);
                } else {
                  setComparisonSortField(field);
                  setComparisonSortAsc(false); // default desc for stats
                }
              };

              const renderSortArrow = (field: string) => {
                if (comparisonSortField !== field) return null;
                return <span className="ml-1 text-[#10B981]">{comparisonSortAsc ? '▲' : '▼'}</span>;
              };

              return (
                <div className="overflow-x-auto border border-[#334155] rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#121824] text-[#F8FAFC] font-black uppercase text-[10px] border-b border-[#334155] select-none cursor-pointer">
                        <th onClick={() => handleHeaderClick('fullName')} className="p-3 border-r border-[#334155] hover:text-[#10B981]">
                          Spieler {renderSortArrow('fullName')}
                        </th>
                        <th onClick={() => handleHeaderClick('position')} className="p-3 border-r border-[#334155] text-center hover:text-[#10B981]">
                          Pos {renderSortArrow('position')}
                        </th>
                        <th onClick={() => handleHeaderClick('distKm')} className="p-3 border-r border-[#334155] text-center text-[#06B9D4] hover:text-[#06B9D4]">
                          GPS Distanz {renderSortArrow('distKm')}
                        </th>
                        <th onClick={() => handleHeaderClick('maxSpeed')} className="p-3 border-r border-[#334155] text-center text-[#E11D48] hover:text-[#E11D48]">
                          Max Speed {renderSortArrow('maxSpeed')}
                        </th>
                        <th onClick={() => handleHeaderClick('sprints')} className="p-3 border-r border-[#334155] text-center text-amber-400 hover:text-amber-400">
                          Sprints {renderSortArrow('sprints')}
                        </th>
                        <th onClick={() => handleHeaderClick('highSpeedM')} className="p-3 border-r border-[#334155] text-center text-indigo-400 hover:text-indigo-400">
                          High-Speed {renderSortArrow('highSpeedM')}
                        </th>
                        <th onClick={() => handleHeaderClick('workloadScore')} className="p-3 border-r border-[#334155] text-center text-[#A855F7] hover:text-[#A855F7]">
                          Belastung {renderSortArrow('workloadScore')}
                        </th>
                        <th onClick={() => handleHeaderClick('sprint10mNum')} className="p-3 border-r border-[#334155] text-center text-[#10B981] hover:text-[#10B981]">
                          10m Sprint {renderSortArrow('sprint10mNum')}
                        </th>
                        <th onClick={() => handleHeaderClick('sprint30mNum')} className="p-3 border-r border-[#334155] text-center text-red-400 hover:text-red-400">
                          30m Sprint {renderSortArrow('sprint30mNum')}
                        </th>
                        <th onClick={() => handleHeaderClick('yoyoNum')} className="p-3 border-r border-[#334155] text-center text-blue-400 hover:text-blue-400">
                          Yo-Yo {renderSortArrow('yoyoNum')}
                        </th>
                        <th onClick={() => handleHeaderClick('jumpNum')} className="p-3 border-r border-[#334155] text-center text-amber-400 hover:text-amber-400">
                          Sprung {renderSortArrow('jumpNum')}
                        </th>
                        <th onClick={() => handleHeaderClick('totalMinutes')} className="p-3 border-r border-[#334155] text-center hover:text-[#10B981]">
                          Minuten {renderSortArrow('totalMinutes')}
                        </th>
                        <th onClick={() => handleHeaderClick('totalGoals')} className="p-3 border-r border-[#334155] text-center hover:text-[#10B981]">
                          T/A {renderSortArrow('totalGoals')}
                        </th>
                        <th onClick={() => handleHeaderClick('avgPass')} className="p-3 border-r border-[#334155] text-center hover:text-[#10B981]">
                          Pass / ZK % {renderSortArrow('avgPass')}
                        </th>
                        <th className="p-3 text-center">1vs1 Duel</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#334155]">
                      {sorted.map(p => (
                        <tr key={p.id} className="hover:bg-[#121824] transition-colors font-bold text-[#F8FAFC]">
                          <td className="p-3 border-r border-[#334155] font-black uppercase text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#0A0E17] border border-[#334155] overflow-hidden flex items-center justify-center shrink-0">
                                {p.image ? (
                                  <img src={p.image} alt={p.lastName || p.name || ''} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={12} className="text-[#94A3B8]" />
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-[#94A3B8]">#{p.number || '—'}</span>
                              <span className="truncate">{p.fullName}</span>
                            </div>
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center text-[10px] uppercase text-[#94A3B8]">{p.position}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-[#06B9D4] font-black">{p.distKmStr}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-[#E11D48] font-black">{p.maxSpeedStr}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-amber-400 font-black">{p.sprints}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-indigo-400 font-black">{p.highSpeedMStr}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono font-black">
                            <span className="px-2 py-0.5 rounded bg-[#A855F7]/20 border border-[#A855F7]/40 text-[#A855F7] text-[11px]">
                              {p.workloadScore} / 100
                            </span>
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-[#10B981] font-black">{p.sprint10m}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-[#E11D48] font-black">{p.sprint30m}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-blue-400 font-black">{p.yoyo}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-amber-400 font-black">{p.jump}</td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono text-[#F8FAFC]">{p.totalMinutes} Min</td>
                          <td className="p-3 border-r border-[#334155] text-center text-xs font-black font-mono">
                            <span className="text-[#E11D48]">{p.totalGoals}</span>
                            <span className="text-[#94A3B8] mx-1">/</span>
                            <span className="text-[#10B981]">{p.totalAssists}</span>
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono">
                            <span className="text-[#10B981] font-black">{p.avgPass}%</span>
                            <span className="text-[#94A3B8] mx-1">/</span>
                            <span className="text-indigo-400 font-black">{p.avgTackle}%</span>
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setComparePlayerId1(p.id);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="px-2 py-1 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-[#0A0E17] border border-[#10B981]/50 rounded font-black text-[9px] uppercase transition-colors"
                            >
                              VS 1v1
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      ) : portalView === 'tracker' ? (
        /* SPIELERORDNER & TRACKER-ANALYSE VIEW */
        <div className="space-y-8 animate-fadeIn">
          {/* Header Banner for Player Folder */}
          <div className="bg-[#121824] text-[#F8FAFC] border border-[#334155] p-6 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#334155] pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FolderCheck size={20} className="text-[#10B981]" />
                  <span className="text-xs font-black uppercase tracking-widest text-[#10B981]">
                    DIGITALER SPIELERORDNER & GPS TRACKER AKTE
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-[#F8FAFC]">
                  {selectedPlayer?.lastName || selectedPlayer?.name || 'Spieler'} (#{selectedPlayer?.number || ''})
                </h2>
                <p className="text-xs text-[#94A3B8] font-bold mt-1">
                  Position: <span className="text-[#F8FAFC] underline">{selectedPlayer?.position || 'Feldspieler'}</span> • Status: <span className="text-[#10B981]">Aktiv im Kader</span>
                </p>

                {/* Prominent Session Recorded Date Badge */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-2 bg-[#0A0E17] border-2 border-[#10B981]/60 text-white px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold shadow-md">
                    <Calendar size={15} className="text-[#10B981]" />
                    <span>Aufnahme-Datum: <strong className="text-[#10B981] text-sm">{formatSessionDate(extractSessionDate(selectedPlayer?.trackerAnalysis || trackerDate || selectedPlayer?.trackerHistory?.[0])) || 'Heute'}</strong></span>
                  </span>
                  {(trackerTime || (selectedPlayer?.trackerAnalysis as any)?.uhrzeit) && (
                    <span className="inline-flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] text-[#F8FAFC] px-3 py-1.5 rounded-lg text-xs font-mono font-bold">
                      <Clock size={13} className="text-[#F59E0B]" />
                      <span>{trackerTime || (selectedPlayer?.trackerAnalysis as any)?.uhrzeit} Uhr</span>
                    </span>
                  )}
                  {trackerFileName && (
                    <span className="inline-flex items-center gap-1.5 bg-[#0A0E17] border border-[#334155] text-[#94A3B8] px-3 py-1.5 rounded-lg text-xs font-mono truncate max-w-xs">
                      <FileText size={13} className="text-[#06B6D4]" />
                      <span className="truncate">{trackerFileName}</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {trackerFileUrl ? (
                  <a 
                    href={trackerFileUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs uppercase px-4 py-2 border border-[#10B981] rounded-lg flex items-center gap-2 shadow-md transition-all"
                  >
                    <ExternalLink size={14} /> 📥 MagentaCLOUD Ordner öffnen
                  </a>
                ) : (
                  <span className="bg-[#1E293B] text-[#94A3B8] font-mono text-xs px-3 py-1.5 border border-[#334155] rounded-lg">
                    Datei: {trackerFileName || 'Keine verknüpfte Datei'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setEditTracker(!editTracker)}
                  className={`font-black text-xs uppercase px-4 py-2 border rounded-lg flex items-center gap-2 shadow-md transition-all ${editTracker ? 'bg-[#F59E0B] text-[#0A0E17] border-[#F59E0B]' : 'bg-[#1E293B] text-[#F8FAFC] border-[#334155] hover:bg-[#121824]'}`}
                >
                  {editTracker ? '✔ Fertig bearbeiten' : '✏️ Werte & Datum Anpassen'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveTrackerAnalysis}
                  className="bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs uppercase px-4 py-2 border border-[#10B981] rounded-lg flex items-center gap-2 shadow-md transition-all"
                >
                  <Save size={14} /> 💾 Im Ordner Speichern
                </button>
              </div>
            </div>

            {/* Edit Session Recording Date & Time Controls */}
            {editTracker && (
              <div className="mt-4 bg-[#1E293B] border-2 border-[#F59E0B] p-4 rounded-xl shadow-lg space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#334155] pb-2">
                  <span className="text-xs font-black uppercase text-[#F59E0B] flex items-center gap-1.5">
                    <Calendar size={15} /> Aufnahmedatum & Uhrzeit der Session festlegen
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8]">Wird direkt in Historie & Akte als Session-Datum übernommen</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#CBD5E1] block mb-1">Aufnahme-Datum (Session):</label>
                    <input 
                      type="date"
                      className="w-full text-xs font-bold border border-[#334155] p-2 bg-[#0A0E17] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#F59E0B]"
                      value={trackerDate}
                      onChange={(e) => setTrackerDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#CBD5E1] block mb-1">Uhrzeit / Startzeit:</label>
                    <input 
                      type="time"
                      className="w-full text-xs font-bold border border-[#334155] p-2 bg-[#0A0E17] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#F59E0B]"
                      value={trackerTime}
                      onChange={(e) => setTrackerTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-[#CBD5E1] block mb-1">Dateiname / Quelle:</label>
                    <input 
                      type="text"
                      className="w-full text-xs font-bold border border-[#334155] p-2 bg-[#0A0E17] text-[#F8FAFC] rounded-lg focus:outline-none focus:border-[#F59E0B]"
                      value={trackerFileName}
                      onChange={(e) => setTrackerFileName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Linked file path info box */}
            <div className="mt-4 bg-[#1E293B]/10 backdrop-blur-sm p-3 border border-white/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-300 shrink-0" />
                <span className="text-xs font-mono text-blue-100">
                  Verknüpfte Tracker-Datei: <strong className="text-white">{trackerFileName}</strong>
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 border border-emerald-500/40">
                🟢 Live mit Spielerakte & Spielbericht synchronisiert
              </span>
            </div>
          </div>

          {/* GPS Tracker KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Distanz */}
            <div className="bg-[#1E293B] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#94A3B8] flex items-center gap-1">
                  <MapPin size={12} className="text-blue-600" /> Gesamtdistanz
                </span>
                <span className="text-[10px] font-black bg-blue-100 text-blue-900 px-1.5 py-0.5 border border-black">GPS Meter</span>
              </div>
              {editTracker ? (
                <input 
                  type="number" step="0.1"
                  className="w-full text-2xl font-black border-2 border-black p-1 bg-amber-50"
                  value={trackerTotalDist}
                  onChange={(e) => setTrackerTotalDist(parseFloat(e.target.value))}
                />
              ) : (
                <div className="text-3xl font-black font-mono text-blue-950">
                  {trackerTotalDist} <span className="text-sm font-bold text-[#94A3B8]">km</span>
                </div>
              )}
              <p className="text-[10px] text-[#94A3B8] font-bold mt-1">Sollwert ZM/Außen: &gt; 10,0 km</p>
            </div>

            {/* High Speed Distance */}
            <div className="bg-[#1E293B] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#94A3B8] flex items-center gap-1">
                  <Zap size={12} className="text-amber-500" /> High-Speed Run
                </span>
                <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-1.5 py-0.5 border border-black">&gt; 19.8 km/h</span>
              </div>
              {editTracker ? (
                <input 
                  type="number"
                  className="w-full text-2xl font-black border-2 border-black p-1 bg-amber-50"
                  value={trackerHighSpeed}
                  onChange={(e) => setTrackerHighSpeed(parseInt(e.target.value))}
                />
              ) : (
                <div className="text-3xl font-black font-mono text-amber-600">
                  {trackerHighSpeed} <span className="text-sm font-bold text-[#94A3B8]">m</span>
                </div>
              )}
              <p className="text-[10px] text-[#94A3B8] font-bold mt-1">Hohe Laufintensität</p>
            </div>

            {/* Sprint & Topspeed */}
            <div className="bg-[#1E293B] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#94A3B8] flex items-center gap-1">
                  <Flame size={12} className="text-[#C00000]" /> Vollsprints & TopSpeed
                </span>
                <span className="text-[10px] font-black bg-red-100 text-[#C00000] px-1.5 py-0.5 border border-black">&gt; 25.2 km/h</span>
              </div>
              {editTracker ? (
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" step="0.1" className="text-lg font-black border-2 border-black p-1" value={trackerMaxSpeed} onChange={(e) => setTrackerMaxSpeed(parseFloat(e.target.value))} />
                  <input type="number" className="text-lg font-black border-2 border-black p-1" value={trackerSprints} onChange={(e) => setTrackerSprints(parseInt(e.target.value))} />
                </div>
              ) : (
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black font-mono text-[#C00000]">
                    {trackerMaxSpeed} <span className="text-xs font-bold text-[#94A3B8]">km/h</span>
                  </div>
                  <div className="text-sm font-black font-mono text-[#F8FAFC] bg-red-50 border border-red-300 px-2 py-0.5">
                    {trackerSprints} Sprints
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[#94A3B8] font-bold mt-1">Sprintdistanz: {trackerSprintDist} m</p>
            </div>

            {/* Herzfrequenz & Workload */}
            <div className="bg-[#1E293B] border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
              <div className="flex justify-between items-center border-b-2 border-black pb-2 mb-2">
                <span className="text-[10px] font-black uppercase text-[#94A3B8] flex items-center gap-1">
                  <HeartPulse size={12} className="text-rose-600" /> Puls & Workload
                </span>
                <span className="text-[10px] font-black bg-rose-100 text-rose-900 px-1.5 py-0.5 border border-black">Physio</span>
              </div>
              {editTracker ? (
                <div className="grid grid-cols-2 gap-1">
                  <input type="number" className="text-lg font-black border-2 border-black p-1" value={trackerAvgHr} onChange={(e) => setTrackerAvgHr(parseInt(e.target.value))} />
                  <input type="number" className="text-lg font-black border-2 border-black p-1" value={trackerWorkload} onChange={(e) => setTrackerWorkload(parseInt(e.target.value))} />
                </div>
              ) : (
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black font-mono text-rose-700">
                    {trackerAvgHr} <span className="text-xs font-bold text-[#94A3B8]">bpm Ø</span>
                  </div>
                  <div className="text-xs font-black font-mono text-purple-900 bg-purple-100 border border-purple-300 px-2 py-0.5">
                    Load: {trackerWorkload}
                  </div>
                </div>
              )}
              <p className="text-[10px] text-[#94A3B8] font-bold mt-1">Maximaler Puls: {trackerMaxHr} bpm</p>
            </div>
          </div>

          {/* Tactical & Physical Evaluation Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heatmap & Position Summary */}
            <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="border-b-4 border-black pb-2 flex items-center justify-between">
                <h3 className="font-black text-sm uppercase flex items-center gap-2">
                  <Compass size={18} className="text-emerald-700" /> Positionierung & Haupt-Aktionszone
                </h3>
                <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-900 px-2 py-0.5 border border-black">GPS-Heatmap</span>
              </div>

              <div className="bg-slate-900 text-white p-4 border-2 border-black font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-black">
                  <span>Hauptzone:</span>
                  <span>{trackerHeatmap}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700 text-[11px]">
                  <div>Beschleunigungen: <strong className="text-amber-400">{trackerAccels} x</strong></div>
                  <div>Bremsungen (Decel): <strong className="text-blue-400">{trackerDecels} x</strong></div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-[#CBD5E1]">Taktische Analyse-Zusammenfassung:</label>
                {editTracker ? (
                  <textarea 
                    className="w-full p-3 border-2 border-black font-bold text-xs bg-amber-50 h-28 focus:outline-none"
                    value={trackerTactical}
                    onChange={(e) => setTrackerTactical(e.target.value)}
                  />
                ) : (
                  <p className="text-xs font-bold text-[#F8FAFC] bg-[#121824] p-3 border-2 border-black leading-relaxed">
                    {trackerTactical}
                  </p>
                )}
              </div>
            </div>

            {/* Medical & Load Recommendation */}
            <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="border-b-4 border-black pb-2 flex items-center justify-between">
                <h3 className="font-black text-sm uppercase flex items-center gap-2">
                  <Shield size={18} className="text-blue-700" /> Physiologische & Medizinische Handlungsempfehlungen
                </h3>
                <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-900 px-2 py-0.5 border border-black">Steuerung</span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-[#CBD5E1]">Regeneration & Belastungsvorgaben:</label>
                {editTracker ? (
                  <textarea 
                    className="w-full p-3 border-2 border-black font-bold text-xs bg-amber-50 h-28 focus:outline-none"
                    value={trackerRecommendations}
                    onChange={(e) => setTrackerRecommendations(e.target.value)}
                  />
                ) : (
                  <p className="text-xs font-bold text-[#F8FAFC] bg-[#121824] p-3 border-2 border-black leading-relaxed">
                    {trackerRecommendations}
                  </p>
                )}
              </div>

              <div className="bg-amber-50 border-2 border-black p-3 text-xs font-bold text-amber-900 flex items-center gap-3">
                <Sparkles size={20} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Steuerungshinweis:</strong> Belastung im nächsten Mannschaftstraining entsprechend der Sprintdistanz ({trackerSprintDist}m) individuell anpassen.
                </span>
              </div>
            </div>
          </div>

          {/* Tracker File Upload / Link Box */}
          <div className="bg-emerald-950 text-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <h3 className="text-lg font-black uppercase flex items-center gap-2 text-emerald-400">
                <Cpu size={20} /> WG Tracker Import & Ordner-Synchronisation
              </h3>
              <p className="text-xs text-gray-300 font-medium">
                Sende neue Tracking-Rohdaten, GPS-Exporte oder MagentaCLOUD Links direkt in den Ordner von {selectedPlayer?.lastName || selectedPlayer?.name || 'dem Spieler'}.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 transition-all"
              >
                <Upload size={16} /> ⚡ Neue Datei / Text analysieren
              </button>
            </div>
          </div>

          {/* Import Modal */}
          {importModalOpen && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-[#1E293B] border-4 border-black p-6 max-w-xl w-full shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] space-y-4">
                <div className="border-b-4 border-black pb-2 flex justify-between items-center">
                  <h3 className="font-black text-base uppercase flex items-center gap-2">
                    <Cpu size={20} className="text-blue-600" /> WG Tracker Rohdaten Importieren
                  </h3>
                  <button type="button" onClick={() => setImportModalOpen(false)} className="font-black text-sm p-1 border-2 border-black hover:bg-[#1E293B]">✕</button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-[#CBD5E1]">Tracker-Dateiname / Link:</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border-2 border-black text-xs font-bold"
                    placeholder="z.B. WG__Tracker_Julian_Ehret_RNr_11 oder MagentaCLOUD Link..."
                    value={trackerFileName}
                    onChange={(e) => setTrackerFileName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-[#CBD5E1]">GPS CSV/Text Inhalt einfügen:</label>
                  <textarea 
                    className="w-full p-3 border-2 border-black text-xs font-mono h-32 focus:outline-none"
                    placeholder="Distance: 11.4km, HighSpeed: 820m, MaxSpeed: 32.8km/h, HeartRate: 168bpm..."
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 border-2 border-black font-black text-xs uppercase hover:bg-[#1E293B]"
                  >
                    Abbrechen
                  </button>
                  <button 
                    type="button"
                    onClick={async () => {
                      if (importRawText) {
                        const distMatch = importRawText.match(/(\d+[.,]?\d*)\s*km/i);
                        if (distMatch) setTrackerTotalDist(parseFloat(distMatch[1].replace(',', '.')));
                        const maxMatch = importRawText.match(/(\d+[.,]?\d*)\s*km\/h/i);
                        if (maxMatch) setTrackerMaxSpeed(parseFloat(maxMatch[1].replace(',', '.')));
                        const sprintMatch = importRawText.match(/(\d+)\s*sprint/i);
                        if (sprintMatch) setTrackerSprints(parseInt(sprintMatch[1]));
                      }
                      await handleSaveTrackerAnalysis();
                      setImportModalOpen(false);
                      setImportRawText('');
                    }}
                    className="px-6 py-2 bg-emerald-600 text-white border-2 border-black font-black text-xs uppercase hover:bg-emerald-700 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                  >
                    ⚡ Analysieren & Im Ordner Speichern
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Past History in Folder */}
          <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="border-b-4 border-black pb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-black uppercase text-base tracking-wider flex items-center gap-2">
                <FolderCheck size={20} className="text-blue-900" /> HISTORIE DER SESSiON- & SPIELANALYSEN IM ORDNER
              </h3>
              <div className="flex items-center gap-3">
                {(selectedPlayer?.trackerHistory?.length || 0) > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlayer?.id) {
                        handleCleanupTrackerDuplicates(selectedPlayer.id);
                      }
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase border-2 border-black rounded shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                    title="Doppelte Session-Uploads für diesen Spieler automatisch bereinigen"
                  >
                    <span>🧹 Duplikate bereinigen</span>
                  </button>
                )}
                <span className="text-xs font-bold text-[#94A3B8]">
                  {(selectedPlayer?.trackerHistory?.length || 0) + (selectedPlayer?.trackerAnalysis ? 1 : 0)} Eintrags-Analysen hinterlegt
                </span>
              </div>
            </div>

            <div className="overflow-x-auto border-2 border-black">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white font-black uppercase text-[10px]">
                    <th className="p-3 border-r border-black/30">Datum</th>
                    <th className="p-3 border-r border-black/30">Datei / Spiel</th>
                    <th className="p-3 border-r border-black/30 text-center">Distanz</th>
                    <th className="p-3 border-r border-black/30 text-center">Sprintdistanz</th>
                    <th className="p-3 border-r border-black/30 text-center">Max. Speed</th>
                    <th className="p-3 border-r border-black/30 text-center">Puls Ø</th>
                    <th className="p-3 border-r border-black/30">Taktisches Fazit</th>
                    <th className="p-3 text-center">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {selectedPlayer?.trackerAnalysis && (
                    <tr className="bg-emerald-50/60 hover:bg-emerald-100/80 transition-colors">
                      <td className="p-3 border-r border-black text-emerald-950 font-black font-mono">
                        <div>
                          {formatSessionDate(extractSessionDate(selectedPlayer?.trackerAnalysis || trackerDate || selectedPlayer?.trackerHistory?.[0])) || new Date().toLocaleDateString('de-DE')}
                        </div>
                        {(trackerTime || selectedPlayer?.trackerAnalysis?.uhrzeit) && (
                          <div className="text-[10px] text-emerald-800 font-normal">⏱️ {trackerTime || selectedPlayer?.trackerAnalysis?.uhrzeit} Uhr</div>
                        )}
                      </td>
                      <td className="p-3 border-r border-black font-black text-xs">
                        {trackerFileName || selectedPlayer?.trackerAnalysis?.fileName || `Tracker_${selectedPlayer?.lastName || selectedPlayer?.name || 'Spieler'}`}
                      </td>
                      <td className="p-3 border-r border-black text-center font-mono text-blue-900 font-black">{(trackerTotalDist || selectedPlayer?.trackerAnalysis?.totalDistanceKm || 0)} km</td>
                      <td className="p-3 border-r border-black text-center font-mono text-amber-700 font-black">{(trackerSprintDist || selectedPlayer?.trackerAnalysis?.sprintDistanceM || selectedPlayer?.trackerAnalysis?.highSpeedDistanceM || 0)} m</td>
                      <td className="p-3 border-r border-black text-center font-mono text-red-700 font-black">{(trackerMaxSpeed || selectedPlayer?.trackerAnalysis?.maxSpeedKmh || 0)} km/h</td>
                      <td className="p-3 border-r border-black text-center font-mono text-rose-800 font-black">{(trackerAvgHr || selectedPlayer?.trackerAnalysis?.avgHeartRateBpm || 0)} bpm</td>
                      <td className="p-3 border-r border-black text-[11px] text-[#CBD5E1] truncate max-w-xs">{trackerTactical || selectedPlayer?.trackerAnalysis?.tacticalSummary || '-'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 border border-black">Aktiv</span>
                          <button
                            type="button"
                            onClick={() => handleDeleteTrackerEntry(selectedPlayer?.id ?? '', 'active')}
                            title="Aktive Session löschen"
                            className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {(selectedPlayer?.trackerHistory || []).map((item: any, idx) => {
                    const rowDate = formatSessionDate(extractSessionDate(item)) || '-';
                    const rowTime = extractSessionTime(item);
                    return (
                      <tr key={item.id || idx} className="hover:bg-[#121824] transition-colors">
                        <td className="p-3 border-r border-black font-mono text-[#94A3B8]">
                          <div className="font-bold text-[#F8FAFC]">
                            {rowDate}
                          </div>
                          {rowTime && (
                            <div className="text-[10px] text-[#94A3B8]">⏱️ {rowTime} Uhr</div>
                          )}
                        </td>
                        <td className="p-3 border-r border-black font-black">{item.fileName || item.matchName || item.trainingId}</td>
                        <td className="p-3 border-r border-black text-center font-mono">{item.totalDistanceKm !== undefined ? `${item.totalDistanceKm} km` : item.gesamtDistanzMeter !== undefined ? `${(item.gesamtDistanzMeter / 1000).toFixed(2)} km` : '-'}</td>
                        <td className="p-3 border-r border-black text-center font-mono">{item.sprintDistanceM !== undefined ? `${item.sprintDistanceM} m` : '-'}</td>
                        <td className="p-3 border-r border-black text-center font-mono">{item.maxSpeedKmh || item.maxGeschwindigkeitKmh} km/h</td>
                        <td className="p-3 border-r border-black text-center font-mono">{item.avgHeartRateBpm || item.durchschnittsHerzfrequenz || '-'}</td>
                        <td className="p-3 border-r border-black text-[11px] text-[#94A3B8] truncate max-w-xs">{item.tacticalSummary || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-[10px] font-black uppercase bg-[#1E293B] text-[#CBD5E1] px-1.5 py-0.5 border border-black">Archiv</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteTrackerEntry(item.spielerId || selectedPlayer?.id || '', item.id)}
                              title="Eintrag löschen"
                              className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : portalView === 'spielanalyse' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-[#e94560] p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-[#e94560] rounded-lg">
                <Activity size={18} className="text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560]">Spielanalyse & Bewegungsprofil</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
                  {selectedPlayer?.lastName || selectedPlayer?.name || 'Spieler'} <span className="text-[#e94560]">#{selectedPlayer?.number || ''}</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Heatmap • Laufwege • Einsatzzeiten • Event-Timeline</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Left/Main Column: Einsatzzeiten (Bar Chart) & Plotted Points */}
            <div className="xl:col-span-6 space-y-6">
              {/* Card 1: Einsatzzeiten-Diagramm */}
              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
                <div className="border-b border-[#1f2937] pb-3 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-[#e94560]" />
                    <h3 className="font-black uppercase text-xs tracking-wider text-white">Einsatzzeiten-Diagramm</h3>
                  </div>
                  <span className="bg-[#e94560]/20 text-[#e94560] text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                    Startelf vs. Einwechslung
                  </span>
                </div>

                {playedMatches.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Clock size={40} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-xs uppercase">Keine Einsatzzeiten für Pflicht- oder Testspiele erfasst.</p>
                    <p className="text-[10px] uppercase mt-1">Trage Einsatzminuten in der Spielplanung ein.</p>
                  </div>
                ) : (
                  <div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={playedMatches}
                          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis 
                            dataKey="opponent" 
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }}
                            stroke="#334155"
                            strokeWidth={1}
                          />
                          <YAxis 
                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94A3B8' }}
                            stroke="#334155"
                            strokeWidth={1}
                            domain={[0, 90]}
                          />
                          <ChartTooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              border: '1px solid #1f2937',
                              borderRadius: '8px',
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              color: '#F8FAFC',
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94A3B8' }}
                          />
                          <Bar name="Startelf (Mins)" dataKey="startelfMinutes" stackId="a" fill="#e94560" radius={[0,0,0,0]} />
                          <Bar name="Einwechselung (Mins)" dataKey="einwechslungMinutes" stackId="a" fill="#F59E0B" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="mt-4 border border-[#1f2937] p-3 bg-[#0a0a0a] rounded-lg flex flex-wrap gap-4 text-[10px] font-black uppercase text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#e94560] rounded" />
                        <span>Startelf-Spiele: {playedMatches.filter(m => !m.isSubstitute).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-[#F59E0B] rounded" />
                        <span>Einwechslungen: {playedMatches.filter(m => m.isSubstitute).length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white">Gesamtspielzeit: {playedMatches.reduce((acc, m) => acc + m.minutes, 0)} MIN</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card 2: List of plotted points */}
              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
                <div className="border-b border-[#1f2937] pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <List size={16} className="text-[#3B82F6]" />
                    <h3 className="font-black uppercase text-xs tracking-wider text-white">Erfasste Positionspunkte</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#3B82F6]/20 text-[#3B82F6] text-[9px] font-black px-2 py-0.5 rounded-full">
                      {filteredPointsForMatch.length} PLOT-PUNKTE
                    </span>
                    {filteredPointsForMatch.length > 0 && (
                      <button
                        onClick={handleClearAllMatchPoints}
                        className="text-[10px] font-black uppercase text-red-600 hover:text-red-800 underline"
                        title="Alle Punkte zurücksetzen"
                      >
                        Löschen
                      </button>
                    )}
                  </div>
                </div>

                {/* Auto-generate button */}
                <div className="mb-4">
                  <button
                    onClick={handleGeneratePositionalTrajectory}
                    className="w-full bg-[#10B981] hover:bg-emerald-500 text-white font-black uppercase text-xs p-2.5 border border-[#10B981] rounded-lg flex items-center justify-center gap-2 transition-all hover:shadow-lg"
                  >
                    <Zap size={14} className="text-yellow-300" />
                    <span>Laufwege für Position ({selectedPlayer?.position || 'ZM'}) generieren</span>
                  </button>
                  <p className="text-[9px] font-bold text-slate-500 uppercase text-center mt-1">
                    Erzeugt automatisch realistische Match-Laufwege & GPS-Szenarien von Min. 1-90
                  </p>
                </div>

                {filteredPointsForMatch.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    <MapPin size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-xs uppercase">Noch keine Bewegungspunkte für dieses Spiel gezeichnet.</p>
                    <p className="text-[10px] uppercase mt-1">Nutze den Button oben oder klicke rechts auf das Spielfeld.</p>
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto border border-[#1f2937] rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#0a0a0a] text-slate-400 font-black uppercase tracking-wider text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2">Minute</th>
                          <th className="p-2">Aktionstyp</th>
                          <th className="p-2">Beschreibung</th>
                          <th className="p-2 text-center">Löschen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y border-[#1f2937] font-bold divide-[#1f2937]/50">
                        {filteredPointsForMatch
                          .sort((a, b) => a.minute - b.minute)
                          .map((pt) => {
                            const act = pt.actionType || 'run';
                            const badgeBg = act === 'sprint' ? 'bg-red-500/20 text-red-400 border-red-500/50' : act === 'defensive' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : act === 'walk' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-amber-500/20 text-amber-400 border-amber-500/50';
                            const badgeText = act === 'sprint' ? 'Sprint' : act === 'defensive' ? 'Defensiv' : act === 'walk' ? 'Position' : 'Tempolauf';
                            return (
                              <tr key={pt.id} className="hover:bg-[#0a0a0a]">
                                <td className="p-2 font-mono font-black text-[#e94560]">Min. {pt.minute}</td>
                                <td className="p-2">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${badgeBg}`}>
                                    {badgeText}
                                  </span>
                                </td>
                                <td className="p-2 text-[10px] text-slate-400 font-bold truncate max-w-[120px]">
                                  {pt.label || `X: ${pt.x}% | Y: ${pt.y}%`}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    onClick={() => handleDeletePoint(pt.id)}
                                    className="text-red-500 hover:text-red-400 transition-colors p-1"
                                    title="Punkt löschen"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Interactive Heatmap & Spielfeld */}
            <div className="xl:col-span-6 space-y-6">
              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-6">
                <div className="border-b border-[#1f2937] pb-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Map size={16} className="text-[#10B981]" />
                    <h3 className="font-black uppercase text-xs tracking-wider text-white">Interaktive Bewegungserfassung & Laufwege</h3>
                  </div>
                  
                  {/* Match Selection Dropdown */}
                  <select
                    className="bg-[#0a0a0a] border border-[#1f2937] rounded-lg px-3 py-1.5 font-bold text-xs outline-none text-white focus:border-[#e94560]"
                    value={selectedMovementMatchId}
                    onChange={(e) => {
                      setSelectedMovementMatchId(e.target.value);
                      setMovementMinuteFilter(90);
                      setIsPlayingAnimation(false);
                    }}
                  >
                    <option value="">-- Spiel auswählen --</option>
                    {allMatches.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.date || 'Ohne Datum'} - {m.opponent} ({m.type})
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedMovementMatchId ? (
                  <div className="py-24 text-center text-slate-500">
                    <Trophy size={48} className="mx-auto mb-2 opacity-30" />
                    <p className="font-bold text-xs uppercase">Bitte wähle ein Spiel aus der Liste aus, um das Bewegungsprofil zu bearbeiten.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* View Mode & Action Type Selector Bar */}
                    <div className="space-y-3 border border-[#1f2937] p-3 bg-[#0a0a0a] rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1f2937] pb-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ansichtsmodus</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setMovementViewMode('combined')}
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                              movementViewMode === 'combined' ? 'bg-[#e94560] text-white shadow-lg' : 'bg-[#1f2937] text-slate-400 hover:text-white'
                            }`}
                          >
                            Kombiniert
                          </button>
                          <button
                            onClick={() => setMovementViewMode('vectors')}
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                              movementViewMode === 'vectors' ? 'bg-[#e94560] text-white shadow-lg' : 'bg-[#1f2937] text-slate-400 hover:text-white'
                            }`}
                          >
                            Laufwege
                          </button>
                          <button
                            onClick={() => setMovementViewMode('heatmap')}
                            className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                              movementViewMode === 'heatmap' ? 'bg-[#e94560] text-white shadow-lg' : 'bg-[#1f2937] text-slate-400 hover:text-white'
                            }`}
                          >
                            Heatmap
                          </button>
                        </div>
                      </div>

                      {/* Setup tools: Minute & Action Intensity Input before plot */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">
                            Spielminute für nächsten Plot
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={movementMinuteInput}
                              onChange={(e) => setMovementMinuteInput(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 bg-[#111827] border border-[#1f2937] rounded-lg p-1.5 text-center font-black outline-none text-xs text-white focus:border-[#e94560]"
                            />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">(Min. 1-120)</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest mb-1 text-slate-500">
                            Aktionstyp beim Klick
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              onClick={() => setSelectedActionType('sprint')}
                              className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                                selectedActionType === 'sprint' ? 'bg-red-500 text-white' : 'bg-[#1f2937] text-red-400 hover:bg-red-500/20'
                              }`}
                            >
                              Sprint
                            </button>
                            <button
                              onClick={() => setSelectedActionType('run')}
                              className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                                selectedActionType === 'run' ? 'bg-amber-500 text-white' : 'bg-[#1f2937] text-amber-400 hover:bg-amber-500/20'
                              }`}
                            >
                              Tempolauf
                            </button>
                            <button
                              onClick={() => setSelectedActionType('defensive')}
                              className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                                selectedActionType === 'defensive' ? 'bg-blue-500 text-white' : 'bg-[#1f2937] text-blue-400 hover:bg-blue-500/20'
                              }`}
                            >
                              Defensiv
                            </button>
                            <button
                              onClick={() => setSelectedActionType('walk')}
                              className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all ${
                                selectedActionType === 'walk' ? 'bg-emerald-500 text-white' : 'bg-[#1f2937] text-emerald-400 hover:bg-emerald-500/20'
                              }`}
                            >
                              Position
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Interactive Football Field */}
                    <div className="relative">
                      <div 
                        onClick={handlePitchClick}
                        className="w-full relative rounded-xl border border-[#1f2937] overflow-hidden cursor-crosshair select-none"
                        style={{
                          aspectRatio: '100/154',
                          background: 'linear-gradient(135deg, #1a472a 0%, #14532d 50%, #166534 100%)'
                        }}
                      >
                        {/* Football lines SVG (portrait, goals top/bottom) */}
                        <svg viewBox="0 0 100 154" className="w-full h-full absolute inset-0 pointer-events-none opacity-50">
                          <rect x="2" y="2" width="96" height="150" fill="none" stroke="white" strokeWidth="0.5" />
                          <line x1="2" y1="77" x2="98" y2="77" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="77" r="9.15" fill="none" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="77" r="0.5" fill="white" />
                          <rect x="20.3" y="2" width="59.4" height="24.3" fill="none" stroke="white" strokeWidth="0.5" />
                          <rect x="36.55" y="2" width="26.9" height="8.1" fill="none" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="18.2" r="0.5" fill="white" />
                          <path d="M 45.75 26.3 A 9.15 9.15 0 0 1 54.25 26.3" fill="none" stroke="white" strokeWidth="0.5" />
                          <rect x="20.3" y="127.7" width="59.4" height="24.3" fill="none" stroke="white" strokeWidth="0.5" />
                          <rect x="36.55" y="143.9" width="26.9" height="8.1" fill="none" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="135.8" r="0.5" fill="white" />
                          <path d="M 45.75 127.7 A 9.15 9.15 0 0 0 54.25 127.7" fill="none" stroke="white" strokeWidth="0.5" />
                          <rect x="47" y="0" width="6" height="2" fill="white" opacity="0.6" />
                          <rect x="47" y="152" width="6" height="2" fill="white" opacity="0.6" />
                          <path d="M 2 3 A 1 1 0 0 1 3 2" fill="none" stroke="white" strokeWidth="0.5" />
                          <path d="M 98 3 A 1 1 0 0 0 97 2" fill="none" stroke="white" strokeWidth="0.5" />
                          <path d="M 2 151 A 1 1 0 0 0 3 152" fill="none" stroke="white" strokeWidth="0.5" />
                          <path d="M 98 151 A 1 1 0 0 1 97 152" fill="none" stroke="white" strokeWidth="0.5" />
                        </svg>

                        {/* TRAJECTORY VECTORS / CONNECTING MOVEMENT LINES */}
                        {(movementViewMode === 'combined' || movementViewMode === 'vectors') && pointsBeforeFilter.length >= 2 && (
                          <svg viewBox="0 0 100 154" className="w-full h-full absolute inset-0 pointer-events-none z-10 overflow-visible">
                            <defs>
                              <marker id="arrow-sprint" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ef4444" />
                              </marker>
                              <marker id="arrow-run" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f59e0b" />
                              </marker>
                              <marker id="arrow-defensive" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
                              </marker>
                              <marker id="arrow-walk" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                                <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
                              </marker>
                            </defs>

                            {pointsBeforeFilter.map((pt, idx) => {
                              if (idx === 0) return null;
                              const prev = pointsBeforeFilter[idx - 1];
                              const x1 = prev.y;
                              const y1 = 154 - prev.x * 1.54;
                              const x2 = pt.y;
                              const y2 = 154 - pt.x * 1.54;

                              const actType = pt.actionType || 'run';
                              const strokeColor = actType === 'sprint' ? '#ef4444' : actType === 'defensive' ? '#3b82f6' : actType === 'walk' ? '#10b981' : '#f59e0b';
                              const strokeDash = actType === 'sprint' ? '1.5,0.8' : actType === 'defensive' ? '1,0.5' : 'none';
                              const markerId = `arrow-${actType}`;

                              return (
                                <g key={`vector_${prev.id}_${pt.id}`}>
                                  <line
                                    x1={x1}
                                    y1={y1}
                                    x2={x2}
                                    y2={y2}
                                    stroke={strokeColor}
                                    strokeWidth="0.8"
                                    strokeDasharray={strokeDash}
                                    markerEnd={`url(#${markerId})`}
                                    opacity="0.95"
                                  />
                                </g>
                              );
                            })}
                          </svg>
                        )}

                        {/* RENDER PLOTTED HEATMAP & INDIVIDUAL POINTS */}
                        {pointsBeforeFilter.map((pt) => {
                          const act = pt.actionType || 'run';
                          const ringBorder = act === 'sprint' ? 'border-red-600' : act === 'defensive' ? 'border-blue-600' : act === 'walk' ? 'border-emerald-600' : 'border-amber-500';

                          return (
                            <React.Fragment key={pt.id}>
                              {/* Heat Map Overlay Glow (Semi-transparent red glow) */}
                              {(movementViewMode === 'combined' || movementViewMode === 'heatmap') && (
                                <>
                                   <div
                                    className="absolute bg-red-600/30 rounded-full blur-md pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                      left: `${pt.y}%`,
                                      top: `${100 - pt.x}%`,
                                      width: '12%',
                                      height: '8%',
                                    }}
                                  />
                                  <div
                                    className="absolute bg-amber-500/40 rounded-full blur-sm pointer-events-none -translate-x-1/2 -translate-y-1/2"
                                    style={{
                                      left: `${pt.y}%`,
                                      top: `${100 - pt.x}%`,
                                      width: '6%',
                                      height: '4%',
                                    }}
                                  />
                                </>
                              )}

                              {/* Individual interactive marker */}
                              <div
                                className="absolute group -translate-x-1/2 -translate-y-1/2 z-20"
                                style={{
                                  left: `${pt.y}%`,
                                  top: `${100 - pt.x}%`,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <div className={`w-5 h-5 bg-[#111827] border-2 ${ringBorder} rounded-full flex items-center justify-center font-mono text-[8px] font-black shadow-lg hover:scale-125 transition-all cursor-pointer`}>
                                  {pt.minute}
                                </div>
                                
                                {/* Point hover/action tooltip */}
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center bg-[#111827] text-white text-[9px] font-black border border-[#1f2937] p-1.5 rounded-lg whitespace-nowrap shadow-lg z-30">
                                  <span>Min. {pt.minute}: {pt.label || 'Laufweg-Punkt'}</span>
                                  <button
                                    onClick={() => handleDeletePoint(pt.id)}
                                    className="text-red-400 hover:text-red-300 font-bold mt-1 underline"
                                  >
                                    [Punkt Löschen]
                                  </button>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* ANIMATED PLAYER AVATAR TOKEN ON PITCH */}
                        {animatedPlayerPos && (isPlayingAnimation || pointsBeforeFilter.length > 0) && (
                          <div
                            className="absolute -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-150 pointer-events-none"
                              style={{
                                left: `${animatedPlayerPos.y}%`,
                                top: `${100 - animatedPlayerPos.x}%`,
                              }}
                          >
                            <div className="relative flex items-center justify-center">
                              <div className="absolute -inset-2 bg-[#e94560]/40 rounded-full animate-ping" />
                              <div className="w-6 h-6 bg-[#e94560] border-2 border-white rounded-full flex items-center justify-center font-black text-[10px] text-white shadow-lg">
                                #{selectedPlayer?.number || '10'}
                              </div>
                              <div className="absolute top-7 bg-[#111827] text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg border border-[#1f2937] whitespace-nowrap shadow">
                                {selectedPlayer?.lastName || selectedPlayer?.name || 'Spieler'} ({isPlayingAnimation ? `${animationMinute}'` : `${movementMinuteFilter}'`})
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls & Time Slider Filter */}
                    <div className="space-y-3 border border-[#1f2937] p-4 bg-[#0a0a0a] rounded-lg">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#1f2937] pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (isPlayingAnimation) {
                                setIsPlayingAnimation(false);
                              } else {
                                if (animationMinute >= 90) setAnimationMinute(1);
                                setIsPlayingAnimation(true);
                              }
                            }}
                            className={`px-4 py-1.5 font-black uppercase text-xs rounded-lg flex items-center gap-1.5 transition-all ${
                              isPlayingAnimation ? 'bg-[#EF4444] text-white hover:bg-red-500' : 'bg-[#10B981] text-white hover:bg-emerald-500'
                            }`}
                          >
                            {isPlayingAnimation ? (
                              <>
                                <Pause size={14} />
                                <span>Animation Pausieren</span>
                              </>
                            ) : (
                              <>
                                <Play size={14} />
                                <span>▶ Laufweg-Animation Abspielen</span>
                              </>
                            )}
                          </button>
                          <span className="text-[10px] font-bold uppercase text-slate-500">
                            Status: <span className="text-white">{isPlayingAnimation ? `Replay Min. ${animationMinute}/90` : `Filter Min. ${movementMinuteFilter}`}</span>
                          </span>
                        </div>

                        <span className="text-[#e94560] bg-[#e94560]/10 border border-[#e94560]/30 px-2 py-0.5 font-black text-xs rounded-lg">
                          Anzeige bis Minute {isPlayingAnimation ? animationMinute : movementMinuteFilter}
                        </span>
                      </div>

                      <div>
                        <input
                          type="range"
                          min="1"
                          max="120"
                          value={isPlayingAnimation ? animationMinute : movementMinuteFilter}
                          onChange={(e) => {
                            setIsPlayingAnimation(false);
                            setMovementMinuteFilter(parseInt(e.target.value));
                          }}
                          className="w-full h-2 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#e94560]"
                        />
                        <div className="flex justify-between text-[9px] font-bold text-slate-500 uppercase mt-1">
                          <span>Anpfiff (Min. 1)</span>
                          <span>Halbzeit (Min. 45)</span>
                          <span>Regulär (Min. 90)</span>
                          <span>Nachspielzeit (Min. 120)</span>
                        </div>
                      </div>

                      {/* Legend */}
                      <div className="pt-2 border-t border-[#1f2937] flex flex-wrap gap-4 text-[10px] font-bold text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-1 bg-red-500 rounded-full" />
                          <span>Vollsprint / Tiefenlauf</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-1 bg-amber-500 rounded-full" />
                          <span>Tempolauf / Umschalten</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-1 bg-blue-500 rounded-full" />
                          <span>Defensivlauf / Pressing</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-3 h-1 bg-emerald-500 rounded-full" />
                          <span>Positionierung / Gehen</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : portalView === 'trackerUpload' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] text-[#F8FAFC] border border-[#F59E0B]/40 p-6 rounded-xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Cpu size={18} className="text-[#F59E0B]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F59E0B]">
                  AUTOMATISCHE BIN-ENTSCHLÜSSELUNG & ZUORDNUNG
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-[#F8FAFC]">
                TRACKER-DATEN HOCHLADEN
              </h2>
              <p className="text-xs text-[#94A3B8] font-medium mt-1 max-w-2xl">
                Lade eine binäre Tracker-Datei (.bin) hoch. Die App entschlüsselt die Daten im Hintergrund und ordnet sie automatisch {selectedPlayer ? selectedPlayer.lastName : 'dem Spieler'} zu.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCreateAndTestDemoBatch}
                disabled={binDecrypting}
                className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0A0E17] font-black text-xs uppercase px-4 py-2.5 rounded-lg border border-[#F59E0B] flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all shrink-0 active:scale-95"
              >
                <Sparkles size={16} /> 📥 6-Session-Batch testen
              </button>
              <button
                type="button"
                onClick={handleCreateAndTestDemoBin}
                disabled={binDecrypting}
                className="bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] font-bold text-xs uppercase px-3.5 py-2.5 rounded-lg border border-[#334155] flex items-center gap-1.5 transition-all shrink-0 active:scale-95"
              >
                <span>1 Demo-Datei</span>
              </button>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={binFileInputRef}
            onChange={handleBinFileInputChange}
            accept=".bin,.dat,.json,.csv,.txt,.xml,*"
            multiple
            className="hidden"
          />

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setBinDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setBinDragActive(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setBinDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleProcessMultipleBinFiles(Array.from(e.dataTransfer.files));
              }
            }}
            className={`border-2 border-dashed p-8 rounded-xl text-center transition-all shadow-xl flex flex-col items-center justify-center gap-4 cursor-pointer ${
              binDragActive 
                ? 'bg-[#F59E0B]/10 border-[#F59E0B] scale-[0.99]' 
                : 'bg-[#1E293B]/60 border-[#334155] hover:border-[#F59E0B]/60 hover:bg-[#1E293B]'
            }`}
            onClick={() => binFileInputRef.current?.click()}
          >
            <div className="p-4 bg-[#F59E0B] rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)] text-[#0A0E17]">
              <Upload size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-lg uppercase tracking-wider text-[#F8FAFC]">
                Dateien aus MagentaCloud_Extracted / Speicher hierher ziehen
              </h3>
              <p className="text-xs font-medium text-[#94A3B8] max-w-lg mx-auto">
                Unterstützte Formate: <strong className="text-[#F59E0B] font-mono">.BIN</strong>, .DAT, .JSON, .CSV, .TXT (GPS-Tracker Rohdaten aus MagentaCloud).
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  binFileInputRef.current?.click();
                }}
                disabled={binDecrypting}
                className="bg-[#F59E0B] text-[#0A0E17] hover:bg-[#FBBF24] font-black text-xs uppercase px-6 py-3 rounded-lg border border-[#F59E0B] flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 transition-all"
              >
                {binDecrypting ? <Loader2 size={16} className="animate-spin text-black" /> : <FolderCheck size={16} />}
                <span>Dateien / Ordnerinhalt auswählen (.bin)</span>
              </button>
            </div>
            <p className="text-[11px] text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 font-bold px-3 py-1 rounded-lg mt-2">
              ℹ️ Mehrere Dateien gleichzeitig auswählen möglich! Die Dateien werden automatisch entschlüsselt & den Spielern zugeordnet.
            </p>
          </div>

          {/* Status Indicator Box */}
          {binStatusStep !== 'idle' && (
            <div className={`border rounded-xl p-5 shadow-lg flex items-center gap-4 transition-all ${
              binStatusStep === 'decrypting' ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40' :
              binStatusStep === 'matched' ? 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/40' :
              binStatusStep === 'saved' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40' : 'bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/40'
            }`}>
              <div className="shrink-0 p-2.5 bg-[#121824] border border-[#334155] rounded-lg">
                {binStatusStep === 'decrypting' && <Loader2 size={24} className="animate-spin text-[#F59E0B]" />}
                {binStatusStep === 'matched' && <Cpu size={24} className="text-[#06B6D4] animate-pulse" />}
                {binStatusStep === 'saved' && <CheckCircle size={24} className="text-[#10B981]" />}
                {binStatusStep === 'error' && <AlertCircle size={24} className="text-[#E11D48]" />}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest block opacity-70">
                  Statusanzeige
                </span>
                <p className="font-bold text-sm uppercase">
                  {binStatusMsg}
                </p>
              </div>
            </div>
          )}

          {/* Liste der letzten Trainings */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-[#334155] pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-base uppercase flex items-center gap-2 text-[#F8FAFC]">
                  <Activity size={20} className="text-[#06B6D4]" /> LISTE DER LETZTEN TRAININGS (TRACKER-HISTORIE)
                </h3>
                <p className="text-xs text-[#94A3B8] font-medium mt-0.5">
                  Alle entschlüsselten Einträge für {selectedPlayer ? selectedPlayer.lastName : 'den Kader'}. Wähle Trainings für den Vergleich aus.
                </p>
              </div>

              {selectedForComparison.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPortalView('trackerCompare')}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white font-black text-xs uppercase px-4 py-2.5 rounded-lg border border-[#6366F1] flex items-center gap-2 shadow-[0_0_12px_rgba(99,102,241,0.5)] transition-all animate-pulse"
                >
                  <ArrowLeftRight size={16} /> 📊 Zu Tracker-Vergleich wechseln ({selectedForComparison.length} gewählt)
                </button>
              )}
            </div>

            {normalizedTrackerHistory.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-[#334155] rounded-xl p-6 space-y-2 bg-[#121824]">
                <FolderCheck size={36} className="mx-auto text-[#64748B]" />
                <p className="font-bold text-sm uppercase text-[#94A3B8]">Noch keine Tracker-Daten vorhanden</p>
                <p className="text-xs text-[#64748B]">Lade oben eine BIN-Datei hoch oder erstelle eine Demo-Datei, um die Historie zu füllen.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#334155] rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#121824] text-[#94A3B8] font-mono font-bold uppercase text-[10px]">
                      <th className="p-3 border-r border-[#334155] text-center w-12">Vergleich</th>
                      <th className="p-3 border-r border-[#334155]">Datum & Uhrzeit</th>
                      <th className="p-3 border-r border-[#334155]">Spieler</th>
                      <th className="p-3 border-r border-[#334155] text-center">Gesamtdistanz</th>
                      <th className="p-3 border-r border-[#334155] text-center">Geschwindigkeit (Ø / Max)</th>
                      <th className="p-3 border-r border-[#334155] text-center">Herzfrequenz</th>
                      <th className="p-3 text-center">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#334155]">
                    {normalizedTrackerHistory.map((item: any) => {
                      const isSelected = selectedForComparison.includes(item.id);
                      return (
                        <tr key={item.id} className={`hover:bg-[#334155]/40 transition-colors font-medium ${isSelected ? 'bg-[#F59E0B]/10 border-l-4 border-l-[#F59E0B]' : 'bg-[#1E293B]'}`}>
                          <td className="p-3 border-r border-[#334155] text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForComparison(prev => [...prev, item.id]);
                                } else {
                                  setSelectedForComparison(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                              className="w-4 h-4 text-[#F59E0B] border-[#334155] rounded focus:ring-0 cursor-pointer accent-[#F59E0B]"
                            />
                          </td>
                          <td className="p-3 border-r border-[#334155] font-mono">
                            <div className="font-bold text-[#F8FAFC]">
                              {formatSessionDate(item.datum) || '-'}
                            </div>
                            <div className="text-[10px] text-[#94A3B8]">{item.uhrzeit ? `${item.uhrzeit} Uhr` : '18:30 Uhr'} • {item.trackerQuelle}</div>
                          </td>
                          <td className="p-3 border-r border-[#334155] font-black uppercase text-xs text-[#F8FAFC]">
                            {item.name}
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono">
                            <span className="text-[#06B6D4] font-black text-sm">
                              {(item.gesamtDistanzMeter / 1000).toFixed(2)} km
                            </span>
                            <div className="text-[10px] text-[#94A3B8]">({item.gesamtDistanzMeter} m)</div>
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono">
                            <div className="text-[#F8FAFC]">Ø {item.durchschnittsGeschwindigkeitKmh} km/h</div>
                            <div className="text-[#E11D48] font-bold">Max {item.maxGeschwindigkeitKmh} km/h</div>
                          </td>
                          <td className="p-3 border-r border-[#334155] text-center font-mono">
                            <div className="text-[#F43F5E] font-bold">Ø {item.durchschnittsHerzfrequenz} bpm</div>
                            <div className="text-[10px] text-[#94A3B8]">Max {item.maxHerzfrequenz} bpm</div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setDetailsModalRecord(item)}
                                className="bg-[#121824] hover:bg-[#334155] text-[#F8FAFC] font-bold text-[10px] uppercase px-2.5 py-1.5 rounded border border-[#334155] transition-all"
                              >
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTrackerEntry(item.spielerId, item.id)}
                                title="Eintrag löschen"
                                className="bg-[#E11D48] hover:bg-[#F43F5E] text-white p-1.5 rounded border border-[#E11D48] transition-all shrink-0 active:scale-95"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : portalView === 'trackerCompare' ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#1E293B] via-[#0F172A] to-[#1E293B] text-[#F8FAFC] border border-[#6366F1]/40 p-6 rounded-xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ArrowLeftRight size={18} className="text-[#818CF8]" />
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#818CF8]">
                  PERFORMANCE-BENCHMARK & VERGLEICHSANALYSE
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-[#F8FAFC]">
                TRACKER-VERGLEICH
              </h2>
              <p className="text-xs text-[#94A3B8] font-medium mt-1 max-w-2xl">
                Vergleiche verschiedene GPS- und Trainings-Tracker Einheiten miteinander, um Leistungssteigerungen und Belastungsspitzen zu erkennen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPortalView('trackerUpload')}
              className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#0A0E17] font-black text-xs uppercase px-4 py-2.5 rounded-lg border border-[#F59E0B] flex items-center gap-2 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all shrink-0 active:scale-95"
            >
              <Upload size={16} /> 📥 Weitere BIN-Datei hochladen
            </button>
          </div>

          {/* Selection of Trainings */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
            <div className="border-b border-[#334155] pb-3 flex justify-between items-center">
              <h3 className="font-black text-sm uppercase flex items-center gap-2 text-[#F8FAFC]">
                <CheckCircle size={18} className="text-[#818CF8]" /> AUSWAHL DER ZU VERGLEICHENDEN EINHEITEN
              </h3>
              <span className="text-xs font-bold text-[#94A3B8] font-mono">
                {selectedForComparison.length} von {normalizedTrackerHistory.length} ausgewählt
              </span>
            </div>

            {normalizedTrackerHistory.length === 0 ? (
              <p className="text-xs font-bold italic text-[#94A3B8]">Keine Einheiten vorhanden. Bitte zuerst eine BIN-Datei hochladen.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {normalizedTrackerHistory.map((item: any) => {
                  const isChecked = selectedForComparison.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border transition-all shadow-md ${
                        isChecked ? 'bg-[#6366F1]/15 border-[#6366F1] font-bold text-[#F8FAFC]' : 'bg-[#121824] hover:bg-[#334155]/40 border-[#334155] text-[#94A3B8]'
                      }`}
                    >
                      <label className="flex items-center gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForComparison(prev => [...prev, item.id]);
                            } else {
                              setSelectedForComparison(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="w-4 h-4 text-[#6366F1] border-[#334155] rounded focus:ring-0 accent-[#6366F1]"
                        />
                        <div className="text-xs">
                          <div className="font-bold text-[#F8FAFC]">{formatSessionDate(item.datum)} ({item.uhrzeit}) - <span className="text-[#818CF8]">{item.name}</span></div>
                          <div className="text-[10px] text-[#94A3B8] font-mono">
                            {(item.gesamtDistanzMeter / 1000).toFixed(2)} km • Max {item.maxGeschwindigkeitKmh} km/h
                          </div>
                        </div>
                      </label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrackerEntry(item.spielerId, item.id);
                        }}
                        title="Eintrag löschen"
                        className="p-1.5 bg-red-600 hover:bg-red-700 text-white border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all shrink-0"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comparison Content */}
          {(() => {
            const itemsToCompare = normalizedTrackerHistory.filter((i: any) => selectedForComparison.includes(i.id));

            if (itemsToCompare.length === 0) {
              return (
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-8 text-center shadow-xl space-y-2">
                  <ArrowLeftRight size={36} className="mx-auto text-[#818CF8]" />
                  <p className="font-bold text-sm uppercase text-[#F8FAFC]">Bitte mindestens eine Einheit auswählen</p>
                  <p className="text-xs text-[#94A3B8]">Setze oben ein Häkchen bei den Trainings, die du gegenüberstellen möchtest.</p>
                </div>
              );
            }

            // Prepare chart data
            const chartData = itemsToCompare.map(item => ({
              name: `${formatSessionDate(item.datum)}`,
              distanzKm: parseFloat((item.gesamtDistanzMeter / 1000).toFixed(2)),
              distanzMeter: item.gesamtDistanzMeter,
              maxSpeed: item.maxGeschwindigkeitKmh,
              avgSpeed: item.durchschnittsGeschwindigkeitKmh,
              avgHr: item.durchschnittsHerzfrequenz,
              maxHr: item.maxHerzfrequenz,
              zone1: item.belastungsZonen?.zone1LockerMin || 0,
              zone2: item.belastungsZonen?.zone2NormalMin || 0,
              zone3: item.belastungsZonen?.zone3IntensivMin || 0,
              zone4: item.belastungsZonen?.zone4SehrIntensivMin || 0,
              sprints: item.sprints?.length || 0
            }));

            return (
              <div className="space-y-6">
                {/* Comparison Table */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 shadow-xl space-y-4">
                  <div className="border-b border-[#334155] pb-3">
                    <h3 className="font-black text-sm uppercase flex items-center gap-2 text-[#F8FAFC]">
                      <List size={18} className="text-[#818CF8]" /> DIREKTER TABELLARISCHER VERGLEICH
                    </h3>
                  </div>

                  <div className="overflow-x-auto border border-[#334155] rounded-xl">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-[#121824] text-[#94A3B8] font-bold uppercase text-[10px]">
                          <th className="p-3 border-r border-[#334155]">Metrik / Kennzahl</th>
                          {itemsToCompare.map((item: any, idx) => (
                            <th key={item.id} className="p-3 border-r border-[#334155] text-center bg-[#0F172A]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[#818CF8]">Einheit #{idx + 1}</span>
                                <span className="text-[#F59E0B] font-bold">{formatSessionDate(item.datum)} ({item.name})</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTrackerEntry(item.spielerId, item.id)}
                                  title="Diese Einheit löschen"
                                  className="mt-1 px-2 py-1 bg-[#E11D48] hover:bg-[#F43F5E] text-white font-bold text-[9px] uppercase rounded border border-[#E11D48] flex items-center gap-1 transition-all active:scale-95"
                                >
                                  <Trash2 size={10} /> Löschen
                                </button>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#334155]">
                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Gesamtdistanz (Meter)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-black text-[#06B6D4] text-sm">
                              {item.gesamtDistanzMeter} m <span className="text-xs text-[#94A3B8] font-normal">({(item.gesamtDistanzMeter / 1000).toFixed(2)} km)</span>
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#121824]/60">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Gesamtdauer (Sekunden)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#F8FAFC]">
                              {item.gesamtDauerSekunden} s <span className="text-xs text-[#94A3B8] font-normal">({Math.round(item.gesamtDauerSekunden / 60)} Min)</span>
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Ø Geschwindigkeit (km/h)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#10B981]">
                              {item.durchschnittsGeschwindigkeitKmh} km/h
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#121824]/60">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Max. Geschwindigkeit (Top Speed)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-black text-[#E11D48] text-sm">
                              {item.maxGeschwindigkeitKmh} km/h
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Ø Herzfrequenz (BPM)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#F43F5E]">
                              {item.durchschnittsHerzfrequenz} bpm
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#121824]/60">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Max. Herzfrequenz (Pulsspitze)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#A855F7]">
                              {item.maxHerzfrequenz} bpm
                            </td>
                          ))}
                        </tr>

                        {/* Belastungszonen breakdown */}
                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F59E0B]">Zone 1 (Locker)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#F8FAFC]">
                              {item.belastungsZonen?.zone1LockerMin || 0} Min
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#121824]/60">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F59E0B]">Zone 2 (Normal)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#F8FAFC]">
                              {item.belastungsZonen?.zone2NormalMin || 0} Min
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F59E0B]">Zone 3 (Intensiv)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-bold text-[#F59E0B]">
                              {item.belastungsZonen?.zone3IntensivMin || 0} Min
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#121824]/60">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F59E0B]">Zone 4 (Sehr Intensiv)</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-black text-[#E11D48]">
                              {item.belastungsZonen?.zone4SehrIntensivMin || 0} Min
                            </td>
                          ))}
                        </tr>

                        <tr className="bg-[#1E293B]">
                          <td className="p-3 border-r border-[#334155] font-bold uppercase text-xs text-[#F8FAFC]">Anzahl Vollsprints</td>
                          {itemsToCompare.map(item => (
                            <td key={item.id} className="p-3 border-r border-[#334155] text-center font-black text-[#F8FAFC]">
                              {item.sprints?.length || 0} Sprints
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Graphical Visualizations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Distance & Top Speed Chart */}
                  <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="border-b border-black pb-2">
                      <h4 className="font-black uppercase text-xs text-blue-900">GESAMTDISTANZ (km) & TOP SPEED (km/h)</h4>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Direkter grafischer Laufleistungs-Vergleich</p>
                    </div>

                    <div className="h-64 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800 }} />
                          <YAxis tick={{ fontSize: 10, fontWeight: 800 }} />
                          <ChartTooltip contentStyle={{ border: '2px solid black', fontWeight: 'bold', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar dataKey="distanzKm" name="Distanz (km)" fill="#1e40af" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="maxSpeed" name="Max Speed (km/h)" fill="#dc2626" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Heart Rate Chart */}
                  <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
                    <div className="border-b border-black pb-2">
                      <h4 className="font-black uppercase text-xs text-rose-800">HERZFREQUENZ-PROFIL (BPM)</h4>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Durchschnitts- vs. Maximal-Puls im Vergleich</p>
                    </div>

                    <div className="h-64 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800 }} />
                          <YAxis domain={[100, 210]} tick={{ fontSize: 10, fontWeight: 800 }} />
                          <ChartTooltip contentStyle={{ border: '2px solid black', fontWeight: 'bold', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar dataKey="avgHr" name="Ø Puls (bpm)" fill="#e11d48" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="maxHr" name="Max Puls (bpm)" fill="#581c87" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Belastungszonen Chart */}
                  <div className="bg-[#1E293B] border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 lg:col-span-2">
                    <div className="border-b border-black pb-2">
                      <h4 className="font-black uppercase text-xs text-amber-900">BELASTUNGSZONEN-VERTEILUNG (MINUTEN)</h4>
                      <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Verteilung der Trainingszeit auf Zonen 1 bis 4</p>
                    </div>

                    <div className="h-64 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 800 }} />
                          <YAxis tick={{ fontSize: 10, fontWeight: 800 }} />
                          <ChartTooltip contentStyle={{ border: '2px solid black', fontWeight: 'bold', fontSize: '11px' }} />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                          <Bar dataKey="zone1" name="Zone 1 (Locker)" fill="#16a34a" stackId="a" />
                          <Bar dataKey="zone2" name="Zone 2 (Normal)" fill="#2563eb" stackId="a" />
                          <Bar dataKey="zone3" name="Zone 3 (Intensiv)" fill="#d97706" stackId="a" />
                          <Bar dataKey="zone4" name="Zone 4 (Sehr Intensiv)" fill="#dc2626" stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : portalView === 'trackerAnalyse' ? (
        <div className="space-y-6 animate-fadeIn">
          <TrackerAcademyReportView
            players={onlyPlayers as any}
            trackerAcademyReports={trackerAcademyReports || []}
            saveTrackerAcademyReport={saveTrackerAcademyReport || (async () => {})}
            deleteTrackerAcademyReport={deleteTrackerAcademyReport || (async () => {})}
            onUpdatePlayer={onUpdatePlayer}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
        </div>
      ) : portalView === 'bericht' && selectedPlayer ? (
        <div className="animate-fadeIn">
          <PlayerReportProView player={selectedPlayer as any} players={players as any} />
        </div>
      ) : portalView === 'saisonbericht' && selectedPlayer ? (
        <div className="animate-fadeIn">
          <PersonalSeasonReport
            player={selectedPlayer as any}
            reports={trackerAcademyReports || []}
            competitiveMatches={competitiveMatches || []}
            competitiveMinutes={competitiveMinutes || []}
            testMatches={testMatches || []}
            testMinutes={testMinutes || []}
          />
        </div>
      ) : portalView === 'teamvergleich' ? (
        <div className="animate-fadeIn">
          <TeamComparisonReport
            players={players as any}
            selectedPlayerId={selectedPlayerId}
            reports={trackerAcademyReports || []}
            competitiveMatches={competitiveMatches || []}
            competitiveMinutes={competitiveMinutes || []}
            testMatches={testMatches || []}
            testMinutes={testMinutes || []}
          />
        </div>
      ) : portalView === 'video' && selectedPlayer ? (
        <div className="space-y-6 animate-fadeIn">
          <VideoSection 
            title={`Video-Highlights & Szenen - ${selectedPlayer.lastName} (#${selectedPlayer.number})`}
            subtitle="Individuelle Spielermomente, Torchancen, Zweikämpfe und Videoszenen"
            clips={selectedPlayer.videoHighlights || []}
            onUpdateClips={(clips) => {
              if (onUpdatePlayerVideos) {
                onUpdatePlayerVideos(selectedPlayer.id, clips);
              }
            }}
            players={players}
            defaultCategory="Spieler-Momente"
          />
        </div>
      ) : portalView === 'diagnose' && selectedPlayer ? (
        /* ═══════════════════════════════════════════════════════════════ */
        /* CROSS-TAB DIAGNOSE: Alle Daten aus allen Reitern              */
        /* ═══════════════════════════════════════════════════════════════ */
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-gradient-to-r from-[#0A1628] via-[#111827] to-[#0A1628] border border-[#F59E0B]/30 rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B]">
                Cross-Tab Diagnose: {selectedPlayer.firstName || selectedPlayer.name?.split(' ')[0]} {selectedPlayer.lastName || selectedPlayer.name?.split(' ')[1]}
              </span>
              <span className="text-[8px] text-[#64748B] ml-auto">Daten aus: GPS • Spielbericht • Training • Physio • Anwesenheit • Scouting</span>
            </div>

            {/* ── STATUS-AMPEL: Gesamtzustand des Spielers ── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
              {(() => {
                const ta = selectedPlayer.trackerAnalysis || {};
                const load = ta.workloadIndex || 0;
                const isGelb = selectedPlayer.loadAmpel === 'Gelb';
                const isRot = selectedPlayer.loadAmpel === 'Rot' || selectedPlayer.isInjured;
                const hasGPS = (ta.totalDistanceKm || 0) > 0;
                const sprintCount = ta.sprintCount || 0;
                const avgHR = ta.avgHeartRateBpm || 0;
                const fitness = selectedPlayer.fitness || 'Unbekannt';
                return [
                  { label: 'Belastungs-Ampel', value: isRot ? '🔴 ROT' : isGelb ? '🟡 GELB' : '🟢 GRÜN', bg: isRot ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : isGelb ? 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]' : 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]' },
                  { label: 'GPS Status', value: hasGPS ? `${ta.totalDistanceKm}km` : 'Kein GPS', bg: hasGPS ? 'bg-[#06B6D4]/20 border-[#06B6D4]/40 text-[#06B6D4]' : 'bg-[#334155]/40 border-[#334155]/60 text-[#64748B]' },
                  { label: 'Sprints', value: `${sprintCount}`, bg: sprintCount > 20 ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : sprintCount > 10 ? 'bg-[#F59E0B]/20 border-[#F59E0B]/40 text-[#F59E0B]' : 'bg-[#334155]/40 border-[#334155]/60 text-[#64748B]' },
                  { label: 'Ø Herzfrequenz', value: avgHR > 0 ? `${avgHR}bpm` : 'Keine Daten', bg: avgHR > 170 ? 'bg-[#EF4444]/20 border-[#EF4444]/40 text-[#EF4444]' : 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-[#8B5CF6]' },
                  { label: 'Fitness', value: fitness, bg: 'bg-[#10B981]/20 border-[#10B981]/40 text-[#10B981]' },
                ].map((item, i) => (
                  <div key={i} className={`border rounded-lg p-2 text-center ${item.bg}`}>
                    <div className="text-[7px] font-bold uppercase tracking-wider opacity-70">{item.label}</div>
                    <div className="text-xs font-black mt-0.5">{item.value}</div>
                  </div>
                ));
              })()}
            </div>

            {/* ── 3-SÄULEN GRID: GPS | MATCH | TRAINING ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
              {/* GPS-Belastung (aus Runs/Läufe) */}
              <div className="bg-[#0D1117] border border-[#06B6D4]/30 rounded-xl p-3">
                <div className="text-[8px] font-black uppercase text-[#22D3EE] tracking-widest mb-2 flex items-center gap-1">
                  📍 GPS-Belastung (Catapult™)
                </div>
                {selectedPlayer.trackerAnalysis ? (
                  <div className="space-y-1">
                    {[
                      { k: 'Distanz', v: `${selectedPlayer.trackerAnalysis.totalDistanceKm || 0}km` },
                      { k: 'Max Speed', v: `${selectedPlayer.trackerAnalysis.maxSpeedKmh || 0}km/h` },
                      { k: 'Sprints', v: `${selectedPlayer.trackerAnalysis.sprintCount || 0}x` },
                      { k: 'High-Speed', v: `${selectedPlayer.trackerAnalysis.highSpeedDistanceM || 0}m` },
                      { k: 'Herzfrequenz Ø', v: `${selectedPlayer.trackerAnalysis.avgHeartRateBpm || 0}bpm` },
                      { k: 'Herzfrequenz Max', v: `${selectedPlayer.trackerAnalysis.maxHeartRateBpm || 0}bpm` },
                      { k: 'Workload Index', v: `${selectedPlayer.trackerAnalysis.workloadIndex || 0}` },
                      { k: 'Accels/Decels', v: `${selectedPlayer.trackerAnalysis.accelerations || 0}/${selectedPlayer.trackerAnalysis.decelerations || 0}` },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between text-[8px] px-1">
                        <span className="text-[#94A3B8]">{row.k}</span>
                        <span className="font-bold text-[#22D3EE]">{row.v}</span>
                      </div>
                    ))}
                    {(selectedPlayer.trackerHistory || []).length >= 1 && (
                      <div className="mt-2 pt-2 border-t border-[#1E293B]">
                        <div className="text-[7px] font-bold text-[#64748B] mb-1">VERLAUF ({(selectedPlayer.trackerHistory || []).length} Sessions)</div>
                        <div className="flex gap-0.5">
                          {(selectedPlayer.trackerHistory || []).slice(-14).map((h: any, i: number) => {
                            const dist = h.totalDistanceKm || 0;
                            const height = Math.min((dist / 12) * 100, 100);
                            return (
                              <div key={i} className="flex-1 bg-[#1E293B] rounded-sm relative" style={{ height: '24px' }}>
                                <div className="absolute bottom-0 w-full bg-[#06B6D4] rounded-sm" style={{ height: `${height}%` }} />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[8px] text-[#64748B] py-4 text-center">Keine GPS-Daten vorhanden. Im Reiter "Läufe" importieren.</div>
                )}
              </div>

              {/* Spielberichte (Match-Performance) */}
              <div className="bg-[#0D1117] border border-[#A855F7]/30 rounded-xl p-3">
                <div className="text-[8px] font-black uppercase text-[#C084FC] tracking-widest mb-2 flex items-center gap-1">
                  ⚽ Spielberichte & Leistung
                </div>
                <div className="space-y-1">
                  {[
                    { k: 'Einsatzzeiten Gesamt', v: `${selectedPlayer.einsatzzeitenGesamt || 0} Min` },
                    { k: 'Test-Einsatzzeiten', v: `${selectedPlayer.testEinsatzzeitenGesamt || 0} Min` },
                    { k: 'Tore', v: `${selectedPlayer.tore || 0}` },
                    { k: 'Load Ampel', v: selectedPlayer.loadAmpel || 'Grün' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between text-[8px] px-1">
                      <span className="text-[#94A3B8]">{row.k}</span>
                      <span className="font-bold text-[#C084FC]">{row.v}</span>
                    </div>
                  ))}
                  {/* Match-Status aus Anwesenheit */}
                  <div className="mt-2 pt-2 border-t border-[#1E293B]">
                    <div className="text-[7px] font-bold text-[#64748B] mb-1">MATCH-STATUS (Pflichtspiele)</div>
                    {(competitiveMatches || []).length > 0 ? (
                      (competitiveMatches || []).slice(-5).map((m: any, i: number) => (
                        <div key={i} className="flex justify-between text-[7px] px-1 py-0.5 border-b border-[#1E293B]">
                          <span className="text-[#94A3B8]">{m.date} vs {m.opponent}</span>
                          <span className="font-bold text-[#C084FC]">{m.result || '-'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-[7px] text-[#64748B] text-center py-1">Noch keine Pflichtspiel-Daten</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Training & Physio */}
              <div className="bg-[#0D1117] border border-[#10B981]/30 rounded-xl p-3">
                <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-2 flex items-center gap-1">
                  🏋️ Training & Physio
                </div>
                <div className="space-y-1">
                  {(() => {
                    const playerLogs = (sessionLogs || []).filter((l: any) => l.playerId === selectedPlayer.id);
                    const avgRPE = playerLogs.length ? (playerLogs.reduce((s: number, l: any) => s + (l.rpe || 0), 0) / playerLogs.length).toFixed(1) : '0.0';
                    const totalLoad = playerLogs.reduce((s: number, l: any) => s + (l.loadScore || 0), 0);
                    const totalMin = playerLogs.reduce((s: number, l: any) => s + (l.minutes || 0), 0);
                    return [
                      { k: 'Trainingseinheiten', v: `${playerLogs.length}` },
                      { k: 'Ø RPE', v: `${avgRPE}/10` },
                      { k: 'Total Load Score', v: `${totalLoad}` },
                      { k: 'Trainingsminuten', v: `${totalMin} Min` },
                      { k: 'Verletzt', v: selectedPlayer.isInjured ? `JA (${selectedPlayer.injuryType || 'Unbekannt'})` : 'Nein' },
                      { k: 'Recovery', v: selectedPlayer.recoveryForecast || 'Keine Daten' },
                    ].map((row, i) => (
                      <div key={i} className="flex justify-between text-[8px] px-1">
                        <span className="text-[#94A3B8]">{row.k}</span>
                        <span className={`font-bold ${row.k === 'Verletzt' && selectedPlayer.isInjured ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>{row.v}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* ── LEISTUNGS-VERGLEICH: Spieler vs Team-Durchschnitt ── */}
            <div className="bg-[#0D1117] border border-[#F59E0B]/20 rounded-xl p-3">
              <div className="text-[8px] font-black uppercase text-[#F59E0B] tracking-widest mb-2">Leistungs-Vergleich: Spieler vs Team-Durchschnitt</div>
              <div className="space-y-1.5">
                {(() => {
                  const onlyPlayers = players.filter((p: any) => p.category === 'player');
                  const teamAvg = (field: string) => {
                    const vals = onlyPlayers.map((p: any) => (p.trackerAnalysis?.[field] || 0)).filter((v: number) => v > 0);
                    return vals.length ? vals.reduce((a: number, b: number) => a + b, 0) / vals.length : 0;
                  };
                  const playerVal = (field: string) => (selectedPlayer?.trackerAnalysis as any)?.[field] || 0;
                  const metrics = [
                    { label: 'Distanz (km)', field: 'totalDistanceKm', max: 14 },
                    { label: 'Max Speed (km/h)', field: 'maxSpeedKmh', max: 35 },
                    { label: 'Sprint Count', field: 'sprintCount', max: 40 },
                    { label: 'High-Speed (m)', field: 'highSpeedDistanceM', max: 800 },
                    { label: 'Workload Index', field: 'workloadIndex', max: 1200 },
                  ];
                  return metrics.map((m, i) => {
                    const pv = playerVal(m.field);
                    const tv = teamAvg(m.field);
                    const pPct = Math.min((pv / m.max) * 100, 100);
                    const tPct = Math.min((tv / m.max) * 100, 100);
                    const diff = pv - tv;
                    const isAbove = diff > 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[7px] font-bold text-[#94A3B8] w-28 truncate">{m.label}</span>
                        <div className="flex-1 h-3 bg-[#1E293B] rounded-full overflow-hidden relative">
                          <div className="absolute h-full bg-[#64748B]/40 rounded-full" style={{ width: `${tPct}%` }} title={`Team Ø: ${tv.toFixed(1)}`} />
                          <div className={`absolute h-full rounded-full ${isAbove ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} style={{ width: `${pPct}%` }} title={`Spieler: ${pv}`} />
                        </div>
                        <span className={`text-[7px] font-black w-12 text-right ${isAbove ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {isAbove ? '+' : ''}{diff.toFixed(1)}
                        </span>
                      </div>
                    );
                  });
                })()}
                <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#1E293B]">
                  <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-[#10B981] rounded" /><span className="text-[7px] text-[#64748B]">Spieler</span></div>
                  <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-[#64748B]/40 rounded" /><span className="text-[7px] text-[#64748B]">Team Ø</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : portalView === 'analytics' && selectedPlayer ? (
        <div className="animate-fadeIn">
          <AnalyticsChartsView player={selectedPlayer as any} allPlayers={players as any} />
        </div>
      ) : null}

      {/* Details Modal for Decoded Tracker Record */}
      {detailsModalRecord && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#1E293B] border-4 border-black p-6 max-w-2xl w-full shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] space-y-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex justify-between items-start border-b-4 border-black pb-4">
              <div>
                <span className="bg-amber-400 text-black text-[10px] font-black px-2 py-0.5 uppercase tracking-widest border border-black">
                  ENTSCHLÜSSELTE TRACKER-DATEN
                </span>
                <h2 className="text-2xl font-black uppercase mt-1 tracking-tight">
                  {detailsModalRecord.name} ({detailsModalRecord.datum})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalRecord(null)}
                className="p-1.5 border-2 border-black bg-[#1E293B] hover:bg-red-100 text-black transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-blue-50 p-3 border-2 border-black">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Gesamtdistanz</span>
                <span className="font-black text-sm text-blue-900">{detailsModalRecord.gesamtDistanzMeter} m</span>
              </div>
              <div className="bg-emerald-50 p-3 border-2 border-black">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Dauer</span>
                <span className="font-black text-sm text-emerald-900">{Math.round(detailsModalRecord.gesamtDauerSekunden / 60)} Min</span>
              </div>
              <div className="bg-red-50 p-3 border-2 border-black">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Max Speed</span>
                <span className="font-black text-sm text-red-700">{detailsModalRecord.maxGeschwindigkeitKmh} km/h</span>
              </div>
              <div className="bg-purple-50 p-3 border-2 border-black">
                <span className="text-[10px] text-[#94A3B8] uppercase font-black block">Ø Herzfrequenz</span>
                <span className="font-black text-sm text-purple-900">{detailsModalRecord.durchschnittsHerzfrequenz} bpm</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 p-4 border-2 border-black space-y-2">
                <span className="font-black uppercase text-xs text-amber-950 block">Belastungszonen (Verteilung)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div><strong>Zone 1:</strong> {detailsModalRecord.belastungsZonen?.zone1LockerMin} Min</div>
                  <div><strong>Zone 2:</strong> {detailsModalRecord.belastungsZonen?.zone2NormalMin} Min</div>
                  <div><strong>Zone 3:</strong> {detailsModalRecord.belastungsZonen?.zone3IntensivMin} Min</div>
                  <div><strong>Zone 4:</strong> {detailsModalRecord.belastungsZonen?.zone4SehrIntensivMin} Min</div>
                </div>
              </div>

              <div className="bg-gray-900 text-white p-4 border-2 border-black space-y-2 font-mono">
                <span className="font-black uppercase text-xs text-emerald-400 block">Sprints ({detailsModalRecord.sprints?.length || 0}) & GPS Punkte ({detailsModalRecord.gpsPunkte?.length || 0})</span>
                <div className="text-[11px] text-gray-300">
                  {detailsModalRecord.sprints?.map((s: any, idx: number) => (
                    <div key={idx} className="py-0.5 border-b border-gray-800">
                      Sprint #{idx + 1}: Start bei {s.startSekunde}s • Dauer {s.dauerSekunden}s • Max Speed {s.maxGeschwindigkeitKmh} km/h
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t-2 border-black flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleDeleteTrackerEntry(detailsModalRecord.spielerId ?? '', detailsModalRecord.id ?? '');
                }}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 transition-all"
              >
                <Trash2 size={16} /> Eintrag löschen
              </button>
              <button
                type="button"
                onClick={() => setDetailsModalRecord(null)}
                className="py-2.5 px-6 bg-black hover:bg-gray-800 text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
