import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  RotateCw,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Save,
  Lock,
  Unlock,
  Sparkles,
  Move,
  Target,
  Shield,
  Zap,
  CheckCircle2,
  X,
  Edit3,
  Flame,
  ArrowRight,
  Eye,
  ChevronDown,
  Layers,
  Info,
  Check,
  Award,
  Users,
  PenTool,
  UploadCloud,
  FileText,
  RotateCcw,
  Copy,
  ExternalLink,
  Search,
  Filter,
  CheckSquare,
  Compass,
  CornerDownRight,
  FolderDown,
  Share2,
  Image as ImageIcon
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Player } from '../types';

export interface SetPiecePosition {
  id: string;
  name: string;
  number: number | string;
  team: 'own' | 'opponent';
  xPercent: number; // 0 to 100
  yPercent: number; // 0 to 100
  role?: string;
  highlighted?: boolean;
  locked?: boolean;
}

export interface SetPieceRun {
  id: string;
  playerId?: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  type: 'own_run' | 'opponent_run';
  label?: string;
}

export interface SetPieceBallPath {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  targetLabel?: string;
  style?: 'straight' | 'curved' | 'lofted';
}

export interface SetPieceDrawingStroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  width: number;
  dash?: boolean;
  type: 'freehand' | 'arrow' | 'pass' | 'block' | 'zone';
  label?: string;
}

export interface SetPieceVariant {
  id: string;
  name: string;
  type: 'ecke' | 'freistoss' | 'einwurf' | 'elfmeter';
  side: 'links' | 'rechts' | 'mitte';
  mode: 'offensiv' | 'defensiv';
  rotation: 0 | 90 | 180 | 270;
  positions: SetPiecePosition[];
  runs: SetPieceRun[];
  ballPath?: SetPieceBallPath;
  drawings?: SetPieceDrawingStroke[];
  notes: string;
  description: string;
  sourceMatchId?: string | number;
  sourceMatchOpponent?: string;
  sourceAnalysisId?: string;
  referenceImages?: string[];
  createdAt: string;
  updatedAt: string;
}

interface SetPieceHalfPitchEditorProps {
  players?: Player[];
  competitiveMatches?: any[];
  testMatches?: any[];
  opponents?: any[];
  matchAnalyses?: any[];
  selectedMatchId?: string | number;
  onSaveMatchAnalysis?: (analysis: any) => Promise<void> | void;
  onNavigateToMatchReport?: (analysisId?: string) => void;
}

// Default initial preset items
const INITIAL_SET_PIECES: SetPieceVariant[] = [
  {
    id: 'sp_ecke_off_l',
    name: 'Eckball Links: Variante Kurzer Pfosten & Rückraum',
    type: 'ecke',
    side: 'links',
    mode: 'offensiv',
    rotation: 0,
    positions: [
      { id: 'p1', name: 'B. Dischinger', number: 10, team: 'own', xPercent: 6, yPercent: 6, role: 'Schütze', highlighted: true },
      { id: 'p2', name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 42, yPercent: 22, role: 'Kurzer Pfosten', highlighted: true },
      { id: 'p3', name: 'C. Akuegwu', number: 9, team: 'own', xPercent: 55, yPercent: 28, role: 'Zielspieler / Langer Pfosten' },
      { id: 'p4', name: 'L. Boutagrat', number: 7, team: 'own', xPercent: 50, yPercent: 45, role: 'Rückraum-Schütze', highlighted: true },
      { id: 'p5', name: 'S. Walther', number: 4, team: 'own', xPercent: 48, yPercent: 32, role: 'Blocker' },
      { id: 'p6', name: 'M. Saur', number: 5, team: 'own', xPercent: 62, yPercent: 35, role: 'Zweiter Pfosten' },
      { id: 'p7', name: 'Y. Nothstein', number: 17, team: 'own', xPercent: 32, yPercent: 65, role: 'Absicherung' },
      { id: 'p8', name: 'L. Lais', number: 6, team: 'own', xPercent: 68, yPercent: 68, role: 'Absicherung' },
      // Opponents
      { id: 'op1', name: 'Gegner TW', number: 'TW', team: 'opponent', xPercent: 50, yPercent: 12, role: 'Torwart' },
      { id: 'op2', name: 'Gegner IV 1', number: 'IV', team: 'opponent', xPercent: 45, yPercent: 20, role: 'Erster Pfosten' },
      { id: 'op3', name: 'Gegner IV 2', number: 'IV', team: 'opponent', xPercent: 55, yPercent: 22, role: 'Manndeckung' },
      { id: 'op4', name: 'Gegner LV', number: 'LV', team: 'opponent', xPercent: 38, yPercent: 25, role: 'Kurzer Pfosten' }
    ],
    runs: [
      { id: 'r1', playerId: 'p2', fromX: 42, fromY: 22, toX: 38, toY: 15, color: '#10b981', type: 'own_run' },
      { id: 'r2', playerId: 'p4', fromX: 50, fromY: 45, toX: 48, toY: 32, color: '#06b6d4', type: 'own_run' }
    ],
    ballPath: {
      fromX: 6,
      fromY: 6,
      toX: 38,
      toY: 15,
      targetLabel: 'Kurzer Pfosten'
    },
    notes: 'Dischinger schlägt scharf mit Schnitt zum Tor auf den kurzen Pfosten. Kalchschmidt kreuzt dynamisch, Boutagrat lauert im Rückraum auf den zweiten Ball.',
    description: 'Eckballvariante Links (Offensiv) mit Auftaktfurcht und Einlaufen über den kurzen Pfosten.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp_freistoss_off_r',
    name: 'Freistoß Halbfeld Rechts: Staffelung 16m',
    type: 'freistoss',
    side: 'rechts',
    mode: 'offensiv',
    rotation: 0,
    positions: [
      { id: 'p1', name: 'B. Dischinger', number: 10, team: 'own', xPercent: 78, yPercent: 65, role: 'Freistoßschütze', highlighted: true },
      { id: 'p2', name: 'C. Akuegwu', number: 9, team: 'own', xPercent: 45, yPercent: 35, role: 'Kopfballungeheuer' },
      { id: 'p3', name: 'M. Saur', number: 5, team: 'own', xPercent: 55, yPercent: 35, role: 'Langer Pfosten' },
      { id: 'p4', name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 35, yPercent: 38, role: 'Kurzer Pfosten' },
      // Opponents
      { id: 'op1', name: 'Mauer 1', number: 'M1', team: 'opponent', xPercent: 68, yPercent: 52 },
      { id: 'op2', name: 'Mauer 2', number: 'M2', team: 'opponent', xPercent: 62, yPercent: 52 },
      { id: 'op3', name: 'Gegner TW', number: 'TW', team: 'opponent', xPercent: 50, yPercent: 12 }
    ],
    runs: [
      { id: 'r1', playerId: 'p2', fromX: 45, fromY: 35, toX: 52, toY: 20, color: '#10b981', type: 'own_run' }
    ],
    ballPath: {
      fromX: 78,
      fromY: 65,
      toX: 52,
      toY: 20,
      targetLabel: 'Elfmeterpunkt'
    },
    notes: 'Ball wird mit Zug vom Tor weg auf Höhe Elfmeterpunkt serviert. Akuegwu läuft aus der Tiefe mit hohem Tempo ein.',
    description: 'Halbfeld-Freistoß aus halbrechter Position.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp_einwurf_l',
    name: 'Einwurf Halbfeld Links: Klatschen & Tiefe',
    type: 'einwurf',
    side: 'links',
    mode: 'offensiv',
    rotation: 0,
    positions: [
      { id: 'p1', name: 'S. Walther', number: 4, team: 'own', xPercent: 3, yPercent: 50, role: 'Einwerfer' },
      { id: 'p2', name: 'L. Boutagrat', number: 7, team: 'own', xPercent: 22, yPercent: 45, role: 'Wandspieler', highlighted: true },
      { id: 'p3', name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 30, yPercent: 60, role: 'Tiefenlauf' }
    ],
    runs: [
      { id: 'r1', playerId: 'p2', fromX: 22, fromY: 45, toX: 15, toY: 48, color: '#10b981', type: 'own_run' },
      { id: 'r2', playerId: 'p3', fromX: 30, fromY: 60, toX: 25, toY: 30, color: '#06b6d4', type: 'own_run' }
    ],
    ballPath: {
      fromX: 3,
      fromY: 50,
      toX: 15,
      toY: 48,
      targetLabel: 'Kurzer Einwurf'
    },
    notes: 'Einwurf auf Boutagrat, der per Direktabnahme klatschen lässt. Kalchschmidt startet zeitgleich in die hinterlaufene Lücke.',
    description: 'Weiter/Schneller Einwurf auf der linken Außenbahn.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const SetPieceHalfPitchEditor: React.FC<SetPieceHalfPitchEditorProps> = ({
  players = [],
  competitiveMatches = [],
  testMatches = [],
  opponents = [],
  matchAnalyses = [],
  selectedMatchId: initialSelectedMatchId,
  onSaveMatchAnalysis,
  onNavigateToMatchReport
}) => {
  // Saved Set Pieces List
  const [setPieces, setSetPieces] = useState<SetPieceVariant[]>(() => {
    try {
      const saved = localStorage.getItem('fc_auggen_set_pieces_v2');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load local set pieces', e);
    }
    return INITIAL_SET_PIECES;
  });

  // Firestore Sync Listener
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'set_pieces'), (snapshot) => {
        if (!snapshot.empty) {
          const cloudPieces: SetPieceVariant[] = [];
          snapshot.forEach((doc) => {
            cloudPieces.push(doc.data() as SetPieceVariant);
          });
          setSetPieces(prev => {
            // merge cloud pieces with local
            const map = new Map<string, SetPieceVariant>();
            prev.forEach(p => map.set(p.id, p));
            cloudPieces.forEach(p => map.set(p.id, p));
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('fc_auggen_set_pieces_v2', JSON.stringify(merged));
            } catch (err) {}
            return merged;
          });
        }
      });
      return () => unsub();
    } catch (err) {
      console.warn('Firestore set_pieces listener error', err);
    }
  }, []);

  // Selected Active Variant
  const [selectedId, setSelectedId] = useState<string>(INITIAL_SET_PIECES[0].id);
  const currentVariant = setPieces.find(s => s.id === selectedId) || setPieces[0] || INITIAL_SET_PIECES[0];

  // Editor Working State
  const [positions, setPositions] = useState<SetPiecePosition[]>(currentVariant.positions || []);
  const [runs, setRuns] = useState<SetPieceRun[]>(currentVariant.runs || []);
  const [ballPath, setBallPath] = useState<SetPieceBallPath | undefined>(currentVariant.ballPath);
  const [drawings, setDrawings] = useState<SetPieceDrawingStroke[]>(currentVariant.drawings || []);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(currentVariant.rotation || 0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Text Fields State
  const [variantName, setVariantName] = useState(currentVariant.name);
  const [notesText, setNotesText] = useState(currentVariant.notes || '');
  const [descText, setDescText] = useState(currentVariant.description || '');

  // Inline Editing Toggles
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);

  // Active Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    nodeId: string | null;
    x: number;
    y: number;
  }>({ visible: false, nodeId: null, x: 0, y: 0 });

  // Drawing Tools State ("Nachzeichnen-Modus")
  const [drawingMode, setDrawingMode] = useState<'select' | 'run' | 'ball' | 'freehand' | 'block' | 'zone'>('select');
  const [drawingColor, setDrawingColor] = useState<string>('#10b981');
  const [drawingRunForPlayerId, setDrawingRunForPlayerId] = useState<string | null>(null);
  const [drawingBallPath, setDrawingBallPath] = useState(false);
  const [selectedRolePickerNodeId, setSelectedRolePickerNodeId] = useState<string | null>(null);
  const [isCurrentlyDrawingFreehand, setIsCurrentlyDrawingFreehand] = useState(false);
  const [currentFreehandPoints, setCurrentFreehandPoints] = useState<Array<{ x: number; y: number }>>([]);

  // Match Report Bridge & Synchronization State
  const allMatchesList = [...(competitiveMatches || []), ...(testMatches || [])];
  const [selectedMatchReportId, setSelectedMatchReportId] = useState<string>(() => {
    if (initialSelectedMatchId) return String(initialSelectedMatchId);
    if (matchAnalyses && matchAnalyses.length > 0) return String(matchAnalyses[0].id || matchAnalyses[0].matchId || '');
    if (allMatchesList.length > 0) return String(allMatchesList[0].id);
    return '';
  });
  const [showMatchReportDrawer, setShowMatchReportDrawer] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'imported' | 'ecke' | 'freistoss' | 'einwurf' | 'elfmeter'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Match Analysis Data lookup
  const activeMatchAnalysis = (matchAnalyses || []).find(
    a => String(a.id) === String(selectedMatchReportId) || String(a.matchId) === String(selectedMatchReportId)
  ) || (allMatchesList.find(m => String(m.id) === String(selectedMatchReportId)) ? {
    id: `temp_${selectedMatchReportId}`,
    matchId: selectedMatchReportId,
    opponent: allMatchesList.find(m => String(m.id) === String(selectedMatchReportId))?.opponent || 'Unbekannt',
    date: allMatchesList.find(m => String(m.id) === String(selectedMatchReportId))?.date || '',
    standardsOwn: 'Ecken an den 1. Pfosten schlagen. Kalchschmidt kreuzt kurz, Akuegwu blockiert den Torwart.',
    standardsOpponent: 'Gegner schlägt gefährliche Freistöße auf den 2. Pfosten. Raumdeckung im 5m-Raum halten.',
    standardsOwnImages: [],
    standardsOpponentImages: []
  } : null);

  // Pitch Container Reference
  const pitchRef = useRef<HTMLDivElement>(null);
  const [isDraggingNodeId, setIsDraggingNodeId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Animation Engine State
  const [isPlaying, setIsPlaying] = useState(false);
  const [animProgress, setAnimProgress] = useState(0); // 0 to 100
  const [animSpeed, setAnimSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [showTargetZones, setShowTargetZones] = useState(false);
  const [nodeSize, setNodeSize] = useState<'compact' | 'standard'>('compact');
  const [showRoles, setShowRoles] = useState(true);

  // Sync state when selected variant changes
  useEffect(() => {
    if (currentVariant) {
      setPositions(currentVariant.positions || []);
      setRuns(currentVariant.runs || []);
      setBallPath(currentVariant.ballPath);
      setDrawings(currentVariant.drawings || []);
      setRotation(currentVariant.rotation || 0);
      setVariantName(currentVariant.name);
      setNotesText(currentVariant.notes || '');
      setDescText(currentVariant.description || '');
      setContextMenu({ visible: false, nodeId: null, x: 0, y: 0 });
      setDrawingRunForPlayerId(null);
      setDrawingBallPath(false);
    }
  }, [selectedId]);

  // Toast Helper
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Animation Loop
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setAnimProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1.5 * animSpeed;
        });
      }, 30);
    } else {
      setAnimProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, animSpeed]);

  // Save current variant to state, localStorage & Firestore
  const handleSaveCurrentVariant = async () => {
    const updated: SetPieceVariant = {
      ...currentVariant,
      name: variantName,
      notes: notesText,
      description: descText,
      positions,
      runs,
      ballPath,
      drawings,
      rotation,
      updatedAt: new Date().toISOString()
    };

    const nextList = setPieces.map(s => s.id === selectedId ? updated : s);
    setSetPieces(nextList);
    try {
      localStorage.setItem('fc_auggen_set_pieces_v2', JSON.stringify(nextList));
      await setDoc(doc(db, 'set_pieces', updated.id), updated);
      showToast(`Standard-Variante "${variantName}" erfolgreich gespeichert & synchronisiert!`);
    } catch (e) {
      console.error('Error saving set piece to Firestore', e);
      showToast(`Lokal gespeichert: "${variantName}"`);
    }
  };

  // Create new variant
  const handleCreateNewVariant = () => {
    const newId = `sp_custom_${Date.now()}`;
    const newVariant: SetPieceVariant = {
      id: newId,
      name: `Neue Standard-Variante #${setPieces.length + 1}`,
      type: 'ecke',
      side: 'links',
      mode: 'offensiv',
      rotation: 0,
      positions: [
        { id: `p_${Date.now()}_1`, name: 'B. Dischinger', number: 10, team: 'own', xPercent: 10, yPercent: 10, role: 'Schütze' },
        { id: `p_${Date.now()}_2`, name: 'C. Akuegwu', number: 9, team: 'own', xPercent: 50, yPercent: 30, role: 'Zielspieler' },
        { id: `p_${Date.now()}_3`, name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 45, yPercent: 20, role: 'Kurzer Pfosten' },
        { id: `op_${Date.now()}_1`, name: 'Gegner TW', number: 'TW', team: 'opponent', xPercent: 50, yPercent: 12, role: 'Torwart' }
      ],
      runs: [],
      ballPath: { fromX: 10, fromY: 10, toX: 50, toY: 25, targetLabel: 'Zentrum' },
      drawings: [],
      notes: 'Taktische Vorgaben hier eingeben...',
      description: 'Kurzbeschreibung der Ausführung.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextList = [newVariant, ...setPieces];
    setSetPieces(nextList);
    setSelectedId(newId);
    try {
      localStorage.setItem('fc_auggen_set_pieces_v2', JSON.stringify(nextList));
    } catch (e) {}
    showToast('Neue Standard-Variante erstellt. Bereit zum Nachzeichnen!');
  };

  // 1-CLICK IMPORT: Import from Spielbericht (Match Analysis)
  const handleImportFromMatchReport = async (mode: 'offensiv' | 'defensiv') => {
    if (!activeMatchAnalysis) {
      showToast('Bitte zuerst ein Pflichtspiel / einen Spielbericht auswählen.');
      return;
    }

    const opponentName = activeMatchAnalysis.opponent || 'Gegner';
    const isOff = mode === 'offensiv';
    const rawNotes = isOff
      ? (activeMatchAnalysis.standardsOwn || 'Keine Notizen im Spielbericht vorhanden.')
      : (activeMatchAnalysis.standardsOpponent || 'Keine defensiven Notizen im Spielbericht vorhanden.');
    const refImages = isOff
      ? (activeMatchAnalysis.standardsOwnImages || [])
      : (activeMatchAnalysis.standardsOpponentImages || []);

    const newId = `sp_match_${activeMatchAnalysis.id || activeMatchAnalysis.matchId || Date.now()}_${mode}_${Date.now()}`;
    const generatedName = `[Spielbericht: vs ${opponentName}] Standards ${isOff ? 'Offensiv' : 'Defensiv'}`;

    // Intelligent default player layout based on mode
    const defaultPositions: SetPiecePosition[] = isOff
      ? [
          { id: `p_${Date.now()}_1`, name: 'B. Dischinger', number: 10, team: 'own', xPercent: 6, yPercent: 6, role: 'Schütze', highlighted: true },
          { id: `p_${Date.now()}_2`, name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 42, yPercent: 20, role: 'Kurzer Pfosten', highlighted: true },
          { id: `p_${Date.now()}_3`, name: 'C. Akuegwu', number: 9, team: 'own', xPercent: 55, yPercent: 26, role: 'Zielspieler' },
          { id: `p_${Date.now()}_4`, name: 'L. Boutagrat', number: 7, team: 'own', xPercent: 50, yPercent: 42, role: 'Rückraum' },
          { id: `p_${Date.now()}_5`, name: 'M. Paolillo', number: 4, team: 'own', xPercent: 62, yPercent: 30, role: 'Zweiter Pfosten' },
          { id: `p_${Date.now()}_6`, name: 'S. Walther', number: 5, team: 'own', xPercent: 35, yPercent: 60, role: 'Absicherung' },
          { id: `op_${Date.now()}_1`, name: 'Gegner TW', number: 'TW', team: 'opponent', xPercent: 50, yPercent: 12, role: 'Torwart' },
          { id: `op_${Date.now()}_2`, name: 'Gegner IV', number: 'IV', team: 'opponent', xPercent: 46, yPercent: 22, role: 'Zentrum' }
        ]
      : [
          { id: `p_${Date.now()}_tw`, name: 'L. Schneider', number: 1, team: 'own', xPercent: 50, yPercent: 12, role: 'Torwart', highlighted: true },
          { id: `p_${Date.now()}_iv1`, name: 'M. Paolillo', number: 4, team: 'own', xPercent: 45, yPercent: 22, role: 'Erster Pfosten', highlighted: true },
          { id: `p_${Date.now()}_iv2`, name: 'S. Walther', number: 5, team: 'own', xPercent: 55, yPercent: 24, role: 'Zentrum Manndeckung' },
          { id: `p_${Date.now()}_dm`, name: 'J. Kalchschmidt', number: 8, team: 'own', xPercent: 50, yPercent: 38, role: 'Rückraum-Sicherung' },
          { id: `p_${Date.now()}_av`, name: 'F. Ritzenthaler', number: 3, team: 'own', xPercent: 38, yPercent: 25, role: 'Kurzer Pfosten' },
          { id: `op_${Date.now()}_sch`, name: 'Gegner Schütze', number: 'G10', team: 'opponent', xPercent: 6, yPercent: 6, role: 'Gegner Ausführer' },
          { id: `op_${Date.now()}_st`, name: 'Gegner Zielstürmer', number: 'G9', team: 'opponent', xPercent: 52, yPercent: 25, role: 'Gegner Kopfball' }
        ];

    const newVariant: SetPieceVariant = {
      id: newId,
      name: generatedName,
      type: 'ecke',
      side: 'links',
      mode,
      rotation: 0,
      positions: defaultPositions,
      runs: isOff ? [
        { id: `r_${Date.now()}_1`, playerId: defaultPositions[1].id, fromX: 42, fromY: 20, toX: 38, toY: 15, color: '#10b981', type: 'own_run' }
      ] : [],
      ballPath: { fromX: 6, fromY: 6, toX: 42, toY: 18, targetLabel: isOff ? 'Kurzer Pfosten' : '5m-Raum Abwehr' },
      drawings: [],
      notes: rawNotes,
      description: `Automatisch aus Spielbericht [vs ${opponentName}] übernommen. Taktische Vorgaben können nun nachgezeichnet und verfeinert werden.`,
      sourceMatchId: activeMatchAnalysis.matchId || activeMatchAnalysis.id,
      sourceMatchOpponent: opponentName,
      sourceAnalysisId: activeMatchAnalysis.id,
      referenceImages: refImages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextList = [newVariant, ...setPieces];
    setSetPieces(nextList);
    setSelectedId(newId);

    try {
      localStorage.setItem('fc_auggen_set_pieces_v2', JSON.stringify(nextList));
      await setDoc(doc(db, 'set_pieces', newId), newVariant);
      showToast(`⚡ Standards [vs ${opponentName}] übernommen! Bereit zum Nachzeichnen.`);
    } catch (err) {
      console.error(err);
      showToast(`Standard [vs ${opponentName}] importiert.`);
    }
  };

  // 1-CLICK EXPORT: Push current standard back into Match Report (Spielbericht)
  const handleExportToMatchReport = async () => {
    if (!activeMatchAnalysis) {
      showToast('Kein Spielbericht ausgewählt.');
      return;
    }

    const isOff = currentVariant.mode === 'offensiv';
    const fieldKey = isOff ? 'standardsOwn' : 'standardsOpponent';
    const updatedAnalysis = {
      ...activeMatchAnalysis,
      [fieldKey]: `${notesText}\n\n[Taktiktafel-Synchronisation: ${variantName}]`
    };

    try {
      if (onSaveMatchAnalysis) {
        await onSaveMatchAnalysis(updatedAnalysis);
      }
      await setDoc(doc(db, 'match_analyses', String(updatedAnalysis.id)), updatedAnalysis, { merge: true });
      showToast(`✅ Standard erfolgreich in Spielbericht [vs ${activeMatchAnalysis.opponent || 'Gegner'}] synchronisiert!`);
    } catch (e) {
      console.error('Error exporting to match report', e);
      showToast('Fehler bei der Synchronisation in den Spielbericht.');
    }
  };

  // 1-CLICK BATCH IMPORT: Import all standards from all match analyses
  const handleBatchImportAllMatchReports = async () => {
    if (!matchAnalyses || matchAnalyses.length === 0) {
      showToast('Keine Spielberichte zum Importieren gefunden.');
      return;
    }

    let count = 0;
    const newItems: SetPieceVariant[] = [];

    matchAnalyses.forEach((a) => {
      const opp = a.opponent || 'Gegner';
      if (a.standardsOwn && a.standardsOwn.trim().length > 5) {
        newItems.push({
          id: `sp_batch_${a.id || Date.now()}_off_${count++}`,
          name: `[Spielbericht vs ${opp}] Standards Offensiv`,
          type: 'ecke',
          side: 'links',
          mode: 'offensiv',
          rotation: 0,
          positions: INITIAL_SET_PIECES[0].positions,
          runs: INITIAL_SET_PIECES[0].runs,
          ballPath: INITIAL_SET_PIECES[0].ballPath,
          drawings: [],
          notes: a.standardsOwn,
          description: `Importiert aus Spielbericht vs ${opp} (${a.date || 'Kein Datum'})`,
          sourceMatchId: a.matchId,
          sourceMatchOpponent: opp,
          sourceAnalysisId: a.id,
          referenceImages: a.standardsOwnImages || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      if (a.standardsOpponent && a.standardsOpponent.trim().length > 5) {
        newItems.push({
          id: `sp_batch_${a.id || Date.now()}_def_${count++}`,
          name: `[Spielbericht vs ${opp}] Standards Defensiv`,
          type: 'ecke',
          side: 'rechts',
          mode: 'defensiv',
          rotation: 0,
          positions: INITIAL_SET_PIECES[1].positions,
          runs: [],
          ballPath: INITIAL_SET_PIECES[1].ballPath,
          drawings: [],
          notes: a.standardsOpponent,
          description: `Importiert aus Spielbericht vs ${opp} (${a.date || 'Kein Datum'})`,
          sourceMatchId: a.matchId,
          sourceMatchOpponent: opp,
          sourceAnalysisId: a.id,
          referenceImages: a.standardsOpponentImages || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (newItems.length === 0) {
      showToast('Keine neuen detaillierten Standards in den Spielberichten gefunden.');
      return;
    }

    const merged = [...newItems, ...setPieces];
    setSetPieces(merged);
    try {
      localStorage.setItem('fc_auggen_set_pieces_v2', JSON.stringify(merged));
      for (const item of newItems) {
        await setDoc(doc(db, 'set_pieces', item.id), item);
      }
      showToast(`🔥 ${newItems.length} Standards erfolgreich aus allen Spielberichten importiert!`);
    } catch (e) {
      showToast(`${newItems.length} Standards lokal importiert.`);
    }
  };

  // Dragging logic for player nodes
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (drawingMode !== 'select') return;
    const node = positions.find(p => p.id === nodeId);
    if (node?.locked) {
      showToast('Dieser Spieler ist gesperrt. Entsperren im Kontext-Menü.');
      return;
    }
    setIsDraggingNodeId(nodeId);
  };

  // Convert client coordinates to pitch percentage (accounting for rotation)
  const getPitchCoords = (clientX: number, clientY: number) => {
    if (!pitchRef.current) return { xPercent: 50, yPercent: 50 };
    const rect = pitchRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    // Constrain 0 to 100
    x = Math.max(2, Math.min(98, x));
    y = Math.max(2, Math.min(98, y));

    return { xPercent: Math.round(x * 10) / 10, yPercent: Math.round(y * 10) / 10 };
  };

  // Mouse move handler for dragging, running and freehand drawing
  const handlePitchMouseMove = (e: React.MouseEvent | MouseEvent | TouchEvent) => {
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const { xPercent, yPercent } = getPitchCoords(clientX, clientY);

    // 1. Dragging Node
    if (isDraggingNodeId) {
      setPositions(prev => prev.map(p => {
        if (p.id === isDraggingNodeId) {
          return { ...p, xPercent, yPercent };
        }
        return p;
      }));

      // Also update linked run start positions
      setRuns(prev => prev.map(r => {
        if (r.playerId === isDraggingNodeId) {
          return { ...r, fromX: xPercent, fromY: yPercent };
        }
        return r;
      }));
    }

    // 2. Freehand drawing in progress
    if (isCurrentlyDrawingFreehand) {
      setCurrentFreehandPoints(prev => [...prev, { x: xPercent, y: yPercent }]);
    }
  };

  // Pitch Mouse Down / Click handler for Drawing Tools
  const handlePitchMouseDown = (e: React.MouseEvent) => {
    const { xPercent, yPercent } = getPitchCoords(e.clientX, e.clientY);

    // Freehand drawing start
    if (drawingMode === 'freehand') {
      setIsCurrentlyDrawingFreehand(true);
      setCurrentFreehandPoints([{ x: xPercent, y: yPercent }]);
      return;
    }
  };

  const handlePitchMouseUp = (e: React.MouseEvent) => {
    setIsDraggingNodeId(null);

    // Finish freehand drawing
    if (isCurrentlyDrawingFreehand && currentFreehandPoints.length > 1) {
      const newStroke: SetPieceDrawingStroke = {
        id: `draw_${Date.now()}`,
        points: currentFreehandPoints,
        color: drawingColor,
        width: 3,
        type: 'freehand'
      };
      setDrawings(prev => [...prev, newStroke]);
      setIsCurrentlyDrawingFreehand(false);
      setCurrentFreehandPoints([]);
      showToast('Zeichnung hinzugefügt.');
    } else {
      setIsCurrentlyDrawingFreehand(false);
      setCurrentFreehandPoints([]);
    }
  };

  // Pitch Click for target points (Laufweg / Ballweg / Sperre / Zone)
  const handlePitchClick = (e: React.MouseEvent) => {
    if (contextMenu.visible) {
      setContextMenu(prev => ({ ...prev, visible: false }));
      return;
    }

    const { xPercent, yPercent } = getPitchCoords(e.clientX, e.clientY);

    // 1. Finishing a player run
    if (drawingRunForPlayerId || drawingMode === 'run') {
      const targetPlayerId = drawingRunForPlayerId || positions[0]?.id;
      const startNode = positions.find(p => p.id === targetPlayerId);
      if (startNode) {
        const newRun: SetPieceRun = {
          id: `r_${Date.now()}`,
          playerId: startNode.id,
          fromX: startNode.xPercent,
          fromY: startNode.yPercent,
          toX: xPercent,
          toY: yPercent,
          color: startNode.team === 'own' ? drawingColor : '#f43f5e',
          type: startNode.team === 'own' ? 'own_run' : 'opponent_run',
          label: 'Laufweg'
        };
        setRuns(prev => [...prev.filter(r => r.playerId !== startNode.id), newRun]);
        setDrawingRunForPlayerId(null);
        if (drawingMode === 'run') setDrawingMode('select');
        showToast(`Laufweg für ${startNode.name} nachgezeichnet!`);
      }
      return;
    }

    // 2. Finishing ball path
    if (drawingBallPath || drawingMode === 'ball') {
      const fromX = currentVariant.side === 'links' ? 6 : currentVariant.side === 'rechts' ? 94 : 50;
      const fromY = currentVariant.side === 'mitte' ? 60 : 6;
      setBallPath({
        fromX,
        fromY,
        toX: xPercent,
        toY: yPercent,
        targetLabel: yPercent < 20 ? 'Kurzer Pfosten' : yPercent < 35 ? 'Zentrum 5m' : 'Rückraum 16m'
      });
      setDrawingBallPath(false);
      if (drawingMode === 'ball') setDrawingMode('select');
      showToast('Ballflugbahn nachgezeichnet!');
      return;
    }

    // 3. Block / T-Bar drawing
    if (drawingMode === 'block') {
      const newBlock: SetPieceDrawingStroke = {
        id: `block_${Date.now()}`,
        points: [
          { x: xPercent - 3, y: yPercent },
          { x: xPercent + 3, y: yPercent }
        ],
        color: '#f43f5e',
        width: 4,
        type: 'block',
        label: 'Sperre'
      };
      setDrawings(prev => [...prev, newBlock]);
      setDrawingMode('select');
      showToast('Sperre / Blocklinie gesetzt.');
      return;
    }

    // 4. Target Zone drawing
    if (drawingMode === 'zone') {
      const newZone: SetPieceDrawingStroke = {
        id: `zone_${Date.now()}`,
        points: [
          { x: xPercent - 8, y: yPercent - 6 },
          { x: xPercent + 8, y: yPercent - 6 },
          { x: xPercent + 8, y: yPercent + 6 },
          { x: xPercent - 8, y: yPercent + 6 }
        ],
        color: drawingColor,
        width: 2,
        dash: true,
        type: 'zone',
        label: 'Zielzone'
      };
      setDrawings(prev => [...prev, newZone]);
      setDrawingMode('select');
      showToast('Taktische Zielzone markiert.');
      return;
    }
  };

  // Undo Last Drawing Stroke
  const handleUndoDrawing = () => {
    if (drawings.length > 0) {
      setDrawings(prev => prev.slice(0, -1));
      showToast('Letzter Zeichenschritt rückgängig gemacht.');
    } else if (runs.length > 0) {
      setRuns(prev => prev.slice(0, -1));
      showToast('Letzter Laufweg entfernt.');
    } else {
      showToast('Keine weiteren Zeichnungen zum Rückgängigmachen.');
    }
  };

  // Clear all drawings
  const handleClearAllDrawings = () => {
    setDrawings([]);
    setRuns([]);
    setBallPath(undefined);
    showToast('Alle Skizzen & Laufwege auf dem Spielfeld gelöscht.');
  };

  // Node Click -> Open Context Menu
  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    const node = positions.find(p => p.id === nodeId);
    if (!node) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setContextMenu({
      visible: true,
      nodeId,
      x: Math.min(x, rect.width - 200),
      y: Math.min(y, rect.height - 220)
    });
  };

  // Context Menu Actions
  const handleToggleHighlight = (nodeId: string) => {
    setPositions(prev => prev.map(p => p.id === nodeId ? { ...p, highlighted: !p.highlighted } : p));
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleToggleLock = (nodeId: string) => {
    setPositions(prev => prev.map(p => p.id === nodeId ? { ...p, locked: !p.locked } : p));
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleAssignRole = (nodeId: string, roleName: string) => {
    setPositions(prev => prev.map(p => p.id === nodeId ? { ...p, role: roleName } : p));
    setSelectedRolePickerNodeId(null);
    setContextMenu(prev => ({ ...prev, visible: false }));
    showToast(`Rolle "${roleName}" zugewiesen.`);
  };

  const handleAddPlayerNode = (team: 'own' | 'opponent') => {
    const isOwn = team === 'own';
    const count = positions.filter(p => p.team === team).length + 1;
    const newNode: SetPiecePosition = {
      id: `p_add_${Date.now()}`,
      name: isOwn ? `Spieler ${count}` : `Gegner ${count}`,
      number: count,
      team,
      xPercent: isOwn ? 45 : 55,
      yPercent: isOwn ? 40 : 20,
      role: isOwn ? 'Feldspieler' : 'Verteidiger'
    };
    setPositions(prev => [...prev, newNode]);
    showToast(`${isOwn ? 'Eigener Spieler' : 'Gegnerischer Spieler'} hinzugefügt.`);
  };

  const handleRemoveNode = (nodeId: string) => {
    setPositions(prev => prev.filter(p => p.id !== nodeId));
    setRuns(prev => prev.filter(r => r.playerId !== nodeId));
    setContextMenu(prev => ({ ...prev, visible: false }));
    showToast('Spieler entfernt.');
  };

  // Rotation cycle: 0 -> 90 -> 180 -> 270 -> 0
  const handleRotatePitch = () => {
    const nextRot = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    setRotation(nextRot);
    showToast(`Spielfeld gedreht auf ${nextRot}°`);
  };

  // Filtered list of variants
  const filteredVariants = setPieces.filter(sp => {
    if (categoryFilter === 'imported' && !sp.sourceMatchOpponent && !sp.name.includes('Spielbericht')) return false;
    if (categoryFilter === 'ecke' && sp.type !== 'ecke') return false;
    if (categoryFilter === 'freistoss' && sp.type !== 'freistoss') return false;
    if (categoryFilter === 'einwurf' && sp.type !== 'einwurf') return false;
    if (categoryFilter === 'elfmeter' && sp.type !== 'elfmeter') return false;
    if (searchQuery.trim() && !sp.name.toLowerCase().includes(searchQuery.toLowerCase()) && !sp.notes.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className={`space-y-6 transition-all ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-6 overflow-y-auto' : ''}`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-emerald-500 text-slate-950 font-black text-xs px-4 py-3 rounded-xl shadow-2xl border border-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚡ SPIELBERICHT STANDARDS-INTEGRATION & 1-KLICK SYNCHRONISATION */}
      <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-400 p-5 rounded-2xl shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              <Zap size={24} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black uppercase text-amber-300 tracking-wider flex items-center gap-2">
                ⚡ SPIELBERICHT STANDARDS-SYNCHRONISATION & NACHZEICHNEN
              </h3>
              <p className="text-xs text-slate-300 font-medium leading-snug">
                Verknüpft alle im Spielbericht definierten Standards direkt mit der interaktiven 3D-Taktiktafel. Übernehme Gegner-Analysen, zeichne Laufwege nach und synchronisiere zurück in den Spielbericht.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              onClick={handleBatchImportAllMatchReports}
              className="bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/50 hover:border-amber-400 font-black text-[11px] uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow"
              title="Sucht in allen Spielberichten nach Standards und fügt sie der Bibliothek hinzu"
            >
              <FolderDown size={14} />
              Alle Spielberichte importieren
            </button>

            <button
              onClick={() => setShowMatchReportDrawer(!showMatchReportDrawer)}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] uppercase px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow"
            >
              <FileText size={14} />
              {showMatchReportDrawer ? 'Gegner-Standarddetails verbergen' : 'Gegner-Standarddetails einblenden'}
            </button>
          </div>
        </div>

        {/* Spielbericht-Auswahl Dropdown & Schnellaktionen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-amber-500/20">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase text-amber-300 tracking-wider block mb-1">
              Verknüpftes Pflichtspiel / Spielbericht auswählen:
            </label>
            <div className="relative">
              <select
                value={selectedMatchReportId}
                onChange={(e) => setSelectedMatchReportId(e.target.value)}
                className="w-full bg-slate-950 border-2 border-amber-400/80 hover:border-amber-400 text-xs sm:text-sm font-bold text-amber-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 shadow-inner"
              >
                <option value="">-- Pflichtspiel für Standard-Import wählen --</option>
                {allMatchesList.map((m) => (
                  <option key={m.id} value={m.id}>
                    ⚽ [{m.date || 'Kein Datum'}] FC Auggen vs. {m.opponent} ({m.isHome ? 'Heim' : 'Auswärts'}, {m.competition || 'Pflichtspiel'} {m.result ? `| ${m.result}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => handleImportFromMatchReport('offensiv')}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 active:scale-95"
              title="Offensiven Standard aus dem Spielbericht übernehmen & in Halbfeld laden"
            >
              <Plus size={14} />
              📥 Offensiv übernehmen
            </button>
            <button
              onClick={() => handleImportFromMatchReport('defensiv')}
              className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 active:scale-95"
              title="Defensiven Standard aus dem Spielbericht übernehmen & in Halbfeld laden"
            >
              <Shield size={14} />
              📥 Defensiv übernehmen
            </button>
          </div>
        </div>

        {/* DETAILS DES AUSGEWÄHLTEN SPIELBERICHTS */}
        {showMatchReportDrawer && activeMatchAnalysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-black uppercase text-xs">
                  📌 Spielbericht-Inhalte: FC Auggen vs. {activeMatchAnalysis.opponent || 'Gegner'}
                </span>
                {activeMatchAnalysis.date && (
                  <span className="text-slate-400 font-mono text-[10px]">({activeMatchAnalysis.date})</span>
                )}
              </div>
              <button
                onClick={handleExportToMatchReport}
                className="bg-amber-400/20 hover:bg-amber-400 hover:text-slate-950 text-amber-300 font-black text-[10px] uppercase px-3 py-1 rounded-lg border border-amber-400/40 flex items-center gap-1 transition-all"
              >
                <UploadCloud size={12} />
                Taktiktafel-Stand zurück in Spielbericht speichern
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Offensiv Vorgaben */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-emerald-500/30 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-emerald-400 flex items-center gap-1">
                  ⚽ Standards Offensiv (Für uns):
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {activeMatchAnalysis.standardsOwn || 'Keine offensiven Vorgaben im Spielbericht hinterlegt.'}
                </p>
                {activeMatchAnalysis.standardsOwnImages && activeMatchAnalysis.standardsOwnImages.length > 0 && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Skizzen/Fotos vorhanden:</span>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {activeMatchAnalysis.standardsOwnImages.map((img: string, i: number) => (
                        <img key={i} src={img} alt="Standard Skizze" className="w-10 h-10 object-cover rounded border border-emerald-500/50" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Defensiv Vorgaben */}
              <div className="bg-slate-900/90 p-3 rounded-xl border border-rose-500/30 space-y-1.5">
                <span className="text-[10px] font-black uppercase text-rose-400 flex items-center gap-1">
                  🛡️ Standards Defensiv (Gegen uns):
                </span>
                <p className="text-slate-200 text-[11px] leading-relaxed italic bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  {activeMatchAnalysis.standardsOpponent || 'Keine defensiven Vorgaben im Spielbericht hinterlegt.'}
                </p>
                {activeMatchAnalysis.standardsOpponentImages && activeMatchAnalysis.standardsOpponentImages.length > 0 && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Skizzen/Fotos vorhanden:</span>
                    <div className="flex gap-1.5 overflow-x-auto">
                      {activeMatchAnalysis.standardsOpponentImages.map((img: string, i: number) => (
                        <img key={i} src={img} alt="Defensiv Skizze" className="w-10 h-10 object-cover rounded border border-rose-500/50" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* HEADER BAR & VARIANT SELECTOR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Target size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variantName}
                      onChange={(e) => setVariantName(e.target.value)}
                      className="bg-slate-950 border border-emerald-500 text-white font-black text-lg px-3 py-1 rounded-xl focus:outline-none"
                    />
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg font-bold"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <h3
                    onClick={() => setIsEditingTitle(true)}
                    className="font-black text-xl uppercase tracking-wider text-white flex items-center gap-2 group cursor-pointer hover:text-emerald-400 transition-colors"
                  >
                    <span>{variantName}</span>
                    <Edit3 size={14} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Interaktives Halbfeld-Studio: Positionen verschieben, Laufwege nachzeichnen & Spielbericht-Standards verwalten
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCreateNewVariant}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs uppercase px-3.5 py-2 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shadow"
            >
              <Plus size={15} />
              Neue Variante
            </button>

            <button
              onClick={handleSaveCurrentVariant}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2"
            >
              <Save size={16} />
              Speichern
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase border transition-all flex items-center gap-1.5 shadow-md ${
                isFullscreen
                  ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-500/40 hover:border-amber-400'
              }`}
              title={isFullscreen ? 'Vollbild beenden' : 'Vollbildmodus aktivieren'}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              <span>{isFullscreen ? 'Vollbild Beenden' : '🖥️ Vollbild'}</span>
            </button>
          </div>
        </div>

        {/* VARIANT PICKER & FILTER CATEGORIES */}
        <div className="space-y-3">
          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={11} /> Filter:
            </span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border ${
                categoryFilter === 'all' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              Alle ({setPieces.length})
            </button>
            <button
              onClick={() => setCategoryFilter('imported')}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border flex items-center gap-1 ${
                categoryFilter === 'imported' ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-950 text-amber-400 border-amber-500/40 hover:text-amber-300'
              }`}
            >
              <Zap size={11} />
              Aus Spielberichten ({setPieces.filter(s => s.sourceMatchOpponent || s.name.includes('Spielbericht')).length})
            </button>
            <button
              onClick={() => setCategoryFilter('ecke')}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border ${
                categoryFilter === 'ecke' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              ⚽ Ecken
            </button>
            <button
              onClick={() => setCategoryFilter('freistoss')}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border ${
                categoryFilter === 'freistoss' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🎯 Freistöße
            </button>
            <button
              onClick={() => setCategoryFilter('einwurf')}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition-all border ${
                categoryFilter === 'einwurf' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              🤾 Einwürfe
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            {/* Variant Selector Dropdown */}
            <div className="md:col-span-2">
              <div className="relative">
                <select
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="w-full bg-slate-950 border-2 border-emerald-500/60 hover:border-emerald-500 text-emerald-300 font-bold text-xs p-3 rounded-xl focus:outline-none focus:border-emerald-500 appearance-none pr-8 cursor-pointer shadow-inner"
                >
                  {filteredVariants.map(sp => (
                    <option key={sp.id} value={sp.id}>
                      {sp.sourceMatchOpponent || sp.name.includes('Spielbericht') ? '📌 ' : ''}
                      {sp.type === 'ecke' && '⚽ Eckball'}
                      {sp.type === 'freistoss' && '🎯 Freistoß'}
                      {sp.type === 'einwurf' && '🤾 Einwurf'}
                      {sp.type === 'elfmeter' && '🥅 Elfmeter'} ({sp.side.toUpperCase()} - {sp.mode.toUpperCase()}) — {sp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Standard Type Buttons */}
            <div>
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => {
                    const updated = { ...currentVariant, type: 'ecke' as const };
                    setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${currentVariant.type === 'ecke' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Ecke
                </button>
                <button
                  onClick={() => {
                    const updated = { ...currentVariant, type: 'freistoss' as const };
                    setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${currentVariant.type === 'freistoss' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Freistoß
                </button>
                <button
                  onClick={() => {
                    const updated = { ...currentVariant, type: 'einwurf' as const };
                    setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-all ${currentVariant.type === 'einwurf' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'}`}
                >
                  Einwurf
                </button>
              </div>
            </div>

            {/* Side & Mode Controls */}
            <div>
              <div className="flex gap-2">
                <div className="flex-1 flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
                  <button
                    onClick={() => {
                      const updated = { ...currentVariant, side: 'links' as const };
                      setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                    }}
                    className={`flex-1 py-1 rounded-lg text-center ${currentVariant.side === 'links' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400'}`}
                  >
                    Links
                  </button>
                  <button
                    onClick={() => {
                      const updated = { ...currentVariant, side: 'mitte' as const };
                      setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                    }}
                    className={`flex-1 py-1 rounded-lg text-center ${currentVariant.side === 'mitte' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400'}`}
                  >
                    Mitte
                  </button>
                  <button
                    onClick={() => {
                      const updated = { ...currentVariant, side: 'rechts' as const };
                      setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                    }}
                    className={`flex-1 py-1 rounded-lg text-center ${currentVariant.side === 'rechts' ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-400'}`}
                  >
                    Rechts
                  </button>
                </div>

                <button
                  onClick={() => {
                    const nextMode: 'offensiv' | 'defensiv' = currentVariant.mode === 'offensiv' ? 'defensiv' : 'offensiv';
                    const updated = { ...currentVariant, mode: nextMode };
                    setSetPieces(prev => prev.map(s => s.id === selectedId ? updated : s));
                  }}
                  className={`px-3 py-1.5 rounded-xl font-black text-xs uppercase border transition-all ${
                    currentVariant.mode === 'offensiv'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                      : 'bg-rose-950 text-rose-400 border-rose-500/40'
                  }`}
                >
                  {currentVariant.mode === 'offensiv' ? '⚽ Offensiv' : '🛡️ Defensiv'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎨 NACHZEICHNEN & INTERAKTIVE WERKZEUG-LEISTE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5 mr-2">
            <PenTool size={15} />
            Nachzeichnen-Studio:
          </span>

          {/* Mode Selector Buttons */}
          <button
            onClick={() => setDrawingMode('select')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'select'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            <Move size={13} />
            Spieler ziehen
          </button>

          <button
            onClick={() => {
              setDrawingMode('run');
              showToast('Klicke auf das Spielfeld, um einen dynamischen Laufweg nachzuzeichnen.');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'run'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-950 text-amber-400 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <ArrowRight size={13} />
            Laufweg nachzeichnen
          </button>

          <button
            onClick={() => {
              setDrawingMode('ball');
              showToast('Klicke auf das Spielfeld, um den Zielflug des Balles festzulegen.');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'ball'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                : 'bg-slate-950 text-amber-300 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <Target size={13} />
            Ballflug nachzeichnen
          </button>

          <button
            onClick={() => {
              setDrawingMode('freehand');
              showToast('Halte die Maustaste gedrückt und zeichne frei auf dem Spielfeld.');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'freehand'
                ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-md'
                : 'bg-slate-950 text-cyan-300 border-slate-800 hover:border-cyan-500/50'
            }`}
          >
            <Edit3 size={13} />
            Freihand Stift
          </button>

          <button
            onClick={() => {
              setDrawingMode('block');
              showToast('Klicke auf das Spielfeld, um eine Sperre / Blocklinie zu setzen.');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'block'
                ? 'bg-rose-500 text-white border-rose-300 shadow-md'
                : 'bg-slate-950 text-rose-400 border-slate-800 hover:border-rose-500/50'
            }`}
          >
            <Shield size={13} />
            Sperre / Blocklinie
          </button>

          <button
            onClick={() => {
              setDrawingMode('zone');
              showToast('Klicke auf das Spielfeld, um eine Zielzone zu markieren.');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 transition-all border ${
              drawingMode === 'zone'
                ? 'bg-teal-500 text-slate-950 border-teal-300 shadow-md'
                : 'bg-slate-950 text-teal-300 border-slate-800 hover:border-teal-500/50'
            }`}
          >
            <Layers size={13} />
            Zielzone
          </button>
        </div>

        {/* Color Palette & Undo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {['#10b981', '#06b6d4', '#fbbf24', '#f43f5e', '#a855f7', '#ffffff'].map((c) => (
              <button
                key={c}
                onClick={() => setDrawingColor(c)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  drawingColor === c ? 'scale-125 border-white ring-2 ring-white/50' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={handleUndoDrawing}
            className="bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1 transition-all"
            title="Letzten Schritt rückgängig machen"
          >
            <RotateCcw size={13} />
            Rückgängig
          </button>

          <button
            onClick={handleClearAllDrawings}
            className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-bold px-2.5 py-1.5 rounded-xl border border-rose-600/40 flex items-center gap-1 transition-all"
            title="Alle Zeichnungen & Laufwege entfernen"
          >
            <Trash2 size={13} />
            Skizzen löschen
          </button>
        </div>
      </div>

      {/* MAIN PITCH & TACTICAL BOARD WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* INTERACTIVE HALF-PITCH CANVAS */}
        <div className="lg:col-span-3 bg-slate-950 border-2 border-slate-800 rounded-2xl p-4 shadow-2xl relative overflow-hidden flex flex-col items-center">
          {/* Pitch Control Bar */}
          <div className="w-full flex flex-wrap items-center justify-between mb-3 px-2 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                Rotation: {rotation}°
              </span>
              <button
                onClick={handleRotatePitch}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <RotateCw size={13} />
                Drehen (90°)
              </button>

              <button
                onClick={() => setShowTargetZones(!showTargetZones)}
                className={`text-xs font-bold px-3 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                  showTargetZones ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Layers size={13} />
                Zonen-Overlay
              </button>

              <button
                onClick={() => setNodeSize(nodeSize === 'compact' ? 'standard' : 'compact')}
                className={`text-xs font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  nodeSize === 'compact' ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 font-black' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title="Figurengröße umschalten"
              >
                <span>Figuren: {nodeSize === 'compact' ? 'Klein (Kompakt)' : 'Normal'}</span>
              </button>

              <button
                onClick={() => setShowRoles(!showRoles)}
                className={`text-xs font-bold px-2 py-1 rounded-lg border flex items-center gap-1 transition-all ${
                  showRoles ? 'bg-slate-800 text-amber-300 border-amber-500/40' : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
                title="Rollen-Beschriftung ein-/ausblenden"
              >
                <span>Rollen {showRoles ? 'AN' : 'AUS'}</span>
              </button>
            </div>

            {/* Animation Playback Controls */}
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`text-xs font-black px-4 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-md ${
                  isPlaying ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                }`}
              >
                {isPlaying ? '⏹ Animation Stoppen' : '▶ Animation Abspielen'}
              </button>

              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-400">
                <span>Tempo:</span>
                {([0.5, 1, 1.5, 2] as const).map(spd => (
                  <button
                    key={spd}
                    onClick={() => setAnimSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded ${animSpeed === spd ? 'bg-emerald-500 text-slate-950 font-black' : 'hover:bg-slate-800'}`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddPlayerNode('own')}
                className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold text-[11px] px-2.5 py-1 rounded-lg border border-emerald-600/40"
              >
                + Spieler
              </button>
              <button
                onClick={() => handleAddPlayerNode('opponent')}
                className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-[11px] px-2.5 py-1 rounded-lg border border-rose-600/40"
              >
                + Gegner
              </button>
            </div>
          </div>

          {/* Interactive Half Pitch SVG / HTML Stage */}
          <div
            ref={pitchRef}
            onClick={handlePitchClick}
            onMouseDown={handlePitchMouseDown}
            onMouseMove={handlePitchMouseMove}
            onMouseUp={handlePitchMouseUp}
            className="relative w-full h-[530px] bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950/40 rounded-xl border border-emerald-500/30 overflow-hidden cursor-crosshair select-none shadow-inner"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.4s ease-out'
            }}
          >
            {/* Field Lines SVG & Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-emerald-500/30 fill-none" strokeWidth="2">
              {/* Outer boundary */}
              <rect x="2%" y="2%" width="96%" height="96%" rx="8" />

              {/* Goal Area & Penalty Box */}
              <rect x="25%" y="2%" width="50%" height="28%" />
              <rect x="36%" y="2%" width="28%" height="10%" />

              {/* Penalty Spot & Arc */}
              <circle cx="50%" cy="18%" r="3" className="fill-emerald-400" />
              <path d="M 40% 30% A 12 12 0 0 0 60% 30%" strokeDasharray="4 4" />

              {/* Target Zones Overlay */}
              {showTargetZones && (
                <g className="opacity-70">
                  <rect x="25%" y="2%" width="20%" height="15%" className="fill-amber-500/20 stroke-amber-400" strokeDasharray="3 3" />
                  <text x="35%" y="9%" className="fill-amber-300 text-[10px] font-black" textAnchor="middle">Kurzer Pfosten</text>

                  <rect x="55%" y="2%" width="20%" height="15%" className="fill-amber-500/20 stroke-amber-400" strokeDasharray="3 3" />
                  <text x="65%" y="9%" className="fill-amber-300 text-[10px] font-black" textAnchor="middle">Langer Pfosten</text>

                  <rect x="25%" y="30%" width="50%" height="12%" className="fill-cyan-500/20 stroke-cyan-400" strokeDasharray="3 3" />
                  <text x="50%" y="36%" className="fill-cyan-300 text-[10px] font-black" textAnchor="middle">Rückraum 16m</text>
                </g>
              )}

              {/* Goal Post Line */}
              <line x1="42%" y1="2%" x2="58%" y2="2%" strokeWidth="5" className="stroke-white" />

              {/* Corner Arcs */}
              <path d="M 2% 8% A 10 10 0 0 0 8% 2%" />
              <path d="M 92% 2% A 10 10 0 0 0 98% 8%" />

              {/* Halfway Line & Center Arc */}
              <line x1="2%" y1="90%" x2="98%" y2="90%" />
              <path d="M 38% 90% A 20 20 0 0 1 62% 90%" />

              {/* SVG Markers for Arrows */}
              <defs>
                <marker id="arrow-own" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
                <marker id="arrow-opponent" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
                </marker>
                <marker id="arrow-ball" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
                </marker>
              </defs>

              {/* DRAW FREEHAND / SKETCH STROKES ("Nachgezeichnete Linien") */}
              {drawings.map((d) => {
                if (d.type === 'freehand' && d.points.length > 1) {
                  const pathData = d.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '');
                  return (
                    <path
                      key={d.id}
                      d={pathData}
                      stroke={d.color}
                      strokeWidth={d.width || 3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  );
                }
                if (d.type === 'block' && d.points.length >= 2) {
                  return (
                    <g key={d.id}>
                      <line
                        x1={`${d.points[0].x}%`}
                        y1={`${d.points[0].y}%`}
                        x2={`${d.points[1].x}%`}
                        y2={`${d.points[1].y}%`}
                        stroke={d.color}
                        strokeWidth="5"
                      />
                      <line
                        x1={`${(d.points[0].x + d.points[1].x) / 2}%`}
                        y1={`${(d.points[0].y + d.points[1].y) / 2}%`}
                        x2={`${(d.points[0].x + d.points[1].x) / 2}%`}
                        y2={`${(d.points[0].y + d.points[1].y) / 2 - 4}%`}
                        stroke={d.color}
                        strokeWidth="3"
                      />
                    </g>
                  );
                }
                if (d.type === 'zone' && d.points.length >= 4) {
                  const pathData = d.points.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '') + ' Z';
                  return (
                    <path
                      key={d.id}
                      d={pathData}
                      stroke={d.color}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      fill={`${d.color}22`}
                    />
                  );
                }
                return null;
              })}

              {/* CURRENT ACTIVE FREEHAND STROKE */}
              {isCurrentlyDrawingFreehand && currentFreehandPoints.length > 1 && (
                <path
                  d={currentFreehandPoints.reduce((acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x}% ${pt.y}%`, '')}
                  stroke={drawingColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}

              {/* Draw Player Run Arrows */}
              {runs.map((r) => (
                <line
                  key={r.id}
                  x1={`${r.fromX}%`}
                  y1={`${r.fromY}%`}
                  x2={`${r.toX}%`}
                  y2={`${r.toY}%`}
                  stroke={r.color}
                  strokeWidth="3"
                  strokeDasharray={r.type === 'opponent_run' ? '4 4' : undefined}
                  markerEnd={r.type === 'own_run' ? 'url(#arrow-own)' : 'url(#arrow-opponent)'}
                />
              ))}

              {/* Draw Ball Path Line */}
              {ballPath && (
                <g>
                  <line
                    x1={`${ballPath.fromX}%`}
                    y1={`${ballPath.fromY}%`}
                    x2={`${ballPath.toX}%`}
                    y2={`${ballPath.toY}%`}
                    stroke="#fbbf24"
                    strokeWidth="4"
                    strokeDasharray="6 4"
                    markerEnd="url(#arrow-ball)"
                  />
                  {/* Ball Target Spot Circle */}
                  <circle cx={`${ballPath.toX}%`} cy={`${ballPath.toY}%`} r="12" className="fill-amber-400/20 stroke-amber-400" strokeWidth="2" />
                </g>
              )}
            </svg>

            {/* Ball Path Target Badge */}
            {ballPath && ballPath.targetLabel && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded shadow-lg border border-amber-200"
                style={{ left: `${ballPath.toX}%`, top: `${ballPath.toY + 4}%` }}
              >
                🎯 {ballPath.targetLabel}
              </div>
            )}

            {/* PLAYER NODES */}
            {positions.map((pos) => {
              const isOwn = pos.team === 'own';
              const playerRun = runs.find(r => r.playerId === pos.id);
              let displayX = pos.xPercent;
              let displayY = pos.yPercent;

              if (isPlaying && playerRun) {
                const factor = Math.min(1, animProgress / 100);
                displayX = playerRun.fromX + (playerRun.toX - playerRun.fromX) * factor;
                displayY = playerRun.fromY + (playerRun.toY - playerRun.fromY) * factor;
              }

              const isCompact = nodeSize === 'compact';

              return (
                <div
                  key={pos.id}
                  onMouseDown={(e) => handleNodeMouseDown(e, pos.id)}
                  onClick={(e) => handleNodeClick(e, pos.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-transform select-none ${
                    pos.highlighted ? 'z-30' : 'z-20 hover:scale-110'
                  }`}
                  style={{ left: `${displayX}%`, top: `${displayY}%` }}
                >
                  {/* Circle Badge */}
                  <div
                    className={`${
                      isCompact ? 'w-5.5 h-5.5 text-[9.5px]' : 'w-7 h-7 text-xs'
                    } rounded-full font-black flex items-center justify-center shadow-lg border transition-all ${
                      isOwn
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 border-white/90'
                        : 'bg-gradient-to-br from-rose-600 to-red-800 text-white border-slate-950/80'
                    } ${
                      pos.highlighted
                        ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950 shadow-md shadow-amber-400/50'
                        : ''
                    }`}
                  >
                    {pos.number || (pos.name ? pos.name.substring(0, 2) : '?')}
                  </div>

                  {/* Name & Role Tag (Compact & Legible, non-overlapping) */}
                  <div className="mt-0.5 text-center whitespace-nowrap pointer-events-none flex flex-col items-center">
                    <span className="text-[7.5px] font-bold text-slate-100 bg-slate-950/90 px-1 py-0.2 rounded-full border border-slate-700/60 shadow-xs max-w-[76px] truncate block leading-none">
                      {pos.name}
                    </span>
                    {pos.role && showRoles && (
                      <span className="text-[7px] font-mono font-medium text-amber-300 bg-amber-950/85 px-1 py-0.2 rounded-xs border border-amber-500/30 max-w-[80px] truncate block mt-0.5 leading-none">
                        {pos.role}
                      </span>
                    )}
                  </div>

                  {/* Locked indicator */}
                  {pos.locked && (
                    <div className="absolute -top-1 -right-1 bg-slate-900 text-amber-400 p-0.5 rounded-full border border-amber-500/40">
                      <Lock size={9} />
                    </div>
                  )}
                </div>
              );
            })}

            {/* KONTEXT-MENÜ (Appears directly when clicking a player) */}
            {contextMenu.visible && contextMenu.nodeId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute z-50 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 w-52 text-xs"
                style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const activeNode = positions.find(p => p.id === contextMenu.nodeId);
                  if (!activeNode) return null;
                  return (
                    <>
                      <div className="px-2 py-1.5 border-b border-slate-800 font-black text-amber-300 text-[11px] uppercase flex items-center justify-between">
                        <span>{activeNode.name} (#{activeNode.number})</span>
                        <button onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))} className="text-slate-400 hover:text-white">
                          <X size={14} />
                        </button>
                      </div>

                      {/* 1. Laufweg hinzufügen */}
                      <button
                        onClick={() => {
                          setDrawingRunForPlayerId(activeNode.id);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                          showToast(`Klicke auf das Spielfeld, um den Laufweg für ${activeNode.name} festzulegen.`);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-emerald-400 font-bold flex items-center gap-2 transition-colors"
                      >
                        <ArrowRight size={14} />
                        <span>Laufweg nachzeichnen</span>
                      </button>

                      {/* 2. Ballweg von hier zeichnen */}
                      <button
                        onClick={() => {
                          setDrawingBallPath(true);
                          setContextMenu(prev => ({ ...prev, visible: false }));
                          showToast('Klicke auf das Spielfeld, um den Zielpunkt des Balles festzulegen.');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-amber-300 font-bold flex items-center gap-2 transition-colors"
                      >
                        <Target size={14} />
                        <span>Ballflug von hier</span>
                      </button>

                      {/* 3. Spieler hervorheben */}
                      <button
                        onClick={() => handleToggleHighlight(activeNode.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-bold flex items-center gap-2 transition-colors"
                      >
                        <Sparkles size={14} className="text-amber-400" />
                        <span>{activeNode.highlighted ? 'Hervorhebung aufheben' : 'Spieler hervorheben'}</span>
                      </button>

                      {/* 4. Rolle zuweisen */}
                      <div className="relative">
                        <button
                          onClick={() => setSelectedRolePickerNodeId(selectedRolePickerNodeId === activeNode.id ? null : activeNode.id)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-200 font-bold flex items-center justify-between transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <Layers size={14} className="text-teal-400" />
                            <span>Rolle zuweisen</span>
                          </span>
                          <ChevronDown size={12} />
                        </button>

                        {selectedRolePickerNodeId === activeNode.id && (
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 space-y-1 mt-1">
                            {['Schütze', 'Kurzer Pfosten', 'Langer Pfosten', 'Rückraum', 'Blocker', 'Mauer', 'Absicherung', 'Torwart'].map((r) => (
                              <button
                                key={r}
                                onClick={() => handleAssignRole(activeNode.id, r)}
                                className="w-full text-left px-2 py-1 text-[10px] font-bold text-slate-300 hover:text-emerald-400 hover:bg-slate-900 rounded"
                              >
                                • {r}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 5. Position sperren / freigeben */}
                      <button
                        onClick={() => handleToggleLock(activeNode.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-slate-300 font-bold flex items-center gap-2 transition-colors"
                      >
                        {activeNode.locked ? <Unlock size={14} className="text-emerald-400" /> : <Lock size={14} className="text-amber-400" />}
                        <span>{activeNode.locked ? 'Position freigeben' : 'Position sperren'}</span>
                      </button>

                      {/* 6. Entfernen */}
                      <button
                        onClick={() => handleRemoveNode(activeNode.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-950/50 text-rose-400 font-bold flex items-center gap-2 transition-colors border-t border-slate-800 mt-1"
                      >
                        <Trash2 size={14} />
                        <span>Spieler entfernen</span>
                      </button>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </div>
        </div>

        {/* INLINE EDITABLE TACTICAL NOTES & INSTRUCTIONS PANEL */}
        <div className="space-y-6">
          {/* Notes & Explanation Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-black text-sm uppercase text-amber-400 flex items-center gap-2 tracking-wider">
                <Edit3 size={16} />
                Taktik-Anweisungen & Ablauf
              </h4>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 uppercase font-semibold">
                {currentVariant.sourceMatchOpponent ? `📌 vs ${currentVariant.sourceMatchOpponent}` : 'Standard'}
              </span>
            </div>

            {/* Description (Inline Editable) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-300">Kurzbeschreibung:</label>
              {isEditingDesc ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={descText}
                    onChange={(e) => setDescText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-100 p-3 rounded-xl focus:border-amber-400 focus:outline-none font-medium"
                  />
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Übernehmen
                  </button>
                </div>
              ) : (
                <p
                  onClick={() => setIsEditingDesc(true)}
                  className="text-xs text-slate-100 bg-slate-950 p-3.5 rounded-xl border border-slate-800 cursor-pointer hover:border-amber-400 transition-colors leading-relaxed font-medium"
                >
                  {descText || 'Klicken Sie hier, um eine Beschreibung einzugeben...'}
                </p>
              )}
            </div>

            {/* Tactical Notes (Inline Editable) */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-amber-400">Standard-Ablauf / Schlüsselbewegungen:</label>
              {isEditingNotes ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs text-slate-100 p-3 rounded-xl focus:border-amber-400 focus:outline-none font-medium"
                  />
                  <button
                    onClick={() => setIsEditingNotes(false)}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Übernehmen
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingNotes(true)}
                  className="text-xs text-slate-100 bg-slate-950 p-3.5 rounded-xl border border-slate-800 cursor-pointer hover:border-amber-400 transition-colors leading-relaxed whitespace-pre-line font-medium"
                >
                  {notesText || 'Klicken Sie hier, um taktische Notizen hinzuzufügen...'}
                </div>
              )}
            </div>

            {/* Reference Images from Match Report if attached */}
            {currentVariant.referenceImages && currentVariant.referenceImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <ImageIcon size={12} /> Zugehörige Spielbericht-Skizzen:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {currentVariant.referenceImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt="Match report sketch"
                      className="w-full h-24 object-cover rounded-xl border border-slate-700 hover:scale-105 transition-transform"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
              <button
                onClick={handleSaveCurrentVariant}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Save size={15} />
                Standard dauerhaft sichern
              </button>

              <button
                onClick={handleExportToMatchReport}
                className="w-full bg-slate-950 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase py-2 rounded-xl border border-amber-500/30 flex items-center justify-center gap-1.5 transition-all"
              >
                <Share2 size={13} />
                In Spielbericht übertragen
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
