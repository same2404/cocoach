import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '../types';
import { 
  Maximize2, 
  Minimize2, 
  Play, 
  Pause, 
  RotateCcw, 
  Layers, 
  Flame, 
  Sparkles, 
  Activity, 
  Compass, 
  ShieldAlert, 
  Eye, 
  X, 
  Sliders, 
  Info,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
  AlertTriangle,
  UserCheck,
  Brain,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  Check,
  Copy,
  UserPlus,
  RefreshCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface KaderAgentModalProps {
  players: Player[];
  onClose: () => void;
  initialPreset?: 'beste_formation' | 'topform_startelf' | 'vollbild_ordnung' | 'laufwege_profi';
}

export type GameSituation = 'offensiv' | 'defensiv' | 'umschalten' | 'pressing';
export type TacticalFormation = '4-3-3' | '4-2-3-1' | '3-5-2' | '4-4-2' | '3-4-3' | '4-1-4-1' | '3-4-1-2';

export interface EvaluatedPlayer {
  player: Player;
  topformScore: number; // 0 - 100%
  status: 'topform' | 'normal' | 'risiko';
  highIntensityKm: number;
  sprintScore: number;
  riskScore: number; // 0 (sicher) to 100 (hoch riskant)
  pos: string;
  reason: string;
}

export interface PitchNode3D {
  positionKey: string;
  positionLabel: string;
  player: EvaluatedPlayer | null;
  x2d: number;
  y2d: number;
  x3d: number;
  y3d: number;
  runPath3D: string;
  runColor: string;
  intensity: 'Hoch' | 'Mittel' | 'Niedrig';
  heatmapCoords: { x: number; y: number; r: number }[];
  positionRunEvaluation: string;
}

export const KaderAgentModal: React.FC<KaderAgentModalProps> = ({
  players,
  onClose,
  initialPreset = 'beste_formation'
}) => {
  const [activePreset, setActivePreset] = useState<'beste_formation' | 'topform_startelf' | 'vollbild_ordnung' | 'laufwege_profi'>(initialPreset);
  const [situation, setSituation] = useState<GameSituation>('offensiv');
  const [selectedFormation, setSelectedFormation] = useState<TacticalFormation>('4-2-3-1');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialPreset === 'vollbild_ordnung');
  const [is3D, setIs3D] = useState<boolean>(true);
  const [tiltAngle, setTiltAngle] = useState<number>(20); // 0 (2D), 18 (Flach 3D), 28 (Steil 3D)
  const [zoomLevel, setZoomLevel] = useState<number>(0.88); // Default zoom level for full pitch view
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [selectedPosKey, setSelectedPosKey] = useState<string>('ST');
  const [animProgress, setAnimProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'3d_tafel' | 'kader_bewertung' | 'taktik_begruendung'>(
    initialPreset === 'topform_startelf' ? 'kader_bewertung' : '3d_tafel'
  );
  const [manualOverrides, setManualOverrides] = useState<Record<string, EvaluatedPlayer | null>>({});
  const [copied, setCopied] = useState<boolean>(false);

  // Animation frame loop for 3D run curves
  useEffect(() => {
    let frameId: number;
    if (isAnimating) {
      const step = () => {
        setAnimProgress((prev) => (prev + 0.008) % 1);
        frameId = requestAnimationFrame(step);
      };
      frameId = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(frameId);
  }, [isAnimating]);

  // Handle preset clicks
  const handlePresetChange = (preset: 'beste_formation' | 'topform_startelf' | 'vollbild_ordnung' | 'laufwege_profi') => {
    setActivePreset(preset);
    if (preset === 'beste_formation') {
      setActiveTab('3d_tafel');
      setIsFullscreen(false);
      setSelectedFormation('4-3-3');
      setSituation('offensiv');
      setIs3D(true);
      setShowHeatmap(true);
    } else if (preset === 'topform_startelf') {
      setActiveTab('kader_bewertung');
      setIsFullscreen(false);
    } else if (preset === 'vollbild_ordnung') {
      setActiveTab('3d_tafel');
      setIsFullscreen(true);
      setIs3D(true);
    } else if (preset === 'laufwege_profi') {
      setActiveTab('3d_tafel');
      setIsFullscreen(false);
      setIs3D(true);
      setIsAnimating(true);
      setShowHeatmap(true);
    }
  };

  // 1. Evaluate Squad Players with Form, Tracker Data, Movement & Risk Indicators
  const evaluatedPlayers = useMemo<EvaluatedPlayer[]>(() => {
    return players.map((p) => {
      const tracker = p.trackerAnalysis;
      const totalKm = tracker?.totalDistanceKm || 9.5;
      const sprintM = tracker?.sprintDistanceM || 450;
      const highSpeedM = tracker?.highSpeedDistanceM || 900;
      const maxSpeed = tracker?.maxSpeedKmh || 30.5;

      // Form score calculation
      let score = 70; // baseline
      if (sprintM > 500) score += 10;
      if (highSpeedM > 1000) score += 10;
      if (maxSpeed >= 31) score += 5;
      if (p.fitness === 'Topform' || p.fitness === 'Fit') score += 5;
      if (p.tore && p.tore > 3) score += 5;

      // Risk score calculation
      let risk = 15;
      if (p.verletzung && p.verletzung !== 'Keine') risk += 50;
      if (p.isInjured) risk += 50;
      if (p.fitness === 'Angeschlagen') risk += 35;
      if (p.fitness === 'Im Aufbau') risk += 25;

      score = Math.min(99, Math.max(40, score - risk * 0.3));

      let status: 'topform' | 'normal' | 'risiko' = 'normal';
      if (score >= 80 && risk < 30) {
        status = 'topform';
      } else if (risk >= 40 || score < 60) {
        status = 'risiko';
      }

      const highIntensityKm = Math.round(((sprintM + highSpeedM) / 1000) * 10) / 10;

      let reason = '';
      if (status === 'topform') {
        reason = `Überragende Sprints (${sprintM}m) & hohe High-Intensity-Distanz (${highIntensityKm} km). Niedriges Verletzungsrisiko.`;
      } else if (status === 'risiko') {
        reason = `Erhöhter Belastungsindex / Physio-Risiko (${risk}%). Schonung oder reduzierte Einsatzzeit empfohlen.`;
      } else {
        reason = `Solide Formwerte (${score}%) und verlässliche Grundausdauer (${totalKm} km).`;
      }

      return {
        player: p,
        topformScore: Math.round(score),
        status,
        highIntensityKm,
        sprintScore: Math.round((sprintM / 800) * 100),
        riskScore: Math.round(risk),
        pos: p.position || 'ZM',
        reason
      };
    }).sort((a, b) => b.topformScore - a.topformScore);
  }, [players]);

  // Normalize position strings for flexible matching
  const getNormalizedPosGroup = (positionStr: string): 'TW' | 'DEF' | 'MID' | 'ATT' => {
    const s = (positionStr || '').toUpperCase();
    if (s.includes('TW') || s.includes('TOR') || s.includes('GK') || s.includes('KEEP')) return 'TW';
    if (s.includes('IV') || s.includes('RV') || s.includes('LV') || s.includes('DEF') || s.includes('ABWEHR') || s.includes('CB') || s.includes('RB') || s.includes('LB')) return 'DEF';
    if (s.includes('ZM') || s.includes('DM') || s.includes('OM') || s.includes('MID') || s.includes('MITTEL') || s.includes('CM') || s.includes('CDM') || s.includes('CAM') || s.includes('LM') || s.includes('RM')) return 'MID';
    return 'ATT';
  };

  // Topform starting XI selection algorithm
  const topformStartingXI = useMemo(() => {
    const keepers = evaluatedPlayers.filter(p => getNormalizedPosGroup(p.pos) === 'TW');
    const defenders = evaluatedPlayers.filter(p => getNormalizedPosGroup(p.pos) === 'DEF');
    const midfielders = evaluatedPlayers.filter(p => getNormalizedPosGroup(p.pos) === 'MID');
    const attackers = evaluatedPlayers.filter(p => getNormalizedPosGroup(p.pos) === 'ATT');
    const remaining = evaluatedPlayers.filter(p => 
      !keepers.includes(p) && !defenders.includes(p) && !midfielders.includes(p) && !attackers.includes(p)
    );

    const selectBest = (pool: EvaluatedPlayer[], fallback: EvaluatedPlayer[], count: number) => {
      const sorted = [...pool].sort((a, b) => b.topformScore - a.topformScore);
      const chosen = sorted.slice(0, count);
      if (chosen.length < count) {
        const needed = count - chosen.length;
        const addFromFallback = fallback
          .filter(f => !chosen.includes(f))
          .sort((a, b) => b.topformScore - a.topformScore)
          .slice(0, needed);
        return [...chosen, ...addFromFallback];
      }
      return chosen;
    };

    let defCount = 4;
    let midCount = 3;
    let attCount = 3;

    if (selectedFormation === '3-5-2') {
      defCount = 3; midCount = 5; attCount = 2;
    } else if (selectedFormation === '3-4-3') {
      defCount = 3; midCount = 4; attCount = 3;
    } else if (selectedFormation === '4-4-2') {
      defCount = 4; midCount = 4; attCount = 2;
    } else if (selectedFormation === '4-2-3-1') {
      defCount = 4; midCount = 5; attCount = 1;
    }

    const bestTW = selectBest(keepers, evaluatedPlayers, 1);
    const bestDef = selectBest(defenders, remaining, defCount);
    const bestMid = selectBest(midfielders, remaining, midCount);
    const bestAtt = selectBest(attackers, remaining, attCount);

    return {
      TW: bestTW[0] || evaluatedPlayers[0] || null,
      DEF: bestDef,
      MID: bestMid,
      ATT: bestAtt,
      allXI: [...bestTW, ...bestDef, ...bestMid, ...bestAtt].slice(0, 11)
    };
  }, [evaluatedPlayers, selectedFormation]);

  // Define 3D pitch positions for chosen formation
  const pitchNodes = useMemo<PitchNode3D[]>(() => {
    const { TW, DEF, MID, ATT } = topformStartingXI;

    const getRunColor = () => {
      if (situation === 'offensiv') return '#3b82f6'; // Blau
      if (situation === 'defensiv') return '#ef4444'; // Rot
      if (situation === 'umschalten') return '#eab308'; // Gelb
      return '#10b981'; // Grün (Pressing)
    };

    // Mandatory position analysis sentence per AGENTS.md LEVEL 3 guidelines
    const getPosEvaluation = (posKey: string, role: string) => {
      return `Für die Position ${posKey} ist diese Laufbewegung typisch und taktikentscheidend für den FC Auggen (${role}).`;
    };

    const getAssignedPlayer = (posKey: string, defaultPlayer: EvaluatedPlayer | null): EvaluatedPlayer | null => {
      if (manualOverrides[posKey] !== undefined) {
        return manualOverrides[posKey];
      }
      return defaultPlayer;
    };

    const runColor = getRunColor();
    const nodes: PitchNode3D[] = [];

    // Torwart (immer dabei)
    nodes.push({
      positionKey: 'TW',
      positionLabel: 'Torwart (TW)',
      player: getAssignedPlayer('TW', TW),
      x2d: 400, y2d: 450,
      x3d: 400, y3d: 440,
      runPath3D: situation === 'defensiv' ? 'M 400 440 L 400 455' : 'M 400 440 L 400 410',
      runColor,
      intensity: 'Niedrig',
      heatmapCoords: [{ x: 400, y: 440, r: 50 }],
      positionRunEvaluation: getPosEvaluation('TW', 'Mitspielender Torwart & Raumbeherrschung')
    });

    if (selectedFormation === '4-3-3') {
      nodes.push(
        { positionKey: 'LV', positionLabel: 'Linksverteidiger (LV)', player: getAssignedPlayer('LV', DEF[0] || null), x2d: 120, y2d: 360, x3d: 140, y3d: 350, runPath3D: situation === 'defensiv' ? 'M 140 350 L 160 400' : 'M 140 350 Q 110 240 100 120', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 120, y: 250, r: 65 }], positionRunEvaluation: getPosEvaluation('LV', 'Flügellauf & Überlappen') },
        { positionKey: 'IV-L', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-L', DEF[1] || null), x2d: 300, y2d: 370, x3d: 310, y3d: 360, runPath3D: situation === 'defensiv' ? 'M 310 360 L 310 410' : 'M 310 360 L 310 300', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 310, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-L', 'Zentrum-Absicherung & Aufbauspiel') },
        { positionKey: 'IV-R', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-R', DEF[2] || null), x2d: 500, y2d: 370, x3d: 490, y3d: 360, runPath3D: situation === 'defensiv' ? 'M 490 360 L 490 410' : 'M 490 360 L 490 300', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 490, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-R', 'Zweikampf & Kopfballabwerfen') },
        { positionKey: 'RV', positionLabel: 'Rechtsverteidiger (RV)', player: getAssignedPlayer('RV', DEF[3] || null), x2d: 680, y2d: 360, x3d: 660, y3d: 350, runPath3D: situation === 'defensiv' ? 'M 660 350 L 640 400' : 'M 660 350 Q 690 240 700 120', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 680, y: 250, r: 65 }], positionRunEvaluation: getPosEvaluation('RV', 'Überlappender Sprint & Flanke') },

        { positionKey: 'DM', positionLabel: 'Defensiv-Mittelfeld (DM)', player: getAssignedPlayer('DM', MID[0] || null), x2d: 400, y2d: 290, x3d: 400, y3d: 280, runPath3D: situation === 'pressing' ? 'M 400 280 L 400 180' : 'M 400 280 Q 350 220 400 160', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 400, y: 260, r: 75 }], positionRunEvaluation: getPosEvaluation('DM', 'Verbindungsspieler & Ballverteiler') },
        { positionKey: 'ZM-L', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-L', MID[1] || null), x2d: 260, y2d: 230, x3d: 280, y3d: 220, runPath3D: 'M 280 220 Q 220 150 200 100', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 260, y: 200, r: 70 }], positionRunEvaluation: getPosEvaluation('ZM-L', 'Halbraum-Vorstoss & Vertikalpass') },
        { positionKey: 'ZM-R', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-R', MID[2] || null), x2d: 540, y2d: 230, x3d: 520, y3d: 220, runPath3D: 'M 520 220 Q 580 150 600 100', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 540, y: 200, r: 70 }], positionRunEvaluation: getPosEvaluation('ZM-R', 'Halbraum-Vorstoss & Box-to-Box') },

        { positionKey: 'LA', positionLabel: 'Linksaußen (LA)', player: getAssignedPlayer('LA', ATT[0] || null), x2d: 180, y2d: 130, x3d: 200, y3d: 120, runPath3D: 'M 200 120 Q 280 80 380 70', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 220, y: 100, r: 80 }], positionRunEvaluation: getPosEvaluation('LA', 'Diagonaler Dribblingsprint & Torschuss') },
        { positionKey: 'ST', positionLabel: 'Mittelstürmer (ST)', player: getAssignedPlayer('ST', ATT[1] || null), x2d: 400, y2d: 110, x3d: 400, y3d: 100, runPath3D: 'M 400 100 L 400 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 400, y: 70, r: 85 }], positionRunEvaluation: getPosEvaluation('ST', 'Tiefer Box-Sprint & Torabschluss') },
        { positionKey: 'RA', positionLabel: 'Rechtsaußen (RA)', player: getAssignedPlayer('RA', ATT[2] || null), x2d: 620, y2d: 130, x3d: 600, y3d: 120, runPath3D: 'M 600 120 Q 520 80 420 70', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 580, y: 100, r: 80 }], positionRunEvaluation: getPosEvaluation('RA', 'Flankenlauf & Schnittstellensprint') }
      );
    } else if (selectedFormation === '3-5-2') {
      nodes.push(
        { positionKey: 'IV-L', positionLabel: 'Innenverteidiger Links (IV)', player: getAssignedPlayer('IV-L', DEF[0] || null), x2d: 240, y2d: 370, x3d: 250, y3d: 360, runPath3D: 'M 250 360 L 220 280', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 240, y: 340, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-L', 'Dreierkette Links-Absicherung') },
        { positionKey: 'IV-C', positionLabel: 'Zentraler Abwehrchef (IV)', player: getAssignedPlayer('IV-C', DEF[1] || null), x2d: 400, y2d: 380, x3d: 400, y3d: 370, runPath3D: 'M 400 370 L 400 320', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 400, y: 360, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-C', 'Zentraler Organisator') },
        { positionKey: 'IV-R', positionLabel: 'Innenverteidiger Rechts (IV)', player: getAssignedPlayer('IV-R', DEF[2] || null), x2d: 560, y2d: 370, x3d: 550, y3d: 360, runPath3D: 'M 550 360 L 580 280', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 560, y: 340, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-R', 'Dreierkette Rechts-Absicherung') },

        { positionKey: 'LM', positionLabel: 'Linker Schienenspieler (LM)', player: getAssignedPlayer('LM', MID[0] || null), x2d: 120, y2d: 240, x3d: 140, y3d: 230, runPath3D: 'M 140 230 L 100 80', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 130, y: 200, r: 75 }], positionRunEvaluation: getPosEvaluation('LM', 'Schienenspieler Flügelsprint') },
        { positionKey: 'DM', positionLabel: 'Defensives Mittelfeld (DM)', player: getAssignedPlayer('DM', MID[1] || null), x2d: 400, y2d: 290, x3d: 400, y3d: 280, runPath3D: 'M 400 280 L 400 200', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 400, y: 260, r: 65 }], positionRunEvaluation: getPosEvaluation('DM', 'Absicherung & Umschalten') },
        { positionKey: 'ZM-L', positionLabel: 'Achter Links (ZM)', player: getAssignedPlayer('ZM-L', MID[2] || null), x2d: 280, y2d: 230, x3d: 290, y3d: 220, runPath3D: 'M 290 220 L 240 120', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 280, y: 190, r: 70 }], positionRunEvaluation: getPosEvaluation('ZM-L', 'Achter Vorstoß in Strafraum') },
        { positionKey: 'ZM-R', positionLabel: 'Achter Rechts (ZM)', player: getAssignedPlayer('ZM-R', MID[3] || null), x2d: 520, y2d: 230, x3d: 510, y3d: 220, runPath3D: 'M 510 220 L 560 120', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 520, y: 190, r: 70 }], positionRunEvaluation: getPosEvaluation('ZM-R', 'Achter Vorstoß in Halbraum') },
        { positionKey: 'RM', positionLabel: 'Rechter Schienenspieler (RM)', player: getAssignedPlayer('RM', MID[4] || null), x2d: 680, y2d: 240, x3d: 660, y3d: 230, runPath3D: 'M 660 230 L 700 80', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 670, y: 200, r: 75 }], positionRunEvaluation: getPosEvaluation('RM', 'Schienenspieler Flankenlauf') },

        { positionKey: 'ST-L', positionLabel: 'Doppelspitze Links (ST)', player: getAssignedPlayer('ST-L', ATT[0] || null), x2d: 320, y2d: 110, x3d: 330, y3d: 100, runPath3D: 'M 330 100 L 300 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 330, y: 80, r: 80 }], positionRunEvaluation: getPosEvaluation('ST-L', 'Doppelspitze Ausweichen Links') },
        { positionKey: 'ST-R', positionLabel: 'Doppelspitze Rechts (ST)', player: getAssignedPlayer('ST-R', ATT[1] || null), x2d: 480, y2d: 110, x3d: 470, y3d: 100, runPath3D: 'M 470 100 L 500 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 470, y: 80, r: 80 }], positionRunEvaluation: getPosEvaluation('ST-R', 'Doppelspitze Tiefensprint') }
      );
    } else if (selectedFormation === '4-4-2') {
      nodes.push(
        { positionKey: 'LV', positionLabel: 'Linksverteidiger (LV)', player: getAssignedPlayer('LV', DEF[0] || null), x2d: 120, y2d: 360, x3d: 140, y3d: 350, runPath3D: 'M 140 350 L 120 200', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 130, y: 280, r: 60 }], positionRunEvaluation: getPosEvaluation('LV', 'Flügelvorstoß') },
        { positionKey: 'IV-L', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-L', DEF[1] || null), x2d: 310, y2d: 370, x3d: 320, y3d: 360, runPath3D: 'M 320 360 L 320 310', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 320, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-L', 'Zentrum-Kompaktheit') },
        { positionKey: 'IV-R', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-R', DEF[2] || null), x2d: 490, y2d: 370, x3d: 480, y3d: 360, runPath3D: 'M 480 360 L 480 310', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 480, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-R', 'Absicherung') },
        { positionKey: 'RV', positionLabel: 'Rechtsverteidiger (RV)', player: getAssignedPlayer('RV', DEF[3] || null), x2d: 680, y2d: 360, x3d: 660, y3d: 350, runPath3D: 'M 660 350 L 680 200', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 670, y: 280, r: 60 }], positionRunEvaluation: getPosEvaluation('RV', 'Flügelvorstoß') },

        { positionKey: 'LM', positionLabel: 'Linkes Mittelfeld (LM)', player: getAssignedPlayer('LM', MID[0] || null), x2d: 160, y2d: 220, x3d: 180, y3d: 210, runPath3D: 'M 180 210 L 160 90', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 170, y: 160, r: 70 }], positionRunEvaluation: getPosEvaluation('LM', 'Außenbahn Dribblingsprint') },
        { positionKey: 'ZM-L', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-L', MID[1] || null), x2d: 320, y2d: 240, x3d: 330, y3d: 230, runPath3D: 'M 330 230 L 330 140', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 330, y: 200, r: 65 }], positionRunEvaluation: getPosEvaluation('ZM-L', 'Zentrumskontrolle') },
        { positionKey: 'ZM-R', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-R', MID[2] || null), x2d: 480, y2d: 240, x3d: 470, y3d: 230, runPath3D: 'M 470 230 L 470 140', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 470, y: 200, r: 65 }], positionRunEvaluation: getPosEvaluation('ZM-R', 'Zentrumskontrolle') },
        { positionKey: 'RM', positionLabel: 'Rechtes Mittelfeld (RM)', player: getAssignedPlayer('RM', MID[3] || null), x2d: 640, y2d: 220, x3d: 620, y3d: 210, runPath3D: 'M 620 210 L 640 90', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 630, y: 160, r: 70 }], positionRunEvaluation: getPosEvaluation('RM', 'Außenbahn Flankensprint') },

        { positionKey: 'ST-L', positionLabel: 'Stürmer Links (ST)', player: getAssignedPlayer('ST-L', ATT[0] || null), x2d: 330, y2d: 110, x3d: 340, y3d: 100, runPath3D: 'M 340 100 L 320 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 340, y: 70, r: 80 }], positionRunEvaluation: getPosEvaluation('ST-L', 'Klassische Doppelspitze Links') },
        { positionKey: 'ST-R', positionLabel: 'Stürmer Rechts (ST)', player: getAssignedPlayer('ST-R', ATT[1] || null), x2d: 470, y2d: 110, x3d: 460, y3d: 100, runPath3D: 'M 460 100 L 480 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 460, y: 70, r: 80 }], positionRunEvaluation: getPosEvaluation('ST-R', 'Klassische Doppelspitze Rechts') }
      );
    } else if (selectedFormation === '3-4-3') {
      nodes.push(
        { positionKey: 'IV-L', positionLabel: 'Innenverteidiger Links (IV)', player: getAssignedPlayer('IV-L', DEF[0] || null), x2d: 240, y2d: 370, x3d: 250, y3d: 360, runPath3D: 'M 250 360 L 220 280', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 240, y: 340, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-L', 'Dreierkette Links') },
        { positionKey: 'IV-C', positionLabel: 'Zentraler Abwehrchef (IV)', player: getAssignedPlayer('IV-C', DEF[1] || null), x2d: 400, y2d: 380, x3d: 400, y3d: 370, runPath3D: 'M 400 370 L 400 320', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 400, y: 360, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-C', 'Dreierkette Zentrum') },
        { positionKey: 'IV-R', positionLabel: 'Innenverteidiger Rechts (IV)', player: getAssignedPlayer('IV-R', DEF[2] || null), x2d: 560, y2d: 370, x3d: 550, y3d: 360, runPath3D: 'M 550 360 L 580 280', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 560, y: 340, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-R', 'Dreierkette Rechts') },

        { positionKey: 'LM', positionLabel: 'Linker Flügel (LM)', player: getAssignedPlayer('LM', MID[0] || null), x2d: 140, y2d: 230, x3d: 160, y3d: 220, runPath3D: 'M 160 220 L 120 100', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 150, y: 180, r: 70 }], positionRunEvaluation: getPosEvaluation('LM', 'Linker Flügelüberzahl') },
        { positionKey: 'ZM-L', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-L', MID[1] || null), x2d: 320, y2d: 250, x3d: 330, y3d: 240, runPath3D: 'M 330 240 L 310 150', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 320, y: 210, r: 65 }], positionRunEvaluation: getPosEvaluation('ZM-L', 'Sechser / Achter Zentrum') },
        { positionKey: 'ZM-R', positionLabel: 'Zentrales Mittelfeld (ZM)', player: getAssignedPlayer('ZM-R', MID[2] || null), x2d: 480, y2d: 250, x3d: 470, y3d: 240, runPath3D: 'M 470 240 L 490 150', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 480, y: 210, r: 65 }], positionRunEvaluation: getPosEvaluation('ZM-R', 'Sechser / Achter Zentrum') },
        { positionKey: 'RM', positionLabel: 'Rechter Flügel (RM)', player: getAssignedPlayer('RM', MID[3] || null), x2d: 660, y2d: 230, x3d: 640, y3d: 220, runPath3D: 'M 640 220 L 680 100', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 650, y: 180, r: 70 }], positionRunEvaluation: getPosEvaluation('RM', 'Rechter Flügelüberzahl') },

        { positionKey: 'LA', positionLabel: 'Linksaußen (LA)', player: getAssignedPlayer('LA', ATT[0] || null), x2d: 200, y2d: 120, x3d: 220, y3d: 110, runPath3D: 'M 220 110 L 320 60', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 220, y: 90, r: 80 }], positionRunEvaluation: getPosEvaluation('LA', 'Dreier-Sturm Links') },
        { positionKey: 'ST', positionLabel: 'Mittelstürmer (ST)', player: getAssignedPlayer('ST', ATT[1] || null), x2d: 400, y2d: 100, x3d: 400, y3d: 90, runPath3D: 'M 400 90 L 400 45', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 400, y: 60, r: 85 }], positionRunEvaluation: getPosEvaluation('ST', 'Zentraler Stoßstürmer') },
        { positionKey: 'RA', positionLabel: 'Rechtsaußen (RA)', player: getAssignedPlayer('RA', ATT[2] || null), x2d: 600, y2d: 120, x3d: 580, y3d: 110, runPath3D: 'M 580 110 L 480 60', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 580, y: 90, r: 80 }], positionRunEvaluation: getPosEvaluation('RA', 'Dreier-Sturm Rechts') }
      );
    } else {
      // 4-2-3-1
      nodes.push(
        { positionKey: 'LV', positionLabel: 'Linksverteidiger (LV)', player: getAssignedPlayer('LV', DEF[0] || null), x2d: 120, y2d: 360, x3d: 140, y3d: 350, runPath3D: 'M 140 350 L 120 180', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 130, y: 280, r: 60 }], positionRunEvaluation: getPosEvaluation('LV', 'Flügelvorstoß') },
        { positionKey: 'IV-L', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-L', DEF[1] || null), x2d: 310, y2d: 370, x3d: 320, y3d: 360, runPath3D: 'M 320 360 L 320 310', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 320, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-L', 'Absicherung') },
        { positionKey: 'IV-R', positionLabel: 'Innenverteidiger (IV)', player: getAssignedPlayer('IV-R', DEF[2] || null), x2d: 490, y2d: 370, x3d: 480, y3d: 360, runPath3D: 'M 480 360 L 480 310', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 480, y: 350, r: 60 }], positionRunEvaluation: getPosEvaluation('IV-R', 'Absicherung') },
        { positionKey: 'RV', positionLabel: 'Rechtsverteidiger (RV)', player: getAssignedPlayer('RV', DEF[3] || null), x2d: 680, y2d: 360, x3d: 660, y3d: 350, runPath3D: 'M 660 350 L 680 180', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 670, y: 280, r: 60 }], positionRunEvaluation: getPosEvaluation('RV', 'Flügelvorstoß') },

        { positionKey: 'DM-L', positionLabel: 'Doppelsechs (DM)', player: getAssignedPlayer('DM-L', MID[0] || null), x2d: 320, y2d: 280, x3d: 330, y3d: 270, runPath3D: 'M 330 270 L 330 190', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 330, y: 250, r: 65 }], positionRunEvaluation: getPosEvaluation('DM-L', 'Doppelsechs Kontrolle') },
        { positionKey: 'DM-R', positionLabel: 'Doppelsechs (DM)', player: getAssignedPlayer('DM-R', MID[1] || null), x2d: 480, y2d: 280, x3d: 470, y3d: 270, runPath3D: 'M 470 270 L 470 190', runColor, intensity: 'Mittel', heatmapCoords: [{ x: 470, y: 250, r: 65 }], positionRunEvaluation: getPosEvaluation('DM-R', 'Doppelsechs Kontrolle') },

        { positionKey: 'OM', positionLabel: 'Zehner (OM)', player: getAssignedPlayer('OM', MID[2] || null), x2d: 400, y2d: 190, x3d: 400, y3d: 180, runPath3D: 'M 400 180 L 400 100', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 400, y: 160, r: 75 }], positionRunEvaluation: getPosEvaluation('OM', 'Schlüsselpass in Box') },
        { positionKey: 'LM', positionLabel: 'Flügel Links (LM)', player: getAssignedPlayer('LM', MID[3] || null), x2d: 200, y2d: 180, x3d: 210, y3d: 170, runPath3D: 'M 210 170 L 260 80', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 220, y: 140, r: 70 }], positionRunEvaluation: getPosEvaluation('LM', 'Sprint an die Grundlinie') },
        { positionKey: 'RM', positionLabel: 'Flügel Rechts (RM)', player: getAssignedPlayer('RM', MID[4] || null), x2d: 600, y2d: 180, x3d: 590, y3d: 170, runPath3D: 'M 590 170 L 540 80', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 580, y: 140, r: 70 }], positionRunEvaluation: getPosEvaluation('RM', 'Sprint an die Grundlinie') },

        { positionKey: 'ST', positionLabel: 'Spitze (ST)', player: getAssignedPlayer('ST', ATT[0] || null), x2d: 400, y2d: 110, x3d: 400, y3d: 100, runPath3D: 'M 400 100 L 400 50', runColor, intensity: 'Hoch', heatmapCoords: [{ x: 400, y: 70, r: 85 }], positionRunEvaluation: getPosEvaluation('ST', 'Tiefe Läufe in den Strafraum') }
      );
    }

    return nodes;
  }, [selectedFormation, situation, topformStartingXI, manualOverrides]);

  const selectedNode = pitchNodes.find(n => n.positionKey === selectedPosKey) || pitchNodes[0];

  const handleCopyLineup = () => {
    const lineupText = `FC Auggen - Startelf (${selectedFormation}):\n` + 
      pitchNodes.map(n => `${n.positionKey}: ${n.player ? `${n.player.player.firstName} ${n.player.player.lastName} (${n.player.topformScore}%)` : 'Unbelegt'}`).join('\n');
    
    navigator.clipboard.writeText(lineupText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/60 backdrop-blur-md p-2 sm:p-4 overflow-hidden text-[#F8FAFC] font-sans ${isFullscreen ? 'p-0 border-0 rounded-none' : ''}`}>
      <div className={`relative flex flex-col bg-[#FFFFFF] border border-[#DADADA] rounded-3xl shadow-xl overflow-hidden w-full h-full max-w-7xl max-h-[96vh] ${isFullscreen ? 'max-w-none max-h-none rounded-none border-0' : ''}`}>
        
        {/* Header Bar */}
        <header className="bg-[#E8E8E8] px-4 py-3 border-b border-[#DADADA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00C2FF] flex items-center justify-center text-[#0A0A0A] font-black shadow-xs border border-[#00C2FF]">
              <Brain size={20} className="text-[#0A0A0A] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] bg-[#00D47A] px-2 py-0.5 rounded-md border border-[#00D47A]">
                  Kader Profi-Modus
                </span>
                <span className="w-2 h-2 rounded-full bg-[#00D47A] animate-ping" />
              </div>
              <h1 className="text-base font-black uppercase tracking-wider text-[#F8FAFC] flex items-center gap-2">
                Beste Aufstellung & Formation
              </h1>
            </div>
          </div>

          {/* Preset Selector Shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar bg-[#FFFFFF] p-1.5 rounded-2xl border border-[#DADADA]">
            <button
              onClick={() => handlePresetChange('beste_formation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreset === 'beste_formation' ? 'bg-[#FF4C4C] text-[#FFFFFF] shadow-xs' : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#E8E8E8]'
              }`}
            >
              <Sparkles size={13} className="text-[#FFFFFF]" />
              <span>Beste Formation</span>
            </button>

            <button
              onClick={() => handlePresetChange('topform_startelf')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreset === 'topform_startelf' ? 'bg-[#00D47A] text-[#0A0A0A] shadow-xs' : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#E8E8E8]'
              }`}
            >
              <Award size={13} className="text-[#0A0A0A]" />
              <span>Startelf Topform</span>
            </button>

            <button
              onClick={() => handlePresetChange('vollbild_ordnung')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreset === 'vollbild_ordnung' ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-xs' : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#E8E8E8]'
              }`}
            >
              <Maximize2 size={13} />
              <span>Vollbild Grundordnung</span>
            </button>

            <button
              onClick={() => handlePresetChange('laufwege_profi')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                activePreset === 'laufwege_profi' ? 'bg-[#4C6FFF] text-[#FFFFFF] shadow-xs' : 'text-[#4A4A4A] hover:text-[#F8FAFC] hover:bg-[#E8E8E8]'
              }`}
            >
              <Compass size={13} />
              <span>3D Laufwege</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLineup}
              className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#121824] text-[#F8FAFC] border border-[#DADADA] transition-all flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Aufstellung in Zwischenablage kopieren"
            >
              {copied ? <Check size={16} className="text-[#00D47A]" /> : <Copy size={16} />}
              <span className="hidden sm:inline">{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#121824] text-[#F8FAFC] border border-[#DADADA] transition-all cursor-pointer"
              title={isFullscreen ? 'Vollbild verlassen' : 'Vollbildmodus'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#FFFFFF] hover:bg-[#FF4C4C]/10 text-[#F8FAFC] hover:text-[#FF4C4C] border border-[#DADADA] hover:border-[#FF4C4C] transition-all cursor-pointer"
              title="Schließen"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Sub-Navigation Tabs */}
        <div className="bg-[#1A1A1A] border-b border-[#3A3A3A] px-4 py-2 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('3d_tafel')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === '3d_tafel' 
                  ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-[0_0_10px_rgba(0,194,255,0.4)] border border-[#00C2FF]' 
                  : 'text-slate-300 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Layers size={14} />
              <span>3D-Taktiktafel & Laufwege</span>
            </button>
            <button
              onClick={() => setActiveTab('kader_bewertung')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'kader_bewertung' 
                  ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-[0_0_10px_rgba(0,194,255,0.4)] border border-[#00C2FF]' 
                  : 'text-slate-300 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <UserCheck size={14} />
              <span>Form- & Risiko-Analyse ({evaluatedPlayers.length} Spieler)</span>
            </button>
            <button
              onClick={() => setActiveTab('taktik_begruendung')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'taktik_begruendung' 
                  ? 'bg-[#00C2FF] text-[#0A0A0A] font-black shadow-[0_0_10px_rgba(0,194,255,0.4)] border border-[#00C2FF]' 
                  : 'text-slate-300 hover:text-white hover:bg-[#2A2A2A]'
              }`}
            >
              <Info size={14} />
              <span>Taktische Begründung & Erklärungen</span>
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="hidden lg:flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {evaluatedPlayers.filter(p => p.status === 'topform').length} Topform
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 font-bold bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              {evaluatedPlayers.filter(p => p.status === 'normal').length} Normal
            </span>
            <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800/60">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              {evaluatedPlayers.filter(p => p.status === 'risiko').length} Risiko
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative flex flex-col lg:flex-row">

          {/* Main Display Area */}
          {activeTab === '3d_tafel' && (
            <div className="flex-1 flex flex-col relative bg-slate-950 overflow-hidden">

              {/* Pitch Controls Bar */}
              <div className="p-3 bg-slate-900/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10 backdrop-blur">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Formation:</span>
                  {(['4-4-2', '4-2-3-1', '4-1-4-1', '3-4-3'] as TacticalFormation[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedFormation(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        selectedFormation === fmt ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Spielsituation:</span>
                  {(['offensiv', 'defensiv', 'umschalten', 'pressing'] as GameSituation[]).map((sit) => (
                    <button
                      key={sit}
                      onClick={() => setSituation(sit)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        situation === sit ? 'bg-red-600 text-white shadow' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {sit === 'offensiv' ? 'Offensiv' : sit === 'defensiv' ? 'Defensiv' : sit === 'umschalten' ? 'Umschalten' : 'Pressing'}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Perspective Toggle & Angle Preset */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                    <button
                      onClick={() => { setIs3D(false); setTiltAngle(0); }}
                      className={`px-2 py-1 rounded text-xs font-bold uppercase transition-all ${
                        !is3D ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() => { setIs3D(true); setTiltAngle(18); }}
                      className={`px-2 py-1 rounded text-xs font-bold uppercase transition-all ${
                        is3D && tiltAngle === 18 ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      3D 18°
                    </button>
                    <button
                      onClick={() => { setIs3D(true); setTiltAngle(28); }}
                      className={`px-2 py-1 rounded text-xs font-bold uppercase transition-all ${
                        is3D && tiltAngle === 28 ? 'bg-amber-400 text-slate-950 font-black' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      3D 28°
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
                    <button
                      onClick={() => setZoomLevel((prev) => Math.max(0.65, Math.round((prev - 0.05) * 100) / 100))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                      title="Spielfeld verkleinern"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <span className="font-mono text-[11px] px-1 text-amber-300 font-bold min-w-[36px] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={() => setZoomLevel((prev) => Math.min(1.15, Math.round((prev + 0.05) * 100) / 100))}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                      title="Spielfeld vergrößern"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => { setZoomLevel(0.88); setTiltAngle(20); setIs3D(true); }}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-amber-300"
                      title="Spielfeld-Ansicht zurücksetzen"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border transition-all flex items-center gap-1 cursor-pointer ${
                      showHeatmap ? 'bg-rose-950/80 text-rose-300 border-rose-800' : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Flame size={13} /> Heatmap
                  </button>
                  <button
                    onClick={() => setIsAnimating(!isAnimating)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 cursor-pointer"
                    title={isAnimating ? 'Animation pausieren' : 'Animation starten'}
                  >
                    {isAnimating ? <Pause size={14} /> : <Play size={14} />}
                  </button>
                </div>
              </div>

              {/* 3D Pitch Canvas Viewport */}
              <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 bg-gradient-to-b from-slate-950 via-emerald-950/20 to-slate-950">
                
                {/* 3D SVG Pitch Layer */}
                <div 
                  style={{
                    transform: is3D 
                      ? `perspective(1200px) rotateX(${tiltAngle}deg) scale(${zoomLevel})` 
                      : `scale(${zoomLevel})`
                  }}
                  className="w-full h-full max-w-5xl transition-all duration-500 relative flex items-center justify-center origin-center"
                >
                  <svg 
                    viewBox="0 0 800 500" 
                    className="w-full h-full max-h-[72vh] drop-shadow-[0_25px_35px_rgba(0,0,0,0.8)] overflow-visible"
                  >
                    <defs>
                      <radialGradient id="pitchGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#065f46" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#022c22" stopOpacity="1" />
                      </radialGradient>
                      
                      <filter id="heatmapGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="24" result="blur" />
                      </filter>
                    </defs>

                    {/* Grass Pitch Canvas Base */}
                    <rect x="0" y="0" width="800" height="500" rx="16" fill="url(#pitchGlow)" stroke="#10b981" strokeWidth="3" strokeOpacity="0.4" />
                    
                    {/* Pitch Striping Lines */}
                    {[50, 150, 250, 350, 450].map(y => (
                      <rect key={y} x="0" y={y} width="800" height="50" fill="#047857" fillOpacity="0.15" />
                    ))}

                    {/* Outer Boundary & Center Line */}
                    <rect x="40" y="30" width="720" height="440" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />
                    <line x1="40" y1="250" x2="760" y2="250" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />
                    <circle cx="400" cy="250" r="60" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />
                    <circle cx="400" cy="250" r="4" fill="#ffffff" />

                    {/* Penalty Areas */}
                    {/* Top Goal Box (Gegner) */}
                    <rect x="260" y="30" width="280" height="100" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />
                    <rect x="330" y="30" width="140" height="40" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />

                    {/* Bottom Goal Box (Auggen) */}
                    <rect x="260" y="370" width="280" height="100" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />
                    <rect x="330" y="430" width="140" height="40" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity="0.5" />

                    {/* 3D Heatmap Overlay Cloud */}
                    {showHeatmap && pitchNodes.map((node, idx) => (
                      <g key={`heatmap-${idx}`} filter="url(#heatmapGlow)">
                        {node.heatmapCoords.map((h, hIdx) => (
                          <circle 
                            key={`h-${hIdx}`} 
                            cx={h.x} 
                            cy={h.y} 
                            r={h.r} 
                            fill={node.player?.status === 'topform' ? '#10b981' : node.player?.status === 'risiko' ? '#ef4444' : '#f59e0b'} 
                            fillOpacity="0.25" 
                          />
                        ))}
                      </g>
                    ))}

                    {/* 3D Animated Run Curves & Intensity Color Paths */}
                    {pitchNodes.map((node) => {
                      const isSelected = selectedPosKey === node.positionKey;
                      return (
                        <g key={`run-${node.positionKey}`}>
                          <path
                            d={node.runPath3D}
                            fill="none"
                            stroke={node.runColor}
                            strokeWidth={isSelected ? 6 : 3}
                            strokeDasharray="8 4"
                            strokeOpacity={isSelected ? 1 : 0.75}
                          />
                          {isAnimating && (
                            <circle
                              cx={node.x3d + Math.sin(animProgress * Math.PI * 2) * 20}
                              cy={node.y3d - Math.cos(animProgress * Math.PI * 2) * 30}
                              r={isSelected ? 6 : 4}
                              fill={node.runColor}
                              className="animate-pulse"
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* 3D Player Nodes & Form Status Badges */}
                    {pitchNodes.map((node) => {
                      const isSelected = selectedPosKey === node.positionKey;
                      const statusColor = node.player?.status === 'topform' ? '#10b981' : node.player?.status === 'risiko' ? '#ef4444' : '#eab308';

                      return (
                        <g 
                          key={`node-${node.positionKey}`}
                          transform={`translate(${node.x3d}, ${node.y3d})`}
                          onClick={() => setSelectedPosKey(node.positionKey)}
                          className="cursor-pointer group"
                        >
                          {isSelected && (
                            <circle r="34" fill="none" stroke="#f59e0b" strokeWidth="2" className="animate-ping" />
                          )}

                          <ellipse cx="0" cy="10" rx="20" ry="8" fill="#000000" fillOpacity="0.5" />

                          <circle 
                            r="22" 
                            fill={isSelected ? '#dc2626' : '#1e293b'} 
                            stroke={statusColor} 
                            strokeWidth="3"
                          />

                          <text 
                            y="-2" 
                            textAnchor="middle" 
                            dominantBaseline="central" 
                            fill="#ffffff" 
                            fontSize="11" 
                            fontWeight="900"
                          >
                            {node.positionKey}
                          </text>

                          <circle cx="16" cy="-14" r="9" fill={statusColor} stroke="#0f172a" strokeWidth="2" />
                          <text cx="16" y="-13" textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="8" fontWeight="900">
                            {node.player?.topformScore || 75}
                          </text>

                          <g transform="translate(0, -32)" className="opacity-90 group-hover:opacity-100 transition-opacity">
                            <rect x="-50" y="-12" width="100" height="18" rx="6" fill="#0f172a" fillOpacity="0.9" stroke="#334155" />
                            <text textAnchor="middle" y="-1" fill="#f8fafc" fontSize="9" fontWeight="800">
                              {node.player?.player.lastName || node.positionLabel}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend Bar at Bottom */}
                <div className="absolute bottom-3 left-4 right-4 bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl backdrop-blur flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black uppercase text-slate-400">Belastungs-Pfad:</span>
                    <span className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <span className="w-3 h-1 bg-blue-500 rounded" /> Offensiv
                    </span>
                    <span className="flex items-center gap-1.5 text-red-400 font-bold">
                      <span className="w-3 h-1 bg-red-500 rounded" /> Defensiv
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                      <span className="w-3 h-1 bg-amber-500 rounded" /> Umschalten
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-3 h-1 bg-emerald-500 rounded" /> Pressing
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400">Formstatus:</span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">● Topform</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">● Normal</span>
                    <span className="flex items-center gap-1 text-rose-400 font-bold">● Risiko</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Kader evaluation table view */}
          {activeTab === 'kader_bewertung' && (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Spielerform & Risikoindikatoren (Kader-Analyse)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Kombiniert Formwerte, High-Intensity Sprints, Heatmaps & Physio-Risiken aller Kader-Spieler.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {evaluatedPlayers.map((item) => {
                  const p = item.player;
                  const isStartingXI = topformStartingXI.allXI.includes(item);
                  return (
                    <div 
                      key={p.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        item.status === 'topform' ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500' :
                        item.status === 'risiko' ? 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500' :
                        'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center font-black text-xs text-amber-400">
                            {p.rückennummer || p.number || '10'}
                          </span>
                          <div>
                            <h4 className="font-bold text-sm text-white leading-tight">
                              {p.firstName} {p.lastName}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{p.position || 'ZM'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            item.status === 'topform' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            item.status === 'risiko' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                            'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.topformScore}% Topform
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 my-2.5 text-center bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">High-Int KM</span>
                          <span className="font-black text-amber-400">{item.highIntensityKm} km</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Sprint Index</span>
                          <span className="font-black text-sky-400">{item.sprintScore}%</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[9px] uppercase font-bold">Risiko</span>
                          <span className={`font-black ${item.riskScore > 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {item.riskScore}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-2 rounded-xl border border-slate-800/80">
                        {item.reason}
                      </p>

                      {isStartingXI && (
                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} /> Für Startelf nominiert
                          </span>
                          <span className="uppercase text-[9px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">
                            {selectedFormation}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tactical explanation report view */}
          {activeTab === 'taktik_begruendung' && (
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-950 space-y-6">
              
              <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 p-5 rounded-3xl border border-red-900/40 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-red-600 rounded-2xl text-white">
                    <Brain size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase text-white tracking-wider">
                      Taktische Begründung der Aufstellung
                    </h3>
                    <p className="text-xs text-amber-400 font-bold">
                      Ausgewählte Formation: {selectedFormation} | Ausgewählte Ausrichtung: {situation.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-4">
                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-black text-amber-400 uppercase text-xs flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-400" /> Warum diese 11 Spieler gewählt wurden:
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      Das System hat automatisch die Spieler mit den höchsten High-Intensity-Werten ({evaluatedPlayers.filter(p => p.status === 'topform').length} Topform-Akteure) und den geringsten Verletzungsrisiken ausgewählt. Spieler mit Physio-Einträgen oder hoher Ermüdung wurden geschont.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-black text-amber-400 uppercase text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-400" /> Warum {selectedFormation} optimal ist:
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      Die Grundordnung {selectedFormation} maximiert die Flügelüberladung und ermöglicht schnelle Bogenläufe in die Halbräume. Sie sichert das Zentrum gegen Umschaltmomente ab und bietet ideale Schnittstellen für Tiefensprints.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-black text-amber-400 uppercase text-xs flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-sky-400" /> Entstehende taktische Vorteile:
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      1. Überzahl in den Außenbahnen durch hinterlaufende Außenverteidiger.<br/>
                      2. Effektiveres Anpressen im Mittelfeld durch kompakte Abstände.<br/>
                      3. Schnelle Umschaltmomente nach Ballgewinn.
                    </p>
                  </div>

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-black text-amber-400 uppercase text-xs flex items-center gap-1.5">
                      <AlertTriangle size={14} className="text-rose-400" /> Risiken & Alternative Joker-Optionen:
                    </h4>
                    <p className="text-slate-300 leading-relaxed">
                      Bei defensiver Grundausrichtung droht Raum hinter der Kette. Als Joker-Optionen für die 60. Minute stehen frische Außenstürmer mit hohem Antritt zur Verfügung.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Inspector Sidebar for Selected Player Node & Manual Swap */}
          {activeTab === '3d_tafel' && (
            <div className="w-full lg:w-80 bg-[#FFFFFF] border-t lg:border-t-0 lg:border-l border-[#DADADA] p-4 overflow-y-auto shrink-0 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-[#DADADA] pb-2">
                <span className="text-[10px] font-black uppercase text-[#00C2FF] tracking-wider">
                  Position & Laufweg Details
                </span>
                <span className="px-2 py-0.5 rounded bg-[#E8E8E8] text-xs font-bold text-[#F8FAFC]">
                  {selectedNode.positionKey}
                </span>
              </div>

              {selectedNode.player ? (
                <div className="bg-[#121824] p-3.5 rounded-2xl border border-[#DADADA] space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00C2FF] flex items-center justify-center font-black text-[#0A0A0A] text-sm">
                      {selectedNode.player.player.rückennummer || selectedNode.player.player.number || '10'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#F8FAFC]">
                        {selectedNode.player.player.firstName} {selectedNode.player.player.lastName}
                      </h4>
                      <p className="text-[10px] text-[#4A4A4A] font-bold uppercase">{selectedNode.positionLabel}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-[#FFFFFF] p-2 rounded-xl border border-[#DADADA]">
                      <span className="text-[9px] font-bold text-[#4A4A4A] uppercase block">Topform Index</span>
                      <span className="font-black text-[#00D47A] text-sm">{selectedNode.player.topformScore}%</span>
                    </div>
                    <div className="bg-[#FFFFFF] p-2 rounded-xl border border-[#DADADA]">
                      <span className="text-[9px] font-bold text-[#4A4A4A] uppercase block">Intensität</span>
                      <span className="font-black text-[#00C2FF] text-sm">{selectedNode.intensity}</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase text-[#4A4A4A]">Positionsspezifische Evaluierung:</span>
                    <p className="text-xs text-[#F8FAFC] leading-relaxed bg-[#FFFFFF] p-2.5 rounded-xl border border-[#DADADA]">
                      {selectedNode.positionRunEvaluation}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#4A4A4A]">Kein Spieler auf dieser Position zugewiesen.</p>
              )}

              {/* Manual Player Swap / Override Controls */}
              <div className="bg-[#121824] p-3 rounded-2xl border border-[#DADADA] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider flex items-center justify-between">
                  <span>Spieler manuell tauschen:</span>
                  {Object.keys(manualOverrides).length > 0 && (
                    <button
                      onClick={() => setManualOverrides({})}
                      className="text-[#00C2FF] text-[9px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RefreshCw size={10} /> Reset AI
                    </button>
                  )}
                </span>
                <select
                  value={selectedNode.player?.player.id || ''}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const found = evaluatedPlayers.find(p => p.player.id === targetId) || null;
                    setManualOverrides(prev => ({
                      ...prev,
                      [selectedNode.positionKey]: found
                    }));
                  }}
                  className="w-full bg-[#FFFFFF] border border-[#DADADA] rounded-xl px-2.5 py-1.5 text-xs text-[#F8FAFC] font-medium focus:outline-none focus:border-[#00C2FF] cursor-pointer"
                >
                  <option value="">-- Spieler wählen --</option>
                  {evaluatedPlayers.map(ev => (
                    <option key={ev.player.id} value={ev.player.id}>
                      {ev.player.firstName} {ev.player.lastName} ({ev.pos}) - {ev.topformScore}%
                    </option>
                  ))}
                </select>
              </div>

              {/* Position selector nodes list */}
              <div className="space-y-1.5 flex-1">
                <span className="text-[10px] font-black uppercase text-[#4A4A4A] tracking-wider">
                  Alle Startelf-Positionen:
                </span>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {pitchNodes.map((node) => (
                    <button
                      key={node.positionKey}
                      onClick={() => setSelectedPosKey(node.positionKey)}
                      className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedPosKey === node.positionKey ? 'bg-[#00C2FF] text-[#0A0A0A] font-black' : 'bg-[#121824] text-[#F8FAFC] hover:bg-[#E8E8E8]'
                      }`}
                    >
                      <span className="font-bold">{node.positionKey} - {node.player?.player.lastName || 'Unbelegt'}</span>
                      <span className="text-[10px] opacity-80">{node.player?.topformScore}%</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
