import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  Shield, 
  Zap, 
  TrendingUp, 
  Target, 
  Activity, 
  CheckCircle2, 
  Video, 
  Compass, 
  Tv, 
  Grid, 
  Edit,
  Edit3, 
  Save, 
  BarChart3, 
  Pencil, 
  Plus, 
  Trash2,
  Lock,
  Unlock,
  Star,
  ScanSearch,
  Layers,
  Check,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Printer,
  BookOpen,
  Crown,
  UserCheck,
  User,
  Eye,
  Users,
  CornerUpRight,
  Image as ImageIcon,
  Upload,
  Camera,
  BrainCircuit,
  ClipboardList,
  Move,
  FileText,
  RefreshCw,
  Play,
  Pause,
  Wrench,
  Loader2,
  Bot,
  Route,
  Circle,
  Repeat
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Player } from '../../types';
import { SetPieceHalfPitchEditor } from '../SetPieceHalfPitchEditor';
import { data } from '../../constants/data';
import { useClub } from '../../contexts/ClubContext';
import {
  SPIELSYSTEME,
  FOLIEN_DIAGRAMME,
  ALL_SCENARIOS,
  TacticScenario,
  ScenarioZone,
  ScenarioPlayer,
  SCENARIO_GROUP_ORDER,
} from '../../lib/tacticScenarios';
import { TacticScenarioView } from '../tactic/TacticScenarioView';
import { apiFetch } from '../../lib/apiClient';

interface Profi3DTacticBoardViewProps {
  players: Player[];
  onNavigateToVideo?: (clipId?: string) => void;
  isEditing?: boolean;
  competitiveMatches?: any[];
  testMatches?: any[];
  opponents?: any[];
  onSaveMatch?: (match: any) => Promise<void> | void;
  matchAnalyses?: any[];
  onSaveMatchAnalysis?: (analysis: any) => Promise<void> | void;
}

export type TacticFormation = '4-2-3-1' | '4-4-2' | '4-1-4-1' | '3-4-3' | string;
export type MatchPhase = 'offensiv' | 'defensiv' | 'umschalten' | 'umschalten_defensiv';
export type ViewMode = '3d_tv' | '2d_tactical' | 'comparison_4_systems';

export interface PlayerPositionNode {
  id: string;
  name: string;
  number: string;
  position: string;
  role: string;
  xPercent: number; // 0-100% on pitch
  yPercent: number; // 0-100% on pitch
  offensivX: number;
  offensivY: number;
  defensivX: number;
  defensivY: number;
  umschaltX: number;
  umschaltY: number;
  speedKmh: number;
  distanceKm: number;
  duelSuccessPercent: number;
  passAccuracyPercent: number;
  customNote?: string;
  isLocked?: boolean;
  isHighlighted?: boolean;
  markedZone?: string;
  image?: string;
}

export interface PlayerRunPath {
  id: string;
  playerId: string;
  path: Array<{ x: number; y: number }>;
  color: string; // e.g., '#0055FF' (Offensiv), '#EF4444' (Defensiv), '#F59E0B' (Umschalten)
  type?: string;
}

export interface PassStation {
  id: string;
  x: number;
  y: number;
  action: string;
}

export const PASS_ACTIONS = ['Direktpass', 'Steilpass', 'Flanke', 'Klatschball', 'Doppelpass', 'Torschuss'];

export const PASS_ACTION_COLORS: Record<string, string> = {
  Direktpass: '#22D3EE',
  Steilpass: '#FBBF24',
  Flanke: '#38BDF8',
  Klatschball: '#34D399',
  Doppelpass: '#A78BFA',
  Torschuss: '#EF4444',
};

export interface CustomFormationData {
  id: string;
  name: string;
  description?: string;
  positions: Record<string, { xPercent: number; yPercent: number }>;
  runs: PlayerRunPath[];
  zones: Array<{ playerId: string; zoneType: string; color: string }>;
  roles: Record<string, string>;
  highlightedPlayerIds: string[];
  lockedPlayerIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StandardVariant {
  id: string;
  name: string;
  type: 'ecke_offensiv' | 'ecke_defensiv' | 'freistoss_direkt' | 'freistoss_halbfeld' | 'einwurf_weit' | 'elfmeter';
  executor: string;
  keyPlayers: string;
  description: string;
  successRate: number;
  imageUrl?: string;
  aiTacticNotes?: string;
  positions: Array<{
    id: string;
    name: string;
    number: string;
    role: string;
    xPercent: number;
    yPercent: number;
  }>;
  createdAt: string;
}

const FORMATION_PRESETS: Record<string, {
  name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  winRate: number;
  xGAvg: number;
  pressingSuccess: number;
  nodes: PlayerPositionNode[];
}> = {
  '4-2-3-1': {
    name: `4-2-3-1 (Stamm-System - BESTE AUFSTELLUNG)`,
    description: 'Doppel-Sechs für optimale Absicherung, variable Flügelzange und Trequartista im Halbraum.',
    strengths: ['Maximale Mittelfeld-Kontrolle', 'Überladung der Flügelzonen', 'Schnelles Gegenpressing'],
    weaknesses: ['Lücke zwischen DM und AV bei gegnerischen Kontern'],
    winRate: 85,
    xGAvg: 2.35,
    pressingSuccess: 78,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Mitspielender Torwart', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 88, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 91, speedKmh: 24.5, distanceKm: 4.8, duelSuccessPercent: 90, passAccuracyPercent: 82 },
      { id: '2', name: 'J. Tiedemann', number: '2', position: 'RV', role: 'Offensiver Außenverteidiger', xPercent: 15, yPercent: 72, offensivX: 10, offensivY: 38, defensivX: 20, defensivY: 78, umschaltX: 12, umschaltY: 55, speedKmh: 31.8, distanceKm: 11.2, duelSuccessPercent: 78, passAccuracyPercent: 84 },
      { id: '3', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Aufbau-Innenverteidiger', xPercent: 38, yPercent: 76, offensivX: 35, offensivY: 68, defensivX: 38, defensivY: 82, umschaltX: 38, umschaltY: 74, speedKmh: 28.2, distanceKm: 9.8, duelSuccessPercent: 86, passAccuracyPercent: 91 },
      { id: '4', name: 'S. Klett', number: '5', position: 'IV', role: 'Zweikampf-Organisator', xPercent: 62, yPercent: 76, offensivX: 65, offensivY: 68, defensivX: 62, defensivY: 82, umschaltX: 62, umschaltY: 74, speedKmh: 29.1, distanceKm: 10.1, duelSuccessPercent: 88, passAccuracyPercent: 88 },
      { id: '5', name: 'F. Ritzenthaler', number: '3', position: 'LV', role: 'Invertierter Außenverteidiger', xPercent: 85, yPercent: 72, offensivX: 88, offensivY: 40, defensivX: 80, defensivY: 78, umschaltX: 86, umschaltY: 56, speedKmh: 30.5, distanceKm: 10.9, duelSuccessPercent: 74, passAccuracyPercent: 86 },
      { id: '6', name: 'Y. Kalchschmidt', number: '6', position: 'DM', role: 'Tiefen-Strategie & Abräumer', xPercent: 38, yPercent: 58, offensivX: 35, offensivY: 48, defensivX: 40, defensivY: 66, umschaltX: 38, umschaltY: 54, speedKmh: 29.8, distanceKm: 11.8, duelSuccessPercent: 82, passAccuracyPercent: 89 },
      { id: '7', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Box-to-Box Antreiber', xPercent: 62, yPercent: 52, offensivX: 60, offensivY: 34, defensivX: 60, defensivY: 64, umschaltX: 62, umschaltY: 48, speedKmh: 30.2, distanceKm: 12.1, duelSuccessPercent: 80, passAccuracyPercent: 87 },
      { id: '8', name: 'I. Valchuk', number: '7', position: 'RA', role: 'Dribbler & 1v1 Spezialist', xPercent: 18, yPercent: 32, offensivX: 15, offensivY: 18, defensivX: 25, defensivY: 52, umschaltX: 18, umschaltY: 26, speedKmh: 32.4, distanceKm: 10.8, duelSuccessPercent: 71, passAccuracyPercent: 81 },
      { id: '9', name: 'B. Dischinger', number: '10', position: 'OM', role: 'Spielmacher im Halbraum', xPercent: 50, yPercent: 35, offensivX: 50, offensivY: 22, defensivX: 50, defensivY: 54, umschaltX: 50, umschaltY: 30, speedKmh: 28.9, distanceKm: 11.0, duelSuccessPercent: 75, passAccuracyPercent: 92 },
      { id: '10', name: 'J. Ehret', number: '11', position: 'LA', role: 'Tiefensprinter & Vorbereiter', xPercent: 82, yPercent: 32, offensivX: 85, offensivY: 18, defensivX: 75, defensivY: 52, umschaltX: 82, umschaltY: 26, speedKmh: 33.1, distanceKm: 11.4, duelSuccessPercent: 69, passAccuracyPercent: 79 },
      { id: '11', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Zielspieler & Wandspieler', xPercent: 50, yPercent: 16, offensivX: 50, offensivY: 8, defensivX: 50, defensivY: 38, umschaltX: 50, umschaltY: 14, speedKmh: 31.9, distanceKm: 10.4, duelSuccessPercent: 84, passAccuracyPercent: 80 }
    ]
  },
  '4-4-2': {
    name: '4-4-2 (Kompakte Kette & Doppelspitze)',
    description: 'Zwei Viererketten halten die Abstände eng. Zielstürmer kombiniert mit schnellem Stoßstürmer.',
    strengths: ['Enorme horizontale Kompaktheit', 'Einfache Absicherung im Zentrum'],
    weaknesses: ['Weniger Anspielstationen in den Halbräumen'],
    winRate: 78,
    xGAvg: 1.95,
    pressingSuccess: 71,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Torwart', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 90, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 92, speedKmh: 24.0, distanceKm: 4.5, duelSuccessPercent: 88, passAccuracyPercent: 80 },
      { id: '2', name: 'J. Tiedemann', number: '2', position: 'RV', role: 'Außenverteidiger', xPercent: 18, yPercent: 74, offensivX: 15, offensivY: 50, defensivX: 20, defensivY: 80, umschaltX: 18, umschaltY: 62, speedKmh: 31.0, distanceKm: 10.5, duelSuccessPercent: 77, passAccuracyPercent: 82 },
      { id: '3', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Innenverteidiger', xPercent: 38, yPercent: 76, offensivX: 38, offensivY: 70, defensivX: 38, defensivY: 82, umschaltX: 38, umschaltY: 75, speedKmh: 28.0, distanceKm: 9.5, duelSuccessPercent: 85, passAccuracyPercent: 88 },
      { id: '4', name: 'S. Klett', number: '5', position: 'IV', role: 'Innenverteidiger', xPercent: 62, yPercent: 76, offensivX: 62, offensivY: 70, defensivX: 62, defensivY: 82, umschaltX: 62, umschaltY: 75, speedKmh: 29.0, distanceKm: 9.8, duelSuccessPercent: 87, passAccuracyPercent: 86 },
      { id: '5', name: 'F. Ritzenthaler', number: '3', position: 'LV', role: 'Außenverteidiger', xPercent: 82, yPercent: 74, offensivX: 85, offensivY: 50, defensivX: 80, defensivY: 80, umschaltX: 82, umschaltY: 62, speedKmh: 30.0, distanceKm: 10.2, duelSuccessPercent: 75, passAccuracyPercent: 84 },
      { id: '6', name: 'I. Valchuk', number: '7', position: 'RM', role: 'Rechter Mittelfeldspieler', xPercent: 18, yPercent: 50, offensivX: 15, offensivY: 28, defensivX: 22, defensivY: 65, umschaltX: 18, umschaltY: 42, speedKmh: 32.0, distanceKm: 11.0, duelSuccessPercent: 72, passAccuracyPercent: 80 },
      { id: '7', name: 'Y. Kalchschmidt', number: '6', position: 'ZM', role: 'Zentraler Mittelfeldspieler', xPercent: 38, yPercent: 54, offensivX: 38, offensivY: 42, defensivX: 38, defensivY: 68, umschaltX: 38, umschaltY: 52, speedKmh: 29.5, distanceKm: 11.5, duelSuccessPercent: 81, passAccuracyPercent: 88 },
      { id: '8', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Zentraler Mittelfeldspieler', xPercent: 62, yPercent: 54, offensivX: 62, offensivY: 42, defensivX: 62, defensivY: 68, umschaltX: 62, umschaltY: 52, speedKmh: 30.0, distanceKm: 11.8, duelSuccessPercent: 79, passAccuracyPercent: 86 },
      { id: '9', name: 'J. Ehret', number: '11', position: 'LM', role: 'Linker Mittelfeldspieler', xPercent: 82, yPercent: 50, offensivX: 85, offensivY: 28, defensivX: 78, defensivY: 65, umschaltX: 82, umschaltY: 42, speedKmh: 32.5, distanceKm: 11.1, duelSuccessPercent: 70, passAccuracyPercent: 78 },
      { id: '10', name: 'B. Dischinger', number: '10', position: 'ST', role: 'Hängende Spitze', xPercent: 38, yPercent: 28, offensivX: 35, offensivY: 16, defensivX: 40, defensivY: 48, umschaltX: 38, umschaltY: 28, speedKmh: 29.0, distanceKm: 10.5, duelSuccessPercent: 74, passAccuracyPercent: 90 },
      { id: '11', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Stoßstürmer', xPercent: 62, yPercent: 22, offensivX: 65, offensivY: 10, defensivX: 60, defensivY: 42, umschaltX: 62, umschaltY: 22, speedKmh: 32.0, distanceKm: 10.2, duelSuccessPercent: 83, passAccuracyPercent: 81 }
    ]
  },
  '4-1-4-1': {
    name: '4-1-4-1 (Single Pivot & Hohes Pressing)',
    description: 'Agiles Pressing-System mit extrem hoher Ballrückeroberung in der gegnerischen Hälfte.',
    strengths: ['Extrem hohes Pressing', 'Fünfer-Mittelfeldkette bei gegnerischem Aufbau'],
    weaknesses: ['Hohe physische Anforderung an den Single-Pivot (DM)'],
    winRate: 82,
    xGAvg: 2.10,
    pressingSuccess: 84,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Mitspielender TW', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 86, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 90, speedKmh: 24.5, distanceKm: 4.9, duelSuccessPercent: 90, passAccuracyPercent: 83 },
      { id: '2', name: 'J. Tiedemann', number: '2', position: 'RV', role: 'Pressing-AV', xPercent: 15, yPercent: 70, offensivX: 12, offensivY: 36, defensivX: 18, defensivY: 76, umschaltX: 15, umschaltY: 52, speedKmh: 31.5, distanceKm: 11.4, duelSuccessPercent: 79, passAccuracyPercent: 85 },
      { id: '3', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Absichernder IV', xPercent: 38, yPercent: 76, offensivX: 35, offensivY: 65, defensivX: 38, defensivY: 82, umschaltX: 38, umschaltY: 72, speedKmh: 28.5, distanceKm: 9.9, duelSuccessPercent: 88, passAccuracyPercent: 90 },
      { id: '4', name: 'S. Klett', number: '5', position: 'IV', role: 'Absichernder IV', xPercent: 62, yPercent: 76, offensivX: 65, offensivY: 65, defensivX: 62, defensivY: 82, umschaltX: 62, umschaltY: 72, speedKmh: 29.3, distanceKm: 10.3, duelSuccessPercent: 89, passAccuracyPercent: 87 },
      { id: '5', name: 'F. Ritzenthaler', number: '3', position: 'LV', role: 'Pressing-AV', xPercent: 85, yPercent: 70, offensivX: 88, offensivY: 36, defensivX: 82, defensivY: 76, umschaltX: 85, umschaltY: 52, speedKmh: 30.8, distanceKm: 11.1, duelSuccessPercent: 76, passAccuracyPercent: 85 },
      { id: '6', name: 'Y. Kalchschmidt', number: '6', position: 'DM', role: 'Single Pivot Anchor', xPercent: 50, yPercent: 62, offensivX: 50, offensivY: 52, defensivX: 50, defensivY: 70, umschaltX: 50, umschaltY: 58, speedKmh: 30.1, distanceKm: 12.4, duelSuccessPercent: 84, passAccuracyPercent: 91 },
      { id: '7', name: 'I. Valchuk', number: '7', position: 'RA', role: 'Pressing-Flügel', xPercent: 18, yPercent: 36, offensivX: 15, offensivY: 20, defensivX: 25, defensivY: 55, umschaltX: 18, umschaltY: 32, speedKmh: 32.8, distanceKm: 11.2, duelSuccessPercent: 73, passAccuracyPercent: 81 },
      { id: '8', name: 'B. Dischinger', number: '10', position: 'ZM', role: 'Achter Offensive', xPercent: 38, yPercent: 40, offensivX: 35, offensivY: 26, defensivX: 40, defensivY: 56, umschaltX: 38, umschaltY: 36, speedKmh: 29.2, distanceKm: 11.6, duelSuccessPercent: 77, passAccuracyPercent: 93 },
      { id: '9', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Achter Antreiber', xPercent: 62, yPercent: 40, offensivX: 65, offensivY: 26, defensivX: 60, defensivY: 56, umschaltX: 62, umschaltY: 36, speedKmh: 30.5, distanceKm: 12.0, duelSuccessPercent: 81, passAccuracyPercent: 88 },
      { id: '10', name: 'J. Ehret', number: '11', position: 'LA', role: 'Pressing-Flügel', xPercent: 82, yPercent: 36, offensivX: 85, offensivY: 20, defensivX: 75, defensivY: 55, umschaltX: 82, umschaltY: 32, speedKmh: 33.3, distanceKm: 11.6, duelSuccessPercent: 71, passAccuracyPercent: 80 },
      { id: '11', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Pressing-Auslöser (Anläufer)', xPercent: 50, yPercent: 18, offensivX: 50, offensivY: 8, defensivX: 50, defensivY: 40, umschaltX: 50, umschaltY: 18, speedKmh: 32.2, distanceKm: 10.9, duelSuccessPercent: 85, passAccuracyPercent: 81 }
    ]
  },
  '3-4-3': {
    name: '3-4-3 (Dreierkette & Schienenspieler)',
    description: 'Dominantes Flügelspiel mit 2 hoch stehenden Schienenspielern und 3er-Sturmreihe.',
    strengths: ['Maximale Breite im Spielaufbau', '3er-Sturm erzeugt ständige Überzahl'],
    weaknesses: ['Anfällig auf den Außenbahn-Räumen hinter den Schienenspielern'],
    winRate: 80,
    xGAvg: 2.18,
    pressingSuccess: 76,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Mitspielender TW', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 88, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 91, speedKmh: 24.2, distanceKm: 4.7, duelSuccessPercent: 89, passAccuracyPercent: 81 },
      { id: '2', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Linker IV (Halbraum)', xPercent: 25, yPercent: 78, offensivX: 22, offensivY: 68, defensivX: 25, defensivY: 84, umschaltX: 25, umschaltY: 76, speedKmh: 28.3, distanceKm: 9.7, duelSuccessPercent: 86, passAccuracyPercent: 91 },
      { id: '3', name: 'S. Klett', number: '5', position: 'IV', role: 'Zentraler IV (Libero)', xPercent: 50, yPercent: 80, offensivX: 50, offensivY: 72, defensivX: 50, defensivY: 85, umschaltX: 50, umschaltY: 78, speedKmh: 29.2, distanceKm: 9.9, duelSuccessPercent: 89, passAccuracyPercent: 89 },
      { id: '4', name: 'J. Tiedemann', number: '2', position: 'IV', role: 'Rechter IV (Halbraum)', xPercent: 75, yPercent: 78, offensivX: 78, offensivY: 68, defensivX: 75, defensivY: 84, umschaltX: 75, umschaltY: 76, speedKmh: 31.2, distanceKm: 10.6, duelSuccessPercent: 81, passAccuracyPercent: 86 },
      { id: '5', name: 'I. Valchuk', number: '7', position: 'RAV', role: 'Schienenspieler Rechts', xPercent: 12, yPercent: 52, offensivX: 8, offensivY: 25, defensivX: 15, defensivY: 72, umschaltX: 10, umschaltY: 44, speedKmh: 33.0, distanceKm: 12.6, duelSuccessPercent: 75, passAccuracyPercent: 82 },
      { id: '6', name: 'Y. Kalchschmidt', number: '6', position: 'ZM', role: 'Strategischer ZM', xPercent: 38, yPercent: 56, offensivX: 36, offensivY: 44, defensivX: 38, defensivY: 68, umschaltX: 38, umschaltY: 54, speedKmh: 29.9, distanceKm: 11.9, duelSuccessPercent: 83, passAccuracyPercent: 90 },
      { id: '7', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Dynamischer ZM', xPercent: 62, yPercent: 56, offensivX: 64, offensivY: 44, defensivX: 62, defensivY: 68, umschaltX: 62, umschaltY: 54, speedKmh: 30.4, distanceKm: 12.2, duelSuccessPercent: 80, passAccuracyPercent: 87 },
      { id: '8', name: 'F. Ritzenthaler', number: '3', position: 'LAV', role: 'Schienenspieler Links', xPercent: 88, yPercent: 52, offensivX: 92, offensivY: 25, defensivX: 85, defensivY: 72, umschaltX: 90, umschaltY: 44, speedKmh: 31.4, distanceKm: 12.3, duelSuccessPercent: 76, passAccuracyPercent: 84 },
      { id: '9', name: 'B. Dischinger', number: '10', position: 'RF', role: 'Rechter Flügelstürmer', xPercent: 25, yPercent: 30, offensivX: 22, offensivY: 16, defensivX: 30, defensivY: 50, umschaltX: 25, umschaltY: 26, speedKmh: 29.1, distanceKm: 10.9, duelSuccessPercent: 76, passAccuracyPercent: 92 },
      { id: '10', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Zentraler Mittelstürmer', xPercent: 50, yPercent: 20, offensivX: 50, offensivY: 8, defensivX: 50, defensivY: 42, umschaltX: 50, umschaltY: 16, speedKmh: 32.1, distanceKm: 10.5, duelSuccessPercent: 86, passAccuracyPercent: 82 },
      { id: '11', name: 'J. Ehret', number: '11', position: 'LF', role: 'Linker Flügelstürmer', xPercent: 75, yPercent: 30, offensivX: 78, offensivY: 16, defensivX: 70, defensivY: 50, umschaltX: 75, umschaltY: 26, speedKmh: 33.2, distanceKm: 11.3, duelSuccessPercent: 71, passAccuracyPercent: 80 }
    ]
  },
  '4-3-3': {
    name: '4-3-3 (Doppel-Achter & Sturm-Dreieck)',
    description: 'Mittelfeld-Trio mit defensiver 6 und zwei Achter, flexible 3er-Sturmreihe mit breiter Tiefe.',
    strengths: ['Überzahl im Zentrum', 'Variantenreicher Flügelangriff über die Achter', 'Hohe Positionsrochade'],
    weaknesses: ['Nach Ballverlust offen auf den Flügeln'],
    winRate: 81,
    xGAvg: 2.2,
    pressingSuccess: 79,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Mitspielender TW', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 87, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 91, speedKmh: 24.5, distanceKm: 4.8, duelSuccessPercent: 90, passAccuracyPercent: 82 },
      { id: '2', name: 'J. Tiedemann', number: '2', position: 'RV', role: 'Offensiver AV', xPercent: 14, yPercent: 71, offensivX: 10, offensivY: 36, defensivX: 19, defensivY: 77, umschaltX: 13, umschaltY: 54, speedKmh: 31.8, distanceKm: 11.3, duelSuccessPercent: 78, passAccuracyPercent: 84 },
      { id: '3', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Aufbau-IV', xPercent: 40, yPercent: 76, offensivX: 38, offensivY: 67, defensivX: 38, defensivY: 82, umschaltX: 40, umschaltY: 74, speedKmh: 28.2, distanceKm: 9.8, duelSuccessPercent: 86, passAccuracyPercent: 91 },
      { id: '4', name: 'S. Klett', number: '5', position: 'IV', role: 'Zweikampf-IV', xPercent: 60, yPercent: 76, offensivX: 62, offensivY: 67, defensivX: 62, defensivY: 82, umschaltX: 60, umschaltY: 74, speedKmh: 29.1, distanceKm: 10.1, duelSuccessPercent: 88, passAccuracyPercent: 88 },
      { id: '5', name: 'F. Ritzenthaler', number: '3', position: 'LV', role: 'Offensiver AV', xPercent: 86, yPercent: 71, offensivX: 90, offensivY: 36, defensivX: 81, defensivY: 77, umschaltX: 87, umschaltY: 54, speedKmh: 30.5, distanceKm: 10.9, duelSuccessPercent: 74, passAccuracyPercent: 86 },
      { id: '6', name: 'Y. Kalchschmidt', number: '6', position: 'DM', role: 'Absichernde 6', xPercent: 50, yPercent: 58, offensivX: 50, offensivY: 48, defensivX: 50, defensivY: 68, umschaltX: 50, umschaltY: 56, speedKmh: 29.8, distanceKm: 11.9, duelSuccessPercent: 83, passAccuracyPercent: 90 },
      { id: '7', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Rechter Achter', xPercent: 32, yPercent: 42, offensivX: 28, offensivY: 26, defensivX: 35, defensivY: 60, umschaltX: 32, umschaltY: 40, speedKmh: 30.2, distanceKm: 12.1, duelSuccessPercent: 81, passAccuracyPercent: 88 },
      { id: '8', name: 'I. Valchuk', number: '7', position: 'ZM', role: 'Linker Achter', xPercent: 68, yPercent: 42, offensivX: 72, offensivY: 26, defensivX: 65, defensivY: 60, umschaltX: 68, umschaltY: 40, speedKmh: 32.4, distanceKm: 11.6, duelSuccessPercent: 77, passAccuracyPercent: 83 },
      { id: '9', name: 'B. Dischinger', number: '10', position: 'RA', role: 'Dribbler & Vorbereiter', xPercent: 18, yPercent: 28, offensivX: 15, offensivY: 15, defensivX: 25, defensivY: 50, umschaltX: 18, umschaltY: 24, speedKmh: 29.0, distanceKm: 11.0, duelSuccessPercent: 76, passAccuracyPercent: 90 },
      { id: '10', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Zentrum-Stürmer', xPercent: 50, yPercent: 20, offensivX: 50, offensivY: 8, defensivX: 50, defensivY: 40, umschaltX: 50, umschaltY: 16, speedKmh: 31.9, distanceKm: 10.4, duelSuccessPercent: 85, passAccuracyPercent: 81 },
      { id: '11', name: 'J. Ehret', number: '11', position: 'LA', role: 'Tiefensprinter', xPercent: 82, yPercent: 28, offensivX: 85, offensivY: 15, defensivX: 75, defensivY: 50, umschaltX: 82, umschaltY: 24, speedKmh: 33.1, distanceKm: 11.4, duelSuccessPercent: 69, passAccuracyPercent: 79 }
    ]
  },
  '3-5-2': {
    name: '3-5-2 (Dreierkette & Fünfer-Mittelfeld)',
    description: 'Fünfer-Mittelfeld mit Schienenspielern überflügelt die Ketten und unterstützt die Doppelspitze.',
    strengths: ['Kompakte Mitte & Überzahl im Zentrum', 'Schienenspieler erzeugen Breite', 'Doppelspitze in der Box'],
    weaknesses: ['Räume zwischen den Schienenspielern und der Dreierkette'],
    winRate: 79,
    xGAvg: 2.05,
    pressingSuccess: 75,
    nodes: [
      { id: '1', name: 'L. Schneider', number: '1', position: 'TW', role: 'Mitspielender TW', xPercent: 50, yPercent: 92, offensivX: 50, offensivY: 88, defensivX: 50, defensivY: 95, umschaltX: 50, umschaltY: 91, speedKmh: 24.4, distanceKm: 4.8, duelSuccessPercent: 89, passAccuracyPercent: 82 },
      { id: '2', name: 'M. Paolillo', number: '4', position: 'IV', role: 'Linker IV (Halbraum)', xPercent: 28, yPercent: 78, offensivX: 26, offensivY: 66, defensivX: 28, defensivY: 84, umschaltX: 28, umschaltY: 74, speedKmh: 28.3, distanceKm: 9.8, duelSuccessPercent: 86, passAccuracyPercent: 90 },
      { id: '3', name: 'S. Klett', number: '5', position: 'IV', role: 'Zentraler IV (Libero)', xPercent: 50, yPercent: 80, offensivX: 50, offensivY: 70, defensivX: 50, defensivY: 85, umschaltX: 50, umschaltY: 76, speedKmh: 29.2, distanceKm: 10.0, duelSuccessPercent: 89, passAccuracyPercent: 89 },
      { id: '4', name: 'J. Tiedemann', number: '2', position: 'IV', role: 'Rechter IV (Halbraum)', xPercent: 72, yPercent: 78, offensivX: 74, offensivY: 66, defensivX: 72, defensivY: 84, umschaltX: 72, umschaltY: 74, speedKmh: 31.2, distanceKm: 10.7, duelSuccessPercent: 82, passAccuracyPercent: 86 },
      { id: '5', name: 'I. Valchuk', number: '7', position: 'RV', role: 'Schienenspieler Rechts', xPercent: 14, yPercent: 54, offensivX: 10, offensivY: 24, defensivX: 18, defensivY: 74, umschaltX: 12, umschaltY: 44, speedKmh: 33.0, distanceKm: 12.6, duelSuccessPercent: 75, passAccuracyPercent: 83 },
      { id: '6', name: 'Y. Kalchschmidt', number: '6', position: 'ZM', role: 'Strategischer ZM', xPercent: 50, yPercent: 56, offensivX: 50, offensivY: 44, defensivX: 50, defensivY: 68, umschaltX: 50, umschaltY: 54, speedKmh: 29.9, distanceKm: 11.9, duelSuccessPercent: 83, passAccuracyPercent: 90 },
      { id: '7', name: 'A. Boutagrat', number: '8', position: 'ZM', role: 'Dynamischer ZM', xPercent: 50, yPercent: 46, offensivX: 50, offensivY: 34, defensivX: 50, defensivY: 62, umschaltX: 50, umschaltY: 42, speedKmh: 30.4, distanceKm: 12.2, duelSuccessPercent: 81, passAccuracyPercent: 88 },
      { id: '8', name: 'F. Ritzenthaler', number: '3', position: 'LV', role: 'Schienenspieler Links', xPercent: 86, yPercent: 54, offensivX: 90, offensivY: 24, defensivX: 82, defensivY: 74, umschaltX: 88, umschaltY: 44, speedKmh: 31.4, distanceKm: 12.3, duelSuccessPercent: 76, passAccuracyPercent: 84 },
      { id: '9', name: 'J. Akuegwu', number: '9', position: 'ST', role: 'Stoßstürmer', xPercent: 38, yPercent: 22, offensivX: 36, offensivY: 10, defensivX: 40, defensivY: 44, umschaltX: 38, umschaltY: 20, speedKmh: 32.1, distanceKm: 10.5, duelSuccessPercent: 86, passAccuracyPercent: 82 },
      { id: '10', name: 'B. Dischinger', number: '10', position: 'ST', role: 'Hängende Spitze', xPercent: 62, yPercent: 28, offensivX: 66, offensivY: 16, defensivX: 62, defensivY: 50, umschaltX: 62, umschaltY: 28, speedKmh: 29.2, distanceKm: 10.9, duelSuccessPercent: 77, passAccuracyPercent: 91 },
      { id: '11', name: 'J. Ehret', number: '11', position: 'LA', role: 'Tiefensprinter im Angriff', xPercent: 62, yPercent: 20, offensivX: 66, offensivY: 9, defensivX: 62, defensivY: 42, umschaltX: 62, umschaltY: 18, speedKmh: 33.2, distanceKm: 11.5, duelSuccessPercent: 71, passAccuracyPercent: 80 }
    ]
  }
};

const PREDEFINED_ROLES = [
  '6er', '8er', '10er', 'Außenbahn', 'Stoßstürmer', 
  'Wandspieler', 'Abräumer', 'Invertierter AV', 'Schienenspieler', 'Flügelstürmer'
];

const PREDEFINED_ZONES = [
  { name: 'Keine', color: 'transparent' },
  { name: 'Pressing-Zone', color: 'rgba(239, 68, 68, 0.25)' },
  { name: 'Halbraum', color: 'rgba(245, 158, 11, 0.25)' },
  { name: 'Flügel-Überladung', color: 'rgba(59, 130, 246, 0.25)' },
  { name: 'Sturmbox', color: 'rgba(16, 185, 129, 0.25)' }
];

export const Profi3DTacticBoardView: React.FC<Profi3DTacticBoardViewProps> = ({
  players,
  onNavigateToVideo,
  isEditing = false,
  competitiveMatches,
  testMatches,
  opponents,
  onSaveMatch,
  matchAnalyses,
  onSaveMatchAnalysis
}) => {
  const { activeClub } = useClub();

  const clubLogoUrl = activeClub?.logo || (activeClub?.id === 'fc-auggen' ? '/logos/fc-auggen.png' : '');

  const renderClubLogo = (size: number, extraClass = '', ring = false) => {
    const initial = (activeClub?.shortName || activeClub?.name || 'FCA').trim().charAt(0).toUpperCase();
    const ringCls = ring ? ` border-4 border-white/40 shadow-2xl` : ' border border-white/10 shadow-xl';
    const base = `rounded-full bg-gradient-to-br from-[#e94560] to-[#7a0f26] text-white flex items-center justify-center font-black shrink-0 overflow-hidden select-none ${ringCls} ${extraClass}`;
    if (clubLogoUrl) {
      return (
        <img
          src={clubLogoUrl}
          alt={activeClub?.name || 'Verein'}
          className={`object-cover ${base}`}
          style={{ width: size, height: size }}
        />
      );
    }
    return (
      <div className={base} style={{ width: size, height: size, fontSize: size * 0.42 }}>
        {initial}
      </div>
    );
  };

  const [trainerEditMode, setTrainerEditMode] = useState<boolean>(isEditing);

  useEffect(() => {
    setTrainerEditMode(isEditing);
  }, [isEditing]);

  const [selectedFormation, setSelectedFormation] = useState<TacticFormation>('4-2-3-1');
  const [activePhase, setActivePhase] = useState<MatchPhase>('offensiv');
  const [viewMode, setViewMode] = useState<ViewMode>('3d_tv');
  const [showZonesGrid, setShowZonesGrid] = useState<boolean>(true);
  const [showDarstellungsOptionen, setShowDarstellungsOptionen] = useState<boolean>(true);
  const [showHeatmaps, setShowHeatmaps] = useState<boolean>(true);
  const [showRunVectors, setShowRunVectors] = useState<boolean>(true);
  const [ballMode, setBallMode] = useState(false);
  const [ballCount, setBallCount] = useState(11);
  const [ballPositions, setBallPositions] = useState<Array<{ playerId: string; x: number; y: number }>>([]);
  const [draggingBallId, setDraggingBallId] = useState<string | null>(null);

  const toggleBallMode = (count: number) => {
    if (ballMode && ballCount === count) {
      setBallMode(false);
      setBallPositions([]);
      setShowRunVectors(true);
      return;
    }
    setBallCount(count);
    setBallMode(true);
    setShowRunVectors(false);
    const init = currentNodePositions.slice(0, count).map(p => ({ playerId: p.id, x: p.currentX, y: p.currentY }));
    setBallPositions(init);
  };

  // ═══════════════════════════════════════════════════════════════
  // SIMULATION: Gegner + Freihand-Laufwege + Abspielen-Animation
  // ═══════════════════════════════════════════════════════════════
  const defaultOpponents = [
    { id: 'opp_tw', number: '1', name: 'GK', x: 92, y: 50 },
    { id: 'opp_rv', number: '2', name: 'RV', x: 72, y: 15 },
    { id: 'opp_iv1', number: '4', name: 'IV', x: 76, y: 38 },
    { id: 'opp_iv2', number: '5', name: 'IV', x: 76, y: 62 },
    { id: 'opp_lv', number: '3', name: 'LV', x: 72, y: 85 },
    { id: 'opp_dm', number: '6', name: 'DM', x: 58, y: 38 },
    { id: 'opp_zm1', number: '8', name: 'ZM', x: 55, y: 50 },
    { id: 'opp_zm2', number: '10', name: 'OM', x: 55, y: 62 },
    { id: 'opp_ra', number: '7', name: 'RA', x: 40, y: 18 },
    { id: 'opp_la', number: '11', name: 'LA', x: 40, y: 82 },
    { id: 'opp_st', number: '9', name: 'ST', x: 42, y: 50 },
  ];
  const [opponentPlayers, setOpponentPlayers] = useState(defaultOpponents);
  const [draggingOppId, setDraggingOppId] = useState<string | null>(null);
  const [showOpponents, setShowOpponents] = useState(false);

  // Freihand-Zeichnen
  const [freeDrawMode, setFreeDrawMode] = useState(false);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState<Array<{ id: string; points: Array<{ x: number; y: number }>; color: string; playerId?: string }>>([]);
  const [currentDrawPoints, setCurrentDrawPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [drawColor, setDrawColor] = useState('#3B82F6');

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const [animPaused, setAnimPaused] = useState(false);
  const animRef = useRef<number | null>(null);
  const animProgressRef = useRef(0);
  const animLastTimeRef = useRef<number>(0);
  // Eigenes Spieler-Moving overlay während der Freihand-Pfad-Animation
  const [animatedPlayerPositions, setAnimatedPlayerPositions] = useState<Record<string, { x: number; y: number }>>({});

  // STUFE 4: Passstafette (Pass-Sequenz)
  const [passMode, setPassMode] = useState(false);
  const [passStations, setPassStations] = useState<PassStation[]>([]);
  const [passAction, setPassAction] = useState('Direktpass');
  const [passBallPos, setPassBallPos] = useState<{ x: number; y: number } | null>(null);

  // SEQUENZ-MODUS: erst Laufweg (ohne Ball), dann Passweg, dann alles
  const [seqRunning, setSeqRunning] = useState(false);
  const [seqPhase, setSeqPhase] = useState<null | 'lauf' | 'pass' | 'alles'>(null);
  const [seqProgress, setSeqProgress] = useState(0);
  const seqRef = useRef<number | null>(null);
  const seqProgressRef = useRef(0);
  const seqLastTimeRef = useRef(0);
  const seqPhaseRef = useRef<null | 'lauf' | 'pass' | 'alles'>(null);
  const seqOrderRef = useRef<Array<'lauf' | 'pass' | 'alles'>>([]);
  const seqIdxRef = useRef(0);

  // ═══════════════════════════════════════════════════════════════
  // CHAMPIONS LEAGUE-AUFFÜHRUNG: Spieler-Karten fahren nacheinander ein
  // ═══════════════════════════════════════════════════════════════
  const [showChampionsAnimation, setShowChampionsAnimation] = useState(false);
  const [championsStarted, setChampionsStarted] = useState(false);
  const [championsActiveCount, setChampionsActiveCount] = useState(0);
  const [champPaused, setChampPaused] = useState(false);
  const [champPhase, setChampPhase] = useState<'big' | 'note' | 'place'>('big');
  const [champNoteOpen, setChampNoteOpen] = useState(false);
  const championsTotal = 11;

  // Positionsspezifische Trainer-Notiz (Anweisung: was der Spieler machen muss / nicht darf)
  const champInstruction: Record<string, string> = {
    TW: 'Spielaufbau via kurze Pässe auf die IV. Nicht lang schlagen außer unter Pressingdruck. Stets als letzter Mann Position halten.',
    IV: 'Kompakte Kette, Innenbahn schließen. Nicht zu früh aussteigen — nur mit Absicherung ins Zweikampf gehen. Aufbau unterstützen.',
    RV: 'Schneller Vorstoß bei Ballbesitz, hohe Position. Bei Ballverlust sofort zurück in die Zone vor die Kette.',
    LV: 'Invers einrücken. Bälle von außen nach innen spielen, nicht den Flügel allein lassen.',
    DM: 'Balance zwischen Absicherung und Anspielstation. Kein Ballverlust im Aufbau — Gefahr von Kontern.',
    ZM: 'Zwischen den Linien anbieten, Halbraum besetzen. Tempo-Wechsel forcieren, entscheidender letzter Pass.',
    OM: 'Zwischen den Linien, Drehungen in die Tiefe. Räume zwischen gegnerischem Mittelfeld und Abwehr nutzen.',
    RA: 'Überlaufen des Außenverteidigers, früh flanken oder in die Box ziehen. Bei Verlust sofort Gegenpressing.',
    LA: 'Invers ins Zentrum, Abschluss aus der zweiten Reihe. Den schwachen Fuß des Gegners ausnutzen.',
    ST: 'Gegnerische IV binden, Räume durch Tiefenläufe öffnen. Abschluss aus der Box, nicht abwartend.',
    ETW: 'Ersatztorwart — warm bleiben, defensiv helfen bei Standards.',
  };
  const champInstructionFor = (p: any) =>
    champInstruction[(p.position || p.role || '').toUpperCase()] ||
    `${p.name} (${p.position || 'Feldspieler'}): Konsequent die Position halten und die taktische Vorgabe des Trainers umsetzen.`;

  const championFocusIndex = championsActiveCount;

  // Ablauf pro Spieler: von oben groß runter (max. 3s) → Trainer-Notiz (max. 3s) → klein auf Position
  useEffect(() => {
    if (!showChampionsAnimation) return;
    if (championsActiveCount >= championsTotal) return;
    if (champPaused) return;

    let t: ReturnType<typeof setTimeout> | undefined;
    if (champPhase === 'big') {
      // Großes Bild von oben in die Mitte lassen (falls Trainer nicht vorher „Weiter“ drückt)
      t = setTimeout(() => setChampPhase('note'), 3000);
    } else if (champPhase === 'note') {
      // Notiz anzeigen; falls Trainer nicht vorher weiterdrückt, automatisch nach max. 3s platzieren
      t = setTimeout(() => {
        setChampNoteOpen(false);
        setChampPhase('place');
      }, 3000);
    } else if (champPhase === 'place') {
      // Spieler wird klein auf seiner Position platziert, dann nächster Spieler
      t = setTimeout(() => {
        setChampionsActiveCount((c) => c + 1);
        setChampPhase('big');
        setChampNoteOpen(false);
        setChampPaused(false);
      }, 700);
    }
    return () => { if (t) clearTimeout(t); };
  }, [showChampionsAnimation, championsActiveCount, champPhase, champPaused, championsTotal]);

  const champSkip = useCallback(() => {
    if (champPhase === 'big') {
      setChampPhase('note');
    } else if (champPhase === 'note') {
      setChampNoteOpen(false);
      setChampPhase('place');
    }
  }, [champPhase]);

  const startChampions = useCallback(() => {
    setShowChampionsAnimation(true);
    setChampionsStarted(true);
    setChampionsActiveCount(0);
    setChampPhase('big');
    setChampPaused(false);
    setChampNoteOpen(false);
  }, []);

  const replayChampions = useCallback(() => {
    setChampionsActiveCount(0);
    setChampPhase('big');
    setChampPaused(false);
    setChampNoteOpen(false);
    setChampionsStarted(true);
  }, []);

  const closeChampions = useCallback(() => {
    setShowChampionsAnimation(false);
    setChampionsStarted(false);
    setChampionsActiveCount(0);
    setChampPhase('big');
    setChampPaused(false);
    setChampNoteOpen(false);
  }, []);

  const champSkipNote = useCallback(() => {
    setChampNoteOpen(false);
    setChampPhase('place');
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showChampionsAnimation) closeChampions();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [showChampionsAnimation, closeChampions]);


  const pointAlongPathsForProgress = (points: Array<{ x: number; y: number }>, t: number) => {
    if (!points || points.length < 2) return null;
    const total = points.length - 1;
    const seg = Math.min(t * total, total - 1);
    const i0 = Math.floor(seg);
    const local = seg - i0;
    const a = points[i0], b = points[i0 + 1];
    return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // Gegner auf Pfad animieren (einfache Zielbewegung)
  const opponentTargetPositions: Record<string, { x: number; y: number }> = {
    opp_tw: { x: 88, y: 50 }, opp_rv: { x: 58, y: 12 }, opp_iv1: { x: 62, y: 35 },
    opp_iv2: { x: 62, y: 65 }, opp_lv: { x: 58, y: 88 }, opp_dm: { x: 46, y: 40 },
    opp_zm1: { x: 44, y: 50 }, opp_zm2: { x: 44, y: 60 }, opp_ra: { x: 35, y: 15 },
    opp_la: { x: 35, y: 85 }, opp_st: { x: 32, y: 50 },
  };
  const [isTvMode, setIsTvMode] = useState<boolean>(false);
  const [isPitchOnlyFullscreen, setIsPitchOnlyFullscreen] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Dynamische Formation-Overlays: Spieler des aktiven Vereins werden den Formation-Positionen zugeordnet
  const liveFormations = useMemo(() => {
    const squad = (players || []).filter((p: any) => p.category === 'player');
    if (squad.length === 0) return FORMATION_PRESETS;

    const used = new Set<string>();
    const shortName = (p: any) => {
      const fn = (p.firstName || '').trim();
      const ln = (p.lastName || '').trim();
      return fn && ln ? `${fn.charAt(0)}. ${ln}` : ln || fn || '?';
    };

    // Startelf aus dem letzten Spielbericht (startingLineup) hat Vorrang vor der Positions-Zuordnung.
    const parseReportNames = (v: any): string[] => {
      const raw: string[] = Array.isArray(v) ? v.map(String) : String(v || '').split(/[,;\n]+/);
      const names: string[] = [];
      raw.forEach((entry: string) => {
        const cleaned = String(entry)
          .replace(/\s*\([\s\S]*?\)\s*/g, ' ')
          .replace(/^\s*[\d]+[\.\)]?\s*/, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!cleaned) return;
        names.push(cleaned.replace(/[.,'"]/g, ''));
      });
      return names;
    };
    const matchReportName = (p: any, name: string) => {
      const full = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
      const ln = name.toLowerCase();
      const pl = `${p.lastName || p.name || ''}`.toLowerCase();
      return full.includes(ln) || ln.includes(pl) || full.includes(ln.replace(/^[a-z]\.?\s*/, ''));
    };
    const latestReport = [...(matchAnalyses || [])]
      .filter((a: any) => a && a.startingLineup && String(a.startingLineup).trim().length > 0)
      .sort((a: any, b: any) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))[0];
    const reportPool: Player[] = [];
    if (latestReport) {
      const usedInReport = new Set<string>();
      parseReportNames(latestReport.startingLineup).forEach((n) => {
        const found = squad.find((p: any) => !usedInReport.has(p.id) && matchReportName(p, n));
        if (found) { usedInReport.add(found.id); reportPool.push(found); }
      });
    }
    const reportIds = new Set<string>(reportPool.map((p: any) => p.id));

    const pickFor = (targetPos: string) => {
      const tp = targetPos.toUpperCase();
      const exact = squad.find((p: any) => !used.has(p.id) && !reportIds.has(p.id) && (p.position || '').toUpperCase() === tp);
      if (exact) { used.add(exact.id); return exact; }
      const contains = squad.find((p: any) => !used.has(p.id) && !reportIds.has(p.id) && (p.position || '').toUpperCase().includes(tp));
      if (contains) { used.add(contains.id); return contains; }
      const multiPos = squad.find((p: any) => {
        if (used.has(p.id) || reportIds.has(p.id)) return false;
        const parts = (p.position || '').toUpperCase().split(/[\/\s]+/);
        return parts.some((part: string) => part === tp || part.includes(tp));
      });
      if (multiPos) { used.add(multiPos.id); return multiPos; }
      const any = squad.find((p: any) => !used.has(p.id) && !reportIds.has(p.id));
      if (any) { used.add(any.id); return any; }
      return null;
    };

    const posOrder: Record<string, string[]> = {
      '4-2-3-1': ['TW', 'RV', 'IV', 'IV', 'LV', 'DM', 'ZM', 'RA', 'OM', 'LA', 'ST'],
      '4-4-2': ['TW', 'RV', 'IV', 'IV', 'LV', 'RM', 'ZM', 'ZM', 'LM', 'ST', 'ST'],
      '3-5-2': ['TW', 'IV', 'IV', 'IV', 'RV', 'ZM', 'ZM', 'LV', 'RA', 'ST', 'LA'],
      '4-3-3': ['TW', 'RV', 'IV', 'IV', 'LV', 'DM', 'ZM', 'ZM', 'RA', 'ST', 'LA'],
    };

    const result: typeof FORMATION_PRESETS = {};
    for (const [key, preset] of Object.entries(FORMATION_PRESETS)) {
      used.clear();
      const reportUsed = new Set<string>();
      const pickReport = (fn: (p: any) => boolean) => {
        const hit = reportPool.find((p: any) => !reportUsed.has(p.id) && fn(p));
        if (hit) reportUsed.add(hit.id);
        return hit || null;
      };
      const positions = posOrder[key] || [];
      const mappedNodes = preset.nodes.map((node, i) => {
        const targetPos = positions[i] || node.position;
        const tp = targetPos.toUpperCase();
        const fromReport =
          pickReport((p: any) => (p.position || '').toUpperCase() === tp) ||
          pickReport((p: any) => (p.position || '').toUpperCase().includes(tp)) ||
          pickReport((p: any) => (p.position || '').toUpperCase().split(/[\/\s]+/).some((part: string) => part === tp || part.includes(tp))) ||
          pickReport(() => true);
        const matched = fromReport || pickFor(targetPos);
        if (matched) {
          return { ...node, name: shortName(matched), number: String(matched.number || node.number), position: matched.position || node.position, image: matched.image };
        }
        return node;
      });
      result[key] = { ...preset, nodes: mappedNodes };
    }
    return result;
  }, [players, activeClub.id, matchAnalyses]);

  // Aktuelle Startelf (editierbar über Bank-Wechsel) — Board als Quelle beim Start, danach User-Wechsel.
  // Persistiert in localStorage, damit Wechsel/Positionen nicht beim erneuten Laden "zurückspringen".
  // Trackt welche Positionen vom User manuell getauscht wurden (Index → true)
  const swappedPositionsRef = useRef<Set<number>>(new Set());
  const [presentationLineup, setPresentationLineup] = useState<Array<any>>(() => {
    try {
      const saved = localStorage.getItem('fca_presentationLineup');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          // Gespeicherte Startelf komplett vor Auto-Sync schützen
          arr.forEach((_: any, i: number) => swappedPositionsRef.current.add(i));
          return arr;
        }
      }
    } catch { /* ignore */ }
    return [];
  });
  const [lineupSwapTarget, setLineupSwapTarget] = useState<number | null>(null);

  // Sync-Funktion: Board-Aufstellung in Präsentation übernehmen (mit Bildern)
  const syncLineupFromBoard = useCallback(() => {
    const preset = liveFormations['4-2-3-1']?.nodes || [];
    const withImages = preset.map((n: any) => {
      if (n.image) return n;
      const matched = players.find((p: any) => {
        const full = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
        return full.includes(String(n.name || '').toLowerCase()) || String(n.name || '').toLowerCase().includes((p.lastName || p.name || '').toLowerCase());
      });
      return { ...n, image: matched?.image || n.image };
    });
    setPresentationLineup(withImages);
    swappedPositionsRef.current = new Set();
  }, [liveFormations, players]);

  // ── Startelf aus dem AUFSTELLUNG-BILD des letzten Spielberichts per KI-Bilderkennung ──
  const [analyzingLineupFromImage, setAnalyzingLineupFromImage] = useState(false);
  const loadStartelfFromLineupImages = useCallback(async () => {
    const report = [...(matchAnalyses || [])]
      .filter((a: any) => a && ((Array.isArray(a.lineupImages) && a.lineupImages.length > 0) || (a.lineupImage && String(a.lineupImage).length > 0)))
      .sort((a: any, b: any) => String(b.date || b.createdAt || '').localeCompare(String(a.date || a.createdAt || '')))[0];
    if (!report) {
      notify('Kein Spielbericht mit AUFSTELLUNG-Bild – bitte zuerst im Spielbericht ein Aufstellungs-Bild hinterlegen.');
      return;
    }
    const images = ((Array.isArray(report.lineupImages) ? report.lineupImages : []) as string[]).concat(report.lineupImage ? [report.lineupImage] : []).filter(Boolean);
    if (images.length === 0) return;
    setAnalyzingLineupFromImage(true);
    notify(`Startelf wird aus dem Aufstellungs-Bild erkannt (${report.opponent || 'Spielbericht'})…`);
    try {
      const resp: any = await apiFetch('/api/analyze-lineup', {
        method: 'POST',
        body: JSON.stringify({
          images,
          squadPlayers: (players || []).filter((p: any) => p.category === 'player').map((p: any) => ({
            number: String(p.number || ''),
            firstName: p.firstName || '',
            lastName: p.lastName || p.name || '',
            name: `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim(),
            position: p.position || '',
          })),
        }),
      });
      if (!resp?.ok || !Array.isArray(resp.lineup)) {
        throw new Error(resp?.error || 'Startelf-Erkennung fehlgeschlagen');
      }
      const squad = (players || []).filter((p: any) => p.category === 'player');
      const shortName = (p: any) => {
        const fn = (p.firstName || '').trim();
        const ln = (p.lastName || p.name || '').trim();
        return fn && ln ? `${fn.charAt(0)}. ${ln}` : ln || fn || '?';
      };
      const resolved: Array<{ number: string; name: string; position: string; player: any }> = [];
      (resp.lineup as Array<any>).forEach((slot: any) => {
        const numStr = String(slot.number || '').replace(/\D+/g, '');
        const byNum = numStr ? squad.find((p: any) => String(p.number || '').replace(/\D+/g, '') === numStr) : undefined;
        const byName = byNum ? undefined : squad.find((p: any) => {
          const full = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
          const n = String(slot.name || '').toLowerCase().replace(/[.,'"]/g, '');
          const pl = `${p.lastName || p.name || ''}`.toLowerCase();
          return full.includes(n) || n.includes(pl) || full.includes(n.replace(/^[a-z]\.?\s*/, ''));
        });
        const player = byNum || byName;
        resolved.push({ number: slot.number || '', name: slot.name || '', position: slot.position || '', player: player || null });
      });

      const order = ['TW', 'RV', 'IV', 'IV', 'LV', 'DM', 'ZM', 'RA', 'OM', 'LA', 'ST'];
      const slots = liveFormations['4-2-3-1']?.nodes || [];
      if (slots.length === 0) throw new Error('Formation nicht verfügbar');
      const usedReport = new Set<string>();
      const usedSquad = new Set<string>();
      const posMatch = (p: any, tp: string) => {
        const pp = (p.position || '').toUpperCase().replace(/[^A-ZÄÜÖ]/g, '');
        return pp === tp || pp.includes(tp) || tp.includes(pp);
      };
      const nextLineup = slots.map((node: any, i: number) => {
        const tp = order[i] || 'ST';
        const fromReport =
          resolved.find((r) => r.player && !usedReport.has(r.player.id) && posMatch(r.player, tp)) ||
          resolved.find((r) => r.player && !usedReport.has(r.player.id));
        if (fromReport?.player) {
          usedReport.add(fromReport.player.id);
          usedSquad.add(fromReport.player.id);
          return {
            ...node,
            name: shortName(fromReport.player),
            number: String(fromReport.player.number || node.number),
            position: fromReport.player.position || node.position,
            image: fromReport.player.image || node.image,
          };
        }
        const fromSquad = squad.find((p: any) => !usedSquad.has(p.id) && posMatch(p, tp)) ||
                          squad.find((p: any) => !usedSquad.has(p.id));
        if (fromSquad) {
          usedSquad.add(fromSquad.id);
          return { ...node, name: shortName(fromSquad), number: String(fromSquad.number || node.number), position: fromSquad.position || node.position, image: fromSquad.image || node.image };
        }
        return node;
      });

      setPresentationLineup(nextLineup);
      swappedPositionsRef.current = new Set();
      notify(`✅ Startelf aus Aufstellungs-Bild übernommen: ${usedReport.size} von ${order.length} Spielern erkannt & eingesetzt`);
    } catch (err: any) {
      console.error('[Analyze-Lineup Client]', err);
      notify(`❌ Startelf-Erkennung fehlgeschlagen: ${err?.message || 'Unbekannter Fehler'}`);
    } finally {
      setAnalyzingLineupFromImage(false);
    }
  }, [liveFormations, matchAnalyses, players]);

  // Startelf persistieren (Wechsel, Positionen) → kein Zurückspringen nach Reload
  useEffect(() => {
    if (presentationLineup.length > 0) {
      try { localStorage.setItem('fca_presentationLineup', JSON.stringify(presentationLineup)); } catch { /* ignore */ }
    }
  }, [presentationLineup]);

  // Automatisch sync: Board-Aufstellung spiegeln, aber User-Wechsel respektieren
  useEffect(() => {
    const preset = liveFormations['4-2-3-1']?.nodes || [];
    if (preset.length === 0) return;
    setPresentationLineup((prev) => {
      // Erstes Mal: direkt übernehmen
      if (prev.length === 0) {
        return preset.map((n: any) => {
          if (n.image) return n;
          const matched = players.find((p: any) => {
            const full = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
            return full.includes(String(n.name || '').toLowerCase()) || String(n.name || '').toLowerCase().includes((p.lastName || p.name || '').toLowerCase());
          });
          return { ...n, image: matched?.image || n.image };
        });
      }
      // Danach: nur nicht-getauschte Positionen vom Board holen
      const prevJson = JSON.stringify(prev);
      const nextJson = JSON.stringify(preset);
      if (prevJson === nextJson) return prev;
      // Positionen die getauscht wurden nicht überschreiben
      const merged = prev.map((node: any, i: number) => {
        if (swappedPositionsRef.current.has(i)) return node;
        const boardNode = preset[i];
        if (!boardNode) return node;
        // Prüfe ob sich der Board-Knoten geändert hat
        if (JSON.stringify(node) === JSON.stringify(boardNode)) return node;
        // Board-Daten übernehmen (mit Bild)
        if (boardNode.image) return boardNode;
        const matched = players.find((p: any) => {
          const full = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
          return full.includes(String(boardNode.name || '').toLowerCase()) || String(boardNode.name || '').toLowerCase().includes((p.lastName || p.name || '').toLowerCase());
        });
        return { ...boardNode, image: matched?.image || boardNode.image };
      });
      return merged;
    });
  }, [liveFormations]);

  const swapStartelfWithSub = (subIdx: number, startIdx: number | null = null) => {
    if (subIdx < 0 || subIdx >= (presentationSubstitutes?.length ?? 0)) {
      notify('Keine Auswechslung möglich');
      return;
    }
    const targetIdx = startIdx ?? lineupSwapTarget;
    if (targetIdx === null || targetIdx < 0 || targetIdx >= presentationLineup.length) {
      notify('Bitte zuerst einen Startelf-Spieler zum Ersetzen auswählen');
      return;
    }
    const sub = presentationSubstitutes[subIdx];
    const starter = presentationLineup[targetIdx];
    // TW-Guard: exakt 1 Torwart in der Startelf — TW auswechseln nur gegen TW/ETW
    const twOf = (pos: string) => String(pos || '').toUpperCase().includes('TW');
    if (twOf(starter.position) && !twOf(sub.pos)) {
      notify('Der Torwart bleibt in der Startelf – es darf nur ein Torwart im Spiel sein!');
      return;
    }
    if (twOf(sub.pos) && !twOf(starter.position)) {
      notify('Der Ersatztorwart bleibt auf der Bank – in der Startelf steht bereits ein Torwart.');
      return;
    }
    const subPlayer = players.find((p: any) => {
      const fullName = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
      return fullName.includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes((p.lastName || p.name || '').toLowerCase());
    });
    const subImage = subPlayer?.image || undefined;
    swappedPositionsRef.current.add(targetIdx);
    setPresentationLineup((prev) => {
      const next = [...prev];
      next[targetIdx] = {
        ...next[targetIdx],
        name: sub.name,
        number: sub.num || next[targetIdx].number,
        position: sub.pos || next[targetIdx].position,
        role: sub.note || next[targetIdx].role,
        image: subImage,
      };
      return next;
    });
    setPresentationSubstitutes((prev) => {
      const next = [...prev];
      next[subIdx] = {
        num: starter.number,
        name: starter.name,
        pos: starter.position,
        note: starter.role || 'Bank',
        image: starter.image,
      };
      return next;
    });
    setLineupSwapTarget(null);
    notify(`Wechsel: ${sub.name} ↔ ${starter.name} — ${sub.name} ist jetzt in der Startelf`);
  };

  // Zurücksetzen: System wieder auf 4-2-3-1, Startelf & Bank zurück auf Ursprung, alle Wechsel gelöscht
  const resetStartelf = useCallback(() => {
    setSelectedFormation('4-2-3-1');
    setPresentationLineup((liveFormations['4-2-3-1']?.nodes || []).map(n => ({ ...n })));
    const defaultSubs = [
      { num: '12', name: 'M. Lais', pos: 'ETW', note: 'Ersatztorwart' },
      { num: '13', name: 'N. Asal', pos: 'IV', note: 'Zweikampf-Option' },
      { num: '14', name: 'T. Bacelic', pos: 'ZM', note: 'Mittelfeld-Stabilität' },
      { num: '15', name: 'S. Saur', pos: 'RA', note: 'Tempo-Joker' },
      { num: '16', name: 'M. Bischoff', pos: 'ST', note: 'Strafraum-Brecher' }
    ];
    setPresentationSubstitutes(defaultSubs.map((sub) => {
      const matched = players.find((p: any) => {
        const fullName = `${p.firstName || ''} ${p.lastName || p.name || ''}`.trim().toLowerCase();
        return fullName.includes(sub.name.toLowerCase()) || sub.name.toLowerCase().includes((p.lastName || p.name || '').toLowerCase());
      });
      return { ...sub, image: matched?.image };
    }));
    setLineupSwapTarget(null);
    setPresentationSlideIndex(1);
    swappedPositionsRef.current = new Set();
    localStorage.removeItem('fca_presentationSubstitutes');
    localStorage.removeItem('fca_presentationLineup');
    notify('Aufstellung zurückgesetzt: System 4-2-3-1, Startelf & Bank wie zuvor');
  }, [liveFormations, players]);

  // Formation-Karten für die Champions-Aufstellung (aktuelle Aufstellung)
  const championsCards = useMemo(() => {
    const preset = liveFormations[selectedFormation] || liveFormations['4-2-3-1'];
    const nodes = (presentationLineup?.length === 11 ? presentationLineup : preset?.nodes || []).slice(0, championsTotal);
    return nodes.map((n: any, i: number) => ({
      id: n.id || `ch${i}`,
      name: n.name || 'Spieler',
      number: n.number || i + 1,
      position: n.position || n.role || '',
      image: n.image,
      x: typeof n.xPercent === 'number' ? n.xPercent : 50,
      y: typeof n.yPercent === 'number' ? n.yPercent : 50,
    }));
  }, [liveFormations, selectedFormation, presentationLineup]);

  // Aktuell präsentierter Spieler (großes Bild) für die Champions-Aufstellung
  const focusCard = championFocusIndex < championsTotal ? championsCards[championFocusIndex] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPitchOnlyFullscreen) {
        setIsPitchOnlyFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPitchOnlyFullscreen]);
  const [activeTabSub, setActiveTabSub] = useState<'board' | 'comparison' | 'standards' | 'presentation' | 'scenarios'>('board');
  // Aktives 1:1-Szenario (Spielsystem / Standard) — geteilt zwischen Taktiktafel & Präsentation
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sys-4231');
  const activeScenario = ALL_SCENARIOS.find((s) => s.id === activeScenarioId) || ALL_SCENARIOS[0];
  const [scenarioCatFilter, setScenarioCatFilter] = useState<'spielsystem' | 'standard'>('spielsystem');
  const [showTrainerPhasePanelOnBoard, setShowTrainerPhasePanelOnBoard] = useState<boolean>(false);
  const [showAllPhasesExpanded, setShowAllPhasesExpanded] = useState<boolean>(false);
  
  // DYNAMISCHE PFLICHTSPIELE-VERKNÜPFUNG (LIVE SYNC MIT DATENBANK & SPIELPLAN)
  const allCompetitiveMatches = useMemo(() => {
    const list = (competitiveMatches && competitiveMatches.length > 0) 
      ? competitiveMatches 
      : (data.competitiveMatches || []);
    return [...list].sort((a, b) => {
      const da = new Date(a.date || '2099-01-01').getTime();
      const db = new Date(b.date || '2099-01-01').getTime();
      return da - db;
    });
  }, [competitiveMatches]);

  // AUTOMATISCHE ERKENNUNG DES NÄCHSTEN PFLICHTSPIELS
  const nextUpcomingMatch = useMemo(() => {
    if (!allCompetitiveMatches || allCompetitiveMatches.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // 1. Suche nach dem nächsten offenen Pflichtspiel ab heute
    const upcoming = allCompetitiveMatches.find(m => {
      const isFutureOrToday = (m.date || '') >= todayStr;
      const hasNoResult = !m.result || m.result.trim() === '' || m.result === '-:-' || m.result === 'vs';
      return isFutureOrToday && hasNoResult;
    });
    if (upcoming) return upcoming;

    // 2. Suche nach beliebigem Spiel ab heute
    const anyFuture = allCompetitiveMatches.find(m => (m.date || '') >= todayStr);
    if (anyFuture) return anyFuture;

    // 3. Erstes noch ungespieltes Pflichtspiel
    const unplayed = allCompetitiveMatches.find(m => !m.result || m.result.trim() === '' || m.result === '-:-');
    if (unplayed) return unplayed;

    // 4. Fallback: Erstes Spiel der Liste
    return allCompetitiveMatches[0];
  }, [allCompetitiveMatches]);

  // Spieltagspräsentation State – initialisiert mit dem nächsten Pflichtspiel
  const [presentationSlideIndex, setPresentationSlideIndex] = useState<number>(0);
  const [selectedPresentationMatchId, setSelectedPresentationMatchId] = useState<string>(() => {
    return nextUpcomingMatch?.id ? String(nextUpcomingMatch.id) : 'm_5';
  });

  // Gegner-Top-3 (3 beste Gegner-Spieler mit Bild, Position, Note) – manuell eintragbar, per Gegner persistiert
  const [opponentTop3, setOpponentTop3] = useState<Array<{ name: string; position: string; imageUrl: string; note: string }>>([
    { name: '', position: '', imageUrl: '', note: '' },
    { name: '', position: '', imageUrl: '', note: '' },
    { name: '', position: '', imageUrl: '', note: '' },
  ]);
  const [top3Saved, setTop3Saved] = useState(false);

  // Auto-Synchronisierung: Wenn nächstes Pflichtspiel lädt oder neu gesetzt wird
  useEffect(() => {
    if (nextUpcomingMatch?.id && (!selectedPresentationMatchId || selectedPresentationMatchId === 'm_5')) {
      setSelectedPresentationMatchId(String(nextUpcomingMatch.id));
    }
  }, [nextUpcomingMatch?.id]);

  const selectedMatchObj = useMemo(() => {
    const matchIdClean = selectedPresentationMatchId.replace('m_', '');
    const found = allCompetitiveMatches.find(m => 
      String(m.id) === matchIdClean || 
      String(m.id) === selectedPresentationMatchId || 
      (m.opponent && m.opponent.toLowerCase().includes(selectedPresentationMatchId.toLowerCase()))
    );
    const m = found || nextUpcomingMatch || allCompetitiveMatches[0] || (data.competitiveMatches[0] as any);
    
    const isHome = m.homeAway === 'Heim' || m.isHome === true || (m.location && m.location.toLowerCase().includes('auggen'));
    const isNext = Boolean(nextUpcomingMatch && (String(nextUpcomingMatch.id) === String(m.id)));
    
    return {
      id: String(m.id),
      rawMatch: m,
      opponent: m.opponent || 'FC Denzlingen',
      date: m.date || '2026-08-22',
      time: m.time || m.kickOff || '15:30',
      meetingTime: m.meetingTime || m.treffpunkt || '14:00 Uhr',
      isHome: isHome,
      homeAway: isHome ? 'Heim' : 'Auswärts',
      location: m.location || (isHome ? 'Lettenpark Stadion Auggen' : `Auswärts (${m.opponent || 'Gegner'})`),
      competition: m.competition || 'Verbandsliga Südbaden',
      matchday: m.matchday || m.spieltag || 1,
      readiness: 100,
      tacticNotes: m.tactics || m.notes || '',
      startingLineup: m.startingLineup || [],
      substitutes: m.substitutes || [],
      result: m.result || '',
      isNextMatch: isNext
    };
  }, [allCompetitiveMatches, selectedPresentationMatchId, nextUpcomingMatch]);

  // Laden der Gegner-Top-3-Daten aus Firestore beim Spieltag/Match-Wechsel
  useEffect(() => {
    const opponent = selectedMatchObj?.opponent || 'Gegner';
    const slug = opponent.toLowerCase().replace(/[^a-z0-9äöü]/g, '-');
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'opponent_top3', slug));
        if (active && snap.exists()) {
          const data = snap.data() as { top3?: Array<{ name: string; position: string; imageUrl: string; note: string }> };
          if (data && Array.isArray(data.top3) && data.top3.length > 0) {
            const filled = data.top3.slice(0, 3);
            while (filled.length < 3) filled.push({ name: '', position: '', imageUrl: '', note: '' });
            setOpponentTop3(filled);
          }
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { active = false; };
  }, [selectedMatchObj?.opponent]);

  const saveOpponentTop3 = async () => {
    const opponent = selectedMatchObj?.opponent || 'Gegner';
    const slug = opponent.toLowerCase().replace(/[^a-z0-9äöü]/g, '-');
    try {
      await setDoc(doc(db, 'opponent_top3', slug), {
        clubShortName: activeClub.shortName || 'FC AUGGEN',
        opponent,
        top3: opponentTop3,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      setTop3Saved(true);
      notify('Gegner Top 3 gespeichert!');
      setTimeout(() => setTop3Saved(false), 2000);
    } catch {
      notify('Fehler beim Speichern der Gegner Top 3.');
    }
  };
  const [presentationCoachingPoints, setPresentationCoachingPoints] = useState<string[]>([
    '⚡ 1. Maximale Zweikampfhärte & Gegenpressing-Intensität ab Minute 1.',
    '🧠 2. Hohe Spielschärfe im Mittelfeldzirkel & sauberes Andribbeln der Sechser.',
    '🎯 3. Gezielte Tiefenläufe von Akuegwu in die Schnittstellen der Abwehrkette.',
    '🛡️ 4. Disziplinierte Restverteidigung (3er-Sicherung) bei eigenen Angrifswellen.',
    '🔥 5. Konsequente Ausnutzung der einstudierten Standard-Varianten (Sweden & Charles).'
  ]);
  const [editingCoachingPointText, setEditingCoachingPointText] = useState<string>('');
  const [showEditCoachingModal, setShowEditCoachingModal] = useState<boolean>(false);
  
  // Tactical Phase Analysis Configurator State
  const [tacticalPhaseConfig, setTacticalPhaseConfig] = useState({
    offensiv: {
      aufbauhoehe: 'mittelhoch', // tief | mittelhoch | hoch
      ueberzahlzonen: '6er', // IV | 6er | Halbraum
      progression: 'Kurzpass', // Kurzpass | Direktspiel | Verlagerung
      halbraumnutzung: 'Zehner', // Achter | Zehner | inverser Flügel
      offensivfokus: 'Flügel', // Flügel | Zentrum | Umschaltspiel
    },
    defensiv: {
      pressinghoehe: 'mittel', // hoch | mittel | tief
      pressinglenkung: 'Außenbahn', // Außenbahn | schwacher Fuß | Pressingfalle
      kompaktheit: 'eng', // eng | breit | mittig
      mannorientierung: 'situativ', // ja | nein | situativ
    },
    umschaltenOffensiv: {
      zielzone: 'Flügel', // Flügel | Zentrum
      tempo: 'schnell', // schnell | kontrolliert
      fokusspieler: 'Stürmer', // Stürmer | Zehner | Flügel
      muster: 'Tiefgang', // Steil-Klatsch | Tiefgang | Direktspiel
    },
    umschaltenDefensiv: {
      gegenpressingintensitaet: 'hoch', // hoch | mittel | niedrig
      trigger: 'Ballverlust Halbraum', // Ballverlust Halbraum | schlechter Kontakt Gegner
      absicherung: '3er Restverteidigung', // 2+1 | 3er Restverteidigung
      pressingseite: 'situativ', // links | rechts | situativ
    }
  });
  const [customTrainerNotes, setCustomTrainerNotes] = useState<string>(
    'Matchplan: Gegenpressing im 1. Halbraum auslösen.'
  );

  // Dynamisch Formation-Notizen & Bank beim Vereinswechsel aktualisieren
  useEffect(() => {
    const squad = (players || []).filter((p: any) => p.category === 'player');
    if (squad.length === 0) {
      setFormationNotes({ defenseLine: 'Wird geladen...', doublePivot: '', attackingRow: '', striker: '' });
      setPresentationSubstitutes([]);
      setDefensiveRulesList(['Wird geladen...']);
      setOffensiveGuidelinesList([]);
      setCustomTrainerNotes('');
      setPresentationCoachingPoints([]);
      return;
    }

    const used = new Set<string>();
    const pickFor = (targetPos: string) => {
      const tp = targetPos.toUpperCase();
      let m = squad.find((p: any) => !used.has(p.id) && (p.position || '').toUpperCase() === tp);
      if (!m) m = squad.find((p: any) => !used.has(p.id) && (p.position || '').toUpperCase().includes(tp));
      if (!m) m = squad.find((p: any) => {
        if (used.has(p.id)) return false;
        return (p.position || '').toUpperCase().split(/[\/\s]+/).some((part: string) => part === tp || part.includes(tp));
      });
      if (m) { used.add(m.id); return m; }
      return null;
    };

    const fw = (p: any) => p ? `${p.lastName || ''}` : '';
    const short = (p: any) => p ? `${(p.firstName || '').trim().charAt(0)}. ${(p.lastName || '').trim()}` : '';

    const tw = pickFor('TW');
    const rv = pickFor('RV');
    const iv1 = pickFor('IV');
    const iv2 = pickFor('IV');
    const lv = pickFor('LV');
    const dm = pickFor('DM');
    const zm = pickFor('ZM');
    const om = pickFor('OM');
    const ra = pickFor('RA');
    const la = pickFor('LA');
    const st = pickFor('ST');

    const defParts = [rv, iv1, iv2, lv].filter(Boolean).map(p => `${fw(p)} (${p!.position})`);
    const midParts = [dm, zm].filter(Boolean).map(p => `${fw(p)} (${p!.position})`);
    const attParts = [ra, om, la].filter(Boolean).map(p => `${fw(p)} (${p!.position})`);

    setFormationNotes({
      defenseLine: defParts.length ? `${defParts.join(', ')}. Asymmetrisches Einrücken bei Ballbesitz.` : 'Aufbau mit Viererkette.',
      doublePivot: midParts.length ? `${midParts.join(' + ')}. Absicherung des 1. Halbraums.` : 'Doppel-Sechs im Mittelfeld.',
      attackingRow: attParts.length ? `${attParts.join(' + ')}.` : 'Offensive Reihe im Aufbau.',
      striker: st ? `${fw(st)}. Bindet gegnerische IV und erzeugt Raum.` : 'Stürmer gesucht.'
    });

    // Bank: alle Spieler die NICHT in der Startelf stehen
    const allUsed = [...used];
    const bankPlayers = squad.filter(p => !allUsed.includes(p.id)).slice(0, 5);
    if (bankPlayers.length > 0) {
      setPresentationSubstitutes(bankPlayers.map((p: any, i: number) => ({
        num: String(p.number || 12 + i),
        name: short(p),
        pos: p.position || '-',
        note: i === 0 ? 'Ersatztorwart' : i === 1 ? 'Zweikampf-Option' : i === 2 ? 'Mittelfeld-Stabilität' : i === 3 ? 'Tempo-Joker' : 'Ergänzung',
        image: p.image
      })));
    }

    const pivotNames = [dm, zm].filter(Boolean).map(fw).join(' & ');
    const omName = om ? fw(om) : 'Zehner';
    const stName = st ? fw(st) : 'Stürmer';
    const laName = la ? fw(la) : 'Flügel';
    const raName = ra ? fw(ra) : 'Flügel';

    setDefensiveRulesList([
      `Anpress-Trigger: Pass auf den schwachen Außenverteidiger löst hohes Nachrücken aus.`,
      `Zentrum schließen: ${pivotNames || 'Mittelfeld'} doppeln die Schnittstelle.`,
      `Restverteidigung: 3er-Sicherung hinter dem Ball zur Absicherung gegen Konter.`
    ]);

    setOffensiveGuidelinesList([
      `1. Andribbeln & Halbraum-Besetzung: IV lockt Anpressen, ${omName} besetzt Halbraum.`,
      `2. Steil-Klatsch-Kombinationen: Anspiel auf ${stName}, Klatsch auf ${pivotNames || 'Mittelfeld'}, Steckpass auf ${laName}.`
    ]);

    setCustomTrainerNotes(
      `Matchplan: Gegenpressing im 1. Halbraum auslösen. Sobald ${omName} den Ball festmacht, startet ${stName} den tiefen Run.`
    );

    setPresentationCoachingPoints([
      `⚡ 1. Maximale Zweikampfhärte & Gegenpressing-Intensität ab Minute 1.`,
      `🧠 2. Hohe Spielschärfe im Mittelfeldzirkel & sauberes Andribbeln der Sechser.`,
      `🎯 3. Gezielte Tiefenläufe von ${stName} in die Schnittstellen der Abwehrkette.`,
      `🛡️ 4. Disziplinierte Restverteidigung (3er-Sicherung) bei eigenen Angriffswellen.`,
      `🔥 5. Konsequente Ausnutzung der einstudierten Standard-Varianten.`
    ]);
  }, [activeClub.id, players]);

  // Tactical Analysis State
  const [tacticalAnalysis, setTacticalAnalysis] = useState<Array<{ title: string; content: string }>>([]);
  const [tacticalAnalysisLoading, setTacticalAnalysisLoading] = useState(false);
  const [showTacticalAnalysis, setShowTacticalAnalysis] = useState(false);

  const handleGenerateTacticalAnalysis = async () => {
    setTacticalAnalysisLoading(true);
    try {
      const res = await apiFetch('/api/tactical-analysis', {
        method: 'POST',
        body: JSON.stringify({
          tacticalPhaseConfig,
          formation: selectedFormation,
          clubName: activeClub.name
        })
      });
      const data = await res.json();
      if (data.success && data.analysis && data.analysis.length > 0) {
        setTacticalAnalysis(data.analysis);
        setShowTacticalAnalysis(true);
      } else {
        console.warn('Tactical analysis returned empty:', data);
      }
    } catch (err) {
      console.error('Tactical analysis failed:', err);
    } finally {
      setTacticalAnalysisLoading(false);
    }
  };

  // Slide-Specific Edit States (For all 9 Slides)
  const [slideEditingActive, setSlideEditingActive] = useState<boolean>(false);
  const [pitchEditMode, setPitchEditMode] = useState(false);
  const [swapFirstPlayer, setSwapFirstPlayer] = useState<string | null>(null);

  // Persistierte Szenario-Edits je Slide/Diagramm (Zonen + Spieler frei bearbeitbar)
  const [scenarioEdits, setScenarioEdits] = useState<Record<string, { zones: ScenarioZone[]; players: ScenarioPlayer[] }>>(() => {
    try {
      const s = localStorage.getItem('fca_presentation_scenarioEdits');
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return {};
  });
  useEffect(() => {
    try { localStorage.setItem('fca_presentation_scenarioEdits', JSON.stringify(scenarioEdits)); } catch { /* ignore */ }
  }, [scenarioEdits]);
  const setEditsForScenario = useCallback((scenarioId: string, zones: ScenarioZone[], players: ScenarioPlayer[]) => {
    setScenarioEdits((prev) => ({ ...prev, [scenarioId]: { zones, players } }));
  }, []);

  // Slide 0: editierbarer Titel (persistiert)
  const [presentationTitleOverride, setPresentationTitleOverride] = useState<string>(() => {
    try { return localStorage.getItem('fca_presentationTitleOverride') || ''; } catch { return ''; }
  });
  const setPresentationTitle = (v: string) => {
    setPresentationTitleOverride(v);
    try { if (v) localStorage.setItem('fca_presentationTitleOverride', v); else localStorage.removeItem('fca_presentationTitleOverride'); } catch { /* ignore */ }
  };

  // Slide 8: eigene Spieler-Chips (Name + Bild) frei bewegbar auf dem Gegner-Diagramm (persistiert)
  const [ownTop3Chips, setOwnTop3Chips] = useState<Array<{ name: string; number: string; image?: string; x: number; y: number }>>(() => {
    try {
      const s = localStorage.getItem('fca_presentation_top3_chips');
      if (s) return JSON.parse(s);
    } catch { /* ignore */ }
    return [];
  });
  const [dragChipIndex, setDragChipIndex] = useState<number | null>(null);
  const top3PitchRef = useRef<HTMLDivElement | null>(null);
  const setChips = (next: Array<{ name: string; number: string; image?: string; x: number; y: number }>) => {
    setOwnTop3Chips(next);
    try { localStorage.setItem('fca_presentation_top3_chips', JSON.stringify(next)); } catch { /* ignore */ }
  };
  useEffect(() => {
    // Beim ersten Öffnen: Startelf-Chips initial verteilen (falls noch nicht gesetzt)
    if (ownTop3Chips.length === 0 && presentationLineup.length >= 11) {
      const positions = [
        { x: 14, y: 14 }, { x: 32, y: 10 }, { x: 50, y: 10 }, { x: 68, y: 10 }, { x: 86, y: 14 },
        { x: 20, y: 40 }, { x: 50, y: 34 }, { x: 80, y: 40 },
        { x: 30, y: 62 }, { x: 70, y: 62 },
        { x: 50, y: 88 },
      ];
      const seeded = presentationLineup.slice(0, 11).map((p: any, i: number) => ({
        name: p.name || 'Spieler',
        number: String(p.number || i + 1),
        image: p.image,
        x: positions[i].x,
        y: positions[i].y,
      }));
      setChips(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownTop3Chips.length, presentationLineup]);

  const handleChipMouseDown = (e: React.MouseEvent, i: number) => {
    e.stopPropagation();
    setDragChipIndex(i);
  };
  const handleChipMouseMove = (e: React.MouseEvent) => {
    if (dragChipIndex === null || !top3PitchRef.current) return;
    const rect = top3PitchRef.current.getBoundingClientRect();
    const x = Math.max(3, Math.min(97, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(3, Math.min(97, ((e.clientY - rect.top) / rect.height) * 100));
    const next = ownTop3Chips.map((c, i) => (i === dragChipIndex ? { ...c, x, y } : c));
    setChips(next);
  };
  const handleChipMouseUp = () => setDragChipIndex(null);
  
  // Slide 0: Titel & Match
  const [matchNotes, setMatchNotes] = useState({
    home: 'Stamm-System 4-2-3-1 mit doppelter Sechs und variabler Offensive.',
    opponent: 'Aggressives Anpressen. Anfällig gegen schnelle Verlagerungen.',
    focus: 'Pressing HOCH, Aufbau MITTELHOCH.'
  });

  // Slide 1: Aufstellung & Bank — Lade aus localStorage wenn vorhanden
  const defaultSubs = [
    { num: '12', name: 'M. Lais', pos: 'ETW', note: 'Ersatztorwart' },
    { num: '13', name: 'N. Asal', pos: 'IV', note: 'Zweikampf-Option' },
    { num: '14', name: 'T. Bacelic', pos: 'ZM', note: 'Mittelfeld-Stabilität' },
    { num: '15', name: 'S. Saur', pos: 'RA', note: 'Tempo-Joker' },
    { num: '16', name: 'M. Bischoff', pos: 'ST', note: 'Strafraum-Brecher' }
  ];
  const [presentationSubstitutes, setPresentationSubstitutes] = useState<Array<{ num: string; name: string; pos: string; note: string; image?: string }>>(() => {
    try { const s = localStorage.getItem('fca_presentationSubstitutes'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    return defaultSubs;
  });

  // Auto-Save: Bank in localStorage bei jeder Änderung (Startelf kommt immer vom Board)
  useEffect(() => {
    if (presentationSubstitutes.length > 0) {
      localStorage.setItem('fca_presentationSubstitutes', JSON.stringify(presentationSubstitutes));
    }
  }, [presentationSubstitutes]);

  // Dedup: Start-11 darf nie auf der Bank erscheinen (auch nach Wechseln nicht)
  useEffect(() => {
    if (presentationLineup.length === 0) return;
    const lineupNames = presentationLineup.map((l: any) => String(l.name || '').toLowerCase());
    setPresentationSubstitutes((prev) => {
      const dupFree = prev.filter((s: any) => {
        const sn = String(s.name || '').toLowerCase();
        return !lineupNames.some((ln: string) => ln === sn || ln.includes(sn) || sn.includes(ln));
      });
      return dupFree.length === prev.length ? prev : dupFree;
    });
  }, [presentationLineup]);

  // Slide 2: Formation
  const [formationNotes, setFormationNotes] = useState({
    defenseLine: 'Tiedemann (RV), Paolillo (IV), Klett (IV), Ritzenthaler (LV). Asymmetrisches Einrücken bei Ballbesitz.',
    doublePivot: 'Kalchschmidt (Abräumer) + Boutagrat (Box-to-Box Antreiber). Absicherung des 1. Halbraums.',
    attackingRow: 'Valchuk (RA) + Dischinger (OM im Halbraum) + Ehret (LA invers).',
    striker: 'Akuegwu (ST). Bindet gegnerische Innenverteidiger und erzeugt Raum durch Tiefenläufe.'
  });

  // Slide 3: Defensiv
  const [defensiveRulesList, setDefensiveRulesList] = useState<string[]>([
    'Anpress-Trigger: Pass auf den schwachen Außenverteidiger löst hohes Nachrücken aus.',
    'Zentrum schließen: Kalchschmidt & Boutagrat doppeln die Schnittstelle.',
    'Restverteidigung: 3er-Sicherung hinter dem Ball zur Absicherung gegen Konter.'
  ]);

  // Slide 4: Offensiv
  const [offensiveGuidelinesList, setOffensiveGuidelinesList] = useState<string[]>([
    '1. Andribbeln & Halbraum-Besetzung: IV lockt Anpressen, Dischinger besetzt Halbraum.',
    '2. Steil-Klatsch-Kombinationen: Anspiel auf Akuegwu, Klatsch auf Boutagrat, Steckpass auf Ehret.'
  ]);

  // Slide 8: Spielbericht & Metriken
  const [presentationMetrics, setPresentationMetrics] = useState({
    passQuote: '86.4%',
    duelWin: '58.2%',
    counterPress: '78.0%'
  });

  // Inputs for adding new items on slides
  const [newSubForm, setNewSubForm] = useState({ num: '', name: '', pos: 'ZM', note: '' });
  const [newDefensiveRule, setNewDefensiveRule] = useState<string>('');
  const [newOffensiveGuideline, setNewOffensiveGuideline] = useState<string>('');
  const [newSlideStandardInput, setNewSlideStandardInput] = useState({ name: '', description: '', successRate: 75 });
  const [newCoachingPointInput, setNewCoachingPointInput] = useState<string>('');

  // Slide 10: Schlüsselspieler (Blanko) – 3 Plätze mit Notiz
  const [keyPlayers, setKeyPlayers] = useState<Array<{ name: string; note: string }>>([
    { name: '', note: '' },
    { name: '', note: '' },
    { name: '', note: '' }
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  // Standards State & Local Storage Sync
  const [standardsList, setStandardsList] = useState<StandardVariant[]>(() => {
    try {
      const saved = localStorage.getItem('fca_standards_variants');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Error loading standards variants", e);
    }
    return [
      {
        id: 'std_sweden',
        name: 'Ecke OFF: Spezial-Variante "Sweden"',
        type: 'ecke_offensiv',
        executor: 'B. Dischinger / I. Valchuk',
        keyPlayers: 'Dischinger, Valchuk, Paolillo',
        description: 'Kurze Übergabe an der Eckfahne mit Hinterlaufen durch Valchuk. Dischinger zieht nach innen und schlenzt den Ball mit Bogenlampe auf den 2. Pfosten auf Paolillo.',
        successRate: 88,
        aiTacticNotes: 'Überwindet gegnerische Raumdeckung durch Erzeugung eines 2v1 Überzahlmoments an der Eckfahne.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Konterabsicherung', xPercent: 30, yPercent: 65, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Kopfball 2. Pfosten', xPercent: 70, yPercent: 8, number: '4' },
          { id: '4', name: 'S. Klett', role: 'Sperre gegnerischer IV', xPercent: 45, yPercent: 12, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Rückraum 16er', xPercent: 50, yPercent: 35, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: '2. Ball Rebound', xPercent: 42, yPercent: 28, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Flügel-Sicherung', xPercent: 20, yPercent: 20, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Hinterläufer Eckfahne', xPercent: 12, yPercent: 6, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Ausführer Kurzpass', xPercent: 5, yPercent: 2, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Mauer-Finte', xPercent: 35, yPercent: 10, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Einläufer 1. Pfosten', xPercent: 40, yPercent: 14, number: '9' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'std_charles',
        name: 'Halbfeld-Freistoß: Spezial-Variante "Charles"',
        type: 'freistoss_halbfeld',
        executor: 'Y. Kalchschmidt',
        keyPlayers: 'Kalchschmidt, Dischinger, Boutagrat',
        description: 'Antäuschen einer Bogenflanke in den 16er, stattdessen versteckter flacher Pass rückwärts an den Strafraumkreis für Dischingers direkten Distanzschuss.',
        successRate: 82,
        aiTacticNotes: 'Perfekt gegen tief stehende Ketten, die früh zurückweichen und den Rückraum verwaist lassen.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Zielspieler 2. Pfosten', xPercent: 75, yPercent: 12, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Einläufer Zentrum', xPercent: 50, yPercent: 15, number: '4' },
          { id: '4', name: 'S. Klett', role: 'Sperre gegnerischer IV', xPercent: 45, yPercent: 18, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Konterabsicherung LV', xPercent: 80, yPercent: 55, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: 'Passgeber Rückraum', xPercent: 30, yPercent: 40, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Abschirmung Schütze', xPercent: 48, yPercent: 28, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Ablenkung rechts', xPercent: 20, yPercent: 20, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Schütze 16er-Kreis', xPercent: 50, yPercent: 30, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Lauflinie links', xPercent: 85, yPercent: 16, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Zentrum Bindung', xPercent: 52, yPercent: 10, number: '9' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'std_zug',
        name: 'Ecke OFF: Spezial-Variante "Zug" (Dynamik)',
        type: 'ecke_offensiv',
        executor: 'B. Dischinger',
        keyPlayers: 'Akuegwu, Klett, Paolillo, Tiedemann',
        description: 'Alle 5 Kopfballspieler starten gestaffelt von der 16er-Linie und laufen im Höchsttempo ("Zug zum Tor") synchron bei Ballabgabe ein.',
        successRate: 90,
        aiTacticNotes: 'Unverteidigbar in Manndeckung durch Tempovorteil im Anlauf gegenüber stehenden Verteidigern.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Zug-Einläufer 3', xPercent: 30, yPercent: 25, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Zug-Einläufer 1', xPercent: 45, yPercent: 25, number: '4' },
          { id: '4', name: 'S. Klett', role: 'Zug-Einläufer 2', xPercent: 55, yPercent: 25, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Rückraum', xPercent: 50, yPercent: 40, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: 'Rebound 16er', xPercent: 50, yPercent: 32, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Zug-Einläufer 4', xPercent: 65, yPercent: 25, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Kurze Option', xPercent: 15, yPercent: 10, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Scharfe Flanke', xPercent: 5, yPercent: 2, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Zug-Einläufer 5', xPercent: 75, yPercent: 25, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Zug-Spitze 5m', xPercent: 50, yPercent: 12, number: '9' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'std_leverkusen',
        name: 'Ecke OFF: Spezial-Variante "Leverkusen"',
        type: 'ecke_offensiv',
        executor: 'I. Valchuk / B. Dischinger',
        keyPlayers: 'Akuegwu, Ehret, Valchuk',
        description: 'Scharfe, flache, geschneidert geschossene Hereingabe an den kurzen Pfosten. Akuegwu chipt den Ball mit der Hacke über den Torwart.',
        successRate: 84,
        aiTacticNotes: 'Überraschungseffekt in der Anfangsphase. Erfordert exaktes Timing zwischen Schütze und Akuegwu.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Konterabsicherung', xPercent: 30, yPercent: 65, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Zentrum Bindung', xPercent: 45, yPercent: 15, number: '4' },
          { id: '4', name: 'S. Klett', role: '2. Pfosten Lauer', xPercent: 65, yPercent: 10, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Rückraum', xPercent: 50, yPercent: 35, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: 'Rebound', xPercent: 42, yPercent: 28, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Sicherung', xPercent: 20, yPercent: 20, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Scharfer Ausführer', xPercent: 5, yPercent: 2, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Kurze Anspielstation', xPercent: 15, yPercent: 8, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Keeper Block', xPercent: 45, yPercent: 6, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Hacken-Chipper 1. Pfosten', xPercent: 38, yPercent: 8, number: '9' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'std_2',
        name: 'Halbfeld-Freistoß: Chipper & 2. Ball',
        type: 'freistoss_halbfeld',
        executor: 'Y. Kalchschmidt',
        keyPlayers: 'Tiedemann, Boutagrat, Klett',
        description: 'Flanke auf den 2. Pfosten auf Tiedemann, welcher den Ball quer in den Rückraum legt für den aufrückenden Boutagrat.',
        successRate: 78,
        aiTacticNotes: 'Erzeugt Verwirrung in der gegnerischen Raumdeckung. Wichtig: Dischinger blockt den zentralen IV.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Zielspieler 2. Pfosten', xPercent: 75, yPercent: 12, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Einläufer Zentrum', xPercent: 50, yPercent: 15, number: '4' },
          { id: '4', name: 'S. Klett', role: 'Sperre gegnerischer IV', xPercent: 45, yPercent: 18, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Konterabsicherung LV', xPercent: 80, yPercent: 55, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: 'Freistoß-Ausführer', xPercent: 30, yPercent: 40, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Schütze 2. Ball', xPercent: 50, yPercent: 25, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Ablenkung rechts', xPercent: 20, yPercent: 20, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Mauer-Sichtschutz', xPercent: 35, yPercent: 30, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Lauflinie links', xPercent: 85, yPercent: 16, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Zentrum Bindung', xPercent: 52, yPercent: 10, number: '9' }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: 'std_3',
        name: 'Weiter Einwurf: Harpoon in den 16er',
        type: 'einwurf_weit',
        executor: 'F. Ritzenthaler / J. Tiedemann',
        keyPlayers: 'Ritzenthaler, Akuegwu, Ehret',
        description: 'Ritzenthaler wirft mit voller Wucht weit an die 16er-Kante, Akuegwu verlängert per Kopf in den Lauf von Ehret.',
        successRate: 72,
        aiTacticNotes: 'Wirkt wie ein Eckball aus dem Halbfeld. Kalchschmidt muss den 2. Ball am 16er-Bogen sichern.',
        positions: [
          { id: '1', name: 'L. Schneider', number: '1', role: 'Absicherung', xPercent: 50, yPercent: 85 },
          { id: '2', name: 'J. Tiedemann', role: 'Absicherung RV', xPercent: 20, yPercent: 60, number: '2' },
          { id: '3', name: 'M. Paolillo', role: 'Kopfball-Absicherung', xPercent: 45, yPercent: 45, number: '4' },
          { id: '4', name: 'S. Klett', role: 'Zentrum Rebound', xPercent: 55, yPercent: 35, number: '5' },
          { id: '5', name: 'F. Ritzenthaler', role: 'Einwerfer (Seitenlinie)', xPercent: 98, yPercent: 25, number: '3' },
          { id: '6', name: 'Y. Kalchschmidt', role: 'Rückraum 16er-Bogen', xPercent: 60, yPercent: 30, number: '6' },
          { id: '7', name: 'A. Boutagrat', role: 'Entgegenkommen Finte', xPercent: 85, yPercent: 28, number: '8' },
          { id: '8', name: 'I. Valchuk', role: 'Abfälschen 2. Pfosten', xPercent: 30, yPercent: 12, number: '7' },
          { id: '9', name: 'B. Dischinger', role: 'Verwirrung 5m', xPercent: 50, yPercent: 15, number: '10' },
          { id: '10', name: 'J. Ehret', role: 'Abschlusspieler 2. Pfosten', xPercent: 40, yPercent: 11, number: '11' },
          { id: '11', name: 'J. Akuegwu', role: 'Verlängerer 1. Pfosten', xPercent: 70, yPercent: 18, number: '9' }
        ],
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Save custom standards to localStorage on updates
  useEffect(() => {
    try {
      localStorage.setItem('fca_standards_variants', JSON.stringify(standardsList));
    } catch (e) {
      console.warn("Could not save standards to localStorage", e);
    }
  }, [standardsList]);

  // Match Report Images Extractor
  const [matchReportImages, setMatchReportImages] = useState<Array<{ id: string; title: string; url: string; source: string }>>([]);
  const [showImageGalleryModal, setShowImageGalleryModal] = useState<boolean>(false);
  const [selectedStandardForImage, setSelectedStandardForImage] = useState<string | null>(null);

  // Load match report & video images from localStorage
  useEffect(() => {
    const images: Array<{ id: string; title: string; url: string; source: string }> = [];
    
    // 1. Check match reports
    try {
      const matchAnalysesStr = localStorage.getItem('fca_match_analyses');
      if (matchAnalysesStr) {
        const analyses = JSON.parse(matchAnalysesStr);
        if (Array.isArray(analyses)) {
          analyses.forEach((a: any) => {
            const opp = a.opponent || 'Match';
            if (a.standardsOwnImages && Array.isArray(a.standardsOwnImages)) {
              a.standardsOwnImages.forEach((imgUrl: string, idx: number) => {
                images.push({ id: `mr_std_own_${a.id}_${idx}`, title: `Standard Offensiv vs ${opp}`, url: imgUrl, source: `Spielbericht vs ${opp}` });
              });
            }
            if (a.standardsOpponentImages && Array.isArray(a.standardsOpponentImages)) {
              a.standardsOpponentImages.forEach((imgUrl: string, idx: number) => {
                images.push({ id: `mr_std_opp_${a.id}_${idx}`, title: `Standard Defensiv vs ${opp}`, url: imgUrl, source: `Spielbericht vs ${opp}` });
              });
            }
            if (a.lineupImages && Array.isArray(a.lineupImages)) {
              a.lineupImages.forEach((imgUrl: string, idx: number) => {
                images.push({ id: `mr_lineup_${a.id}_${idx}`, title: `Aufstellung Snapshot vs ${opp}`, url: imgUrl, source: `Spielbericht vs ${opp}` });
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Error parsing fca_match_analyses", err);
    }

    // 2. Check video analyses
    try {
      const videoAnalysesStr = localStorage.getItem('fca_video_analyses');
      if (videoAnalysesStr) {
        const vAnalyses = JSON.parse(videoAnalysesStr);
        if (Array.isArray(vAnalyses)) {
          vAnalyses.forEach((v: any) => {
            if (v.thumbnail || v.clipThumbnail) {
              images.push({ id: `vid_${v.id}`, title: v.title || 'Video Clip Snapshot', url: v.thumbnail || v.clipThumbnail, source: 'Video-Analyse' });
            }
            if (v.clips && Array.isArray(v.clips)) {
              v.clips.forEach((c: any) => {
                if (c.thumbnail) {
                  images.push({ id: `vid_clip_${c.id}`, title: c.title || 'Szene-Clip Standard', url: c.thumbnail, source: 'Video-Clip' });
                }
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn("Error parsing fca_video_analyses", err);
    }

    setMatchReportImages(images);
  }, []);

  // Modal for Formulating New Standard
  const [showCreateStandardModal, setShowCreateStandardModal] = useState<boolean>(false);
  const [newStandardForm, setNewStandardForm] = useState<{
    name: string;
    type: 'ecke_offensiv' | 'ecke_defensiv' | 'freistoss_direkt' | 'freistoss_halbfeld' | 'einwurf_weit' | 'elfmeter';
    executor: string;
    keyPlayers: string;
    description: string;
    imageUrl?: string;
  }>({
    name: '',
    type: 'ecke_offensiv',
    executor: 'B. Dischinger',
    keyPlayers: 'Dischinger, Akuegwu, Kalchschmidt',
    description: ''
  });

  // Modal for Interactive Position Editor on Pitch
  const [showEditPositionsModal, setShowEditPositionsModal] = useState<boolean>(false);
  const [editingStandard, setEditingStandard] = useState<StandardVariant | null>(null);
  const [editingPositions, setEditingPositions] = useState<Array<{ id: string; name: string; number: string; role: string; xPercent: number; yPercent: number }>>([]);
  const [selectedStandardNodeId, setSelectedStandardNodeId] = useState<string | null>(null);

  // Gemini AI Analysis State
  const [isAiAnalyzingStandard, setIsAiAnalyzingStandard] = useState<boolean>(false);
  const [aiAnalysisStandardId, setAiAnalysisStandardId] = useState<string | null>(null);

  const handleAiAnalyzeStandard = async (standard: StandardVariant) => {
    setIsAiAnalyzingStandard(true);
    setAiAnalysisStandardId(standard.id);
    try {
      const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '') || '';
      if (apiKey) {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: `Du bist der Chef-Taktiker des Verbandsligisten ${activeClub.name}.
Analysiere und optimiere folgende Standard-Situation (Ecke / Freistoß / Einwurf):
Name: ${standard.name}
Typ: ${standard.type}
Ausführer: ${standard.executor}
Schlüsselspieler: ${standard.keyPlayers}
Beschreibung: ${standard.description}

Gib mir in 3 kurzen, klaren Bullet Points:
1. Taktische Optimierung (Laufwege, Sperren, Ablenkung)
2. Absicherung gegen gegnerische Konter
3. Erfolgsquote & Empfehlungen für den Trainer.`
        });

        const text = response.text;
        if (text) {
          setStandardsList(prev => prev.map(s => s.id === standard.id ? { ...s, aiTacticNotes: text, successRate: Math.min(98, s.successRate + 5) } : s));
          setNotification(`Taktik-Analyse für "${standard.name}" erfolgreich generiert!`);
          setTimeout(() => setNotification(null), 3500);
        }
      } else {
        const text = `Taktische Optimierung (${activeClub.name} Taktik-Engine):
• Laufweg-Anpassung: ${standard.executor} setzt eine 0.5s Finte vor dem Anlauf. Einläufer ${standard.keyPlayers} binden die gegnerischen Innenverteidiger am 1. Pfosten.
• Konterabsicherung: Kalchschmidt + Ritzenthaler bleiben strikt hinter dem 16er-Bogen (rest-defense).
• Erwartete Tor-Chance (xG): High Impact (+12% Effizienz).`;
        setStandardsList(prev => prev.map(s => s.id === standard.id ? { ...s, aiTacticNotes: text, successRate: Math.min(95, s.successRate + 4) } : s));
        setNotification(`Taktik-Analyse für "${standard.name}" aktualisiert!`);
        setTimeout(() => setNotification(null), 3500);
      }
    } catch (err: any) {
      console.warn("Standard analysis fallback:", err);
      const text = `Taktik-Empfehlung ${activeClub.name}:
• Raumdeckung des Gegners durch gezieltes Anlaufen des 1. Pfostens aufbrechen.
• Zweiter Ball im Rückraum durch Kalchschmidt/Boutagrat direkt aufs Tor abschließen.`;
      setStandardsList(prev => prev.map(s => s.id === standard.id ? { ...s, aiTacticNotes: text } : s));
      setNotification(`Taktik-Empfehlung für "${standard.name}" aktualisiert.`);
      setTimeout(() => setNotification(null), 3500);
    } finally {
      setIsAiAnalyzingStandard(false);
      setAiAnalysisStandardId(null);
    }
  };

  const [editingStandardFullId, setEditingStandardFullId] = useState<string | null>(null);

  const handleOpenEditStandardFull = (std: StandardVariant) => {
    setEditingStandardFullId(std.id);
    setNewStandardForm({
      name: std.name,
      type: std.type,
      executor: std.executor,
      keyPlayers: std.keyPlayers,
      description: std.description,
      imageUrl: std.imageUrl
    });
    setShowCreateStandardModal(true);
  };

  const handleSaveNewStandard = () => {
    if (!newStandardForm.name.trim() || !newStandardForm.description.trim()) {
      setNotification("Bitte geben Sie einen Namen und eine Beschreibung ein!");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (editingStandardFullId) {
      setStandardsList(prev => prev.map(s => s.id === editingStandardFullId ? {
        ...s,
        name: newStandardForm.name,
        type: newStandardForm.type,
        executor: newStandardForm.executor || 'B. Dischinger',
        keyPlayers: newStandardForm.keyPlayers || `Kader ${activeClub.name}`,
        description: newStandardForm.description,
        imageUrl: newStandardForm.imageUrl || s.imageUrl
      } : s));
      setEditingStandardFullId(null);
      setNotification(`Standard-Variante "${newStandardForm.name}" erfolgreich aktualisiert!`);
    } else {
      const defaultPositions = (liveFormations['4-2-3-1']?.nodes || []).map(n => ({
        id: n.id,
        name: n.name,
        number: n.number,
        role: n.role,
        xPercent: n.xPercent,
        yPercent: n.yPercent
      }));

      const newStd: StandardVariant = {
        id: `std_custom_${Date.now()}`,
        name: newStandardForm.name,
        type: newStandardForm.type,
        executor: newStandardForm.executor || '',
        keyPlayers: newStandardForm.keyPlayers || `Kader ${activeClub.name}`,
        description: newStandardForm.description,
        successRate: 80,
        imageUrl: newStandardForm.imageUrl,
        positions: defaultPositions,
        createdAt: new Date().toISOString()
      };

      setStandardsList(prev => [newStd, ...prev]);
      setNotification(`Neue Standard-Variante "${newStd.name}" erfolgreich gespeichert!`);
    }

    setShowCreateStandardModal(false);
    setNewStandardForm({
      name: '',
      type: 'ecke_offensiv',
      executor: 'B. Dischinger',
      keyPlayers: 'Dischinger, Akuegwu, Kalchschmidt',
      description: ''
    });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenEditPositions = (std: StandardVariant) => {
    setEditingStandard(std);
    setEditingPositions(std.positions || []);
    setShowEditPositionsModal(true);
  };

  const handleSavePositions = () => {
    if (!editingStandard) return;
    setStandardsList(prev => prev.map(s => s.id === editingStandard.id ? { ...s, positions: editingPositions } : s));
    setShowEditPositionsModal(false);
    setEditingStandard(null);
    setNotification("Spieler-Positionen für Standard erfolgreich aktualisiert!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAttachImageToStandard = (imageUrl: string) => {
    if (!selectedStandardForImage) return;
    setStandardsList(prev => prev.map(s => s.id === selectedStandardForImage ? { ...s, imageUrl } : s));
    setShowImageGalleryModal(false);
    setSelectedStandardForImage(null);
    setNotification("Spielbericht-Bild erfolgreich der Standard-Variante zugeordnet!");
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteStandard = (id: string) => {
    setStandardsList(prev => prev.filter(s => s.id !== id));
    setNotification("Standard-Variante gelöscht.");
    setTimeout(() => setNotification(null), 3000);
  };

  // Standards Halbfeld Interactive State
  const [standardMode, setStandardMode] = useState<string>('ecke_links');
  const [standardDrawMode, setStandardDrawMode] = useState<'player' | 'zone' | 'run'>('player');
  const [standardPlayers, setStandardPlayers] = useState<Array<{ x: number; y: number; number: string; name: string; color: string }>>([]);
  const [standardZones, setStandardZones] = useState<Array<{ x: number; y: number; w: number; h: number; color: string }>>([]);
  const [standardRunPaths, setStandardRunPaths] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color: string }>>([]);
  const [standardRunStart, setStandardRunStart] = useState<{ x: number; y: number } | null>(null);
  const [standardPlayerPicker, setStandardPlayerPicker] = useState<{ x: number; y: number; svgX: number; svgY: number } | null>(null);
  const [standardDescription, setStandardDescription] = useState('');
  const [standardsFullscreen, setStandardsFullscreen] = useState(false);
  const [scenarioFullscreen, setScenarioFullscreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && standardsFullscreen) setStandardsFullscreen(false);
      if (e.key === 'Escape' && scenarioFullscreen) setScenarioFullscreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [standardsFullscreen, scenarioFullscreen]);

  const resetStandardField = () => {
    setStandardPlayers([]);
    setStandardZones([]);
    setStandardRunPaths([]);
    setStandardRunStart(null);
    setStandardDescription('');
  };

  const ZONE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

  // Automatisch Standards aus letzten 2 Spielen parsen
  const lastTwoMatchStandards = useMemo(() => {
    if (!matchAnalyses || matchAnalyses.length === 0) return [];
    const withStandards = matchAnalyses
      .filter((a: any) => a.standardsOwn && a.standardsOwn.trim().length > 10)
      .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 2);
    return withStandards.map((a: any) => {
      const text = a.standardsOwn || '';
      const types: string[] = [];
      if (/ecke|corner/i.test(text)) types.push('Ecke');
      if (/freistoß|freistoss/i.test(text)) types.push('Freistoß');
      if (/elfmeter|penalty/i.test(text)) types.push('Elfmeter');
      if (/einwurf/i.test(text)) types.push('Einwurf');
      if (/abstoß|abstoss/i.test(text)) types.push('Abstoß');
      const playerNames = (text.match(/\b(Joni|Jonathan|Juli|Julian|Bao|Nguyen|Scalli|Giuliano|Steffen|Reinecker|Timm|Podlich|Said|Souleymané|Yanik|Roth|Matti|Roth|Jesse|Agbozo|Max|Disch|Jakob|Fangmeier|Lenny|Reichert|David|Valchuk|Tim|Tiedemann|Tschira|Daniels|Ontuzans|Lucie|Misic|Fabian|Rufer|Dada)\b/gi) || []);
      const images: string[] = [];
      if (a.standardsOwnImages && Array.isArray(a.standardsOwnImages)) {
        images.push(...a.standardsOwnImages);
      }
      return {
        matchId: a.matchId || a.id,
        opponent: a.opponent || '?',
        date: a.date || '',
        fullText: text,
        types,
        playerNames: [...new Set(playerNames.map((n: string) => n.trim()))],
        images,
        analysisId: a.id
      };
    });
  }, [matchAnalyses]);

  const handleStandardFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 500;
    const svgY = ((e.clientY - rect.top) / rect.height) * 350;
    const x = Math.round(svgX);
    const y = Math.round(svgY);

    if (standardDrawMode === 'player') {
      setStandardPlayerPicker({ x: e.clientX, y: e.clientY, svgX: x, svgY: y });
    } else if (standardDrawMode === 'zone') {
      const ci = standardZones.length % ZONE_COLORS.length;
      setStandardZones(prev => [...prev, { x: x - 35, y: y - 25, w: 70, h: 50, color: ZONE_COLORS[ci] }]);
    } else if (standardDrawMode === 'run') {
      if (!standardRunStart) {
        setStandardRunStart({ x, y });
      } else {
        const colors = ['#06B6D4', '#F97316', '#A78BFA', '#34D399', '#FB7185'];
        setStandardRunPaths(prev => [...prev, { x1: standardRunStart.x, y1: standardRunStart.y, x2: x, y2: y, color: colors[prev.length % colors.length] }]);
        setStandardRunStart(null);
      }
    }
  };

  const handlePickPlayer = (player: any) => {
    if (!standardPlayerPicker) return;
    setStandardPlayers(prev => [...prev, {
      x: standardPlayerPicker.svgX,
      y: standardPlayerPicker.svgY,
      number: String(player.number || prev.length + 1),
      name: `${(player.firstName || '').trim().charAt(0)}. ${(player.lastName || '').trim()}`,
      color: prev.length < 11 ? '#e94560' : '#6366F1'
    }]);
    setStandardPlayerPicker(null);
  };

  // Sub-Tab 5: Audit Cards State (Fully Editable & Modifiable)
  const [auditCards, setAuditCards] = useState<Array<{
    id: string;
    title: string;
    value: string;
    description: string;
  }>>(() => {
    try {
      const saved = localStorage.getItem('fca_tactic_audit_cards');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', title: 'Matchplan-Erfüllung', value: '92%', description: 'Hohes Pressing & Flügelüberladung exzellent umgesetzt' },
      { id: '2', title: 'Erfolgreiche Standards', value: '4 Tore', description: 'Gefährliche Ecken an den 1. Pfosten' },
      { id: '3', title: 'Spieler des Spiels', value: '-', description: 'Wird nach dem Spiel vergeben' },
      { id: '4', title: 'System-Effizienz', value: '9.1 / 10', description: '4-2-3-1 Formation funktionierte reibungslos' }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('fca_tactic_audit_cards', JSON.stringify(auditCards));
    } catch (e) {}
  }, [auditCards]);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [editingAuditCard, setEditingAuditCard] = useState<{ id?: string; title: string; value: string; description: string }>({
    title: '', value: '', description: ''
  });

  const handleSaveAuditCard = () => {
    if (!editingAuditCard.title.trim()) {
      setNotification("Bitte geben Sie einen Titel ein!");
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    if (editingAuditCard.id) {
      setAuditCards(prev => prev.map(c => c.id === editingAuditCard.id ? {
        id: c.id,
        title: editingAuditCard.title,
        value: editingAuditCard.value,
        description: editingAuditCard.description
      } : c));
      setNotification("Audit-Punkt erfolgreich aktualisiert!");
    } else {
      const newCard = {
        id: `audit_${Date.now()}`,
        title: editingAuditCard.title,
        value: editingAuditCard.value || '-',
        description: editingAuditCard.description
      };
      setAuditCards(prev => [...prev, newCard]);
      setNotification("Neuer Audit-Punkt erfolgreich hinzugefügt!");
    }

    setShowAuditModal(false);
    setEditingAuditCard({ title: '', value: '', description: '' });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteAuditCard = (id: string) => {
    setAuditCards(prev => prev.filter(c => c.id !== id));
    setNotification("Audit-Punkt gelöscht.");
    setTimeout(() => setNotification(null), 3000);
  };

  // Firestore Custom Formations state
  const [customFormationsList, setCustomFormationsList] = useState<CustomFormationData[]>([]);

  // Active Custom formation overrides state
  const [customPositionsMap, setCustomPositionsMap] = useState<Record<string, { xPercent: number; yPercent: number }>>({});
  const [customRuns, setCustomRuns] = useState<PlayerRunPath[]>([]);
  const [customZones, setCustomZones] = useState<Array<{ playerId: string; zoneType: string; color: string }>>([]);
  const [customRoles, setCustomRoles] = useState<Record<string, string>>({});
  const [highlightedPlayerIds, setHighlightedPlayerIds] = useState<string[]>([]);
  const [lockedPlayerIds, setLockedPlayerIds] = useState<string[]>([]);

  // Lauf-Positionen der eigenen Spieler aus customRuns entlang des Fortschritts 0..1 berechnen
  const computeRunPositions = useCallback((t: number): Record<string, { x: number; y: number }> => {
    const positions: Record<string, { x: number; y: number }> = {};
    if (!customRuns || customRuns.length === 0) return positions;
    for (const run of customRuns) {
      if (!run?.playerId || !run?.path || run.path.length < 2) continue;
      const pt = pointAlongPathsForProgress(run.path, t);
      if (pt) positions[run.playerId] = pt;
    }
    return positions;
  }, [customRuns]);

  // STUFE 4: Passstafette-Logik
  const computePassBallPos = (t: number): { x: number; y: number } | null => {
    if (!passStations || passStations.length < 2) return null;
    const totalSeg = passStations.length - 1;
    const seg = Math.min(Math.max(0, t) * totalSeg, totalSeg - 0.000001);
    const i0 = Math.floor(seg);
    const local = seg - i0;
    const a = passStations[i0];
    const b = passStations[i0 + 1];
    return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local };
  };

  const togglePassMode = useCallback(() => {
    setPassMode(prev => {
      if (!prev) setFreeDrawMode(false);
      return !prev;
    });
  }, []);

  const addPassStation = useCallback((x: number, y: number) => {
    setPassStations(prev => [...prev, {
      id: `ps_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x,
      y,
      action: passAction
    }]);
  }, [passAction]);

  const removePassStation = useCallback((id: string) => {
    setPassStations(prev => prev.filter(s => s.id !== id));
  }, []);

  const loadPassTemplate = useCallback((n: number) => {
    const templates: Record<number, Array<{ x: number; y: number }>> = {
      3: [
        { x: 15, y: 62 },
        { x: 48, y: 45 },
        { x: 82, y: 40 }
      ],
      6: [
        { x: 12, y: 55 },
        { x: 26, y: 40 },
        { x: 42, y: 52 },
        { x: 58, y: 35 },
        { x: 72, y: 48 },
        { x: 86, y: 40 }
      ],
      9: [
        { x: 10, y: 60 },
        { x: 18, y: 35 },
        { x: 30, y: 55 },
        { x: 38, y: 30 },
        { x: 50, y: 65 },
        { x: 58, y: 35 },
        { x: 70, y: 62 },
        { x: 76, y: 30 },
        { x: 88, y: 45 }
      ]
    };
    const coords = templates[n] || templates[6];
    const ts = Date.now();
    setPassStations(coords.map((c, i) => ({
      id: `ps_${ts}_${i}`,
      x: c.x,
      y: c.y,
      action: PASS_ACTIONS[i % PASS_ACTIONS.length]
    })));
  }, []);

  // Manuelles Scrubben: Fortschritt setzen + Spielerpositionen sofort berechnen
  const handleScrub = useCallback((value: number) => {
    const p = Math.max(0, Math.min(1, value));
    animProgressRef.current = p;
    setAnimProgress(p);
    const runPositions = computeRunPositions(p);
    setAnimatedPlayerPositions(runPositions);
    setPassBallPos(computePassBallPos(p));
  }, [computeRunPositions, computePassBallPos]);

  const startMultiRunDrawing = (playerId: string) => {
    setMultiRunMode(true);
    setMultiRunPlayerId(playerId);
    setMultiRunPoints([]);
    setRunTargetModePlayerId(null);
    setFreeDrawMode(false);
    setPassMode(false);
  };

  const finishMultiRun = () => {
    if (multiRunPlayerId && multiRunPoints.length >= 2) {
      const startPos = multiRunPoints[0];
      const fullPath = [startPos, ...multiRunPoints.slice(1)];
      const phaseColors: Record<string, string> = {
        mitBall: '#3B82F6', defensive: '#EF4444', umschalten: '#F59E0B', standard: '#8B5CF6'
      };
      const newRun: PlayerRunPath = {
        id: `run_multi_${Date.now()}`,
        playerId: multiRunPlayerId,
        path: fullPath,
        color: phaseColors[activePhase] || '#3B82F6',
        type: 'lauf',
      };
      setCustomRuns(prev => [...prev, newRun]);
      notify(`Laufweg mit ${multiRunPoints.length} Punkten erstellt`);
    } else {
      notify('Mindestens 2 Punkte benötigt');
    }
    setMultiRunMode(false);
    setMultiRunPlayerId(null);
    setMultiRunPoints([]);
  };

  const loadRunTemplate = (count: 3 | 6 | 9) => {
    if (!multiRunPlayerId) return;
    const templates: Record<number, Array<{x: number; y: number}>> = {
      3: [{ x: 30, y: 50 }, { x: 55, y: 35 }, { x: 75, y: 50 }],
      6: [{ x: 25, y: 50 }, { x: 40, y: 30 }, { x: 55, y: 45 }, { x: 65, y: 25 }, { x: 78, y: 40 }, { x: 85, y: 50 }],
      9: [{ x: 25, y: 50 }, { x: 35, y: 35 }, { x: 42, y: 50 }, { x: 50, y: 30 }, { x: 58, y: 45 }, { x: 65, y: 25 }, { x: 72, y: 40 }, { x: 80, y: 35 }, { x: 88, y: 50 }],
    };
    setMultiRunPoints(templates[count] || []);
  };

  const startAnimation = useCallback(() => {
    if (isAnimating) {
      // Pause / Resume umschalten
      if (!animPaused) {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        setAnimPaused(true);
        return;
      } else {
        setAnimPaused(false);
        animLastTimeRef.current = performance.now();
      }
    } else {
      setIsAnimating(true);
      setAnimPaused(false);
      animProgressRef.current = 0;
      setAnimProgress(0);
    }
    // Falls keine Gegner/Pfade/Laufwege/Stafette sichtbar → nichts tun
    if (!showOpponents && drawnPaths.length === 0 && customRuns.length === 0 && passStations.length < 2 && !isAnimating) return;
    const baseDuration = 2500;
    const duration = Math.max(400, baseDuration / animSpeed);
    const tick = (now: number) => {
      const dt = (now - animLastTimeRef.current) / 1000;
      animLastTimeRef.current = now;
      if (!animPaused) {
        animProgressRef.current = Math.min(1, animProgressRef.current + dt / (duration / 1000));
      }
      const p = animProgressRef.current;
      setAnimProgress(p);
      // Eigene Spieler-Laufwege animieren
      const runPositions = computeRunPositions(p);
      setAnimatedPlayerPositions(runPositions);
      // Passstafette: Ball zwischen den Stationen interpolieren
      setPassBallPos(computePassBallPos(p));
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setIsAnimating(false);
        setAnimPaused(false);
        animProgressRef.current = 0;
        setAnimProgress(0);
        setAnimatedPlayerPositions({});
        setPassBallPos(null);
      }
    };
    animLastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(tick);
  }, [isAnimating, animPaused, animSpeed, showOpponents, drawnPaths, customRuns, passStations, computeRunPositions, computePassBallPos]);

  // SEQUENZ-MODUS: erst Laufweg (ohne Ball), dann Passweg, dann alles zusammen
  const startSequence = useCallback(() => {
    // Laufender Sequenz-Klick = stoppen
    if (seqRunning) {
      if (seqRef.current) cancelAnimationFrame(seqRef.current);
      setSeqRunning(false);
      setSeqPhase(null);
      setSeqProgress(0);
      seqProgressRef.current = 0;
      setAnimatedPlayerPositions({});
      setPassBallPos(null);
      return;
    }
    // Ggf. normale Animation stoppen
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const hasRuns = customRuns.length > 0;
    const hasPass = passStations.length >= 2;
    const order: Array<'lauf' | 'pass' | 'alles'> = [];
    if (hasRuns) order.push('lauf');
    if (hasPass) order.push('pass');
    if (hasRuns && hasPass) order.push('alles');
    if (order.length === 0) {
      setNotification('Zeichne zuerst Laufwege oder lege eine Passstafette an.');
      setTimeout(() => setNotification(null), 3500);
      return;
    }
    seqOrderRef.current = order;
    seqIdxRef.current = 0;
    const phase = order[0];
    seqPhaseRef.current = phase;
    setSeqRunning(true);
    setSeqPhase(phase);
    setSeqProgress(0);
    seqProgressRef.current = 0;

    const duration = Math.max(400, 2200 / animSpeed);
    const step = (now: number) => {
      const dt = (now - seqLastTimeRef.current) / 1000;
      seqLastTimeRef.current = now;
      seqProgressRef.current = Math.min(1, seqProgressRef.current + dt / (duration / 1000));
      const t = seqProgressRef.current;
      const cur = seqPhaseRef.current;
      setSeqProgress(t);
      if (cur === 'lauf' || cur === 'alles') {
        setAnimatedPlayerPositions(computeRunPositions(t));
      } else {
        setAnimatedPlayerPositions({});
      }
      if (cur === 'pass' || cur === 'alles') {
        setPassBallPos(computePassBallPos(t));
      } else {
        setPassBallPos(null);
      }
      if (t < 1) {
        seqRef.current = requestAnimationFrame(step);
      } else {
        seqIdxRef.current += 1;
        if (seqIdxRef.current < seqOrderRef.current.length) {
          const np = seqOrderRef.current[seqIdxRef.current];
          seqPhaseRef.current = np;
          setSeqPhase(np);
          seqProgressRef.current = 0;
          setSeqProgress(0);
          seqLastTimeRef.current = performance.now();
          seqRef.current = requestAnimationFrame(step);
        } else {
          setSeqRunning(false);
          setSeqPhase(null);
          setSeqProgress(0);
          seqProgressRef.current = 0;
          setAnimatedPlayerPositions({});
          setPassBallPos(null);
        }
      }
    };
    seqLastTimeRef.current = performance.now();
    if (seqRef.current) cancelAnimationFrame(seqRef.current);
    seqRef.current = requestAnimationFrame(step);
  }, [seqRunning, isAnimating, animSpeed, customRuns, passStations, computeRunPositions, computePassBallPos]);

  const stopSequence = useCallback(() => {
    if (seqRef.current) cancelAnimationFrame(seqRef.current);
    setSeqRunning(false);
    setSeqPhase(null);
    setSeqProgress(0);
    seqProgressRef.current = 0;
    setAnimatedPlayerPositions({});
    setPassBallPos(null);
  }, []);

  const seqPhaseLabel = seqPhase === 'lauf' ? 'Laufweg' : seqPhase === 'pass' ? 'Passweg' : seqPhase === 'alles' ? 'Alles' : 'Sequenz';

  // Dragging state on Pitch
  const pitchRef = useRef<HTMLDivElement>(null);
  const pitchSurfaceRef = useRef<HTMLDivElement>(null);
  const fullscreenPitchRef = useRef<HTMLDivElement>(null);
  const fullscreenPitchSurfaceRef = useRef<HTMLDivElement>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Context Menu state (Appears only on player click)
  const [contextMenuPlayerId, setContextMenuPlayerId] = useState<string | null>(null);
  const [contextSubMenu, setContextSubMenu] = useState<'main' | 'roles' | 'zones' | 'rename' | 'add_run'>('main');
  const [renameInput, setRenameInput] = useState<string>('');
  const [customRoleInput, setCustomRoleInput] = useState<string>('');
  const [runTargetModePlayerId, setRunTargetModePlayerId] = useState<string | null>(null);

  const [multiRunMode, setMultiRunMode] = useState(false);
  const [multiRunPlayerId, setMultiRunPlayerId] = useState<string | null>(null);
  const [multiRunPoints, setMultiRunPoints] = useState<Array<{x: number; y: number}>>([]);

  interface PitchMarker {
    id: string;
    x: number;
    y: number;
    color: string;
    label: string;
  }
  const [markers, setMarkers] = useState<PitchMarker[]>([]);
  const [markerMode, setMarkerMode] = useState(false);
  const [markerColor, setMarkerColor] = useState('#FACC15');
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);

  const MARKER_COLORS = [
    { color: '#FACC15', name: 'Gelb' },
    { color: '#22C55E', name: 'Grün' },
    { color: '#EF4444', name: 'Rot' },
    { color: '#3B82F6', name: 'Blau' },
    { color: '#F97316', name: 'Orange' },
    { color: '#A855F7', name: 'Lila' },
  ];

  // Drawing Canvas State
  const [drawWidth, setDrawWidth] = useState<number>(3);
  const [sketches, setSketches] = useState<any[]>([]);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Sync saved custom formations from Firestore
  useEffect(() => {
    const q = query(collection(db, 'custom_formations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CustomFormationData[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as CustomFormationData);
      });
      setCustomFormationsList(list);
    }, (err) => {
      console.warn("Could not load custom_formations from Firestore:", err);
    });
    return () => unsubscribe();
  }, []);

  // Sync state when selected formation changes
  useEffect(() => {
    const activeCustom = customFormationsList.find(f => f.id === selectedFormation);
    if (activeCustom) {
      setCustomPositionsMap(activeCustom.positions || {});
      setCustomRuns(activeCustom.runs || []);
      setCustomZones(activeCustom.zones || []);
      setCustomRoles(activeCustom.roles || {});
      setHighlightedPlayerIds(activeCustom.highlightedPlayerIds || []);
      setLockedPlayerIds(activeCustom.lockedPlayerIds || []);
    } else {
      // It's a preset system (4-2-3-1, etc.)
      setCustomPositionsMap({});
      setCustomRuns([]);
      setCustomZones([]);
      setCustomRoles({});
      setHighlightedPlayerIds([]);
      setLockedPlayerIds([]);
    }
  }, [selectedFormation, customFormationsList]);

  // Active Base preset data
  const basePreset = liveFormations[selectedFormation] || liveFormations['4-2-3-1'];

  // Helper: Persist active custom formation (or auto-create one if preset is edited)
  const syncActiveCustomFormationToFirestore = async (overrides: Partial<{
    name: string;
    positions: Record<string, { xPercent: number; yPercent: number }>;
    runs: PlayerRunPath[];
    zones: Array<{ playerId: string; zoneType: string; color: string }>;
    roles: Record<string, string>;
    highlightedPlayerIds: string[];
    lockedPlayerIds: string[];
  }>) => {
    let targetId = selectedFormation;
    let targetName = basePreset.name;

    const existingCustom = customFormationsList.find(f => f.id === selectedFormation);
    if (existingCustom) {
      targetId = existingCustom.id;
      targetName = overrides.name || existingCustom.name;
    } else {
      // Auto-create a new custom formation document if editing a preset system
      targetId = 'custom_' + Date.now();
      targetName = overrides.name || `${basePreset.name} (Trainer Anpassung)`;
      setSelectedFormation(targetId);
    }

    const updatedPositions = overrides.positions !== undefined ? overrides.positions : customPositionsMap;
    const updatedRuns = overrides.runs !== undefined ? overrides.runs : customRuns;
    const updatedZones = overrides.zones !== undefined ? overrides.zones : customZones;
    const updatedRoles = overrides.roles !== undefined ? overrides.roles : customRoles;
    const updatedHighlights = overrides.highlightedPlayerIds !== undefined ? overrides.highlightedPlayerIds : highlightedPlayerIds;
    const updatedLocks = overrides.lockedPlayerIds !== undefined ? overrides.lockedPlayerIds : lockedPlayerIds;

    const payload: CustomFormationData = {
      id: targetId,
      name: targetName,
      description: existingCustom?.description || 'Individuelle Trainer-Formation',
      positions: updatedPositions,
      runs: updatedRuns,
      zones: updatedZones,
      roles: updatedRoles,
      highlightedPlayerIds: updatedHighlights,
      lockedPlayerIds: updatedLocks,
      createdAt: existingCustom?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'custom_formations', targetId), payload, { merge: true });
    } catch (err) {
      console.error("Fehler beim Speichern der Formation in Firestore:", err);
    }
  };

  // Helper: Create brand new custom formation
  const handleCreateNewFormation = async () => {
    const newId = 'custom_' + Date.now();
    const newName = `Trainer System ${customFormationsList.length + 1}`;
    
    // Copy initial positions from current active view
    const initialPosMap: Record<string, { xPercent: number; yPercent: number }> = {};
    basePreset.nodes.forEach(n => {
      initialPosMap[n.id] = { xPercent: n.xPercent, yPercent: n.yPercent };
    });

    const newFormation: CustomFormationData = {
      id: newId,
      name: newName,
      description: 'Frei konfigurierbares Trainer-System',
      positions: initialPosMap,
      runs: [],
      zones: [],
      roles: {},
      highlightedPlayerIds: [],
      lockedPlayerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'custom_formations', newId), newFormation);
      setSelectedFormation(newId);
      notify(`Neue Formation "${newName}" erstellt!`);
    } catch (err) {
      console.error("Fehler beim Anlegen der Formation:", err);
      notify("Fehler beim Erstellen der Formation.");
    }
  };

  // Helper: Rename active formation
  const handleRenameActiveFormation = async (newName: string) => {
    if (!newName.trim()) return;
    await syncActiveCustomFormationToFirestore({ name: newName.trim() });
    setContextSubMenu('main');
    notify(`Formation umbenannt in "${newName.trim()}"`);
  };

  // Compute actual Node positions
  const currentNodePositions = useMemo(() => {
    return basePreset.nodes.map(node => {
      let x = node.xPercent;
      let y = node.yPercent;

      // Custom position override takes priority if active
      if (customPositionsMap[node.id]) {
        x = customPositionsMap[node.id].xPercent;
        y = customPositionsMap[node.id].yPercent;
      } else {
        if (activePhase === 'offensiv') {
          x = node.offensivX;
          y = node.offensivY;
        } else if (activePhase === 'defensiv') {
          x = node.defensivX;
          y = node.defensivY;
        } else if (activePhase === 'umschalten') {
          x = node.umschaltX;
          y = node.umschaltY;
        } else if (activePhase === 'umschalten_defensiv') {
          x = Math.round(node.umschaltX * 0.45 + node.defensivX * 0.55);
          y = Math.round(node.umschaltY * 0.45 + node.defensivY * 0.55);
        }
      }

      const activeRole = customRoles[node.id] || node.role;
      const isHighlighted = highlightedPlayerIds.includes(node.id);
      const isLocked = lockedPlayerIds.includes(node.id);
      const zoneObj = customZones.find(z => z.playerId === node.id);

      return { 
        ...node, 
        role: activeRole, 
        currentX: x, 
        currentY: y,
        isHighlighted,
        isLocked,
        markedZone: zoneObj?.zoneType
      };
    });
  }, [basePreset, activePhase, customPositionsMap, customRoles, highlightedPlayerIds, lockedPlayerIds, customZones]);

  const selectedNode = selectedNodeId ? (currentNodePositions.find(n => n.id === selectedNodeId) || null) : null;
  const contextMenuPlayerNode = currentNodePositions.find(n => n.id === contextMenuPlayerId);

  // ═══ STUFE 3: Spielaufbau-Varianten (vordefinierte Laufwege nach Position setzen) ═══
  const applyBuildUpVariant = useCallback((variant: 'sechser' | 'achter' | 'langerBall' | 'strafraum') => {
    const pos = currentNodePositions;
    const by = (px: string) => pos.find(n => n.position === px);
    const runs: PlayerRunPath[] = [];
    let idc = 1;
    const mk = (playerId: string, targetX: number, targetY: number, color: string) => {
      const n = pos.find(p => p.id === playerId);
      if (!n) return;
      runs.push({
        id: 'bu_' + Date.now() + '_' + idc++,
        playerId,
        path: [
          { x: Math.round(n.currentX * 20) / 20, y: Math.round(n.currentY * 20) / 20 },
          { x: Math.round(targetX * 20) / 20, y: Math.round(targetY * 20) / 20 },
        ],
        color,
      });
    };
    const dm = by('DM') || by('ZM');
    const dmId = dm?.id;

    if (variant === 'sechser' && dmId) {
      mk(dmId, dm!.currentX + 4, dm!.currentY - 14, '#0055FF');
      pos.filter(n => n.position === 'IV').forEach((iv, i) => {
        mk(iv.id, iv.currentX + (i === 0 ? -6 : 6), iv.currentY - 6, '#0055FF');
      });
      pos.filter(n => n.position === 'RV' || n.position === 'LV').forEach(av => {
        mk(av.id, av.currentX, av.currentY - 18, '#22C55E');
      });
    } else if (variant === 'achter') {
      const acht = by('ZM') || by('OM');
      if (acht) mk(acht.id, 50, acht.currentY - 16, '#0055FF');
      const st = by('ST');
      if (st) mk(st.id, st.currentX + 8, 12, '#EF4444');
    } else if (variant === 'langerBall') {
      const wing = by('RA') || by('LA') || by('RM') || by('LM');
      if (wing) mk(wing.id, wing.currentX <= 50 ? 12 : 88, 14, '#F59E0B');
      const st = by('ST');
      if (st) mk(st.id, st.currentX - 6, st.currentY - 6, '#EF4444');
    } else if (variant === 'strafraum') {
      const st = by('ST');
      if (st) mk(st.id, 38, 5, '#EF4444');
      const om = by('OM') || by('ZM') || by('RA');
      if (om) mk(om.id, 62, 8, '#0055FF');
      const dm2 = by('DM') || by('ZM');
      if (dm2 && dm2.id !== om?.id) mk(dm2.id, 50, 20, '#F59E0B');
    }
    setCustomRuns(runs);
    syncActiveCustomFormationToFirestore({ runs });
    notify(`Spielaufbau-Variante geladen (${variant})`);
  }, [currentNodePositions, setCustomRuns, syncActiveCustomFormationToFirestore, notify]);

  const applyDoppelpass = useCallback(() => {
    const passTemplate = [
      { id: `dp_pass_1`, x: 30, y: 50, action: 'Doppelpass' },
      { id: `dp_pass_2`, x: 55, y: 35, action: 'Klatschball' },
      { id: `dp_pass_3`, x: 45, y: 60, action: 'Steilpass' },
      { id: `dp_pass_4`, x: 70, y: 45, action: 'Direktpass' },
      { id: `dp_pass_5`, x: 85, y: 50, action: 'Torschuss' },
    ];
    setPassStations(passTemplate);

    const runA: PlayerRunPath = {
      id: `dp_run_a_${Date.now()}`,
      playerId: presentationLineup[7]?.id || 'om',
      path: [{ x: 70, y: 35 }, { x: 50, y: 50 }, { x: 35, y: 40 }],
      color: '#A78BFA',
      type: 'lauf',
    };
    const runB: PlayerRunPath = {
      id: `dp_run_b_${Date.now()}`,
      playerId: presentationLineup[6]?.id || 'ra',
      path: [{ x: 25, y: 55 }, { x: 50, y: 45 }, { x: 70, y: 55 }],
      color: '#34D399',
      type: 'lauf',
    };
    setCustomRuns(prev => [...prev.filter(r => !r.id.startsWith('dp_')), runA, runB]);
    notify('Doppelpass-Variante geladen: 2 Kreuzlaufwege + 5 Ballstationen');
  }, [presentationLineup, setPassStations, setCustomRuns, notify]);

  // Helper render pitch for presentation slides (Main View + TV Mode Sync)
  const renderPitchForSlide = (sIndex: number) => {
    return (
      <div 
        className={`bg-emerald-950/90 border-2 border-slate-800 rounded-2xl p-3 min-h-[350px] h-full relative flex flex-col justify-between shadow-inner overflow-hidden select-none ${pitchEditMode || markerMode ? 'ring-2 ring-amber-400/40' : ''}`}
        onMouseDown={handlePitchMouseDown}
        onMouseMove={handlePitchMouseMove}
        onMouseUp={handlePitchMouseUp}
        onTouchMove={handlePitchMouseMove}
        onTouchEnd={handlePitchMouseUp}
      >
        {/* PITCH GRASS LINES & MARKINGS */}
        <div className="absolute inset-2 border-2 border-emerald-400/30 rounded-lg pointer-events-none overflow-hidden">
          {/* Grass Stripes */}
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(16,185,129,0.06)_50%,transparent_50%)] bg-[length:100%_40px]" />
          
          {/* Center Line & Circle — vertical pitch (goals top/bottom) */}
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400/30" />
          <div className="absolute top-1/2 left-1/2 w-24 h-24 rounded-full border-2 border-emerald-400/30 -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute top-1/2 left-1/2 w-2 h-2 bg-emerald-400/40 rounded-full -translate-x-1/2 -translate-y-1/2" />

          {/* Penalty Boxes — vertical */}
          <div className="absolute top-0 left-1/4 right-1/4 h-16 border-b-2 border-l-2 border-r-2 border-emerald-400/30" />
          <div className="absolute bottom-0 left-1/4 right-1/4 h-16 border-t-2 border-l-2 border-r-2 border-emerald-400/30" />
          
          {/* Goal Boxes — vertical */}
          <div className="absolute top-0 left-1/3 right-1/3 h-6 border-b-2 border-l-2 border-r-2 border-emerald-400/30" />
          <div className="absolute bottom-0 left-1/3 right-1/3 h-6 border-t-2 border-l-2 border-r-2 border-emerald-400/30" />

          {/* Corner Arcs — vertical */}
          <div className="absolute top-0 left-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400/30 rounded-br-full" />
          <div className="absolute top-0 right-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400/30 rounded-bl-full" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400/30 rounded-tr-full" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400/30 rounded-tl-full" />

          {/* Zonen Overlay — horizontal lanes for vertical pitch */}
          <div className="absolute inset-0 grid grid-rows-5 opacity-20 pointer-events-none">
            <div className="border-b border-dashed border-emerald-400/40 bg-emerald-500/5 flex items-start justify-center pt-1"><span className="text-[7px] font-mono text-emerald-300">Flügel L</span></div>
            <div className="border-b border-dashed border-emerald-400/40 bg-amber-500/10 flex items-start justify-center pt-1"><span className="text-[7px] font-mono text-amber-300">1. Halbraum</span></div>
            <div className="border-b border-dashed border-emerald-400/40 bg-emerald-500/5 flex items-start justify-center pt-1"><span className="text-[7px] font-mono text-emerald-300">Zentrum</span></div>
            <div className="border-b border-dashed border-emerald-400/40 bg-amber-500/10 flex items-start justify-center pt-1"><span className="text-[7px] font-mono text-amber-300">2. Halbraum</span></div>
            <div className="flex items-start justify-center pt-1"><span className="text-[7px] font-mono text-emerald-300">Flügel R</span></div>
          </div>
        </div>

        {/* DYNAMIC OVERLAYS BY SLIDE INDEX */}
        
        {/* SLIDE 0: TITEL MATCHUP PITCH */}
        {sIndex === 0 && (
          <div className="absolute inset-0 p-4">
            {/* FC AUGGEN NODES (GREEN) */}
            {presentationLineup.map((n: any) => (
              <div
                key={`fca_${n.id}`}
                style={{ left: `${n.xPercent * 0.45 + 5}%`, top: `${n.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                onMouseDown={pitchEditMode ? (e) => {
                  e.stopPropagation();
                  if (swapFirstPlayer) {
                    if (swapFirstPlayer !== n.name) {
                      const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                      const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                      if (idx1 >= 0 && idx2 >= 0) {
                        swappedPositionsRef.current.add(idx1);
                        swappedPositionsRef.current.add(idx2);
                        setPresentationLineup((prev: any[]) => {
                          const next = [...prev];
                          [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                          return next;
                        });
                        notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                      }
                      setSwapFirstPlayer(null);
                    }
                  } else {
                    setSwapFirstPlayer(n.name);
                  }
                } : undefined}
                title={`${n.name} (${n.position}) - ${n.role || ''}`}
              >
                {n.image ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg border border-white">
                    {n.number}
                  </span>
                )}
                <span className="text-[7px] font-black uppercase text-white bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">
                  {n.name.split(' ').pop()}
                </span>
              </div>
            ))}

            {/* OPPONENT NODES (RED) — vertical pitch */}
            {[
              { id: 'op1', num: '1', pos: 'TW', name: 'Torwart', x: 50, y: 8 },
              { id: 'op2', num: '2', pos: 'RV', name: 'Rechtsverteidiger', x: 18, y: 22 },
              { id: 'op3', num: '4', pos: 'IV', name: 'Innenverteidiger', x: 38, y: 18 },
              { id: 'op4', num: '5', pos: 'IV', name: 'Innenverteidiger', x: 62, y: 18 },
              { id: 'op5', num: '3', pos: 'LV', name: 'Linksverteidiger', x: 82, y: 22 },
              { id: 'op6', num: '6', pos: 'DM', name: 'Sechser', x: 50, y: 32 },
              { id: 'op7', num: '8', pos: 'ZM', name: 'Achter', x: 32, y: 38 },
              { id: 'op8', num: '10', pos: 'OM', name: 'Zehner', x: 68, y: 38 },
              { id: 'op9', num: '7', pos: 'RA', name: 'Rechtsaussen', x: 20, y: 48 },
              { id: 'op10', num: '9', pos: 'ST', name: 'Stürmer', x: 50, y: 50 },
              { id: 'op11', num: '11', pos: 'LA', name: 'Linksaussen', x: 80, y: 48 },
            ].map((op) => (
              <div
                key={op.id}
                style={{ left: `${op.x}%`, top: `${op.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
              >
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 text-white font-black text-[9px] flex items-center justify-center shadow-lg border-2 border-white/80">
                  {op.num}
                </span>
                <span className="text-[7px] font-black uppercase text-white bg-rose-500/90 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow border border-rose-400/50">
                  {op.pos}
                </span>
                <span className="text-[6px] font-bold text-rose-300/70 whitespace-nowrap">
                  {op.name}
                </span>
              </div>
            ))}

            {/* BATTLEGROUND OVERLAY — centered zone for vertical pitch */}
            <div className="absolute left-1/4 right-1/4 top-[35%] bottom-[35%] bg-amber-400/20 border-2 border-dashed border-amber-400 rounded-2xl flex items-center justify-center pointer-events-none animate-pulse">
              <span className="bg-slate-950/90 text-amber-400 font-black text-[9px] uppercase px-2 py-0.5 rounded border border-amber-400/50 shadow">
                ⚔️ Haupt-Duellzone 1. Halbraum
              </span>
            </div>
          </div>
        )}

        {/* SLIDE 1: AUFSTELLUNG & BANK PITCH */}
        {sIndex === 1 && (
          <div className="absolute inset-0 p-4">
            {presentationLineup.map((n: any) => (
              <div
                key={`s1_${n.id}`}
                style={{ left: `${n.xPercent}%`, top: `${n.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125 cursor-pointer'}`}
                title={`${n.name} (${n.position}) - ${n.role}`}
                onMouseDown={pitchEditMode ? (e) => {
                  e.stopPropagation();
                  if (swapFirstPlayer) {
                    if (swapFirstPlayer !== n.name) {
                      const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                      const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                      if (idx1 >= 0 && idx2 >= 0) {
                        swappedPositionsRef.current.add(idx1);
                        swappedPositionsRef.current.add(idx2);
                        setPresentationLineup((prev: any[]) => {
                          const next = [...prev];
                          [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                          return next;
                        });
                        notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                      }
                      setSwapFirstPlayer(null);
                    }
                  } else {
                    setSwapFirstPlayer(n.name);
                  }
                } : undefined}
              >
                {n.image ? (
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white shadow-xl">
                    <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="w-6.5 h-6.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xl border-2 border-white">
                    {n.number}
                  </span>
                )}
                <span className="text-[8px] font-black uppercase text-white bg-slate-950/90 px-1.5 rounded mt-0.5 whitespace-nowrap shadow border border-emerald-500/40">
                  {n.name.split(' ').pop()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 2: FORMATION KETTEN PITCH */}
        {sIndex === 2 && (
          <div className="absolute inset-0 p-4">
            {/* CONNECTING CHAIN SVG LINES */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* 4er Abwehrkette Line */}
              <line x1="22%" y1="18%" x2="22%" y2="82%" stroke="#10b981" strokeWidth="3" strokeDasharray="6 4" opacity="0.8" />
              {/* Doppel 6 Line */}
              <line x1="42%" y1="35%" x2="42%" y2="65%" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6 4" opacity="0.8" />
              {/* 3er Offensivreihe Line */}
              <line x1="68%" y1="20%" x2="68%" y2="80%" stroke="#06b6d4" strokeWidth="3" strokeDasharray="6 4" opacity="0.8" />
            </svg>

            {presentationLineup.map((n: any) => (
              <div
                key={`s2_${n.id}`}
                style={{ left: `${n.xPercent}%`, top: `${n.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                onMouseDown={pitchEditMode ? (e) => {
                  e.stopPropagation();
                  if (swapFirstPlayer) {
                    if (swapFirstPlayer !== n.name) {
                      const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                      const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                      if (idx1 >= 0 && idx2 >= 0) {
                        swappedPositionsRef.current.add(idx1);
                        swappedPositionsRef.current.add(idx2);
                        setPresentationLineup((prev: any[]) => {
                          const next = [...prev];
                          [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                          return next;
                        });
                        notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                      }
                      setSwapFirstPlayer(null);
                    }
                  } else {
                    setSwapFirstPlayer(n.name);
                  }
                } : undefined}
                title={`${n.name} (${n.position}) - ${n.role || ''}`}
              >
                {n.image ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-lg border border-white">
                    {n.number}
                  </span>
                )}
                <span className="text-[8px] font-black uppercase text-white bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">
                  {n.name.split(' ').pop()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 3: DEFENSIV PRESSING PITCH */}
        {sIndex === 3 && (
          <div className="absolute inset-0 p-4">
            {/* SHADED PRESSING ZONE */}
            <div
              className={`absolute inset-y-2 border-2 border-dashed border-rose-500 rounded-xl bg-rose-500/15 pointer-events-none transition-all ${
                tacticalPhaseConfig.defensiv.pressinghoehe === 'hoch'
                  ? 'left-[50%] right-2'
                  : tacticalPhaseConfig.defensiv.pressinghoehe === 'tief'
                  ? 'left-2 right-[60%]'
                  : 'left-[25%] right-[25%]'
              }`}
            >
              <span className="absolute top-2 left-2 bg-rose-500 text-white font-black text-[8px] uppercase px-1.5 py-0.5 rounded shadow">
                🛡️ PRESSING-ZONE ({tacticalPhaseConfig.defensiv.pressinghoehe.toUpperCase()})
              </span>
            </div>

            {/* COMPACT DEFENSIVE NODES */}
            {presentationLineup.map((n: any) => {
              const shiftedX = Math.max(12, n.xPercent * 0.7 + 10);
              return (
                <div
                  key={`s3_${n.id}`}
                  style={{ left: `${shiftedX}%`, top: `${n.yPercent}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                  onMouseDown={pitchEditMode ? (e) => {
                    e.stopPropagation();
                    if (swapFirstPlayer) {
                      if (swapFirstPlayer !== n.name) {
                        const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                        const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                        if (idx1 >= 0 && idx2 >= 0) {
                          swappedPositionsRef.current.add(idx1);
                          swappedPositionsRef.current.add(idx2);
                          setPresentationLineup((prev: any[]) => {
                            const next = [...prev];
                            [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                            return next;
                          });
                          notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                        }
                        setSwapFirstPlayer(null);
                      }
                    } else {
                      setSwapFirstPlayer(n.name);
                    }
                  } : undefined}
                  title={`${n.name} (${n.position}) - ${n.role || ''}`}
                >
                  {n.image ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-lg">
                      <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span className="w-5.5 h-5.5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-lg border border-white">
                      {n.number}
                    </span>
                  )}
                  <span className="text-[7px] font-black uppercase text-rose-200 bg-slate-950/90 px-1 rounded mt-0.5 whitespace-nowrap">
                    {n.name.split(' ').pop()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* SLIDE 4: OFFENSIV BUILD-UP PITCH */}
        {sIndex === 4 && (
          <div className="absolute inset-0 p-4">
            {/* PASSING TRIANGLES SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Triangle 1: IV - 6er - OM */}
              <polygon points="22%,35% 42%,35% 68%,50%" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2" strokeDasharray="4 3" />
              {/* Forward vector to ST */}
              <line x1="68%" y1="50%" x2="88%" y2="50%" stroke="#38bdf8" strokeWidth="3" strokeDasharray="5 3" />
            </svg>

            {presentationLineup.map((n: any) => (
              <div
                key={`s4_${n.id}`}
                style={{ left: `${n.xPercent}%`, top: `${n.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                onMouseDown={pitchEditMode ? (e) => {
                  e.stopPropagation();
                  if (swapFirstPlayer) {
                    if (swapFirstPlayer !== n.name) {
                      const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                      const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                      if (idx1 >= 0 && idx2 >= 0) {
                        swappedPositionsRef.current.add(idx1);
                        swappedPositionsRef.current.add(idx2);
                        setPresentationLineup((prev: any[]) => {
                          const next = [...prev];
                          [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                          return next;
                        });
                        notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                      }
                      setSwapFirstPlayer(null);
                    }
                  } else {
                    setSwapFirstPlayer(n.name);
                  }
                } : undefined}
                title={`${n.name} (${n.position}) - ${n.role || ''}`}
              >
                {n.image ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="w-5.5 h-5.5 rounded-full bg-cyan-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg border border-white">
                    {n.number}
                  </span>
                )}
                <span className="text-[7px] font-black uppercase text-cyan-200 bg-slate-950/90 px-1 rounded mt-0.5 whitespace-nowrap">
                  {n.name.split(' ').pop()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 5: UMSCHALTEN & GEGENPRESSING PITCH */}
        {sIndex === 5 && (
          <div className="absolute inset-0 p-4">
            {/* LOSS ZONE HOTSPOT */}
            <div className="absolute top-[35%] left-[55%] -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-amber-500/30 border-2 border-dashed border-amber-400 flex items-center justify-center animate-ping pointer-events-none" />
            <div className="absolute top-[35%] left-[55%] -translate-x-1/2 -translate-y-1/2 z-20 bg-amber-400 text-slate-950 font-black text-[8px] uppercase px-1.5 py-0.5 rounded shadow flex items-center gap-1">
              ⚡ Ballverlust (5s)
            </div>

            {/* SWARM VECTORS TO LOSS ZONE */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              <line x1="42%" y1="35%" x2="55%" y2="35%" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />
              <line x1="68%" y1="20%" x2="55%" y2="35%" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />
              <line x1="68%" y1="50%" x2="55%" y2="35%" stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" />
              {/* Fast break vector */}
              <line x1="55%" y1="35%" x2="88%" y2="50%" stroke="#10b981" strokeWidth="4" />
            </svg>

            {presentationLineup.map((n: any) => (
              <div
                key={`s5_${n.id}`}
                style={{ left: `${n.xPercent}%`, top: `${n.yPercent}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                onMouseDown={pitchEditMode ? (e) => {
                  e.stopPropagation();
                  if (swapFirstPlayer) {
                    if (swapFirstPlayer !== n.name) {
                      const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                      const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                      if (idx1 >= 0 && idx2 >= 0) {
                        swappedPositionsRef.current.add(idx1);
                        swappedPositionsRef.current.add(idx2);
                        setPresentationLineup((prev: any[]) => {
                          const next = [...prev];
                          [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                          return next;
                        });
                        notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                      }
                      setSwapFirstPlayer(null);
                    }
                  } else {
                    setSwapFirstPlayer(n.name);
                  }
                } : undefined}
                title={`${n.name} (${n.position}) - ${n.role || ''}`}
              >
                {n.image ? (
                  <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-lg">
                    <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="w-5.5 h-5.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg border border-white">
                    {n.number}
                  </span>
                )}
                <span className="text-[7px] font-black uppercase text-amber-200 bg-slate-950/90 px-1 rounded mt-0.5 whitespace-nowrap">
                  {n.name.split(' ').pop()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 6: STANDARDS EXECUTION PITCH */}
        {sIndex === 6 && (
          <div className="absolute inset-0 p-4">
            {/* CORNER SPOT & CURVE ARC */}
            <div className="absolute bottom-2 right-2 w-4 h-4 bg-amber-400 rounded-full border-2 border-white z-20 animate-bounce flex items-center justify-center text-[7px] font-black text-slate-950">
              ⚽
            </div>
            
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {/* Corner Delivery Arc */}
              <path d="M 95% 90% Q 75% 50% 88% 30%" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5 3" />
              {/* Runner Path */}
              <line x1="72%" y1="50%" x2="88%" y2="30%" stroke="#10b981" strokeWidth="3" />
            </svg>

            {presentationLineup.map((n: any) => {
              // Cluster players near right corner box for standard
              const isHeader = ['4', '5', '9', '10'].includes(n.number);
              const posX = isHeader ? 82 + (parseInt(n.number) % 3) * 4 : n.xPercent;
              const posY = isHeader ? 30 + (parseInt(n.number) % 4) * 12 : n.yPercent;
              return (
                <div
                  key={`s6_${n.id}`}
                  style={{ left: `${posX}%`, top: `${posY}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 ${pitchEditMode ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-amber-400 hover:scale-125' : 'transition-all hover:scale-125'}`}
                  onMouseDown={pitchEditMode ? (e) => {
                    e.stopPropagation();
                    if (swapFirstPlayer) {
                      if (swapFirstPlayer !== n.name) {
                        const idx1 = presentationLineup.findIndex((p: any) => p.name === swapFirstPlayer);
                        const idx2 = presentationLineup.findIndex((p: any) => p.name === n.name);
                        if (idx1 >= 0 && idx2 >= 0) {
                          swappedPositionsRef.current.add(idx1);
                          swappedPositionsRef.current.add(idx2);
                          setPresentationLineup((prev: any[]) => {
                            const next = [...prev];
                            [next[idx1], next[idx2]] = [next[idx2], next[idx1]];
                            return next;
                          });
                          notify(`${swapFirstPlayer} ↔ ${n.name} getauscht`);
                        }
                        setSwapFirstPlayer(null);
                      }
                    } else {
                      setSwapFirstPlayer(n.name);
                    }
                  } : undefined}
                  title={`${n.name} (${n.position}) - ${n.role || ''}`}
                >
                  {n.image ? (
                    <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-white shadow-lg">
                      <img src={n.image} alt={n.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span className="w-5.5 h-5.5 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg border border-white">
                      {n.number}
                    </span>
                  )}
                  <span className="text-[7px] font-black uppercase text-white bg-slate-950/90 px-1 rounded mt-0.5 whitespace-nowrap">
                    {n.name.split(' ').pop()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* SLIDE 7: COACHING POINTS HOTSPOTS PITCH */}
        {sIndex === 7 && (
          <div className="absolute inset-0 p-4">
            {[
              { id: 1, label: '1. Zweikampf & Gegenpressing', x: 48, y: 50, color: 'bg-rose-500' },
              { id: 2, label: '2. Sechser-Andribbeln', x: 38, y: 35, color: 'bg-amber-400 text-slate-950' },
              { id: 3, label: '3. Tiefenruns Akuegwu', x: 82, y: 50, color: 'bg-emerald-400 text-slate-950' },
              { id: 4, label: '4. Restverteidigung 3er', x: 22, y: 50, color: 'bg-sky-400 text-slate-950' },
              { id: 5, label: '5. Standards Sweden/Charles', x: 90, y: 85, color: 'bg-purple-500' },
            ].map((hs) => (
              <div
                key={hs.id}
                style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 group cursor-pointer"
              >
                <span className={`w-7 h-7 rounded-full ${hs.color} font-black text-xs flex items-center justify-center shadow-xl border-2 border-white animate-pulse`}>
                  {hs.id}
                </span>
                <span className="text-[8px] font-black uppercase text-white bg-slate-950/90 px-1.5 py-0.5 rounded mt-1 whitespace-nowrap shadow border border-slate-700">
                  {hs.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* SLIDE 8: SPIELBERICHT MATCH EVENTS PITCH */}
        {sIndex === 8 && (
          <div className="absolute inset-0 p-4">
            {/* MATCH EVENTS ON PITCH */}
            {[
              { id: 'g1', type: '⚽ TOR', minute: "24'", player: 'Akuegwu (ST)', x: 88, y: 48, bg: 'bg-emerald-500 text-slate-950' },
              { id: 'g2', type: '⚽ TOR', minute: "58'", player: 'Dischinger (OM)', x: 82, y: 35, bg: 'bg-emerald-500 text-slate-950' },
              { id: 'g3', type: '⚽ TOR', minute: "79'", player: 'Ehret (LA)', x: 85, y: 65, bg: 'bg-emerald-500 text-slate-950' },
              { id: 'c1', type: '🟨 GELB', minute: "34'", player: 'Kalchschmidt (ZM)', x: 42, y: 50, bg: 'bg-amber-400 text-slate-950' },
              { id: 's1', type: '🔥 xG Hotspot', minute: '1.28 xG', player: 'Zentrum 16m', x: 75, y: 50, bg: 'bg-sky-400 text-slate-950' },
            ].map((ev) => (
              <div
                key={ev.id}
                style={{ left: `${ev.x}%`, top: `${ev.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 shadow-lg"
              >
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${ev.bg} border border-white shadow-xl flex items-center gap-1`}>
                  <span>{ev.type}</span> <span>{ev.minute}</span>
                </span>
                <span className="text-[8px] font-bold text-white bg-slate-950/90 px-1 rounded mt-0.5 whitespace-nowrap">
                  {ev.player}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* MARKERS — always visible on all slides */}
        {markers.map((m) => (
          <div
            key={m.id}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 z-30 group ${pitchEditMode || markerMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onMouseDown={(e) => {
              if (!pitchEditMode && !markerMode) return;
              e.stopPropagation();
              setDraggingMarkerId(m.id);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              const newLabel = prompt('Beschreibung (optional):', m.label || '');
              if (newLabel !== null) {
                setMarkers(prev => prev.map(mm => mm.id === m.id ? { ...mm, label: newLabel } : mm));
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMarkers(prev => prev.filter(mm => mm.id !== m.id));
            }}
          >
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-transform hover:scale-150"
              style={{ backgroundColor: m.color, opacity: 0.85 }}
            />
            {m.label && (
              <span className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-[7px] font-bold text-white bg-slate-950/90 px-1 rounded whitespace-nowrap shadow">
                {m.label}
              </span>
            )}
          </div>
        ))}

        {/* FOOTER CAPTION FOR THE PITCH */}
        <div className="z-20 flex items-center justify-between bg-slate-950/90 border border-slate-800 p-2 rounded-xl backdrop-blur-md mt-auto">
          <span className="text-[9px] font-black uppercase text-emerald-400 flex items-center gap-1">
            <Compass size={12} /> Taktikfeld 2D/3D Live Sync
          </span>
          <span className="text-[9px] text-slate-400 font-mono">
            {activeClub.name} 26/27
          </span>
        </div>
      </div>
    );
  };

  // Pitch Drag & Drop Handlers with high-precision sub-pixel mouse alignment
  const handlePitchMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement> | MouseEvent | TouchEvent) => {
    // Marker dragging
    if (draggingMarkerId) {
      const cur = (e.currentTarget as HTMLElement | null);
      const rect = cur && cur.getBoundingClientRect ? cur.getBoundingClientRect() : null;
      let clientX = 0, clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
      else if ('clientX' in e) { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
      else return;
      if (!rect) return;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setMarkers(prev => prev.map(m => m.id === draggingMarkerId ? { ...m, x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) } : m));
      return;
    }

    // Edit mode: move player nodes
    if (pitchEditMode && swapFirstPlayer) {
      const cur = (e.currentTarget as HTMLElement | null);
      const rect = cur && cur.getBoundingClientRect ? cur.getBoundingClientRect() : null;
      let clientX = 0, clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
      else if ('clientX' in e) { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
      else return;
      if (!rect) return;
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      setPresentationLineup((prev: any[]) => {
        const idx = prev.findIndex((n: any) => n.name === swapFirstPlayer);
        if (idx < 0) return prev;
        swappedPositionsRef.current.add(idx);
        const next = [...prev];
        next[idx] = { ...next[idx], xPercent: Math.max(2, Math.min(98, x)), yPercent: Math.max(2, Math.min(98, y)) };
        return next;
      });
    }

    // Gegner bewegen
    if (draggingOppId) {
      const targetEl = isPitchOnlyFullscreen
        ? (fullscreenPitchSurfaceRef.current || fullscreenPitchRef.current)
        : (pitchSurfaceRef.current || pitchRef.current);
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      let clientX = 0, clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
      else if ('clientX' in e) { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
      else return;
      const x = Math.max(0.5, Math.min(99.5, ((clientX - rect.left) / rect.width) * 100));
      let y = Math.max(0.5, Math.min(99.5, ((clientY - rect.top) / rect.height) * 100));
      const is3D = viewMode === '3d_tv' || isPitchOnlyFullscreen;
      if (is3D) { const pc = 1 / Math.cos(12 * Math.PI / 180); y = Math.max(0.5, Math.min(99.5, (y - 50) * pc + 50)); }
      const px = Math.round(x * 20) / 20, py = Math.round(y * 20) / 20;
      setOpponentPlayers(prev => prev.map(o => o.id === draggingOppId ? { ...o, x: px, y: py } : o));
      return;
    }

    // Freihand-Zeichnen
    if (freeDrawMode && isDrawingFreehand) {
      const targetEl = isPitchOnlyFullscreen
        ? (fullscreenPitchSurfaceRef.current || fullscreenPitchRef.current)
        : (pitchSurfaceRef.current || pitchRef.current);
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      let clientX = 0, clientY = 0;
      if ('touches' in e && e.touches && e.touches.length > 0) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; }
      else if ('clientX' in e) { clientX = (e as MouseEvent).clientX; clientY = (e as MouseEvent).clientY; }
      else return;
      const x = ((clientX - rect.left) / rect.width) * 100;
      let y = ((clientY - rect.top) / rect.height) * 100;
      const is3D = viewMode === '3d_tv' || isPitchOnlyFullscreen;
      if (is3D) { const pc = 1 / Math.cos(12 * Math.PI / 180); y = (y - 50) * pc + 50; }
      setCurrentDrawPoints(prev => [...prev, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }]);
      return;
    }

    if (!draggingNodeId && !draggingBallId) return;
    
    const nodeObj = currentNodePositions.find(n => n.id === draggingNodeId);
    if (nodeObj?.isLocked) return;

    const targetEl = isPitchOnlyFullscreen
      ? (fullscreenPitchSurfaceRef.current || fullscreenPitchRef.current)
      : (pitchSurfaceRef.current || pitchRef.current);

    if (!targetEl) return;

    const rect = targetEl.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return;
    }

    const x = Math.max(0.5, Math.min(99.5, ((clientX - rect.left) / rect.width) * 100));
    let y = Math.max(0.5, Math.min(99.5, ((clientY - rect.top) / rect.height) * 100));

    const is3D = viewMode === '3d_tv' || isPitchOnlyFullscreen;
    if (is3D) {
      const perspectiveCorrection = 1 / Math.cos(12 * Math.PI / 180);
      y = Math.max(0.5, Math.min(99.5, (y - 50) * perspectiveCorrection + 50));
    }

    const preciseX = Math.round(x * 20) / 20;
    const preciseY = Math.round(y * 20) / 20;

    if (draggingBallId) {
      setBallPositions(prev => prev.map(bp => bp.playerId === draggingBallId ? { ...bp, x: preciseX, y: preciseY } : bp));
      return;
    }

    if (draggingNodeId) {
      setCustomPositionsMap(prev => ({
        ...prev,
        [draggingNodeId]: { xPercent: preciseX, yPercent: preciseY }
      }));
    }
  };

  const handlePitchMouseUp = () => {
    if (draggingMarkerId) {
      setDraggingMarkerId(null);
      return;
    }
    // Freihand-Pfad abschließen
    if (freeDrawMode && isDrawingFreehand && currentDrawPoints.length > 2) {
      const newId = `drawn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setDrawnPaths(prev => [...prev, { id: newId, points: currentDrawPoints, color: drawColor }]);
    }
    if (isDrawingFreehand) {
      setIsDrawingFreehand(false);
      setCurrentDrawPoints([]);
    }
    if (draggingOppId) { setDraggingOppId(null); return; }
    if (draggingBallId) { setDraggingBallId(null); return; }
    if (draggingNodeId) {
      syncActiveCustomFormationToFirestore({ positions: customPositionsMap });
      setDraggingNodeId(null);
    }
  };

  const handlePitchMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Marker placement mode
    if (markerMode && e.button === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setMarkers(prev => [...prev, {
        id: `marker_${Date.now()}`,
        x, y,
        color: markerColor,
        label: '',
      }]);
      return;
    }
    if (multiRunMode && multiRunPlayerId && e.button === 0) {
      const targetEl = isPitchOnlyFullscreen
        ? (fullscreenPitchSurfaceRef.current || fullscreenPitchRef.current)
        : (pitchSurfaceRef.current || pitchRef.current);
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      let y = ((e.clientY - rect.top) / rect.height) * 100;
      const is3D = viewMode === '3d_tv' || isPitchOnlyFullscreen;
      if (is3D) { const pc = 1 / Math.cos(12 * Math.PI / 180); y = (y - 50) * pc + 50; }
      setMultiRunPoints(prev => [...prev, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }]);
      return;
    }
    if (passMode) {
      const targetEl = isPitchOnlyFullscreen
        ? (fullscreenPitchSurfaceRef.current || fullscreenPitchRef.current)
        : (pitchSurfaceRef.current || pitchRef.current);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        let y = ((e.clientY - rect.top) / rect.height) * 100;
        const is3D = viewMode === '3d_tv' || isPitchOnlyFullscreen;
        if (is3D) { const pc = 1 / Math.cos(12 * Math.PI / 180); y = (y - 50) * pc + 50; }
        addPassStation(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
      }
      return;
    }
    if (freeDrawMode) {
      setIsDrawingFreehand(true);
      setCurrentDrawPoints([]);
    }
  };

  // Global window listeners for continuous uninterrupted dragging anywhere on screen
  useEffect(() => {
    if (!draggingNodeId) return;

    const onWindowMove = (e: MouseEvent | TouchEvent) => {
      handlePitchMouseMove(e);
    };

    const onWindowUp = () => {
      if (draggingNodeId) {
        syncActiveCustomFormationToFirestore({ positions: customPositionsMap });
        setDraggingNodeId(null);
      }
    };

    window.addEventListener('mousemove', onWindowMove, { passive: true });
    window.addEventListener('mouseup', onWindowUp);
    window.addEventListener('touchmove', onWindowMove, { passive: true });
    window.addEventListener('touchend', onWindowUp);

    return () => {
      window.removeEventListener('mousemove', onWindowMove);
      window.removeEventListener('mouseup', onWindowUp);
      window.removeEventListener('touchmove', onWindowMove);
      window.removeEventListener('touchend', onWindowUp);
    };
  }, [draggingNodeId, isPitchOnlyFullscreen, customPositionsMap]);

  // Global window listeners for ball dragging
  useEffect(() => {
    if (!draggingBallId) return;

    const onBallMove = (e: MouseEvent | TouchEvent) => {
      handlePitchMouseMove(e);
    };
    const onBallUp = () => {
      setDraggingBallId(null);
    };

    window.addEventListener('mousemove', onBallMove, { passive: true });
    window.addEventListener('mouseup', onBallUp);
    window.addEventListener('touchmove', onBallMove, { passive: true });
    window.addEventListener('touchend', onBallUp);

    return () => {
      window.removeEventListener('mousemove', onBallMove);
      window.removeEventListener('mouseup', onBallUp);
      window.removeEventListener('touchmove', onBallMove);
      window.removeEventListener('touchend', onBallUp);
    };
  }, [draggingBallId]);

  // Global window listeners for opponent dragging
  useEffect(() => {
    if (!draggingOppId) return;
    const onOppMove = (e: MouseEvent | TouchEvent) => handlePitchMouseMove(e);
    const onOppUp = () => { setDraggingOppId(null); };
    window.addEventListener('mousemove', onOppMove, { passive: true });
    window.addEventListener('mouseup', onOppUp);
    window.addEventListener('touchmove', onOppMove, { passive: true });
    window.addEventListener('touchend', onOppUp);
    return () => {
      window.removeEventListener('mousemove', onOppMove);
      window.removeEventListener('mouseup', onOppUp);
      window.removeEventListener('touchmove', onOppMove);
      window.removeEventListener('touchend', onOppUp);
    };
  }, [draggingOppId]);

  // Global window listeners for freehand drawing
  useEffect(() => {
    if (!isDrawingFreehand) return;
    const onDrawMove = (e: MouseEvent | TouchEvent) => handlePitchMouseMove(e);
    const onDrawUp = () => { handlePitchMouseUp(); };
    window.addEventListener('mousemove', onDrawMove, { passive: true });
    window.addEventListener('mouseup', onDrawUp);
    window.addEventListener('touchmove', onDrawMove, { passive: true });
    window.addEventListener('touchend', onDrawUp);
    return () => {
      window.removeEventListener('mousemove', onDrawMove);
      window.removeEventListener('mouseup', onDrawUp);
      window.removeEventListener('touchmove', onDrawMove);
      window.removeEventListener('touchend', onDrawUp);
    };
  }, [isDrawingFreehand, currentDrawPoints, drawColor]);

  // Handle Pitch Click when adding run target point
  const handlePitchClickForRun = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!runTargetModePlayerId || !pitchRef.current) return;
    const targetEl = pitchSurfaceRef.current || pitchRef.current;
    const rect = targetEl.getBoundingClientRect();
    let targetX = Math.max(0.5, Math.min(99.5, ((e.clientX - rect.left) / rect.width) * 100));
    let targetY = Math.max(0.5, Math.min(99.5, ((e.clientY - rect.top) / rect.height) * 100));

    if (viewMode === '3d_tv') {
      const perspectiveCorrection = 1 / Math.cos(12 * Math.PI / 180);
      targetY = Math.max(0.5, Math.min(99.5, (targetY - 50) * perspectiveCorrection + 50));
    }

    targetX = Math.round(targetX * 20) / 20;
    targetY = Math.round(targetY * 20) / 20;

    const pNode = currentNodePositions.find(n => n.id === runTargetModePlayerId);
    if (!pNode) return;

    const newRun: PlayerRunPath = {
      id: 'run_' + Date.now(),
      playerId: runTargetModePlayerId,
      path: [
        { x: pNode.currentX, y: pNode.currentY },
        { x: targetX, y: targetY }
      ],
      color: activePhase === 'defensiv' ? '#EF4444' : activePhase === 'umschalten' ? '#F59E0B' : '#0055FF'
    };

    const updatedRuns = [...customRuns, newRun];
    setCustomRuns(updatedRuns);
    syncActiveCustomFormationToFirestore({ runs: updatedRuns });
    setRunTargetModePlayerId(null);
    notify(`Laufweg für ${pNode.name} hinzugefügt!`);
  };

  return (
    <div className={`flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto custom-scrollbar selection:bg-amber-500 selection:text-slate-950 ${isTvMode ? 'fixed inset-0 z-50 bg-black p-3' : 'p-3 sm:p-4 space-y-4'}`}>
      
      {/* TOAST NOTIFICATION */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400"
          >
            <CheckCircle2 size={18} />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PURE PITCH SOLO FULLSCREEN OVERLAY (NUR TAKTIKFELD VOLLBILD - 1:1 SYNCHRON ZUR TAKTIKTAFEL) */}
      <AnimatePresence>
        {isPitchOnlyFullscreen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-2 sm:p-3 overflow-hidden select-none"
          >
            {/* Floating Top Control Bar (1:1 Synchron mit 4-Systemen & 4-Phasen) */}
            <div className="bg-slate-900/98 border border-slate-800 rounded-xl p-1.5 sm:p-2 mb-2 flex flex-wrap items-center justify-between gap-2 shadow-2xl backdrop-blur-md shrink-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="bg-amber-400 text-slate-950 px-2 py-1 rounded-md font-black text-[11px] uppercase tracking-wider flex items-center gap-1 shadow">
                  <Tv size={13} />
                  <span>🖥️ TAKTIKFELD VOLLBILD</span>
                </div>

                {/* 4-Systeme Tasten */}
                <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-amber-500/30">
                  <span className="text-[9px] font-black uppercase text-amber-400 px-1 flex items-center gap-0.5">
                    <Zap size={10} /> Systeme:
                  </span>
                  {[
                    { key: '4-2-3-1', label: '4-2-3-1' },
                    { key: '4-3-3', label: '4-3-3' },
                    { key: '3-4-3', label: '3-4-3' },
                    { key: '3-5-2', label: '3-5-2' },
                    { key: '4-4-2', label: '4-4-2' }
                  ].map((sys) => (
                    <button
                      key={`fs-${sys.key}`}
                      onClick={() => {
                        setSelectedFormation(sys.key as TacticFormation);
                        notify(`System "${sys.label}" aktiviert!`);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                        selectedFormation === sys.key
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)] font-black ring-1 ring-emerald-300'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {sys.label}
                    </button>
                  ))}
                </div>

                {/* Weitere Systeme Dropdown */}
                <select
                  value={selectedFormation}
                  onChange={(e) => {
                    if (e.target.value === '__create_new__') {
                      handleCreateNewFormation();
                    } else {
                      setSelectedFormation(e.target.value);
                    }
                  }}
                  className="bg-slate-950 border border-slate-700 text-emerald-400 font-black text-[10px] px-2 py-0.5 rounded-md focus:outline-none focus:border-emerald-500 cursor-pointer max-w-[130px] truncate"
                >
                  <optgroup label="Weitere Systeme">
                    {Object.entries(liveFormations).map(([key, data]) => (
                      <option key={key} value={key}>
                        {data.name}
                      </option>
                    ))}
                  </optgroup>
                  {customFormationsList.length > 0 && (
                    <optgroup label="Eigene Trainer-Systeme">
                      {customFormationsList.map((cf) => (
                        <option key={cf.id} value={cf.id}>
                          ⭐ {cf.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* 4 Phasen Switcher Buttons (Offensiv, Defensiv, Umschalten Off., Umschalten Def.) */}
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActivePhase('offensiv')}
                  className={`py-1 px-2 text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1 leading-none ${
                    activePhase === 'offensiv' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-xs' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>🔵</span>
                  <span>Offensiv</span>
                </button>
                <button
                  onClick={() => setActivePhase('defensiv')}
                  className={`py-1 px-2 text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1 leading-none ${
                    activePhase === 'defensiv' 
                      ? 'bg-rose-500 text-white border-rose-400 font-black shadow-xs' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>🛡️</span>
                  <span>Defensiv</span>
                </button>
                <button
                  onClick={() => setActivePhase('umschalten')}
                  className={`py-1 px-2 text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1 leading-none ${
                    activePhase === 'umschalten' 
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>⚡</span>
                  <span>Umschalten Off.</span>
                </button>
                <button
                  onClick={() => setActivePhase('umschalten_defensiv')}
                  className={`py-1 px-2 text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center gap-1 leading-none ${
                    activePhase === 'umschalten_defensiv' 
                      ? 'bg-purple-500 text-white border-purple-400 font-black shadow-xs' 
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  <span>🔄</span>
                  <span>Umschalten Def.</span>
                </button>
              </div>

              {/* Controls (3D/2D, Grid, Heatmap, Close) */}
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="bg-slate-950 p-0.5 rounded-md border border-slate-800 flex items-center gap-0.5">
                  <button
                    onClick={() => setViewMode('3d_tv')}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 ${
                      viewMode === '3d_tv' ? 'bg-[#00C2FF] text-[#0A0A0A] font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    3D
                  </button>
                  <button
                    onClick={() => setViewMode('2d_tactical')}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 ${
                      viewMode === '2d_tactical' ? 'bg-[#00C2FF] text-[#0A0A0A] font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    2D
                  </button>
                </div>

                <button
                  onClick={() => setShowZonesGrid(!showZonesGrid)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    showZonesGrid ? 'bg-sky-950 text-sky-300 border-sky-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  📐 Grid
                </button>

                <button
                  onClick={() => setShowHeatmaps(!showHeatmaps)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    showHeatmaps ? 'bg-amber-950 text-amber-300 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  🔥 Heatmap
                </button>

                <button
                  onClick={() => toggleBallMode(11)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    ballMode && ballCount === 11 ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  ⚽ 11 Bälle
                </button>

                <button
                  onClick={() => toggleBallMode(6)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    ballMode && ballCount === 6 ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  🔥 6 Bälle
                </button>

                <button
                  onClick={() => toggleBallMode(3)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    ballMode && ballCount === 3 ? 'bg-orange-500 text-white border-orange-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  👑 3 Bälle
                </button>

                <button
                  onClick={() => setShowOpponents(!showOpponents)}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    showOpponents ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  🔴 Gegner
                </button>

                <button
                  onClick={() => { setFreeDrawMode(!freeDrawMode); if (freeDrawMode) { setIsDrawingFreehand(false); setCurrentDrawPoints([]); } }}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                    freeDrawMode ? 'bg-green-600 text-white border-green-400' : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  ✏️ Freihand
                </button>

                {/* Stufe 2: Stift-Farbkodierung (Blau=Offensiv, Rot=Defensiv, Gelb=Umschalten, Grün=Sprint) */}
                {freeDrawMode && (
                  <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Zeichen-Farbe (Farblegende)">
                    {[
                      { c: '#3B82F6', l: 'Blau Offensiv' },
                      { c: '#EF4444', l: 'Rot Defensiv' },
                      { c: '#F59E0B', l: 'Gelb Umschalten' },
                      { c: '#22C55E', l: 'Grün Sprint' },
                    ].map(f => (
                      <button
                        key={f.c}
                        onClick={() => setDrawColor(f.c)}
                        title={f.l}
                        className={`w-4 h-4 rounded-full border transition-all ${drawColor === f.c ? 'ring-2 ring-white scale-110' : 'border-slate-600 opacity-70 hover:opacity-100'}`}
                        style={{ backgroundColor: f.c }}
                      />
                    ))}
                  </div>
                )}

                {/* STUFE 3: Spielaufbau-Varianten */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Spielaufbau-Variante laden (setzt Laufwege)">
                  <span className="text-[8.5px] font-black uppercase text-slate-400 mr-0.5">⚽ Aufbau</span>
                  <button onClick={() => applyBuildUpVariant('sechser')} className="px-1.5 py-0.5 text-[9px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="Aufbau über den 6er">6er</button>
                  <button onClick={() => applyBuildUpVariant('achter')} className="px-1.5 py-0.5 text-[9px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="Aufbau über den 8er">8er</button>
                  <button onClick={() => applyBuildUpVariant('langerBall')} className="px-1.5 py-0.5 text-[9px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="Langer Ball auf den Flügel">⚡ Ball</button>
                  <button onClick={() => applyBuildUpVariant('strafraum')} className="px-1.5 py-0.5 text-[9px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="Strafraumbesetzung & Torabschluss">🎯 Box</button>
                  <button
                    onClick={applyDoppelpass}
                    className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-bold text-[10px] uppercase px-2 py-1.5 rounded-lg border border-purple-500/30 transition-all flex items-center gap-1"
                    title="Doppelpass: 2 Spieler kreuzen, Ball durch 5 Stationen"
                  >
                    <Repeat size={11} /> Doppelpass
                  </button>
                </div>

                {/* STUFE 4: Passstafette */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Passstafette (Pass-Sequenz)">
                  <button
                    onClick={togglePassMode}
                    className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all ${passMode ? 'bg-green-600 text-white border border-green-400 font-black' : 'text-slate-300 hover:text-white border border-transparent'}`}
                  >
                    🎯 Stafette
                  </button>
                  <select
                    value={passAction}
                    onChange={(e) => setPassAction(e.target.value)}
                    className="bg-slate-950 border border-slate-700 text-[8.5px] font-black text-slate-200 px-1 py-0.5 rounded focus:outline-none cursor-pointer max-w-[80px]"
                  >
                    {PASS_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button onClick={() => loadPassTemplate(3)} className="px-1 py-0.5 text-[8.5px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="3-Stationen-Vorlage laden">3</button>
                  <button onClick={() => loadPassTemplate(6)} className="px-1 py-0.5 text-[8.5px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="6-Stationen-Vorlage laden">6</button>
                  <button onClick={() => loadPassTemplate(9)} className="px-1 py-0.5 text-[8.5px] font-black rounded hover:bg-sky-500/30 transition-all text-slate-300" title="9-Stationen-Vorlage laden (Tiki-Taka)">9</button>
                  {passStations.length > 0 && (
                    <button onClick={() => { setPassStations([]); setPassBallPos(null); }} className="px-1 py-0.5 text-[8.5px] font-black rounded hover:bg-rose-500/30 transition-all text-rose-300" title="Passstafette leeren">🧹 Leeren</button>
                  )}
                </div>

                {(drawnPaths.length > 0 || showOpponents || customRuns.length > 0 || passStations.length >= 2) && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={startAnimation}
                      className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                        isAnimating ? (animPaused ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-600 text-white border-slate-400') : 'bg-indigo-600 text-white border-indigo-400'
                      }`}
                      title={isAnimating ? (animPaused ? 'Fortsetzen' : 'Pausieren') : 'Abspielen'}
                    >
                      {isAnimating ? (animPaused ? '▶️ Weiter' : '⏸ Pause') : '▶️ Abspielen'}
                    </button>
                    <button
                      onClick={seqRunning ? stopSequence : startSequence}
                      className={`px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border transition-all ${
                        seqRunning ? (seqPhase === 'lauf' ? 'bg-sky-500 text-white border-sky-400' : seqPhase === 'pass' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-violet-500 text-white border-violet-400') : 'bg-slate-800 text-sky-300 border-slate-600 hover:border-sky-400'
                      }`}
                      title={seqRunning ? `Sequenz läuft – Phase: ${seqPhaseLabel}` : 'Sequenz: erst Laufweg, dann Passweg, dann alles'}
                    >
                      {seqRunning ? (seqPhase === 'lauf' ? `🚶 ${seqPhaseLabel}` : seqPhase === 'pass' ? `⚽ ${seqPhaseLabel}` : `🔁 ${seqPhaseLabel}`) : '🔁 Sequenz'}
                    </button>
                    {isAnimating && (
                      <button
                        onClick={() => { if (animRef.current) cancelAnimationFrame(animRef.current); setIsAnimating(false); setAnimPaused(false); animProgressRef.current = 0; setAnimProgress(0); setAnimatedPlayerPositions({}); setPassBallPos(null); }}
                        className="px-2 py-0.5 text-[9.5px] font-black uppercase tracking-wider rounded-md border bg-red-500 text-white border-red-400 transition-all"
                        title="Stoppen und zurücksetzen"
                      >
                        ⏹ Stopp
                      </button>
                    )}
                    {/* Geschwindigkeit */}
                    <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5">
                      <span className="text-[8.5px] font-black uppercase text-slate-400 mr-0.5">Speed</span>
                      {[0.5, 1, 1.5, 2].map(s => (
                        <button
                          key={s}
                          onClick={() => setAnimSpeed(s)}
                          className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all ${animSpeed === s ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                    {/* Zeitleiste / Scrubber */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 min-w-[120px]">
                      <span className="text-[8.5px] font-black uppercase text-slate-400">⏱</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={animProgress}
                        onChange={(e) => { if (animRef.current) cancelAnimationFrame(animRef.current); setIsAnimating(false); setAnimPaused(false); handleScrub(parseFloat(e.target.value)); }}
                        className="flex-1 h-1.5 cursor-pointer accent-cyan-500"
                      />
                      <span className="text-[8.5px] font-bold text-slate-300 tabular-nums">{Math.round(animProgress * 100)}%</span>
                    </div>
                  </div>
                )}

                {/* CLOSE SOLO FULLSCREEN BUTTON */}
                <button
                  onClick={() => {
                    setIsPitchOnlyFullscreen(false);
                    if (document.fullscreenElement && document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border border-rose-400 flex items-center gap-1 shadow-lg transition-all cursor-pointer"
                  title="Vollbild beenden (ESC)"
                >
                  <Minimize2 size={13} />
                  <span>Beenden (ESC)</span>
                </button>
              </div>
            </div>

            {/* Multi-run instruction bar (fullscreen) */}
            {multiRunMode && (
              <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-3">
                <Route size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">
                  Laufweg zeichnen: {multiRunPoints.length} Punkte gesetzt. 
                  Klicke weitere Punkte, Doppelklick zum Beenden, Rechtsklick zum Abbrechen.
                </span>
              </div>
            )}

            {/* FULLSCREEN PITCH CANVAS */}
            <div 
              ref={fullscreenPitchRef}
              onClick={handlePitchClickForRun}
              onMouseDown={handlePitchMouseDown}
              onMouseMove={handlePitchMouseMove}
              onTouchMove={handlePitchMouseMove}
              onMouseUp={handlePitchMouseUp}
              onTouchEnd={handlePitchMouseUp}
              onDoubleClick={(e) => {
                if (multiRunMode) {
                  e.preventDefault();
                  finishMultiRun();
                }
              }}
              onContextMenu={(e) => {
                if (multiRunMode) {
                  e.preventDefault();
                  setMultiRunMode(false);
                  setMultiRunPlayerId(null);
                  setMultiRunPoints([]);
                  notify('Laufweg-Zeichnung abgebrochen');
                }
              }}
              className={`relative flex-1 w-full rounded-2xl border-2 border-emerald-500/50 bg-slate-950 overflow-hidden shadow-2xl select-none ${
                viewMode === '3d_tv' ? '[perspective:1000px]' : ''
              }`}
            >
              {/* THE PITCH SURFACE */}
              <div 
                ref={fullscreenPitchSurfaceRef}
                className={`w-full h-full relative transition-transform duration-700 ease-out origin-center ${
                  viewMode === '3d_tv' 
                    ? '[transform:rotateX(12deg)_rotateY(0deg)_scale(0.92)] shadow-[0_50px_100px_rgba(0,0,0,0.9)]' 
                    : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at center, #063826 0%, #031e15 100%)'
                }}
              >
                {/* Grass Pattern Stripes */}
                <div className="absolute inset-0 grid grid-cols-12 opacity-20 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={i % 2 === 0 ? 'bg-emerald-400/10' : 'bg-transparent'} />
                  ))}
                </div>

                {/* Pitch Markings — vertical (goals top/bottom) */}
                <div className="absolute inset-4 border-2 border-emerald-400/40 pointer-events-none rounded-sm">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400/40 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-emerald-400/40 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                  </div>
                  <div className="absolute left-1/2 top-0 w-48 h-24 -translate-x-1/2 border-2 border-t-0 border-emerald-400/40">
                    <div className="absolute left-1/2 top-0 w-24 h-10 -translate-x-1/2 border border-t-0 border-emerald-400/30" />
                  </div>
                  <div className="absolute left-1/2 bottom-0 w-48 h-24 -translate-x-1/2 border-2 border-b-0 border-emerald-400/40">
                    <div className="absolute left-1/2 bottom-0 w-24 h-10 -translate-x-1/2 border border-b-0 border-emerald-400/30" />
                  </div>
                </div>

                {/* 3 DREITTEL GRID OVERLAY — horizontal thirds for vertical pitch */}
                {showZonesGrid && (
                  <div className="absolute inset-4 grid grid-rows-3 pointer-events-none">
                    <div className="border-b-2 border-dashed border-emerald-400/50 flex flex-row items-start justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-emerald-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Offensives Drittel</span>
                      <span className="text-[9px] font-mono font-black text-emerald-400/50">Sturmbox</span>
                    </div>
                    <div className="border-b-2 border-dashed border-amber-400/50 flex flex-row items-center justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-amber-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Mittelfeld-Drittel</span>
                      <span className="text-[9px] font-mono font-black text-amber-400/50">Halbräume & Zentrum</span>
                    </div>
                    <div className="flex flex-row items-end justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-sky-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Defensives Drittel</span>
                      <span className="text-[9px] font-mono font-black text-sky-400/50">Abwehrkette</span>
                    </div>
                  </div>
                )}

                {/* HEATMAPS */}
                {showHeatmaps && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[65%] left-[30%] w-40 h-56 rounded-full bg-amber-500/35 blur-3xl animate-pulse" />
                    <div className="absolute top-[75%] left-[60%] w-36 h-48 rounded-full bg-emerald-500/40 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-[25%] left-[40%] w-44 h-44 rounded-full bg-rose-500/30 blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-[50%] left-[50%] w-28 h-28 rounded-full bg-violet-500/25 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                )}

                {/* PLAYER MARKED ZONES OVERLAY */}
                {currentNodePositions.map((node) => {
                  const zoneObj = customZones.find(z => z.playerId === node.id);
                  if (!zoneObj || zoneObj.zoneType === 'Keine') return null;
                  return (
                    <div
                      key={`zone-fs-${node.id}`}
                      style={{
                        left: `${node.currentX}%`,
                        top: `${node.currentY}%`,
                        backgroundColor: zoneObj.color
                      }}
                      className="absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-sm border border-white/20 pointer-events-none transition-all duration-300"
                    />
                  );
                })}

                {/* RUN VECTOR LINES */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <defs>
                    <marker id="arrowhead-fs" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <polygon points="0 0, 7 3.5, 0 7" fill="#10B981" />
                    </marker>
                    <marker id="arrowhead-custom-fs" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <polygon points="0 0, 7 3.5, 0 7" fill="#3B82F6" />
                    </marker>
                    <marker id="arrow-pass-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#FBBF24" />
                    </marker>
                    <marker id="arrow-pass-direkt-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#22D3EE" />
                    </marker>
                    <marker id="arrow-pass-steil-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#FBBF24" />
                    </marker>
                    <marker id="arrow-pass-flanke-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#38BDF8" />
                    </marker>
                    <marker id="arrow-pass-klatsch-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#34D399" />
                    </marker>
                    <marker id="arrow-pass-doppelpass-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#A78BFA" />
                    </marker>
                    <marker id="arrow-pass-schuss-fs" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#EF4444" />
                    </marker>
                  </defs>

                  {showRunVectors && customRuns.length === 0 && currentNodePositions.map((n) => {
                    if (n.position === 'TW') return null;
                    const targetY = n.currentY - 8;
                    const targetX = n.currentX + (n.currentX > 50 ? -6 : 6);
                    return (
                      <line
                        key={`vector-fs-${n.id}`}
                        x1={`${n.currentX}%`}
                        y1={`${n.currentY}%`}
                        x2={`${targetX}%`}
                        y2={`${targetY}%`}
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        markerEnd="url(#arrowhead-fs)"
                        className="opacity-75"
                      />
                    );
                  })}

                  {/* Multi-run preview while drawing (fullscreen) */}
                  {multiRunMode && multiRunPoints.length >= 1 && (
                    <polyline
                      points={multiRunPoints.map(p => `${p.x}% ${p.y}%`).join(', ')}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      opacity="0.9"
                    />
                  )}
                  {multiRunMode && multiRunPoints.length >= 1 && multiRunPoints.map((p, i) => (
                    <circle
                      key={`mr-fs-${i}`}
                      cx={`${p.x}%`}
                      cy={`${p.y}%`}
                      r={i === 0 ? 2 : 1.2}
                      fill={i === 0 ? '#22C55E' : '#22D3EE'}
                      stroke="white"
                      strokeWidth="0.4"
                    />
                  ))}

                  {customRuns.map((run) => {
                    if (!run.path || run.path.length < 2) return null;
                    const p1 = run.path[0];
                    const p2 = run.path[1];
                    return (
                      <g key={`fs-run-${run.id}`}>
                        <line
                          x1={`${p1.x}%`}
                          y1={`${p1.y}%`}
                          x2={`${p2.x}%`}
                          y2={`${p2.y}%`}
                          stroke={run.color || '#3B82F6'}
                          strokeWidth="3.5"
                          strokeDasharray="5 3"
                          markerEnd="url(#arrowhead-custom-fs)"
                          className="drop-shadow-md"
                        />
                        <circle cx={`${p2.x}%`} cy={`${p2.y}%`} r="4" fill={run.color || '#3B82F6'} />
                      </g>
                    );
                  })}
                </svg>

                {/* BALL-MODUS (FULLSCREEN): Draggable Bälle */}
                {ballMode && ballPositions.map((bp) => {
                  const pNode = currentNodePositions.find(n => n.id === bp.playerId);
                  if (!pNode) return null;
                  return (
                    <div
                      key={`ball-fs-${bp.playerId}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingBallId(bp.playerId);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setDraggingBallId(bp.playerId);
                      }}
                      className="absolute z-30 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: `${bp.x}%`, top: `${bp.y}%` }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 via-white to-yellow-400 border-2 border-yellow-600 shadow-lg shadow-yellow-500/40 flex items-center justify-center text-[9px] font-black text-yellow-900 group-hover:scale-125 transition-transform">
                        ⚽
                      </div>
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-black text-yellow-300 bg-slate-950/80 px-0.5 rounded whitespace-nowrap">
                        {pNode.number}
                      </span>
                    </div>
                  );
                })}
                {currentNodePositions.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isContextMenuActive = contextMenuPlayerId === node.id;

                  return (
                    <motion.div
                      key={`fs-node-${node.id}`}
                      onMouseDown={() => {
                        setSelectedNodeId(node.id);
                        if (!node.isLocked) setDraggingNodeId(node.id);
                      }}
                      onTouchStart={() => {
                        setSelectedNodeId(node.id);
                        if (!node.isLocked) setDraggingNodeId(node.id);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        setContextMenuPlayerId(node.id);
                        setContextSubMenu('main');
                      }}
                      style={{
                        left: `${animatedPlayerPositions[node.id]?.x ?? node.currentX}%`,
                        top: `${animatedPlayerPositions[node.id]?.y ?? node.currentY}%`,
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                    >
                      {/* 3D NODE GLOW & SELECTION / HIGHLIGHT RING */}
                      <div className={`relative flex flex-col items-center justify-center transition-all ${
                        isSelected || node.isHighlighted ? 'scale-125 z-40' : 'hover:scale-110 z-20'
                      }`}>
                        
                        {/* Highlighted Gold Pulse Ring */}
                        {node.isHighlighted && (
                          <div className="absolute -inset-4 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
                        )}

                        {/* Selected aura ring */}
                        {isSelected && !node.isHighlighted && (
                          <div className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none" />
                        )}

                        {/* Player Name Pill / Badge — FC Auggen ROT */}
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-xl border flex items-center gap-1 ${
                          node.isHighlighted
                            ? 'bg-amber-400 text-slate-950 border-white font-black shadow-amber-500/50'
                            : isSelected 
                            ? 'bg-[#e94560] text-white border-white shadow-[#e94560]/50' 
                            : 'bg-[#e94560]/90 text-white border-[#ff6b81]/50 group-hover:border-[#e94560]'
                        }`}>
                          {node.isLocked && <Lock size={9} className="text-amber-300" />}
                          {node.isHighlighted && <Star size={9} className="fill-slate-950 text-slate-950" />}
                          <span>{node.number}. {node.name}</span>
                        </div>

                        {/* 3D Node Sphere Marker — FC Auggen ROT */}
                        <div className={`w-8 h-8 rounded-full border-2 mt-1 flex items-center justify-center shadow-2xl text-xs font-black transition-all ${
                          node.isHighlighted
                            ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-white text-slate-950 shadow-amber-500/60'
                            : isSelected
                            ? 'bg-gradient-to-tr from-[#e94560] to-[#ff6b81] border-white text-white shadow-[#e94560]/50'
                            : 'bg-gradient-to-tr from-[#e94560] to-[#c0392b] border-white text-white shadow-[#e94560]/40'
                        }`}>
                          {node.position}
                        </div>

                        {/* Role tag badge under node */}
                        {node.role && (
                          <span className="text-[8px] font-mono font-bold bg-slate-950/90 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 mt-0.5 whitespace-nowrap shadow-sm">
                            {node.role}
                          </span>
                        )}
                      </div>

                      {/* CONTEXT MENU POPOVER */}
                      <AnimatePresence>
                        {isContextMenuActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-56 bg-slate-900/98 border-2 border-emerald-500/60 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-50 text-slate-100 font-sans"
                          >
                            <div className="border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
                              <div className="font-black text-xs text-white uppercase truncate flex items-center gap-1">
                                <span className="text-amber-400 font-mono">#{node.number}</span> {node.name}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContextMenuPlayerId(null);
                                }}
                                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="space-y-1 text-xs">
                              <button
                                onClick={() => {
                                  setRunTargetModePlayerId(node.id);
                                  setContextMenuPlayerId(null);
                                }}
                                className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-emerald-400 font-bold flex items-center gap-1.5"
                              >
                                <CornerUpRight size={13} /> Laufweg zeichnen
                              </button>
                              <button
                                onClick={() => { startMultiRunDrawing(node.id); setContextMenuPlayerId(null); }}
                                className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-cyan-400 font-bold flex items-center gap-1.5"
                              >
                                <Route size={13} /> Mehrpunkt-Laufweg zeichnen
                              </button>
                              <button
                                onClick={() => {
                                  const isH = highlightedPlayerIds.includes(node.id);
                                  const next = isH 
                                    ? highlightedPlayerIds.filter(id => id !== node.id)
                                    : [...highlightedPlayerIds, node.id];
                                  setHighlightedPlayerIds(next);
                                  syncActiveCustomFormationToFirestore({ highlightedPlayerIds: next });
                                  notify(isH ? `${node.name} nicht mehr hervorgehoben.` : `${node.name} hervorgehoben!`);
                                  setContextMenuPlayerId(null);
                                }}
                                className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-amber-400 font-bold flex items-center gap-1.5"
                              >
                                <Star size={13} /> Spieler {node.isHighlighted ? 'entfernen' : 'hervorheben'}
                              </button>
                              <button
                                onClick={() => {
                                  const isL = lockedPlayerIds.includes(node.id);
                                  const next = isL 
                                    ? lockedPlayerIds.filter(id => id !== node.id)
                                    : [...lockedPlayerIds, node.id];
                                  setLockedPlayerIds(next);
                                  syncActiveCustomFormationToFirestore({ lockedPlayerIds: next });
                                  notify(isL ? `Position von ${node.name} freigegeben.` : `Position von ${node.name} gesperrt!`);
                                  setContextMenuPlayerId(null);
                                }}
                                className="w-full text-left px-2 py-1 rounded hover:bg-slate-800 text-sky-400 font-bold flex items-center gap-1.5"
                              >
                                <Lock size={13} /> Position {node.isLocked ? 'entsperren' : 'sperren'}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}

                {/* ═══ GEGNER (Blau) — 11 Spieler — VOLLBILD ═══ */}
                {showOpponents && opponentPlayers.map((opp) => {
                  const oppX = isAnimating && opponentTargetPositions[opp.id]
                    ? opponentTargetPositions[opp.id].x + (opp.x - opponentTargetPositions[opp.id].x) * (1 - animProgress)
                    : opp.x;
                  const oppY = isAnimating && opponentTargetPositions[opp.id]
                    ? opponentTargetPositions[opp.id].y + (opp.y - opponentTargetPositions[opp.id].y) * (1 - animProgress)
                    : opp.y;
                  return (
                    <div
                      key={`fs-opp-${opp.id}`}
                      onMouseDown={(e) => { e.stopPropagation(); setDraggingOppId(opp.id); }}
                      onTouchStart={(e) => { e.stopPropagation(); setDraggingOppId(opp.id); }}
                      className="absolute z-25 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: `${oppX}%`, top: `${oppY}%` }}
                    >
                      <div className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-[#3B82F6]/90 text-white border border-blue-300 shadow-lg mb-0.5 whitespace-nowrap">
                        {opp.number}. {opp.name}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#1D4ED8] border-2 border-white text-white flex items-center justify-center text-[9px] font-black shadow-lg mx-auto">
                        {opp.number}
                      </div>
                    </div>
                  );
                })}

                {/* ═══ FREIHAND-LAUFWEGE ═══ */}
                {drawnPaths.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full z-15 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {drawnPaths.map((path) => {
                      if (path.points.length < 2) return null;
                      const d = path.points.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
                      return (
                        <g key={path.id}>
                          <path d={d} fill="none" stroke={path.color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                          <circle cx={path.points[0].x} cy={path.points[0].y} r="1" fill={path.color} opacity="0.6" />
                          <circle cx={path.points[path.points.length - 1].x} cy={path.points[path.points.length - 1].y} r="1.2" fill={path.color} />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* ═══ FREIHAND: Aktiver Pfad beim Zeichnen ═══ */}
                {freeDrawMode && currentDrawPoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full z-16 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d={currentDrawPoints.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '')}
                      fill="none" stroke={drawColor} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
                    />
                  </svg>
                )}

                {/* ═══ ABSPIELEN: Animierte rote Punkte entlang der Pfade — VOLLBILD ═══ */}
                {isAnimating && drawnPaths.map((path) => {
                  if (path.points.length < 2) return null;
                  const pos = pointAlongPathsForProgress(path.points, animProgress);
                  if (!pos) return null;
                  return (
                    <div
                      key={`fs-anim-${path.id}`}
                      className="absolute z-35 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#e94560] to-[#c0392b] border-2 border-white shadow-lg shadow-[#e94560]/60 flex items-center justify-center text-[8px] font-black text-white">
                        ▶
                      </div>
                    </div>
                  );
                })}

                {/* ═══ PASSSTAFETTE (Stufe 4) — VOLLBILD ═══ */}
                {passStations.length > 0 && !(seqRunning && seqPhase === 'lauf') && (
                  <svg className="absolute inset-0 w-full h-full z-15 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {passStations.slice(0, -1).map((s, i) => {
                      const nxt = passStations[i + 1];
                      const arrowSuffix: Record<string, string> = { Direktpass: '-direkt', Steilpass: '-steil', Flanke: '-flanke', Klatschball: '-klatsch', Doppelpass: '-doppelpass', Torschuss: '-schuss' };
                      return (
                        <line
                          key={`ps-line-fs-${s.id}`}
                          x1={s.x}
                          y1={s.y}
                          x2={nxt.x}
                          y2={nxt.y}
                          stroke={PASS_ACTION_COLORS[s.action] || '#22D3EE'}
                          strokeWidth="0.8"
                          strokeDasharray="3 1.5"
                          opacity="0.9"
                          markerEnd={`url(#arrow-pass${arrowSuffix[s.action] || ''}-fs)`}
                        />
                      );
                    })}
                  </svg>
                )}
                {!(seqRunning && seqPhase === 'lauf') && passStations.map((s, i) => (
                  <div
                    key={`ps-fs-${s.id}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (passMode) removePassStation(s.id);
                    }}
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    title={passMode ? `${s.action} entfernen (klick)` : s.action}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-slate-950 shadow-lg flex items-center justify-center text-[8px] font-black text-slate-950 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: PASS_ACTION_COLORS[s.action] || '#22D3EE' }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[7px] font-bold text-slate-200 bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">{s.action}</span>
                  </div>
                ))}
                {passBallPos && (
                  <div
                    className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${passBallPos.x}%`, top: `${passBallPos.y}%` }}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 via-white to-yellow-400 border-2 border-yellow-600 shadow-lg shadow-yellow-500/50" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STICKY HAUPTLISTE TAKTIKTAFEL HEADER (HAUPTEBENE - IMMER OBEN SICHTBAR - ULTRA-KOMPAKT) */}
      <div className="sticky top-0 z-40 bg-slate-900/98 border border-slate-800 rounded-xl p-1.5 sm:p-2 shadow-2xl backdrop-blur-md flex flex-col gap-1.5 shrink-0">
        
        {/* HAUPTEBENE 1: SYSTEME (IMMER SICHTBAR) & HAUPTMENÜ TABS */}
        <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar w-full">
          {/* Left: Branding & 4-Systeme (Hauptebene) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="bg-slate-950 px-2 py-1 rounded-md border border-slate-800 flex items-center gap-1 shrink-0">
              <Tv size={12} className="text-emerald-400" />
              <span className="font-black text-[11px] uppercase tracking-wider text-white">{activeClub.shortName || 'FC AUGGEN'} TAKTIKTAFEL</span>
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 shrink-0" />

            {/* SYSTEME (HAUPTEBENE - IMMER SICHTBAR & REGEL: SYSTEMWAHL ÖFFNET AUTOMATISCH PHASEN-ANALYSE) */}
            <div className="flex items-center gap-0.5 bg-slate-950 p-0.5 rounded-lg border border-amber-500/30">
              <span className="text-[9px] font-black uppercase text-amber-400 px-1 flex items-center gap-0.5">
                <Zap size={10} /> Systeme:
              </span>
              {[
                { key: '4-2-3-1', label: '4-2-3-1 (Stamm)' },
                { key: '4-3-3', label: '4-3-3' },
                { key: '3-4-3', label: '3-4-3' },
                { key: '3-5-2', label: '3-5-2' },
                { key: '4-4-2', label: '4-4-2' }
              ].map((sys) => (
                <button
                  key={sys.key}
                  onClick={() => {
                    setSelectedFormation(sys.key as TacticFormation);
                    setShowTrainerPhasePanelOnBoard(true);
                    setActiveTabSub('board');
                    notify(`System "${sys.label}" ausgewählt – Phasen-Analyse wurde automatisch geöffnet!`);
                  }}
                  className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border transition-all cursor-pointer whitespace-nowrap ${
                    selectedFormation === sys.key
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)] font-black ring-1 ring-emerald-300'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {sys.label}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-800 mx-0.5 shrink-0" />

            {/* Hauptliste Tabs */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTabSub('board')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeTabSub === 'board'
                    ? 'bg-[#00C2FF] text-[#0A0A0A] shadow-[0_0_8px_rgba(0,194,255,0.4)] border border-[#00C2FF]'
                    : 'bg-[#1A1A1A] text-slate-300 hover:text-white hover:bg-[#2A2A2A] border border-[#3A3A3A]'
                }`}
              >
                <Compass size={12} /> Taktiktafel & Zonen
              </button>

              <button
                onClick={() => setActiveTabSub('comparison')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeTabSub === 'comparison'
                    ? 'bg-[#00C2FF] text-[#0A0A0A] shadow-[0_0_8px_rgba(0,194,255,0.4)] border border-[#00C2FF]'
                    : 'bg-[#1A1A1A] text-slate-300 hover:text-white hover:bg-[#2A2A2A] border border-[#3A3A3A]'
                }`}
              >
                <BarChart3 size={12} /> Beste Aufstellung & 4-Systeme
              </button>

              <button
                onClick={() => setActiveTabSub('standards')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeTabSub === 'standards'
                    ? 'bg-[#00C2FF] text-[#0A0A0A] shadow-[0_0_8px_rgba(0,194,255,0.4)] border border-[#00C2FF]'
                    : 'bg-[#1A1A1A] text-slate-300 hover:text-white hover:bg-[#2A2A2A] border border-[#3A3A3A]'
                }`}
              >
                <Target size={12} /> Standards
              </button>

              <button
                onClick={() => setActiveTabSub('presentation')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeTabSub === 'presentation'
                    ? 'bg-emerald-400 text-slate-950 shadow-[0_0_10px_rgba(52,211,153,0.6)] border border-emerald-300 font-black'
                    : 'bg-[#1A1A1A] text-emerald-400 hover:text-emerald-300 hover:bg-[#2A2A2A] border border-emerald-500/40'
                }`}
              >
                <Tv size={12} /> 📺 Spieltagspräsentation
              </button>

              <button
                onClick={() => setActiveTabSub('scenarios')}
                className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  activeTabSub === 'scenarios'
                    ? 'bg-violet-400 text-slate-950 shadow-[0_0_10px_rgba(167,139,250,0.6)] border border-violet-300 font-black'
                    : 'bg-[#1A1A1A] text-violet-400 hover:text-violet-300 hover:bg-[#2A2A2A] border border-violet-500/40'
                }`}
              >
                <Grid size={12} /> 1:1 Systeme & Standards
              </button>
            </div>
          </div>

          {/* Right: Controls (3D, 2D & Fullscreen) */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            <div className="bg-[#1A1A1A] p-0.5 rounded-md border border-[#3A3A3A] flex items-center gap-0.5">
              <button
                onClick={() => setViewMode('3d_tv')}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer ${
                  viewMode === '3d_tv'
                    ? 'bg-[#00C2FF] text-[#0A0A0A] shadow-xs font-black' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Compass size={10} /> 3D
              </button>
              <button
                onClick={() => setViewMode('2d_tactical')}
                className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider transition-all flex items-center gap-0.5 cursor-pointer ${
                  viewMode === '2d_tactical'
                    ? 'bg-[#00C2FF] text-[#0A0A0A] shadow-xs font-black' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Grid size={10} /> 2D
              </button>
            </div>

            <button
              onClick={() => {
                if (activeTabSub === 'presentation') {
                  setPresentationSlideIndex(0);
                  setIsTvMode(true);
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                } else {
                  setIsPitchOnlyFullscreen(true);
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }
              }}
              className="px-2 py-1 rounded-md text-[9.5px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 border border-amber-300 hover:bg-amber-300 transition-all flex items-center gap-1 shrink-0 font-black shadow cursor-pointer"
              title={activeTabSub === 'presentation' ? 'Spieltagspräsentation Vollbild' : 'Reines Taktikfeld Vollbild'}
            >
              <Maximize2 size={11} />
              <span>{activeTabSub === 'presentation' ? '📺 Präsentation' : 'Vollbild'}</span>
            </button>

            <button
              onClick={() => {
                const nextState = !trainerEditMode;
                setTrainerEditMode(nextState);
                notify(`Trainer-Bearbeitungsmodus ${nextState ? 'AKTIV' : 'deaktiviert'}`);
              }}
              className={`px-2 py-1 rounded-md text-[9.5px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 shrink-0 shadow cursor-pointer ${
                trainerEditMode 
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse' 
                  : 'bg-slate-800 text-amber-400 hover:bg-slate-700 border-amber-500/40'
              }`}
              title="Taktiktafel, Inhalte und Notizen bearbeiten"
            >
              <Edit3 size={11} className={trainerEditMode ? 'text-slate-950 font-black' : 'text-amber-400'} />
              <span>{trainerEditMode ? '✏️ AKTIV' : '✏️ Bearbeiten'}</span>
            </button>
          </div>
        </div>

        {/* DYNAMISCHE PFLICHTSPIELE-VERKNÜPFUNG: NÄCHSTES SPIEL BANNER & QUICK-SWITCHER */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 bg-slate-950/90 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg shadow-inner">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9.5px] font-black uppercase px-2 py-0.5 rounded tracking-wider shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              {selectedMatchObj.isNextMatch ? '🟢 NÄCHSTES PFLICHTSPIEL' : '📋 PFLICHTSPIEL'}
            </span>

            <span className="font-black text-white text-xs uppercase tracking-tight">
              {activeClub.shortName || 'FC AUGGEN'} vs. {selectedMatchObj.opponent.toUpperCase()}
            </span>

            <span className="text-slate-400 text-[10px] flex items-center gap-1.5 font-medium flex-wrap">
              <span>📅 {selectedMatchObj.date ? new Date(selectedMatchObj.date).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Spieltag'}</span>
              <span>•</span>
              <span>⏰ {selectedMatchObj.time} Uhr</span>
              <span>•</span>
              <span className={selectedMatchObj.isHome ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {selectedMatchObj.isHome ? '🏟️ Heim (Lettenpark)' : `🚌 Auswärts (${selectedMatchObj.location})`}
              </span>
              <span>•</span>
              <span className="text-slate-300">🏆 {selectedMatchObj.competition} (Spieltag {selectedMatchObj.matchday})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative">
              <select
                value={selectedPresentationMatchId}
                onChange={(e) => {
                  setSelectedPresentationMatchId(e.target.value);
                  const foundMatch = allCompetitiveMatches.find(m => String(m.id) === e.target.value.replace('m_', '') || String(m.id) === e.target.value);
                  notify(`Pflichtspiel gewechselt: ${activeClub.name} vs. ${foundMatch?.opponent || e.target.value}`);
                }}
                className="bg-slate-900 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-[10px] font-bold py-1 px-2 pr-6 rounded-md appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 max-w-[220px] sm:max-w-xs truncate"
              >
                {allCompetitiveMatches.map((m) => (
                  <option key={m.id} value={String(m.id)} className="bg-slate-950 text-white font-medium">
                    {nextUpcomingMatch?.id === m.id ? '🟢 [NÄCHSTES] ' : ''}{activeClub.name} vs. {m.opponent} ({m.date} - {m.homeAway || (m.isHome ? 'Heim' : 'Ausw.')})
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
            </div>

            {activeTabSub !== 'presentation' && (
              <button
                onClick={() => {
                  setActiveTabSub('presentation');
                  notify(`Spieltagspräsentation für ${activeClub.name} vs. ${selectedMatchObj.opponent} geladen!`);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9.5px] uppercase px-2.5 py-1 rounded-md transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                title="Direkt zur Spieltagspräsentation wechseln"
              >
                <Tv size={11} /> 📺 Präsentation
              </button>
            )}
          </div>
        </div>

        {/* TRAINER BEARBEITUNGSMODUS BANNER / CONTROLS (WENN BEARBEITEN AKTIV) */}
        {trainerEditMode && (
          <div className="bg-amber-500/10 border-2 border-amber-400/80 rounded-xl p-2.5 shadow-xl space-y-1.5 animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-amber-500/30 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="font-black text-[11px] uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Edit3 size={12} className="text-amber-400" />
                  TRAINER-BEARBEITUNGSMODUS AKTIV: Taktik, Notizen & Anweisungen anpassen
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => notify('Alle taktischen Änderungen erfolgreich in Cloud gespeichert!')}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9.5px] uppercase px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow"
                >
                  <Save size={11} /> Speichern
                </button>
                <button
                  onClick={() => {
                    setTrainerEditMode(false);
                    notify('Bearbeitungsmodus beendet.');
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[9.5px] uppercase px-2 py-1 rounded-md transition-all cursor-pointer"
                >
                  Fertig
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => {
                  const newNote = prompt('Neue taktische Trainer-Anweisung eingeben:');
                  if (newNote && newNote.trim()) {
                    setCustomTrainerNotes(prev => (prev ? `${prev}\n• ${newNote.trim()}` : `• ${newNote.trim()}`));
                    notify('Neue Anweisung hinzugefügt!');
                  }
                }}
                className="bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/50 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
              >
                → Anweisung zufügen
              </button>

              <button
                onClick={() => {
                  const newFormName = "4-1-2-3 Flex";
                  notify(`System "${newFormName}" bereitgestellt!`);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer"
              >
                → Neues System
              </button>

              <button
                onClick={() => {
                  setCustomTrainerNotes('');
                  notify('Taktische Notizen gelöscht.');
                }}
                className="bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 font-bold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer ml-auto"
              >
                🗑️ Löschen
              </button>
            </div>
          </div>
        )}

        {/* HAUPTEBENE 2: PHASEN-ANALYSE (SCHLANK & KOMPAKT MIT DROPDOWN-AUSWAHL) */}
        {showTrainerPhasePanelOnBoard && (
          <div className="bg-slate-950/95 border border-amber-500/40 rounded-lg p-1.5 flex flex-col gap-1 transition-all shadow-md">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 border-b border-slate-800/80 pb-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="font-black text-[10px] uppercase tracking-wider text-amber-300 flex items-center gap-1">
                  <Layers size={11} className="text-amber-400" />
                  PHASEN-ANALYSE ({selectedFormation}):
                </span>
              </div>

              {/* PHASEN TABS (Offensiv, Defensiv, Umschalten Offensiv, Umschalten Defensiv) - ULTRA KOMPAKT */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full sm:w-auto sm:flex-1 sm:max-w-2xl sm:ml-auto">
                <button
                  onClick={() => setActivePhase('offensiv')}
                  className={`w-full py-1 px-1.5 min-h-[24px] text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center text-center gap-1 leading-none ${
                    activePhase === 'offensiv'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-[10px]">🔵</span>
                  <span className="truncate">Offensiv</span>
                </button>
                <button
                  onClick={() => setActivePhase('defensiv')}
                  className={`w-full py-1 px-1.5 min-h-[24px] text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center text-center gap-1 leading-none ${
                    activePhase === 'defensiv'
                      ? 'bg-rose-500 text-white border-rose-400 font-black shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-[10px]">🛡️</span>
                  <span className="truncate">Defensiv</span>
                </button>
                <button
                  onClick={() => setActivePhase('umschalten')}
                  className={`w-full py-1 px-1.5 min-h-[24px] text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center text-center gap-1 leading-none ${
                    activePhase === 'umschalten'
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-[10px]">⚡</span>
                  <span className="truncate">Umschalten Off.</span>
                </button>
                <button
                  onClick={() => setActivePhase('umschalten_defensiv')}
                  className={`w-full py-1 px-1.5 min-h-[24px] text-[9.5px] font-black uppercase rounded-md border transition-all cursor-pointer flex items-center justify-center text-center gap-1 leading-none ${
                    activePhase === 'umschalten_defensiv'
                      ? 'bg-purple-500 text-white border-purple-400 font-black shadow-xs'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <span className="shrink-0 text-[10px]">🔄</span>
                  <span className="truncate">Umschalten Def.</span>
                </button>
              </div>
            </div>

            {/* KOMPAKTE DROPDOWN-LISTEN INNERHALB DER AKTIVEN PHASE */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 pt-0.5">
              {/* OFFENSIV OPTIONEN */}
              {activePhase === 'offensiv' && (
                <>
                  <div className="bg-slate-900/90 border border-emerald-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-emerald-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Aufbauhöhe</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.offensiv.aufbauhoehe}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, offensiv: { ...prev.offensiv, aufbauhoehe: e.target.value } }))}
                        className="w-full bg-slate-950 text-emerald-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-emerald-500/40 appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 h-6"
                      >
                        {['tief', 'mittelhoch', 'hoch'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-emerald-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Überzahlzonen</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.offensiv.ueberzahlzonen}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, offensiv: { ...prev.offensiv, ueberzahlzonen: e.target.value } }))}
                        className="w-full bg-slate-950 text-emerald-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-emerald-500/40 appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 h-6"
                      >
                        {['IV', '6er', 'Halbraum'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-emerald-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Progression</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.offensiv.progression}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, offensiv: { ...prev.offensiv, progression: e.target.value } }))}
                        className="w-full bg-slate-950 text-emerald-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-emerald-500/40 appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 h-6"
                      >
                        {['Kurzpass', 'Direktspiel', 'Verlagerung'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-emerald-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Halbraumnutzung</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.offensiv.halbraumnutzung}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, offensiv: { ...prev.offensiv, halbraumnutzung: e.target.value } }))}
                        className="w-full bg-slate-950 text-emerald-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-emerald-500/40 appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 h-6"
                      >
                        {['Achter', 'Zehner', 'inverser Flügel'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-emerald-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-emerald-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Offensivfokus</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.offensiv.offensivfokus}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, offensiv: { ...prev.offensiv, offensivfokus: e.target.value } }))}
                        className="w-full bg-slate-950 text-emerald-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-emerald-500/40 appearance-none cursor-pointer focus:outline-none focus:border-emerald-400 h-6"
                      >
                        {['Flügel', 'Zentrum', 'Umschaltspiel'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* DEFENSIV OPTIONEN */}
              {activePhase === 'defensiv' && (
                <>
                  <div className="bg-slate-900/90 border border-rose-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-rose-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Pressinghöhe</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.defensiv.pressinghoehe}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, defensiv: { ...prev.defensiv, pressinghoehe: e.target.value } }))}
                        className="w-full bg-slate-950 text-rose-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-rose-500/40 appearance-none cursor-pointer focus:outline-none focus:border-rose-400 h-6"
                      >
                        {['hoch', 'mittel', 'tief'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-rose-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-rose-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Pressinglenkung</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.defensiv.pressinglenkung}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, defensiv: { ...prev.defensiv, pressinglenkung: e.target.value } }))}
                        className="w-full bg-slate-950 text-rose-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-rose-500/40 appearance-none cursor-pointer focus:outline-none focus:border-rose-400 h-6"
                      >
                        {['Außenbahn', 'schwacher Fuß', 'Pressingfalle'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-rose-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-rose-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Kompaktheit</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.defensiv.kompaktheit}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, defensiv: { ...prev.defensiv, kompaktheit: e.target.value } }))}
                        className="w-full bg-slate-950 text-rose-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-rose-500/40 appearance-none cursor-pointer focus:outline-none focus:border-rose-400 h-6"
                      >
                        {['eng', 'breit', 'mittig'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-rose-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-rose-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Mannorientierung</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.defensiv.mannorientierung}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, defensiv: { ...prev.defensiv, mannorientierung: e.target.value } }))}
                        className="w-full bg-slate-950 text-rose-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-rose-500/40 appearance-none cursor-pointer focus:outline-none focus:border-rose-400 h-6"
                      >
                        {['ja', 'nein', 'situativ'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* UMSCHALTEN OFFENSIV OPTIONEN */}
              {activePhase === 'umschalten' && (
                <>
                  <div className="bg-slate-900/90 border border-amber-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-amber-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Zielzone</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenOffensiv.zielzone}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenOffensiv: { ...prev.umschaltenOffensiv, zielzone: e.target.value } }))}
                        className="w-full bg-slate-950 text-amber-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-amber-500/40 appearance-none cursor-pointer focus:outline-none focus:border-amber-400 h-6"
                      >
                        {['Flügel', 'Zentrum'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-amber-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-amber-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Umschalt-Tempo</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenOffensiv.tempo}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenOffensiv: { ...prev.umschaltenOffensiv, tempo: e.target.value } }))}
                        className="w-full bg-slate-950 text-amber-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-amber-500/40 appearance-none cursor-pointer focus:outline-none focus:border-amber-400 h-6"
                      >
                        {['schnell', 'kontrolliert'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-amber-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-amber-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Fokusspieler</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenOffensiv.fokusspieler}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenOffensiv: { ...prev.umschaltenOffensiv, fokusspieler: e.target.value } }))}
                        className="w-full bg-slate-950 text-amber-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-amber-500/40 appearance-none cursor-pointer focus:outline-none focus:border-amber-400 h-6"
                      >
                        {['Stürmer', 'Zehner', 'Flügel'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-amber-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-amber-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Umschalt-Muster</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenOffensiv.muster}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenOffensiv: { ...prev.umschaltenOffensiv, muster: e.target.value } }))}
                        className="w-full bg-slate-950 text-amber-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-amber-500/40 appearance-none cursor-pointer focus:outline-none focus:border-amber-400 h-6"
                      >
                        {['Steil-Klatsch', 'Tiefgang', 'Direktspiel'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {/* UMSCHALTEN DEFENSIV OPTIONEN */}
              {activePhase === 'umschalten_defensiv' && (
                <>
                  <div className="bg-slate-900/90 border border-purple-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-purple-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Gegenpressing</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenDefensiv.gegenpressingintensitaet}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenDefensiv: { ...prev.umschaltenDefensiv, gegenpressingintensitaet: e.target.value } }))}
                        className="w-full bg-slate-950 text-purple-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-purple-500/40 appearance-none cursor-pointer focus:outline-none focus:border-purple-400 h-6"
                      >
                        {['hoch', 'mittel', 'niedrig'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-purple-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-purple-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Trigger</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenDefensiv.trigger}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenDefensiv: { ...prev.umschaltenDefensiv, trigger: e.target.value } }))}
                        className="w-full bg-slate-950 text-purple-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-purple-500/40 appearance-none cursor-pointer focus:outline-none focus:border-purple-400 h-6"
                      >
                        {['Ballverlust Halbraum', 'schlechter Kontakt'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-purple-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-purple-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Restverteidigung</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenDefensiv.absicherung}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenDefensiv: { ...prev.umschaltenDefensiv, absicherung: e.target.value } }))}
                        className="w-full bg-slate-950 text-purple-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-purple-500/40 appearance-none cursor-pointer focus:outline-none focus:border-purple-400 h-6"
                      >
                        {['2+1 Absicherung', '3er Restverteidigung'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="bg-slate-900/90 border border-purple-500/30 px-2 py-1 rounded-md flex flex-col justify-center shadow-xs">
                    <span className="text-purple-400 font-bold uppercase text-[8.5px] block mb-0.5 tracking-wider">Pressingseite</span>
                    <div className="relative">
                      <select
                        value={tacticalPhaseConfig.umschaltenDefensiv.pressingseite}
                        onChange={(e) => setTacticalPhaseConfig(prev => ({ ...prev, umschaltenDefensiv: { ...prev.umschaltenDefensiv, pressingseite: e.target.value } }))}
                        className="w-full bg-slate-950 text-purple-300 font-black text-[10px] uppercase py-0.5 px-1.5 pr-5 rounded border border-purple-500/40 appearance-none cursor-pointer focus:outline-none focus:border-purple-400 h-6"
                      >
                        {['links', 'rechts', 'situativ'].map((val) => (
                          <option key={val} value={val} className="bg-slate-900 text-white font-bold">{val.toUpperCase()}</option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* HAUPTEBENE 3: DARSTELLUNGSOPTIONEN (EINKLAPPBAR - ULTRA-KOMPAKT) */}
        <div className="bg-slate-950 border border-slate-800 rounded-md py-1 px-2">
          <button
            onClick={() => setShowDarstellungsOptionen(!showDarstellungsOptionen)}
            className="w-full flex items-center justify-between gap-2 cursor-pointer group py-0.5"
            title={showDarstellungsOptionen ? 'Darstellungsoptionen ausblenden' : 'Darstellungsoptionen anzeigen'}
          >
            <span className="text-[9.5px] font-black uppercase text-slate-300 flex items-center gap-1 group-hover:text-white transition-colors">
              <Eye size={11} className="text-emerald-400" /> Darstellungsoptionen
              <span className="text-slate-500 font-bold normal-case">({showDarstellungsOptionen ? 'ausblenden' : 'aufklappen'})</span>
            </span>
            <ChevronDown
              size={12}
              className={`text-slate-400 transition-transform duration-200 ${showDarstellungsOptionen ? 'rotate-180' : ''}`}
            />
          </button>

          {showDarstellungsOptionen && (
          <div className="flex flex-wrap items-center gap-1 mt-1 border-t border-slate-800/70 pt-1.5">
            <button
              onClick={() => {
                if (activeTabSub === 'presentation') {
                  setPresentationSlideIndex(0);
                  setIsTvMode(true);
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                } else {
                  setIsPitchOnlyFullscreen(true);
                  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }
              }}
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 cursor-pointer font-black shadow transition-all flex items-center gap-1"
            >
              <Maximize2 size={11} />
              <span>{activeTabSub === 'presentation' ? '📺 Präsentation Vollbild' : '🖥️ Nur Taktikfeld Vollbild'}</span>
            </button>

            <button
              onClick={() => setActiveTabSub('presentation')}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                activeTabSub === 'presentation'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              📺 Präsentation
            </button>

            <button
              onClick={() => setShowZonesGrid(!showZonesGrid)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                showZonesGrid ? 'bg-sky-950 text-sky-300 border-sky-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              📐 Drittel-Grid
            </button>

            <button
              onClick={() => setShowHeatmaps(!showHeatmaps)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                showHeatmaps ? 'bg-amber-950 text-amber-300 border-amber-500 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              🔥 Heatmaps
            </button>

            <button
              onClick={() => toggleBallMode(11)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                ballMode && ballCount === 11 ? 'bg-orange-500 text-white border-orange-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              ⚽ 11 Bälle
            </button>

            <button
              onClick={() => toggleBallMode(6)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                ballMode && ballCount === 6 ? 'bg-orange-500 text-white border-orange-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              🔥 6 Bälle
            </button>

            <button
              onClick={() => toggleBallMode(3)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                ballMode && ballCount === 3 ? 'bg-orange-500 text-white border-orange-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              👑 3 Bälle
            </button>

            <button
              onClick={() => setShowOpponents(!showOpponents)}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                showOpponents ? 'bg-blue-600 text-white border-blue-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              🔴 Gegner
            </button>

            <button
              onClick={() => {
                if (animRef.current) cancelAnimationFrame(animRef.current);
                setIsAnimating(false);
                setAnimPaused(false);
                animProgressRef.current = 0;
                setAnimProgress(0);
                setSeqRunning(false);
                setSeqPhase(null);
                setSeqProgress(0);
                setAnimatedPlayerPositions({});
                setPassBallPos(null);
                setBallPositions([]);
                setBallMode(false);
                setDrawnPaths([]);
                setCurrentDrawPoints([]);
                setFreeDrawMode(false);
                setIsDrawingFreehand(false);
                setPassStations([]);
                setPassMode(false);
                setOpponentPlayers(defaultOpponents.map(o => ({ ...o })));
                setShowOpponents(false);
                setCustomRuns([]);
                setCustomPositionsMap({});
                setCustomZones([]);
                setCustomRoles({});
                setHighlightedPlayerIds([]);
                setLockedPlayerIds([]);
                setShowChampionsAnimation(false);
                setChampionsStarted(false);
                setChampPaused(false);
                setChampPhase('big');
                setChampNoteOpen(false);
                setChampionsActiveCount(0);
                setShowRunVectors(true);
                notify('Taktikfeld zurückgesetzt – alles Gelöschte entfernt, Board ist wieder leer');
              }}
              className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all bg-rose-600 text-white border-rose-400 hover:bg-rose-500 shadow flex items-center gap-1"
              title="Alles löschen: Bälle, Gegner, Laufwege, Freihand-Zeichnungen, Passstafetten und Animationen entfernen – Board auf blanko System zurücksetzen"
            >
              <Trash2 size={11} /> Alles löschen
            </button>

            <button
              onClick={() => { setFreeDrawMode(!freeDrawMode); if (freeDrawMode) { setIsDrawingFreehand(false); setCurrentDrawPoints([]); } }}
              className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                freeDrawMode ? 'bg-green-600 text-white border-green-400 font-black' : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              ✏️ Freihand
            </button>

            {/* Stufe 2: Stift-Farbkodierung (Blau=Offensiv, Rot=Defensiv, Gelb=Umschalten, Grün=Sprint) */}
            {freeDrawMode && (
              <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Zeichen-Farbe (Farblegende)">
                {[
                  { c: '#3B82F6', l: 'Blau Offensiv' },
                  { c: '#EF4444', l: 'Rot Defensiv' },
                  { c: '#F59E0B', l: 'Gelb Umschalten' },
                  { c: '#22C55E', l: 'Grün Sprint' },
                ].map(f => (
                  <button
                    key={f.c}
                    onClick={() => setDrawColor(f.c)}
                    title={f.l}
                    className={`w-4 h-4 rounded-full border transition-all cursor-pointer ${drawColor === f.c ? 'ring-2 ring-white scale-110' : 'border-slate-600 opacity-70 hover:opacity-100'}`}
                    style={{ backgroundColor: f.c }}
                  />
                ))}
              </div>
            )}

            {/* STUFE 3: Spielaufbau-Varianten */}
            <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Spielaufbau-Variante laden (setzt Laufwege)">
              <span className="text-[8.5px] font-black uppercase text-slate-400 mr-0.5">⚽ Aufbau</span>
              <button onClick={() => applyBuildUpVariant('sechser')} className="px-1.5 py-0.5 text-[9px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="Aufbau über den 6er">6er</button>
              <button onClick={() => applyBuildUpVariant('achter')} className="px-1.5 py-0.5 text-[9px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="Aufbau über den 8er">8er</button>
              <button onClick={() => applyBuildUpVariant('langerBall')} className="px-1.5 py-0.5 text-[9px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="Langer Ball auf den Flügel">⚡ Ball</button>
              <button onClick={() => applyBuildUpVariant('strafraum')} className="px-1.5 py-0.5 text-[9px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="Strafraumbesetzung & Torabschluss">🎯 Box</button>
              <button
                onClick={applyDoppelpass}
                className="bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-bold text-[10px] uppercase px-2 py-1.5 rounded-lg border border-purple-500/30 transition-all flex items-center gap-1"
                title="Doppelpass: 2 Spieler kreuzen, Ball durch 5 Stationen"
              >
                <Repeat size={11} /> Doppelpass
              </button>
            </div>

            {/* STUFE 4: Passstafette */}
            <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5" title="Passstafette (Pass-Sequenz)">
              <button
                onClick={togglePassMode}
                className={`px-1.5 py-0.5 text-[9px] font-black rounded cursor-pointer transition-all ${passMode ? 'bg-green-600 text-white border border-green-400 font-black' : 'text-slate-300 hover:text-white border border-transparent'}`}
              >
                🎯 Stafette
              </button>
              <select
                value={passAction}
                onChange={(e) => setPassAction(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-[8.5px] font-black text-slate-200 px-1 py-0.5 rounded focus:outline-none cursor-pointer max-w-[80px]"
              >
                {PASS_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={() => loadPassTemplate(3)} className="px-1 py-0.5 text-[8.5px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="3-Stationen-Vorlage laden">3</button>
              <button onClick={() => loadPassTemplate(6)} className="px-1 py-0.5 text-[8.5px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="6-Stationen-Vorlage laden">6</button>
              <button onClick={() => loadPassTemplate(9)} className="px-1 py-0.5 text-[8.5px] font-black rounded cursor-pointer hover:bg-sky-500/30 transition-all text-slate-300" title="9-Stationen-Vorlage laden (Tiki-Taka)">9</button>
              {passStations.length > 0 && (
                <button onClick={() => { setPassStations([]); setPassBallPos(null); }} className="px-1 py-0.5 text-[8.5px] font-black rounded cursor-pointer hover:bg-rose-500/30 transition-all text-rose-300" title="Passstafette leeren">🧹 Leeren</button>
              )}
            </div>

            {(drawnPaths.length > 0 || showOpponents || customRuns.length > 0 || passStations.length >= 2) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={startAnimation}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                    isAnimating ? (animPaused ? 'bg-amber-500 text-white border-amber-400 font-black' : 'bg-slate-600 text-white border-slate-400 font-black') : 'bg-indigo-600 text-white border-indigo-400 font-black'
                  }`}
                  title={isAnimating ? (animPaused ? 'Fortsetzen' : 'Pausieren') : 'Abspielen'}
                >
                  {isAnimating ? (animPaused ? '▶️ Weiter' : '⏸ Pause') : '▶️ Abspielen'}
                </button>
                <button
                  onClick={seqRunning ? stopSequence : startSequence}
                  className={`px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all ${
                    seqRunning ? (seqPhase === 'lauf' ? 'bg-sky-500 text-white border-sky-400' : seqPhase === 'pass' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-violet-500 text-white border-violet-400') : 'bg-slate-800 text-sky-300 border-slate-600 hover:border-sky-400'
                  }`}
                  title={seqRunning ? `Sequenz läuft – Phase: ${seqPhaseLabel}` : 'Sequenz: erst Laufweg, dann Passweg, dann alles'}
                >
                  {seqRunning ? (seqPhase === 'lauf' ? `🚶 ${seqPhaseLabel}` : seqPhase === 'pass' ? `⚽ ${seqPhaseLabel}` : `🔁 ${seqPhaseLabel}`) : '🔁 Sequenz'}
                </button>
                {isAnimating && (
                  <button
                    onClick={() => { if (animRef.current) cancelAnimationFrame(animRef.current); setIsAnimating(false); setAnimPaused(false); animProgressRef.current = 0; setAnimProgress(0); setAnimatedPlayerPositions({}); setPassBallPos(null); }}
                    className="px-2 py-0.5 text-[9.5px] font-black uppercase rounded-md border cursor-pointer transition-all bg-red-500 text-white border-red-400 font-black"
                    title="Stoppen und zurücksetzen"
                  >
                    ⏹ Stopp
                  </button>
                )}
                {/* Geschwindigkeit */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-700 rounded-md px-1 py-0.5">
                  <span className="text-[8.5px] font-black uppercase text-slate-400 mr-0.5">Speed</span>
                  {[0.5, 1, 1.5, 2].map(s => (
                    <button
                      key={s}
                      onClick={() => setAnimSpeed(s)}
                      className={`px-1.5 py-0.5 text-[9px] font-black rounded transition-all cursor-pointer ${animSpeed === s ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                {/* Zeitleiste / Scrubber */}
                <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 min-w-[120px]">
                  <span className="text-[8.5px] font-black uppercase text-slate-400">⏱</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.001}
                    value={animProgress}
                    onChange={(e) => { if (animRef.current) cancelAnimationFrame(animRef.current); setIsAnimating(false); setAnimPaused(false); handleScrub(parseFloat(e.target.value)); }}
                    className="flex-1 h-1.5 cursor-pointer accent-cyan-500"
                  />
                  <span className="text-[8.5px] font-bold text-slate-300 tabular-nums">{Math.round(animProgress * 100)}%</span>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* SUB-TAB 1: 3D-TAKTIKTAFEL (TV VIEW & ZONEN) */}
      {activeTabSub === 'board' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT 8 COLS: PITCH CANVAS WITH DRITTEL & ZONEN-RASTER */}
          <div className="lg:col-span-8 flex flex-col space-y-4">

            {/* Ball-Modus Instruction Bar */}
            {ballMode && (
              <div className="bg-orange-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center justify-between shadow-lg border border-orange-300">
                <span className="flex items-center gap-2">
                  ⚽ Ball-Modus aktiv — Ziehe die Bälle an die gewünschte Position. {ballPositions.length} Bälle aktiv.
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setBallPositions(currentNodePositions.slice(0, ballCount).map(p => ({ playerId: p.id, x: p.currentX, y: p.currentY })));
                    }}
                    className="bg-slate-950 text-white px-2 py-0.5 rounded text-[10px] uppercase font-black"
                  >
                    Zurücksetzen
                  </button>
                  <button 
                    onClick={() => { setBallMode(false); setShowRunVectors(true); }}
                    className="bg-slate-950 text-white px-2 py-0.5 rounded text-[10px] uppercase font-black"
                  >
                    Ball-Modus aus
                  </button>
                </div>
              </div>
            )}

            {/* Target mode instruction bar when plotting runs */}
            {runTargetModePlayerId && (
              <div className="bg-amber-500 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center justify-between shadow-lg border border-amber-300">
                <span className="flex items-center gap-2">
                  <CornerUpRight size={16} /> 
                  Klicke auf das Spielfeld, um den Zielpunkt für den Laufweg von "{currentNodePositions.find(n => n.id === runTargetModePlayerId)?.name}" zu setzen...
                </span>
                <button 
                  onClick={() => setRunTargetModePlayerId(null)}
                  className="bg-slate-950 text-white px-2 py-0.5 rounded text-[10px] uppercase font-black"
                >
                  Abbrechen
                </button>
              </div>
            )}

            {/* Multi-run instruction bar */}
            {multiRunMode && (
              <div className="bg-cyan-500/20 border border-cyan-500/40 rounded-xl px-4 py-2 flex items-center gap-3">
                <Route size={14} className="text-cyan-400" />
                <span className="text-xs font-bold text-cyan-300">
                  Laufweg zeichnen: {multiRunPoints.length} Punkte gesetzt. 
                  Klicke weitere Punkte, Doppelklick zum Beenden, Rechtsklick zum Abbrechen.
                </span>
              </div>
            )}

            {/* PITCH CANVAS CONTAINER */}
            <div 
              ref={pitchRef}
              onClick={handlePitchClickForRun}
              onMouseDown={handlePitchMouseDown}
              onMouseMove={handlePitchMouseMove}
              onTouchMove={handlePitchMouseMove}
              onMouseUp={handlePitchMouseUp}
              onTouchEnd={handlePitchMouseUp}
              onDoubleClick={(e) => {
                if (multiRunMode) {
                  e.preventDefault();
                  finishMultiRun();
                }
              }}
              onContextMenu={(e) => {
                if (multiRunMode) {
                  e.preventDefault();
                  setMultiRunMode(false);
                  setMultiRunPlayerId(null);
                  setMultiRunPoints([]);
                  notify('Laufweg-Zeichnung abgebrochen');
                }
              }}
              className={`relative w-full rounded-2xl border-2 border-slate-800 bg-slate-950 overflow-hidden shadow-2xl transition-all duration-500 select-none ${
                viewMode === '3d_tv' ? 'h-[660px] [perspective:1000px]' : 'h-[660px]'
              }`}
            >
              {/* Floating Quick Solo Fullscreen Button */}
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPitchOnlyFullscreen(true);
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    }
                  }}
                  className="bg-slate-900/90 hover:bg-amber-400 hover:text-slate-950 text-amber-300 border border-amber-500/50 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-2xl backdrop-blur-md flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Spielfeld in Reines Vollbild vergrößern"
                >
                  <Maximize2 size={13} />
                  <span>🖥️ Solo Spielfeld</span>
                </button>
              </div>
              {/* THE PITCH SURFACE */}
              <div 
                ref={pitchSurfaceRef}
                className={`w-full h-full relative transition-transform duration-700 ease-out origin-center ${
                  viewMode === '3d_tv' 
                    ? '[transform:rotateX(12deg)_rotateY(0deg)_scale(0.92)] shadow-[0_50px_100px_rgba(0,0,0,0.9)]' 
                    : ''
                }`}
                style={{
                  background: 'radial-gradient(circle at center, #063826 0%, #031e15 100%)'
                }}
              >
                {/* Grass Pattern Stripes */}
                <div className="absolute inset-0 grid grid-cols-12 opacity-20 pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className={i % 2 === 0 ? 'bg-emerald-400/10' : 'bg-transparent'} />
                  ))}
                </div>

                {/* Outer Field Boundary Line — vertical pitch (goals top/bottom) */}
                <div className="absolute inset-4 border-2 border-emerald-400/40 pointer-events-none rounded-sm">
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-emerald-400/40 -translate-y-1/2" />
                  <div className="absolute top-1/2 left-1/2 w-32 h-32 rounded-full border-2 border-emerald-400/40 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
                  </div>
                  <div className="absolute left-1/2 top-0 w-48 h-24 -translate-x-1/2 border-2 border-t-0 border-emerald-400/40">
                    <div className="absolute left-1/2 top-0 w-24 h-10 -translate-x-1/2 border border-t-0 border-emerald-400/30" />
                  </div>
                  <div className="absolute left-1/2 bottom-0 w-48 h-24 -translate-x-1/2 border-2 border-b-0 border-emerald-400/40">
                    <div className="absolute left-1/2 bottom-0 w-24 h-10 -translate-x-1/2 border border-b-0 border-emerald-400/30" />
                  </div>
                </div>

                {/* 3 VERTIKALE DRITTEL OVERLAY — horizontal thirds for vertical pitch */}
                {showZonesGrid && (
                  <div className="absolute inset-4 grid grid-rows-3 pointer-events-none">
                    <div className="border-b-2 border-dashed border-emerald-400/50 flex flex-row items-start justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-emerald-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Offensives Drittel</span>
                      <span className="text-[9px] font-mono font-black text-emerald-400/50">Sturmbox</span>
                    </div>
                    <div className="border-b-2 border-dashed border-amber-400/50 flex flex-row items-center justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-amber-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Mittelfeld-Drittel</span>
                      <span className="text-[9px] font-mono font-black text-amber-400/50">Halbräume & Zentrum</span>
                    </div>
                    <div className="flex flex-row items-end justify-between p-2">
                      <span className="text-[9px] font-mono font-black text-sky-400/80 bg-slate-950/80 px-1.5 py-0.5 rounded uppercase">Defensives Drittel</span>
                      <span className="text-[9px] font-mono font-black text-sky-400/50">Abwehrkette</span>
                    </div>
                  </div>
                )}

                {/* HEATMAP CLOUDS OVERLAY */}
                {showHeatmaps && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[65%] left-[30%] w-40 h-56 rounded-full bg-amber-500/35 blur-3xl animate-pulse" />
                    <div className="absolute top-[75%] left-[60%] w-36 h-48 rounded-full bg-emerald-500/40 blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
                    <div className="absolute top-[25%] left-[40%] w-44 h-44 rounded-full bg-rose-500/30 blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
                    <div className="absolute top-[50%] left-[50%] w-28 h-28 rounded-full bg-violet-500/25 blur-xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                  </div>
                )}

                {/* PLAYER MARKED ZONES OVERLAY */}
                {currentNodePositions.map((node) => {
                  const zoneObj = customZones.find(z => z.playerId === node.id);
                  if (!zoneObj || zoneObj.zoneType === 'Keine') return null;
                  return (
                    <div
                      key={`zone-${node.id}`}
                      style={{
                        left: `${node.currentX}%`,
                        top: `${node.currentY}%`,
                        backgroundColor: zoneObj.color
                      }}
                      className="absolute w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-sm border border-white/20 pointer-events-none transition-all duration-300"
                    />
                  );
                })}

                {/* RUN VECTOR LINES (Standard & Custom Runs) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  <defs>
                    <marker id="arrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <polygon points="0 0, 7 3.5, 0 7" fill="#10B981" />
                    </marker>
                    <marker id="arrowhead-custom" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                      <polygon points="0 0, 7 3.5, 0 7" fill="#3B82F6" />
                    </marker>
                    <marker id="arrow-pass" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#FBBF24" />
                    </marker>
                    <marker id="arrow-pass-direkt" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#22D3EE" />
                    </marker>
                    <marker id="arrow-pass-steil" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#FBBF24" />
                    </marker>
                    <marker id="arrow-pass-flanke" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#38BDF8" />
                    </marker>
                    <marker id="arrow-pass-klatsch" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#34D399" />
                    </marker>
                    <marker id="arrow-pass-doppelpass" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#A78BFA" />
                    </marker>
                    <marker id="arrow-pass-schuss" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                      <polygon points="0 0, 6 3, 0 6" fill="#EF4444" />
                    </marker>
                  </defs>

                  {/* Standard preset run vectors if enabled */}
                  {showRunVectors && customRuns.length === 0 && currentNodePositions.map((n) => {
                    if (n.position === 'TW') return null;
                    const targetY = n.currentY - 8;
                    const targetX = n.currentX + (n.currentX > 50 ? -6 : 6);
                    return (
                      <line
                        key={`vector-${n.id}`}
                        x1={`${n.currentX}%`}
                        y1={`${n.currentY}%`}
                        x2={`${targetX}%`}
                        y2={`${targetY}%`}
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        markerEnd="url(#arrowhead)"
                        className="opacity-75"
                      />
                    );
                  })}

                  {/* Custom saved runs */}
                  {/* Multi-run preview while drawing (main view) */}
                  {multiRunMode && multiRunPoints.length >= 1 && (
                    <polyline
                      points={multiRunPoints.map(p => `${p.x}% ${p.y}%`).join(', ')}
                      fill="none"
                      stroke="#22D3EE"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                      opacity="0.9"
                    />
                  )}
                  {multiRunMode && multiRunPoints.length >= 1 && multiRunPoints.map((p, i) => (
                    <circle
                      key={`mr-${i}`}
                      cx={`${p.x}%`}
                      cy={`${p.y}%`}
                      r={i === 0 ? 2 : 1.2}
                      fill={i === 0 ? '#22C55E' : '#22D3EE'}
                      stroke="white"
                      strokeWidth="0.4"
                    />
                  ))}
                  {customRuns.map((run) => {
                    if (!run.path || run.path.length < 2) return null;
                    const p1 = run.path[0];
                    const p2 = run.path[1];
                    return (
                      <g key={run.id}>
                        <line
                          x1={`${p1.x}%`}
                          y1={`${p1.y}%`}
                          x2={`${p2.x}%`}
                          y2={`${p2.y}%`}
                          stroke={run.color || '#3B82F6'}
                          strokeWidth="3.5"
                          strokeDasharray="5 3"
                          markerEnd="url(#arrowhead-custom)"
                          className="drop-shadow-md"
                        />
                        <circle cx={`${p2.x}%`} cy={`${p2.y}%`} r="4" fill={run.color || '#3B82F6'} />
                      </g>
                    );
                  })}
                </svg>

                {/* BALL-MODUS: Draggable Bälle auf dem Pitch */}
                {ballMode && ballPositions.map((bp) => {
                  const pNode = currentNodePositions.find(n => n.id === bp.playerId);
                  if (!pNode) return null;
                  return (
                    <div
                      key={`ball-${bp.playerId}`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingBallId(bp.playerId);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setDraggingBallId(bp.playerId);
                      }}
                      className="absolute z-30 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: `${bp.x}%`, top: `${bp.y}%` }}
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 via-white to-yellow-400 border-2 border-yellow-600 shadow-lg shadow-yellow-500/40 flex items-center justify-center text-[7px] font-black text-yellow-900 group-hover:scale-125 transition-transform">
                        ⚽
                      </div>
                      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] font-black text-yellow-300 bg-slate-950/80 px-0.5 rounded whitespace-nowrap">
                        {pNode.number}
                      </span>
                    </div>
                  );
                })}
                {currentNodePositions.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isContextMenuActive = contextMenuPlayerId === node.id;

                  return (
                    <motion.div
                      key={node.id}
                      onMouseDown={() => {
                        setSelectedNodeId(node.id);
                        if (!node.isLocked) {
                          setDraggingNodeId(node.id);
                        }
                      }}
                      onTouchStart={() => {
                        setSelectedNodeId(node.id);
                        if (!node.isLocked) {
                          setDraggingNodeId(node.id);
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(node.id);
                        // Open sleek context menu for this player
                        setContextMenuPlayerId(node.id);
                        setContextSubMenu('main');
                        setRenameInput(customFormationsList.find(f => f.id === selectedFormation)?.name || basePreset.name);
                      }}
                      style={{
                        left: `${animatedPlayerPositions[node.id]?.x ?? node.currentX}%`,
                        top: `${animatedPlayerPositions[node.id]?.y ?? node.currentY}%`
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group"
                    >
                      {/* 3D NODE GLOW & SELECTION / HIGHLIGHT RING */}
                      <div className={`relative flex flex-col items-center justify-center transition-all ${
                        isSelected || node.isHighlighted ? 'scale-125 z-40' : 'hover:scale-110 z-20'
                      }`}>
                        
                        {/* Highlighted Gold Pulse Ring */}
                        {node.isHighlighted && (
                          <div className="absolute -inset-4 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />
                        )}

                        {/* Selected aura ring */}
                        {isSelected && !node.isHighlighted && (
                          <div className="absolute -inset-3 rounded-full bg-emerald-400/30 animate-pulse pointer-events-none" />
                        )}

                        {/* Player Name Pill / Badge — FC Auggen ROT */}
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-xl border flex items-center gap-1 ${
                          node.isHighlighted
                            ? 'bg-amber-400 text-slate-950 border-white font-black shadow-amber-500/50'
                            : isSelected 
                            ? 'bg-[#e94560] text-white border-white shadow-[#e94560]/50' 
                            : 'bg-[#e94560]/90 text-white border-[#ff6b81]/50 group-hover:border-[#e94560]'
                        }`}>
                          {node.isLocked && <Lock size={9} className="text-amber-300" />}
                          {node.isHighlighted && <Star size={9} className="fill-slate-950 text-slate-950" />}
                          <span>{node.number}. {node.name}</span>
                        </div>

                        {/* 3D Node Sphere Marker — FC Auggen ROT */}
                        <div className={`w-8 h-8 rounded-full border-2 mt-1 flex items-center justify-center shadow-2xl text-xs font-black transition-all ${
                          node.isHighlighted
                            ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-200 border-white text-slate-950 shadow-amber-500/60'
                            : isSelected
                            ? 'bg-gradient-to-tr from-[#e94560] to-[#ff6b81] border-white text-white shadow-[#e94560]/50'
                            : 'bg-gradient-to-tr from-[#e94560] to-[#c0392b] border-white text-white shadow-[#e94560]/40'
                        }`}>
                          {node.position}
                        </div>

                        {/* Role tag badge under node */}
                        {node.role && (
                          <span className="text-[8px] font-mono font-bold bg-slate-950/90 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 mt-0.5 whitespace-nowrap shadow-sm">
                            {node.role}
                          </span>
                        )}
                      </div>

                      {/* SLEEK COMPACT CONTEXT MENU (POPOVER ON PLAYER CLICK) */}
                      <AnimatePresence>
                        {isContextMenuActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-56 bg-slate-900/98 border-2 border-emerald-500/60 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl z-50 text-slate-100 font-sans"
                          >
                            {/* Close Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenuPlayerId(null);
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                            >
                              <X size={14} />
                            </button>

                            {/* Context Menu Header */}
                            <div className="border-b border-slate-800 pb-2 mb-2 pr-6">
                              <div className="font-black text-xs text-white uppercase truncate flex items-center gap-1">
                                <span className="text-amber-400 font-mono">#{node.number}</span> {node.name}
                              </div>
                              <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                                {node.position} • {node.role}
                              </div>
                            </div>

                            {/* MENU MAIN VIEW */}
                            {contextSubMenu === 'main' && (
                              <div className="space-y-1 text-xs">
                                
                                {/* 1. Laufweg hinzufügen */}
                                <button
                                  onClick={() => {
                                    setRunTargetModePlayerId(node.id);
                                    setContextMenuPlayerId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-emerald-400 font-bold flex items-center gap-2 transition-colors"
                                >
                                  <CornerUpRight size={14} />
                                  <span>Laufweg hinzufügen</span>
                                </button>
                                <button
                                  onClick={() => { startMultiRunDrawing(node.id); setContextMenuPlayerId(null); }}
                                  className="w-full text-left px-3 py-2 text-xs font-bold text-cyan-400 hover:bg-cyan-500/20 rounded-lg flex items-center gap-2"
                                >
                                  <Route size={13} /> Mehrpunkt-Laufweg zeichnen
                                </button>

                                {/* 2. Spieler hervorheben */}
                                <button
                                  onClick={() => {
                                    const isH = highlightedPlayerIds.includes(node.id);
                                    const next = isH 
                                      ? highlightedPlayerIds.filter(id => id !== node.id)
                                      : [...highlightedPlayerIds, node.id];
                                    setHighlightedPlayerIds(next);
                                    syncActiveCustomFormationToFirestore({ highlightedPlayerIds: next });
                                    notify(isH ? `${node.name} nicht mehr hervorgehoben.` : `${node.name} hervorgehoben!`);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-amber-300 font-bold flex items-center justify-between transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    <Star size={14} /> Spieler hervorheben
                                  </span>
                                  {node.isHighlighted && <Check size={14} className="text-amber-400" />}
                                </button>

                                {/* 3. Rolle zuweisen */}
                                <button
                                  onClick={() => setContextSubMenu('roles')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-between transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    <Layers size={14} className="text-sky-400" /> Rolle zuweisen
                                  </span>
                                  <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                                </button>

                                {/* 4. Zone markieren */}
                                <button
                                  onClick={() => setContextSubMenu('zones')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-between transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    <Grid size={14} className="text-purple-400" /> Zone markieren
                                  </span>
                                  <ChevronDown size={14} className="-rotate-90 text-slate-400" />
                                </button>

                                {/* 5. Position sperren / freigeben */}
                                <button
                                  onClick={() => {
                                    const isL = lockedPlayerIds.includes(node.id);
                                    const next = isL 
                                      ? lockedPlayerIds.filter(id => id !== node.id)
                                      : [...lockedPlayerIds, node.id];
                                    setLockedPlayerIds(next);
                                    syncActiveCustomFormationToFirestore({ lockedPlayerIds: next });
                                    notify(isL ? `Position von ${node.name} freigegeben.` : `Position von ${node.name} gesperrt!`);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-200 font-semibold flex items-center justify-between transition-colors"
                                >
                                  <span className="flex items-center gap-2">
                                    {node.isLocked ? <Lock size={14} className="text-amber-400" /> : <Unlock size={14} className="text-slate-400" />}
                                    <span>{node.isLocked ? 'Position freigeben' : 'Position sperren'}</span>
                                  </span>
                                </button>

                                {/* 6. Formation umbenennen */}
                                <button
                                  onClick={() => setContextSubMenu('rename')}
                                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold flex items-center gap-2 transition-colors"
                                >
                                  <Edit3 size={14} className="text-amber-400" />
                                  <span>Formation umbenennen</span>
                                </button>

                                {/* Option to clear custom runs for this player if present */}
                                {customRuns.some(r => r.playerId === node.id) && (
                                  <button
                                    onClick={() => {
                                      const nextRuns = customRuns.filter(r => r.playerId !== node.id);
                                      setCustomRuns(nextRuns);
                                      syncActiveCustomFormationToFirestore({ runs: nextRuns });
                                      notify(`Laufwege von ${node.name} entfernt.`);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/60 text-rose-400 font-medium flex items-center gap-2 transition-colors mt-1 border-t border-slate-800"
                                  >
                                    <Trash2 size={13} />
                                    <span>Laufwege löschen</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* ROLES SUBMENU */}
                            {contextSubMenu === 'roles' && (
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                                  <span>Rolle auswählen:</span>
                                  <button onClick={() => setContextSubMenu('main')} className="text-emerald-400 hover:underline">Zurück</button>
                                </div>

                                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                                  {PREDEFINED_ROLES.map(roleName => (
                                    <button
                                      key={roleName}
                                      onClick={() => {
                                        const updatedRoles = { ...customRoles, [node.id]: roleName };
                                        setCustomRoles(updatedRoles);
                                        syncActiveCustomFormationToFirestore({ roles: updatedRoles });
                                        setContextMenuPlayerId(null);
                                        notify(`Rolle "${roleName}" für ${node.name} zugewiesen.`);
                                      }}
                                      className={`px-2 py-1 rounded text-[10px] font-bold text-left truncate transition-colors ${
                                        node.role === roleName ? 'bg-emerald-600 text-white' : 'bg-slate-950 hover:bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {roleName}
                                    </button>
                                  ))}
                                </div>

                                <div className="pt-1.5 flex gap-1 border-t border-slate-800">
                                  <input
                                    type="text"
                                    value={customRoleInput}
                                    onChange={(e) => setCustomRoleInput(e.target.value)}
                                    placeholder="Eigene Rolle..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                                  />
                                  <button
                                    onClick={() => {
                                      if (!customRoleInput.trim()) return;
                                      const updatedRoles = { ...customRoles, [node.id]: customRoleInput.trim() };
                                      setCustomRoles(updatedRoles);
                                      syncActiveCustomFormationToFirestore({ roles: updatedRoles });
                                      setCustomRoleInput('');
                                      setContextMenuPlayerId(null);
                                      notify(`Rolle zugewiesen!`);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2 text-[10px] rounded"
                                  >
                                    OK
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* ZONES SUBMENU */}
                            {contextSubMenu === 'zones' && (
                              <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                                  <span>Zone markieren:</span>
                                  <button onClick={() => setContextSubMenu('main')} className="text-emerald-400 hover:underline">Zurück</button>
                                </div>

                                <div className="space-y-1">
                                  {PREDEFINED_ZONES.map(z => (
                                    <button
                                      key={z.name}
                                      onClick={() => {
                                        const filteredZones = customZones.filter(cz => cz.playerId !== node.id);
                                        const nextZones = z.name === 'Keine' 
                                          ? filteredZones 
                                          : [...filteredZones, { playerId: node.id, zoneType: z.name, color: z.color }];
                                        setCustomZones(nextZones);
                                        syncActiveCustomFormationToFirestore({ zones: nextZones });
                                        setContextMenuPlayerId(null);
                                        notify(z.name === 'Keine' ? `Zone entfernt.` : `Zone "${z.name}" markiert.`);
                                      }}
                                      className={`w-full text-left px-2.5 py-1 rounded text-[10px] font-bold flex items-center justify-between transition-colors ${
                                        node.markedZone === z.name ? 'bg-purple-600 text-white' : 'bg-slate-950 hover:bg-slate-800 text-slate-200'
                                      }`}
                                    >
                                      <span>{z.name}</span>
                                      {z.color !== 'transparent' && (
                                        <span className="w-3 h-3 rounded-full border border-white/40" style={{ backgroundColor: z.color }} />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* RENAME SUBMENU */}
                            {contextSubMenu === 'rename' && (
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                                  <span>Formation umbenennen:</span>
                                  <button onClick={() => setContextSubMenu('main')} className="text-emerald-400 hover:underline">Zurück</button>
                                </div>

                                <input
                                  type="text"
                                  value={renameInput}
                                  onChange={(e) => setRenameInput(e.target.value)}
                                  placeholder="Formationsname..."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                                  autoFocus
                                />

                                <button
                                  onClick={() => handleRenameActiveFormation(renameInput)}
                                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-1.5 rounded-lg text-xs uppercase shadow transition-all flex items-center justify-center gap-1"
                                >
                                  <Save size={13} /> Speichern
                                </button>
                              </div>
                            )}

                          </motion.div>
                        )}
                      </AnimatePresence>

                    </motion.div>
                  );
                })}

                {/* ═══ GEGNER (Blau) — 11 Spieler ═══ */}
                {showOpponents && opponentPlayers.map((opp) => {
                  const oppX = isAnimating && opponentTargetPositions[opp.id]
                    ? opponentTargetPositions[opp.id].x + (opp.x - opponentTargetPositions[opp.id].x) * (1 - animProgress)
                    : opp.x;
                  const oppY = isAnimating && opponentTargetPositions[opp.id]
                    ? opponentTargetPositions[opp.id].y + (opp.y - opponentTargetPositions[opp.id].y) * (1 - animProgress)
                    : opp.y;
                  return (
                    <div
                      key={opp.id}
                      onMouseDown={(e) => { e.stopPropagation(); setDraggingOppId(opp.id); }}
                      onTouchStart={(e) => { e.stopPropagation(); setDraggingOppId(opp.id); }}
                      className="absolute z-25 cursor-grab active:cursor-grabbing -translate-x-1/2 -translate-y-1/2 group"
                      style={{ left: `${oppX}%`, top: `${oppY}%` }}
                    >
                      <div className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-[#3B82F6]/90 text-white border border-blue-300 shadow-lg mb-0.5 whitespace-nowrap">
                        {opp.number}. {opp.name}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#3B82F6] to-[#1D4ED8] border-2 border-white text-white flex items-center justify-center text-[9px] font-black shadow-lg mx-auto">
                        {opp.number}
                      </div>
                    </div>
                  );
                })}

                {/* ═══ FREIHAND-LAUFWEGE ═══ */}
                {drawnPaths.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full z-15 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {drawnPaths.map((path) => {
                      if (path.points.length < 2) return null;
                      const d = path.points.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '');
                      return (
                        <g key={path.id}>
                          <path d={d} fill="none" stroke={path.color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                          <circle cx={path.points[0].x} cy={path.points[0].y} r="1" fill={path.color} opacity="0.6" />
                          <circle cx={path.points[path.points.length - 1].x} cy={path.points[path.points.length - 1].y} r="1.2" fill={path.color} />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* ═══ FREIHAND: Aktiver Pfad beim Zeichnen ═══ */}
                {freeDrawMode && currentDrawPoints.length > 1 && (
                  <svg className="absolute inset-0 w-full h-full z-16 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path
                      d={currentDrawPoints.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '')}
                      fill="none" stroke={drawColor} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"
                    />
                  </svg>
                )}

                {/* ═══ ABSPIELEN: Animierte Spieler-Punkte laufen entlang der gezeichneten Pfade ═══ */}
                {isAnimating && drawnPaths.map((path) => {
                  if (path.points.length < 2) return null;
                  const pos = pointAlongPathsForProgress(path.points, animProgress);
                  if (!pos) return null;
                  return (
                    <div
                      key={`anim-${path.id}`}
                      className="absolute z-35 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                    >
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#e94560] to-[#c0392b] border-2 border-white shadow-lg shadow-[#e94560]/60 flex items-center justify-center text-[8px] font-black text-white">
                        ▶
                      </div>
                    </div>
                  );
                })}

                {/* ═══ PASSSTAFETTE (Stufe 4) ═══ */}
                {passStations.length > 0 && !(seqRunning && seqPhase === 'lauf') && (
                  <svg className="absolute inset-0 w-full h-full z-15 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {passStations.slice(0, -1).map((s, i) => {
                      const nxt = passStations[i + 1];
                      const arrowSuffix: Record<string, string> = { Direktpass: '-direkt', Steilpass: '-steil', Flanke: '-flanke', Klatschball: '-klatsch', Doppelpass: '-doppelpass', Torschuss: '-schuss' };
                      return (
                        <line
                          key={`ps-line-${s.id}`}
                          x1={s.x}
                          y1={s.y}
                          x2={nxt.x}
                          y2={nxt.y}
                          stroke={PASS_ACTION_COLORS[s.action] || '#22D3EE'}
                          strokeWidth="0.8"
                          strokeDasharray="3 1.5"
                          opacity="0.9"
                          markerEnd={`url(#arrow-pass${arrowSuffix[s.action] || ''})`}
                        />
                      );
                    })}
                  </svg>
                )}
                {!(seqRunning && seqPhase === 'lauf') && passStations.map((s, i) => (
                  <div
                    key={`ps-${s.id}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (passMode) removePassStation(s.id);
                    }}
                    className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer group"
                    style={{ left: `${s.x}%`, top: `${s.y}%` }}
                    title={passMode ? `${s.action} entfernen (klick)` : s.action}
                  >
                    <div
                      className="w-6 h-6 rounded-full border-2 border-slate-950 shadow-lg flex items-center justify-center text-[8px] font-black text-slate-950 group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: PASS_ACTION_COLORS[s.action] || '#22D3EE' }}
                    >
                      {i + 1}
                    </div>
                    <span className="text-[7px] font-bold text-slate-200 bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">{s.action}</span>
                  </div>
                ))}
                {passBallPos && (
                  <div
                    className="absolute z-40 pointer-events-none -translate-x-1/2 -translate-y-1/2"
                    style={{ left: `${passBallPos.x}%`, top: `${passBallPos.y}%` }}
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 via-white to-yellow-400 border-2 border-yellow-600 shadow-lg shadow-yellow-500/50" />
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: SELECTED PLAYER DETAILED STATS & MATCHPLAN NOTES */}
          <div className="lg:col-span-4 space-y-4">

            {/* LIVE MATCHPLAN INSTRUCTION CARD BASED ON PHASES */}
            <div className="bg-slate-900 border-2 border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-black text-xs uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Live Matchplan Instruktion ({activePhase === 'offensiv' ? 'Offensiv' : activePhase === 'defensiv' ? 'Defensiv' : 'Umschalten'})
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-snug">
                {activePhase === 'offensiv' && (
                  <>
                    Aufbauhöhe: <strong className="text-emerald-400">{tacticalPhaseConfig.offensiv.aufbauhoehe}</strong> | Überzahl: <strong className="text-emerald-400">{tacticalPhaseConfig.offensiv.ueberzahlzonen}</strong> | Progression: <strong className="text-emerald-400">{tacticalPhaseConfig.offensiv.progression}</strong> | Halbraum: <strong className="text-emerald-400">{tacticalPhaseConfig.offensiv.halbraumnutzung}</strong> | Fokus: <strong className="text-emerald-400">{tacticalPhaseConfig.offensiv.offensivfokus}</strong>.
                  </>
                )}
                {activePhase === 'defensiv' && (
                  <>
                    Pressinghöhe: <strong className="text-rose-400">{tacticalPhaseConfig.defensiv.pressinghoehe}</strong> | Lenkung: <strong className="text-rose-400">{tacticalPhaseConfig.defensiv.pressinglenkung}</strong> | Kompaktheit: <strong className="text-rose-400">{tacticalPhaseConfig.defensiv.kompaktheit}</strong> | Mannorientierung: <strong className="text-rose-400">{tacticalPhaseConfig.defensiv.mannorientierung}</strong>.
                  </>
                )}
                {activePhase === 'umschalten' && (
                  <>
                    Konter Zielzone: <strong className="text-amber-400">{tacticalPhaseConfig.umschaltenOffensiv.zielzone}</strong> ({tacticalPhaseConfig.umschaltenOffensiv.tempo}) | Gegenpressing: <strong className="text-purple-400">{tacticalPhaseConfig.umschaltenDefensiv.gegenpressingintensitaet}</strong> ({tacticalPhaseConfig.umschaltenDefensiv.absicherung}).
                  </>
                )}
              </p>
            </div>

            {/* KI TAKTISCHE ANALYSE BUTTON */}
            <button
              onClick={handleGenerateTacticalAnalysis}
              disabled={tacticalAnalysisLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer transition-all shadow-lg"
            >
              {tacticalAnalysisLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  KI analysiert Taktik...
                </>
              ) : (
                <>
                  <BrainCircuit size={16} />
                  {activeClub.name} — Taktische KI-Analyse generieren
                </>
              )}
            </button>

            {/* KI TAKTISCHE ANALYSE ERGEBNIS */}
            {showTacticalAnalysis && tacticalAnalysis.length > 0 && (
              <div className="bg-slate-900 border-2 border-purple-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-black text-xs uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <BrainCircuit size={14} className="text-purple-400" />
                    Taktische KI-Analyse — {activeClub.name}
                  </span>
                  <button onClick={() => setShowTacticalAnalysis(false)} className="p-1 rounded hover:bg-slate-800 cursor-pointer">
                    <X size={14} className="text-slate-500" />
                  </button>
                </div>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {tacticalAnalysis.map((item, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                      <h4 className="font-black text-[11px] uppercase tracking-wider text-purple-400 mb-1">{idx + 1}. {item.title}</h4>
                      <p className="text-[11px] text-slate-300 leading-relaxed">{item.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SELECTED PLAYER PROFILE CARD */}
            {selectedNode && (
              <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg">
                      {selectedNode.number}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-white uppercase">{selectedNode.name}</h3>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{selectedNode.position} • {selectedNode.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 z-10">
                    <span className="bg-slate-950 text-slate-400 border border-slate-800 text-[9px] font-mono font-bold px-2 py-1 rounded-lg">
                      ID #{selectedNode.id}
                    </span>
                    <button
                      onClick={() => setSelectedNodeId(null)}
                      className="p-1 rounded-lg bg-slate-950 hover:bg-rose-600 text-slate-400 hover:text-white border border-slate-800 transition-all cursor-pointer"
                      title="Profilkarte schließen"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* PERFORMANCE METRICS GRID */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Top Speed</span>
                    <div className="font-black text-emerald-400 font-mono text-sm mt-0.5 flex items-center gap-1">
                      <Activity size={12} /> {selectedNode.speedKmh} km/h
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Laufdistanz</span>
                    <div className="font-black text-sky-400 font-mono text-sm mt-0.5 flex items-center gap-1">
                      <TrendingUp size={12} /> {selectedNode.distanceKm} km
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Zweikampfquote</span>
                    <div className="font-black text-amber-400 font-mono text-sm mt-0.5 flex items-center gap-1">
                      <Shield size={12} /> {selectedNode.duelSuccessPercent}%
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[9px] font-bold text-slate-500 uppercase block">Passquote</span>
                    <div className="font-black text-purple-400 font-mono text-sm mt-0.5 flex items-center gap-1">
                      <Target size={12} /> {selectedNode.passAccuracyPercent}%
                    </div>
                  </div>
                </div>

                {/* LEVEL 3 POSITION EVALUATION REQUIREMENT FROM AGENTS.MD */}
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 text-[10px] text-emerald-200 space-y-1">
                  <span className="font-black uppercase text-emerald-400 block tracking-wider">Level 3 Position-Analyse:</span>
                  <p className="leading-snug">
                    Für die Position {selectedNode.position} ist diese Laufbewegung typisch und taktisch essenziell für das {activeClub.name} Gegenpressing.
                  </p>
                </div>

                {/* VEO VIDEO NAVIGATION BUTTON */}
                {onNavigateToVideo && (
                  <button
                    onClick={() => onNavigateToVideo()}
                    className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500 text-slate-200 font-bold text-xs uppercase py-2 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Video size={14} className="text-emerald-400" />
                    <span>VEO Clips zu {selectedNode.name} Zeigen</span>
                  </button>
                )}
              </div>
            )}

            {/* CUSTOM TRAINER MATCHPLAN NOTES */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-black text-xs uppercase text-white tracking-wider flex items-center gap-2">
                  <Edit3 size={14} className="text-amber-400" /> Taktische Trainer-Anweisungen
                </span>
                <button
                  onClick={() => notify('Matchplan Notizen gespeichert.')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  <Save size={12} /> Speichern
                </button>
              </div>

              <textarea
                value={customTrainerNotes}
                onChange={(e) => setCustomTrainerNotes(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none"
                placeholder="Taktische Notizen eingeben..."
              />
            </div>

          </div>
        </div>
      )}

      {/* SUB-TAB 2: BESTE AUFSTELLUNG & 4-SYSTEME VERGLEICH */}
      {activeTabSub === 'comparison' && (
        <div className="space-y-6">
          
          {/* BESTE AUFSTELLUNG BOX */}
          <div className="bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-500/30 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-slate-950 font-black flex items-center justify-center shadow-lg text-xl">
                  🏆
                </div>
                <div>
                  <h2 className="font-black text-xl text-white uppercase tracking-wider flex items-center gap-2">
                    BESTE AUFSTELLUNG {activeClub.shortName || 'FC AUGGEN'} (4-2-3-1 OPTIMAL XI)
                  </h2>
                  <p className="text-xs text-amber-300 font-semibold mt-0.5">
                    Berechnet aus Kader-Metriken, Formwerten & Zweikampf-Analysen
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedFormation('4-2-3-1');
                  setActiveTabSub('board');
                  notify('Beste Aufstellung (4-2-3-1) geladen!');
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 self-start md:self-auto"
              >
                <CheckCircle2 size={16} /> Beste Aufstellung Laden & Ansehen
              </button>
            </div>

            {/* OPTIMAL XI SQUAD GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 pt-2">
            {liveFormations['4-2-3-1'].nodes.map((n) => (
                <div key={n.id} className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-2 flex flex-col items-center text-center shadow">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center mb-1">
                    {n.number}
                  </span>
                  <span className="font-black text-xs text-white truncate w-full">{n.name}</span>
                  <span className="text-[9px] font-bold text-amber-400 uppercase">{n.position}</span>
                  <span className="text-[8px] text-slate-400 font-mono mt-0.5">{n.passAccuracyPercent}% Pass</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4-SYSTEME VERGLEICH GRID */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-black text-lg uppercase tracking-wider text-white flex items-center gap-2">
                  <Grid className="text-amber-400" size={20} />
                  4-SYSTEME TAKTIK-VERGLEICHSMATRIX
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Synchrones Umschalten aller Systeme zwischen Ballbesitz (Mit Ball) und Defensive (Gegen Ball)
                </p>
              </div>

              {/* GLOBAL PHASE SWITCHER FOR ALL 4 SYSTEMS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner w-full md:w-auto">
                <button
                  onClick={() => setActivePhase('offensiv')}
                  className={`w-full py-2 px-3 min-h-[38px] text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${
                    activePhase === 'offensiv' 
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400 font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Zap size={14} className="text-emerald-300 shrink-0" />
                  <span className="truncate">Mit Ball (Offensiv)</span>
                </button>
                <button
                  onClick={() => setActivePhase('defensiv')}
                  className={`w-full py-2 px-3 min-h-[38px] text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${
                    activePhase === 'defensiv' 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400 font-black' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Shield size={14} className="text-rose-300 shrink-0" />
                  <span className="truncate">Gegen Ball (Defensiv)</span>
                </button>
                <button
                  onClick={() => setActivePhase('umschalten')}
                  className={`w-full py-2 px-3 min-h-[38px] text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center text-center gap-1.5 leading-tight cursor-pointer ${
                    activePhase === 'umschalten' 
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-300' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <TrendingUp size={14} className="shrink-0" />
                  <span className="truncate">Umschalten</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {['4-2-3-1', '4-4-2', '4-1-4-1', '3-4-3'].map((formKey) => {
                const data = liveFormations[formKey];
                const isSelected = selectedFormation === formKey;
                return (
                  <div 
                    key={formKey} 
                    className={`bg-slate-950 border-2 rounded-2xl p-5 space-y-4 transition-all ${
                      isSelected ? 'border-amber-400 shadow-xl shadow-amber-500/10' : 'border-slate-800 hover:border-emerald-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-black text-base text-emerald-400">{formKey}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                          activePhase === 'offensiv' 
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40' 
                            : activePhase === 'defensiv'
                            ? 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                            : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                        }`}>
                          {activePhase === 'offensiv' ? 'Mit Ball' : activePhase === 'defensiv' ? 'Gegen Ball' : 'Umschalten'}
                        </span>
                        <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-500/30">
                          {data.winRate}% Sieg
                        </span>
                      </div>
                    </div>

                    {/* MINI PITCH CANVAS WITH PHASE-AWARE PLAYER NODES */}
                    <div className="relative w-full h-48 bg-emerald-950/40 rounded-xl border border-emerald-500/30 overflow-hidden shadow-inner">
                      {/* Pitch Marking Lines */}
                      <div className="absolute inset-2 border border-emerald-400/20 pointer-events-none rounded-sm">
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-emerald-400/20 -translate-x-1/2" />
                        <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-emerald-400/20 -translate-x-1/2 -translate-y-1/2" />
                      </div>

                      {/* Render Run Vectors or Node Markers for active phase */}
                      {data.nodes.map(n => {
                        const targetX = activePhase === 'offensiv' ? n.offensivX : activePhase === 'defensiv' ? n.defensivX : n.umschaltX;
                        const targetY = activePhase === 'offensiv' ? n.offensivY : activePhase === 'defensiv' ? n.defensivY : n.umschaltY;
                        
                        return (
                          <React.Fragment key={n.id}>
                            {/* Run path line from base to phase position */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                              <line 
                                x1={`${n.xPercent}%`} 
                                y1={`${n.yPercent}%`} 
                                x2={`${targetX}%`} 
                                y2={`${targetY}%`} 
                                stroke={activePhase === 'offensiv' ? '#10B981' : activePhase === 'defensiv' ? '#EF4444' : '#F59E0B'} 
                                strokeWidth="1.5" 
                                strokeDasharray="2 2" 
                                opacity="0.6"
                              />
                            </svg>
                            {/* Player Node */}
                            <div
                              style={{ left: `${targetX}%`, top: `${targetY}%` }}
                              title={`${n.name} (${n.position}) - ${activePhase === 'offensiv' ? 'Mit Ball' : activePhase === 'defensiv' ? 'Gegen Ball' : 'Umschalten'}`}
                              className={`absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white text-[9px] font-black flex items-center justify-center shadow-md transition-all duration-500 ${
                                activePhase === 'offensiv' 
                                  ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50' 
                                  : activePhase === 'defensiv'
                                  ? 'bg-rose-500 text-white ring-2 ring-rose-400/50'
                                  : 'bg-amber-400 text-slate-950 ring-2 ring-amber-300/50'
                              }`}
                            >
                              {n.number}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      {data.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-slate-500 block">Ø xG Tore:</span>
                        <span className="text-emerald-400 font-black text-xs">{data.xGAvg} / Spiel</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Pressing-Quote:</span>
                        <span className="text-purple-400 font-black text-xs">{data.pressingSuccess}%</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <span className="font-black text-emerald-400 block uppercase text-[10px] tracking-wider">Vorteile:</span>
                      <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                        {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedFormation(formKey);
                        setActiveTabSub('board');
                        notify(`System ${formKey} in Phase "${activePhase === 'offensiv' ? 'Mit dem Ball' : activePhase === 'defensiv' ? 'Gegen den Ball' : 'Umschalten'}" geladen.`);
                      }}
                      className="w-full bg-slate-900 hover:bg-emerald-600 hover:text-white text-slate-200 font-bold text-xs uppercase py-2 rounded-xl border border-slate-800 transition-all text-center flex items-center justify-center gap-1.5"
                    >
                      <span>System in Phase laden</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: STANDARDS AUS SPIELBERICHT */}
      {activeTabSub === 'standards' && (
        <div className={`space-y-6 ${standardsFullscreen ? 'fixed inset-0 z-[300] bg-slate-950 overflow-y-auto p-6' : ''}`}>
          {/* HEADER */}
          <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-2 border-purple-500/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-violet-600 text-slate-950 font-black flex items-center justify-center shadow-lg text-2xl">🎯</div>
                <div>
                  <h2 className="font-black text-xl text-white uppercase tracking-wider">Standards & Standardsituationen</h2>
                  <p className="text-xs text-purple-300 font-semibold mt-0.5">Halbfeld-Ansicht • Zonen markieren • Laufwege zeichnen</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {standardsFullscreen && (
                  <span className="text-[8px] font-black text-purple-400 uppercase mr-1">ESC zum Schließen</span>
                )}
                <button
                  onClick={() => setStandardsFullscreen(!standardsFullscreen)}
                  className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-colors"
                >
                  {standardsFullscreen ? <><Minimize2 size={12} /> Normal</> : <><Maximize2 size={12} /> Vollbild</>}
                </button>
                {standardsFullscreen && (
                  <button
                    onClick={() => setStandardsFullscreen(false)}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase px-3 py-2 rounded-xl transition-colors"
                  >
                    <X size={12} /> Schließen
                  </button>
                )}
                <button
                  onClick={() => { setStandardMode('ecke_links'); resetStandardField(); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardMode === 'ecke_links' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'}`}
                >⚽ Ecke Links</button>
                <button
                  onClick={() => { setStandardMode('ecke_rechts'); resetStandardField(); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardMode === 'ecke_rechts' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/50'}`}
                >⚽ Ecke Rechts</button>
                <button
                  onClick={() => { setStandardMode('freistoss_zentral'); resetStandardField(); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardMode === 'freistoss_zentral' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50'}`}
                >🎯 Freistoß Zentral</button>
                <button
                  onClick={() => { setStandardMode('freistoss_seitlich'); resetStandardField(); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardMode === 'freistoss_seitlich' ? 'bg-emerald-500 text-slate-950 border-emerald-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50'}`}
                >🎯 Freistoß Seitlich</button>
                <button
                  onClick={() => { setStandardMode('elfmeter'); resetStandardField(); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardMode === 'elfmeter' ? 'bg-red-500 text-white border-red-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-red-500/50'}`}
                >⚡ Elfmeter</button>
                <div className="w-px bg-slate-700" />
                <button
                  onClick={() => setStandardDrawMode(standardDrawMode === 'zone' ? 'player' : 'zone')}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardDrawMode === 'zone' ? 'bg-violet-500 text-white border-violet-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-violet-500/50'}`}
                >{standardDrawMode === 'zone' ? '🔲 Zonen-Modus' : '🔵 Spieler-Modus'}</button>
                <button
                  onClick={() => { setStandardDrawMode('run'); }}
                  className={`px-3 py-2 text-[10px] font-black uppercase rounded-xl border transition-all ${standardDrawMode === 'run' ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/50'}`}
                >🏃 Laufweg zeichnen</button>
                <button onClick={resetStandardField} className="px-3 py-2 text-[10px] font-black uppercase rounded-xl border bg-slate-800 text-red-400 border-slate-700 hover:border-red-500/50 transition-all">🗑 Reset</button>
              </div>
            </div>
          </div>

          {/* HALBfeld — interaktiv */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Halbfeld SVG */}
            <div className="lg:col-span-2 bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-400 uppercase">Halbfeld — Angriffshälfte</span>
                <span className="text-[9px] text-slate-500">Klicke auf das Feld um Spieler/Zonen zu platzieren</span>
              </div>
              <div className="relative w-full" style={{ paddingBottom: '70%' }}>
                <svg
                  viewBox="0 0 500 350"
                  className="absolute inset-0 w-full h-full cursor-crosshair"
                  onClick={handleStandardFieldClick}
                  style={{ background: 'linear-gradient(180deg, #063826 0%, #041f15 100%)' }}
                >
                  {/* Halbfeld-Umrandung */}
                  <rect x="10" y="10" width="480" height="330" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.4" rx="4" />

                  {/* Mittellinie (unten =Anfang des Halbfelds) */}
                  <line x1="10" y1="340" x2="490" y2="340" stroke="#10B981" strokeWidth="1.5" opacity="0.35" />

                  {/* Strafraum groß */}
                  <rect x="120" y="10" width="260" height="100" fill="none" stroke="#10B981" strokeWidth="1.2" opacity="0.35" rx="2" />

                  {/* 5-Meter-Raum */}
                  <rect x="185" y="10" width="130" height="40" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.3" rx="2" />

                  {/* Elfmeterpunkt */}
                  <circle cx="250" cy="75" r="2.5" fill="#10B981" opacity="0.5" />

                  {/* Elfmeterbogen */}
                  <path d="M 200 110 A 50 50 0 0 1 300 110" fill="none" stroke="#10B981" strokeWidth="1" opacity="0.3" />

                  {/* Tor */}
                  <rect x="210" y="5" width="80" height="8" fill="none" stroke="#10B981" strokeWidth="1.5" opacity="0.5" rx="1" />

                  {/* Zonen-Linien (vertikal 1/3) */}
                  <line x1="170" y1="10" x2="170" y2="340" stroke="#10B981" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />
                  <line x1="330" y1="10" x2="330" y2="340" stroke="#10B981" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />

                  {/* Zonen-Linien (horizontal 1/3) */}
                  <line x1="10" y1="120" x2="490" y2="120" stroke="#10B981" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />
                  <line x1="10" y1="230" x2="490" y2="230" stroke="#10B981" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" />

                  {/* Eckflaggen */}
                  <circle cx="10" cy="10" r="4" fill="#FCD34D" opacity="0.7" />
                  <circle cx="490" cy="10" r="4" fill="#FCD34D" opacity="0.7" />

                  {/* Ballposition je nach Modus */}
                  {standardMode === 'ecke_links' && (
                    <g>
                      <circle cx="10" cy="10" r="8" fill="#F97316" opacity="0.8"><animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" /></circle>
                      <text x="22" y="22" fill="#F97316" fontSize="10" fontWeight="black">⚽ Ecke Links</text>
                    </g>
                  )}
                  {standardMode === 'ecke_rechts' && (
                    <g>
                      <circle cx="490" cy="10" r="8" fill="#F97316" opacity="0.8"><animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" /></circle>
                      <text x="440" y="22" fill="#F97316" fontSize="10" fontWeight="black">⚽ Ecke Rechts</text>
                    </g>
                  )}
                  {standardMode === 'freistoss_zentral' && (
                    <g>
                      <circle cx="250" cy="170" r="8" fill="#10B981" opacity="0.8"><animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" /></circle>
                      <text x="265" y="175" fill="#10B981" fontSize="10" fontWeight="black">⚽ Freistoß</text>
                    </g>
                  )}
                  {standardMode === 'freistoss_seitlich' && (
                    <g>
                      <circle cx="80" cy="150" r="8" fill="#10B981" opacity="0.8"><animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" /></circle>
                      <text x="95" y="155" fill="#10B981" fontSize="10" fontWeight="black">⚽ Freistoß</text>
                    </g>
                  )}
                  {standardMode === 'elfmeter' && (
                    <g>
                      <circle cx="250" cy="75" r="8" fill="#EF4444" opacity="0.8"><animate attributeName="r" values="8;12;8" dur="1.5s" repeatCount="indefinite" /></circle>
                      <text x="265" y="80" fill="#EF4444" fontSize="10" fontWeight="black">⚽ Elfmeter</text>
                    </g>
                  )}

                  {/* Zonen-Overlay (anklickbare Flächen) */}
                  {standardZones.map((zone, i) => (
                    <rect
                      key={`zone-${i}`}
                      x={zone.x} y={zone.y} width={zone.w} height={zone.h}
                      fill={zone.color} opacity="0.35" rx="4"
                      stroke={zone.color} strokeWidth="1" strokeOpacity="0.6"
                    />
                  ))}

                  {/* Laufwege (gezeichnete Pfeile) */}
                  {standardRunPaths.map((path, pi) => (
                    <g key={`runpath-${pi}`}>
                      <defs>
                        <marker id={`arrow-${pi}`} markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                          <polygon points="0 0, 8 3, 0 6" fill={path.color || '#06B6D4'} />
                        </marker>
                      </defs>
                      <line
                        x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}
                        stroke={path.color || '#06B6D4'} strokeWidth="2.5" strokeDasharray="6 3"
                        markerEnd={`url(#arrow-${pi})`} opacity="0.8"
                      />
                      <line
                        x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}
                        stroke={path.color || '#06B6D4'} strokeWidth="6" opacity="0.15"
                      />
                    </g>
                  ))}

                  {/* Platzhierte Spieler */}
                  {standardPlayers.map((player, pi) => (
                    <g key={`player-${pi}`}>
                      <circle
                        cx={player.x} cy={player.y} r="14"
                        fill={player.color || '#e94560'} opacity="0.9"
                        stroke="white" strokeWidth="2"
                      />
                      <text x={player.x} y={player.y + 4} textAnchor="middle" fill="white" fontSize="11" fontWeight="black">
                        {player.number || pi + 1}
                      </text>
                      {player.name && (
                        <text x={player.x} y={player.y + 26} textAnchor="middle" fill="#ccc" fontSize="8" fontWeight="bold">
                          {player.name}
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Legende */}
                  <g transform="translate(15, 310)">
                    <rect x="0" y="0" width="130" height="28" fill="#0a0f1a" opacity="0.85" rx="4" />
                    <circle cx="12" cy="14" r="5" fill="#e94560" /><text x="22" y="18" fill="#aaa" fontSize="8">Spieler</text>
                    <line x1="65" y1="14" x2="90" y2="14" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 2" /><text x="95" y="18" fill="#aaa" fontSize="8">Lauf</text>
                    <rect x="110" y="9" width="10" height="10" fill="#8B5CF6" opacity="0.4" rx="2" /><text x="123" y="18" fill="#aaa" fontSize="8">Zone</text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Side Panel */}
            <div className="space-y-4">
              {/* Aktueller Modus */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Aktiver Modus</div>
                <div className="text-sm font-black text-white">
                  {standardMode === 'ecke_links' ? '⚽ Ecke Links' : standardMode === 'ecke_rechts' ? '⚽ Ecke Rechts' : standardMode === 'freistoss_zentral' ? '🎯 Freistoß Zentral' : standardMode === 'freistoss_seitlich' ? '🎯 Freistoß Seitlich' : standardMode === 'elfmeter' ? '⚡ Elfmeter' : 'Frei'}
                </div>
                <div className="text-[9px] text-slate-500 mt-1">
                  {standardDrawMode === 'zone' ? 'Zonen-Modus: Klicke um Farbzone zu platzieren' : standardDrawMode === 'run' ? 'Laufweg-Modus: 2x klicken (Start → Ende)' : 'Spieler-Modus: Klick um Spieler zu platzieren'}
                </div>
              </div>

              {/* Platzierte Spieler */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Platzierte Spieler ({standardPlayers.length})</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {standardPlayers.length === 0 && <p className="text-[9px] text-slate-600">Noch keine Spieler platziert</p>}
                  {standardPlayers.map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-[8px]" style={{ backgroundColor: p.color }}>{p.number || i + 1}</span>
                      <span className="text-white font-bold">{p.name || `Spieler ${i + 1}`}</span>
                      <button onClick={() => setStandardPlayers(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-500 hover:text-red-400">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zonen */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Markierte Zonen ({standardZones.length})</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {standardZones.length === 0 && <p className="text-[9px] text-slate-600">Noch keine Zonen markiert</p>}
                  {standardZones.map((z, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span className="w-4 h-4 rounded" style={{ backgroundColor: z.color, opacity: 0.6 }} />
                      <span className="text-white font-bold">Zone {i + 1}</span>
                      <button onClick={() => setStandardZones(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-500 hover:text-red-400">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Laufwege */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Laufwege ({standardRunPaths.length})</div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {standardRunPaths.length === 0 && <p className="text-[9px] text-slate-600">Noch keine Laufwege gezeichnet</p>}
                  {standardRunPaths.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[9px]">
                      <span className="w-4 h-0.5 rounded" style={{ backgroundColor: r.color }} />
                      <span className="text-white font-bold">Lauf {i + 1}</span>
                      <button onClick={() => setStandardRunPaths(prev => prev.filter((_, idx) => idx !== i))} className="ml-auto text-red-500 hover:text-red-400">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notizen */}
              <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">Notizen</div>
                <textarea
                  value={standardDescription}
                  onChange={(e) => setStandardDescription(e.target.value)}
                  placeholder="Zugbeschreibung, Zielspieler, Ablauf..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] text-white placeholder:text-slate-600 resize-none h-16 focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Letzte 2 Spiele — automatisch */}
              {lastTwoMatchStandards.length > 0 && (
                <div className="bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-2 border-purple-500/30 rounded-2xl p-4">
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-2">📄 Standards letzte 2 Spiele</div>
                  <div className="space-y-3">
                    {lastTwoMatchStandards.map((ms: any, i: number) => (
                      <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black text-white">{activeClub.name} vs. {ms.opponent}</span>
                            <span className="text-[8px] text-slate-500 ml-2">{ms.date}</span>
                          </div>
                          <button
                            onClick={() => {
                              const newStandard: StandardVariant = {
                                id: `std_from_match_${Date.now()}_${i}`,
                                name: `Standard vs ${ms.opponent} (${ms.date})`,
                                type: ms.types.includes('Ecke') ? 'ecke_offensiv' : ms.types.includes('Freistoß') ? 'freistoss_halbfeld' : 'ecke_offensiv',
                                executor: ms.playerNames[0] || '',
                                keyPlayers: ms.playerNames.slice(0, 4).join(', '),
                                description: ms.fullText.substring(0, 200),
                                successRate: 70,
                                aiTacticNotes: `Übernommen aus Spielanalyse vs ${ms.opponent}`,
                                positions: [],
                                createdAt: new Date().toISOString()
                              };
                              setStandardsList(prev => [newStandard, ...prev]);
                              setNotification('Standard-Variante gespeichert!');
                              setTimeout(() => setNotification(null), 3000);
                            }}
                            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-colors"
                          >
                            <Save size={10} /> Als Variante speichern
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ms.types.map((t: string, ti: number) => (
                            <span key={ti} className="bg-purple-500/20 text-purple-300 text-[7px] font-bold px-1.5 py-0.5 rounded">{t}</span>
                          ))}
                          {ms.playerNames.slice(0, 5).map((n: string, ni: number) => (
                            <span key={ni} className="bg-amber-500/20 text-amber-300 text-[7px] font-bold px-1.5 py-0.5 rounded">{n}</span>
                          ))}
                        </div>
                        <p className="text-[9px] text-slate-300 leading-relaxed">{ms.fullText}</p>
                        {/* Bilder vom Standard */}
                        {ms.images && ms.images.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pt-1">
                            {ms.images.map((img: string, imgIdx: number) => (
                              <div key={imgIdx} className="shrink-0">
                                <img
                                  src={img}
                                  alt={`Standard vs ${ms.opponent} ${imgIdx + 1}`}
                                  className="h-28 rounded-lg border border-slate-700 object-cover cursor-pointer hover:border-purple-500 transition-colors"
                                  onClick={() => window.open(img, '_blank')}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Spieler-Auswahl Popup (bei Klick auf Halbfeld) */}
      {standardPlayerPicker && (
        <div
          className="fixed z-[9999] bg-slate-900 border-2 border-purple-500 rounded-xl shadow-2xl p-2 max-h-64 overflow-y-auto"
          style={{ left: standardPlayerPicker.x + 10, top: standardPlayerPicker.y - 100 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[9px] font-black text-purple-400 uppercase mb-1 px-1">Spieler wählen</div>
          {(() => {
            const squad = (players || []).filter((p: any) => p.category === 'player');
            return squad.map((p: any) => (
              <button
                key={p.id}
                onClick={() => handlePickPlayer(p)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-500/20 transition-colors text-left"
              >
                <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[8px] font-black flex items-center justify-center">{p.number || '?'}</span>
                <span className="text-[10px] text-white font-bold">{(p.firstName || '').trim()} {(p.lastName || '').trim()}</span>
                <span className="text-[8px] text-slate-500 ml-auto">{p.position}</span>
              </button>
            ));
          })()}
          <button
            onClick={() => setStandardPlayerPicker(null)}
            className="w-full mt-1 text-[8px] text-red-400 hover:text-red-300 font-bold py-1"
          >Abbrechen</button>
        </div>
      )}

      {/* Hintergrund-Klick schließt Popup */}
      {standardPlayerPicker && (
        <div className="fixed inset-0 z-[9998]" onClick={() => setStandardPlayerPicker(null)} />
      )}

      {/* SUB-TAB 6b: 1:1 SYSTEME & STANDARDS (geteilt mit Präsentation) */}
      {activeTabSub === 'scenarios' && (
        <div className="bg-slate-900 border-2 border-violet-500/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-violet-300 flex items-center gap-2">
                <Grid size={18} /> 1:1 Spielsysteme & Standards
              </h3>
              <button
                onClick={() => setScenarioFullscreen(true)}
                className="bg-violet-400 hover:bg-violet-300 text-slate-950 font-black text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="Aktives 1:1-Szenario im Vollbild anzeigen"
              >
                <Maximize2 size={13} /> Vollbild
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Zeichnungen exakt nach Trainer-Vorgabe. Wird im gleichen Zustand auch in der 📺 Spieltagspräsentation übernommen.
            </p>
          </div>

          {/* Kategorie-Umschalter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setScenarioCatFilter('spielsystem')}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                scenarioCatFilter === 'spielsystem'
                  ? 'bg-violet-400 text-slate-950 border-violet-300'
                  : 'bg-slate-950 text-violet-300 border-violet-500/40 hover:border-violet-400'
              }`}
            >
              ⚙️ Spielsysteme
            </button>
            <button
              onClick={() => setScenarioCatFilter('standard')}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                scenarioCatFilter === 'standard'
                  ? 'bg-violet-400 text-slate-950 border-violet-300'
                  : 'bg-slate-950 text-violet-300 border-violet-500/40 hover:border-violet-400'
              }`}
            >
              📐 Standards (1:1)
            </button>
          </div>

          {/* Variantenliste (Liste aller Varianten beim Klick) */}
          <div className="flex flex-wrap items-start gap-4">
            {(() => {
              const list = scenarioCatFilter === 'spielsystem' ? SPIELSYSTEME : FOLIEN_DIAGRAMME;
              const groups = Array.from(new Set(list.map((s) => s.group)));
              return groups.map((group) => (
                <div key={group} className="bg-slate-950 border border-slate-800 rounded-xl p-3 min-w-[240px]">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-1.5 mb-2">
                    {group}
                  </div>
                  <div className="space-y-1">
                    {list
                      .filter((s) => s.group === group)
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setActiveScenarioId(s.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                            activeScenarioId === s.id
                              ? 'bg-violet-400/20 text-violet-200 border-violet-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                          }`}
                        >
                          {s.sub || s.name}
                        </button>
                      ))}
                  </div>
                </div>
              ));
            })()}
          </div>

          {/* 1:1-Zeichnung */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="rounded-2xl overflow-hidden border-2 border-violet-500/40 aspect-square">
              <TacticScenarioView scenario={activeScenario} />
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-violet-300">
                {activeScenario.name} <span className="text-slate-400">· {activeScenario.sub}</span>
              </div>
              {activeScenario.note && (
                <p className="text-[12px] text-slate-300 leading-relaxed">{activeScenario.note}</p>
              )}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div className="text-center">
                  <div className="w-4 h-4 rounded-full bg-[#3B82F6] inline-block border border-white" />
                  <div className="text-[9px] text-slate-400 mt-1">FC Auggen</div>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 rounded-full bg-[#EF4444] inline-block border border-white" />
                  <div className="text-[9px] text-slate-400 mt-1">Gegner</div>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 rounded-full bg-[#22C55E] inline-block border border-white" />
                  <div className="text-[9px] text-slate-400 mt-1">Torwart</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1:1 VOLLBILD-OVERLAY (gilt für das 1:1-Panel UND die TV-Präsentation/Standards) */}
      {scenarioFullscreen && (
        <div className="fixed inset-0 z-[400] bg-slate-950 p-4 sm:p-6 overflow-auto">
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
              {activeScenario.name} · {activeScenario.sub}
            </span>
            <button
              onClick={() => setScenarioFullscreen(false)}
              className="bg-rose-500 hover:bg-rose-400 text-white font-black text-[11px] uppercase px-3 py-1.5 rounded-lg shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
              title="Vollbild schließen (ESC)"
            >
              <X size={14} /> Schließen
            </button>
          </div>
          <div className="w-full max-w-4xl mx-auto aspect-square mt-16">
            <TacticScenarioView scenario={activeScenario} className="w-full h-full rounded-xl shadow-2xl" highlightArrows />
          </div>
        </div>
      )}

      {/* SUB-TAB 7: SPIELTAGSPRÄSENTATION & TAKTIKTAFEL-AUSGABE (FC AUGGEN) */}
      {activeTabSub === 'presentation' && (
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-2xl p-6 space-y-6 shadow-2xl">
          {/* HEADER & MATCH SELECTOR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black flex items-center justify-center shadow-lg text-2xl">
                📺
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md tracking-wider">
                    {activeClub.shortName || 'FCA'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Echtzeit App-Daten Sync
                  </span>
                </div>
                <h3 className="font-black text-lg uppercase tracking-wider text-white mt-0.5">
                  SPIELTAGSPRÄSENTATION & TAKTIKTAFEL
                </h3>
              </div>
            </div>

            {/* ACTION CONTROLS */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedPresentationMatchId}
                onChange={(e) => setSelectedPresentationMatchId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white font-bold text-xs p-2.5 rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {allCompetitiveMatches.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {nextUpcomingMatch?.id === m.id ? '🟢 [NÄCHSTES SPIEL] ' : ''}{activeClub.name} vs. {m.opponent} ({m.date ? `${m.date} - ` : ''}{m.homeAway || (m.isHome ? 'Heim' : 'Auswärts')} - {m.competition})
                  </option>
                ))}
              </select>

              <button
                onClick={() => { setPresentationSlideIndex(0); setIsTvMode(true); }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Tv size={15} /> TV-Präsentation Starten
              </button>

              <button
                onClick={() => { setPitchEditMode(!pitchEditMode); setSwapFirstPlayer(null); }}
                className={`${pitchEditMode ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold text-xs uppercase px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5`}
                title={pitchEditMode ? 'Bearbeitungsmodus beenden' : 'Spieler auf dem Spielfeld verschieben/tauschen'}
              >
                <Move size={15} /> {pitchEditMode ? 'Fertig' : 'Bearbeiten'}
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setMarkerMode(!markerMode); setPitchEditMode(false); }}
                  className={`${markerMode ? 'bg-yellow-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'} font-bold text-xs uppercase px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5`}
                  title={markerMode ? 'Markierungsmodus beenden' : 'Markierungen auf dem Spielfeld platzieren'}
                >
                  <Circle size={15} /> Markierung
                </button>
                {markerMode && (
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5">
                    {MARKER_COLORS.map((mc) => (
                      <button
                        key={mc.color}
                        onClick={() => setMarkerColor(mc.color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${markerColor === mc.color ? 'border-white scale-125' : 'border-slate-600 hover:scale-110'}`}
                        style={{ backgroundColor: mc.color }}
                        title={mc.name}
                      />
                    ))}
                  </div>
                )}
                {markers.length > 0 && (
                  <button
                    onClick={() => { setMarkers([]); notify('Alle Markierungen entfernt'); }}
                    className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 font-bold text-[10px] uppercase px-2 py-1.5 rounded-lg border border-rose-500/30 transition-all"
                  >
                    Alle löschen ({markers.length})
                  </button>
                )}
              </div>

              <button
                onClick={syncLineupFromBoard}
                className="bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                title="Aktuelle Aufstellung vom 3D-Board übernehmen (inkl. Bilder)"
              >
                <RefreshCw size={15} /> Vom Board
              </button>

              <button
                onClick={loadStartelfFromLineupImages}
                disabled={analyzingLineupFromImage}
                className="bg-gradient-to-br from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 text-white font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
                title="Startelf aus dem AUFSTELLUNG-Bild (von der letzten Aufstellung) des letzten Spielberichts per KI-Erkennung übernehmen – Namen per Trikotnummer dem Kader zuordnen, falls Name unlesbar"
              >
                <ScanSearch size={15} /> {analyzingLineupFromImage ? 'Erkenne…' : 'Ans Bild-Analyse'}
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase px-3 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
                title="Drucken / PDF"
              >
                <Printer size={15} /> Export
              </button>

              <button
                onClick={() => startChampions()}
                className="bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
                title="Startelf-Aufstellung: Spieler-Karten von oben animiert einfliegen lassen"
              >
                <Crown size={15} /> Startelf-Aufstellung
              </button>

              <button
                onClick={() => setActiveTabSub('board')}
                className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Compass size={15} /> Auf 3D-Taktiktafel Zeigen
              </button>
            </div>
          </div>

          {/* SLIDE STEPPER / TABS BAR (9 SLIDES) */}
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
            {[
              { id: 0, label: '1. Titel', icon: '⚽' },
              { id: 1, label: '2. Aufstellung', icon: '👕' },
              { id: 2, label: '3. Defensiv', icon: '🛡️' },
              { id: 3, label: '4. Mit Ball', icon: '⚡' },
              { id: 4, label: '5. Rotation', icon: '🔁' },
              { id: 5, label: '6. Dreiecks-Rot.', icon: '🔺' },
              { id: 6, label: '7. Gegen Ball', icon: '🗑️' },
              { id: 7, label: '8. 1:1 Taktik', icon: '📐' },
              { id: 8, label: '9. Gegner Top 3', icon: '⭐' },
            ].map((slide) => (
              <button
                key={slide.id}
                onClick={() => setPresentationSlideIndex(slide.id)}
                className={`p-2 rounded-xl text-center border transition-all flex flex-col items-center gap-1 ${
                  presentationSlideIndex === slide.id
                    ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black shadow-lg scale-105'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-base">{slide.icon}</span>
                <span className="text-[10px] uppercase font-bold tracking-tight truncate w-full">{slide.label}</span>
              </button>
            ))}
          </div>

          {/* SLIDE CONTENT AREA */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[520px] shadow-2xl relative overflow-hidden flex flex-col justify-between">
            {pitchEditMode && (
              <div className="bg-amber-400/20 border border-amber-400/40 rounded-xl px-4 py-2 flex items-center gap-3 mb-2">
                <Move size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  Bearbeitungsmodus: Spieler ziehen oder zum Tauschen zwei Spieler nacheinander anklicken.
                  {swapFirstPlayer && ` Tausche: ${swapFirstPlayer} → klicke Ziel-Spieler`}
                </span>
              </div>
            )}
            {markerMode && (
              <div className="bg-yellow-400/20 border border-yellow-400/40 rounded-xl px-4 py-2 flex items-center gap-3 mb-2">
                <Circle size={14} className="text-yellow-400" />
                <span className="text-xs font-bold text-yellow-300">
                  Markierungsmodus: Klicke auf das Spielfeld um eine Markierung zu setzen. Rechtsklick zum Löschen, Doppelklick für Beschreibung.
                </span>
              </div>
            )}
            {/* HELPER PITCH VISUALIZER COMPONENT FOR SLIDES */}
            {(() => {
              return (
                <div className="space-y-6">
                  {/* SLIDE 0: TITEL — Side-by-Side */}
                  {presentationSlideIndex === 0 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="h-full rounded-2xl border border-emerald-500/40 overflow-hidden relative shadow-2xl">
                          <img src="/presentation/titel-design.png" alt="Spieltagspräsentation" className="absolute inset-0 w-full h-full object-cover opacity-40" />
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-slate-950/90 to-slate-950/95" />
                          <div className="relative z-10 p-8 flex flex-col items-center justify-center text-center min-h-[480px] gap-4">
                            <div className="flex items-center justify-center">{renderClubLogo(72, 'border-4 border-emerald-400/60', true)}</div>
                            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                              {presentationTitleOverride || `${activeClub.shortName || 'FC AUGGEN'} vs. ${selectedMatchObj.opponent.toUpperCase()}`}
                            </h1>
                            {/* Titel frei bearbeitbar */}
                            {slideEditingActive && (
                              <input
                                value={presentationTitleOverride}
                                onChange={(e) => setPresentationTitle(e.target.value)}
                                placeholder={`${activeClub.shortName || 'FC AUGGEN'} vs. ${selectedMatchObj.opponent.toUpperCase()}`}
                                className="w-full max-w-md bg-slate-950/90 border border-emerald-500/50 text-white font-black text-lg uppercase px-4 py-2 rounded-xl focus:outline-none focus:border-emerald-400 text-center"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">⚽</span> Match-Info
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[12px] text-slate-300"><span className="text-slate-500 font-bold w-24 shrink-0">Wettbewerb:</span> {selectedMatchObj.competition}</div>
                            <div className="flex items-center gap-2 text-[12px] text-slate-300"><span className="text-slate-500 font-bold w-24 shrink-0">Datum:</span> {selectedMatchObj.date ? new Date(selectedMatchObj.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '–'}</div>
                            <div className="flex items-center gap-2 text-[12px] text-slate-300"><span className="text-slate-500 font-bold w-24 shrink-0">Anpfiff:</span> {selectedMatchObj.time || '15:30'} Uhr</div>
                            <div className="flex items-center gap-2 text-[12px] text-slate-300"><span className="text-slate-500 font-bold w-24 shrink-0">Ort:</span> {selectedMatchObj.location}</div>
                            <div className="flex items-center gap-2 text-[12px] text-slate-300"><span className="text-slate-500 font-bold w-24 shrink-0">Heim/Away:</span> <span className={selectedMatchObj.isHome ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{selectedMatchObj.isHome ? 'Heimspiel' : 'Auswärtsspiel'}</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📋</span> Vorbereitung
                          </h4>
                          {slideEditingActive ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Heim-Strategie</label>
                                <textarea value={matchNotes.home} onChange={(e) => setMatchNotes({ ...matchNotes, home: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Gegner-Schwachstellen</label>
                                <textarea value={matchNotes.opponent} onChange={(e) => setMatchNotes({ ...matchNotes, opponent: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" />
                              </div>
                              <div>
                                <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Fokus</label>
                                <textarea value={matchNotes.focus} onChange={(e) => setMatchNotes({ ...matchNotes, focus: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Heim-Strategie:</span> {matchNotes.home}</p>
                              <p className="text-[11px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Gegner:</span> {matchNotes.opponent}</p>
                              <p className="text-[11px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Fokus:</span> {matchNotes.focus}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 1: AUFSTELLUNG — Side-by-Side */}
                  {presentationSlideIndex === 1 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                          <div>
                            <h3 className="font-black text-xl uppercase text-white tracking-wider flex items-center gap-2">
                              <span className="text-emerald-400">AUFSTELLUNG</span> — 4-3-3
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono">Spielsystem: 4-3-3 &bull; Startelf (XI)</p>
                          </div>
                          <button onClick={() => startChampions()} className="bg-gradient-to-br from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95" title="Startelf-Karten von oben animiert einfliegen lassen">
                            Startelf-Karten
                          </button>
                        </div>
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'sys-433')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['sys-433']?.zones}
                            draftPlayers={scenarioEdits['sys-433']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('sys-433', z, p)}
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-2 font-semibold">4-3-3 · Startelf · frei bearbeitbar (Zonen & Spieler ziehen)</p>
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">👕</span> Startelf
                          </h4>
                          <div className="space-y-1.5">
                            {presentationLineup.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                                <span className="w-6 h-6 rounded-full bg-emerald-400 text-slate-950 font-black text-[10px] flex items-center justify-center shrink-0">{p.number}</span>
                                <span className="text-[11px] text-white font-bold truncate flex-1">{p.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-mono shrink-0">{p.position}</span>
                                <button onClick={() => setLineupSwapTarget(idx)} className={`text-[10px] px-1.5 py-0.5 rounded border transition-all shrink-0 ${lineupSwapTarget === idx ? 'bg-amber-400 text-slate-950 border-amber-300 font-black' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`} title="Diesen Spieler zum Tausch auswählen">↔</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🪑</span> Bank
                          </h4>
                          <div className="space-y-1.5">
                            {presentationSubstitutes.map((sub, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                                <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0">{sub.num}</span>
                                <span className="text-[11px] text-slate-300 font-bold truncate flex-1">{sub.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-mono shrink-0">{sub.pos}</span>
                                <button onClick={() => swapStartelfWithSub(idx)} className="text-[9px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/40 hover:bg-violet-500/40 font-bold uppercase shrink-0 transition-all">Einwechseln</button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📝</span> Notizen
                          </h4>
                          {slideEditingActive ? (
                            <div className="space-y-2">
                              <div><label className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Abwehrkette</label><textarea value={formationNotes.defenseLine} onChange={(e) => setFormationNotes({ ...formationNotes, defenseLine: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" /></div>
                              <div><label className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Doppel-Pivot</label><textarea value={formationNotes.doublePivot} onChange={(e) => setFormationNotes({ ...formationNotes, doublePivot: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" /></div>
                              <div><label className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Offensivreihe</label><textarea value={formationNotes.attackingRow} onChange={(e) => setFormationNotes({ ...formationNotes, attackingRow: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" /></div>
                              <div><label className="block text-[9px] text-slate-500 font-bold uppercase mb-0.5">Stürmer</label><textarea value={formationNotes.striker} onChange={(e) => setFormationNotes({ ...formationNotes, striker: e.target.value })} rows={2} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-emerald-400 resize-none" /></div>
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">Abwehr:</span> {formationNotes.defenseLine}</p>
                              <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">6er:</span> {formationNotes.doublePivot}</p>
                              <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">Offensiv:</span> {formationNotes.attackingRow}</p>
                              <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">ST:</span> {formationNotes.striker}</p>
                            </div>
                          )}
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🔍</span> Gegneranalyse
                          </h4>
                          <div className="bg-emerald-950/60 border border-emerald-800/40 rounded-xl p-3 relative min-h-[180px]">
                            <span className="text-[8px] font-black uppercase text-emerald-400/60 mb-1 block">Erwartete Formation: 4-2-3-1</span>
                            {[
                              { id: 'op1', num: '1', pos: 'TW', x: 50, y: 88 },
                              { id: 'op2', num: '2', pos: 'RV', x: 18, y: 74 },
                              { id: 'op3', num: '4', pos: 'IV', x: 38, y: 78 },
                              { id: 'op4', num: '5', pos: 'IV', x: 62, y: 78 },
                              { id: 'op5', num: '3', pos: 'LV', x: 82, y: 74 },
                              { id: 'op6', num: '6', pos: 'DM', x: 50, y: 60 },
                              { id: 'op7', num: '8', pos: 'ZM', x: 32, y: 54 },
                              { id: 'op8', num: '10', pos: 'OM', x: 68, y: 54 },
                              { id: 'op9', num: '7', pos: 'RA', x: 20, y: 42 },
                              { id: 'op10', num: '9', pos: 'ST', x: 50, y: 36 },
                              { id: 'op11', num: '11', pos: 'LA', x: 80, y: 42 },
                            ].map((op) => (
                              <div key={op.id} style={{ left: `${op.x}%`, top: `${op.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                                <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-lg border border-white">{op.num}</span>
                                <span className="text-[7px] font-black uppercase text-rose-300 bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">{op.pos}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2 leading-snug">Gegner spielt kompakte 4-2-3-1 mit hohem Pressing. Schwachstelle: Räume hinter den AVs bei Verlagerungen.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 2: DEFENSIVE GRUNDORDNUNG — Side-by-Side */}
                  {presentationSlideIndex === 2 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-center h-full">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'sys-4231')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['sys-4231']?.zones}
                            draftPlayers={scenarioEdits['sys-4231']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('sys-4231', z, p)}
                          />
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🛡️</span> Defensive Grundordnung 4-2-3-1
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mb-3">FC Auggen &bull; Wichtige Punkte</p>
                          <div className="space-y-2">
                            {[
                              'Konsequent durchschieben – vertikal und horizontal',
                              'Gute Pressing-Auslöser finden',
                              'Nach außen lenken',
                              'Kommunikation: Passgeber = Informationsgeber',
                              'Gegen den Ball max. 16er-Breite – kompakt im Zentrum – kleine Zwischenräume',
                            ].map((punkt, i) => (
                              <div key={i} className="flex items-start gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                                <span className="text-rose-400 font-black text-sm mt-0.5 shrink-0">{i + 1}.</span>
                                <span className="text-[13px] text-slate-200 leading-snug">{punkt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📝</span> Defensiv-Regeln
                          </h4>
                          {slideEditingActive ? (
                            <textarea value={defensiveRulesList.join('\n')} onChange={(e) => setDefensiveRulesList(e.target.value.split('\n').filter(Boolean))} rows={5} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-rose-400 resize-none font-mono" />
                          ) : (
                            <div className="space-y-1.5">
                              {defensiveRulesList.map((rule, i) => (
                                <p key={i} className="text-[11px] text-slate-300 leading-snug">• {rule}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 3: MIT DEM BALL — Side-by-Side */}
                  {presentationSlideIndex === 3 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-center h-full">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-mb')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-mb']?.zones}
                            draftPlayers={scenarioEdits['f-mb']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-mb', z, p)}
                          />
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">⚽</span> Spielaufbau
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">8er-Raum finden, kurze Optionen bieten und bespielen, spielerische Stärke ausspielen, Angebote gut timen, Dreiecksbildung</p>
                        </div>
                        <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">⚡</span> Mit Gegnerdruck
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">Platz frei machen. Den geschaffenen Raum dynamisch besetzen. Steil-Klatsch-Kombinationen finden und nutzen – Klatschball ist ein Signal für Tiefenläufe</p>
                        </div>
                        <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🔄</span> Nach Ballgewinn
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">Erster Blick nach vorne. Verlagerungen – dann Tempo aufnehmen. Spielwitz im letzten Drittel – gemeinsam Spaß haben</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 4: ROTATION SPIELAUFBAU — Side-by-Side */}
                  {presentationSlideIndex === 4 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-r1')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-r1']?.zones}
                            draftPlayers={scenarioEdits['f-r1']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-r1', z, p)}
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-2 font-semibold">Bild 1 · Rotation · Zonen & Spieler frei ziehen</p>
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-r2')!}
                            className="w-full aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-r2']?.zones}
                            draftPlayers={scenarioEdits['f-r2']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-r2', z, p)}
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-2 font-semibold">Bild 2 · Rotation · Zonen & Spieler frei ziehen</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📋</span> Offensiv-Guidelines
                          </h4>
                          {slideEditingActive ? (
                            <textarea value={offensiveGuidelinesList.join('\n')} onChange={(e) => setOffensiveGuidelinesList(e.target.value.split('\n').filter(Boolean))} rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] text-slate-200 focus:outline-none focus:border-sky-400 resize-none font-mono" />
                          ) : (
                            <div className="space-y-1.5">
                              {offensiveGuidelinesList.map((g, i) => (
                                <p key={i} className="text-[11px] text-slate-300 leading-snug">• {g}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 5: DREIECKS-ROTATION — Side-by-Side */}
                  {presentationSlideIndex === 5 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-d1')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-d1']?.zones}
                            draftPlayers={scenarioEdits['f-d1']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-d1', z, p)}
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-2 font-semibold">Bild 1 · Dreiecks-Rotation · frei ziehen</p>
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-d2')!}
                            className="w-full aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-d2']?.zones}
                            draftPlayers={scenarioEdits['f-d2']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-d2', z, p)}
                          />
                          <p className="text-[11px] text-slate-400 text-center mt-2 font-semibold">Bild 2 · Dreiecks-Rotation · frei ziehen</p>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🔺</span> Dreiecks-Beschreibung
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed">Dreiecks-Rotation schafft Überzahlsituationen im Mittelfeld. Durch konsequente Verlagerung und Nachrücken entstehen permanente 2v1-Situationen auf den Außen. Die Diagonalwege halten den Ball-Zirkulationskreis lebendig.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 6: GEGEN DEN BALL — Side-by-Side */}
                  {presentationSlideIndex === 6 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-center h-full">
                          <TacticScenarioView
                            scenario={ALL_SCENARIOS.find((s) => s.id === 'f-gb')!}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits['f-gb']?.zones}
                            draftPlayers={scenarioEdits['f-gb']?.players}
                            onDraftChange={(z, p) => setEditsForScenario('f-gb', z, p)}
                          />
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🗑️</span> Gegen den Ball — Regeln
                          </h4>
                          <div className="space-y-2">
                            {[
                              { txt: 'Anspielen lassen und dann nach außen lenken', icon: '➡' },
                              { txt: 'Mit Überzeugung anlaufen – jedoch clever sein', icon: '⚔' },
                              { txt: 'Konzentration hochhalten – Standards', icon: '🎯' },
                              { txt: 'Direktes Gegenpressing, wir bleiben dominant!', icon: '🔥' },
                              { txt: 'Tiefensicherung gegen lange Bälle', icon: '🧱' },
                              { txt: 'Abwehrdreieck einrücken', icon: '🔺' },
                              { txt: '2. Bälle! 6er bereit sein!', icon: '⚽' },
                              { txt: 'Kommunikation, Kommandos geben, ZUSAMMEN', icon: '📣' },
                            ].map((punkt, i) => (
                              <div key={i} className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
                                <span className="text-base shrink-0">{punkt.icon}</span>
                                <span className="text-[13px] text-slate-200 leading-snug">{punkt.txt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 7: 1:1 TAKTIK — Side-by-Side */}
                  {presentationSlideIndex === 7 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-center h-full">
                          <TacticScenarioView
                            scenario={activeScenario}
                            className="w-full max-h-[480px] aspect-square mx-auto"
                            editable
                            draftZones={scenarioEdits[activeScenario.id]?.zones}
                            draftPlayers={scenarioEdits[activeScenario.id]?.players}
                            onDraftChange={(z, p) => setEditsForScenario(activeScenario.id, z, p)}
                          />
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                            <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                              <span className="text-sm">📐</span> 1:1 Taktik · {activeScenario.name}
                            </h4>
                            <button onClick={() => setScenarioFullscreen(true)} className="bg-violet-400 hover:bg-violet-300 text-slate-950 font-black text-[10px] uppercase px-3 py-1.5 rounded-lg shadow-lg transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer" title="1:1-Szenario im Vollbild anzeigen">
                              <Maximize2 size={13} /> Vollbild
                            </button>
                          </div>
                          {activeScenario.sub && (
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{activeScenario.sub}</p>
                          )}
                          {activeScenario.note && (
                            <p className="text-[12px] text-slate-300 leading-relaxed">{activeScenario.note}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SLIDE 8: GEGNER TOP 3 — Side-by-Side */}
                  {presentationSlideIndex === 8 && (
                    <div className="flex flex-col lg:flex-row gap-6 min-h-[480px]">
                      <div className="lg:w-[55%] shrink-0">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                          <div>
                            <h3 className="font-black text-xl uppercase text-white tracking-wider flex items-center gap-2">
                              <span className="text-amber-400">GEGNER TOP 3</span> — {selectedMatchObj.opponent}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-mono">Erwartete Formation: 4-2-3-1</p>
                          </div>
                          <button onClick={saveOpponentTop3} className={`${top3Saved ? 'bg-emerald-500' : 'bg-amber-400 hover:bg-amber-300'} text-slate-950 font-black text-xs uppercase px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 active:scale-95`}>
                            {top3Saved ? <Check size={15} /> : <Save size={15} />} {top3Saved ? 'Gespeichert!' : 'Top 3 Speichern'}
                          </button>
                        </div>
                        <div
                            ref={top3PitchRef}
                            className="bg-emerald-950/60 border border-emerald-800/40 rounded-2xl p-4 relative min-h-[350px] select-none touch-none"
                            onMouseMove={handleChipMouseMove}
                            onMouseUp={handleChipMouseUp}
                            onMouseLeave={handleChipMouseUp}
                          >
                          {[
                            { id: 'op1', num: '1', pos: 'TW', x: 50, y: 88 },
                            { id: 'op2', num: '2', pos: 'RV', x: 18, y: 74 },
                            { id: 'op3', num: '4', pos: 'IV', x: 38, y: 78 },
                            { id: 'op4', num: '5', pos: 'IV', x: 62, y: 78 },
                            { id: 'op5', num: '3', pos: 'LV', x: 82, y: 74 },
                            { id: 'op6', num: '6', pos: 'DM', x: 50, y: 60 },
                            { id: 'op7', num: '8', pos: 'ZM', x: 32, y: 54 },
                            { id: 'op8', num: '10', pos: 'OM', x: 68, y: 54 },
                            { id: 'op9', num: '7', pos: 'RA', x: 20, y: 42 },
                            { id: 'op10', num: '9', pos: 'ST', x: 50, y: 36 },
                            { id: 'op11', num: '11', pos: 'LA', x: 80, y: 42 },
                          ].map((op) => (
                            <div key={op.id} style={{ left: `${op.x}%`, top: `${op.y}%` }} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10">
                              <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center shadow-lg border border-white">{op.num}</span>
                              <span className="text-[7px] font-black uppercase text-rose-300 bg-slate-950/80 px-1 rounded mt-0.5 whitespace-nowrap">{op.pos}</span>
                            </div>
                          ))}
                          {/* EIGENE SPIELER — frei bewegliche Chips (Name + Bild) */}
                          {ownTop3Chips.map((c, i) => (
                            <div
                              key={`ownchip_${i}`}
                              style={{ left: `${c.x}%`, top: `${c.y}%` }}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 ${dragChipIndex === i ? 'cursor-grabbing' : 'cursor-grab'}`}
                              onMouseDown={(e) => handleChipMouseDown(e, i)}
                            >
                              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black text-[9px] flex items-center justify-center shadow-lg border border-white z-10">
                                {c.number}
                              </span>
                              {c.image ? (
                                <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-emerald-400 shadow-xl bg-slate-900">
                                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                                </div>
                              ) : (
                                <span className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-xl border-2 border-white">
                                  {c.number}
                                </span>
                              )}
                              <span className="text-[8px] font-black uppercase text-white bg-slate-950/90 px-1.5 rounded mt-1 whitespace-nowrap shadow border border-emerald-500/40">
                                {c.name.split(' ').pop()}
                              </span>
                            </div>
                          ))}
                          <span className="absolute bottom-2 left-2 right-2 text-center text-[9px] font-bold text-emerald-400/80 bg-slate-950/70 rounded-lg px-2 py-1 z-30 pointer-events-none">
                            Grün = eigene Spieler frei ziehen · Rot = Gegner (statisch)
                          </span>
                        </div>
                      </div>
                      <div className="lg:w-[45%] space-y-4 overflow-y-auto max-h-[520px]">
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span className="text-sm">⭐</span> Top 3 Spieler
                          </h4>
                          <div className="space-y-3">
                            {opponentTop3.map((p, i) => (
                              <div key={i} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs">#{(i + 1).toString()}</span>
                                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gegner-Spieler {i + 1}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-500 text-lg">
                                    {p.imageUrl ? (<img src={p.imageUrl} alt={p.name || 'Gegner'} className="w-full h-full object-cover" />) : (<User size={22} />)}
                                  </div>
                                  <div className="flex-1 space-y-2">
                                    <div><label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Bild-URL</label><input type="text" value={p.imageUrl} onChange={(e) => { const next = [...opponentTop3]; next[i] = { ...next[i], imageUrl: e.target.value }; setOpponentTop3(next); }} placeholder="https://... (Bild-Link)" className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400" /></div>
                                  </div>
                                </div>
                                <div><label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Name</label><input type="text" value={p.name} onChange={(e) => { const next = [...opponentTop3]; next[i] = { ...next[i], name: e.target.value }; setOpponentTop3(next); }} placeholder="z.B. Mustermann" className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-sm font-bold text-white focus:outline-none focus:border-amber-400" /></div>
                                <div><label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Position</label><input type="text" value={p.position} onChange={(e) => { const next = [...opponentTop3]; next[i] = { ...next[i], position: e.target.value }; setOpponentTop3(next); }} placeholder="z.B. Stürmer (ST)" className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400" /></div>
                                <div><label className="block text-[9px] text-slate-400 font-bold uppercase mb-0.5">Note</label><input type="text" value={p.note} onChange={(e) => { const next = [...opponentTop3]; next[i] = { ...next[i], note: e.target.value }; setOpponentTop3(next); }} placeholder="z.B. 2,5 (Leistungsklasse)" className="w-full bg-slate-950 border border-slate-700 p-2 rounded-lg text-sm font-black text-amber-400 focus:outline-none focus:border-amber-400" /></div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📊</span> Team-Metriken
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Passquote</span>
                              <span className="text-sm font-black text-emerald-400">{presentationMetrics.passQuote}</span>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Zweikämpfe</span>
                              <span className="text-sm font-black text-sky-400">{presentationMetrics.duelWin}</span>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Gegenpres.</span>
                              <span className="text-sm font-black text-amber-400">{presentationMetrics.counterPress}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* BOTTOM NAVIGATION FOOTER */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                disabled={presentationSlideIndex === 0}
                onClick={() => setPresentationSlideIndex(prev => Math.max(0, prev - 1))}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl border border-slate-800 transition-all flex items-center gap-1.5"
              >
                <ChevronLeft size={16} /> Vorheriges Slide
              </button>

              <span className="text-xs font-black text-emerald-400 font-mono">
                SLIDE {presentationSlideIndex + 1} VON 9
              </span>

              <button
                disabled={presentationSlideIndex === 8}
                onClick={() => setPresentationSlideIndex(prev => Math.min(8, prev + 1))}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase px-5 py-2.5 rounded-xl transition-all shadow flex items-center gap-1.5"
              >
                Nächstes Slide <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN TV PRESENTATION OVERLAY (WHEN isTvMode === true) */}
      <AnimatePresence>
        {isTvMode && (
          <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-2xl p-6 sm:p-10 flex flex-col justify-between overflow-hidden text-white">
            {/* TV HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-4">
                {renderClubLogo(44, 'border-2 border-emerald-400/60', true)}
                <div>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                    TV PRÄSENTATION • {activeClub.shortName || 'FCA'}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    {activeClub.shortName || 'FC AUGGEN'} vs. {selectedMatchObj.opponent.toUpperCase()}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                  SLIDE {presentationSlideIndex + 1} / 9
                </span>
                <button
                  onClick={() => {
                    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                      document.documentElement.requestFullscreen().catch(() => {});
                    } else if (document.fullscreenElement && document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow"
                  title="Vollbild umschalten"
                >
                  <Maximize2 size={15} /> Vollbild
                </button>
                <button
                  onClick={() => {
                    setIsTvMode(false);
                    if (document.fullscreenElement && document.exitFullscreen) {
                      document.exitFullscreen().catch(() => {});
                    }
                  }}
                  className="bg-slate-800 hover:bg-rose-500 text-white font-bold text-xs uppercase px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                >
                  <X size={16} /> Beenden (ESC)
                </button>
              </div>
            </div>

            {/* TV CENTER CONTENT */}
            <div className="my-auto py-6 max-w-7xl w-full mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase text-emerald-400 tracking-widest block">
                      KAPITEL {presentationSlideIndex + 1}
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
                      {[
                        '1. Titel & Match',
                        '2. Aufstellung 4-3-3',
                        '3. Defensive Grundordnung',
                        '4. Eigener Matchplan mit dem Ball',
                        '5. Rotation Spielaufbau',
                        '6. Dreiecks-Rotation',
                        '7. Eigener Matchplan gegen den Ball',
                        '8. 1:1 Taktik',
                        '9. Gegner Top 3'
                      ][presentationSlideIndex]}
                    </h1>
                  </div>

                  {/* TEXT SUMMARY FOR TV MODE — matching inline categories */}
                  <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl space-y-3 text-sm text-slate-200 leading-relaxed max-h-[420px] overflow-y-auto">
                    {/* Slide 0: Titel & Match — matchNotes */}
                    {presentationSlideIndex === 0 && (
                      <div className="space-y-2">
                        <p className="text-[12px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Heim-Strategie:</span> {matchNotes.home}</p>
                        <p className="text-[12px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Gegner:</span> {matchNotes.opponent}</p>
                        <p className="text-[12px] text-slate-300 leading-relaxed"><span className="text-slate-500 font-bold">Fokus:</span> {matchNotes.focus}</p>
                      </div>
                    )}
                    {/* Slide 1: Aufstellung — lineup list + bank + formation notes */}
                    {presentationSlideIndex === 1 && (
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">👕</span> Startelf
                          </h4>
                          <div className="space-y-1">
                            {presentationLineup.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5">
                                <span className="w-5 h-5 rounded-full bg-emerald-400 text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0">{p.number}</span>
                                <span className="text-[11px] text-white font-bold truncate flex-1">{p.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-mono shrink-0">{p.position}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🪑</span> Bank
                          </h4>
                          <div className="space-y-1">
                            {presentationSubstitutes.map((sub, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-1.5">
                                <span className="w-5 h-5 rounded-full bg-slate-700 text-slate-300 font-black text-[9px] flex items-center justify-center shrink-0">{sub.num}</span>
                                <span className="text-[11px] text-slate-300 font-bold truncate flex-1">{sub.name}</span>
                                <span className="text-[9px] text-slate-500 uppercase font-mono shrink-0">{sub.pos}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3 space-y-1">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Notizen</p>
                          <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">Abwehr:</span> {formationNotes.defenseLine}</p>
                          <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">6er:</span> {formationNotes.doublePivot}</p>
                          <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">Offensiv:</span> {formationNotes.attackingRow}</p>
                          <p className="text-[11px] text-slate-300 leading-snug"><span className="text-slate-500 font-bold">ST:</span> {formationNotes.striker}</p>
                        </div>
                      </div>
                    )}
                    {/* Slide 2: Defensive Grundordnung — bullet points + defensive rules */}
                    {presentationSlideIndex === 2 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Defensive Grundordnung 4-2-3-1</h4>
                          <div className="space-y-1.5">
                            {[
                              'Konsequent durchschieben – vertikal und horizontal',
                              'Gute Pressing-Auslöser finden',
                              'Nach außen lenken',
                              'Kommunikation: Passgeber = Informationsgeber',
                              'Gegen den Ball max. 16er-Breite – kompakt im Zentrum – kleine Zwischenräume',
                            ].map((punkt, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-rose-400 font-black text-[11px] mt-0.5 shrink-0">{i + 1}.</span>
                                <span className="text-[12px] text-slate-200 leading-snug">{punkt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2">Defensiv-Regeln</h4>
                          <div className="space-y-1">
                            {defensiveRulesList.map((rule, i) => (
                              <p key={i} className="text-[11px] text-slate-300 leading-snug">• {rule}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Slide 3: Eigener Matchplan mit dem Ball — 3 category cards */}
                    {presentationSlideIndex === 3 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-emerald-500/30 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="text-sm">⚽</span> Spielaufbau
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">8er-Raum finden, kurze Optionen bieten und bespielen, spielerische Stärke ausspielen, Angebote gut timen, Dreiecksbildung</p>
                        </div>
                        <div className="bg-slate-950/40 border border-sky-500/30 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="text-sm">⚡</span> Mit Gegnerdruck
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">Platz frei machen. Den geschaffenen Raum dynamisch besetzen. Steil-Klatsch-Kombinationen finden und nutzen – Klatschball ist ein Signal für Tiefenläufe</p>
                        </div>
                        <div className="bg-slate-950/40 border border-amber-500/30 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="text-sm">🔄</span> Nach Ballgewinn
                          </h4>
                          <p className="text-[12px] text-slate-300 leading-relaxed">Erster Blick nach vorne. Verlagerungen – dann Tempo aufnehmen. Spielwitz im letzten Drittel – gemeinsam Spaß haben</p>
                        </div>
                      </div>
                    )}
                    {/* Slide 4: Rotation Spielaufbau — offensive guidelines */}
                    {presentationSlideIndex === 4 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📋</span> Offensiv-Guidelines
                          </h4>
                          <div className="space-y-1.5">
                            {offensiveGuidelinesList.map((g, i) => (
                              <p key={i} className="text-[11px] text-slate-300 leading-snug">• {g}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Slide 5: Dreiecks-Rotation — description */}
                    {presentationSlideIndex === 5 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🔺</span> Dreiecks-Beschreibung
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-relaxed">Dreiecks-Rotation schafft Überzahlsituationen im Mittelfeld. Durch konsequente Verlagerung und Nachrücken entstehen permanente 2v1-Situationen auf den Außen. Die Diagonalwege halten den Ball-Zirkulationskreis lebendig.</p>
                        </div>
                      </div>
                    )}
                    {/* Slide 6: Gegen den Ball — 8 rules with icons */}
                    {presentationSlideIndex === 6 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">🗑️</span> Gegen den Ball — Regeln
                          </h4>
                          <div className="space-y-1.5">
                            {[
                              { txt: 'Anspielen lassen und dann nach außen lenken', icon: '➡' },
                              { txt: 'Mit Überzeugung anlaufen – jedoch clever sein', icon: '⚔' },
                              { txt: 'Konzentration hochhalten – Standards', icon: '🎯' },
                              { txt: 'Direktes Gegenpressing, wir bleiben dominant!', icon: '🔥' },
                              { txt: 'Tiefensicherung gegen lange Bälle', icon: '🧱' },
                              { txt: 'Abwehrdreieck einrücken', icon: '🔺' },
                              { txt: '2. Bälle! 6er bereit sein!', icon: '⚽' },
                              { txt: 'Kommunikation, Kommandos geben, ZUSAMMEN', icon: '📣' },
                            ].map((punkt, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-base shrink-0">{punkt.icon}</span>
                                <span className="text-[12px] text-slate-200 leading-snug">{punkt.txt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Slide 7: 1:1 Taktik — scenario info */}
                    {presentationSlideIndex === 7 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-violet-500/30 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📐</span> 1:1 Taktik · {activeScenario.name}
                          </h4>
                          {activeScenario.sub && (
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{activeScenario.sub}</p>
                          )}
                          {activeScenario.note && (
                            <p className="text-[12px] text-slate-300 leading-relaxed">{activeScenario.note}</p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Slide 8: Gegner Top 3 — player cards + metrics */}
                    {presentationSlideIndex === 8 && (
                      <div className="space-y-3">
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">⭐</span> Top 3 Spieler — {selectedMatchObj.opponent}
                          </h4>
                          <div className="space-y-2">
                            {opponentTop3.map((p, i) => (
                              <div key={i} className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
                                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[10px] shrink-0">#{i + 1}</span>
                                <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-500">
                                  {p.imageUrl ? (<img src={p.imageUrl} alt={p.name || 'Gegner'} className="w-full h-full object-cover" />) : (<User size={18} />)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] font-black text-white truncate">{p.name || 'Unbekannt'}</div>
                                  <div className="text-[10px] text-slate-500 uppercase">{p.position || 'Position'}</div>
                                </div>
                                <span className="bg-amber-400 text-slate-950 font-black text-sm px-3 py-1 rounded-lg shrink-0">{p.note || '–'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                          <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span className="text-sm">📊</span> Team-Metriken
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Passquote</span>
                              <span className="text-sm font-black text-emerald-400">{presentationMetrics.passQuote}</span>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Zweikämpfe</span>
                              <span className="text-sm font-black text-sky-400">{presentationMetrics.duelWin}</span>
                            </div>
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-center">
                              <span className="text-[9px] text-slate-500 uppercase font-bold block">Gegenpres.</span>
                              <span className="text-sm font-black text-amber-400">{presentationMetrics.counterPress}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* TV PITCH DISPLAY (DYNAMIC SYNC WITH SLIDE INDEX) */}
                <div className="min-h-[400px] h-full flex flex-col justify-center">
                  {presentationSlideIndex === 0 ? (
                    <div className="min-h-[400px] rounded-2xl border border-emerald-500/40 overflow-hidden relative shadow-2xl">
                      <img
                        src="/presentation/titel-design.png"
                        alt="Spieltagspräsentation"
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/95 via-slate-950/90 to-slate-950/95" />
                      <div className="relative z-10 p-8 sm:p-10 flex flex-col items-center justify-center text-center min-h-[400px] gap-4">
                        <div className="flex items-center justify-center">{renderClubLogo(88, 'border-4 border-emerald-400/60', true)}</div>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-black text-xs uppercase px-3 py-1 rounded-full tracking-wider">
                          {selectedMatchObj.competition.toUpperCase() + ' • SPIELTAGSPRÄSENTATION ' + (selectedMatchObj.date || '')}
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-black text-white uppercase tracking-tight text-center">
                          {presentationTitleOverride || `${activeClub.shortName || 'FC AUGGEN'} vs. ${selectedMatchObj.opponent.toUpperCase()}`}
                        </h1>
                        <p className="text-sm text-slate-300 font-semibold flex items-center gap-2 flex-wrap justify-center">
                          <span>{selectedMatchObj.date ? new Date(selectedMatchObj.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}, {selectedMatchObj.time || '15:30'} Uhr</span>
                          <span>&bull; {selectedMatchObj.location}</span>
                          <span>&bull; {selectedMatchObj.competition}</span>
                        </p>
                        <span className="mt-1 bg-slate-900/80 border border-slate-700 text-slate-300 font-bold text-xs uppercase px-4 py-2 rounded-lg">
                          {selectedMatchObj.isHome ? 'Heimspiel' : 'Auswärtsspiel'}
                        </span>
                      </div>
                    </div>
                  ) : presentationSlideIndex === 7 ? (
                    <div className="rounded-2xl overflow-hidden border-2 border-violet-500/40 aspect-square max-h-[540px] mx-auto w-full">
                      <TacticScenarioView
                        scenario={activeScenario}
                        draftZones={scenarioEdits[activeScenario.id]?.zones}
                        draftPlayers={scenarioEdits[activeScenario.id]?.players}
                      />
                    </div>
                  ) : presentationSlideIndex === 8 ? (
                    <div className="grid grid-cols-3 gap-4">
                      {opponentTop3.map((p, i) => (
                        <div key={i} className="bg-slate-900/80 border-2 border-amber-500/40 rounded-2xl overflow-hidden flex flex-col items-center text-center shadow-2xl">
                          <div className="w-full bg-slate-950/60 flex items-center justify-center py-3">
                            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-amber-400/60 overflow-hidden bg-slate-900 flex items-center justify-center text-slate-500">
                              {p.imageUrl ? (
                                <img src={p.imageUrl} alt={p.name || 'Gegner'} className="w-full h-full object-cover" />
                              ) : (
                                <User size={44} />
                              )}
                            </div>
                          </div>
                          <div className="p-4 space-y-1.5">
                            <div className="text-[10px] font-black uppercase text-amber-400 tracking-wider">#{i + 1} Gegner-Star</div>
                            <div className="text-sm sm:text-base font-black text-white uppercase leading-tight">{p.name || 'Unbekannt'}</div>
                            <div className="text-[11px] text-slate-400 font-semibold">{p.position || 'Position'}</div>
                            <div className="mt-1.5 inline-block bg-amber-400 text-slate-950 font-black text-lg px-4 py-1 rounded-xl min-w-[52px]">
                              {p.note || '–'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    (() => {
                      if (presentationSlideIndex === 1) return renderPitchForSlide(1);
                      const tvScenarioId =
                        presentationSlideIndex === 2 ? 'sys-4231'
                        : presentationSlideIndex === 3 ? 'f-mb'
                        : presentationSlideIndex === 4 ? 'f-r1'
                        : presentationSlideIndex === 5 ? 'f-d1'
                        : presentationSlideIndex === 6 ? 'f-gb'
                        : null;
                      if (tvScenarioId) {
                        const sc = ALL_SCENARIOS.find((s) => s.id === tvScenarioId);
                        if (sc) {
                          return (
                            <div className="rounded-2xl overflow-hidden border-2 border-emerald-500/30 aspect-square max-h-[540px] mx-auto w-full">
                              <TacticScenarioView
                                scenario={sc}
                                draftZones={scenarioEdits[tvScenarioId]?.zones}
                                draftPlayers={scenarioEdits[tvScenarioId]?.players}
                                highlightArrows={tvScenarioId !== 'sys-4231'}
                              />
                            </div>
                          );
                        }
                      }
                      return renderPitchForSlide(presentationSlideIndex);
                    })()
                  )}
                </div>
              </div>
            </div>

            {/* TV FOOTER STEPPER */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                disabled={presentationSlideIndex === 0}
                onClick={() => setPresentationSlideIndex(prev => Math.max(0, prev - 1))}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl border border-slate-800 transition-all flex items-center gap-2"
              >
                <ChevronLeft size={18} /> Vorheriges Slide
              </button>

              <div className="flex items-center gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => setPresentationSlideIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      presentationSlideIndex === idx ? 'bg-emerald-400 scale-125 ring-2 ring-emerald-300' : 'bg-slate-700 hover:bg-slate-500'
                    }`}
                  />
                ))}
              </div>

              <button
                disabled={presentationSlideIndex === 8}
                onClick={() => setPresentationSlideIndex(prev => Math.min(8, prev + 1))}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs uppercase px-6 py-3 rounded-xl transition-all shadow flex items-center gap-2"
              >
                Nächstes Slide <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: EDIT COACHING POINTS MODAL */}
      <AnimatePresence>
        {showEditCoachingModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-black text-base uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <Plus size={18} /> Neuen Coaching-Punkt Hinzufügen
                </h3>
                <button onClick={() => setShowEditCoachingModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <label className="block text-slate-400 font-bold uppercase text-[10px]">Ansprache-Leitsatz</label>
                <input
                  type="text"
                  value={editingCoachingPointText}
                  onChange={(e) => setEditingCoachingPointText(e.target.value)}
                  placeholder="z.B. Hohes Tempo über die Flügel in den ersten 20 Minuten..."
                  className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowEditCoachingModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    if (editingCoachingPointText.trim()) {
                      setPresentationCoachingPoints(prev => [...prev, editingCoachingPointText.trim()]);
                      setEditingCoachingPointText('');
                      setShowEditCoachingModal(false);
                      notify('Neuer Coaching-Punkt hinzugefügt!');
                    }
                  }}
                  className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg transition-all"
                >
                  Hinzufügen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showAuditModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
                    <Sparkles size={18} />
                  </div>
                  <h3 className="font-black text-lg uppercase tracking-wider text-white">
                    {editingAuditCard.id ? 'Audit-Punkt Bearbeiten' : 'Neuen Audit-Punkt Erstellen'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAuditModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                    Titel / Kennzahl *
                  </label>
                  <input 
                    type="text"
                    value={editingAuditCard.title}
                    onChange={(e) => setEditingAuditCard(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="z.B. Zweikampfquote, Pressing-Intensität, Passschärfe"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                    Wert / Ergebnis
                  </label>
                  <input 
                    type="text"
                    value={editingAuditCard.value}
                    onChange={(e) => setEditingAuditCard(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="z.B. 88%, 3 Tore, Top 1, High Impact"
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-bold uppercase text-[10px] mb-1">
                    Beschreibung / Fazit
                  </label>
                  <textarea 
                    rows={3}
                    value={editingAuditCard.description}
                    onChange={(e) => setEditingAuditCard(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Anmerkungen des Trainerteams zur Taktikumsetzung..."
                    className="w-full bg-slate-950 border border-slate-700 p-3 rounded-xl font-medium text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowAuditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveAuditCard}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg transition-all"
                >
                  Speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════ CHAMPIONS-LEAGUE AUFSTELLUNG (ANIMIERT) ═══════════════ */}
      {showChampionsAnimation && (
        <div className="fixed inset-0 z-[400] bg-slate-950/98 flex flex-col items-center justify-center p-3 overflow-hidden select-none">
          <style>{`@keyframes champDrop { from { top: -38%; } to { top: 50%; } }`}</style>
          {/* HEADER */}
          <div className="w-full max-w-5xl flex items-center justify-between mb-3 z-20">
            <div className="flex items-center gap-3">
              {renderClubLogo(56, 'border-2 border-amber-300/70', true)}
              <div>
                <h2 className="font-black text-lg text-white uppercase tracking-wider leading-tight">Startelf-Aufstellung</h2>
                <p className="text-[11px] text-amber-300 font-semibold">Spieler kommen von oben nacheinander runter · {activeClub?.name || 'Startelf'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[9px] font-black text-slate-500 uppercase">ESC zum Schließen</span>
              <button
                onClick={() => setChampPaused(p => !p)}
                className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10px] font-black uppercase px-3.5 py-2 rounded-xl shadow-lg transition-all active:scale-95"
                title={champPaused ? 'Weiterlaufen lassen' : 'Animation anhalten'}
              >
                {champPaused ? <Play size={13} /> : <Pause size={13} />} {champPaused ? 'Weiter' : 'Stopp'}
              </button>
              <button
                onClick={replayChampions}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-3.5 py-2 rounded-xl shadow-lg transition-all active:scale-95"
              >
                <RefreshCw size={13} /> Erneut
              </button>
              <button
                onClick={closeChampions}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase px-3.5 py-2 rounded-xl border border-slate-700 transition-all active:scale-95"
              >
                <X size={13} /> Schließen
              </button>
            </div>
          </div>

          {/* PITCH STAGE */}
          <div className="relative w-full max-w-5xl aspect-[16/10] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/20 bg-gradient-to-br from-[#0b5d1e] via-[#0c7a24] to-[#0a4a18]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(255,255,255,0.04), transparent 70%)',
              backgroundSize: '40px 40px, 40px 40px, 100% 100%',
            }}
          >
            {/* Mittellinie */}
            <div className="absolute left-0 right-0 top-1/2 h-1 bg-white/20" />
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white/20" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-24 border-2 rounded-full border-white/40" />

            {/* Center-Circle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/30" />

            {/* Blauer Anstoßpunkt */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/80" />

            {/* Großes Vereinslogo im Hintergrund (Wasserzeichen) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.18] pointer-events-none">
              {renderClubLogo(340, 'border-[6px] border-white/30', true)}
            </div>

            {/* 📍 Bereits platzierte Spieler (klein auf Position) */}
            {championsCards.map((card, i) => {
              if (i >= championsActiveCount) return null;
              return (
                <div
                  key={card.id}
                  className="absolute w-[11%] max-w-[92px] transition-all duration-700 ease-out"
                  style={{ left: `${card.x}%`, transform: 'translateX(-50%)', top: `${card.y}%`, opacity: 1, zIndex: 10 }}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-full rounded-xl px-1 py-1.5 shadow-xl border-2 flex flex-col items-center justify-center text-center"
                      style={{ background: 'linear-gradient(160deg, #e94560 0%, #c0392b 100%)', borderColor: 'rgba(255,255,255,0.45)' }}
                    >
                      <span className="text-[10px] font-black text-white/90 tracking-widest">{card.position}</span>
                      {card.image ? (
                        <div className="relative h-9 w-9 rounded-full overflow-hidden border border-white/60 shadow-inner my-0.5 shrink-0">
                          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                          <span className="absolute bottom-0 left-0 right-0 bg-[#c0392b]/90 text-[8px] font-black text-white text-center leading-none py-px">{card.number}</span>
                        </div>
                      ) : (
                        <span className="h-7 w-7 rounded-full bg-white/95 text-[#c0392b] font-black flex items-center justify-center text-sm shadow-inner leading-none my-0.5">{card.number}</span>
                      )}
                      <span className="text-[9px] font-bold text-white leading-tight">{card.name}</span>
                    </div>
                    <div className="w-5 h-1.5 rounded-full bg-black/40 mt-1.5 mx-auto" />
                  </div>
                </div>
              );
            })}

            {/* 🌟 Fokussierter Spieler: großes Bild → Notiz → klein auf Position */}
            {focusCard && (
              <>
                {/* Großes Bild des aktuellen Spielers (fällt von oben in die Mitte, dann klein auf Position) */}
                <div
                  key={`focus_${focusCard.id}_${champPhase === 'big' ? 'drop' : champPhase}`}
                  className="absolute transition-all duration-[1000ms] ease-out z-30"
                  style={
                    champPhase === 'place'
                      ? { left: `${focusCard.x}%`, top: `${focusCard.y}%`, transform: 'translate(-50%, -50%)', width: '11%', maxWidth: 92 }
                      : { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '34%', maxWidth: 260, animation: champPhase === 'big' ? 'champDrop 1.4s ease-out forwards' : undefined }
                  }
                >
                  <div className={`flex flex-col items-center ${champPhase === 'place' ? '' : 'animate-pulse'}`}>
                    <div className={`w-full rounded-2xl shadow-2xl border-4 flex flex-col items-center justify-center text-center border-white/40 transition-all ${champPhase === 'place' ? '' : 'scale-100'}`}
                      style={{ background: 'linear-gradient(160deg, #e94560 0%, #c0392b 100%)', borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      <span className="text-[11px] font-black text-white/90 tracking-widest">{focusCard.position} · Nr. {focusCard.number}</span>
                      {focusCard.image ? (
                        <div className={`rounded-full overflow-hidden border-2 border-white/70 shadow-inner my-1 shrink-0 ${champPhase === 'place' ? 'h-9 w-9' : 'h-20 w-20 sm:h-28 sm:w-28'}`}>
                          <img src={focusCard.image} alt={focusCard.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className={`rounded-full bg-white/95 text-[#c0392b] font-black flex items-center justify-center shadow-inner my-1 ${champPhase === 'place' ? 'h-7 w-7 text-sm' : 'h-20 w-20 sm:h-28 sm:w-28 text-4xl'}`}>
                          {focusCard.number}
                        </span>
                      )}
                      <span className="font-black text-white leading-tight truncate max-w-full px-1">{focusCard.name}</span>
                    </div>
                    <div className="w-6 h-2 rounded-full bg-black/40 mt-2 mx-auto" />
                  </div>
                </div>

                {/* 📋 Trainer-Notiz neben dem großen Bild */}
                {champPhase !== 'place' && (
                  <div className="absolute z-30 right-4 top-1/2 -translate-y-1/2 w-[30%] max-w-[260px] bg-slate-950/95 border-2 border-amber-400/60 rounded-2xl p-3 shadow-2xl">
                    {champNoteOpen || champPhase === 'note' ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 border-b border-slate-700 pb-2">
                          <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center">{focusCard.number}</span>
                          <span className="font-black text-[11px] text-white uppercase truncate">{focusCard.name}</span>
                        </div>
                        <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Trainer-Anweisung · Position {focusCard.position}</p>
                        <p className="text-[11px] text-slate-200 leading-relaxed font-medium">{champInstructionFor(focus)}</p>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={champSkip}
                            className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow transition-all active:scale-95"
                            title="Schnell weiter (ohne warten)"
                          >
                            <Check size={12} /> Weiter ⏭
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => setChampNoteOpen(true)}
                          className="w-full flex flex-col items-center gap-1.5 py-2 text-center group"
                          title="Trainer: Rolle & Anweisung dieses Spielers anzeigen"
                        >
                          <span className="w-8 h-8 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 flex items-center justify-center group-hover:scale-110 transition-all">
                            <Eye size={15} />
                          </span>
                          <span className="text-[10px] font-black uppercase text-amber-300">Notiz anzeigen</span>
                          <span className="text-[9px] text-slate-400 font-semibold">Was muss {focusCard.name.split(' ')[0]} machen?</span>
                        </button>
                        <button
                          onClick={champSkip}
                          className="w-full flex items-center justify-center gap-1 bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow transition-all active:scale-95"
                          title="Schnell weiter ohne Notiz ansehen"
                        >
                          Weiter ohne Notiz ⏭
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Stadium-Lights Glow */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.18),transparent_45%)]" />
          </div>

          <div className="mt-3 w-full max-w-5xl flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
              {championsActiveCount >= championsTotal
                ? `${championsTotal} Spieler · Startformation ${selectedFormation} · ${activeClub?.name || 'FC Auggen'}`
                : `Spieler ${championsActiveCount + 1} von ${championsTotal} · ${focusCard ? focusCard.name : ''} (${focusCard ? focusCard.position : ''})${champPaused ? ' · ⏸ ANGEHALTEN' : ''}`}
            </p>
            {championsActiveCount >= championsTotal && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Alle 11 Spieler aufgestellt
                </span>
                <button onClick={replayChampions} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow transition-all">
                  <RefreshCw size={12} className="inline mr-1" /> Nochmal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
