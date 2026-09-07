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
   Search
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
}

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
        frames = await extractFrames(videoEl, 5);
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
      setAiAnalysisResult(result);
      setShowAiResults(true);

      if (result.sceneClips) {
        const aiClips = result.sceneClips.map((clip: any, idx: number) => {
          const categoryMap: Record<string, VideoCategory> = {
            'TORE': 'Tore',
            'CHANCEN': 'Tore',
            'STANDARDS': 'Standards',
            'PRESSING': 'Pressing MIT Ball',
            'AUFBAU': 'Spielaufbau',
            'UMSCHALTMOMENTE': 'Ballverlust',
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
            tacticalNote: `${clip.aiCommentary || ''}\n\nBewertung: ${clip.tacticalRating || ''}\n\nVerbesserung: ${clip.improvementSuggestions || ''}`,
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
    } catch (err: any) {
      setAiAnalysisError(err.message || 'KI-Analyse fehlgeschlagen.');
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

  // Handle video loaded metadata
  const handleLoadedMetadata = () => {
    if (mainVideoRef.current) {
      const dur = mainVideoRef.current.duration || 0;
      setVideoDuration(dur);
      setCutStart(0);
      setCutEnd(Math.min(dur, 15));
      setCurrentTime(0);
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
      // Veo offers an embedded playback endpoint that serves the raw stream
      // for publicly shared matches.
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
    for (const candidate of candidates) {
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
                const count = savedClips.filter(c => c.label?.toLowerCase().includes(tag.toLowerCase().split(' ')[0])).length;
                return (
                  <div key={i} className="flex items-center justify-between px-2 py-1 bg-[#0D1117] rounded border border-[#1E293B]">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-[#10B981]' : 'bg-[#334155]'}`} />
                      <span className="text-[8px] font-bold text-[#94A3B8]">{tag}</span>
                    </div>
                    <span className="text-[8px] font-black text-[#60A5FA]">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TV-Grafiken Overlay Panel */}
          <div className="bg-[#0A1628] border border-[#A855F7]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#C084FC] tracking-widest mb-2">TV-Grafiken Overlay (Coach Paint™)</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { icon: '➡️', label: 'Passweg', active: true },
                { icon: '🏃', label: 'Laufweg', active: true },
                { icon: '🔴', label: 'Pressingzone', active: false },
                { icon: '🟢', label: 'Freiraum', active: false },
                { icon: '⚡', label: 'Sprint-Pfeil', active: true },
                { icon: '🎯', label: 'Torwahrscheinlichkeit', active: false },
                { icon: '🔵', label: 'Zonen-Overlay', active: false },
                { icon: '📐', label: 'Abseits-Linie', active: false },
              ].map((tool, i) => (
                <button key={i} className={`flex items-center gap-1 px-2 py-1.5 rounded text-[7px] font-bold border transition-all cursor-pointer ${
                  tool.active ? 'bg-[#A855F7]/20 border-[#A855F7]/50 text-[#C084FC]' : 'bg-[#0D1117] border-[#1E293B] text-[#64748B] hover:border-[#A855F7]/30'
                }`}>
                  <span>{tool.icon}</span> {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sequenzen-Übersicht */}
          <div className="bg-[#0A1628] border border-[#10B981]/30 rounded-xl p-3">
            <div className="text-[8px] font-black uppercase text-[#10B981] tracking-widest mb-2">Taktische Sequenzen</div>
            <div className="space-y-1">
              {[
                { name: 'Aufbau von hinten', clips: savedClips.filter(c => c.label?.includes('Aufbau')).length, icon: '🏗️' },
                { name: 'Pressing ausgelöst', clips: savedClips.filter(c => c.label?.includes('Press')).length, icon: '🔴' },
                { name: 'Umschaltmoment', clips: savedClips.filter(c => c.label?.includes('Umschalt')).length, icon: '⚡' },
                { name: 'Flügelüberladung', clips: savedClips.filter(c => c.label?.includes('Flügel')).length, icon: '🏃' },
                { name: 'Konterchance', clips: savedClips.filter(c => c.label?.includes('Konter')).length, icon: '🚀' },
                { name: 'Standards erarbeitet', clips: savedClips.filter(c => c.label?.includes('Standard')).length, icon: '📐' },
              ].map((seq, i) => (
                <div key={i} className="flex items-center justify-between px-2 py-1 bg-[#0D1117] rounded border border-[#1E293B]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px]">{seq.icon}</span>
                    <span className="text-[8px] font-bold text-[#94A3B8]">{seq.name}</span>
                  </div>
                  <span className={`text-[8px] font-black ${seq.clips > 0 ? 'text-[#10B981]' : 'text-[#334155]'}`}>{seq.clips}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GPS-Integration Bar */}
        <div className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-2.5 flex items-center gap-3 flex-wrap">
          <span className="text-[8px] font-black uppercase text-[#F59E0B] tracking-wider">GPS-Sync:</span>
          <span className="text-[7px] text-[#64748B]">Catapult Vector Daten mit Video-Timecode synchronisieren</span>
          <div className="flex items-center gap-1.5 ml-auto">
            <button className="px-2 py-1 bg-[#F59E0B]/20 border border-[#F59E0B]/40 text-[#F59E0B] text-[7px] font-bold rounded cursor-pointer hover:bg-[#F59E0B]/30">GPS-In Pocket-Overlay</button>
            <button className="px-2 py-1 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#60A5FA] text-[7px] font-bold rounded cursor-pointer hover:bg-[#2563EB]/30">Herzfrequenz-Balken</button>
            <button className="px-2 py-1 bg-[#EF4444]/20 border border-[#EF4444]/40 text-[#EF4444] text-[7px] font-bold rounded cursor-pointer hover:bg-[#EF4444]/30">Belastungs-Warnung</button>
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
              : 'Die KI analysiert 5 Frames aus dem Video und erkennt automatisch Spielszenen, Spieler-Positionen, Taktik und Schwachstellen.'}
          </p>
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
                {aiAnalysisResult.sceneClips.map((clip: any, idx: number) => (
                  <div key={clip.id || idx} className="bg-[#0D1117] border border-[#1E293B] rounded-xl p-3 flex items-start gap-3">
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
                ))}
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
                                <div className="text-[#64748B] text-xs font-bold flex flex-col items-center gap-1">
                                  <Film size={24} />
                                  <span>Video Clip</span>
                                </div>
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
      </div>

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
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#181C24] border border-[#2A3447] rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl text-white"
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
                  onClick={() => setActivePlaybackClip(null)}
                  className="p-1.5 bg-[#0F172A] hover:bg-[#20293A] text-white rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Player */}
              <div className="relative aspect-video bg-black flex items-center justify-center">
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
