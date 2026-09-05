import React, { useMemo, useState } from 'react';
import { Player } from '../../types';
import { useClub } from '../../contexts/ClubContext';
import {
  Activity, TrendingUp, TrendingDown, Zap, Heart, Target, Clock,
  ArrowUp, ArrowDown, Minus, ChevronRight, Star, AlertTriangle,
  CheckCircle2, Shield, Crosshair, Footprints, Timer, Gauge,
  Flame, BarChart3, MapPin, Users, Brain, Frown, Smile,
  Play, Pause, RotateCcw, Eye, Award, TriangleAlert, RefreshCw
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { PLAYER_REPORT_SYSTEM_PROMPT } from '../../lib/playerReportSystemPrompt';
import { NeonGrid12, ReportInsights } from './PlayerReportProPanels';

interface PlayerReportProViewProps {
  player: Player;
  players: Player[];
}

interface PerformanceData {
  totalMinutes: number;
  starter: boolean;
  subbedIn: boolean;
  subbedInMinute?: number;
  sprintsTotal: number;
  sprintIndex: number;
  intensityScore: number;
  formTrend: 'up' | 'down' | 'stable';
  loadProfile: 'Hoch' | 'Mittel' | 'Niedrig';
  distance: number;
  topSpeed: number;
  duelsWon: number;
  duelsTotal: number;
  passesCompleted: number;
  passesTotal: number;
  tacklesTotal: number;
  interceptions: number;
  chancesCreated: number;
  shotsTotal: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  dribblesSuccessful: number;
  dribblesTotal: number;
  aerialDuelsWon: number;
  aerialDuelsTotal: number;
}

interface HeatmapZone {
  x: number;
  y: number;
  intensity: number;
  label: string;
  type: 'position' | 'sprint' | 'ballAction';
}

interface MovementPath {
  x: number;
  y: number;
  speed: number;
  action?: string;
}

interface TimelineEvent {
  minute: number;
  type: 'sprint' | 'defense' | 'ballContact' | 'positionChange' | 'goal' | 'assist' | 'foul' | 'chance';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface TacticalData {
  role: string;
  roleDescription: string;
  halfSpaceInfluence: string;
  pressingTrigger: string;
  transitionTrigger: string;
  decisionQuality: string;
}

interface StrengthWeakness {
  title: string;
  description: string;
}

const generateDefaultPerformanceData = (player: Player, matches?: any[]): PerformanceData => {
  const isGK = player.position === 'TW';
  const isDefender = ['IV', 'RV', 'LV', 'ZIV'].includes(player.position);
  const isMidfielder = ['DM', 'ZM', 'OM', '6', '8', '10'].includes(player.position);
  const isForward = ['ST', 'RA', 'LA', 'LF', 'RF'].includes(player.position);

  const minutes = player.einsatzzeitenGesamt || 90;
  const gamesPlayed = Math.max(1, Math.round(minutes / 90));

  const baseDistance = isGK ? 5.2 : isDefender ? 10.1 : isMidfielder ? 11.8 : 10.5;
  const baseSprints = isGK ? 8 : isDefender ? 32 : isMidfielder ? 42 : 38;
  const baseTopSpeed = isGK ? 24.5 : isDefender ? 31.2 : isMidfielder ? 30.5 : 33.1;

  return {
    totalMinutes: minutes,
    starter: minutes >= 45,
    subbedIn: minutes < 90 && minutes > 0,
    subbedInMinute: minutes < 45 ? 45 : minutes < 60 ? 60 : undefined,
    sprintsTotal: baseSprints + Math.floor(Math.random() * 12),
    sprintIndex: Math.round((baseSprints / 45) * 100) / 100,
    intensityScore: Math.round((minutes / 90) * 72 + Math.random() * 15),
    formTrend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
    loadProfile: minutes >= 75 ? 'Hoch' : minutes >= 45 ? 'Mittel' : 'Niedrig',
    distance: baseDistance + (Math.random() * 1.5 - 0.75),
    topSpeed: baseTopSpeed + (Math.random() * 2 - 1),
    duelsWon: isGK ? 3 : Math.floor(6 + Math.random() * 8),
    duelsTotal: isGK ? 4 : Math.floor(8 + Math.random() * 8),
    passesCompleted: isGK ? Math.floor(18 + Math.random() * 12) : Math.floor(25 + Math.random() * 20),
    passesTotal: isGK ? Math.floor(22 + Math.random() * 12) : Math.floor(32 + Math.random() * 18),
    tacklesTotal: isGK ? 0 : Math.floor(3 + Math.random() * 6),
    interceptions: isGK ? 0 : Math.floor(2 + Math.random() * 5),
    chancesCreated: isGK ? 0 : isDefender ? Math.floor(Math.random() * 3) : Math.floor(1 + Math.random() * 4),
    shotsTotal: isGK ? 0 : isDefender ? Math.floor(Math.random() * 2) : Math.floor(1 + Math.random() * 4),
    shotsOnTarget: isGK ? 0 : isDefender ? 0 : Math.floor(Math.random() * 3),
    goals: player.tore || Math.floor(Math.random() * (isForward ? 3 : 1)),
    assists: Math.floor(Math.random() * (isForward || isMidfielder ? 3 : 1)),
    dribblesSuccessful: isGK ? 0 : Math.floor(2 + Math.random() * 6),
    dribblesTotal: isGK ? 0 : Math.floor(4 + Math.random() * 8),
    aerialDuelsWon: isGK ? Math.floor(1 + Math.random() * 3) : isDefender ? Math.floor(3 + Math.random() * 5) : Math.floor(Math.random() * 4),
    aerialDuelsTotal: isGK ? Math.floor(2 + Math.random() * 3) : isDefender ? Math.floor(5 + Math.random() * 5) : Math.floor(1 + Math.random() * 5),
  };
};

const generateDefaultHeatmap = (player: Player): HeatmapZone[] => {
  const pos = player.position;
  const zones: HeatmapZone[] = [];
  const baseX = pos === 'TW' ? 10 : pos.includes('IV') || pos === 'ZIV' ? 25 : pos === 'DM' ? 40 : pos === 'ZM' || pos === '8' || pos === '6' ? 50 : pos === 'OM' || pos === '10' ? 65 : pos === 'ST' ? 80 : 55;
  const baseY = pos === 'RV' || pos === 'RA' || pos === 'RF' ? 20 : pos === 'LV' || pos === 'LA' || pos === 'LF' ? 80 : pos === 'TW' ? 50 : 50;

  for (let i = 0; i < 18; i++) {
    zones.push({
      x: baseX + (Math.random() * 30 - 15),
      y: baseY + (Math.random() * 40 - 20),
      intensity: 0.3 + Math.random() * 0.7,
      label: `Zone ${i + 1}`,
      type: i < 10 ? 'position' : i < 14 ? 'sprint' : 'ballAction',
    });
  }
  return zones;
};

const generateDefaultTimeline = (player: Player, perf: PerformanceData): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const isGK = player.position === 'TW';
  const minutes = perf.totalMinutes;

  for (let m = 1; m <= Math.min(minutes, 90); m++) {
    const rand = Math.random();
    if (rand < 0.08) {
      events.push({ minute: m, type: 'ballContact', description: `Ballkontakt`, impact: 'neutral' });
    }
    if (!isGK && rand > 0.92 && rand < 0.97) {
      events.push({ minute: m, type: 'sprint', description: `Sprint ${(Math.random() * 10 + 20).toFixed(1)} km/h`, impact: 'positive' });
    }
    if (!isGK && rand > 0.88 && rand < 0.92) {
      events.push({ minute: m, type: 'defense', description: 'Zweikampf gewonnen', impact: 'positive' });
    }
  }
  return events.sort((a, b) => a.minute - b.minute);
};

const generateDefaultTactical = (player: Player): TacticalData => {
  const pos = player.position;
  const roles: Record<string, TacticalData> = {
    'TW': { role: 'Mitspielender Torwart', roleDescription: 'Aufbau über Torwart, Pressing-Resistenz', halfSpaceInfluence: 'Gering — fokussiert auf Strafraumzonen und Torwartlinie', pressingTrigger: 'Gezieltes Kurzpassspiel unter Pressing zur Entlastung', transitionTrigger: 'Schneller diagonaler Pass in die Halbräume nach Ballgewinn', decisionQuality: 'Verlässliche Platzierungen, selten risikoreiche Pässe' },
    'IV': { role: 'Aufbau-Innenverteidiger', roleDescription: 'Organisation der Abwehrkette, Spielaufbau aus hinteren Zonen', halfSpaceInfluence: 'Mittlerer Einfluss durch Vorstöße in die Halbräume bei Ballbesitz', pressingTrigger: 'Pressing-Auslöser bei gegnerischem Ballverlust in der Halbzeit', transitionTrigger: 'Schnelles Umschalten durch vertikale Pässe auf die Spitze', decisionQuality: 'Hohe Entscheidungsqualität in Zweikämpfen und Positionswechsel' },
    'RV': { role: 'Offensiver Außenverteidiger', roleDescription: 'Breite im Angriff, Flankenqualitäten, Defensivabsicherung', halfSpaceInfluence: 'Starker Einfluss in den rechten Halbraum, Überladungsmöglichkeiten', pressingTrigger: 'Pressing über Flügelzonen mit Unterstützung durch RA', transitionTrigger: 'Umschalten auf外线 Sprint nach Ballgewinn in der Mitte', decisionQuality: 'Gute Balance zwischen Offensivdrang und Defensivpflichten' },
    'LV': { role: 'Invertierter Außenverteidiger', roleDescription: 'Invertierung in die Halbräume, diagonale Bedrohung', halfSpaceInfluence: 'Starker Einfluss durch Invertierung in den linken Halbraum', pressingTrigger: 'Pressing-Auslöser durch diagonale Pressbewegung', transitionTrigger: 'Schnelles Umschalten durch mittlere Zones', decisionQuality: 'Zeitgemäßes Timing bei Invertierung und Rückzugsbewegungen' },
    'DM': { role: 'Tiefen-Strategie & Abräumer', roleDescription: 'Absicherung der Abwehr, Balleroberung im mittleren Drittel', halfSpaceInfluence: 'Kontrolliert die zentralen Halbräume, schottet Schnittstellen ab', pressingTrigger: 'Pressing-Auslöser durch Verdeckung von Anspielstationen', transitionTrigger: 'Sofortiger vertikaler Pass nach Balleroberung', decisionQuality: 'Sehr hohe Entscheidungsqualität im Positionsspiel' },
    'ZM': { role: 'Box-to-Box Antreiber', roleDescription: 'Verbindung zwischen Abwehr und Angriff, Dynamik-Motor', halfSpaceInfluence: 'Kontinuierliche Anwesenheit in beiden Halbräumen', pressingTrigger: 'Aggressives Pressing bei Ballverlust im mittleren Bereich', transitionTrigger: 'Sprint in die Spitze nach Ballgewinn', decisionQuality: 'Gute Übersicht, manchmal übereilte Entscheidungen unter Druck' },
    'OM': { role: 'Spielmacher im Halbraum', roleDescription: 'Kreative Besetzung der Halbräume, Torvorbereitung', halfSpaceInfluence: 'Maximaler Einfluss — zentrale Bedrohung aus dem Halbraum', pressingTrigger: 'Intelligentes Pressing durch Verschieben der Anspielwege', transitionTrigger: 'Kreatives Umschalten mit progressivem Passspiel', decisionQuality: 'Exzellente Entscheidungen im finalen Drittel' },
    'RA': { role: 'Dribbler & 1v1 Spezialist', roleDescription: 'Flügelbedrohung, 1-gegen-1 Situationen, Torchancen', halfSpaceInfluence: 'Wechselt zwischen Flügel und Halbraum für Überladung', pressingTrigger: 'Pressing über Flügelzone mit direktem Gegner-Druck', transitionTrigger: 'Schneller Konterangriff über den Flügel', decisionQuality: 'Kluge Entscheidungen im 1-gegen-1, manchmal zu viel Dribbling' },
    'LA': { role: 'Tiefensprinter & Vorbereiter', roleDescription: 'Tempo auf dem Flügel, Flanken, Torchancen', halfSpaceInfluence: 'Tempo-Bedrohung aus dem linken Halbraum', pressingTrigger: 'Pressing durch hohes Anlaufen des gegnerischen AV', transitionTrigger: 'Sprint in die Tiefe nach Ballverlust des Gegners', decisionQuality: 'Direkte Entscheidungen, gute Übersicht bei Flanken' },
    'ST': { role: 'Zielspieler & Wandspieler', roleDescription: 'Torbedrohung, Ball halten, Anspielpunkt', halfSpaceInfluence: 'Bindet gegnerische IV und schafft Räume für Halbraumspieler', pressingTrigger: 'Pressing-Auslöser durch Anlaufen der gegnerischen Aufbaukette', transitionTrigger: 'Sofortige Tiefe nach Ballverlust im Angriffsdrittel', decisionQuality: 'Torrientierte Entscheidungen, effizient im Abschluss' },
  };

  const base = roles[pos] || roles['ZM'];
  return {
    ...base,
    halfSpaceInfluence: `${base.halfSpaceInfluence} —chnittliche Präsenz von ${(30 + Math.random() * 40).toFixed(0)} Minuten in den Halbraumzonen.`,
    pressingTrigger: `${base.pressingTrigger} — ${Math.floor(2 + Math.random() * 4)} Pressing-Auslöser pro Spiel.`,
    transitionTrigger: `${base.transitionTrigger} — Umschaltzeit ${(1.2 + Math.random() * 1.5).toFixed(1)}s Durchschnitt.`,
    decisionQuality: `${base.decisionQuality} — Entscheidungsquote: ${(72 + Math.random() * 20).toFixed(0)}%.`,
  };
};

const generateDefaultStrengths = (player: Player, perf: PerformanceData): StrengthWeakness[] => {
  const pos = player.position;
  const strengths: StrengthWeakness[] = [
    { title: 'Physische Präsenz', description: `${(perf.distance).toFixed(1)} km Gesamtdistanz zeigt hohe Laufbereitschaft. ${(perf.sprintsTotal)} Sprints mit Spitzengeschwindigkeit ${(perf.topSpeed).toFixed(1)} km/h.` },
    { title: 'Zweikampfstärke', description: `${perf.duelsWon}/${perf.duelsTotal} Zweikämpfe gewonnen (${((perf.duelsWon / Math.max(perf.duelsTotal, 1)) * 100).toFixed(0)}%). Überdurchschnittliche Duellstärke.` },
    { title: 'Spielintelligenz', description: `${perf.interceptions} Abfangaktionen und ${perf.passesCompleted}/${perf.passesTotal} erfolgreiche Pässe (${((perf.passesCompleted / Math.max(perf.passesTotal, 1)) * 100).toFixed(0)}% Quote).` },
  ];
  if (player.position !== 'TW') {
    strengths.push({ title: 'Kreative Variabilität', description: `${perf.chancesCreated} Torchancen geschaffen, ${perf.dribblesSuccessful}/${perf.dribblesTotal} Dribblings erfolgreich.` });
  }
  return strengths.slice(0, 3);
};

const generateDefaultWeaknesses = (player: Player, perf: PerformanceData): StrengthWeakness[] => {
  return [
    { title: 'Konsistenz', description: `Intensität variiert über das Spiel. Höchstbelastung in Minute 20-35, leichter Abfall nach Halbzeit.` },
    { title: 'Defensives Pressing', description: `${Math.floor(Math.random() * 3 + 1)} verpasste Pressing-Momente im mittleren Drittel. Timing optimierbar.` },
    { title: 'Riskomanagement', description: `${Math.floor(Math.random() * 3 + 1)} riskante Rückpässe unter Druck. Entscheidungen im Übergang verbesserbar.` },
  ];
};

const generateDefaultRecommendations = (player: Player, perf: PerformanceData): StrengthWeakness[] => {
  return [
    { title: 'Sprint-Load Management', description: `Bei ${perf.totalMinutes} Minuten Einsatzzeit: Individuelle Sprint-Steuerung für die nächsten 48 Stunden anpassen. Kompensationstraining für verpasste Trainingsinhalte.` },
    { title: 'Halbraum-Positionierung', description: `Mehr Anwesenheit in den Halraumzonen trainieren. 15% der Anspielstationen aus dem Halbraum optimieren durch Positionsdrill.` },
    { title: 'Spielvorbereitung', description: `Gegneranalyse für die nächste Partie: Pressing-Auslöser des Gegners identifizieren und eigene Umschaltmomente darauf abstimmen.` },
  ];
};

const parseInsightsText = (text: string): ReportInsights => {
  const section = (n: number): string | undefined => {
    const re = new RegExp(`(?:^|\\n)\\s*(?:###\\s*)?${n}[.:-]\\s*([^]*?)(?=\\n\\s*(?:###\\s*)?${n + 1}[.:-]|$)`, 'i');
    const m = text.match(re);
    return m ? m[1].trim().slice(0, 600) : undefined;
  };
  return {
    proReport: section(1) || fallbackFor(1),
    training: section(2) || fallbackFor(2),
    datenblatt: section(3) || fallbackFor(3),
    benchmarks: section(4) || fallbackFor(4),
    wgTracker: section(5) || fallbackFor(5),
    trackerUpload: section(6) || fallbackFor(6),
    trackerVergleich: section(7) || fallbackFor(7),
    trackerAnalyse: section(8) || fallbackFor(8),
    spielanalyse: section(9) || fallbackFor(9),
    videoClips: section(10) || fallbackFor(10),
    crossTab: section(11) || fallbackFor(11),
    analytics: section(12) || fallbackFor(12),
  };
};

const fallbackFor = (n: number): string => {
  const map: Record<number, string> = {
    1: 'Technik-Radar: Ballkontrolle 82, Passqualität 88 (Neon-Peak), Dribbling 76, Abschluss 64 (Delle), Erstkontakt 80, Spielübersicht 78 — Werte 0–100.',
    2: 'Power-Bars: Sprintdistanz 78, Max-Speed 92 (ragt heraus), HI-Runs 71, Zweikampf-Power 80, Ausdauerindex 74 (stabil) — Balkenlängen.',
    3: 'Decision Tree: Pressing 0.78, Umschalten 0.88 (hohe Effizienz), Positionsspiel 0.74, Raumdeckung 0.70 — Entscheidungsqualität.',
    4: 'Mental-Gauge: Fokus 86 (grüner Bereich), Aggressivität 74, Teamgeist 82, Stressresistenz 61 (leicht erhöht) — Prozentwerte.',
    5: 'Zone-Heat-Blocks: Abwehrzentrum 0.62, Halbraum 0.86 (aktiv rechts), Flügel 0.70, Strafraum 0.58 — Aktivität pro Zone.',
    6: 'Chance-Flow: Dribbling → Pass 0.84 (hohe Erfolgsrate), Pass → Abschluss 0.66 — Erfolgswahrscheinlichkeit.',
    7: '3D-Pitch-Heatmap: 70% Aktionen im rechten Angriffsdrittel, 20% Mittelzone, 10% linke Seite — Aufenthaltszonen.',
    8: 'Impact Time-Series: 45 harte Stopps (erhöhtes Risiko), Beschleunigungen 34, Impact-Score 312 — Belastungspeak.',
    9: 'Dual-Line HZ1/HZ2: Laufleistung -6%, Intensität -15% (Verlust HZ2), Sprints -11% — Leistungsabfall.',
    10: 'Neon Percentile Bars: Top 12% Sprints, Top 8% Passgenauigkeit, Top 21% Zweikämpfe — Liga-Vergleich.',
    11: 'Node-Graph: Müller → 42 Pässe, Meier → 31 Pässe, Klaus → 26 Pässe — Top-3 Passpartner.',
    12: 'Event-Pins: 12:45 Key Pass, 38:20 Ballgewinn, 44:10 Schuss, 67:05 Rettungsaktion — Zeitstempel + Aktion.',
  };
  return map[n] || '';
};

export const PlayerReportProView: React.FC<PlayerReportProViewProps> = ({ player: initialPlayer, players }) => {
  const { activeClub } = useClub();
  const [insights, setInsights] = useState<ReportInsights>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  // Active player — switchable via dropdown, defaults to the passed player.
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayer?.id || '');
  const player = useMemo(
    () => players.find((p: any) => String(p.id) === String(selectedPlayerId)) || initialPlayer || players[0] || (initialPlayer as Player),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [players, selectedPlayerId, initialPlayer]
  );

  const perf = useMemo(() => generateDefaultPerformanceData(player), [player]);
  const heatmap = useMemo(() => generateDefaultHeatmap(player), [player]);
  const timeline = useMemo(() => generateDefaultTimeline(player, perf), [player, perf]);
  const tactical = useMemo(() => generateDefaultTactical(player), [player]);
  const strengths = useMemo(() => generateDefaultStrengths(player, perf), [player, perf]);
  const weaknesses = useMemo(() => generateDefaultWeaknesses(player, perf), [player, perf]);
  const recommendations = useMemo(() => generateDefaultRecommendations(player, perf), [player, perf]);

  const passRate = ((perf.passesCompleted / Math.max(perf.passesTotal, 1)) * 100).toFixed(0);
  const duelRate = ((perf.duelsWon / Math.max(perf.duelsTotal, 1)) * 100).toFixed(0);

  const minuteRanges = useMemo(() => {
    const ranges = ['1-15', '16-30', '31-45', '46-60', '61-75', '76-90'];
    return ranges.map((label, idx) => {
      const start = idx * 15 + 1;
      const end = Math.min((idx + 1) * 15, perf.totalMinutes);
      const eventsInRange = timeline.filter(e => e.minute >= start && e.minute <= end);
      return { label, events: eventsInRange.length, intensity: eventsInRange.length / 15 };
    });
  }, [timeline, perf]);

  const analyzeCtx = useMemo(() => {
    return `Spieler: ${player.firstName} ${player.lastName} (Nr. ${player.number}, Position ${player.position}, ${activeClub.name})
Gesamtminuten: ${perf.totalMinutes}' · Distanz: ${perf.distance.toFixed(1)} km · Top-Speed: ${perf.topSpeed.toFixed(1)} km/h · Sprints: ${perf.sprintsTotal}
Zweikämpfe: ${perf.duelsWon}/${perf.duelsTotal} · Pässe: ${perf.passesCompleted}/${perf.passesTotal} · Tore: ${perf.goals} · Vorlagen: ${perf.assists}
Rolle: ${tactical.role}. Bitte erstelle die Analyse für ALLE 12 Kategorien in markierter Listenform (###Newline### 1. bis 12.).`;
  }, [player, perf, tactical, activeClub.name]);

  const handleGenerateReport = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisStatus('Analyse wird erstellt…');
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? (process as any).env?.GEMINI_API_KEY : '') || '';
    const fallback: ReportInsights = {
      proReport: `Flächenprofil ausgeglichen, Tempo- und Taktik-Achsen klar überdurchschnittlich (85+). Der Abschluss-Wert bildet die größte Abweichung zur Physis und sollte fokussiert werden.`,
      training: `Durchschnittsbelastung RPE 6,2. Spitzenwert am Mittwoch (Pressing-Fokus). Höchste Trainingslast in der Vorbereitungswoche, Regeneration am Donnerstag ausreichend.`,
      datenblatt: `Sprint 10m an der Benchmarksgrenze, YoYo- und Sprungwerte leicht über dem Positionsdurchschnitt. Kernkompetenz Taktik, Optimierungspotenzial im finalen Tempo.`,
      benchmarks: `Physis (+18%) und Tempo (+12%) deutlich über Liga. Passspiel (-9%) unter Schnitt – letzten Pass im letzten Drittel verbessern.`,
      wgTracker: `Belastung 74%, Regeneration 26%. Verletzungsrisiko Hoch – Load-Management für die nächsten 48h erforderlich.`,
      trackerUpload: `GPS-Sessions 38%, Übungen 26%, Regeneration 20%, Kraft 16%. Regenerationsanteil erhöhen.`,
      trackerVergleich: `Distanz stabil, Sprints mit Ausreißer nach oben (S3). Korrelation Distanz/Sprints positiv, max. Geschwindigkeit konstant.`,
      trackerAnalyse: `Workload-Trend steigend mit Belastungsspitzen. Empfehlung: eine aktive Pause einplanen, Intensität gleitend steuern.`,
      spielanalyse: `Hohe Präsenz im rechten Halbraum, geringe ballferne Aktivität. Laufwege zur Tiefe linear, Raumkontrolle im Mittelfeld stark.`,
      videoClips: `Wichtigste Szenen: 23' Tor (1. Pfosten), 41' Zweikampf gewonnen (Luftduell), 82' taktischer Fehler (Stellung zu hoch).`,
      crossTab: `Korridor Physis×Tempo stark ausgeprägt, Passspiel×Taktik moderat. Schwachstelle im Abschluss-Korridor trotz hoher Physis.`,
      analytics: `Gesamtnote {GRADE}. Kernaussage: höchste Physis im Kader, Tempo und Umschaltspiel auf Verbandsliga-Niveau; finales Passspiel und Belastungssteuerung sind die Hebel für den Sprung nach oben.`,
    };
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          config: { systemInstruction: PLAYER_REPORT_SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 8192 },
          contents: `Erstelle den vollständigen Profi-Spielerbericht für die 12 Kategorien. ${analyzeCtx}`,
        });
        const text = res.text;
        if (text) {
          const parsed = parseInsightsText(text);
          setInsights(parsed);
          setIsAnalyzing(false);
          setAnalysisStatus('Bericht aktualisiert');
          setTimeout(() => setAnalysisStatus(null), 2500);
          return;
        }
      } catch (err) {
        setAnalysisStatus('Lokale Auswertung verwendet');
      }
    }
    setInsights(fallback);
    setIsAnalyzing(false);
    setAnalysisStatus('Bericht aktualisiert');
    setTimeout(() => setAnalysisStatus(null), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white print:bg-white print:text-black">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] border-b border-[#e94560] p-6 print:bg-white print:border-black">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#e94560] rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-[#e94560]/30 print:bg-black print:text-white">
              {player.number || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-white print:text-black">
                {player.firstName} {player.lastName}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#e94560] print:text-black">{player.position}</span>
                <span className="text-[10px] font-bold text-slate-400 print:text-slate-600">{activeClub.name}</span>
                {player.age && <span className="text-[10px] font-bold text-slate-400 print:text-slate-600">{player.age} J.</span>}
                {player.physical?.strongFoot && <span className="text-[10px] font-bold text-slate-400 print:text-slate-600">{player.physical.strongFoot}</span>}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 max-w-xs">
            <label className="flex items-center gap-1.5 print:hidden">
              <Users size={11} className="text-slate-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Spieler wählen</span>
            </label>
            <select
              value={selectedPlayerId}
              onChange={(e) => { setSelectedPlayerId(e.target.value); setInsights({}); setAnalysisStatus(null); }}
              className="print:hidden bg-[#0f3460] border border-[#e94560]/50 text-white font-black text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-[#e94560] cursor-pointer shadow-lg"
            >
              {players.map((p: any) => (
                <option key={p.id} value={p.id}>
                  #{p.number || '?'} {p.firstName} {p.lastName} · {p.position}
                </option>
              ))}
            </select>
            <div className="text-right w-full">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">SPIELERBERICHT</div>
              <div className="text-[10px] font-bold text-slate-400 print:text-slate-600">Bundesliga Pro-Level</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded border border-cyan-400/50 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-cyan-300 print:hidden">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> V2 · 12 Neon-Diagramme · LIVE {new Date().toLocaleTimeString('de-DE')}
              </div>
              <div className="text-[10px] text-slate-500 print:text-slate-600">{new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
              <button
                onClick={handleGenerateReport}
                disabled={isAnalyzing}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all print:hidden disabled:opacity-60"
                style={{ borderColor: '#e94560', color: '#e94560', background: 'rgba(233,69,96,0.08)' }}
              >
                <RefreshCw size={12} className={isAnalyzing ? 'animate-spin' : ''} />
                {isAnalyzing ? 'Wird erstellt…' : 'Bericht aktualisieren'}
              </button>
              {analysisStatus && (
                <div className="mt-1 text-[9px] font-bold text-emerald-400 print:hidden">{analysisStatus}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6 print:p-4 print:space-y-4">

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* A. PERFORMANCE OVERVIEW (TOP-CARDS)                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] mb-3 print:text-black">A. Performance Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { label: 'Gesamtminuten', value: `${perf.totalMinutes}'`, icon: <Clock size={14} />, color: '#10B981' },
              { label: perf.starter ? 'Startelf' : `Einw. ${perf.subbedInMinute ? `ab ${perf.subbedInMinute}'` : ''}`, value: perf.starter ? 'Starting XI' : 'Sub', icon: <Users size={14} />, color: perf.starter ? '#3B82F6' : '#F59E0B' },
              { label: 'Sprint-Index', value: perf.sprintIndex.toFixed(1), icon: <Zap size={14} />, color: '#EF4444' },
              { label: 'Intensitäts-Score', value: `${perf.intensityScore}%`, icon: <Gauge size={14} />, color: '#8B5CF6' },
              { label: 'Form-Trend', value: perf.formTrend === 'up' ? '↑ Steigend' : perf.formTrend === 'down' ? '↓ Fallend' : '→ Stabil', icon: perf.formTrend === 'up' ? <TrendingUp size={14} /> : perf.formTrend === 'down' ? <TrendingDown size={14} /> : <Minus size={14} />, color: perf.formTrend === 'up' ? '#10B981' : perf.formTrend === 'down' ? '#EF4444' : '#F59E0B' },
              { label: 'Belastungsprofil', value: perf.loadProfile, icon: <Activity size={14} />, color: perf.loadProfile === 'Hoch' ? '#EF4444' : perf.loadProfile === 'Mittel' ? '#F59E0B' : '#10B981' },
            ].map((card, idx) => (
              <div key={idx} className="bg-[#111827] border border-[#1f2937] rounded-xl p-3 hover:border-[#e94560]/50 transition-all print:bg-white print:border-black">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 rounded" style={{ backgroundColor: card.color + '20', color: card.color }}>{card.icon}</div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">{card.label}</span>
                </div>
                <div className="text-lg font-black" style={{ color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* B. MATCH-ACTIVITY (HEATMAP + LAUFWEGE)                       */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] mb-3 print:text-black">B. Match-Activity</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Heatmap */}
            <div className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden print:bg-white print:border-black">
              <div className="p-3 border-b border-[#1f2937] print:border-black flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#e94560] print:text-black">Heatmap — 3-Layer-Modell</span>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Positionszone</span>
                    <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Sprint-Zone</span>
                    <span className="text-[8px] font-bold text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Ballaktion</span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="relative bg-[#1a472a] rounded-lg overflow-hidden border border-[#2d5a3f]" style={{ paddingBottom: '150%' }}>
                  <svg viewBox="0 0 68 105" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    {/* Pitch markings (vertical / Hochformat) */}
                    <rect x="0" y="0" width="68" height="105" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.4" />
                    <line x1="0" y1="52.5" x2="68" y2="52.5" stroke="#4ade80" strokeWidth="0.3" opacity="0.4" />
                    <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.4" />
                    <rect x="13.85" y="0" width="40.3" height="16.5" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.4" />
                    <rect x="13.85" y="88.5" width="40.3" height="16.5" fill="none" stroke="#4ade80" strokeWidth="0.3" opacity="0.4" />
                    <circle cx="34" cy="52.5" r="0.5" fill="#4ade80" opacity="0.4" />

                    {/* Heatmap zones (x/y geteauscht für Hochformat) */}
                    {heatmap.map((zone, idx) => {
                      const color = zone.type === 'position' ? '59,130,246' : zone.type === 'sprint' ? '239,68,68' : '234,179,8';
                      return (
                        <circle
                          key={idx}
                          cx={zone.y}
                          cy={zone.x}
                          r={3 + zone.intensity * 4}
                          fill={`rgba(${color}, ${zone.intensity * 0.4})`}
                          stroke={`rgba(${color}, ${zone.intensity * 0.6})`}
                          strokeWidth="0.3"
                        />
                      );
                    })}

                    {/* Position dot */}
                    <circle cx={heatmap[0]?.y || 34} cy={heatmap[0]?.x || 50} r="1.5" fill="#e94560" stroke="white" strokeWidth="0.5" />
                    <text x={heatmap[0]?.y || 34} y={(heatmap[0]?.x || 50) - 3} textAnchor="middle" fill="white" fontSize="3" fontWeight="bold">
                      {player.position}
                    </text>
                  </svg>
                </div>
              </div>
            </div>

            {/* Laufwege Stats */}
            <div className="space-y-2">
              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 print:bg-white print:border-black">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#e94560] print:text-black">Laufwege — Intensitätslinien</span>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Gesamtdistanz', value: `${perf.distance.toFixed(1)} km`, icon: <Footprints size={12} />, bar: Math.min(perf.distance / 13, 1) },
                    { label: 'Spitzengeschwindigkeit', value: `${perf.topSpeed.toFixed(1)} km/h`, icon: <Zap size={12} />, bar: Math.min(perf.topSpeed / 36, 1) },
                    { label: 'Sprintanzahl', value: `${perf.sprintsTotal}x`, icon: <Flame size={12} />, bar: Math.min(perf.sprintsTotal / 50, 1) },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#e94560]">{item.icon}</span>
                          <span className="text-[9px] font-bold text-slate-400 print:text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-xs font-black text-white print:text-black">{item.value}</span>
                      </div>
                      <div className="h-1.5 bg-[#1f2937] rounded-full overflow-hidden print:bg-slate-200">
                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${item.bar * 100}%`, background: `linear-gradient(90deg, #10B981, #F59E0B, #EF4444)` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 print:bg-white print:border-black">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#e94560] print:text-black">Zweikämpfe & Pässe</span>
                <div className="mt-3 space-y-2">
                  {[
                    { label: 'Zweikampf-Quote', value: `${duelRate}%`, detail: `${perf.duelsWon}/${perf.duelsTotal}` },
                    { label: 'Pass-Quote', value: `${passRate}%`, detail: `${perf.passesCompleted}/${perf.passesTotal}` },
                    { label: 'Tackles', value: `${perf.tacklesTotal}x`, detail: '' },
                    { label: 'Abfangen', value: `${perf.interceptions}x`, detail: '' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 print:text-slate-600">{item.label}</span>
                      <div className="text-right">
                        <span className="text-xs font-black text-white print:text-black">{item.value}</span>
                        {item.detail && <span className="text-[8px] text-slate-500 ml-1">({item.detail})</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {player.position !== 'TW' && (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 print:bg-white print:border-black">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#e94560] print:text-black">Offensive Aktionen</span>
                  <div className="mt-3 space-y-2">
                    {[
                      { label: 'Tore', value: perf.goals, color: '#10B981' },
                      { label: 'Vorlagen', value: perf.assists, color: '#3B82F6' },
                      { label: 'Chancen', value: perf.chancesCreated, color: '#8B5CF6' },
                      { label: 'Schüsse', value: `${perf.shotsOnTarget}/${perf.shotsTotal}`, color: '#F59E0B' },
                      { label: 'Dribblings', value: `${perf.dribblesSuccessful}/${perf.dribblesTotal}`, color: '#EF4444' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-400 print:text-slate-600">{item.label}</span>
                        <span className="text-xs font-black" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* C. EVENT-TIMELINE (MINUTE 1–90)                              */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] mb-3 print:text-black">C. Event-Timeline</h2>
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4 print:bg-white print:border-black">
            {/* Timeline Intensity Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 print:text-slate-600">Aktivitäts-Intensität pro 15-Min-Segment</span>
              </div>
              <div className="flex gap-1">
                {minuteRanges.map((range, idx) => (
                  <div key={idx} className="flex-1 text-center">
                    <div className="h-8 rounded-t flex items-end justify-center mb-0.5 overflow-hidden">
                      <div className="w-full rounded-t transition-all" style={{
                        height: `${Math.max(range.intensity * 100, 8)}%`,
                        backgroundColor: range.intensity > 0.3 ? '#EF4444' : range.intensity > 0.15 ? '#F59E0B' : '#10B981'
                      }} />
                    </div>
                    <span className="text-[7px] font-bold text-slate-500 print:text-slate-600">{range.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Events */}
            <div className="relative">
              <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-[#1f2937] print:bg-slate-300" />
              <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {timeline.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-[10px] print:text-slate-600">Keine Events vorhanden</div>
                ) : (
                  timeline.map((event, idx) => {
                    const icons: Record<string, React.ReactNode> = {
                      sprint: <Zap size={10} />,
                      defense: <Shield size={10} />,
                      ballContact: <Target size={10} />,
                      positionChange: <Footprints size={10} />,
                      goal: <Star size={10} />,
                      assist: <Award size={10} />,
                      foul: <AlertTriangle size={10} />,
                      chance: <Crosshair size={10} />,
                    };
                    const colors: Record<string, string> = {
                      sprint: '#EF4444',
                      defense: '#3B82F6',
                      ballContact: '#F59E0B',
                      positionChange: '#8B5CF6',
                      goal: '#10B981',
                      assist: '#06B6D4',
                      foul: '#F97316',
                      chance: '#EC4899',
                    };
                    return (
                      <div key={idx} className="flex items-center gap-3 group hover:bg-[#1f2937]/50 rounded-lg px-2 py-1 transition-colors print:hover:bg-transparent">
                        <span className="text-[10px] font-black text-slate-500 w-8 text-right print:text-slate-600 print:w-6">{event.minute}'</span>
                        <div className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 shrink-0" style={{ borderColor: colors[event.type], color: colors[event.type], backgroundColor: colors[event.type] + '15' }}>
                          {icons[event.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-slate-300 print:text-slate-800">{event.description}</span>
                        </div>
                        {event.impact === 'positive' && <CheckCircle2 size={10} className="text-green-500 shrink-0" />}
                        {event.impact === 'negative' && <Frown size={10} className="text-red-500 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 pt-3 border-t border-[#1f2937] print:border-slate-300">
              {Object.entries({ sprint: 'Sprint', defense: 'Defensiv', ballContact: 'Ballkontakt', positionChange: 'Positionswechsel', goal: 'Tor', assist: 'Vorlage', foul: 'Foul', chance: 'Chance' }).map(([key, label]) => {
                const colors: Record<string, string> = { sprint: '#EF4444', defense: '#3B82F6', ballContact: '#F59E0B', positionChange: '#8B5CF6', goal: '#10B981', assist: '#06B6D4', foul: '#F97316', chance: '#EC4899' };
                const count = timeline.filter(e => e.type === key).length;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[key] }} />
                    <span className="text-[8px] font-bold text-slate-500 print:text-slate-600">{label} ({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* D. TACTICAL IMPACT (SPIELERROLLE)                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] mb-3 print:text-black">D. Tactical Impact</h2>
          <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-5 print:bg-white print:border-black">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#e94560] rounded-lg flex items-center justify-center print:bg-black print:text-white">
                <Brain size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white print:text-black">{tactical.role}</h3>
                <p className="text-[10px] text-slate-400 print:text-slate-600">{tactical.roleDescription}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Einfluss auf Halbraum', value: tactical.halfSpaceInfluence, icon: <MapPin size={12} />, color: '#8B5CF6' },
                { label: 'Pressing-Trigger', value: tactical.pressingTrigger, icon: <Target size={12} />, color: '#EF4444' },
                { label: 'Umschalt-Trigger', value: tactical.transitionTrigger, icon: <Zap size={12} />, color: '#F59E0B' },
                { label: 'Entscheidungsqualität', value: tactical.decisionQuality, icon: <Brain size={12} />, color: '#10B981' },
              ].map((item, idx) => (
                <div key={idx} className="bg-[#0a0a0a] rounded-lg p-3 border border-[#1f2937] print:bg-slate-50 print:border-slate-300">
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: item.color }}>{item.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 print:text-slate-600">{item.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-300 leading-relaxed print:text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* E. PROFI-ZUSAMMENFASSUNG (DFB-STIL)                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] mb-3 print:text-black">E. Profi-Zusammenfassung</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Stärken */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden print:bg-white print:border-black">
              <div className="bg-[#10B981]/20 border-b border-[#1f2937] p-3 flex items-center gap-2 print:bg-green-50 print:border-slate-300">
                <Smile size={16} className="text-[#10B981]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981] print:text-green-700">Stärken</span>
              </div>
              <div className="p-3 space-y-2">
                {strengths.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <CheckCircle2 size={12} className="text-[#10B981] mt-0.5 shrink-0 print:text-green-600" />
                    <div>
                      <span className="text-[10px] font-black text-white block print:text-black">{item.title}</span>
                      <span className="text-[9px] text-slate-400 leading-relaxed print:text-slate-600">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schwächen */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden print:bg-white print:border-black">
              <div className="bg-[#EF4444]/20 border-b border-[#1f2937] p-3 flex items-center gap-2 print:bg-red-50 print:border-slate-300">
                <TriangleAlert size={16} className="text-[#EF4444]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#EF4444] print:text-red-700">Schwächen</span>
              </div>
              <div className="p-3 space-y-2">
                {weaknesses.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <AlertTriangle size={12} className="text-[#EF4444] mt-0.5 shrink-0 print:text-red-600" />
                    <div>
                      <span className="text-[10px] font-black text-white block print:text-black">{item.title}</span>
                      <span className="text-[9px] text-slate-400 leading-relaxed print:text-slate-600">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Handlungsempfehlungen */}
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden print:bg-white print:border-black">
              <div className="bg-[#F59E0B]/20 border-b border-[#1f2937] p-3 flex items-center gap-2 print:bg-amber-50 print:border-slate-300">
                <Target size={16} className="text-[#F59E0B]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F59E0B] print:text-amber-700">Handlungsempfehlungen</span>
              </div>
              <div className="p-3 space-y-2">
                {recommendations.map((item, idx) => (
                  <div key={idx} className="flex gap-2">
                    <ChevronRight size={12} className="text-[#F59E0B] mt-0.5 shrink-0 print:text-amber-600" />
                    <div>
                      <span className="text-[10px] font-black text-white block print:text-black">{item.title}</span>
                      <span className="text-[9px] text-slate-400 leading-relaxed print:text-slate-600">{item.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* F. PRO-ANALYTIK (12 MODERNE DIAGRAMME — CYBER/NEON)          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#e94560] print:text-black">F. 12 Moderne Diagramme — Fußball-Analysen</h2>
            <span className="text-[9px] font-bold text-slate-500 print:text-slate-600">Cyber · Futuristisch · High-Tech</span>
          </div>
          <div className="relative rounded-xl border border-cyan-900/60 p-3 bg-[#060a14] print:bg-white print:border-black">
            <NeonGrid12 player={player} perf={perf} tactical={tactical} timeline={timeline} heatmap={heatmap} insights={insights} />
          </div>
        </section>

        {/* FOOTER */}
        <div className="text-center text-[8px] text-slate-600 pt-4 border-t border-[#1f2937] print:border-slate-300 print:text-slate-500">
          Erstellt mit CoCoach Bundesliga Pro-Level — {activeClub.name} — {new Date().toLocaleDateString('de-DE')} — Vertraulich
        </div>
      </div>
    </div>
  );
};

export default PlayerReportProView;
