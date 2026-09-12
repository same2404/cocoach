import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Scissors, 
  Trash2, 
  Plus, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  FileText, 
  Printer, 
  Download, 
  Share2, 
  ExternalLink,
  Film,
  Sparkles,
  Clapperboard,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Layers,
  Target,
  AlertTriangle,
  CheckCircle2,
   Info,
   ListOrdered,
Users,
   Loader2,
   Calendar,
   Search,
   Camera,
   Save,
   Undo2,
   MousePointer2,
   Eraser,
   MoveUpRight,
   Waypoints,
   Footprints,
   Square,
   Crosshair
  } from 'lucide-react';
import { useCollectionSync } from '../../hooks/useCollectionSync';
import { Spieler, Player } from '../../types';
import { VideoReelPlayerModal } from '../video/VideoReelPlayerModal';
import { CategoryTrainerNoteCard, CategoryTrainerNote } from '../video/CategoryTrainerNoteCard';
import { ACTICODE_TASKS } from '../../constants/teamConfig';
import { VisionAnalysisPanel } from '../video/VisionAnalysisPanel';
import { apiFetch, apiFetchFormData } from '../../lib/apiClient';

export const VIDEO_CATEGORIES = [
  'Tore',
  'Gegentore',
  'Spielaufbau',
  'Pressing MIT Ball',
  'Pressing GEGEN den Ball',
  'Standards',
  'Ballverlust'
] as const;

export type VideoCategory = typeof VIDEO_CATEGORIES[number];

export const CATEGORY_HELP_TEXTS: Record<VideoCategory, { title: string; body: string }> = {
  'Tore': {
    title: 'Kriterien für „Tore"',
    body: `Definition: Der Ball überquert vollständig die gegnerische Torlinie, FC Auggen erzielt den Treffer und der Treffer wird vom Schiedsrichter anerkannt.

Typische Situationen:
• Abschluss aus dem Spiel heraus (Fuß, Kopf, direkt, Abstauber)
• Verwandelter Elfmeter
• Direkt verwandelter Freistoß oder Eckball
• Eigentor des Gegners (zählt als Tor für Auggen)

Empfehlung für den Zuschnitt: Beginne die Szene 5–10 Sekunden vor dem entscheidenden Pass/Zuspiel zum Torschützen, damit der Spielaufbau vor dem Tor sichtbar ist. Ende die Szene, wenn der Jubel beginnt bzw. der Anstoß erfolgt.`
  },
  'Gegentore': {
    title: 'Kriterien für „Gegentore"',
    body: `Definition: Der Ball überquert vollständig die eigene Torlinie, der Gegner erzielt den Treffer und dieser wird anerkannt.

Typische Situationen:
• Gegnerischer Abschluss aus dem Spiel
• Verwandelter Elfmeter gegen Auggen
• Direkter Freistoß/Eckball des Gegners
• Eigenes Eigentor

Empfehlung für den Zuschnitt: Beginne 8–10 Sekunden vor dem Gegentreffer, um den Fehler in der Abwehrkette (z. B. Stellungsfehler, verlorener Zweikampf, Fehlpass) sichtbar zu machen. Diese Szenen sind besonders wichtig für die Fehleranalyse.`
  },
  'Spielaufbau': {
    title: 'Kriterien für „Spielaufbau"',
    body: `Definition: FC Auggen beginnt den Ballbesitz im eigenen Drittel (Torwart, Innenverteidiger oder Außenverteidiger) und versucht durch strukturiertes Passspiel, den Ball kontrolliert nach vorne zu bringen.

Typische Situationen:
• Abstoß oder Rückpass zum Torwart, der das Spiel eröffnet
• Kurzer Spielaufbau über die Innenverteidiger
• Aufbau mit Einbindung des Torwarts (z. B. Überzahl schaffen)
• Verlagerung von einer Seite zur anderen im ersten Drittel
• Herauslocken des gegnerischen Pressings durch Ballbesitz

Abgrenzung: Sobald der Ball das mittlere Drittel verlässt und eine klare Angriffsaktion beginnt, gehört die Szene eher zu „Pressing MIT Ball" oder wird als eigenständige Angriffsszene betrachtet.

Empfehlung für den Zuschnitt: Beginne beim ersten Kontakt (z. B. Abstoß) und ende, sobald der Ball das erste Drittel verlassen hat oder der Ballbesitz verloren geht.`
  },
  'Pressing MIT Ball': {
    title: 'Kriterien für „Pressing MIT Ball"',
    body: `Definition: FC Auggen ist in Ballbesitz und agiert aktiv, um durch Tempo, Kombinationsspiel oder gezieltes Anlaufen des Gegners Räume zu öffnen und die eigene Angriffsstruktur zu verbessern.

Typische Situationen:
• Schnelles Kombinationsspiel, um gegnerisches Pressing zu überspielen
• Gezieltes Anspielen von Räumen hinter der gegnerischen Abwehrkette
• Doppelpässe oder Ablagen unter Druck, die den Gegner aus der Ordnung bringen
• Ballzirkulation mit klarem Ziel, eine Überzahlsituation zu erzeugen

Abgrenzung: Unterscheidet sich von „Spielaufbau" dadurch, dass hier bereits eine klare offensive Absicht gegen organisierten Gegnerdruck erkennbar ist, nicht der reine Spielaufbau aus der eigenen Hälfte.

Empfehlung für den Zuschnitt: Beginne, sobald der gegnerische Druck einsetzt, und ende, wenn die Drucksituation aufgelöst ist (z. B. durch einen befreienden Pass oder Ballverlust).`
  },
  'Pressing GEGEN den Ball': {
    title: 'Kriterien für „Pressing GEGEN den Ball"',
    body: `Definition: FC Auggen ist NICHT in Ballbesitz und läuft organisiert und aktiv an, um den Ball im gegnerischen oder mittleren Drittel zurückzuerobern.

Typische Situationen:
• Gegenpressing direkt nach Ballverlust (die ersten 5 Sekunden nach Verlust des Balls)
• Angeleitetes Anlaufen des ballführenden Gegenspielers durch Stürmer oder Mittelfeld
• Zustellen von Passwegen, um den Gegner zu Fehlern zu zwingen
• Ballgewinn durch koordiniertes Verschieben der gesamten Mannschaft

Abgrenzung: Wichtig ist der Moment des AUSLÖSERS (Pressing-Trigger) – z. B. ein schlechte Ballannahme des Gegners, ein Rückpass zum Torwart oder eine Berührung in eine bestimmte Zone. Markiere wenn möglich, WAS das Pressing ausgelöst hat.

Empfehlung für den Zuschnitt: Beginne kurz vor dem Auslöser-Moment und ende beim Ballgewinn oder wenn der Gegner das Pressing überspielt hat.`
  },
  'Standards': {
    title: 'Kriterien für „Standards"',
    body: `Definition: Alle ruhenden Bälle – unabhängig davon, ob FC Auggen oder der Gegner ausführt, und unabhängig vom Ausgang.

Typische Situationen:
• Eckbälle (eigene und gegnerische)
• Freistöße, egal ob direkt oder indirekt
• Einwürfe, insbesondere einstudierte Varianten
• Elfmeter (Ausführung, nicht nur der Treffer selbst)
• Abstöße, wenn sie als einstudierte Variante gezeigt werden sollen

Empfehlung für den Zuschnitt: Beginne bei der Ausführung (z. B. Anlauf zum Eckball) und ende, sobald die direkte Folgeaktion abgeschlossen ist (z. B. Klärung, Abschluss oder zweiter Ball). Ergänze im Notizfeld, ob es sich um eine einstudierte Variante handelt.`
  },
  'Ballverlust': {
    title: 'Kriterien für „Ballverlust"',
    body: `Definition: FC Auggen verliert den Ball durch einen Fehlpass, einen verlorenen Zweikampf, technisches Missgeschick oder eine gezielte Balleroberung des Gegners – unabhängig von der Spielfeldzone.

Typische Situationen:
• Fehlpass, der direkt beim Gegner landet
• Verlorener Zweikampf im Dribbling
• Technischer Fehler bei der Ballannahme
• Riskanter Ballverlust im eigenen Drittel (besonders kritisch zu markieren, da hohe Gefahr für Gegentor)

Abgrenzung: Wichtig ist zu unterscheiden zwischen Ballverlust im eigenen Drittel (hohes Risiko), im Mittelfeld (mittleres Risiko) und im gegnerischen Drittel (geringeres Risiko, da meist noch Zeit zum Gegenpressing bleibt). Bitte im Notizfeld die Zone vermerken.

Empfehlung für den Zuschnitt: Beginne 3–5 Sekunden vor dem eigentlichen Ballverlust, um die Entscheidung/den Fehler sichtbar zu machen, und ende, wenn der Gegner die Kontrolle über den Ball gesichert hat.`
  }
};

// Automatische Schnitt-Vorschläge & Sub-Tags je Kategorie
// (Sekunden relativ zum "Kernmoment" der Szene)
export const CATEGORY_CUT_RULES: Record<VideoCategory, {
  startBefore: number;   // wie viele Sek. VOR dem Kernmoment beginnen
  endAfter: number;      // wie viele Sek. NACH dem Kernmoment enden
  subTags: string[];
}> = {
  'Tore': {
    startBefore: 5,
    endAfter: 4,
    subTags: ['Kopfball', 'Fuß', 'Distanz', 'Abstauber', 'Elfmeter', 'Eigentor', 'Umschalten', 'Aufbau', 'Standard', 'Konter'],
  },
  'Gegentore': {
    startBefore: 6,
    endAfter: 2,
    subTags: ['Stellungsfehler', 'Zuordnungsfehler', 'Timing', 'individuell', 'kollektiv', 'Umschalten', 'Aufbau', 'Standard'],
  },
  'Spielaufbau': {
    startBefore: 0,
    endAfter: 3,
    subTags: ['kurz', 'lang', 'über TW', 'Doppel-6', 'zurückfallender 10er', 'erfolgreich', 'nicht erfolgreich'],
  },
  'Pressing MIT Ball': {
    startBefore: 1,
    endAfter: 3,
    subTags: ['Lösung erfolgreich', 'Lösung nicht erfolgreich', 'Kurzpass', 'Ablage', 'Dribbling', 'langer Ball', 'Foul provoziert'],
  },
  'Pressing GEGEN den Ball': {
    startBefore: 2,
    endAfter: 2,
    subTags: ['hoch', 'mittel', 'tief', 'links', 'rechts', 'Zentrum', 'Ballgewinn', 'Befreiung', 'Foul'],
  },
  'Standards': {
    startBefore: 2,
    endAfter: 4,
    subTags: ['Ecke', 'Freistoß-Tor', 'Freistoß-Halbfeld', 'Einwurf', 'Elfmeter', 'Schweden', 'Lukas', 'Apache', 'Pluto', 'Torchance entstanden'],
  },
  'Ballverlust': {
    startBefore: 3,
    endAfter: 3,
    subTags: ['unnötiges Dribbling', 'falsche Ballannahme', 'schlechter Pass', 'fehlende Absicherung', 'Fremdeinwirkung', 'eigenes Drittel', 'Mittelfeld', 'gegnerisches Drittel', 'Gegentor', 'Gegentorchance', 'keine Konsequenz'],
  },
};

export interface TacticalVideoClip {
  id: string;
  category: VideoCategory;
  videoUrl: string;
  videoName?: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  duration: number; // in seconds
  thumbnailUrl?: string;
  tacticalNote: string;
  colorMarking: 'green' | 'red' | 'none';
  createdAt: string;
  title?: string;
  label?: string;
  assignedPlayerId?: string;
  assignedPlayerName?: string;
  cutFileName?: string;
  // CoCoach Maximum Information Extraction (Tiefenanalyse-Szenenfelder)
  aiSceneId?: string;
  categories?: string[];
  beforeSituation?: string;
  trigger?: string;
  passSequence?: string;
  runPatterns?: string[];
  keyPlayers?: {
    jerseyNumber?: string;
    name?: string;
    team?: string;
    positionZone?: string;
    startZone?: string;
    endZone?: string;
    movementDirection?: string;
    action?: string;
  }[];
  spatialAnalysis?: {
    center?: string;
    leftHalfSpace?: string;
    rightHalfSpace?: string;
    wingsLeft?: string;
    wingsRight?: string;
    betweenLines?: string;
    behindDefense?: string;
  };
  defensiveLines?: {
    homeLineHeight?: string;
    opponentLineHeight?: string;
    lineDistance?: string;
    compactness?: string;
    shiftDirection?: string;
  };
  opponentStructure?: {
    formation?: string;
    pressingHeight?: string;
    pressingDirection?: string;
    playersBehindBall?: number;
    playersAheadOfBall?: number;
    openPassLanes?: string;
    closedPassLanes?: string;
    freePlayers?: string;
  };
  decision?: {
    availableOptions?: string[];
    bestOption?: string;
    reasoning?: string;
  };
  mainLearningPoint?: string;
  goalDetails?: string;
  concededGoalDetails?: string;
  relatedSceneIds?: string[];
  confidence?: {
    overall?: string;
    markers?: string[];
    estimated?: boolean;
    lowConfidence?: boolean;
  };
  qualityCheck?: string[];
  subTags?: string[];
  tacticBoard?: SceneTacticBoard;
  // ⚡ Ultra-Overlay: KI-Keyframe-Tracking (läuft mit dem Video mit)
  ultraOverlay?: UltraOverlayData;
}

// Once-Style Taktik-Grafik je Szene (Koordinaten in % auf dem kompletten Spielfeld)
export interface SceneTacticBoard {
  attackDirection?: string;
  players?: Array<{ label: string; team: string; x: number; y: number }>;
  ball?: { x: number; y: number };
  chains?: Array<{ label?: string; fromX: number; fromY: number; toX: number; toY: number; color?: string }>;
  passes?: Array<{ fromLabel?: string; toLabel?: string; fromX: number; fromY: number; toX: number; toY: number; action?: string; color?: string }>;
  runs?: Array<{ label?: string; points: Array<{ x: number; y: number }>; color?: string }>;
  ballPath?: Array<{ points: Array<{ x: number; y: number }>; color?: string }>;
  zones?: Array<{ x: number; y: number; w: number; h: number; label?: string; color?: string }>;
  optimalPositions?: Array<{ label?: string; fromX?: number; fromY?: number; toX: number; toY: number; note?: string }>;
}

// ⚡ Ultra-Overlay (Kameratracking / Spieler-Tracking / Keyframes) – Browser interpoliert
export interface UltraOverlayData {
  summary?: string;
  attackDirection?: string;
  cameraMotion?: { type?: string; movement?: string };
  keyframes?: UltraKeyframe[];
  coaching?: {
    tacticalInsight?: string;
    errors?: string[];
    improvements?: string[];
    coachingPoints?: string[];
    importance?: string;
  };
  sceneId?: string | null;
  generatedAt?: number;
}

export interface UltraKeyframe {
  timeSeconds: number;
  players?: Array<{ id?: string; team?: string; label?: string; x: number; y: number; motion?: string }>;
  passes?: Array<{ fromX: number; fromY: number; toX: number; toY: number; color?: string; action?: string }>;
  runs?: Array<{ label?: string; color?: string; points: number[][] | Array<{ x: number; y: number }> }>;
  ballPath?: Array<{ color?: string; points: number[][] | Array<{ x: number; y: number }> }>;
  zones?: Array<{ x: number; y: number; w: number; h: number; color?: string; label?: string }>;
  chains?: Array<{ fromX: number; fromY: number; toX: number; toY: number; color?: string; label?: string }>;
  optimalPositions?: Array<{ toX: number; toY: number; note?: string; label?: string }>;
  lowConfidence?: boolean;
}

// Firestore verbietet verschachtelte Arrays → runs/ballPath-Punkte als {x,y}-Objekte speichern
const sanitizeUltraOverlayForFirestore = (overlay: UltraOverlayData | undefined | null): UltraOverlayData => {
  if (!overlay || typeof overlay !== 'object') return { keyframes: [] };
  const normPoints = (arr: any[] | undefined): Array<{ x: number; y: number }> =>
    Array.isArray(arr)
      ? arr
          .map((p: any) => (Array.isArray(p) ? { x: p[0], y: p[1] } : { x: p?.x, y: p?.y }))
          .filter((q: any) => typeof q?.x === 'number' && isFinite(q.x) && typeof q?.y === 'number' && isFinite(q.y))
      : [];
  const clone: UltraOverlayData = {
    ...overlay,
    keyframes: Array.isArray(overlay.keyframes)
      ? overlay.keyframes.map((k) => ({
          ...k,
          runs: Array.isArray(k.runs) ? k.runs.map((r) => ({ ...r, points: normPoints(r.points) })) : k.runs,
          ballPath: Array.isArray(k.ballPath) ? k.ballPath.map((b) => ({ ...b, points: normPoints(b.points) })) : k.ballPath,
        }))
      : [],
  };
  return clone;
};

const clampPct = (v: any, fallback: number = 50): number => {
  const n = typeof v === 'number' && isFinite(v) ? v : fallback;
  return Math.max(0, Math.min(100, n));
};

// Mini-Taktiktafel (Once-Style) für eine erkannte Szene
const SceneTacticDiagram: React.FC<{ board?: SceneTacticBoard; expanded: boolean; onToggle: () => void }> = ({ board, expanded, onToggle }) => {
  if (!board) return null;
  const upAttacking = board.attackDirection !== 'DOWN';
  const flipY = (y: number) => (upAttacking ? y : 100 - y);
  const ball = board.ball;
  const players = board.players || [];
  const passes = board.passes || [];
  const runs = board.runs || [];
  const zones = board.zones || [];
  const optimals = board.optimalPositions || [];
  const chains = board.chains || [];
  const ballPaths = board.ballPath || [];

  return (
    <div className="mt-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border cursor-pointer transition-all bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 hover:bg-[#10B981]/20"
        title={expanded ? 'Taktik-Grafik ausblenden' : 'Taktische Szene als Grafik ansehen (Once-Style)'}
      >
        {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        Taktik-Grafik
      </button>
      {expanded && (
        <div className="flex gap-3 mt-1.5 flex-col lg:flex-row">
          {/* Spielfeld mit allen Elementen */}
          <div className="relative w-full lg:w-72 h-56 lg:h-64 rounded-xl overflow-hidden bg-[#041f15] border border-[#10B981]/20 shrink-0">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
              {/* Spielfeldlinien */}
              <rect x="4" y="4" width="92" height="92" fill="none" stroke="#10B981" strokeOpacity="0.5" strokeWidth="0.6" />
              <line x1="4" y1="50" x2="96" y2="50" stroke="#10B981" strokeOpacity="0.5" strokeWidth="0.6" />
              <circle cx="50" cy="50" r="11" fill="none" stroke="#10B981" strokeOpacity="0.5" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="3.5" fill="none" stroke="#10B981" strokeOpacity="0.5" strokeWidth="0.5" />
              {/* Strafräume */}
              <rect x="4" y={upAttacking ? 66 : 4} width="92" height="30" fill="none" stroke="#10B981" strokeOpacity="0.35" strokeWidth="0.5" />
              <rect x="4" y={upAttacking ? 78 : -8} width="92" height="18" fill="none" stroke="#10B981" strokeOpacity="0.35" strokeWidth="0.5" />
              {/* Tore */}
              <rect x="34" y={upAttacking ? 98 : -2} width="32" height="3" fill="none" stroke="#10B981" strokeOpacity="0.6" strokeWidth="0.7" />
              <rect x="34" y={upAttacking ? -2 : 98} width="32" height="3" fill="none" stroke="#10B981" strokeOpacity="0.6" strokeWidth="0.7" />

              {/* Zonen */}
              {zones.map((z, i) => (
                <g key={`zone-${i}`}>
                  <rect
                    x={clampPct(z.x)} y={flipY(clampPct(z.y))} width={clampPct(z.w, 10)} height={clampPct(z.h, 10)}
                    fill={z.color || '#F59E0B'} opacity="0.25" stroke={z.color || '#F59E0B'} strokeWidth="0.5" strokeDasharray="2 1.5" rx="1"
                  />
                  {z.label ? <text x={clampPct(z.x) + 1.5} y={flipY(clampPct(z.y)) + 3} fontSize="3" fontWeight="900" fill={z.color || '#F59E0B'}>{z.label}</text> : null}
                </g>
              ))}

              {/* Spielerketten (Linien verbinden) */}
              {chains.map((ch, i) => (
                <line
                  key={`chain-${i}`}
                  x1={clampPct(ch.fromX)} y1={flipY(clampPct(ch.fromY))} x2={clampPct(ch.toX)} y2={flipY(clampPct(ch.toY))}
                  stroke={ch.color || '#22D3EE'} strokeWidth="0.9" opacity="0.8" strokeLinecap="round"
                />
              ))}

              {/* Ballweg */}
              {ballPaths.map((bp, i) => bp.points && bp.points.length >= 2 ? (
                <polyline
                  key={`ballpath-${i}`}
                  points={bp.points.map(p => `${clampPct(p.x)},${flipY(clampPct(p.y))}`).join(' ')}
                  fill="none" stroke={bp.color || '#F59E0B'} strokeWidth="1" strokeDasharray="1.5 1.5" opacity="0.95" strokeLinecap="round"
                />
              ) : null)}

              {/* Laufwege */}
              {runs.map((r, i) => r.points && r.points.length >= 2 ? (
                <polyline
                  key={`run-${i}`}
                  points={r.points.map(p => `${clampPct(p.x)},${flipY(clampPct(p.y))}`).join(' ')}
                  fill="none" stroke={r.color || '#3B82F6'} strokeWidth="1" strokeDasharray="2.5 1.5" opacity="0.95" strokeLinecap="round"
                />
              ) : null)}

              {/* Passwege */}
              {passes.map((p, i) => (
                <g key={`pass-${i}`}>
                  <line x1={clampPct(p.fromX)} y1={flipY(clampPct(p.fromY))} x2={clampPct(p.toX)} y2={flipY(clampPct(p.toY))} stroke={p.color || '#3B82F6'} strokeWidth="0.8" opacity="0.9" />
                  <circle cx={clampPct(p.toX)} cy={flipY(clampPct(p.toY))} r="1.1" fill={p.color || '#3B82F6'} opacity="0.9" />
                </g>
              ))}

              {/* Optimale Positionen */}
              {optimals.map((o, i) => (
                <g key={`opt-${i}`}>
                  {typeof o.fromX === 'number' && typeof o.fromY === 'number' && (
                    <line x1={clampPct(o.fromX)} y1={flipY(clampPct(o.fromY))} x2={clampPct(o.toX)} y2={flipY(clampPct(o.toY))} stroke="#F59E0B" strokeWidth="0.6" strokeDasharray="1.5 1.2" opacity="0.9" />
                  )}
                  <circle cx={clampPct(o.toX)} cy={flipY(clampPct(o.toY))} r="2.4" fill="none" stroke="#F59E0B" strokeWidth="0.6" />
                  {o.note ? <text x={Math.min(clampPct(o.toX) + 2, 92)} y={Math.max(flipY(clampPct(o.toY)) - 1.5, 3)} fontSize="2.8" fontWeight="900" fill="#FBBF24">{o.note}</text> : null}
                </g>
              ))}

              {/* Ball */}
              {ball && (
                <circle cx={clampPct(ball.x)} cy={flipY(clampPct(ball.y))} r="1.8" fill="#FFFFFF" stroke="#0A0E17" strokeWidth="0.4" />
              )}

              {/* Spieler */}
              {players.map((pl, i) => {
                const isHome = /auggen|fca/i.test(pl.team || '') || !/gegner|opponent/i.test(pl.team || '');
                return (
                  <g key={`pl-${i}`}>
                    <circle cx={clampPct(pl.x)} cy={flipY(clampPct(pl.y))} r="3.2" fill={isHome ? '#3B82F6' : '#EF4444'} stroke="#FFFFFF" strokeWidth="0.5" />
                    <text x={clampPct(pl.x)} y={flipY(clampPct(pl.y)) + 1.1} fontSize="3" fontWeight="900" fill="#FFFFFF" textAnchor="middle">{pl.label}</text>
                  </g>
                );
              })}
            </svg>
            <span className="absolute top-1 left-1.5 text-[7px] font-black uppercase tracking-wider text-[#10B981]/70">🎯 Once-Style Taktik</span>
            <span className="absolute bottom-1 right-1.5 text-[7px] uppercase tracking-wider text-white/40">{board.attackDirection === 'DOWN' ? 'Gegner greift oben an' : 'FCA greift oben an'}</span>
          </div>

          {/* Legende */}
          <div className="flex-1 grid grid-cols-2 gap-1.5 text-[10px]">
            <div className="space-y-0.5">
              <div className="text-[8px] font-black uppercase tracking-widest text-[#94A3B8]">Legende</div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]"><span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> FC Auggen</div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]"><span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Gegner</div>
              <div className="flex items-center gap-1.5 text-[#94A3B8]"><span className="w-2.5 h-2.5 rounded-full bg-white border border-[#0A0E17]" /> Ball</div>
            </div>
            {passes.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-[#94A3B8]">Passfolge ({passes.length})</div>
                {passes.slice(0, 4).map((p, i) => (
                  <div key={i} className="flex items-center gap-1 text-[#94A3B8] truncate">
                    <span className="text-[#3B82F6]">→</span>
                    <span>{(p.fromLabel || '?')} → {(p.toLabel || '?')}</span>
                    <span className="text-white/50">· {p.action || 'Pass'}</span>
                  </div>
                ))}
                {passes.length > 4 && <div className="text-[#64748B] text-[9px]">+{passes.length - 4} weitere</div>}
              </div>
            )}
            {runs.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-[#94A3B8]">Laufwege ({runs.length})</div>
                {runs.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center gap-1 text-[#94A3B8] truncate">
                    <span className="text-[#3B82F6]">➜</span>
                    <span>{r.label || `Lauf ${i + 1}`}</span>
                  </div>
                ))}
              </div>
            )}
            {optimals.length > 0 && (
              <div className="space-y-0.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-[#F59E0B]">Optimale Positionen ({optimals.length})</div>
                {optimals.slice(0, 2).map((o, i) => (
                  <div key={i} className="text-[#FBBF24] truncate">◉ {o.label || '?'}: {o.note || 'Besser positionieren'}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ⚡ Ultra-Overlay: lineare Interpolation zwischen Keyframes (Browser-Rechner)
const lerpN = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPct = (a: number, b: number, t: number) => Math.max(0, Math.min(100, lerpN(a, b, t)));
// Punkt flexibel lesen: [x, y] (Server) ODER { x, y } (Firestore-saniert)
const ptX = (p: any): number => (Array.isArray(p) ? p[0] : p?.x);
const ptY = (p: any): number => (Array.isArray(p) ? p[1] : p?.y);
const lerpPoly = (pa: any[], pb: any[], t: number): any[] => {
  if (!pa) return pb || [];
  if (!pb) return pa;
  if (pa.length === pb.length) return pa.map((p, k) => {
    const q = pb[k];
    if (Array.isArray(p) && Array.isArray(q)) return [lerpPct(p[0], q[0], t), lerpPct(p[1], q[1], t)];
    return { x: lerpPct(ptX(p), ptX(q), t), y: lerpPct(ptY(p), ptY(q), t) };
  });
  const shorter = pa.length < pb.length ? pa : pb;
  const longer = pa.length < pb.length ? pb : pa;
  return t < 0.5 ? shorter : longer;
};

const resolveUltraSnapshot = (overlay: UltraOverlayData | undefined, t: number): any => {
  const empty = { players: [], passes: [], runs: [], ballPath: [], zones: [], chains: [], optimalPositions: [] };
  if (!overlay || !Array.isArray(overlay.keyframes) || overlay.keyframes.length === 0) return empty;
  const kfs = [...overlay.keyframes].sort((a, b) => a.timeSeconds - b.timeSeconds);
  const t0 = kfs[0].timeSeconds || 0;
  const tN = kfs[kfs.length - 1].timeSeconds || t0 + 1;
  const tt = Math.max(t0, Math.min(tN, t));
  let i = 0;
  while (i < kfs.length - 1 && tt > kfs[i + 1].timeSeconds) i++;
  const A = kfs[i];
  const B = kfs[Math.min(i + 1, kfs.length - 1)];
  const span = Math.max(0.05, (B.timeSeconds || t0) - (A.timeSeconds || t0));
  const f = Math.max(0, Math.min(1, (tt - (A.timeSeconds || t0)) / span));

  // Spieler stabil über Keyframes verfolgen (gleiche id = gleicher Spieler)
  const playersById: any = {};
  const aP = A.players || [];
  const bP = B.players || [];
  const ids = Array.from(new Set([...aP.map(p => p.id).filter(Boolean), ...bP.map(p => p.id).filter(Boolean)]));
  ids.forEach(id => {
    const pa = aP.find(p => p.id === id);
    const pb = bP.find(p => p.id === id);
    if (pa && pb) playersById[id] = { ...pa, x: lerpPct(pa.x, pb.x, f), y: lerpPct(pa.y, pb.y, f) };
    else if (pa) playersById[id] = { ...pa };
    else if (pb) playersById[id] = { ...pb };
  });
  (A.players || []).forEach((p: any, k: number) => {
    if (!playersById[p.id]) playersById[`idx_${k}_${p.x.toFixed(1)}_${p.y.toFixed(1)}`] = { ...p };
  });
  (B.players || []).forEach((p: any, k: number) => {
    if (!playersById[p.id]) playersById[`bidx_${k}_${p.x.toFixed(1)}_${p.y.toFixed(1)}`] = { ...p };
  });

  const interpList = (pa: any[], pb: any[], fn: (x: any, y: any, f: number) => any) =>
    Array.from({ length: Math.max(pa.length, pb.length) }, (_, k) => {
      if (!pa[k]) return pb[k];
      if (!pb[k]) return pa[k];
      return fn(pa[k], pb[k], f);
    });

  return {
    players: Object.values(playersById).filter(Boolean),
    passes: interpList(A.passes || [], B.passes || [], (x, y, f2) => ({
      ...x, fromX: lerpPct(x.fromX, y.fromX, f2), fromY: lerpPct(x.fromY, y.fromY, f2),
      toX: lerpPct(x.toX, y.toX, f2), toY: lerpPct(x.toY, y.toY, f2)
    })),
    zones: interpList(A.zones || [], B.zones || [], (x, y, f2) => ({
      ...x, x: lerpPct(x.x, y.x, f2), y: lerpPct(x.y, y.y, f2), w: lerpPct(x.w, y.w, f2), h: lerpPct(x.h, y.h, f2)
    })),
    chains: interpList(A.chains || [], B.chains || [], (x, y, f2) => ({
      ...x, fromX: lerpPct(x.fromX, y.fromX, f2), fromY: lerpPct(x.fromY, y.fromY, f2),
      toX: lerpPct(x.toX, y.toX, f2), toY: lerpPct(x.toY, y.toY, f2)
    })),
    runs: interpList(A.runs || [], B.runs || [], (x, y, f2) => ({ ...x, points: lerpPoly(x.points, y.points, f2) })),
    ballPath: interpList(A.ballPath || [], B.ballPath || [], (x, y, f2) => ({ ...x, points: lerpPoly(x.points, y.points, f2) })),
    optimalPositions: interpList(A.optimalPositions || [], B.optimalPositions || [], (x, y, f2) => ({
      ...x, toX: lerpPct(x.toX, y.toX, f2), toY: lerpPct(x.toY, y.toY, f2)
    })),
  };
};

// ⚡ Ultra-Overlay-Renderer (Once-Level): liegt über dem Video, klebt an Spielern/Kamera
const UltraOverlaySVG: React.FC<{ overlay: UltraOverlayData; timeInClip: number }> = ({ overlay, timeInClip }) => {
  const snap = resolveUltraSnapshot(overlay, timeInClip);
  if (!overlay || !Array.isArray(overlay.keyframes) || overlay.keyframes.length === 0) return null;
  if (snap.players.length === 0 && snap.passes.length === 0 && snap.zones.length === 0 && snap.runs.length === 0 && snap.chains.length === 0 && snap.optimalPositions.length === 0) return null;
  const vs = (v: any, f: number = 50) => clampPct(v, f);
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[14]" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <marker id="ultraArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#22D3EE" />
        </marker>
      </defs>

      {(snap.chains || []).map((c: any, i: number) => (
        <g key={`uc${i}`}>
          <line x1={vs(c.fromX)} y1={vs(c.fromY)} x2={vs(c.toX)} y2={vs(c.toY)} stroke={c.color || '#22D3EE'} strokeWidth="5.5" opacity="0.25" strokeLinecap="round" />
          <line x1={vs(c.fromX)} y1={vs(c.fromY)} x2={vs(c.toX)} y2={vs(c.toY)} stroke={c.color || '#22D3EE'} strokeWidth="2.2" opacity="0.95" strokeLinecap="round" />
        </g>
      ))}

      {(snap.ballPath || []).map((b: any, i: number) => b.points && b.points.length >= 2 ? (
        <g key={`ub${i}`}>
          <polyline points={b.points.map((p: any) => `${vs(ptX(p))},${vs(ptY(p))}`).join(' ')} fill="none" stroke={b.color || '#F59E0B'} strokeWidth="3" opacity="0.22" strokeLinecap="round" />
          <polyline points={b.points.map((p: any) => `${vs(ptX(p))},${vs(ptY(p))}`).join(' ')} fill="none" stroke={b.color || '#F59E0B'} strokeWidth="1.7" strokeDasharray="2.4 1.8" opacity="0.98" strokeLinecap="round" />
          {b.points.slice(1).map((pp: any, j: number) => <circle key={j} cx={vs(ptX(pp))} cy={vs(ptY(pp))} r="1.5" fill={b.color || '#F59E0B'} />)}
        </g>
      ) : null)}

      {(snap.runs || []).map((r: any, i: number) => r.points && r.points.length >= 2 ? (
        <g key={`ur${i}`}>
          <polyline points={r.points.map((p: any) => `${vs(ptX(p))},${vs(ptY(p))}`).join(' ')} fill="none" stroke={r.color || '#3B82F6'} strokeWidth="3" opacity="0.22" strokeLinecap="round" />
          <polyline points={r.points.map((p: any) => `${vs(ptX(p))},${vs(ptY(p))}`).join(' ')} fill="none" stroke={r.color || '#3B82F6'} strokeWidth="1.7" strokeDasharray="2.4 1.8" opacity="0.98" strokeLinecap="round" />
        </g>
      ) : null)}

      {(snap.passes || []).map((p: any, i: number) => (
        <g key={`up${i}`}>
          <line x1={vs(p.fromX)} y1={vs(p.fromY)} x2={vs(p.toX)} y2={vs(p.toY)} stroke={p.color || '#3B82F6'} strokeWidth="2.8" opacity="0.28" strokeLinecap="round" />
          <line x1={vs(p.fromX)} y1={vs(p.fromY)} x2={vs(p.toX)} y2={vs(p.toY)} stroke={p.color || '#3B82F6'} strokeWidth="1.5" opacity="0.98" markerEnd="url(#ultraArrow)" />
          <circle cx={vs(p.toX)} cy={vs(p.toY)} r="1.4" fill={p.color || '#3B82F6'} />
        </g>
      ))}

      {(snap.zones || []).map((z: any, i: number) => (
        <g key={`uz${i}`}>
          <rect x={vs(z.x)} y={vs(z.y)} width={vs(z.w, 10)} height={vs(z.h, 10)} fill={z.color || '#F59E0B'} opacity="0.3" stroke={z.color || '#F59E0B'} strokeWidth="1.1" strokeDasharray="2 1.4" rx="1" />
          {z.label ? <text x={vs(z.x) + 1.5} y={vs(z.y) + 4.5} fontSize="4.4" fontWeight="900" fill={z.color || '#F59E0B'} stroke="#000000" strokeWidth="0.5" paintOrder="stroke">{z.label}</text> : null}
        </g>
      ))}

      {(snap.optimalPositions || []).map((o: any, i: number) => (
        <g key={`uo${i}`}>
          <circle cx={vs(o.toX)} cy={vs(o.toY)} r="5.5" fill="rgba(217,70,239,0.12)" stroke="#E879F9" strokeWidth="1.2" strokeDasharray="1.6 1" />
          {o.note ? <text x={Math.min(vs(o.toX) + 6, 92)} y={Math.max(vs(o.toY) - 6, 5)} fontSize="4.2" fontWeight="900" fill="#F0ABFC" stroke="#000000" strokeWidth="0.5" paintOrder="stroke">{o.note}</text> : null}
        </g>
      ))}

      {(snap.players || []).map((pl: any, i: number) => {
        const isOwn = String(pl.team || '').toLowerCase() !== 'opponent';
        const col = isOwn ? '#22D3EE' : '#EF4444';
        return (
          <g key={`upl${i}`}>
            {pl.motion && pl.motion.toLowerCase().includes('sprint') ? <circle cx={vs(pl.x)} cy={vs(pl.y)} r="7" fill="none" stroke={col} strokeWidth="0.6" opacity="0.5" /> : null}
            <circle cx={vs(pl.x)} cy={vs(pl.y)} r="4.4" fill={col} opacity="0.35" stroke={col} strokeWidth="1.4" />
            <circle cx={vs(pl.x)} cy={vs(pl.y)} r="3.1" fill={col} stroke="#FFFFFF" strokeWidth="0.9" />
            <text x={vs(pl.x)} y={vs(pl.y) + 1.3} fontSize="3.7" fontWeight="900" fill="#FFFFFF" stroke="#000000" strokeWidth="0.4" paintOrder="stroke" textAnchor="middle">{pl.label || '?'}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Once-Style Taktik-Tagger: auf eingefrorenem Frame Linien, Räume, Pässe, Läufe, Ballweg
// und bessere Positionen zeichnen – Ergebnis als annotiertes Bild + Taktikdaten speichern.
const OnceTaggerModal: React.FC<{
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoName: string;
  videoSource: string;
  initialTime: number;
  onSave: (thumbnailDataUrl: string, board: SceneTacticBoard, timeSeconds: number) => void;
  onClose: () => void;
}> = ({ videoRef, videoName, videoSource, initialTime, onSave, onClose }) => {
  const [frameDataUrl, setFrameDataUrl] = useState<string | null>(null);
  const [frameDims, setFrameDims] = useState<{ w: number; h: number }>({ w: 1280, h: 720 });
  const [snapshotTime, setSnapshotTime] = useState<number>(initialTime);
  const [tool, setTool] = useState<'pointer' | 'player' | 'chain' | 'pass' | 'run' | 'zone' | 'ball' | 'optimal'>('pointer');
  const [team, setTeam] = useState<'FC Auggen' | 'Gegner'>('FC Auggen');
  const [playerLabel, setPlayerLabel] = useState<string>('#9');
  const [strokeColor, setStrokeColor] = useState<string>('#3B82F6');
  const [zoneLabel, setZoneLabel] = useState<string>('Freier Raum');
  const [optimalNote, setOptimalNote] = useState<string>('Besser stehen – Raum sichern');
  const [board, setBoard] = useState<SceneTacticBoard>({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [], ball: undefined });
  const [history, setHistory] = useState<SceneTacticBoard[]>([]);
  const [draftStart, setDraftStart] = useState<{ x: number; y: number } | null>(null);
  const [draftEnd, setDraftEnd] = useState<{ x: number; y: number } | null>(null);
  const [runPoints, setRunPoints] = useState<Array<{ x: number; y: number }>>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const toPct = (px: number, total: number) => Math.max(0, Math.min(100, (px / total) * 100));
  const pushHist = () => setHistory(prev => [...prev.slice(-30), board]);

  const captureFrame = () => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.drawImage(v, 0, 0, w, h);
      frameCanvasRef.current = c;
      setFrameDataUrl(c.toDataURL('image/png'));
      setFrameDims({ w, h });
      setSnapshotTime(v.currentTime || initialTime);
    }
  };

  const getPos = (e: React.PointerEvent): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(frameDims.w, ((e.clientX - rect.left) / rect.width) * frameDims.w)),
      y: Math.max(0, Math.min(frameDims.h, ((e.clientY - rect.top) / rect.height) * frameDims.h)),
    };
  };

  const commitDragged = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const a = { x: toPct(from.x, frameDims.w), y: toPct(from.y, frameDims.h) };
    const b = { x: toPct(to.x, frameDims.w), y: toPct(to.y, frameDims.h) };
    pushHist();
    setBoard(prev => {
      const next = { ...prev, players: prev.players ? [...prev.players] : [], chains: prev.chains ? [...prev.chains] : [], passes: prev.passes ? [...prev.passes] : [], runs: prev.runs ? [...prev.runs] : [], ballPath: prev.ballPath ? [...prev.ballPath] : [], zones: prev.zones ? [...prev.zones] : [], optimalPositions: prev.optimalPositions ? [...prev.optimalPositions] : [] };
      if (tool === 'chain') next.chains!.push({ fromX: a.x, fromY: a.y, toX: b.x, toY: b.y, color: strokeColor });
      if (tool === 'pass') next.passes!.push({ fromX: a.x, fromY: a.y, toX: b.x, toY: b.y, action: 'Pass', color: strokeColor });
      if (tool === 'zone') next.zones!.push({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), label: zoneLabel, color: strokeColor });
      return next;
    });
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const p = getPos(e);
    if (!p) return;
    if (tool === 'pointer') {
      removeNearest(p);
      return;
    }
    if (tool === 'player' || tool === 'optimal') {
      pushHist();
      const x = toPct(p.x, frameDims.w), y = toPct(p.y, frameDims.h);
      setBoard(prev => {
        const next = { ...prev, players: prev.players ? [...prev.players] : [], optimalPositions: prev.optimalPositions ? [...prev.optimalPositions] : [] };
        if (tool === 'player') next.players!.push({ label: playerLabel, team, x, y });
        if (tool === 'optimal') next.optimalPositions!.push({ label: playerLabel, toX: x, toY: y, note: optimalNote });
        return next;
      });
      return;
    }
    if (tool === 'run' || tool === 'ball') {
      const pt = { x: toPct(p.x, frameDims.w), y: toPct(p.y, frameDims.h) };
      setRunPoints(prev => [...prev, pt]);
      return;
    }
    setDraftStart(p);
    setDraftEnd(p);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draftStart) return;
    const p = getPos(e);
    if (p) setDraftEnd(p);
  };

  const handlePointerUp = () => {
    if (draftStart && draftEnd) {
      commitDragged(draftStart, draftEnd);
    }
    setDraftStart(null);
    setDraftEnd(null);
  };

  const finishPolyline = () => {
    if (runPoints.length < 2) { setRunPoints([]); return; }
    pushHist();
    const pts = [...runPoints];
    if (tool === 'ball') {
      setBoard(prev => ({ ...prev, ballPath: [...(prev.ballPath || []), { points: pts, color: '#F59E0B' }] }));
    } else {
      setBoard(prev => ({ ...prev, runs: [...(prev.runs || []), { label: 'Laufweg', points: pts, color: strokeColor }] }));
    }
    setRunPoints([]);
  };

  const removeNearest = (p: { x: number; y: number }) => {
    const px = toPct(p.x, frameDims.w), py = toPct(p.y, frameDims.h);
    const dist = (a: { x: number; y: number }) => Math.hypot(a.x - px, a.y - py);
    const elemDist = (pts: Array<{ x: number; y: number }>) => Math.min(...pts.map(dist));
    const tol = 8;
    pushHist();
    setBoard(prev => {
      const next = { ...prev, players: prev.players ? [...prev.players] : [], chains: prev.chains ? [...prev.chains] : [], passes: prev.passes ? [...prev.passes] : [], runs: prev.runs ? [...prev.runs] : [], ballPath: prev.ballPath ? [...prev.ballPath] : [], zones: prev.zones ? [...prev.zones] : [], optimalPositions: prev.optimalPositions ? [...prev.optimalPositions] : [] };
      const candidate: Array<{ d: number; remove: () => void }> = [];
      next.players!.forEach((pl, i) => candidate.push({ d: dist({ x: pl.x, y: pl.y }), remove: () => next.players!.splice(i, 1) }));
      next.optimalPositions!.forEach((o, i) => candidate.push({ d: dist({ x: o.toX, y: o.toY }), remove: () => next.optimalPositions!.splice(i, 1) }));
      next.zones!.forEach((z, i) => candidate.push({ d: Math.min(Math.abs(px - z.x), Math.abs(px - (z.x + z.w))) + Math.min(Math.abs(py - z.y), Math.abs(py - (z.y + z.h))), remove: () => next.zones!.splice(i, 1) }));
      if (next.runs!.length) next.runs!.forEach((r, i) => candidate.push({ d: r.points.length ? elemDist(r.points) : 999, remove: () => next.runs!.splice(i, 1) }));
      if (next.ballPath!.length) next.ballPath!.forEach((b, i) => candidate.push({ d: b.points.length ? elemDist(b.points) : 999, remove: () => next.ballPath!.splice(i, 1) }));
      if (next.chains!.length) next.chains!.forEach((c, i) => {
        const pts = [{ x: c.fromX, y: c.fromY }, { x: c.toX, y: c.toY }];
        candidate.push({ d: elemDist(pts), remove: () => next.chains!.splice(i, 1) });
      });
      if (next.passes!.length) next.passes!.forEach((p2, i) => {
        const pts = [{ x: p2.fromX, y: p2.fromY }, { x: p2.toX, y: p2.toY }];
        candidate.push({ d: elemDist(pts), remove: () => next.passes!.splice(i, 1) });
      });
      candidate.sort((a, b) => a.d - b.d);
      const best = candidate[0];
      if (best && best.d < tol) best.remove();
      return next;
    });
  };

  const undo = () => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setBoard(last);
      return prev.slice(0, -1);
    });
  };

  const composeAnnotatedImage = (): string => {
    const c = document.createElement('canvas');
    c.width = frameDims.w;
    c.height = frameDims.h;
    const ctx = c.getContext('2d')!;
    const src = frameCanvasRef.current;
    if (src) ctx.drawImage(src, 0, 0, frameDims.w, frameDims.h);
    else if (frameDataUrl) { ctx.fillStyle = '#0D1117'; ctx.fillRect(0, 0, frameDims.w, frameDims.h); }
    const x = (v: number) => (v / 100) * frameDims.w;
    const y = (v: number) => (v / 100) * frameDims.h;
    // Zonen
    (board.zones || []).forEach(z => {
      ctx.fillStyle = z.color || '#F59E0B';
      ctx.globalAlpha = 0.22;
      ctx.fillRect(x(z.x), y(z.y), x(z.w), y(z.h));
      ctx.globalAlpha = 1;
      ctx.strokeStyle = z.color || '#F59E0B';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 3;
      ctx.strokeRect(x(z.x), y(z.y), x(z.w), y(z.h));
      ctx.setLineDash([]);
      if (z.label) {
        ctx.fillStyle = z.color || '#F59E0B';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(z.label, x(z.x) + 5, y(z.y) + 18);
      }
    });
    // Ketten
    (board.chains || []).forEach(ch => {
      ctx.strokeStyle = ch.color || '#22D3EE';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x(ch.fromX), y(ch.fromY));
      ctx.lineTo(x(ch.toX), y(ch.toY));
      ctx.stroke();
    });
    // Ballweg
    (board.ballPath || []).forEach(bp => {
      if (bp.points.length < 2) return;
      ctx.strokeStyle = bp.color || '#F59E0B';
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      bp.points.forEach((p, i) => i === 0 ? ctx.moveTo(x(p.x), y(p.y)) : ctx.lineTo(x(p.x), y(p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
      bp.points.forEach((p, i) => {
        if (i === 0) return;
        ctx.beginPath();
        ctx.arc(x(p.x), y(p.y), 7, 0, Math.PI * 2);
        ctx.fillStyle = '#F59E0B';
        ctx.fill();
      });
    });
    // Passwege
    (board.passes || []).forEach(p2 => {
      drawArrow(ctx, x(p2.fromX), y(p2.fromY), x(p2.toX), y(p2.toY), p2.color || '#3B82F6');
    });
    // Laufwege
    (board.runs || []).forEach(r => {
      if (r.points.length < 2) return;
      ctx.strokeStyle = r.color || '#3B82F6';
      ctx.lineWidth = 4;
      ctx.setLineDash([9, 7]);
      ctx.beginPath();
      r.points.forEach((p, i) => i === 0 ? ctx.moveTo(x(p.x), y(p.y)) : ctx.lineTo(x(p.x), y(p.y)));
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // Optimale Positionen
    (board.optimalPositions || []).forEach(o => {
      const cx = x(o.toX), cy = y(o.toY);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(245,158,11,0.25)';
      ctx.fill();
      if (o.note) {
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(o.note, cx + 20, cy + 4);
      }
    });
    // Spieler
    (board.players || []).forEach(pl => {
      const cx = x(pl.x), cy = y(pl.y);
      const isHome = pl.team === 'FC Auggen';
      ctx.beginPath();
      ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fillStyle = isHome ? '#3B82F6' : '#EF4444';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pl.label, cx, cy);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    });
    return c.toDataURL('image/png');
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string) => {
    const ang = Math.atan2(by - ay, bx - ax);
    const len = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - len * Math.cos(ang - 0.45), by - len * Math.sin(ang - 0.45));
    ctx.lineTo(bx - len * Math.cos(ang + 0.45), by - len * Math.sin(ang + 0.45));
    ctx.closePath();
    ctx.fill();
  };

  const T: Array<{ id: typeof tool; icon: React.ReactNode; label: string }> = [
    { id: 'pointer', icon: <MousePointer2 size={13} />, label: 'Auswählen/Löschen' },
    { id: 'player', icon: <Users size={13} />, label: 'Spieler setzen' },
    { id: 'chain', icon: <Waypoints size={13} />, label: 'Linien/Kette' },
    { id: 'pass', icon: <MoveUpRight size={13} />, label: 'Passweg' },
    { id: 'run', icon: <Footprints size={13} />, label: 'Laufweg' },
    { id: 'zone', icon: <Square size={13} />, label: 'Raum/Zone' },
    { id: 'ball', icon: <Crosshair size={13} />, label: 'Ballweg' },
    { id: 'optimal', icon: <Target size={13} />, label: 'Optimale Position' },
  ];

  const colors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#22D3EE'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="bg-[#0D1117] border border-[#2A3447] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Target size={16} className="text-[#10B981] shrink-0" />
            <span className="text-sm font-black uppercase text-white tracking-wide truncate">🎯 Once-Tagger – Szenen & Taktik direkt ins Video</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-rose-950/60 text-[#94A3B8] hover:text-rose-300 border border-[#334155] cursor-pointer"><X size={14} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Schritt 1: Frame einfrieren */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={captureFrame}
              className="px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Camera size={14} /> Frame einfrieren ({formatTime(snapshotTime)})
            </button>
            {!frameDataUrl && <span className="text-[11px] text-[#94A3B8]">Video an die richtige Stelle pausieren, dann Frame übernehmen.</span>}
            {frameDataUrl && (
              <span className="text-[10px] text-[#64748B]">🖼 {frameDims.w}×{frameDims.h} px · Zeit <span className="text-white font-mono">{formatTime(snapshotTime)}</span></span>
            )}
          </div>

          {frameDataUrl ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap bg-[#131A26] border border-[#2A3447] rounded-xl p-2">
                {T.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setTool(t.id); if (t.id !== 'run' && t.id !== 'ball') setRunPoints([]); }}
                    title={t.label}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border cursor-pointer transition-all ${
                      tool === t.id ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50' : 'bg-[#0F172A] text-[#94A3B8] border-[#242F42] hover:text-white'
                    }`}
                  >
                    {t.icon}{t.label}
                  </button>
                ))}
                <div className="mx-1 h-6 w-px bg-[#2A3447]" />
                <button onClick={undo} disabled={!history.length} title="Rückgängig" className="px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-[#94A3B8] border border-[#242F42] hover:text-white cursor-pointer disabled:opacity-40"><Undo2 size={13} /></button>
                <button onClick={() => { pushHist(); setBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] }); setRunPoints([]); }} className="px-2.5 py-1.5 rounded-lg bg-[#0F172A] text-rose-400 border border-[#242F42] hover:bg-rose-950/60 cursor-pointer" title="Alles löschen"><Eraser size={13} /></button>
              </div>

              {/* Werkzeug-Optionen */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {(tool === 'player' || tool === 'optimal') && (
                  <>
                    <label className="text-[9px] font-black uppercase tracking-widest text-[#64748B]">Nummer/Kürzel</label>
                    <input value={playerLabel} onChange={(e) => setPlayerLabel(e.target.value)} className="w-16 px-2 py-1 bg-[#0F172A] border border-[#242F42] rounded-lg text-xs text-white focus:outline-none focus:border-[#10B981]" />
                  </>
                )}
                {tool === 'player' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setTeam('FC Auggen')} className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${team === 'FC Auggen' ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-[#0F172A] text-[#94A3B8] border-[#242F42]'}`}>FCA</button>
                    <button onClick={() => setTeam('Gegner')} className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer border ${team === 'Gegner' ? 'bg-rose-600 text-white border-rose-600' : 'bg-[#0F172A] text-[#94A3B8] border-[#242F42]'}`}>Gegner</button>
                  </div>
                )}
                {tool === 'zone' && <input value={zoneLabel} onChange={(e) => setZoneLabel(e.target.value)} placeholder="Zonen-Label" className="w-36 px-2 py-1 bg-[#0F172A] border border-[#242F42] rounded-lg text-xs text-white focus:outline-none focus:border-[#10B981]" />}
                {tool === 'optimal' && <input value={optimalNote} onChange={(e) => setOptimalNote(e.target.value)} placeholder="Begründung" className="w-56 px-2 py-1 bg-[#0F172A] border border-[#242F42] rounded-lg text-xs text-white focus:outline-none focus:border-[#10B981]" />}
                {(tool === 'chain' || tool === 'pass' || tool === 'run' || tool === 'zone') && (
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#64748B]">Farbe</span>
                    {colors.map(c => (
                      <button key={c} onClick={() => setStrokeColor(c)} className={`w-5 h-5 rounded-full border-2 cursor-pointer ${strokeColor === c ? 'border-white scale-110' : 'border-transparent opacity-70'}`} style={{ background: c }} />
                    ))}
                  </div>
                )}
                {(tool === 'run' || tool === 'ball') && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#64748B]">{runPoints.length} Punkt(e)</span>
                    <button onClick={finishPolyline} className="px-2.5 py-1 rounded-lg bg-[#10B981] text-black text-[10px] font-black uppercase cursor-pointer">Fertig</button>
                    <button onClick={() => setRunPoints([])} className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-[#94A3B8] text-[10px] font-bold border border-[#242F42] cursor-pointer">Abbrechen</button>
                  </div>
                )}
              </div>

              {/* Zeichenfläche */}
              <div className="relative bg-black rounded-xl overflow-hidden flex items-center justify-center max-h-[52vh]">
                <div className="relative inline-block max-h-[52vh]">
                  <img
                    ref={imgRef}
                    src={frameDataUrl}
                    draggable={false}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={() => { setDraftStart(null); setDraftEnd(null); }}
                    className="max-h-[52vh] max-w-full select-none"
                    style={{ cursor: tool === 'pointer' ? 'default' : 'crosshair', touchAction: 'none' }}
                  />
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox={`0 0 ${frameDims.w} ${frameDims.h}`}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <marker id="tagArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 z" fill="#3B82F6" />
                      </marker>
                    </defs>
                    {/* Ketten */}
                    {(board.chains || []).map((c, i) => (
                      <line key={`c${i}`} x1={c.fromX / 100 * frameDims.w} y1={c.fromY / 100 * frameDims.h} x2={c.toX / 100 * frameDims.w} y2={c.toY / 100 * frameDims.h} stroke={c.color || '#22D3EE'} strokeWidth="5" opacity="0.85" strokeLinecap="round" />
                    ))}
                    {/* Ballweg */}
                    {(board.ballPath || []).map((b, i) => b.points.length >= 2 ? (
                      <polyline key={`bp${i}`} points={b.points.map(p => `${p.x / 100 * frameDims.w},${p.y / 100 * frameDims.h}`).join(' ')} fill="none" stroke={b.color || '#F59E0B'} strokeWidth="4" strokeDasharray="9 7" opacity="0.95" strokeLinecap="round" />
                    ) : null)}
                    {/* Laufwege */}
                    {(board.runs || []).map((r, i) => r.points.length >= 2 ? (
                      <polyline key={`r${i}`} points={r.points.map(p => `${p.x / 100 * frameDims.w},${p.y / 100 * frameDims.h}`).join(' ')} fill="none" stroke={r.color || '#3B82F6'} strokeWidth="4" strokeDasharray="9 7" opacity="0.95" strokeLinecap="round" />
                    ) : null)}
                    {/* Pässe */}
                    {(board.passes || []).map((p, i) => (
                      <line key={`p${i}`} x1={p.fromX / 100 * frameDims.w} y1={p.fromY / 100 * frameDims.h} x2={p.toX / 100 * frameDims.w} y2={p.toY / 100 * frameDims.h} stroke={p.color || '#3B82F6'} strokeWidth="3.5" opacity="0.95" markerEnd="url(#tagArrow)" />
                    ))}
                    {/* Zonen */}
                    {(board.zones || []).map((z, i) => (
                      <g key={`z${i}`}>
                        <rect x={z.x / 100 * frameDims.w} y={z.y / 100 * frameDims.h} width={z.w / 100 * frameDims.w} height={z.h / 100 * frameDims.h} fill={z.color || '#F59E0B'} opacity="0.22" stroke={z.color || '#F59E0B'} strokeWidth="2" strokeDasharray="8 6" rx="4" />
                        {z.label ? <text x={z.x / 100 * frameDims.w + 6} y={z.y / 100 * frameDims.h + 14} fontSize="16" fontWeight="900" fill={z.color || '#F59E0B'}>{z.label}</text> : null}
                      </g>
                    ))}
                    {/* Optimale Positionen */}
                    {(board.optimalPositions || []).map((o, i) => (
                      <g key={`o${i}`}>
                        <circle cx={o.toX / 100 * frameDims.w} cy={o.toY / 100 * frameDims.h} r="17" fill="rgba(245,158,11,0.25)" stroke="#F59E0B" strokeWidth="2.5" />
                        <text x={o.toX / 100 * frameDims.w + 20} y={o.toY / 100 * frameDims.h + 5} fontSize="15" fontWeight="900" fill="#FBBF24">{o.note || 'Optimale Position'}</text>
                      </g>
                    ))}
                    {/* Spieler */}
                    {(board.players || []).map((pl, i) => (
                      <g key={`pl${i}`}>
                        <circle cx={pl.x / 100 * frameDims.w} cy={pl.y / 100 * frameDims.h} r="14" fill={pl.team === 'FC Auggen' ? '#3B82F6' : '#EF4444'} stroke="#FFFFFF" strokeWidth="2.5" />
                        <text x={pl.x / 100 * frameDims.w} y={pl.y / 100 * frameDims.h + 5} fontSize="14" fontWeight="900" fill="#FFFFFF" textAnchor="middle">{pl.label}</text>
                      </g>
                    ))}
                    {/* Live-Vorschau: laufende Linie */}
                    {draftStart && draftEnd && (tool === 'chain' || tool === 'pass' || tool === 'zone') && (
                      tool === 'zone'
                        ? <rect x={Math.min(draftStart.x, draftEnd.x)} y={Math.min(draftStart.y, draftEnd.y)} width={Math.abs(draftEnd.x - draftStart.x)} height={Math.abs(draftEnd.y - draftStart.y)} fill={strokeColor} opacity="0.2" stroke={strokeColor} strokeWidth="2" />
                        : <line x1={draftStart.x} y1={draftStart.y} x2={draftEnd.x} y2={draftEnd.y} stroke={strokeColor} strokeWidth="3" strokeDasharray="6 4" opacity="0.9" />
                    )}
                    {runPoints.length > 0 && (tool === 'run' || tool === 'ball') && (
                      <polyline points={runPoints.map(p => `${p.x / 100 * frameDims.w},${p.y / 100 * frameDims.h}`).join(' ')} fill="none" stroke={tool === 'ball' ? '#F59E0B' : strokeColor} strokeWidth="4" strokeDasharray="9 7" opacity="0.9" />
                    )}
                  </svg>
                </div>
              </div>

              <p className="text-[10px] text-[#64748B]">Tipp: Farbe = Bedeutung. Blau offensiv · Rot defensiv · Gelb Umschalten/optimal · Grün Struktur/gehalten · Cyan Kettenverbund. Mit ▶ Zeichnen starten, mit „Auswählen" Element anklicken zum Löschen.</p>

              {/* Speichern */}
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#64748B]">Stats</span>
                  <span className="text-[10px] text-[#94A3B8]">Spieler {board.players?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Kette {board.chains?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Pässe {board.passes?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Läufe {board.runs?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Zonen {board.zones?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Ballweg {board.ballPath?.length || 0}</span>
                  <span className="text-[10px] text-[#94A3B8]">Optimal {board.optimalPositions?.length || 0}</span>
                </div>
                <button
                  onClick={() => {
                    if (!frameDataUrl) return;
                    const thumb = composeAnnotatedImage();
                    onSave(thumb, board, snapshotTime);
                  }}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <Save size={14} /> Als Taktik-Szene speichern
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-[#64748B] text-xs border border-dashed border-[#2A3447] rounded-xl">
              Zuerst ▶ „Frame einfrieren" drücken – du zeichnest dann direkt auf dem Spielbild ({videoName || 'Spielvideo'}).
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// CoCoach-Tiefenanalyse-Anzeige (Maximum Information Extraction Engine)
const TacticalAnalysisPanel: React.FC<{ clip: TacticalVideoClip }> = ({ clip }) => {
  const {
    beforeSituation, trigger, passSequence, runPatterns, keyPlayers,
    spatialAnalysis, defensiveLines, opponentStructure, decision,
    mainLearningPoint, goalDetails, concededGoalDetails, relatedSceneIds, confidence,
  } = clip;

  const hasAny = beforeSituation || trigger || passSequence ||
    (runPatterns && runPatterns.length > 0) ||
    (keyPlayers && keyPlayers.length > 0) ||
    spatialAnalysis || defensiveLines || opponentStructure || decision ||
    mainLearningPoint || goalDetails || concededGoalDetails ||
    (relatedSceneIds && relatedSceneIds.length > 0) || confidence;
  if (!hasAny) return null;

  const Section: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#10B981]">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );

  const Chip: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'warn' }> = ({ children, tone = 'neutral' }) => (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
      tone === 'warn' ? 'bg-amber-950/60 text-amber-300 border-amber-500/40' : 'bg-[#0F172A] text-[#CBD5E1] border-[#2A3447]'
    }`}>
      {children}
    </span>
  );

  const Labeled: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="text-[11px] leading-relaxed">
      <span className="font-bold text-[#94A3B8]">{label}: </span>
      <span className="text-[#E2E8F0]">{value}</span>
    </div>
  );

  const spaceEntries = spatialAnalysis
    ? ([
        ['Zentrum', spatialAnalysis.center],
        ['Halbraum links', spatialAnalysis.leftHalfSpace],
        ['Halbraum rechts', spatialAnalysis.rightHalfSpace],
        ['Flügel links', spatialAnalysis.wingsLeft],
        ['Flügel rechts', spatialAnalysis.wingsRight],
        ['Zwischenlinienraum', spatialAnalysis.betweenLines],
        ['Raum hinter Abwehr', spatialAnalysis.behindDefense],
      ] as const).filter(([, v]) => v)
    : [];

  const confBadges: string[] = [];
  if (confidence?.overall) confBadges.push(`Konfidenz: ${confidence.overall}`);
  if (confidence?.estimated) confBadges.push('estimated');
  if (confidence?.lowConfidence) confBadges.push('low_confidence');

  return (
    <div className="space-y-3 rounded-xl bg-[#0D1320] border border-[#242F42] p-3">
      {/* Kette: VORHER → AUSLÖSER */}
      {(beforeSituation || trigger) && (
        <Section title="Szenen-Kette" icon={<ListOrdered size={12} />}>
          {beforeSituation && <Labeled label="VORHER" value={beforeSituation} />}
          {trigger && trigger !== 'unknown' && <Labeled label="AUSLÖSER" value={trigger} />}
        </Section>
      )}

      {passSequence && passSequence !== 'unknown' && (
        <Section title="Passfolge" icon={<Layers size={12} />}>
          <div className="text-[11px] leading-relaxed text-[#E2E8F0]">{passSequence}</div>
        </Section>
      )}

      {runPatterns && runPatterns.length > 0 && (
        <Section title="Laufwege" icon={<Target size={12} />}>
          <div className="flex flex-wrap gap-1.5">
            {runPatterns.map((r, i) => <Chip key={i}>{r}</Chip>)}
          </div>
        </Section>
      )}

      {keyPlayers && keyPlayers.length > 0 && (
        <Section title="Schlüsselspieler" icon={<Users size={12} />}>
          <div className="space-y-1">
            {keyPlayers.map((kp, i) => (
              <div key={i} className="text-[11px] leading-relaxed text-[#E2E8F0]">
                <span className="font-bold text-white">
                  {kp.team === 'Gegner' ? '🟥' : '🟩'} Nr. {kp.jerseyNumber || 'unknown'}{kp.name ? ` ${kp.name}` : ''}
                  {kp.positionZone ? ` (${kp.positionZone})` : ''}
                </span>
                {kp.startZone || kp.endZone ? `: ${kp.startZone || '?'} → ${kp.endZone || '?'}` : ''}
                {kp.movementDirection ? `, ${kp.movementDirection}` : ''}
                {kp.action ? <span className="text-[#10B981]"> — {kp.action}</span> : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      {spaceEntries.length > 0 && (
        <Section title="Raumanalyse" icon={<Layers size={12} />}>
          <div className="grid grid-cols-1 gap-1">
            {spaceEntries.map(([zone, v]) => <Labeled key={zone} label={zone} value={v} />)}
          </div>
        </Section>
      )}

      {defensiveLines && (Object.values(defensiveLines).some(v => !!v)) && (
        <Section title="Defensivlinien (Schätzwerte)" icon={<Shield size={12} />}>
          {defensiveLines.homeLineHeight && <Labeled label="Eigene Linie" value={defensiveLines.homeLineHeight} />}
          {defensiveLines.opponentLineHeight && <Labeled label="Gegner Linie" value={defensiveLines.opponentLineHeight} />}
          {defensiveLines.lineDistance && <Labeled label="Abstand der Linien" value={defensiveLines.lineDistance} />}
          {defensiveLines.compactness && <Labeled label="Kompaktheit" value={defensiveLines.compactness} />}
          {defensiveLines.shiftDirection && <Labeled label="Verschiebung" value={defensiveLines.shiftDirection} />}
        </Section>
      )}

      {opponentStructure && (Object.values(opponentStructure).some(v => !!v)) && (
        <Section title="Gegnerstruktur" icon={<Shield size={12} />}>
          {opponentStructure.formation && <Labeled label="Formation" value={opponentStructure.formation} />}
          {opponentStructure.pressingHeight && <Labeled label="Pressing-Höhe" value={opponentStructure.pressingHeight} />}
          {opponentStructure.pressingDirection && <Labeled label="Pressing-Richtung" value={opponentStructure.pressingDirection} />}
          {(opponentStructure.playersBehindBall != null) && <Labeled label="Hinter dem Ball" value={String(opponentStructure.playersBehindBall)} />}
          {(opponentStructure.playersAheadOfBall != null) && <Labeled label="Vor dem Ball" value={String(opponentStructure.playersAheadOfBall)} />}
          {opponentStructure.openPassLanes && <Labeled label="Offene Passwege" value={opponentStructure.openPassLanes} />}
          {opponentStructure.closedPassLanes && <Labeled label="Zugestellte Passwege" value={opponentStructure.closedPassLanes} />}
          {opponentStructure.freePlayers && <Labeled label="Freie Spieler" value={opponentStructure.freePlayers} />}
        </Section>
      )}

      {decision && (decision.availableOptions?.length || decision.bestOption || decision.reasoning) && (
        <Section title="Entscheidung" icon={<Target size={12} />}>
          {decision.availableOptions && decision.availableOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {decision.availableOptions.map((o, i) => <Chip key={i}>Option {i + 1}: {o}</Chip>)}
            </div>
          )}
          {decision.bestOption && <Labeled label="Beste Option" value={<span className="text-[#10B981]">{decision.bestOption}</span>} />}
          {decision.reasoning && <Labeled label="Begründung" value={decision.reasoning} />}
        </Section>
      )}

      {goalDetails && <Section title="Entstehungsweg Tor (Goldene Regel)" icon={<CheckCircle2 size={12} />}><div className="text-[11px] leading-relaxed text-[#E2E8F0]">{goalDetails}</div></Section>}
      {concededGoalDetails && <Section title="Gegentor – Was hätte FC Auggen verhindern können?" icon={<AlertTriangle size={12} />}><div className="text-[11px] leading-relaxed text-rose-200">{concededGoalDetails}</div></Section>}

      {mainLearningPoint && mainLearningPoint !== 'unknown' && (
        <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30">
          <div className="text-[10px] font-black uppercase tracking-wider text-[#10B981] mb-0.5">Hauptlernpunkt</div>
          <div className="text-[11px] leading-relaxed text-[#F1F5F9]">{mainLearningPoint}</div>
        </div>
      )}

      {relatedSceneIds && relatedSceneIds.length > 0 && (
        <Section title="Verknüpfte Szenen" icon={<Layers size={12} />}>
          <div className="flex flex-wrap gap-1.5">
            {relatedSceneIds.map((rid) => <Chip key={rid} tone="neutral">{rid}</Chip>)}
          </div>
        </Section>
      )}

      {confBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#242F42]">
          {confBadges.map(b => <Chip key={b} tone="warn">{b}</Chip>)}
          {confidence?.markers && confidence.markers.map((m, i) => <Chip key={i} tone="warn">{m}</Chip>)}
        </div>
      )}
    </div>
  );
};

interface VideoAnalysisViewProps {
  players?: (Spieler | Player)[];
  clubName?: string;
  clubShortName?: string;
}

// Format seconds into MM:SS or MM:SS.s
const formatTime = (seconds: number, includeDecimals = false): string => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (includeDecimals) {
    const ds = Math.floor((seconds % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ds}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// Parse MM:SS or seconds string back into float
const parseTimeInput = (str: string): number => {
  if (!str) return 0;
  if (str.includes(':')) {
    const parts = str.split(':');
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    return Math.max(0, min * 60 + sec);
  }
  return Math.max(0, parseFloat(str) || 0);
};

export const VideoAnalysisView: React.FC<VideoAnalysisViewProps> = ({ players = [], clubName = 'FC Auggen', clubShortName = 'FCA' }) => {
  // Nur echte Feldspieler des aktuellen Kaders (kein Staff/Trainer/Ärzte/Physios)
  // werden an die KI übergeben, damit sie nur aktuelle Spieler benannte.
  const squadPlayers = useMemo(() => players
    .filter(p => {
      const cat = String((p as any).category || 'player').toLowerCase();
      return cat === 'player' || cat === 'spieler';
    })
    .map(p => ({
      id: p.id,
      lastName: ('lastName' in p) ? p.lastName : (p as any).name || '',
      firstName: ('firstName' in p) ? (p as any).firstName || '' : '',
      position: ('position' in p) ? (p as any).position || '' : '',
      number: ('number' in p) ? (p as any).number : ('nummer' in p) ? (p as any).nummer : '',
    })), [players]);
  // Sync clips with Firestore collection
  const { 
    data: savedClips, 
    loading: clipsLoading, 
    addOrUpdateItem: saveClip, 
    removeItem: deleteClip 
  } = useCollectionSync<TacticalVideoClip>('tactical_video_clips', 'id', 'createdAt', 'desc', true);

  // Sync category trainer notes
  const { 
    data: rawCategoryNotes, 
    addOrUpdateItem: saveCategoryNote 
  } = useCollectionSync<CategoryTrainerNote>('video_category_notes', 'id');

  const categoryNotes = (rawCategoryNotes || []).reduce((acc, item) => {
    acc[item.id || item.category] = item;
    return acc;
  }, {} as Record<string, CategoryTrainerNote>);

  // Perspective: Team-Analyse vs Gegner-Analyse
  const [analysisType, setAnalysisType] = useState<'team' | 'opponent'>('team');

  // Video Reel Player State (for continuous playback of a category or the whole match)
  const [reelState, setReelState] = useState<{
    isOpen: boolean;
    mode: 'category' | 'master';
    title: string;
    clips: TacticalVideoClip[];
  } | null>(null);

  // Video cutter state
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  // Original hochgeladene Video-Datei (Blob/File), für echtes ffmpeg-Schneiden
  const videoFileRef = useRef<Blob | File | null>(null);
  // Schnitt-Ausführungsstatus
  const [isCutting, setIsCutting] = useState<boolean>(false);
  const [cutError, setCutError] = useState<string>('');
  
  // Veo / external URL state
  const [veoInputUrl, setVeoInputUrl] = useState<string>('');
  const [isVeoLink, setIsVeoLink] = useState<boolean>(false);
  const [veoEmbedUrl, setVeoEmbedUrl] = useState<string | null>(null);
  const [veoOriginalUrl, setVeoOriginalUrl] = useState<string>('');
  const [veoIframeBlocked, setVeoIframeBlocked] = useState<boolean>(false);
  const veoIframeRef = useRef<HTMLIFrameElement | null>(null);
  const veoDownloadObjectUrlRef = useRef<string | null>(null);

  // Download progress state
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatus, setDownloadStatus] = useState<'' | 'downloading' | 'success' | 'error'>('');
  const [downloadError, setDownloadError] = useState<string>('');
  
  // Cut bounds & active category selection
  const [cutStart, setCutStart] = useState<number>(0);
  const [cutEnd, setCutEnd] = useState<number>(10);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory>('Spielaufbau');
  // In der Schnitt-UI gewählte Sub-Tags (werden in die taktische Notiz übernommen)
  const [selectedSubTags, setSelectedSubTags] = useState<string[]>([]);
  const [assignedPlayerId, setAssignedPlayerId] = useState<string>('');
  const [clipNoteDraft, setClipNoteDraft] = useState<string>('');
  const [clipColorDraft, setClipColorDraft] = useState<'green' | 'red' | 'none'>('none');
  const [isPreviewingCut, setIsPreviewingCut] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [highlightedClipId, setHighlightedClipId] = useState<string | null>(null);
  const [expandedTacticClipId, setExpandedTacticClipId] = useState<string | null>(null);
  const [taggerOpen, setTaggerOpen] = useState<boolean>(false);
  const [tagTargetClipId, setTagTargetClipId] = useState<string | null>(null);
  // Live-Once-Tagger (direkt auf dem Video zeichnen)
  const tagContainerRef = useRef<HTMLDivElement | null>(null);
  const [tagTool, setTagTool] = useState<'pointer' | 'player' | 'chain' | 'pass' | 'run' | 'zone' | 'ball' | 'optimal'>('pointer');
  // Live-Zeichnen AM LAUFENDEN VIDEO: AUS = Frame einfrieren beim Zeichnen (Standard),
  // AN = Video läuft weiter, Zeichnungen (Spieler/Linien/Ketten/Räume) bleiben sichtbar.
  const [tagKeepPlaying, setTagKeepPlaying] = useState<boolean>(false);
  const [tagTeam, setTagTeam] = useState<'FC Auggen' | 'Gegner'>('FC Auggen');
  const [tagLabel, setTagLabel] = useState<string>('#9');
  const [tagColor, setTagColor] = useState<string>('#3B82F6');
  const [tagZoneLabel, setTagZoneLabel] = useState<string>('Freier Raum');
  const [tagOptNote, setTagOptNote] = useState<string>('Besser stehen – Raum sichern');
  const [tagBoard, setTagBoard] = useState<SceneTacticBoard>({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] });
  const [tagHistory, setTagHistory] = useState<SceneTacticBoard[]>([]);
  const [tagDragStart, setTagDragStart] = useState<{ x: number; y: number } | null>(null);
  const [tagDragEnd, setTagDragEnd] = useState<{ x: number; y: number } | null>(null);
  const [tagRunPts, setTagRunPts] = useState<Array<{ x: number; y: number }>>([]);

  const tagPos = (e: React.PointerEvent): { x: number; y: number } | null => {
    const el = tagContainerRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  };
  const tagPush = () => setTagHistory(prev => [...prev.slice(-30), tagBoard]);
  // Live-Zeichnen umschalten: ein = Video läuft weiter, aus = beim Zeichnen einfrieren.
  const toggleTagKeepPlaying = () => {
    const v = mainVideoRef.current;
    if (!v) return;
    setTagKeepPlaying(prev => {
      const next = !prev;
      if (next) { setIsPlaying(true); void v.play().catch(() => {}); }
      else if (!v.paused) { setIsPlaying(false); v.pause(); }
      return next;
    });
  };
  const tagGuard = (b: SceneTacticBoard): SceneTacticBoard => ({
    ...b,
    players: b.players ? [...b.players] : [],
    chains: b.chains ? [...b.chains] : [],
    passes: b.passes ? [...b.passes] : [],
    runs: b.runs ? [...b.runs] : [],
    ballPath: b.ballPath ? [...b.ballPath] : [],
    zones: b.zones ? [...b.zones] : [],
    optimalPositions: b.optimalPositions ? [...b.optimalPositions] : [],
  });
  const tagDown = (e: React.PointerEvent) => {
    const p = tagPos(e);
    if (!p) return;
    if (tagTool === 'pointer') { tagRemoveNearest(p); return; }
    // Nur einfrieren, wenn der Live-Modus AUS ist – sonst läuft das Video beim Zeichnen weiter.
    if (!tagKeepPlaying && mainVideoRef.current && !mainVideoRef.current.paused) { mainVideoRef.current.pause(); setIsPlaying(false); }
    if (tagTool === 'player' || tagTool === 'optimal') {
      tagPush();
      setTagBoard(prev => {
        const next = tagGuard(prev);
        if (tagTool === 'player') next.players!.push({ label: tagLabel, team: tagTeam, x: p.x, y: p.y });
        if (tagTool === 'optimal') next.optimalPositions!.push({ label: tagLabel, toX: p.x, toY: p.y, note: tagOptNote });
        return next;
      });
      return;
    }
    if (tagTool === 'run' || tagTool === 'ball') { setTagRunPts(prev => [...prev, p]); return; }
    setTagDragStart(p);
    setTagDragEnd(p);
  };
  const tagMove = (e: React.PointerEvent) => {
    if (!tagDragStart) return;
    const p = tagPos(e);
    if (p) setTagDragEnd(p);
  };
  const tagUp = () => {
    if (tagDragStart && tagDragEnd) {
      tagPush();
      setTagBoard(prev => {
        const next = tagGuard(prev);
        if (tagTool === 'chain') next.chains!.push({ fromX: tagDragStart.x, fromY: tagDragStart.y, toX: tagDragEnd.x, toY: tagDragEnd.y, color: tagColor });
        if (tagTool === 'pass') next.passes!.push({ fromX: tagDragStart.x, fromY: tagDragStart.y, toX: tagDragEnd.x, toY: tagDragEnd.y, action: 'Pass', color: tagColor });
        if (tagTool === 'zone') next.zones!.push({ x: Math.min(tagDragStart.x, tagDragEnd.x), y: Math.min(tagDragStart.y, tagDragEnd.y), w: Math.abs(tagDragEnd.x - tagDragStart.x), h: Math.abs(tagDragEnd.y - tagDragStart.y), label: tagZoneLabel, color: tagColor });
        return next;
      });
    }
    setTagDragStart(null);
    setTagDragEnd(null);
  };
  const tagFinishLine = () => {
    if (tagRunPts.length >= 2) {
      tagPush();
      setTagBoard(prev => {
        const next = tagGuard(prev);
        if (tagTool === 'ball') next.ballPath!.push({ points: [...tagRunPts], color: '#F59E0B' });
        else next.runs!.push({ label: 'Laufweg', points: [...tagRunPts], color: tagColor });
        return next;
      });
    }
    setTagRunPts([]);
  };
  const tagUndo = () => setTagHistory(prev => {
    if (!prev.length) return prev;
    setTagBoard(prev[prev.length - 1]);
    return prev.slice(0, -1);
  });
  const tagClear = () => { tagPush(); setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] }); setTagRunPts([]); };
  const tagRemoveNearest = (p: { x: number; y: number }) => {
    const dist = (a: { x: number; y: number }) => Math.hypot(a.x - p.x, a.y - p.y);
    const elemDist = (pts: Array<{ x: number; y: number }>) => Math.min(...pts.map(dist));
    const tol = 8;
    tagPush();
    setTagBoard(prev => {
      const next = tagGuard(prev);
      const candidate: Array<{ d: number; remove: () => void }> = [];
      next.players!.forEach((pl, i) => candidate.push({ d: dist({ x: pl.x, y: pl.y }), remove: () => next.players!.splice(i, 1) }));
      next.optimalPositions!.forEach((o, i) => candidate.push({ d: dist({ x: o.toX, y: o.toY }), remove: () => next.optimalPositions!.splice(i, 1) }));
      next.zones!.forEach((z, i) => candidate.push({ d: Math.min(Math.abs(p.x - z.x), Math.abs(p.x - (z.x + z.w))) + Math.min(Math.abs(p.y - z.y), Math.abs(p.y - (z.y + z.h))), remove: () => next.zones!.splice(i, 1) }));
      next.runs!.forEach((r, i) => candidate.push({ d: r.points.length ? elemDist(r.points) : 999, remove: () => next.runs!.splice(i, 1) }));
      next.ballPath!.forEach((b, i) => candidate.push({ d: b.points.length ? elemDist(b.points) : 999, remove: () => next.ballPath!.splice(i, 1) }));
      next.chains!.forEach((c, i) => candidate.push({ d: elemDist([{ x: c.fromX, y: c.fromY }, { x: c.toX, y: c.toY }]), remove: () => next.chains!.splice(i, 1) }));
      next.passes!.forEach((p2, i) => candidate.push({ d: elemDist([{ x: p2.fromX, y: p2.fromY }, { x: p2.toX, y: p2.toY }]), remove: () => next.passes!.splice(i, 1) }));
      candidate.sort((a, b) => a.d - b.d);
      const best = candidate[0];
      if (best && best.d < tol) best.remove();
      return next;
    });
  };
  const tagArrow = (ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string) => {
    const ang = Math.atan2(by - ay, bx - ax);
    const len = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - len * Math.cos(ang - 0.45), by - len * Math.sin(ang - 0.45));
    ctx.lineTo(bx - len * Math.cos(ang + 0.45), by - len * Math.sin(ang + 0.45));
    ctx.closePath(); ctx.fill();
  };
  const tagCompose = (): string => {
    const W = 1280, H = 720;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    const v = mainVideoRef.current;
    try { if (v && v.readyState >= 2) ctx.drawImage(v, 0, 0, W, H); else { ctx.fillStyle = '#0D1117'; ctx.fillRect(0, 0, W, H); } } catch { ctx.fillStyle = '#0D1117'; ctx.fillRect(0, 0, W, H); }
    const X = (pct: number) => (Math.max(0, Math.min(100, pct)) / 100) * W;
    const Y = (pct: number) => (Math.max(0, Math.min(100, pct)) / 100) * H;
    (tagBoard.zones || []).forEach(z => {
      ctx.fillStyle = z.color || '#F59E0B'; ctx.globalAlpha = 0.22;
      ctx.fillRect(X(z.x), Y(z.y), X(z.w), Y(z.h)); ctx.globalAlpha = 1;
      ctx.strokeStyle = z.color || '#F59E0B'; ctx.setLineDash([8, 6]); ctx.lineWidth = 3;
      ctx.strokeRect(X(z.x), Y(z.y), X(z.w), Y(z.h)); ctx.setLineDash([]);
      if (z.label) { ctx.fillStyle = z.color || '#F59E0B'; ctx.font = 'bold 16px Arial'; ctx.fillText(z.label, X(z.x) + 5, Y(z.y) + 18); }
    });
    (tagBoard.chains || []).forEach(ch => {
      ctx.strokeStyle = ch.color || '#22D3EE'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(X(ch.fromX), Y(ch.fromY)); ctx.lineTo(X(ch.toX), Y(ch.toY)); ctx.stroke();
    });
    (tagBoard.ballPath || []).forEach(bp => {
      if (bp.points.length < 2) return;
      ctx.strokeStyle = bp.color || '#F59E0B'; ctx.lineWidth = 4; ctx.setLineDash([9, 7]);
      ctx.beginPath(); bp.points.forEach((p, i) => i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))); ctx.stroke(); ctx.setLineDash([]);
      bp.points.forEach((p, i) => { if (i === 0) return; ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 7, 0, Math.PI * 2); ctx.fillStyle = '#F59E0B'; ctx.fill(); });
    });
    (tagBoard.passes || []).forEach(p2 => tagArrow(ctx, X(p2.fromX), Y(p2.fromY), X(p2.toX), Y(p2.toY), p2.color || '#3B82F6'));
    (tagBoard.runs || []).forEach(r => {
      if (r.points.length < 2) return;
      ctx.strokeStyle = r.color || '#3B82F6'; ctx.lineWidth = 4; ctx.setLineDash([9, 7]);
      ctx.beginPath(); r.points.forEach((p, i) => i === 0 ? ctx.moveTo(X(p.x), Y(p.y)) : ctx.lineTo(X(p.x), Y(p.y))); ctx.stroke(); ctx.setLineDash([]);
    });
    (tagBoard.optimalPositions || []).forEach(o => {
      const cx = X(o.toX), cy = Y(o.toY);
      ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(245,158,11,0.25)'; ctx.fill();
      if (o.note) { ctx.fillStyle = '#FBBF24'; ctx.font = 'bold 16px Arial'; ctx.fillText(o.note, cx + 20, cy + 4); }
    });
    (tagBoard.players || []).forEach(pl => {
      const cx = X(pl.x), cy = Y(pl.y);
      const isHome = pl.team === 'FC Auggen';
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx.fillStyle = isHome ? '#3B82F6' : '#EF4444'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#FFFFFF'; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pl.label, cx, cy);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    return c.toDataURL('image/png');
  };

  // Annotiertes Taktik-Bild (Once-Zeichnungen) als PNG herunterladen
  const tagDownloadImage = () => {
    const dataUrl = tagCompose();
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `cocoach_taktik_${formatTime(currentTime, true).replace(/[^0-9]/g, '_')}_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 100);
    setSaveSuccessMsg('Annotiertes Taktik-Bild als PNG gespeichert.');
  };

  // Category accordion open/closed states (default all open)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Tore': true,
    'Gegentore': true,
    'Spielaufbau': true,
    'Pressing MIT Ball': true,
    'Pressing GEGEN den Ball': true,
    'Standards': true,
    'Ballverlust': true
  });

  // Help text toggle per category + player filter
  const [showHelpCategory, setShowHelpCategory] = useState<string | null>(null);
  const [playerFilterSearch, setPlayerFilterSearch] = useState<string>('');

  // Active clip preview modal
  const [activePlaybackClip, setActivePlaybackClip] = useState<TacticalVideoClip | null>(null);
  // ⚡ Ultra-Overlay: KI-Tracking-Overlays je Szene (laufen mit dem Video mit)
  const [ultraLoadingId, setUltraLoadingId] = useState<string | null>(null);
  const [ultraShowForClip, setUltraShowForClip] = useState<string | null>(null);
  const [ultraMsg, setUltraMsg] = useState<{ id: string; text: string } | null>(null);
  const [ultraError, setUltraError] = useState<{ id: string; text: string } | null>(null);

  // Presentation Mode state
  const [showPresentationModal, setShowPresentationModal] = useState<boolean>(false);
  const [presentationSlideIndex, setPresentationSlideIndex] = useState<number>(0);

  // AI Video Analysis state
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<boolean>(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [showAiResults, setShowAiResults] = useState<boolean>(false);
  const [trainingPlanLoading, setTrainingPlanLoading] = useState<boolean>(false);
  const [trainingPlan, setTrainingPlan] = useState<any>(null);
  const [showTrainingPlan, setShowTrainingPlan] = useState<boolean>(false);

  // Hudl Sportscode / Coach Paint interaktive Overlays
  const [activePaintTools, setActivePaintTools] = useState<string[]>(['Passweg', 'Laufweg', 'Sprint-Pfeil']);
  const [gpsOverlays, setGpsOverlays] = useState<Record<string, boolean>>({
    'GPS-In Pocket-Overlay': false,
    'Herzfrequenz-Balken': false,
    'Belastungs-Warnung': false,
  });

  const togglePaintTool = (label: string) => {
    setActivePaintTools(prev => prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]);
  };
  const toggleGpsOverlay = (label: string) => {
    setGpsOverlays(prev => ({ ...prev, [label]: !prev[label] }));
  };
  const openFirstClipMatching = (predicate: (c: TacticalVideoClip) => boolean) => {
    const match = savedClips.find(predicate);
    if (match) setActivePlaybackClip(match);
  };

  // Extract frames from video for AI analysis
  const extractFrames = async (videoEl: HTMLVideoElement, frameCount: number = 5): Promise<string[]> => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frames;

    const originalTime = videoEl.currentTime;
    const wasPlaying = !videoEl.paused;
    videoEl.pause();

    const duration = videoEl.duration;
    const interval = duration / (frameCount + 1);

    for (let i = 1; i <= frameCount; i++) {
      const seekTime = interval * i;
      videoEl.currentTime = seekTime;
      await new Promise(resolve => {
        const onSeeked = () => {
          videoEl.removeEventListener('seeked', onSeeked);
          resolve(undefined);
        };
        videoEl.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.7));
    }

    videoEl.currentTime = originalTime;
    if (wasPlaying) videoEl.play();
    return frames;
  };

  // Veo-ähnliche Auto-Analyse: gleichmäßig über das ganze Video verteilte Frames
  // mit sichtbarer Zeit-Einblendung, damit die KI Zeiten bestimmen kann.
  const extractTimedFrames = async (videoEl: HTMLVideoElement, frameCount: number = 24): Promise<string[]> => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 848;
    canvas.height = 477;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frames;

    const originalTime = videoEl.currentTime;
    const wasPlaying = !videoEl.paused;
    videoEl.pause();

    const duration = videoEl.duration || 0;
    if (!duration || !isFinite(duration) || duration <= 0) {
      videoEl.currentTime = originalTime;
      if (wasPlaying) videoEl.play();
      return frames;
    }

    const count = Math.max(6, Math.min(frameCount, 30));
    const interval = duration / (count + 1);

    for (let i = 1; i <= count; i++) {
      const seekTime = interval * i;
      videoEl.currentTime = seekTime;
      await new Promise(resolve => {
        const onSeeked = () => {
          videoEl.removeEventListener('seeked', onSeeked);
          resolve(undefined);
        };
        videoEl.addEventListener('seeked', onSeeked);
      });

      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(0, canvas.height - 44, 150, 32);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textBaseline = 'middle';
      const m = Math.floor(seekTime / 60);
      const s = Math.floor(seekTime % 60);
      const timeLabel = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      ctx.fillText(timeLabel, 14, canvas.height - 28);

      frames.push(canvas.toDataURL('image/jpeg', 0.55));
    }

    videoEl.currentTime = originalTime;
    if (wasPlaying) videoEl.play();
    return frames;
  };

  // Start AI Video Analysis
  const handleStartAIAnalysis = async () => {
    const videoEl = mainVideoRef.current;

    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    setAiAnalysisResult(null);
    setShowAiResults(false);

    try {
      let frames: string[] = [];

      if (!isVeoLink && videoEl && videoSource) {
        // 12 Frames gleichmäßig über das Video verteilt -> präzisere Zonenn- & Szenen-Erkennung
        frames = await extractFrames(videoEl, 12);
      }

      const res = await apiFetch('/api/video-analysis/process', {
        method: 'POST',
        body: JSON.stringify({
          videoTitle: isVeoLink ? `Veo Match - ${videoFileName}` : (videoFileName || 'Spielvideo'),
          videoUrl: veoEmbedUrl || videoSource,
          squadPlayers,
          sampleFrames: frames,
          clubName,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      applyAiResult(result);
    } catch (err: any) {
      setAiAnalysisError(err.message || 'KI-Analyse fehlgeschlagen.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Remaps the AI result object into saved tactical clips and shows the result panel.
  const applyAiResult = (result: any) => {
    setAiAnalysisResult(result);
    setShowAiResults(true);

    if (result.sceneClips) {
      const aiClips = result.sceneClips.map((clip: any, idx: number) => {
        const categoryMap: Record<string, VideoCategory> = {
          'TORE': 'Tore',
          'GEGENTOR': 'Gegentore',
          'CHANCEN': 'Tore',
          'STANDARDS': 'Standards',
          'PRESSING': 'Pressing MIT Ball',
          'AUFBAU': 'Spielaufbau',
          'UMSCHALTMOMENTE': 'Ballverlust',
          'BALLBESITZ': 'Spielaufbau',
          'BALLGEWINN': 'Pressing GEGEN den Ball',
          'KONTER': 'Ballverlust',
          'ABSCHLUSS': 'Tore',
          'ÜBERLADUNG': 'Spielaufbau',
          'DRUCKPHASE': 'Pressing MIT Ball',
          'BALLVERLUST': 'Ballverlust',
          'DURCHBRUCH': 'Spielaufbau',
          'FEHLERANALYSE': 'Gegentore',
        };
        const primaryCat: VideoCategory = clip.categories && clip.categories.length > 0
          ? (categoryMap[clip.categories[0]] || 'Spielaufbau')
          : (categoryMap[clip.category] || 'Spielaufbau');
        const newId = `ai_clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`;
        const newClip: TacticalVideoClip = {
          id: newId,
          aiSceneId: clip.id,
          category: primaryCat,
          categories: Array.isArray(clip.categories) && clip.categories.length > 0
            ? clip.categories.map((c: string) => categoryMap[c] || c)
            : [primaryCat],
          videoUrl: videoSource ?? '',
          videoName: videoFileName,
          startTime: clip.startTimeSeconds || 0,
          endTime: clip.endTimeSeconds || 10,
          duration: (clip.endTimeSeconds || 10) - (clip.startTimeSeconds || 0),
          tacticalNote: `${clip.aiCommentary || ''}${clip.patternVariant ? `\n\nMuster/Variante: ${clip.patternVariant}` : ''}${clip.startEvent ? `\nStart: ${clip.startEvent}` : ''}${clip.endEvent ? `\nEnde: ${clip.endEvent}` : ''}${Array.isArray(clip.tacticalFeatures) && clip.tacticalFeatures.length ? `\nTaktische Merkmale: ${clip.tacticalFeatures.join(', ')}` : ''}${Array.isArray(clip.errorAnalysis) && clip.errorAnalysis.length ? `\nFehleranalyse: ${clip.errorAnalysis.join(', ')}` : ''}\n\nBewertung: ${clip.tacticalRating || ''}\n\nVerbesserung: ${clip.improvementSuggestions || ''}`,
          colorMarking: (clip.tacticalRating || '').includes('9') ? 'green' : (clip.improvementSuggestions ? 'red' : 'none'),
          createdAt: new Date().toISOString(),
          title: clip.title || `${clip.category} - ${clip.subcategory}`,
          beforeSituation: clip.beforeSituation,
          trigger: clip.trigger,
          passSequence: clip.passSequence,
          runPatterns: Array.isArray(clip.runPatterns) ? clip.runPatterns : undefined,
          keyPlayers: Array.isArray(clip.keyPlayers) ? clip.keyPlayers : undefined,
          spatialAnalysis: clip.spatialAnalysis,
          defensiveLines: clip.defensiveLines,
          opponentStructure: clip.opponentStructure,
          decision: clip.decision,
          mainLearningPoint: clip.mainLearningPoint,
          goalDetails: clip.goalDetails,
          concededGoalDetails: clip.concededGoalDetails,
          relatedSceneIds: Array.isArray(clip.relatedSceneIds) ? clip.relatedSceneIds : undefined,
          confidence: clip.confidence,
          qualityCheck: Array.isArray(clip.qualityCheck) ? clip.qualityCheck : undefined,
          tacticBoard: clip.tacticBoard,
        };
        return newClip;
      });
      const idByAiId: Record<string, string> = {};
      aiClips.forEach(c => { if (c.aiSceneId) idByAiId[c.aiSceneId] = c.id; });
      aiClips.forEach(c => {
        if (c.relatedSceneIds && c.relatedSceneIds.length > 0) {
          c.relatedSceneIds = c.relatedSceneIds.map(rid => idByAiId[rid] || rid);
        }
        saveClip(c);
      });
    }
  };

  // Veo-ähnliche Auto-Analyse: gesamtes Video wird gleichmäßig abgetastet
  const handleAutoSceneScan = async () => {
    const videoEl = mainVideoRef.current;

    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    setAiAnalysisResult(null);
    setShowAiResults(false);

    try {
      if (!videoEl || !videoSource || isVeoLink) {
        throw new Error('Bitte zuerst ein eigenes Video laden (Veo-Link nicht unterstützt).');
      }

      const frames = await extractTimedFrames(videoEl, 24);

      const res = await apiFetch('/api/video-analysis/process', {
        method: 'POST',
        body: JSON.stringify({
          videoTitle: videoFileName || 'Spielvideo',
          videoUrl: videoSource,
          squadPlayers,
          sampleFrames: frames,
          clubName,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const result = await res.json();
      applyAiResult(result);
    } catch (err: any) {
      setAiAnalysisError(err.message || 'Auto-Erkennung fehlgeschlagen.');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // Generate Training Plan from AI Analysis
  const handleGenerateTrainingPlan = async () => {
    if (!aiAnalysisResult) return;
    setTrainingPlanLoading(true);
    try {
      const res = await apiFetch('/api/video-analysis/training-plan', {
        method: 'POST',
        body: JSON.stringify({
          analysisResult: aiAnalysisResult,
          clubName,
          squadPlayers,
          weekDayCount: 5,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.plan) {
        setTrainingPlan(result.plan);
        setShowTrainingPlan(true);
      }
    } catch (err: any) {
      console.error('Trainingsplan-Generierung fehlgeschlagen:', err);
    } finally {
      setTrainingPlanLoading(false);
    }
  };

  // Refs for video players and canvas thumbnail extraction
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const clipVideoRef = useRef<HTMLVideoElement | null>(null);
  const autoAnalyseQueuedRef = useRef(false);

  // Handle video loaded metadata
  const handleLoadedMetadata = () => {
    if (mainVideoRef.current) {
      const dur = mainVideoRef.current.duration || 0;
      setVideoDuration(dur);
      setCutStart(0);
      setCutEnd(Math.min(dur, 15));
      setCurrentTime(0);
      // Auto-Start AI analysis once per uploaded file (not Veo)
      if (autoAnalyseQueuedRef.current && videoSource && !isVeoLink) {
        autoAnalyseQueuedRef.current = false;
        void handleStartAIAnalysis();
      }
    }
  };

  // Video time update listener
  const handleTimeUpdate = () => {
    if (mainVideoRef.current) {
      const cur = mainVideoRef.current.currentTime;
      setCurrentTime(cur);

      // Loop or stop if in preview mode
      if (isPreviewingCut) {
        if (cur >= cutEnd) {
          mainVideoRef.current.currentTime = cutStart;
          mainVideoRef.current.play();
        }
      }
    }
  };

  // Upload file handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objUrl = URL.createObjectURL(file);
      setVideoSource(objUrl);
      setVideoFileName(file.name);
      // Datei für echtes ffmpeg-Schneiden merken
      videoFileRef.current = file;
      setCutError('');
      setIsPlaying(false);
      setIsPreviewingCut(false);
      setSaveSuccessMsg(null);
      setIsVeoLink(false);
      setVeoEmbedUrl(null);
      autoAnalyseQueuedRef.current = true;
    }
  };

  // Sample match video loader for quick testing
  const handleLoadSampleVideo = () => {
    // High performance sample sports/soccer video link
    const sampleUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    setVideoSource(sampleUrl);
    setVideoFileName('FC_Auggen_Spielanalyse_Matchday.mp4');
    // Test-Video kommt von einer remote-URL -> kein lokaler File-Schnitt möglich
    videoFileRef.current = null;
    setCutError('Beispielvideo: echtes Schneiden nur nach lokalem Upload möglich.');
    setIsPlaying(false);
    setIsPreviewingCut(false);
    setSaveSuccessMsg(null);
  };

  // Veo / external video URL handler
  const handleLoadVeoUrl = async () => {
    const url = veoInputUrl.trim();
    if (!url) return;

    // Detect Veo links
    const isVeo = /veo\.co|app\.veo\.co|veoplayer\.com/i.test(url);

    // Non-Veo URL: try to download the video file in the background.
    // For Veo links we ALSO attempt a direct download first (publicly shared
    // Veo matches expose the raw video stream). Only if that fails do we show
    // the "login-geschützt / muss öffentlich frei gegeben sein" message.
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    setIsDownloading(true);
    setDownloadError('');
    setIsVeoLink(false);
    setVeoEmbedUrl(null);

    const fileName = url.split('/').pop()?.split('?')[0] || (isVeo ? 'Veo Match' : 'Video URL');

    // Build a list of candidate URLs to try, from most specific to fallback.
    const candidates: string[] = [url];
    if (isVeo) {
      // Veo exposes match metadata (including the public reel MP4) at app.veo.co,
      // but that host sends no CORS headers. Resolve it through our server-side
      // proxy first, then stream the reel MP4 from c.veocdn.com (ACAO: *).
      try {
        const res = await apiFetch('/api/veo-resolve', {
          method: 'POST',
          body: JSON.stringify({ url }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.url) {
            candidates.length = 0;
            candidates.push(data.url);
          } else {
            setDownloadError(data?.error || 'Veo-Match konnte nicht aufgelöst werden.');
          }
        }
      } catch {
        // Proxy not reachable – fall through to the classic candidates below.
      }
      const matchPatterns = [
        /(?:app\.)?veo\.co\/(?:matches?|m|embed)\/([a-zA-Z0-9_-]+)/i,
        /veoplayer\.com\/match\/([a-zA-Z0-9_-]+)/i,
      ];
      for (const pattern of matchPatterns) {
        const m = url.match(pattern);
        if (m && m[1]) {
          const id = m[1];
          candidates.push(`https://cdn.veo.co/api/v1/matches/${id}/video`);
          candidates.push(`https://app.veo.co/api/matches/${id}/stream`);
          break;
        }
      }
      // Also try embedding variant
      if (url.includes('app.veo.co')) {
        candidates.push(url.replace('/matches/', '/embed/').replace('/match/', '/embed/'));
      }
    }

    let lastErr: any = null;

    // Some Veo candidates resolve to match metadata (JSON) exposing a reel URL
    // that is directly streamable. Resolve those before treating them as videos.
    const resolvedCandidates: string[] = [];
    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { mode: 'cors' });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('json')) {
          try {
            const data = await response.json();
            if (Array.isArray(data?.videos) && data.videos[0]?.url) {
              resolvedCandidates.push(data.videos[0].url);
            } else if (typeof data?.reel_url === 'string' && data.reel_url) {
              resolvedCandidates.push(data.reel_url);
            } else if (typeof data?.stream_url === 'string' && data.stream_url) {
              resolvedCandidates.push(data.stream_url);
            } else {
              resolvedCandidates.push(candidate);
            }
          } catch {
            resolvedCandidates.push(candidate);
          }
        } else if (response.ok && !response.bodyUsed) {
          resolvedCandidates.push(candidate);
        }
      } catch {
        resolvedCandidates.push(candidate);
      }
    }

    for (const candidate of resolvedCandidates) {
      try {
        const response = await fetch(candidate, { mode: 'cors' });
        if (!response.ok) {
          lastErr = new Error(`HTTP ${response.status}`);
          continue;
        }
        const contentType = response.headers.get('content-type') || '';
        const isVideoFile =
          contentType.includes('video') ||
          contentType.includes('octet-stream') ||
          contentType.includes('mp4') ||
          contentType.includes('webm') ||
          contentType.includes('quicktime') ||
          /\.(mp4|webm|mov|m4v)(\?|$)/i.test(response.url);
        if (!isVideoFile) {
          lastErr = new Error('Keine Videodatei');
          continue;
        }

        const contentLength = Number(response.headers.get('content-length') || 0);
        const reader = response.body?.getReader();
        if (!reader) {
          lastErr = new Error('Stream nicht lesbar');
          continue;
        }

        const chunks: Uint8Array[] = [];
        let received = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            if (contentLength > 0) {
              setDownloadProgress(Math.min(99, Math.round((received / contentLength) * 100)));
            } else {
              setDownloadProgress(p => (p < 90 ? p + 1 : p));
            }
          }
        }

        const blob = new Blob(chunks as unknown as BlobPart[], { type: contentType || 'video/mp4' });
        const objectUrl = URL.createObjectURL(blob);
        setVideoSource(objectUrl);
        setVideoFileName(fileName);
        // heruntergeladene Datei für echtes ffmpeg-Schneiden merken
        videoFileRef.current = blob;
        setCutError('');

        setDownloadProgress(100);
        setDownloadStatus('success');
        setIsDownloading(false);

        // Clean up previous object URLs to avoid memory leaks
        if (veoDownloadObjectUrlRef.current) {
          URL.revokeObjectURL(veoDownloadObjectUrlRef.current);
        }
        veoDownloadObjectUrlRef.current = objectUrl;

        setIsPlaying(false);
        setIsPreviewingCut(false);
        setSaveSuccessMsg(null);
        setVeoInputUrl('');
        return;
      } catch (err: any) {
        lastErr = err;
      }
    }

    // All candidates failed
    setIsDownloading(false);
    setDownloadStatus('error');
    setDownloadError(
      isVeo
        ? 'Dieser Veo-Link ist login-geschützt und kann nicht automatisch heruntergeladen werden.\n\n' +
          'Bitte stelle sicher, dass der Link öffentlich freigegeben ist (Veo → Teilen → „Öffentlicher Link"), ' +
          'oder lade das Video manuell herunter und lade es hier über "Video hochladen" hoch.'
        : (lastErr?.message
            ? `Download fehlgeschlagen (${lastErr.message}). `
            : '') +
          'Bitte prüfe die URL oder ob der Link öffentlich und direkt erreichbar ist.'
    );
  };

  // Play / Pause toggle
  const togglePlay = () => {
    if (!mainVideoRef.current) return;
    if (isPlaying) {
      mainVideoRef.current.pause();
      setIsPlaying(false);
      setIsPreviewingCut(false);
    } else {
      mainVideoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Preview only the marked cut
  const handlePreviewCut = () => {
    if (!mainVideoRef.current) return;
    mainVideoRef.current.currentTime = cutStart;
    mainVideoRef.current.play();
    setIsPlaying(true);
    setIsPreviewingCut(true);
  };

  // Set Start at Current Time
  const handleSetStart = () => {
    if (!mainVideoRef.current) return;
    const cur = mainVideoRef.current.currentTime;
    setCutStart(cur);
    if (cur >= cutEnd) {
      setCutEnd(Math.min(videoDuration, cur + 5));
    }
  };

  // Set End at Current Time
  const handleSetEnd = () => {
    if (!mainVideoRef.current) return;
    const cur = mainVideoRef.current.currentTime;
    setCutEnd(cur);
    if (cur <= cutStart) {
      setCutStart(Math.max(0, cur - 5));
    }
  };

  // Step seek (+/- seconds)
  const handleStepSeek = (delta: number) => {
    if (!mainVideoRef.current) return;
    const target = Math.max(0, Math.min(videoDuration, mainVideoRef.current.currentTime + delta));
    mainVideoRef.current.currentTime = target;
    setCurrentTime(target);
  };

  // Capture Thumbnail Frame via Canvas
  const captureThumbnail = (): string => {
    if (!mainVideoRef.current) return '';
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(mainVideoRef.current, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch {
      // Ignore cross-origin canvas security errors gracefully
    }
    return '';
  };

  // Echten .mp4-Clip per Server-ffmpeg schneiden & herunterladen
  const cutToMp4 = async (startSec: number, endSec: number, baseName: string): Promise<Blob | null> => {
    const fileData = videoFileRef.current;
    if (!fileData) return null;

    const form = new FormData();
    form.append('file', fileData, videoFileName || 'video.mp4');
    form.append('start', String(startSec));
    form.append('end', String(endSec));
    form.append('name', baseName);

    const res = await apiFetchFormData('/api/video/cut', form);
    if (!res.ok) {
      let msg = `Schneiden fehlgeschlagen (HTTP ${res.status})`;
      try {
        const j = await res.json();
        if (j?.error) msg = j.error;
      } catch {}
      throw new Error(msg);
    }
    return await res.blob();
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  };

  // Automatischen Schnitt-Vorschlag nach Kategorie-Regel anwenden (relativ zur aktuellen Position)
  const applyCutRuleSuggestion = () => {
    const rule = CATEGORY_CUT_RULES[selectedCategory];
    if (!rule || !mainVideoRef.current || !videoDuration) return;
    const moment = mainVideoRef.current.currentTime;
    const suggestedStart = Math.max(0, moment - rule.startBefore);
    const suggestedEnd = Math.min(videoDuration, moment + rule.endAfter);
    if (suggestedEnd > suggestedStart) {
      setCutStart(suggestedStart);
      setCutEnd(suggestedEnd);
    }
  };

  const handleCategoryChange = (cat: VideoCategory) => {
    setSelectedCategory(cat);
    // Sub-Tags wechseln: Auswahl zurücksetzen
    setSelectedSubTags([]);
  };

  const toggleSubTag = (tag: string) => {
    setSelectedSubTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  // Save cut clip
  const handleSaveClip = async () => {
    if (!videoSource) return;

    setIsCutting(true);
    setCutError('');
    try {
      const thumb = captureThumbnail();
      const clipDuration = Math.max(1, Math.round((cutEnd - cutStart) * 10) / 10);
      const newId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Echtes ffmpeg-Schneiden, sobald eine lokale Datei vorliegt
      let cutFileName: string | undefined;
      if (videoFileRef.current) {
        try {
          const baseName = `${selectedCategory.replace(/\s+/g, '_')}_${Math.round(cutStart)}-${Math.round(cutEnd)}`;
          const clipBlob = await cutToMp4(cutStart, cutEnd, baseName);
          if (clipBlob) {
            cutFileName = `${baseName}.mp4`;
            triggerDownload(clipBlob, cutFileName);
          }
        } catch (err: any) {
          setCutError(err?.message || 'Echtes Schneiden fehlgeschlagen. Szene wurde trotzdem als Zeitmarke gespeichert.');
        }
      }

      // Resolve assigned player name if selected
      const assignedPlayer = players.find(p => p.id === assignedPlayerId);
      const assignedPlayerName = assignedPlayer 
        ? ('firstName' in assignedPlayer ? `${assignedPlayer.firstName} ${assignedPlayer.lastName}` : (assignedPlayer as any).name)
        : undefined;

      const tagsText = selectedSubTags.length
        ? `\nSub-Tags: ${selectedSubTags.join(', ')}`
        : '';
      const noteText = clipNoteDraft.trim() + tagsText;

      const newClip: TacticalVideoClip = {
        id: newId,
        category: selectedCategory,
        videoUrl: videoSource,
        videoName: videoFileName || 'Spielvideo',
        startTime: cutStart,
        endTime: cutEnd,
        duration: clipDuration,
        thumbnailUrl: thumb,
        tacticalNote: noteText,
        colorMarking: clipColorDraft,
        createdAt: new Date().toISOString(),
        title: `${selectedCategory} (${formatTime(cutStart)} - ${formatTime(cutEnd)})`,
        assignedPlayerId: assignedPlayerId || undefined,
        assignedPlayerName: assignedPlayerName || undefined,
        ...(cutFileName ? { cutFileName } : {}),
      };

      await saveClip(newClip);

      // 1. Ensure the assigned category accordion is open
      setOpenCategories(prev => ({ ...prev, [selectedCategory]: true }));
      setHighlightedClipId(newId);

      // 2. Show friendly confirmation banner
      setSaveSuccessMsg(`Szene (${formatTime(cutStart)} - ${formatTime(cutEnd)}) erfolgreich in „${selectedCategory}" gespeichert!${cutFileName ? ' Clip-Download gestartet.' : ''}`);

      // 3. Scroll smoothly directly to the assigned category & newly saved clip
      setTimeout(() => {
        const clipElement = document.getElementById(`clip-${newId}`);
        const categoryElement = document.getElementById(`category-section-${selectedCategory}`);
        const targetElement = clipElement || categoryElement;
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 180);

      // Reset notes for next cut but KEEP VIDEO OPEN
      setClipNoteDraft('');
      setClipColorDraft('none');
      setAssignedPlayerId('');
      setSelectedSubTags([]);

      // Advance cut markers by standard interval for convenience
      const nextStart = cutEnd;
      const nextEnd = Math.min(videoDuration, nextStart + 10);
      setCutStart(nextStart);
      setCutEnd(nextEnd);
      if (mainVideoRef.current) {
        mainVideoRef.current.currentTime = nextStart;
      }
    } finally {
      setIsCutting(false);
    }
  };

  // Close Cutter Video
  const handleCloseVideo = () => {
    if (mainVideoRef.current) {
      mainVideoRef.current.pause();
    }
    if (veoDownloadObjectUrlRef.current) {
      URL.revokeObjectURL(veoDownloadObjectUrlRef.current);
      veoDownloadObjectUrlRef.current = null;
    }
    setVideoSource(null);
    setVideoFileName('');
    videoFileRef.current = null;
    setCutError('');
    setIsPlaying(false);
    setIsPreviewingCut(false);
    setSaveSuccessMsg(null);
    setIsVeoLink(false);
    setVeoEmbedUrl(null);
    setVeoOriginalUrl('');
    setVeoIframeBlocked(false);
    setIsDownloading(false);
    setDownloadProgress(0);
    setDownloadStatus('');
    setDownloadError('');
  };

  // Toggle category accordion
  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Update clip note directly
  const handleUpdateClipNote = async (clip: TacticalVideoClip, newNote: string) => {
    await saveClip({ ...clip, tacticalNote: newNote });
  };

  // Update clip color marking
  const handleUpdateClipColor = async (clip: TacticalVideoClip, color: 'green' | 'red' | 'none') => {
    await saveClip({ ...clip, colorMarking: color });
  };

  // ⚡ Ultra-Overlay: Frames aus dem Clip-Bereich extrahieren
  const extractClipFrames = async (videoEl: HTMLVideoElement, startSec: number, endSec: number, frameCount: number = 5): Promise<string[]> => {
    const frames: string[] = [];
    const canvas = document.createElement('canvas');
    canvas.width = 848;
    canvas.height = 477;
    const ctx = canvas.getContext('2d');
    if (!ctx) return frames;
    const originalTime = videoEl.currentTime;
    const wasPlaying = !videoEl.paused;
    videoEl.pause();
    const dur = Math.max(0.5, endSec - startSec);
    const count = Math.max(2, Math.min(frameCount, 8));
    const interval = dur / (count + 1);
    for (let i = 1; i <= count; i++) {
      const seekTime = Math.max(0, Math.min(videoDuration || endSec, startSec + interval * i));
      videoEl.currentTime = seekTime;
      await new Promise<void>(resolve => {
        const onSeeked = () => { videoEl.removeEventListener('seeked', onSeeked); resolve(); };
        videoEl.addEventListener('seeked', onSeeked);
      });
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL('image/jpeg', 0.6));
    }
    videoEl.currentTime = originalTime;
    if (wasPlaying) videoEl.play();
    return frames;
  };

  // ⚡ Ultra-Overlay: KI-Keyframe-Tracking für eine Szene erzeugen
  const handleGenerateUltraOverlay = async (clip: TacticalVideoClip) => {
    const videoEl = mainVideoRef.current;
    if (!videoEl || isVeoLink || !videoSource || (clip.videoUrl && clip.videoUrl !== videoSource)) {
      setUltraError({ id: clip.id, text: '⚠ Bitte zuerst das Video dieser Szene laden (Veo-Link wird nicht unterstützt).' });
      setUltraMsg(null);
      return;
    }
    setUltraLoadingId(clip.id);
    setUltraError(null);
    setUltraMsg(null);
    try {
      const frames = await extractClipFrames(videoEl, clip.startTime || 0, clip.endTime || (clip.startTime || 0) + (clip.duration || 6), 5);
      if (frames.length === 0) throw new Error('Keine Frames aus dem Video extrahieren können – bitte Spielvideo laden.');
      const res = await apiFetch('/api/video-analysis/ultra-overlay', {
        method: 'POST',
        body: JSON.stringify({
          videoTitle: clip.videoName || videoFileName || 'Spielvideo',
          sceneDescription: clip.tacticalNote || clip.title || '',
          sceneId: clip.id,
          sampleFrames: frames,
          squadPlayers,
          clubName,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      const result = sanitizeUltraOverlayForFirestore(await res.json() as UltraOverlayData);
      await saveClip({ ...clip, ultraOverlay: result });
      setUltraMsg({ id: clip.id, text: `⚡ Ultra-Overlay erzeugt (${(result.keyframes || []).length} Keyframes) – jetzt im Video abspielen.` });
      setUltraShowForClip(clip.id);
    } catch (err: any) {
      setUltraError({ id: clip.id, text: err.message || 'Ultra-Overlay-Erzeugung fehlgeschlagen.' });
    } finally {
      setUltraLoadingId(null);
    }
  };

  // Tagger: annotiertes Bild + Taktik-Daten in Ziel-Szene (oder neue Szene) speichern
  const handleTaggerSave = (thumbnailDataUrl: string, board: SceneTacticBoard, timeSeconds: number) => {
    const target = tagTargetClipId ? (savedClips || []).find(c => c.id === tagTargetClipId) : undefined;
    if (target) {
      const el = target.tacticalNote || '';
      const note = `${el}${el ? '\n' : ''}🎯 Coach-Taktik (${formatTime(timeSeconds)}): ${board.players?.length || 0} Spieler, ${board.passes?.length || 0} Passwege, ${board.runs?.length || 0} Laufwege, ${board.zones?.length || 0} Räume, ${board.optimalPositions?.length || 0} optimale Positionen.`;
      void saveClip({ ...target, tacticBoard: board, thumbnailUrl: thumbnailDataUrl, tacticalNote: note });
      setHighlightedClipId(target.id);
      setSaveSuccessMsg('Taktik-Grafik zur Szene gespeichert (Bild aktualisiert).');
      setTagTargetClipId(null);
      setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] });
      setTagHistory([]);
      setTaggerOpen(false);
      return;
    }
    const dur = videoDuration > 0 ? videoDuration : timeSeconds + 6;
    const start = Math.max(0, timeSeconds - 3);
    const end = Math.min(dur, timeSeconds + 3);
    const newId = `tagger_clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newClip: TacticalVideoClip = {
      id: newId,
      category: 'Spielaufbau',
      categories: ['Spielaufbau'],
      videoUrl: videoSource ?? '',
      videoName: videoFileName || 'Spielvideo',
      startTime: start,
      endTime: end,
      duration: Math.max(1, end - start),
      thumbnailUrl: thumbnailDataUrl,
      tacticalNote: `🎯 Taktik-Anmerkung vom Coach (${formatTime(start)} – ${formatTime(end)}) – Elemente: ${board.players?.length || 0} Spieler, ${board.passes?.length || 0} Passwege, ${board.runs?.length || 0} Laufwege, ${board.zones?.length || 0} Räume, ${board.optimalPositions?.length || 0} optimale Positionen.`,
      colorMarking: 'none',
      createdAt: new Date().toISOString(),
      title: `🎯 Taktik-Anmerkung (${formatTime(start)})`,
      tacticBoard: board,
    };
    void saveClip(newClip);
    setOpenCategories(prev => ({ ...prev, 'Spielaufbau': true }));
    setHighlightedClipId(newId);
    setSaveSuccessMsg('Taktik-Szene gespeichert – mit annotiertem Bild unter „Spielaufbau".');
    setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] });
    setTagHistory([]);
    setTaggerOpen(false);
  };

  // Tagger für eine bestimmte Scene öffnen: Player springt zum Szenen-Start
  const openTaggerForClip = (clip: TacticalVideoClip) => {
    const v = mainVideoRef.current;
    if (clip.videoUrl && clip.videoUrl !== videoSource && !isVeoLink) {
      setSaveSuccessMsg('⚠ Bitte das Video dieser Szene erst laden, dann "🎯 Zeichnen" erneut drücken.');
      return;
    }
    setTagTargetClipId(clip.id);
    setTaggerOpen(true);
    setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] });
    setTagHistory([]);
    setTagRunPts([]);
    if (v) {
      v.pause();
      try {
        const t = Math.max(0, clip.startTime || 0);
        if (isFinite(t)) v.currentTime = t;
      } catch { /* seek vor Metadata ignorieren */ }
    }
  };

  // Group clips by category
  const clipsByCategory = VIDEO_CATEGORIES.reduce((acc, cat) => {
    const catClean = cat.toLowerCase().trim();
    acc[cat] = (savedClips || []).filter(c => {
      if (!c.category) return false;
      return c.category === cat || c.category.toLowerCase().trim() === catClean;
    });
    return acc;
  }, {} as Record<VideoCategory, TacticalVideoClip[]>);

  const totalClipsCount = (savedClips || []).length;

  // Flattened ordered list of all clips for slides presentation
  const presentationSlides = [
    { type: 'title' },
    ...VIDEO_CATEGORIES.flatMap(cat => {
      const items = clipsByCategory[cat] || [];
      if (items.length === 0) return [];
      return items.map(clip => ({ type: 'clip', clip, category: cat }));
    })
  ];

  // Save Trainer Note for a specific category
  const handleSaveCategoryNote = async (cat: VideoCategory, noteText: string, priority?: 'hoch' | 'mittel' | 'niedrig') => {
    const existing = categoryNotes[cat];
    await saveCategoryNote({
      id: cat,
      category: cat,
      note: noteText,
      focusPriority: priority || existing?.focusPriority || 'mittel',
      updatedAt: new Date().toISOString()
    });
  };

  // Start continuous playback for a specific category
  const handleStartCategoryReel = (cat: VideoCategory) => {
    const catClips = clipsByCategory[cat] || [];
    if (catClips.length === 0) return;
    setReelState({
      isOpen: true,
      mode: 'category',
      title: `${cat} (Kategorie-Video)`,
      clips: catClips
    });
  };

  // Start master continuous playback across ALL categories
  const handleStartMasterReel = () => {
    const allClips = VIDEO_CATEGORIES.flatMap(cat => clipsByCategory[cat] || []);
    if (allClips.length === 0) return;
    setReelState({
      isOpen: true,
      mode: 'master',
      title: analysisType === 'team' ? `${clubName} Gesamtanalyse (Team)` : 'Gegner-Analyse & Scouting',
      clips: allClips
    });
  };

  // Download standalone HTML presentation
  const handleDownloadHtmlPresentation = () => {
    const today = new Date().toLocaleDateString('de-DE');
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${clubName} – Taktische Videoanalyse (${today})</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 24px; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { text-align: center; padding: 32px 0; border-bottom: 2px solid #1E293B; margin-bottom: 32px; }
    .header h1 { font-size: 28px; margin: 0 0 8px 0; color: #10B981; }
    .header p { color: #94A3B8; font-size: 14px; margin: 0; }
    .category-section { margin-bottom: 40px; background: #1E293B; border-radius: 12px; padding: 20px; border: 1px solid #334155; }
    .category-title { font-size: 20px; font-weight: bold; color: #38BDF8; margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 12px; }
    .clips-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
    .clip-card { background: #0F172A; border-radius: 8px; overflow: hidden; border: 2px solid #334155; padding: 12px; }
    .clip-card.green { border-color: #10B981; }
    .clip-card.red { border-color: #EF4444; }
    .clip-thumb { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; background: #000; }
    .clip-meta { font-size: 12px; color: #94A3B8; margin: 8px 0 4px 0; font-weight: bold; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-bottom: 8px; }
    .badge-green { background: #064E3B; color: #34D399; }
    .badge-red { background: #7F1D1D; color: #F87171; }
    .note-box { background: #1E293B; padding: 8px 12px; border-radius: 6px; font-size: 13px; color: #F1F5F9; line-height: 1.4; white-space: pre-wrap; margin-top: 8px; }
    @media print {
      body { background: white; color: black; }
      .category-section { page-break-inside: avoid; border-color: #ccc; background: white; }
      .clip-card { border-color: #ccc; background: white; color: black; }
      .note-box { background: #f1f5f9; color: black; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FC AUGGEN – VIDEO-ANALYSE & TAKTIKBERICHT</h1>
      <p>Datum: ${today} | Erstellt mit dem ${clubName} Trainer-Dashboard | Gesamt: ${totalClipsCount} analysierte Szenen</p>
    </div>

    ${VIDEO_CATEGORIES.map(cat => {
      const catClips = clipsByCategory[cat] || [];
      const trainerNote = categoryNotes[cat]?.note;
      const priority = categoryNotes[cat]?.focusPriority;
      if (catClips.length === 0 && !trainerNote) return '';
      return `
        <div class="category-section">
          <div class="category-title">${cat} (${catClips.length} ${catClips.length === 1 ? 'Szene' : 'Szenen'})</div>
          ${trainerNote ? `
            <div style="background: #0A0E17; border-left: 4px solid #10B981; padding: 12px 16px; border-radius: 6px; margin: 12px 0 16px 0;">
              <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #10B981; margin-bottom: 4px;">
                Trainer-Fazit & Schwerpunkte ${priority ? `(${priority.toUpperCase()})` : ''}
              </div>
              <div style="font-size: 13px; color: #F8FAFC; line-height: 1.5; white-space: pre-wrap;">${trainerNote}</div>
            </div>
          ` : ''}
          <div class="clips-grid">
            ${catClips.map(clip => `
              <div class="clip-card ${clip.colorMarking}">
                ${clip.thumbnailUrl ? `<img class="clip-thumb" src="${clip.thumbnailUrl}" alt="Szene" />` : ''}
                <div class="clip-meta">⏱ ${formatTime(clip.startTime)} - ${formatTime(clip.endTime)} (${clip.duration}s)</div>
                ${clip.colorMarking === 'green' ? '<span class="badge badge-green">✓ Gute Aktion</span>' : ''}
                ${clip.colorMarking === 'red' ? '<span class="badge badge-red">⚠ Fehler / Schwäche</span>' : ''}
                <div class="note-box">${clip.tacticalNote || 'Keine Anmerkung vorhanden.'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}
  </div>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `FC_Auggen_Videoanalyse_${today.replace(/\./g, '-')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ══════════════ MATCHIQ MILESTONE 1: Speicher/Import, CSV-Export, Wärmekarte ══════════════
  const [matchiqMsg, setMatchiqMsg] = useState<string | null>(null);
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const jsonFileRef = useRef<HTMLInputElement>(null);

  const downloadBlob = (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const csvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const handleDownloadCsv = () => {
    if (!savedClips?.length) return;
    const today = new Date().toLocaleDateString('de-DE');
    const head = ['sep=;', 'Kennung', 'Kategorie', 'Titel', 'Label', 'Start (s)', 'Ende (s)', 'Dauer (s)', 'Markierung', 'Zonen', 'Schlüsselspieler', 'Lernpunkt', 'Taktik-Notiz', 'Video-URL', 'Erstellt am'];
    const rows = (savedClips || []).map((c: any) => [
      c.id || '',
      c.category || '',
      c.title || '',
      c.label || '',
      c.startTime ?? '',
      c.endTime ?? '',
      c.duration ?? '',
      c.colorMarking || '',
      Object.keys(c.spatialAnalysis || {}).filter((k) => c.spatialAnalysis[k]).join(' | '),
      (c.keyPlayers || []).map((k: any) => k?.name || (k?.jerseyNumber ? `#${k.jerseyNumber}` : '')).filter(Boolean).join(', '),
      c.mainLearningPoint || '',
      String(c.tacticalNote || '').replace(/\r?\n/g, ' '),
      c.videoUrl || '',
      c.createdAt || '',
    ].map(csvCell).join(';'));
    downloadBlob('\uFEFF' + [head.join(';'), ...rows].join('\r\n'), `FC_Auggen_Videoanalyse_${today.replace(/\./g, '-')}.csv`, 'text/csv;charset=utf-8');
    setMatchiqMsg('📊 CSV-Export erstellt (Excel-kompatibel, Trennzeichen ;)');
    setTimeout(() => setMatchiqMsg(null), 5000);
  };

  const handleExportJson = () => {
    const today = new Date().toLocaleDateString('de-DE');
    const payload = {
      exportedAt: new Date().toISOString(),
      club: clubName,
      schema: 'matchiq-milestone-1',
      clips: savedClips || [],
      categoryNotes: Object.values(categoryNotes || {}),
    };
    downloadBlob(JSON.stringify(payload, null, 2), `FC_Auggen_MatchIQ_Backup_${today.replace(/\./g, '-')}.json`, 'application/json;charset=utf-8');
    setMatchiqMsg(`💾 Backup gesichert (${(savedClips || []).length} Szenen)`);
    setTimeout(() => setMatchiqMsg(null), 5000);
  };

  const handleImportJsonFile = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const clips = Array.isArray(data) ? data : Array.isArray(data.clips) ? data.clips : [];
      const notes = Array.isArray(data.categoryNotes) ? data.categoryNotes : [];
      let savedClipsN = 0;
      let savedNotesN = 0;
      for (const c of clips) { try { await saveClip(c); savedClipsN++; } catch { /* einzelne Szene überspringen */ } }
      for (const n of notes) { try { await saveCategoryNote(n); savedNotesN++; } catch { /* Notiz überspringen */ } }
      setMatchiqMsg(`✅ Import abgeschlossen: ${savedClipsN} Szenen, ${savedNotesN} Trainer-Notizen übernommen.`);
      setTimeout(() => setMatchiqMsg(null), 6000);
    } catch (err) {
      setMatchiqMsg(`❌ Import fehlgeschlagen: ${(err as any)?.message || 'Ungültige JSON-Datei'}`);
      setTimeout(() => setMatchiqMsg(null), 6000);
    }
    evt.target.value = '';
  };

  const MATCHIQ_HEAT_ZONES = [
    { key: 'behindDefense', x: 215, y: 10, w: 70, h: 34, label: 'Tiefe Läufe' },
    { key: 'wingsLeft', x: 10, y: 50, w: 115, h: 115, label: 'Links außen' },
    { key: 'leftHalfSpace', x: 128, y: 50, w: 85, h: 115, label: 'LV-Halbraum' },
    { key: 'center', x: 216, y: 50, w: 68, h: 115, label: 'Zentrum' },
    { key: 'rightHalfSpace', x: 287, y: 50, w: 85, h: 115, label: 'RV-Halbraum' },
    { key: 'wingsRight', x: 375, y: 50, w: 115, h: 115, label: 'Rechts außen' },
    { key: 'betweenLines', x: 205, y: 175, w: 90, h: 55, label: 'Zwischenlinien' },
  ];

  const heatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    MATCHIQ_HEAT_ZONES.forEach((z) => { counts[z.key] = 0; });
    (savedClips || []).forEach((c: any) => {
      const sa = c.spatialAnalysis || {};
      MATCHIQ_HEAT_ZONES.forEach((z) => { if (sa[z.key]) counts[z.key] = (counts[z.key] || 0) + 1; });
    });
    return counts;
  }, [savedClips]); // eslint-disable-line react-hooks/exhaustive-deps
  const heatMax = Math.max(1, ...MATCHIQ_HEAT_ZONES.map((z) => heatCounts[z.key] || 0));
  const heatColor = (cnt: number) => {
    const t = cnt / heatMax;
    const r = Math.round(25 + t * 225);
    const g = Math.round(130 - t * 115);
    const b = 130;
    return `rgba(${r},${g},${b},${0.3 + 0.4 * t})`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-6 space-y-6 text-[#F5F5F5]">
      
      {/* VEO MATCH PANEL */}
      {isVeoLink && (
        <div className="bg-gradient-to-br from-[#0D1117] via-[#131A26] to-[#0D1117] border-2 border-[#10B981]/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border-2 border-[#10B981]/40 flex items-center justify-center">
              <Video size={28} className="text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-1">Veo-Match erkannt</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mb-1">
                Veo blockiert die Einbettung. Lade das Video herunter und lade es hier hoch.
              </p>
              <p className="text-[10px] text-[#64748B] max-w-lg">
                1. "Bei Veo öffnen" &rarr; 2. Video abspielen &rarr; 3. Rechtsklick &rarr; "Video speichern unter" &rarr; 4. "Video hochladen"
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <a href={veoOriginalUrl} target="_blank" rel="noopener noreferrer"
                className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer">
                <ExternalLink size={14} />
                <span>Bei Veo öffnen</span>
              </a>
              <button onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-[#20293A] hover:bg-[#2A374F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer">
                <Upload size={14} />
                <span>Video hochladen</span>
              </button>
              <button onClick={handleCloseVideo}
                className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-rose-800/30 cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-[#181C24] border border-[#2A3447] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="p-2 bg-[#10B981]/20 text-[#10B981] rounded-xl border border-[#10B981]/40">
              <Film size={22} />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Taktische Video-Analyse
            </h1>
          </div>
          <p className="text-xs text-[#94A3B8] font-medium">
            Schneide Szenen, füge sie zu Kategorie-Videos zusammen und erstelle die Gesamtanalyse für das Team oder gegen Gegner.
          </p>
        </div>

        {/* Perspective Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team / Gegner Toggle */}
          <div className="flex items-center gap-1 bg-[#101726] p-1 rounded-xl border border-[#2A3447]">
            <button
              onClick={() => setAnalysisType('team')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                analysisType === 'team' ? 'bg-[#3B82F6] text-white font-black shadow-md' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Shield size={13} />
              <span>Team-Analyse</span>
            </button>

            <button
              onClick={() => setAnalysisType('opponent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                analysisType === 'opponent' ? 'bg-rose-500 text-white font-black shadow-md' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Target size={13} />
              <span>Gegner-Analyse</span>
            </button>
          </div>

          {/* Master Reel Quick Play Button */}
          <button
            onClick={handleStartMasterReel}
            disabled={totalClipsCount === 0}
            className="px-4 py-2.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-30 text-[#0A0E17] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            title="Alle geschnittenen Szenen aus allen Kategorien zusammenhängend als Video abspielen"
          >
            <Play size={16} fill="currentColor" />
            <span>Gesamtes Video abspielen ({totalClipsCount})</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-[#20293A] hover:bg-[#2A374F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-1.5 cursor-pointer"
          >
            <Upload size={15} /> <span>Video laden</span>
          </button>
          
          <button
            onClick={handleLoadSampleVideo}
            className="px-3 py-2.5 bg-[#20293A] hover:bg-[#2A374F] text-[#94A3B8] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-1 cursor-pointer"
            title="Beispiel-Video zum Testen laden"
          >
            <Sparkles size={13} className="text-[#F59E0B]" /> <span>Demo</span>
          </button>

          <input 
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Veo / URL Input */}
          <div className="flex items-center gap-2 ml-1 border border-[#10B981]/40 rounded-xl p-1 bg-[#0D1117]">
            <input
              type="text"
              value={veoInputUrl}
              onChange={(e) => setVeoInputUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleLoadVeoUrl(); }}
              placeholder="Veo-Link oder Video-URL einfügen..."
              className="flex-1 min-w-[200px] px-3 py-2 bg-transparent border-none text-xs text-white placeholder-[#475569] outline-none"
            />
            <button
              onClick={handleLoadVeoUrl}
              className="px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1"
            >
              <ExternalLink size={13} />
              <span>Laden</span>
            </button>
          </div>
        </div>

        {/* Download Progress Bar */}
        {(isDownloading || downloadStatus === 'success') && (
          <div className="mt-3 p-4 rounded-xl border border-[#10B981]/40 bg-[#0D1117]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] flex items-center gap-2">
                {isDownloading ? (
                  <><Loader2 size={13} className="animate-spin text-[#10B981]" />Video wird heruntergeladen…</>
                ) : downloadStatus === 'success' ? (
                  <><CheckCircle2 size={13} className="text-[#10B981]" />Download abgeschlossen – Video ist bereit</>
                ) : null}
              </span>
              <span className="text-[10px] font-mono font-bold text-[#10B981]">{downloadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#10B981] to-emerald-400 transition-all duration-150"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download / Load Error Message */}
        {downloadStatus === 'error' && (
          <div className="mt-3 p-4 rounded-xl border border-rose-500/50 bg-rose-950/30">
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-rose-300">Download fehlgeschlagen</div>
                <p className="text-[11px] text-rose-200 whitespace-pre-line leading-relaxed">{downloadError}</p>
                <button
                  onClick={() => { setDownloadStatus(''); setDownloadError(''); }}
                  className="mt-2 text-[10px] font-bold text-rose-300 hover:text-rose-100 underline cursor-pointer"
                >
                  Fehlermeldung schließen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TEAM-IDENTIFIKATION: Kader + Trikotfarben */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#0A0E17] via-[#1a0a0a] to-[#0A0E17] border border-[#DC2626]/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#DC2626] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#EF4444]">Team-Identifikation</span>
          <span className="text-[8px] text-[#64748B] ml-auto">Automatische Spieler-Erkennung anhand Trikotfarbe</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Trikotfarben & Formation */}
          <div className="bg-[#1a0a0a] border border-[#DC2626]/20 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#EF4444] tracking-widest mb-2">Trikot & Formation</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-1">
                <div className="w-8 h-10 rounded-lg border-2 border-[#DC2626] bg-[#DC2626]" title="Trikot" />
                <div className="w-5 h-10 rounded-lg border-2 border-[#374151] bg-black" title="Hose" />
                <div className="w-3 h-10 rounded-lg border-2 border-[#DC2626] bg-[#DC2626]" title="Stutzen" />
              </div>
              <div className="text-[10px]">
                <div className="font-black text-white">4-2-3-1</div>
                <div className="text-[#94A3B8]">Standard-Formation</div>
              </div>
            </div>
            <div className="space-y-1 text-[9px]">
              <div className="flex justify-between"><span className="text-[#94A3B8]">Trikot:</span><span className="text-white font-bold">Rot</span></div>
              <div className="flex justify-between"><span className="text-[#94A3B8]">Hose:</span><span className="text-white font-bold">Schwarz</span></div>
              <div className="flex justify-between"><span className="text-[#94A3B8]">Stutzen:</span><span className="text-white font-bold">Rot</span></div>
              <div className="flex justify-between"><span className="text-[#94A3B8]">TW:</span><span className="text-[#FCD34D] font-bold">Gelb</span></div>
            </div>
          </div>

          {/* Kader-Übersicht */}
          <div className="bg-[#1a0a0a] border border-[#DC2626]/20 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#EF4444] tracking-widest mb-2">Kader ({players.length})</div>
            <div className="space-y-0.5 max-h-40 overflow-y-auto custom-scrollbar">
              {(['torwart', 'abwehr', 'mittelfeld', 'sturm'] as const).map(role => {
                const rolePlayers = players.filter(p => {
                  const pos = (p.position || '').toUpperCase();
                  const nameStr = 'firstName' in p ? `${p.firstName} ${p.lastName}` : (p as any).name || '';
                  const lp = (nameStr + ' ' + pos).toLowerCase();
                  if (role === 'torwart') return pos.includes('TW') || lp.includes('torwart') || lp.includes('tw ') || nameStr.toLowerCase().includes('tw');
                  if (role === 'abwehr') return /IV|LV|RV|ABW|AUßENVERTEIDIGER|INNENVERTEIDIGER/.test(pos) || lp.includes('abwehr') || lp.includes('verteidiger');
                  if (role === 'sturm') return /ST|LF|RF|LM|RM|STURM/.test(pos) || lp.includes('sturm') || lp.includes('angriff');
                  return /DM|ZM|OM|ZDM|ZOM|MF|MITTELFELD|MITTELFELDSPIELER/.test(pos) || lp.includes('mittelfeld');
                });
                if (rolePlayers.length === 0) return null;
                return (
                  <div key={role}>
                    <div className="text-[7px] font-black uppercase text-[#64748B] mt-1">{role}</div>
                    {rolePlayers.map(p => {
                      const pName = 'firstName' in p ? `${p.firstName} ${p.lastName}` : (p as any).name || '';
                      const pNum = p.number ?? (p as any).nummer ?? (p as any).rückennummer;
                      return (
                        <div key={p.id} className="flex items-center gap-1.5 text-[9px]">
                          <span className="text-[#EF4444] font-black w-4 text-right">#{pNum}</span>
                          <span className="text-white font-bold truncate">{pName}</span>
                          <span className="text-[#64748B] text-[7px] ml-auto">{p.position}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gegner-Erkennung */}
          <div className="bg-[#1a0a0a] border border-[#DC2626]/20 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#EF4444] tracking-widest mb-2">Gegner-Erkennung</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[9px]">
                <div className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse" />
                <span className="text-[#10B981] font-bold">Automatisch aktiv</span>
              </div>
              <div className="text-[9px] text-[#94A3B8]">Gegner wird anhand der Trikotfarbe automatisch erkannt. Teamfarbe ROT wird als Referenz verwendet.</div>
              <div className="bg-[#0a0f1a] border border-[#1f2937] rounded-lg p-2 space-y-1 text-[9px]">
                <div className="font-black text-white uppercase">Erkennungslogik:</div>
                <div className="text-[#94A3B8]">1. Trikotfarbe ROT → {clubName}</div>
                <div className="text-[#94A3B8]">2. Alle anderen Farben → Gegner</div>
                <div className="text-[#94A3B8]">3. TW Gelb → {clubName} Torwart</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* actiCode-Beta: Automatische Szenenerkennung                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#0A0E17] via-[#0a1a10] to-[#0A0E17] border border-[#10B981]/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#10B981]">actiCode-Beta</span>
          <span className="text-[8px] text-[#64748B] ml-auto">Automatische Szenenerkennung • Segmentierung • Klassifizierung</span>
        </div>
        <p className="text-[9px] text-[#94A3B8] mb-3">actiCode-Beta analysiert das Video automatisch und erkennt Spielszenen, Spieler-Positionen, Teamverhalten und taktische Muster.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {Object.values(ACTICODE_TASKS).map(task => (
            <div key={task.name} className="bg-[#0a0f1a] border border-[#1f2937] rounded-xl p-2.5 hover:border-[#10B981]/40 transition-all cursor-pointer group">
              <div className="text-lg mb-1">{task.icon}</div>
              <div className="text-[9px] font-black uppercase text-white group-hover:text-[#10B981] transition-colors">{task.name}</div>
              <div className="text-[7px] text-[#64748B] mt-0.5 leading-tight">{task.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VISION-ANALYSE: Automatische Formationserkennung              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <VisionAnalysisPanel videoRef={mainVideoRef} clubName={clubName || 'FC Auggen'} players={players} />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HUDL SPORTSCODE + COACH PAINT DASHBOARD (Profi-Videoanalyse)  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#0A0E17] via-[#111827] to-[#0A0E17] border border-[#2563EB]/30 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#60A5FA]">Hudl Sportscode™ + Coach Paint™</span>
          <span className="text-[8px] text-[#64748B] ml-auto">Automatisches Tagging • GPS-Overlay • TV-Grafiken</span>
        </div>

        {/* Auto-Tagging Engine */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
          <div className="bg-[#0A1628] border border-[#2563EB]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#60A5FA] tracking-widest mb-2">Auto-Tagging Engine</div>
            <div className="space-y-1">
              {['Tor', 'Großchance', 'Konter', 'Standard (Eck)', 'Standard (Freistoß)', 'Rote Karte', 'Penalty', 'Druckphase'].map((tag, i) => {
                const tagKey = tag.toLowerCase().split(' ')[0];
                const count = savedClips.filter(c => c.label?.toLowerCase().includes(tagKey)).length;
                return (
                  <button
                    key={i}
                    onClick={() => openFirstClipMatching(c => c.label?.toLowerCase().includes(tagKey))}
                    disabled={count === 0}
                    className="flex items-center justify-between px-2 py-1 bg-[#0D1117] rounded border border-[#1E293B] w-full cursor-pointer hover:border-[#60A5FA]/40 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-[#10B981]' : 'bg-[#334155]'}`} />
                      <span className="text-[8px] font-bold text-[#94A3B8]">{tag}</span>
                    </div>
                    <span className="text-[8px] font-black text-[#60A5FA]">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TV-Grafiken Overlay Panel */}
          <div className="bg-[#0A1628] border border-[#A855F7]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#C084FC] tracking-widest mb-2">TV-Grafiken Overlay (Coach Paint™)</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: '➡️', label: 'Passweg' },
                { icon: '🏃', label: 'Laufweg' },
                { icon: '🔴', label: 'Pressingzone' },
                { icon: '🟢', label: 'Freiraum' },
                { icon: '⚡', label: 'Sprint-Pfeil' },
                { icon: '🎯', label: 'Torwahrscheinlichkeit' },
                { icon: '🔵', label: 'Zonen-Overlay' },
                { icon: '📐', label: 'Abseits-Linie' },
              ].map((tool, i) => {
                const active = activePaintTools.includes(tool.label);
                return (
                  <button
                    key={i}
                    onClick={() => togglePaintTool(tool.label)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-[7px] font-bold border transition-all cursor-pointer ${
                      active ? 'bg-[#A855F7]/20 border-[#A855F7]/50 text-[#C084FC]' : 'bg-[#0D1117] border-[#1E293B] text-[#64748B] hover:border-[#A855F7]/30'
                    }`}
                  >
                    <span>{tool.icon}</span> {tool.label} {active && <span className="text-[#10B981]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sequenzen-Übersicht */}
          <div className="bg-[#0A1628] border border-[#10B981]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-2">Taktische Sequenzen</div>
            <div className="space-y-1">
              {[
                { name: 'Aufbau von hinten', filter: (l?: string) => l?.includes('Aufbau') ?? false, icon: '🏗️' },
                { name: 'Pressing ausgelöst', filter: (l?: string) => l?.includes('Press') ?? false, icon: '🔴' },
                { name: 'Umschaltmoment', filter: (l?: string) => l?.includes('Umschalt') ?? false, icon: '⚡' },
                { name: 'Flügelüberladung', filter: (l?: string) => l?.includes('Flügel') ?? false, icon: '🏃' },
                { name: 'Konterchance', filter: (l?: string) => l?.includes('Konter') ?? false, icon: '🚀' },
                { name: 'Standards erarbeitet', filter: (l?: string) => l?.includes('Standard') ?? false, icon: '📐' },
              ].map((seq, i) => {
                const clips = savedClips.filter(c => seq.filter(c.label)).length;
                return (
                  <button
                    key={i}
                    onClick={() => openFirstClipMatching(c => seq.filter(c.label))}
                    disabled={clips === 0}
                    className="flex items-center justify-between px-2 py-1 bg-[#0D1117] rounded border border-[#1E293B] w-full cursor-pointer hover:border-[#10B981]/40 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px]">{seq.icon}</span>
                      <span className="text-[8px] font-bold text-[#94A3B8]">{seq.name}</span>
                    </div>
                    <span className={`text-[8px] font-black ${clips > 0 ? 'text-[#10B981]' : 'text-[#334155]'}`}>{clips}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* GPS-Integration Bar */}
        <div className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[8px] font-black uppercase text-[#F59E0B] tracking-wider">GPS-Sync:</span>
          <span className="text-[7px] text-[#64748B]">Catapult Vector Daten mit Video-Timecode synchronisieren</span>
          <div className="flex items-center gap-1.5 ml-auto">
            {(['GPS-In Pocket-Overlay', 'Herzfrequenz-Balken', 'Belastungs-Warnung'] as const).map(label => {
              const on = gpsOverlays[label];
              return (
                <button
                  key={label}
                  onClick={() => toggleGpsOverlay(label)}
                  className={`px-2 py-1 text-[7px] font-bold rounded cursor-pointer border transition-all ${
                    on && label === 'GPS-In Pocket-Overlay'
                      ? 'bg-[#F59E0B]/30 border-[#F59E0B] text-[#FBBF24]'
                      : on && label === 'Herzfrequenz-Balken'
                        ? 'bg-[#2563EB]/30 border-[#2563EB] text-[#93C5FD]'
                        : on
                          ? 'bg-[#EF4444]/30 border-[#EF4444] text-[#FCA5A5]'
                          : 'bg-[#0D1117] border-[#1E293B] text-[#64748B] hover:border-[#F59E0B]/40'
                  }`}
                >
                  {on ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {/* END HUDL SPORTSCODE DASHBOARD */}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* KI VIDEO-ANALYSE: Frame-Extraktion + Gemini Vision           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(videoSource || isVeoLink) && !aiAnalysisResult && (
        <div className="bg-gradient-to-br from-[#0A0E17] via-[#1a1040] to-[#0A0E17] border border-[#8B5CF6]/30 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-widest text-[#A78BFA]">KI Video-Analyse Engine</span>
            <span className="text-[8px] text-[#64748B] ml-auto">Gemini Vision • Automatische Szenen-Erkennung</span>
          </div>
          <p className="text-xs text-[#94A3B8] mb-4">
            {isVeoLink
              ? 'Veo-Video erkannt. Die KI analysiert basierend auf Kader und Spielkontext (Frames werden beim Veo-Embed nicht extrahiert).'
              : 'Die KI analysiert 5 Frames oder tastet das ganze Spiel automatisch ab (wie Veo) und erkennt Spielszenen, Spieler-Positionen, Taktik und Schwachstellen.'}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartAIAnalysis}
              disabled={aiAnalysisLoading}
              className="px-6 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            >
              {aiAnalysisLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>KI analysiert Video... (dauert ca. 30s)</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>KI-Analyse starten</span>
                </>
              )}
            </button>
            {!isVeoLink && (
              <button
                onClick={handleAutoSceneScan}
                disabled={aiAnalysisLoading}
                title="Scant das gesamte Video automatisch nach Spielszenen (wie Veo) – dauert ca. 1–2 Minuten"
                className="px-6 py-3 bg-gradient-to-r from-[#0EA5E9] to-[#06B6D4] hover:from-[#0284C7] hover:to-[#0891B2] disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {aiAnalysisLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Clapperboard size={18} />
                )}
                <span>{aiAnalysisLoading ? 'Auto-Scan läuft...' : 'Auto-Erkennung (wie Veo)'}</span>
              </button>
            )}
          </div>
          {aiAnalysisError && (
            <div className="mt-3 p-3 bg-rose-950/50 border border-rose-700/50 rounded-xl text-rose-300 text-xs font-bold">
              {aiAnalysisError}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* KI ERGEBNISSE: Tracking, Szenen, Statistiken                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showAiResults && aiAnalysisResult && (
        <div className="space-y-4">
          {/* Summary Banner */}
          <div className="bg-gradient-to-r from-[#8B5CF6]/20 to-[#10B981]/20 border border-[#8B5CF6]/30 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-[#10B981]" />
                <span className="text-sm font-black text-white uppercase">KI-Analyse abgeschlossen</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateTrainingPlan}
                  disabled={trainingPlanLoading}
                  className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] disabled:opacity-50 text-black font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {trainingPlanLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>Trainingsplan generieren</span>
                </button>
                <button
                  onClick={() => { setShowAiResults(false); setShowTrainingPlan(false); setAiAnalysisResult(null); setTrainingPlan(null); }}
                  className="px-3 py-2 bg-[#20293A] hover:bg-rose-950/60 text-[#94A3B8] hover:text-rose-300 border border-[#334155] rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  X
                </button>
              </div>
            </div>
            <p className="text-xs text-[#94A3B8]">{aiAnalysisResult.summary}</p>
          </div>

          {/* Tracking Overview Grid */}
          {aiAnalysisResult.pitchDetection && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#0A1628] border border-[#2563EB]/30 rounded-xl p-3 text-center">
                <div className="text-[8px] font-black uppercase text-[#60A5FA] tracking-widest mb-1">Spielfeldzone</div>
                <div className="text-lg font-black text-white">{aiAnalysisResult.pitchDetection.currentZone}</div>
              </div>
              <div className="bg-[#0A1628] border border-[#10B981]/30 rounded-xl p-3 text-center">
                <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-1">Ballbesitz</div>
                <div className="text-lg font-black text-white">{aiAnalysisResult.pitchDetection.ballPossessionTeam}</div>
              </div>
              <div className="bg-[#0A1628] border border-[#F59E0B]/30 rounded-xl p-3 text-center">
                <div className="text-[8px] font-black uppercase text-[#F59E0B] tracking-widest mb-1">Pressing-Index</div>
                <div className="text-lg font-black text-white">{aiAnalysisResult.pitchDetection.pressingDensityIndex}/100</div>
              </div>
            </div>
          )}

          {/* Detected Scene Clips */}
          {aiAnalysisResult.sceneClips && aiAnalysisResult.sceneClips.length > 0 && (
            <div className="bg-[#131A26] border border-[#2A3447] rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-2">
                <Film size={16} className="text-[#8B5CF6]" />
                Automatisch erkannte Spielszenen ({aiAnalysisResult.sceneClips.length})
              </h3>
              <div className="space-y-2">
                {aiAnalysisResult.sceneClips.map((clip: any, idx: number) => {
                  const clipKey = String(clip.id || `airaw_${idx}`);
                  return (
                  <div key={clipKey} className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-3">
                    <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                      clip.teamInvolved?.includes(clubShortName) || clip.teamInvolved === clubName
                        ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}>
                      {clip.category}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{clip.title}</span>
                        <span className="text-[10px] font-mono text-[#64748B]">⏱ {clip.timestampFormatted}</span>
                      </div>
                      <p className="text-[11px] text-[#94A3B8] mb-1">{clip.aiCommentary}</p>
                      {clip.patternVariant && (
                        <p className="text-[10px] text-[#22D3EE] font-bold mb-1">🧩 Muster/Variante: {clip.patternVariant}</p>
                      )}
                      {(Array.isArray(clip.tacticalFeatures) && clip.tacticalFeatures.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {clip.tacticalFeatures.map((f: string, fi: number) => (
                            <span key={fi} className="px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded text-[9px] font-bold">{f}</span>
                          ))}
                        </div>
                      )}
                      {(Array.isArray(clip.errorAnalysis) && clip.errorAnalysis.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {clip.errorAnalysis.map((f: string, fi: number) => (
                            <span key={fi} className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold">⚠ {f}</span>
                          ))}
                        </div>
                      )}
                      {clip.startEvent && clip.endEvent && (
                        <p className="text-[10px] text-[#94A3B8] italic mb-1">▶ {clip.startEvent} → ■ {clip.endEvent}</p>
                      )}
                      {clip.improvementSuggestions && (
                        <p className="text-[10px] text-[#F59E0B] italic">Verbesserung: {clip.improvementSuggestions}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-[#64748B]">Zone: {clip.pitchZone}</span>
                        {clip.tacticalRating && (
                          <span className="text-[9px] font-bold text-[#10B981]">Bewertung: {clip.tacticalRating}</span>
                        )}
                      </div>
                    </div>
                    </div>
                    {/* Once-Style Taktik-Grafik */}
                    <SceneTacticDiagram
                      board={clip.tacticBoard}
                      expanded={expandedTacticClipId === clipKey}
                      onToggle={() => setExpandedTacticClipId(expandedTacticClipId === clipKey ? null : clipKey)}
                    />
                    <button
                      onClick={() => {
                        const saved = (savedClips || []).find(c => c.aiSceneId === clip.id);
                        if (saved) { openTaggerForClip(saved); return; }
                        setTagTargetClipId(null);
                        setTaggerOpen(true);
                        setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] });
                        setTagHistory([]);
                        setTagRunPts([]);
                        setTagDragStart(null);
                        const v = mainVideoRef.current;
                        if (v) {
                          v.pause();
                          const t = Number(clip.startTimeSeconds) || 0;
                          if (isFinite(t)) v.currentTime = t;
                        }
                      }}
                      className="mt-2 w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40 hover:bg-[#10B981] hover:text-black transition-all cursor-pointer"
                      title="Once-Style: direkt auf dem Video zeichnen, springt zum Szenen-Start"
                    >
                      <Target size={12} /> 🎯 Diese Szene direkt markieren
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Timeline Events */}
          {aiAnalysisResult.timelineEvents && aiAnalysisResult.timelineEvents.length > 0 && (
            <div className="bg-[#131A26] border border-[#2A3447] rounded-2xl p-4 shadow-xl">
              <h3 className="text-sm font-black text-white uppercase mb-3 flex items-center gap-2">
                <Clock size={16} className="text-[#60A5FA]" />
                Event-Timeline ({aiAnalysisResult.timelineEvents.length})
              </h3>
              <div className="space-y-1">
                {aiAnalysisResult.timelineEvents.map((evt: any, idx: number) => (
                  <div key={evt.id || idx} className="flex items-center gap-3 px-3 py-1.5 bg-[#0D1117] rounded-lg border border-[#1E293B]">
                    <span className="text-[10px] font-mono font-bold text-[#60A5FA] w-12 shrink-0">{evt.timestampFormatted}</span>
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      evt.importance === 'Hoch' ? 'bg-rose-400' : evt.importance === 'Normal' ? 'bg-[#F59E0B]' : 'bg-[#64748B]'
                    }`} />
                    <span className="text-[11px] font-bold text-white">{evt.title}</span>
                    <span className="text-[10px] text-[#94A3B8] truncate">{evt.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Plan */}
          {showTrainingPlan && trainingPlan && (
            <div className="bg-[#131A26] border border-[#F59E0B]/30 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-[#F59E0B]" />
                <h3 className="text-sm font-black text-white uppercase">Trainingsplan - {trainingPlan.weekSummary}</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trainingPlan.days?.map((day: any, idx: number) => (
                  <div key={idx} className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-white uppercase">{day.day}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                        day.intensity === 'hoch' ? 'bg-rose-500/20 text-rose-400' :
                        day.intensity === 'mittel' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' :
                        'bg-[#10B981]/20 text-[#10B981]'
                      }`}>{day.intensity}</span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8] mb-2">{day.theme} ({day.duration})</div>
                    {day.sessions?.map((s: any, si: number) => (
                      <div key={si} className="ml-2 mb-1.5 border-l border-[#2A3447] pl-2">
                        <div className="text-[10px] font-bold text-white">{s.name} <span className="text-[#64748B]">({s.category}, {s.duration})</span></div>
                        <div className="text-[9px] text-[#94A3B8]">{s.description?.substring(0, 80)}...</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              {trainingPlan.regenerationTips && (
                <div className="mt-3 p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl">
                  <div className="text-[10px] font-black text-[#10B981] uppercase mb-1">Regenerationstipps</div>
                  {trainingPlan.regenerationTips.map((tip: string, i: number) => (
                    <div key={i} className="text-[10px] text-[#94A3B8]">• {tip}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* VEO MATCH PANEL (direkt sichtbar, unabhängig vom Player)     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isVeoLink && (
        <div className="bg-gradient-to-br from-[#0D1117] via-[#131A26] to-[#0D1117] border-2 border-[#10B981]/50 rounded-2xl p-6 shadow-2xl">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border-2 border-[#10B981]/40 flex items-center justify-center">
              <Video size={28} className="text-[#10B981]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white mb-1">Veo-Match erkannt</h3>
              <p className="text-xs text-[#94A3B8] max-w-md mb-1">
                Veo blockiert die Einbettung ({videoFileName || 'Video'}). Lade das Video herunter und lade es hier hoch.
              </p>
              <p className="text-[10px] text-[#64748B] max-w-lg">
                1. &rarr; "Bei Veo öffnen" klicken &rarr; 2. Video auf Veo abspielen &rarr; 3. Rechtsklick &rarr; "Video speichern unter" &rarr; 4. Zurück hier &rarr; "Video hochladen"
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <a
                href={veoOriginalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Bei Veo öffnen</span>
              </a>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-5 py-2.5 bg-[#20293A] hover:bg-[#2A374F] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer"
              >
                <Upload size={14} />
                <span>Video hochladen</span>
              </button>
              <button
                onClick={handleCloseVideo}
                className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-rose-800/30 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHRITT 1 – VIDEO HOCHLADEN & SCHNEIDEN (CUTTER VIEW) */}
      <AnimatePresence>
        {videoSource && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-[#131A26] border-2 border-[#10B981]/50 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#2A3447] pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#10B981]/20 text-[#10B981] rounded-lg">
                  <Scissors size={18} />
                </span>
                <span className="text-sm font-black uppercase text-white tracking-wide">
                  Schneide-Studio: <span className="text-[#10B981] font-normal">{videoFileName}</span>
                </span>
              </div>

              <button
                onClick={handleCloseVideo}
                className="px-3 py-1.5 bg-[#20293A] hover:bg-rose-950/60 text-[#94A3B8] hover:text-rose-300 border border-[#334155] hover:border-rose-700/50 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <X size={14} /> <span>Fertig / Video schließen</span>
              </button>
            </div>

            {/* Success toast inside cutter with direct jump button */}
            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-950/90 border-2 border-[#10B981] text-white rounded-xl text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-2xl animate-fadeIn">
                <div className="flex items-center gap-2 text-[#10B981]">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <span className="font-black">{saveSuccessMsg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const clipEl = highlightedClipId ? document.getElementById(`clip-${highlightedClipId}`) : null;
                      const catEl = document.getElementById(`category-section-${selectedCategory}`);
                      const target = clipEl || catEl;
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className="px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-black font-black text-xs uppercase rounded-lg shadow-md transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>👀 Zur Szene springen</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveSuccessMsg(null)}
                    className="text-slate-400 hover:text-white p-1 text-xs"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Video Player */}
            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl aspect-video max-h-[440px] flex items-center justify-center mx-auto w-full">
              {isVeoLink ? (
                /* Veo: Download instructions (inside cutter) */
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center w-full h-full bg-gradient-to-br from-[#0D1117] via-[#131A26] to-[#0D1117]">
                  <p className="text-xs text-[#94A3B8]">Veo-Video — oben zum Herunterladen</p>
                </div>
              ) : (
                /* Native video player */
                <>
                  <video
                    ref={mainVideoRef}
                    src={videoSource || undefined}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full object-contain"
                    playsInline
                  />

                  {/* Central Play/Pause Overlay indicator */}
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/10 hover:bg-black/30 transition-all group"
                  >
                    <div className="p-4 bg-black/60 group-hover:bg-[#10B981] text-white group-hover:text-black rounded-full backdrop-blur-xs transition-all shadow-xl">
                      {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
                    </div>
                  </button>
                </>
              )}

              {/* Time overlay badge (native video only) */}
              {!isVeoLink && (
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg text-[11px] font-mono font-bold text-white border border-white/10 flex items-center gap-1.5 z-10">
                  <Clock size={12} className="text-[#10B981]" />
                  <span>{formatTime(currentTime, true)} / {formatTime(videoDuration)}</span>
                </div>
              )}

              {isPreviewingCut && (
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-[#10B981]/90 text-black rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse shadow-md z-10">
                  <span>Ausschnitt-Vorschau aktiv</span>
                </div>
              )}

              {/* Once-Tagger Start Button */}
              {!isVeoLink && !taggerOpen && (
                <button
                  onClick={() => { setTaggerOpen(true); setTagTargetClipId(null); setTagBoard({ attackDirection: 'DOWN', players: [], chains: [], passes: [], runs: [], ballPath: [], zones: [], optimalPositions: [] }); setTagHistory([]); setTagRunPts([]); setTagDragStart(null); mainVideoRef.current?.pause(); }}
                  className="absolute bottom-3 right-3 px-2.5 py-1.5 bg-black/80 hover:bg-[#10B981] text-[#10B981] hover:text-black rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-[#10B981]/50 backdrop-blur-md transition-all cursor-pointer z-20"
                  title="Once-Style: direkt auf dem Video Spieler, Ketten, Räume, Pass-/Lauf-/Ballwege & optimale Positionen zeichnen"
                >
                  <Target size={13} /> 🎯 Once-Tagger
                </button>
              )}

              {/* Live Once-Tagger Overlay: direkt auf dem (pausierten) Video zeichnen */}
              {!isVeoLink && taggerOpen && (
                <>
                  {/* Zeichen-Overlay */}
                  <div
                    ref={tagContainerRef}
                    className="absolute inset-0 z-15"
                    style={{ cursor: tagTool === 'pointer' ? 'default' : 'crosshair', touchAction: 'none' }}
                    onPointerDown={tagDown}
                    onPointerMove={tagMove}
                    onPointerUp={tagUp}
                    onPointerLeave={() => { setTagDragStart(null); setTagDragEnd(null); }}
                  >
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <defs>
                        <marker id="tagArrowLive" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#3B82F6" />
                        </marker>
                      </defs>
                      {(tagBoard.chains || []).map((c, i) => (
                        <g key={`tc${i}`}>
                          <line x1={c.fromX} y1={c.fromY} x2={c.toX} y2={c.toY} stroke={c.color || '#22D3EE'} strokeWidth="5.5" opacity="0.28" strokeLinecap="round" />
                          <line x1={c.fromX} y1={c.fromY} x2={c.toX} y2={c.toY} stroke={c.color || '#22D3EE'} strokeWidth="2.4" opacity="0.95" strokeLinecap="round" />
                        </g>
                      ))}
                      {(tagBoard.ballPath || []).map((b, i) => b.points.length >= 2 ? (
                        <g key={`tb${i}`}>
                          <polyline points={b.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={b.color || '#F59E0B'} strokeWidth="3.2" opacity="0.25" strokeLinecap="round" />
                          <polyline points={b.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={b.color || '#F59E0B'} strokeWidth="1.9" strokeDasharray="2.4 1.8" opacity="0.98" strokeLinecap="round" />
                          {b.points.slice(1).map((pp, j) => <circle key={j} cx={pp.x} cy={pp.y} r="1.6" fill={b.color || '#F59E0B'} />)}
                        </g>
                      ) : null)}
                      {(tagBoard.runs || []).map((r, i) => r.points.length >= 2 ? (
                        <g key={`tr${i}`}>
                          <polyline points={r.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={r.color || '#3B82F6'} strokeWidth="3.2" opacity="0.25" strokeLinecap="round" />
                          <polyline points={r.points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={r.color || '#3B82F6'} strokeWidth="1.9" strokeDasharray="2.4 1.8" opacity="0.98" strokeLinecap="round" />
                        </g>
                      ) : null)}
                      {(tagBoard.passes || []).map((p, i) => (
                        <g key={`tp${i}`}>
                          <line x1={p.fromX} y1={p.fromY} x2={p.toX} y2={p.toY} stroke={p.color || '#3B82F6'} strokeWidth="3.0" opacity="0.3" strokeLinecap="round" />
                          <line x1={p.fromX} y1={p.fromY} x2={p.toX} y2={p.toY} stroke={p.color || '#3B82F6'} strokeWidth="1.6" opacity="0.98" markerEnd="url(#tagArrowLive)" />
                          <circle cx={p.toX} cy={p.toY} r="1.5" fill={p.color || '#3B82F6'} />
                        </g>
                      ))}
                      {(tagBoard.zones || []).map((z, i) => (
                        <g key={`tz${i}`}>
                          <rect x={z.x} y={z.y} width={z.w} height={z.h} fill={z.color || '#F59E0B'} opacity="0.3" stroke={z.color || '#F59E0B'} strokeWidth="1.1" strokeDasharray="2 1.5" rx="1" />
                          {z.label ? <text x={z.x + 1.5} y={z.y + 4.5} fontSize="5" fontWeight="900" fill={z.color || '#F59E0B'} stroke="#000000" strokeWidth="0.5" paintOrder="stroke">{z.label}</text> : null}
                        </g>
                      ))}
                      {(tagBoard.optimalPositions || []).map((o, i) => (
                        <g key={`to${i}`}>
                          <circle cx={o.toX} cy={o.toY} r="6" fill="rgba(245,158,11,0.3)" stroke="#F59E0B" strokeWidth="1.2" />
                          {o.note ? <text x={Math.min(o.toX + 6.5, 92)} y={Math.max(o.toY - 6, 5)} fontSize="4.4" fontWeight="900" fill="#FBBF24" stroke="#000000" strokeWidth="0.5" paintOrder="stroke">{o.note || 'Optimale Position'}</text> : null}
                        </g>
                      ))}
                      {(tagBoard.players || []).map((pl, i) => (
                        <g key={`tpl${i}`}>
                          <circle cx={pl.x} cy={pl.y} r="4.8" fill={pl.team === 'FC Auggen' ? '#3B82F6' : '#EF4444'} stroke="#FFFFFF" strokeWidth="1.1" />
                          <text x={pl.x} y={pl.y + 1.7} fontSize="4.2" fontWeight="900" fill="#FFFFFF" stroke="#000000" strokeWidth="0.45" paintOrder="stroke" textAnchor="middle">{pl.label}</text>
                        </g>
                      ))}
                      {tagDragStart && tagDragEnd && (tagTool === 'chain' || tagTool === 'pass' || tagTool === 'zone') && (
                        tagTool === 'zone'
                          ? <rect x={Math.min(tagDragStart.x, tagDragEnd.x)} y={Math.min(tagDragStart.y, tagDragEnd.y)} width={Math.abs(tagDragEnd.x - tagDragStart.x)} height={Math.abs(tagDragEnd.y - tagDragStart.y)} fill={tagColor} opacity="0.25" stroke={tagColor} strokeWidth="1.1" strokeDasharray="1.6 1" />
                          : <line x1={tagDragStart.x} y1={tagDragStart.y} x2={tagDragEnd.x} y2={tagDragEnd.y} stroke={tagColor} strokeWidth="1.6" strokeDasharray="1.6 1" opacity="0.95" />
                      )}
                      {tagRunPts.length > 0 && (tagTool === 'run' || tagTool === 'ball') && (
                        <polyline points={tagRunPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={tagTool === 'ball' ? '#F59E0B' : tagColor} strokeWidth="1.9" strokeDasharray="2.4 1.8" opacity="0.9" />
                      )}
                    </svg>
                  </div>

{/* Oben: Status + Speichern/Schließen */}
                  <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 flex-wrap max-w-[70%]">
                    {tagTargetClipId && (savedClips || []).find(c => c.id === tagTargetClipId) ? (
                      <span className="px-2 py-0.5 bg-[#10B981] text-black border border-[#10B981]/50 rounded-lg text-[8px] font-bold uppercase tracking-wide flex items-center gap-1">
                        <Target size={9} /> Zeichnen für: {(savedClips || []).find(c => c.id === tagTargetClipId)!.category} – {(savedClips || []).find(c => c.id === tagTargetClipId)!.title || formatTime((savedClips || []).find(c => c.id === tagTargetClipId)!.startTime)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-black/80 text-[#10B981] border border-[#10B981]/50 rounded-lg text-[8px] font-bold uppercase tracking-wide flex items-center gap-1">
                        <Target size={9} /> Once-Tagger aktiv – direkt aufs Video zeichnen
                      </span>
                    )}
                    <span className="px-2 py-1 bg-black/70 text-white/70 rounded-lg text-[10px] font-mono">{formatTime(currentTime, true)}</span>
                  </div>
                  <button
                    onClick={() => { const v = mainVideoRef.current; if (!v) return; if (v.paused) { setIsPlaying(true); void v.play(); } else { setIsPlaying(false); v.pause(); } }}
                    className="absolute top-3 right-[7.5rem] z-30 px-2.5 py-1.5 bg-black/80 hover:bg-white/20 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/20 cursor-pointer"
                    title="Video abspielen/pausieren – Zeichnungen bleiben während der Bewegung sichtbar"
                  >
                    {isPlaying ? <Pause size={12} /> : <Play size={12} />} {isPlaying ? 'Pause' : 'Spielen'}
                  </button>
                  <button
                    onClick={() => { const thumb = tagCompose(); if (thumb) handleTaggerSave(thumb, tagBoard, currentTime); }}
                    className="absolute top-3 right-12 z-30 px-2.5 py-1.5 bg-[#10B981] hover:bg-[#059669] text-black rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
                    title="Aktuelles Bild + Taktik-Elemente als Szene speichern"
                  >
                    <Save size={12} /> {tagTargetClipId ? 'In Szene speichern' : 'Als Szene speichern'}
                  </button>
                  <button
                    onClick={() => { setTaggerOpen(false); setTagTargetClipId(null); }}
                    className="absolute top-3 right-3 z-30 p-1.5 bg-black/80 hover:bg-rose-950/60 text-white rounded-lg border border-white/20 hover:border-rose-500/60 cursor-pointer"
                    title="Tagger beenden"
                  >
                    <X size={13} />
                  </button>

                  {/* Unten: Werkzeugleiste */}
                  <div className="absolute bottom-3 left-3 right-3 z-30 flex items-center gap-1.5 flex-wrap bg-black/85 backdrop-blur-md rounded-xl p-2 border border-white/10">
                    {([
                      { id: 'pointer', icon: <MousePointer2 size={13} />, label: 'Löschen' },
                      { id: 'player', icon: <Users size={13} />, label: 'Spieler' },
                      { id: 'chain', icon: <Waypoints size={13} />, label: 'Kette' },
                      { id: 'pass', icon: <MoveUpRight size={13} />, label: 'Passweg' },
                      { id: 'run', icon: <Footprints size={13} />, label: 'Laufweg' },
                      { id: 'zone', icon: <Square size={13} />, label: 'Raum' },
                      { id: 'ball', icon: <Crosshair size={13} />, label: 'Ballweg' },
                      { id: 'optimal', icon: <Target size={13} />, label: 'Optimal' },
                    ] as Array<{ id: typeof tagTool; icon: React.ReactNode; label: string }>).map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setTagTool(t.id); if (t.id !== 'run' && t.id !== 'ball') setTagRunPts([]); }}
                        title={`${t.label}${t.id === 'pointer' ? ' – Element anklicken' : ''}`}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                          tagTool === t.id ? 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/50' : 'bg-black/40 text-[#94A3B8] border-white/10 hover:text-white'
                        }`}
                      >
                        {t.icon}{t.label}
                      </button>
                    ))}
                    <div className="mx-1 h-5 w-px bg-white/15" />
                    <button onClick={tagUndo} disabled={!tagHistory.length} title="Rückgängig" className="px-2 py-1 rounded-lg bg-black/40 text-[#94A3B8] border border-white/10 hover:text-white cursor-pointer disabled:opacity-40"><Undo2 size={13} /></button>
                    <button onClick={tagClear} title="Alles löschen" className="px-2 py-1 rounded-lg bg-black/40 text-rose-400 border border-white/10 hover:bg-rose-950/60 cursor-pointer"><Eraser size={13} /></button>
                    <button onClick={tagDownloadImage} title="Annotiertes Bild mit deinen Zeichnungen als PNG speichern" className="px-2 py-1 rounded-lg bg-black/40 text-[#FBBF24] border border-[#F59E0B]/30 hover:bg-[#F59E0B]/20 cursor-pointer flex items-center gap-1"><Download size={13} /><span className="hidden sm:inline text-[10px] font-bold">Bild speichern</span></button>

                    {/* Live-Modus: Video läuft beim Zeichnen weiter */}
                    <button
                      onClick={toggleTagKeepPlaying}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border cursor-pointer transition-all ${
                        tagKeepPlaying ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50' : 'bg-black/40 text-[#94A3B8] border-white/10 hover:text-white'
                      }`}
                      title={tagKeepPlaying ? 'Live-Modus AN: Video läuft beim Zeichnen weiter' : 'Live-Modus AUS (Standard): Frame friert beim Zeichnen ein'}
                    >
                      {tagKeepPlaying ? <Pause size={13} /> : <Play size={13} />} <span className="hidden sm:inline">Live-Zeichnen</span>
                    </button>
                    <div className="mx-1 h-5 w-px bg-white/15" />

                    {/* Kontext-Optionen */}
                    {(tagTool === 'player' || tagTool === 'optimal') && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <input value={tagLabel} onChange={(e) => setTagLabel(e.target.value)} className="w-14 px-1.5 py-1 bg-black/60 border border-white/15 rounded-md text-[10px] text-white focus:outline-none focus:border-[#10B981]" placeholder="Nr." />
                      </div>
                    )}
                    {tagTool === 'player' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => setTagTeam('FC Auggen')} className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer border ${tagTeam === 'FC Auggen' ? 'bg-[#3B82F6] text-white border-[#3B82F6]' : 'bg-black/40 text-[#94A3B8] border-white/10'}`}>FCA</button>
                        <button onClick={() => setTagTeam('Gegner')} className={`px-2 py-1 rounded-md text-[10px] font-black cursor-pointer border ${tagTeam === 'Gegner' ? 'bg-rose-600 text-white border-rose-600' : 'bg-black/40 text-[#94A3B8] border-white/10'}`}>Gegner</button>
                      </div>
                    )}
                    {tagTool === 'zone' && <input value={tagZoneLabel} onChange={(e) => setTagZoneLabel(e.target.value)} className="w-36 px-1.5 py-1 bg-black/60 border border-white/15 rounded-md text-[10px] text-white focus:outline-none focus:border-[#10B981]" placeholder="Zonen-Label" />}
                    {tagTool === 'optimal' && <input value={tagOptNote} onChange={(e) => setTagOptNote(e.target.value)} className="w-52 px-1.5 py-1 bg-black/60 border border-white/15 rounded-md text-[10px] text-white focus:outline-none focus:border-[#10B981]" placeholder="Begründung" />}
                    {(tagTool === 'chain' || tagTool === 'pass' || tagTool === 'run' || tagTool === 'zone') && (
                      <div className="flex items-center gap-1 ml-1">
                        {['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#22D3EE'].map(cr => (
                          <button key={cr} onClick={() => setTagColor(cr)} className={`w-4 h-4 rounded-full border-2 cursor-pointer ${tagColor === cr ? 'border-white scale-110' : 'border-transparent opacity-70'}`} style={{ background: cr }} />
                        ))}
                      </div>
                    )}
                    {(tagTool === 'run' || tagTool === 'ball') && (
                      <div className="flex items-center gap-1.5 ml-1">
                        <span className="text-[10px] text-[#94A3B8]">{tagRunPts.length} Pkt</span>
                        <button onClick={tagFinishLine} className="px-2 py-1 rounded-md bg-[#10B981] text-black text-[10px] font-black uppercase cursor-pointer">Fertig</button>
                        <button onClick={() => setTagRunPts([])} className="px-2 py-1 rounded-md bg-black/40 text-[#94A3B8] text-[10px] font-bold border border-white/10 cursor-pointer">X</button>
                      </div>
                    )}
                    <span className="ml-auto hidden sm:flex text-[9px] text-[#64748B]">
                      {tagBoard.players?.length || 0} Spieler · {tagBoard.chains?.length || 0} Kette · {tagBoard.passes?.length || 0} Pässe · {tagBoard.zones?.length || 0} Räume
                    </span>
                  </div>
                </>
              )}

              {/* ⚡ Ultra-Overlay: KI-Tracking läuft mit dem Video mit */}
              {!isVeoLink && !taggerOpen && ultraShowForClip && (() => {
                const oc = (savedClips || []).find(c => c.id === ultraShowForClip);
                if (!oc || !oc.ultraOverlay) return null;
                const clipRel = Math.max(0, currentTime - (oc.startTime || 0));
                return (
                  <>
                    <UltraOverlaySVG overlay={oc.ultraOverlay} timeInClip={clipRel} />
                    <div className="absolute top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-fuchsia-950/80 border border-fuchsia-500/50 z-30 text-[9px] font-black uppercase tracking-widest text-fuchsia-300 flex items-center gap-1 backdrop-blur-md">
                      <Sparkles size={10} /> ⚡ Ultra-Overlay aktiv
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Interactive Timeline Scrubbing & Marker Controls (nur bei nativem Video) */}
            {!isVeoLink && (
            <div className="space-y-3 bg-[#1A2232] p-4 rounded-xl border border-[#2A3447]">
              
              {/* Scrub Slider with Cut Area Visualization */}
              <div className="relative pt-2 pb-1">
                {/* Visual marker band for cut range */}
                <div className="w-full h-2.5 bg-[#0F172A] rounded-full overflow-hidden relative border border-[#334155]">
                  {videoDuration > 0 && (
                    <div
                      className="absolute top-0 bottom-0 bg-[#10B981]/50 border-x-2 border-[#10B981]"
                      style={{
                        left: `${(cutStart / videoDuration) * 100}%`,
                        width: `${Math.max(1, ((cutEnd - cutStart) / videoDuration) * 100)}%`
                      }}
                    />
                  )}
                </div>

                <input
                  type="range"
                  min={0}
                  max={videoDuration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (mainVideoRef.current) {
                      mainVideoRef.current.currentTime = val;
                      setCurrentTime(val);
                    }
                  }}
                  className="w-full accent-[#10B981] cursor-pointer mt-1"
                />
              </div>

              {/* Control Buttons & Setting Start/End */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={togglePlay}
                    className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />} 
                    <span>{isPlaying ? 'Pause' : 'Abspielen'}</span>
                  </button>

                  <button
                    onClick={() => handleStepSeek(-1)}
                    className="px-2 py-1.5 bg-[#20293A] hover:bg-[#2A374F] text-white text-xs font-bold rounded-lg border border-[#334155] cursor-pointer"
                    title="1 Sekunde zurück"
                  >
                    -1s
                  </button>
                  <button
                    onClick={() => handleStepSeek(1)}
                    className="px-2 py-1.5 bg-[#20293A] hover:bg-[#2A374F] text-white text-xs font-bold rounded-lg border border-[#334155] cursor-pointer"
                    title="1 Sekunde vor"
                  >
                    +1s
                  </button>

                  <button
                    onClick={handlePreviewCut}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RotateCcw size={14} /> <span>Ausschnitt testen</span>
                  </button>
                </div>

                {/* Start & Ende Marker Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSetStart}
                    className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Scissors size={13} /> <span>Start hier setzen ({formatTime(currentTime)})</span>
                  </button>

                  <button
                    onClick={handleSetEnd}
                    className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/50 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Scissors size={13} /> <span>Ende hier setzen ({formatTime(currentTime)})</span>
                  </button>
                </div>
              </div>

              {/* Cut Summary Bar & Fine Tuning */}
              <div className="bg-[#111722] p-3 rounded-lg border border-[#242F42] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-[#64748B] uppercase font-bold text-[10px] block">Startpunkt</span>
                    <input 
                      type="text"
                      className="bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-white font-mono text-xs w-20 focus:outline-none focus:border-[#10B981]"
                      value={formatTime(cutStart, true)}
                      onChange={(e) => setCutStart(parseTimeInput(e.target.value))}
                    />
                  </div>
                  <div>
                    <span className="text-[#64748B] uppercase font-bold text-[10px] block">Endpunkt</span>
                    <input 
                      type="text"
                      className="bg-[#1E293B] border border-[#334155] rounded px-2 py-1 text-white font-mono text-xs w-20 focus:outline-none focus:border-[#10B981]"
                      value={formatTime(cutEnd, true)}
                      onChange={(e) => setCutEnd(parseTimeInput(e.target.value))}
                    />
                  </div>
                  <div>
                    <span className="text-[#64748B] uppercase font-bold text-[10px] block">Szenendauer</span>
                    <span className="font-mono text-white font-black text-sm">
                      {Math.max(0, Math.round((cutEnd - cutStart) * 10) / 10)} Sek.
                    </span>
                  </div>
                </div>

                {/* Schnitt-Regel-Helfer: automatischer Vorschlag nach Kategorie */}
                <div className="mt-2 pt-2 border-t border-[#1E293B] grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={applyCutRuleSuggestion}
                      className="px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Scissors size={12} /> Automatischer Schnitt-Vorschlag
                    </button>
                    {(() => {
                      const rule = CATEGORY_CUT_RULES[selectedCategory];
                      return rule ? (
                        <span className="text-[#94A3B8] text-[11px]">
                          Regel: <b className="text-white">{rule.startBefore}s vor</b> – <b className="text-white">{rule.endAfter}s nach</b> dem Kernmoment
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {CATEGORY_CUT_RULES[selectedCategory]?.subTags.map(tag => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleSubTag(tag)}
                        className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                          selectedSubTags.includes(tag)
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                            : 'bg-[#111722] text-[#94A3B8] border-[#242F42] hover:border-emerald-700/60'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category selector, Player selector & Save Button */}
                <div className="flex items-center gap-2 flex-wrap ml-auto">
                  <div>
                    <span className="text-[#64748B] uppercase font-bold text-[10px] block">Kategorie</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => handleCategoryChange(e.target.value as VideoCategory)}
                      className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg text-xs font-bold text-white uppercase focus:outline-none focus:border-[#10B981]"
                    >
                      {VIDEO_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {players.length > 0 && (
                    <div>
                      <span className="text-[#64748B] uppercase font-bold text-[10px] block">Spieler (Optional)</span>
                      <select
                        value={assignedPlayerId}
                        onChange={(e) => setAssignedPlayerId(e.target.value)}
                        className="p-2 bg-[#1E293B] border border-[#334155] rounded-lg text-xs font-bold text-white focus:outline-none focus:border-[#10B981] max-w-[160px]"
                      >
                        <option value="">-- Gesamtes Team --</option>
                        {players.map(p => {
                          const pName = 'firstName' in p ? `${p.firstName} ${p.lastName}` : (p as any).name;
                          return (
                            <option key={p.id} value={p.id}>{pName}</option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div className="self-end">
                    <button
                      onClick={handleSaveClip}
                      disabled={isCutting}
                      className="px-5 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed text-[#0A0E17] font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {isCutting ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-[#0A0E17] border-t-transparent rounded-full animate-spin" />
                          <span>Wird geschnitten…</span>
                        </>
                      ) : (
                        <>
                          <Plus size={16} /> <span>Clip speichern {videoFileRef.current ? '& schneiden' : ''}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {cutError && (
                  <div className="pt-2 text-[11px] font-semibold text-amber-300">{cutError}</div>
                )}
              </div>

              {/* Optional Note & Color marking right at cutting time */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Optionale taktische Notiz für diese Szene (kann auch später bearbeitet werden)..."
                    value={clipNoteDraft}
                    onChange={(e) => setClipNoteDraft(e.target.value)}
                    className="w-full p-2.5 bg-[#111722] border border-[#242F42] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setClipColorDraft(clipColorDraft === 'green' ? 'none' : 'green')}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      clipColorDraft === 'green' 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md' 
                        : 'bg-[#111722] text-[#94A3B8] border-[#242F42] hover:border-emerald-700/60'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Gute Aktion</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClipColorDraft(clipColorDraft === 'red' ? 'none' : 'red')}
                    className={`flex-1 py-2 px-2.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      clipColorDraft === 'red' 
                        ? 'bg-rose-950 text-rose-300 border-rose-500 shadow-md' 
                        : 'bg-[#111722] text-[#94A3B8] border-[#242F42] hover:border-rose-700/60'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Fehler</span>
                  </button>
                </div>
              </div>

            </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHRITT 2 – CLIPS PRO KATEGORIE (6 FESTE KATEGORIEN) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Layers size={18} className="text-[#10B981]" />
            <span>Kategorisierte Szenen-Sammlung ({totalClipsCount} {totalClipsCount === 1 ? 'Clip' : 'Clips'})</span>
          </h2>

          <div className="text-xs text-[#94A3B8]">
            Klicke auf eine Kategorie zum Auf- oder Zuklappen
          </div>
        </div>

        {/* Player Filter Search */}
        {totalClipsCount > 0 && (
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Nach Spieler filtern (Name oder #)..."
              value={playerFilterSearch}
              onChange={(e) => setPlayerFilterSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#0F172A] border border-[#2A3447] rounded-xl text-xs font-bold text-white placeholder-[#64748B] focus:outline-none focus:border-[#10B981] transition-all"
            />
            {playerFilterSearch && (
              <button
                onClick={() => setPlayerFilterSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {clipsLoading && (
          <div className="p-8 text-center bg-[#181C24] border border-[#2A3447] rounded-2xl text-[#94A3B8] text-sm animate-pulse">
            Szenen werden geladen...
          </div>
        )}

        {VIDEO_CATEGORIES.map((cat, index) => {
          const allCatClips = clipsByCategory[cat] || [];
          const catClips = playerFilterSearch.trim()
            ? allCatClips.filter(c => {
                const searchLower = playerFilterSearch.toLowerCase().trim();
                const nameMatch = c.assignedPlayerName?.toLowerCase().includes(searchLower);
                const numMatch = c.assignedPlayerId && players.some(
                  p => p.id === c.assignedPlayerId && String(p.number) === searchLower.replace('#', '')
                );
                return nameMatch || numMatch;
              })
            : allCatClips;
          const isOpen = openCategories[cat] ?? true;

          return (
            <div 
              key={cat}
              id={`category-section-${cat}`}
              className="bg-[#181C24] border border-[#2A3447] rounded-2xl overflow-hidden shadow-lg transition-all scroll-mt-6"
            >
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full p-4 bg-[#1F2636] hover:bg-[#252E42] transition-all flex items-center justify-between text-left cursor-pointer border-b border-[#2A3447]"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] font-black text-xs flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide">
                      {cat}
                    </h3>
                    <span className="text-[11px] text-[#94A3B8]">
                      {catClips.length} {catClips.length === 1 ? 'gespeicherte Szene' : 'gespeicherte Szenen'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Category Video Reel Button */}
                  {catClips.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartCategoryReel(cat);
                      }}
                      className="px-3 py-1 bg-[#10B981] hover:bg-[#059669] text-[#0A0E17] font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                      title={`Alle ${catClips.length} Szenen aus ${cat} nacheinander als Video abspielen`}
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Kategorie-Video ({catClips.length})</span>
                    </button>
                  )}

                  <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                    catClips.length > 0 ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40' : 'bg-[#0F172A] text-[#64748B]'
                  }`}>
                    {catClips.length} Clips
                  </span>
                  {isOpen ? <ChevronUp size={18} className="text-[#94A3B8]" /> : <ChevronDown size={18} className="text-[#94A3B8]" />}
                </div>
              </button>

              {/* Category Body / Clip List */}
              {isOpen && (
                <div className="p-4 bg-[#141A24]">
                  {/* Kriterien-Hilfe Toggle */}
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowHelpCategory(showHelpCategory === cat ? null : cat)}
                      className="flex items-center gap-1.5 text-[10px] font-bold text-[#64748B] hover:text-[#10B981] transition-colors cursor-pointer"
                    >
                      <Info size={12} />
                      <span>{showHelpCategory === cat ? 'Kriterien ausblenden' : 'Kriterien anzeigen'}</span>
                    </button>
                    {showHelpCategory === cat && CATEGORY_HELP_TEXTS[cat] && (
                      <div className="mt-2 p-3 bg-[#0F172A] border border-[#242F42] rounded-xl text-[11px] text-[#94A3B8] leading-relaxed whitespace-pre-line">
                        {CATEGORY_HELP_TEXTS[cat].body}
                      </div>
                    )}
                  </div>

                  {catClips.length === 0 ? (
                    <div className="p-6 text-center border-2 border-dashed border-[#242F42] rounded-xl text-[#64748B] text-xs space-y-1">
                      <p className="font-bold">Noch keine Szenen in dieser Kategorie vorhanden.</p>
                      <p className="text-[11px]">Lade oben ein Video hoch und schneide Ausschnitte für „{cat}".</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {catClips.map((clip) => {
                        const isHighlighted = highlightedClipId === clip.id;
                        return (
                          <div
                            key={clip.id}
                            id={`clip-${clip.id}`}
                            className={`bg-[#1A2232] rounded-xl overflow-hidden border-2 transition-all flex flex-col justify-between scroll-mt-12 ${
                              isHighlighted
                                ? 'ring-4 ring-[#10B981] ring-offset-2 ring-offset-black border-[#10B981] scale-[1.02] shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                                : clip.colorMarking === 'green'
                                  ? 'border-emerald-500/80 shadow-emerald-950/30'
                                  : clip.colorMarking === 'red'
                                    ? 'border-rose-500/80 shadow-rose-950/30'
                                    : 'border-[#2A3447]'
                            } shadow-xl`}
                          >
                            {/* Clip Thumbnail / Player Area */}
                            <div className="relative aspect-video bg-black flex items-center justify-center group overflow-hidden">
                              {clip.thumbnailUrl ? (
                                <img 
                                  src={clip.thumbnailUrl} 
                                  alt={clip.title || 'Clip Vorschau'} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <video
                                  src={clip.videoUrl}
                                  muted
                                  autoPlay={false}
                                  preload="metadata"
                                  playsInline
                                  onLoadedMetadata={(e) => {
                                    const v = e.currentTarget;
                                    const t = Number(clip.startTime) || 0;
                                    if (isFinite(t) && v.duration && t < v.duration) {
                                      v.currentTime = t;
                                    }
                                    v.pause();
                                  }}
                                  className="w-full h-full object-contain pointer-events-none"
                                />
                              )}

                              {/* Play Button Overlay */}
                              <button
                                onClick={() => setActivePlaybackClip(clip)}
                                className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all group-hover:scale-105 cursor-pointer"
                                title="Clip in voller Ansicht abspielen"
                              >
                                <div className="p-3 bg-[#10B981] text-black rounded-full shadow-2xl">
                                  <Play size={20} className="ml-0.5" />
                                </div>
                              </button>

                              {/* Duration badge */}
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 backdrop-blur-xs rounded text-[10px] font-mono font-bold text-white">
                                ⏱ {formatTime(clip.startTime)} - {formatTime(clip.endTime)} ({clip.duration}s)
                              </div>

                              {/* Player Badge if assigned */}
                              {clip.assignedPlayerName && (
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-blue-900/90 text-blue-200 border border-blue-500/50 rounded text-[9px] font-bold">
                                  👤 {clip.assignedPlayerName}
                                </div>
                              )}

                              {/* Color Status Tag */}
                              {clip.colorMarking !== 'none' && (
                                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                  clip.colorMarking === 'green' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                                }`}>
                                  {clip.colorMarking === 'green' ? '✓ Gute Aktion' : '⚠ Fehler'}
                                </div>
                              )}
                            </div>

                          {/* Tactical Note & Controls */}
                          <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] mb-1 flex items-center justify-between">
                                <span>Taktische Notiz / Erklärung</span>
                                <span className="text-[9px] text-[#64748B]">{new Date(clip.createdAt).toLocaleDateString('de-DE')}</span>
                              </div>

                              <textarea
                                rows={3}
                                placeholder="Eigene taktische Notiz hier eingeben (wird automatisch gespeichert)..."
                                defaultValue={clip.tacticalNote}
                                onBlur={(e) => handleUpdateClipNote(clip, e.target.value)}
                                className="w-full p-2 bg-[#0F172A] border border-[#2A3447] rounded-lg text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#10B981] resize-y"
                              />
                            </div>

                            {/* CoCoach-Tiefenanalyse (Maximum Information Extraction) */}
                            <TacticalAnalysisPanel clip={clip} />

                            {/* Once-Style Taktik-Grafik */}
                            <SceneTacticDiagram
                              board={clip.tacticBoard}
                              expanded={expandedTacticClipId === clip.id}
                              onToggle={() => setExpandedTacticClipId(expandedTacticClipId === clip.id ? null : clip.id)}
                            />

                            {/* Per-Szene-Once-Tagger */}
                            <button
                              type="button"
                              onClick={() => openTaggerForClip(clip)}
                              className="w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/40 hover:bg-[#10B981] hover:text-black transition-all cursor-pointer"
                              title="Once-Style: direkt auf dem Video zeichnen (springt zum Szenen-Start, speichert in diese Szene)"
                            >
                              <Target size={12} /> 🎯 Taktik direkt auf dieser Szene zeichnen
                            </button>

                            {/* ⚡ Ultra-Overlay: KI-Keyframe-Tracking für diese Szene */}
                            <button
                              type="button"
                              onClick={() => {
                                if (ultraShowForClip === clip.id) { setUltraShowForClip(null); return; }
                                if (clip.ultraOverlay) { setUltraShowForClip(clip.id); return; }
                                void handleGenerateUltraOverlay(clip);
                              }}
                              disabled={ultraLoadingId !== null}
                              className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                                ultraShowForClip === clip.id
                                  ? 'bg-fuchsia-900/30 text-fuchsia-300 border-fuchsia-500/50'
                                  : clip.ultraOverlay
                                    ? 'bg-fuchsia-950/30 text-fuchsia-400 border-fuchsia-500/40 hover:bg-fuchsia-900/40'
                                    : 'bg-[#10B981]/10 text-fuchsia-400 border-fuchsia-500/40 hover:bg-fuchsia-600 hover:text-white'
                              } ${ultraLoadingId === clip.id ? 'opacity-70 cursor-wait' : ''}`}
                              title={clip.ultraOverlay ? 'Ultra-Overlay vorhanden – ein-/ausblenden (spielt über dem Video mit)' : '⚡ Ultra-Tracking: KI erzeugt stabil verankerte Keyframe-Overlays, die sich mit Spielern & Kamera mitbewegen'}
                            >
                              {ultraLoadingId === clip.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                              {ultraLoadingId === clip.id ? 'Ultra-Tracking läuft…' : clip.ultraOverlay ? (ultraShowForClip === clip.id ? 'Ultra-Overlay aktiv' : 'Ultra-Overlay zeigen') : '⚡ Ultra-Overlay erzeugen'}
                            </button>

                            {ultraMsg?.id === clip.id && (
                              <div className="px-2 py-1.5 rounded-lg bg-fuchsia-950/20 border border-fuchsia-500/30 text-fuchsia-200 text-[9px] flex items-start gap-1.5">
                                <Sparkles size={10} className="shrink-0 mt-0.5 text-fuchsia-400" />
                                <span>{ultraMsg.text}</span>
                              </div>
                            )}
                            {ultraError?.id === clip.id && (
                              <div className="px-2 py-1.5 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-300 text-[9px] flex items-start gap-1.5">
                                <AlertTriangle size={10} className="shrink-0 mt-0.5 text-rose-400" />
                                <span>{ultraError.text}</span>
                              </div>
                            )}

                            {clip.ultraOverlay && (
                              <div className="px-2 py-1.5 rounded-lg bg-fuchsia-950/20 border border-fuchsia-500/20 space-y-1 text-[9px]">
                                <div className="font-black text-fuchsia-300 uppercase tracking-wider">⚡ Ultra-Overlay</div>
                                {clip.ultraOverlay.cameraMotion?.movement && (
                                  <div className="text-[#94A3B8]">🎥 {clip.ultraOverlay.cameraMotion.type || 'Statik'} – {clip.ultraOverlay.cameraMotion.movement}</div>
                                )}
                                <div className="text-[#94A3B8]">🎞 {(clip.ultraOverlay.keyframes || []).length} Keyframes · ⚡ stabil verankert</div>
                                {clip.ultraOverlay.summary && <div className="text-[#C4B5FD]">{clip.ultraOverlay.summary}</div>}
                                {clip.ultraOverlay.coaching && (
                                  <details className="rounded-lg bg-fuchsia-950/20 border border-fuchsia-500/20 px-2 py-1.5 space-y-1">
                                    <summary className="font-black text-fuchsia-300 uppercase tracking-wider cursor-pointer">Taktische Bedeutung ansehen</summary>
                                    {clip.ultraOverlay.coaching.tacticalInsight && <div className="text-[#C4B5FD] pt-1">{clip.ultraOverlay.coaching.tacticalInsight}</div>}
                                    {Array.isArray(clip.ultraOverlay.coaching.errors) && clip.ultraOverlay.coaching.errors.length > 0 && (
                                      <div>
                                        <div className="text-rose-400 font-black uppercase tracking-wider">Fehleranalyse</div>
                                        {clip.ultraOverlay.coaching.errors.map((e, ei) => <div key={ei} className="text-rose-200">• {e}</div>)}
                                      </div>
                                    )}
                                    {Array.isArray(clip.ultraOverlay.coaching.improvements) && clip.ultraOverlay.coaching.improvements.length > 0 && (
                                      <div>
                                        <div className="text-emerald-300 font-black uppercase tracking-wider">Verbesserung</div>
                                        {clip.ultraOverlay.coaching.improvements.map((e, ei) => <div key={ei} className="text-emerald-200">• {e}</div>)}
                                      </div>
                                    )}
                                    {Array.isArray(clip.ultraOverlay.coaching.coachingPoints) && clip.ultraOverlay.coaching.coachingPoints.length > 0 && (
                                      <div>
                                        <div className="text-amber-300 font-black uppercase tracking-wider">Coaching-Punkte</div>
                                        {clip.ultraOverlay.coaching.coachingPoints.map((e, ei) => <div key={ei} className="text-amber-200">• {e}</div>)}
                                      </div>
                                    )}
                                    {clip.ultraOverlay.coaching.importance && <div className="text-[#94A3B8] font-bold">Warum wichtig: {clip.ultraOverlay.coaching.importance}</div>}
                                  </details>
                                )}
                              </div>
                            )}

                            {/* Color Marking Selector & Delete Button */}
                            <div className="pt-2 border-t border-[#242F42] flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateClipColor(clip, clip.colorMarking === 'green' ? 'none' : 'green')}
                                  className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    clip.colorMarking === 'green'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                      : 'bg-[#0F172A] text-[#64748B] border-[#242F42] hover:text-white'
                                  }`}
                                  title="Als gute Aktion markieren"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span>Grün</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleUpdateClipColor(clip, clip.colorMarking === 'red' ? 'none' : 'red')}
                                  className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                                    clip.colorMarking === 'red'
                                      ? 'bg-rose-950 text-rose-300 border-rose-500'
                                      : 'bg-[#0F172A] text-[#64748B] border-[#242F42] hover:text-white'
                                  }`}
                                  title="Als Fehler markieren"
                                >
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                  <span>Rot</span>
                                </button>
                              </div>

                              <button
                                onClick={() => deleteClip(clip.id)}
                                className="p-1.5 text-[#94A3B8] hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                                title="Clip entfernen"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Trainer-Notiz & Taktisches Fazit zur Kategorie */}
                  <CategoryTrainerNoteCard
                    category={cat}
                    noteData={categoryNotes[cat]}
                    onSave={handleSaveCategoryNote}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SCHRITT 3 – PRÄSENTATION ERSTELLEN (BOTTOM CTA) */}
      <div className="bg-linear-to-r from-[#181C24] via-[#1E2738] to-[#181C24] border-2 border-[#10B981]/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="text-[#10B981]" size={22} />
            <span>Taktische Präsentation erstellen</span>
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1 max-w-xl">
            Generiere per Knopfdruck eine fertige Präsentation aller kategorisierten Szenen mit Vorschaubildern, Notizen und Farbauswertungen für Mannschaftsbesprechungen oder zum Teilen.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleStartMasterReel}
            disabled={totalClipsCount === 0}
            className="px-5 py-3 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-[#0A0E17] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-xl flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
            title="Alle geschnittenen Videos aller Kategorien als zusammenhängendes Gesamtanalyse-Video abspielen"
          >
            <Play size={18} fill="currentColor" />
            <span>Gesamtes Video abspielen ({totalClipsCount} Szenen)</span>
          </button>

          <button
            onClick={handleDownloadHtmlPresentation}
            disabled={totalClipsCount === 0}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
            title="Eigenständige HTML-Datei zum Versenden an Spieler & Trainer herunterladen"
          >
            <Download size={16} /> <span>HTML-Datei exportieren</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={totalClipsCount === 0}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-[#A7F3D0] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
            title="Szenen als CSV für Excel herunterladen (Trennzeichen ;)"
          >
            <Download size={16} /> <span>CSV-Export (Excel)</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={totalClipsCount === 0}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-[#93C5FD] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
            title="Alle Szenen & Trainer-Notizen als JSON-Backup sichern"
          >
            <Download size={16} /> <span>MatchIQ-Backup sichern</span>
          </button>
          <button
            onClick={() => jsonFileRef.current?.click()}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-[#FDE68A] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer shadow-md"
            title="MatchIQ-Backup (JSON) importieren"
          >
            <Upload size={16} /> <span>Backup importieren</span>
          </button>
          <button
            onClick={() => setHeatmapOpen(true)}
            disabled={totalClipsCount === 0}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-[#FCA5A5] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
            title="MatchIQ Wärmekarte – wo passiert was"
          >
            <Target size={16} /> <span>🔥 Wärmekarte</span>
          </button>

          <input ref={jsonFileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportJsonFile} />

          <button
            onClick={() => {
              setPresentationSlideIndex(0);
              setShowPresentationModal(true);
            }}
            disabled={totalClipsCount === 0}
            className="px-4 py-3 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-40 text-[#94A3B8] hover:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-[#334155] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed"
          >
            <FileText size={18} /> <span>Präsentation starten / Drucken</span>
          </button>
        </div>
        {matchiqMsg && (
          <div className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-[#20293A] border border-[#334155] text-[#FDE68A] animate-fadeIn flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            <span>{matchiqMsg}</span>
          </div>
        )}
      </div>

      {/* MODAL: MATCHIQ WÄRMEKARTE */}
      {heatmapOpen && (
        <div className="fixed inset-0 z-[310] bg-black/70 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setHeatmapOpen(false)}>
          <div className="bg-[#0B1220] border-2 border-[#334155] rounded-2xl max-w-3xl w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black uppercase tracking-wider text-white text-sm flex items-center gap-2">
                <Target size={16} className="text-red-400" /> MatchIQ Wärmekarte — wo passiert was
              </h3>
              <button onClick={() => setHeatmapOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-[11px] text-slate-400 mb-4 font-semibold">
              Halbfeld-Ansicht (Verein greift Richtung Tor). Intensität = Anzahl erfasster Szenen pro Raum aus der räumlichen Analyse ({heatMax} max).
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
              <svg viewBox="0 0 500 350" className="w-full h-auto" style={{ background: 'linear-gradient(180deg, #063826 0%, #041f15 100%)' }}>
                <rect x="10" y="10" width="480" height="330" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.4" rx="4" />
                <line x1="10" y1="340" x2="490" y2="340" stroke="#10B981" strokeWidth="1.5" opacity="0.35" />
                <rect x="175" y="10" width="150" height="50" fill="none" stroke="#10B981" strokeWidth="1.2" opacity="0.35" rx="2" />
                <circle cx="250" cy="75" r="2.5" fill="#10B981" opacity="0.5" />
                {MATCHIQ_HEAT_ZONES.map((z, i) => {
                  const cnt = heatCounts[z.key] || 0;
                  return (
                    <g key={z.key}>
                      <rect
                        x={z.x} y={z.y} width={z.w} height={z.h}
                        fill={heatColor(cnt)} rx="4"
                        stroke="#fff" strokeWidth="0.6" strokeOpacity="0.25"
                      />
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 - 3} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="black">{z.label}</text>
                      <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 12} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="black">{cnt}</text>
                    </g>
                  );
                })}
                <g transform="translate(15, 302)">
                  <rect x="0" y="0" width="470" height="28" fill="#0a0f1a" opacity="0.85" rx="4" />
                  <rect x="10" y="6" width="24" height="16" fill={heatColor(0)} rx="2" /><text x="40" y="18" fill="#aaa" fontSize="9">0</text>
                  <rect x="70" y="6" width="24" height="16" fill={heatColor(Math.ceil(heatMax / 3))} rx="2" /><text x="100" y="18" fill="#aaa" fontSize="9">1/3</text>
                  <rect x="140" y="6" width="24" height="16" fill={heatColor(Math.ceil((2 * heatMax) / 3))} rx="2" /><text x="170" y="18" fill="#aaa" fontSize="9">2/3</text>
                  <rect x="210" y="6" width="24" height="16" fill={heatColor(heatMax)} rx="2" /><text x="240" y="18" fill="#aaa" fontSize="9">Max</text>
                  <text x="300" y="18" fill="#94a3b8" fontSize="9">Szenen: {totalClipsCount}</text>
                </g>
              </svg>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {MATCHIQ_HEAT_ZONES.map((z) => {
                const cnt = heatCounts[z.key] || 0;
                return (
                  <span key={z.key} className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: heatColor(cnt) }} />
                    {z.label}: {cnt}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTINUOUS VIDEO REEL PLAYER (CATEGORY & MASTER) */}
      {reelState && (
        <VideoReelPlayerModal
          isOpen={reelState.isOpen}
          onClose={() => setReelState(null)}
          title={reelState.title}
          mode={reelState.mode}
          analysisType={analysisType}
          clips={reelState.clips}
          categoryNotes={categoryNotes}
        />
      )}

      {/* MODAL: SINGLE CLIP PLAYBACK PREVIEW */}
      <AnimatePresence>
        {activePlaybackClip && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181C24] border border-[#2A3447] rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl text-white max-h-[94vh] overflow-y-auto"
            >
              <div className="p-4 bg-[#1F2636] border-b border-[#2A3447] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">
                    {activePlaybackClip.category}
                  </span>
                  <h4 className="text-sm font-black uppercase text-white">
                    ⏱ {formatTime(activePlaybackClip.startTime)} - {formatTime(activePlaybackClip.endTime)} ({activePlaybackClip.duration} Sek.)
                  </h4>
                </div>

                <button
                  onClick={() => { const t = activePlaybackClip; setActivePlaybackClip(null); if (t) openTaggerForClip(t); }}
                  className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-black rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer mr-2 shadow-lg"
                  title="Once-Style: direkt auf dem Video zeichnen und in diese Szene speichern"
                >
                  <Target size={14} /> 🎯 Zeichnen
                </button>
                <button
                  onClick={() => setActivePlaybackClip(null)}
                  className="p-1.5 bg-[#0F172A] hover:bg-[#20293A] text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Player */}
              <div className="relative aspect-video bg-black flex items-center justify-center max-h-[48vh]">
                <video
                  ref={clipVideoRef}
                  src={activePlaybackClip.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  onLoadedMetadata={() => {
                    if (clipVideoRef.current) {
                      clipVideoRef.current.currentTime = activePlaybackClip.startTime;
                    }
                  }}
                  onTimeUpdate={() => {
                    if (clipVideoRef.current && clipVideoRef.current.currentTime >= activePlaybackClip.endTime) {
                      clipVideoRef.current.currentTime = activePlaybackClip.startTime;
                      clipVideoRef.current.play();
                    }
                  }}
                />
              </div>

              {/* Note in modal */}
              <div className="p-4 space-y-2 bg-[#141A24]">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#94A3B8]">Taktische Notiz:</div>
                <div className="p-3 bg-[#0F172A] border border-[#2A3447] rounded-xl text-xs text-[#F1F5F9] whitespace-pre-wrap">
                  {activePlaybackClip.tacticalNote || 'Keine Notiz vorhanden.'}
                </div>
                {/* CoCoach-Tiefenanalyse */}
                <TacticalAnalysisPanel clip={activePlaybackClip} />
                {/* Once-Style Taktik-Grafik */}
                <SceneTacticDiagram
                  board={activePlaybackClip.tacticBoard}
                  expanded={expandedTacticClipId === activePlaybackClip.id}
                  onToggle={() => setExpandedTacticClipId(expandedTacticClipId === activePlaybackClip.id ? null : activePlaybackClip.id)}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: FULL PRESENTATION SLIDESHOW & PDF PRINT VIEW */}
      <AnimatePresence>
        {showPresentationModal && (
          <div className="fixed inset-0 bg-black/95 z-50 flex flex-col p-2 sm:p-6 backdrop-blur-md overflow-y-auto">
            <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col bg-[#141A24] border border-[#2A3447] rounded-2xl shadow-2xl overflow-hidden">
              
              {/* Header Bar */}
              <div className="p-4 bg-[#1F2636] border-b border-[#2A3447] flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-[#10B981]/20 text-[#10B981] rounded-lg">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wide">
                      Präsentations-Modus (Foliensatz)
                    </h3>
                    <span className="text-xs text-[#94A3B8]">
                      Folie {presentationSlideIndex + 1} von {presentationSlides.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-[#20293A] hover:bg-[#2A374F] text-white border border-[#334155] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Printer size={15} /> <span>PDF / Drucken</span>
                  </button>

                  <button
                    onClick={() => setShowPresentationModal(false)}
                    className="p-2 bg-[#0F172A] hover:bg-[#20293A] text-white rounded-xl cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Slide Canvas Body */}
              <div className="flex-1 p-6 sm:p-10 flex flex-col justify-center items-center overflow-y-auto">
                {presentationSlides[presentationSlideIndex]?.type === 'title' ? (
                  // TITLE SLIDE
                  <div className="text-center space-y-6 max-w-2xl py-12">
                    <div className="w-20 h-20 bg-[#10B981]/20 border-2 border-[#10B981] text-[#10B981] rounded-3xl mx-auto flex items-center justify-center shadow-2xl">
                      <Film size={40} />
                    </div>

                    <div className="space-y-2">
                      <span className="px-3 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded-full text-xs font-black uppercase tracking-widest">
                        {clubName} • Video-Analyse
                      </span>
                      <h1 className="text-3xl sm:text-5xl font-black uppercase text-white tracking-tight">
                        Taktische Spielanalyse
                      </h1>
                      <p className="text-sm text-[#94A3B8]">
                        Erstellt am {new Date().toLocaleDateString('de-DE')} | {totalClipsCount} geschnittene Szenen
                      </p>
                    </div>

                    {/* Category overview badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4">
                      {VIDEO_CATEGORIES.map((cat, idx) => {
                        const count = (clipsByCategory[cat] || []).length;
                        return (
                          <div 
                            key={cat}
                            className={`p-2.5 rounded-xl border text-left text-xs ${
                              count > 0 ? 'bg-[#1F2636] border-[#10B981]/40 text-white' : 'bg-[#0F172A] border-[#242F42] text-[#64748B]'
                            }`}
                          >
                            <span className="font-bold block text-[10px] text-[#94A3B8]">{idx + 1}. {cat}</span>
                            <span className="font-black text-sm">{count} Clips</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // CLIP SLIDE
                  (() => {
                    const slide = presentationSlides[presentationSlideIndex] as any;
                    const clip: TacticalVideoClip = slide.clip;

                    return (
                      <div className="w-full max-w-4xl space-y-6">
                        {/* Top Category Badge & Time */}
                        <div className="flex items-center justify-between border-b border-[#2A3447] pb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-[#10B981] text-black font-black text-xs uppercase rounded-lg">
                              {clip.category}
                            </span>
                            <span className="text-sm font-bold text-white font-mono">
                              ⏱ {formatTime(clip.startTime)} - {formatTime(clip.endTime)} ({clip.duration}s)
                            </span>
                          </div>

                          {clip.colorMarking !== 'none' && (
                            <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                              clip.colorMarking === 'green' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                            }`}>
                              {clip.colorMarking === 'green' ? '✓ Gute Aktion' : '⚠ Fehler / Kritikpunkt'}
                            </span>
                          )}
                        </div>

                        {/* Slide Media Frame */}
                        <div className={`aspect-video w-full max-h-[380px] bg-black rounded-2xl overflow-hidden border-2 shadow-2xl relative mx-auto ${
                          clip.colorMarking === 'green'
                            ? 'border-emerald-500'
                            : clip.colorMarking === 'red'
                              ? 'border-rose-500'
                              : 'border-[#334155]'
                        }`}>
                          {clip.thumbnailUrl ? (
                            <img src={clip.thumbnailUrl} alt="Clip" className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#64748B]">
                              <Film size={48} />
                            </div>
                          )}
                        </div>

                        {/* Tactical Note Box on Slide */}
                        <div className="bg-[#1F2636] border border-[#2A3447] rounded-2xl p-5 shadow-lg space-y-1">
                          <div className="text-[11px] font-black uppercase tracking-widest text-[#10B981]">
                            Taktische Auswertung & Trainer-Anweisung:
                          </div>
                          <div className="text-sm sm:text-base text-[#F1F5F9] font-medium whitespace-pre-wrap leading-relaxed">
                            {clip.tacticalNote || 'Keine gesonderte Notiz für diesen Clip hinterlegt.'}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Slide Navigation Footer */}
              <div className="p-4 bg-[#1F2636] border-t border-[#2A3447] flex items-center justify-between gap-4">
                <button
                  onClick={() => setPresentationSlideIndex(prev => Math.max(0, prev - 1))}
                  disabled={presentationSlideIndex === 0}
                  className="px-4 py-2 bg-[#20293A] hover:bg-[#2A374F] disabled:opacity-30 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} /> <span>Vorherige Folie</span>
                </button>

                {/* Direct Slide Selector */}
                <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto max-w-md">
                  {presentationSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPresentationSlideIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        presentationSlideIndex === idx
                          ? 'bg-[#10B981] text-black font-black scale-110 shadow-md'
                          : 'bg-[#0F172A] text-[#94A3B8] hover:bg-[#20293A]'
                      }`}
                    >
                      {idx === 0 ? 'T' : idx}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setPresentationSlideIndex(prev => Math.min(presentationSlides.length - 1, prev + 1))}
                  disabled={presentationSlideIndex === presentationSlides.length - 1}
                  className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-30 text-[#0A0E17] font-black text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Nächste Folie</span> <ChevronRight size={16} />
                </button>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
