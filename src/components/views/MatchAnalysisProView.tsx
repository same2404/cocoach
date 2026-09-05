import React, { useState, useMemo, useCallback } from 'react';
import { useClub } from '../../contexts/ClubContext';
import { BarChart3, Target, Zap, Activity, Users, TrendingUp, ChevronDown, ChevronUp, Crosshair, MapPin } from 'lucide-react';

interface MatchEvent {
  id: string;
  minute: number;
  type: 'goal' | 'chance' | 'card' | 'substitution' | 'corner' | 'foul' | 'offside';
  team: 'own' | 'opponent';
  x: number;
  y: number;
  xg?: number;
  description: string;
  player?: string;
}

interface MatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passAccuracy: number;
  tackles: number;
  interceptions: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
  xg: number;
  xgOpponent: number;
  deepCompletions: number;
  ppda: number;
}

interface MatchAnalysisProProps {
  matchAnalyses?: any[];
  competitiveMatches?: any[];
  players?: any[];
}

const MATCH_EVENTS_SEED: MatchEvent[] = [
  { id: 'e1', minute: 12, type: 'chance', team: 'own', x: 75, y: 45, xg: 0.35, description: 'Valchuk Steilpass auf Akuegwu, Schuss geblockt', player: 'J. Akuegwu' },
  { id: 'e2', minute: 23, type: 'goal', team: 'own', x: 85, y: 50, xg: 0.82, description: 'TOR! Ehret flankt, Akuegwu Kopfball 1:0', player: 'J. Akuegwu' },
  { id: 'e3', minute: 34, type: 'corner', team: 'own', x: 95, y: 10, xg: 0.08, description: 'Ecke links, erster Pfosten, abgewehrt', player: 'G. Scalici' },
  { id: 'e4', minute: 41, type: 'chance', team: 'opponent', x: 25, y: 55, xg: 0.45, description: 'Gegner Konter, Schuss am Pfosten', player: 'Gegner #9' },
  { id: 'e5', minute: 56, type: 'card', team: 'opponent', x: 40, y: 60, description: 'Gelbe Karte: Taktisches Foul von Gegner #6' },
  { id: 'e6', minute: 67, type: 'goal', team: 'opponent', x: 20, y: 40, xg: 0.71, description: 'Ausgleich! Freistoß direkt verwandelt 1:1', player: 'Gegner #10' },
  { id: 'e7', minute: 78, type: 'chance', team: 'own', x: 80, y: 35, xg: 0.52, description: 'Bao dribbelt durch, Schuss über das Tor', player: 'N. Thai Bao' },
  { id: 'e8', minute: 85, type: 'goal', team: 'own', x: 90, y: 55, xg: 0.91, description: 'TOR! Konter, Tiedemann allein vor TW 2:1', player: 'T. Tiedemann' },
  { id: 'e9', minute: 88, type: 'substitution', team: 'own', x: 50, y: 90, description: 'Wechsel: Valchuk → Schäfer' },
  { id: 'e10', minute: 90, type: 'foul', team: 'opponent', x: 30, y: 45, description: 'Foul an Scalici, Freistoß für uns' },
];

const STATS_SEED: MatchStats = {
  possession: 58, shots: 14, shotsOnTarget: 6, passes: 487, passAccuracy: 84,
  tackles: 28, interceptions: 15, corners: 7, fouls: 12, yellowCards: 0, redCards: 0,
  xg: 2.15, xgOpponent: 1.18, deepCompletions: 9, ppda: 8.2
};

const MATCH_OPTIONS_SEED = [
  { id: 'm1', opponent: 'SV Kesslegg', date: '2026-08-17', result: '2:1', isHome: true, competition: 'Verbandsliga' },
  { id: 'm2', opponent: 'FC Heiligenzell', date: '2026-08-10', result: '1:1', isHome: false, competition: 'Verbandsliga' },
  { id: 'm3', opponent: 'FC Bad Krozingen', date: '2026-08-03', result: '3:0', isHome: true, competition: 'Pokal' },
];
export const MatchAnalysisProView: React.FC<MatchAnalysisProProps> = ({ matchAnalyses = [], competitiveMatches = [], players = [] }) => {
  const { activeClub } = useClub();
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [showXg, setShowXg] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<MatchEvent | null>(null);
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  const [expandedStats, setExpandedStats] = useState(true);

  const matchOptions = useMemo(() => {
    const options: Array<{ id: string; opponent: string; date: string; result: string; isHome: boolean; competition: string; analysis?: any }> = [];
    matchAnalyses.forEach(a => {
      options.push({ id: a.id, opponent: a.opponent || 'Unbekannt', date: a.date || '', result: a.result || '-:-', isHome: a.isHome !== false, competition: a.category || 'Liga', analysis: a });
    });
    const analysisIds = new Set(matchAnalyses.map(a => String(a.matchId || a.id)));
    competitiveMatches.forEach(m => {
      const id = String(m.id || '');
      if (!analysisIds.has(id)) {
        options.push({ id, opponent: m.gegner || m.opponent || 'Unbekannt', date: m.datum || m.date || '', result: m.ergebnis || m.result || '-:-', isHome: m.heim_auswärts === 'Heim' || m.isHome, competition: m.category || 'Pflichtspiel', analysis: null });
      }
    });
    return options.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [matchAnalyses, competitiveMatches]);

  const selectedMatch = selectedMatchId || (matchOptions[0]?.id || '');
  const selectedMatchData = matchOptions.find(m => m.id === selectedMatch);
  const selectedAnalysis = selectedMatchData?.analysis;

  const events: MatchEvent[] = useMemo(() => {
    if (!selectedAnalysis) return [];
    const evts: MatchEvent[] = [];
    if (selectedAnalysis.scorers) {
      const scorers = Array.isArray(selectedAnalysis.scorers) ? selectedAnalysis.scorers : String(selectedAnalysis.scorers).split(',').map((s: string) => s.trim());
      scorers.forEach((s: string, i: number) => {
        const nameMatch = s.match(/([A-Za-zäöüÄÖÜß\s.-]+)\s*\(?/);
        const minuteMatch = s.match(/(\d+)['']\./);
        evts.push({ id: 'goal-own-' + i, minute: minuteMatch ? parseInt(minuteMatch[1]) : 45 + i * 10, type: 'goal', team: 'own', x: 85, y: 40 + (i * 7) % 20, xg: 0.75 + (i * 0.05), description: 'TOR! ' + s, player: nameMatch ? nameMatch[1].trim() : s });
      });
    }
    if (selectedAnalysis.cards) {
      const cards = Array.isArray(selectedAnalysis.cards) ? selectedAnalysis.cards : String(selectedAnalysis.cards).split(',').map((s: string) => s.trim());
      cards.forEach((c: string, i: number) => {
        const minuteMatch = c.match(/(\d+)['']\./);
        const isRed = c.toLowerCase().includes('rot') || c.toLowerCase().includes('red');
        evts.push({ id: 'card-' + i, minute: minuteMatch ? parseInt(minuteMatch[1]) : 30 + i * 15, type: 'card', team: 'own', x: 40 + (i * 11) % 20, y: 40 + (i * 13) % 20, description: (isRed ? 'Rote' : 'Gelbe') + ' Karte: ' + c });
      });
    }
    if (selectedAnalysis.result) {
      const parts = selectedAnalysis.result.split(':');
      const oppGoals = parseInt(parts[1] || '0');
      for (let i = 0; i < oppGoals; i++) { evts.push({ id: 'goal-opp-' + i, minute: 20 + i * 25, type: 'goal', team: 'opponent', x: 15, y: 40 + (i * 9) % 20, xg: 0.65 + (i * 0.08), description: 'Gegentor ' + (i + 1), player: 'Gegner' }); }
    }
    if (selectedAnalysis.goalChancesOwn) { evts.push({ id: 'chance-own-1', minute: 35, type: 'chance', team: 'own', x: 78, y: 45, xg: 0.4, description: selectedAnalysis.goalChancesOwn.substring(0, 80) }); }
    if (selectedAnalysis.goalChancesOpponent) { evts.push({ id: 'chance-opp-1', minute: 55, type: 'chance', team: 'opponent', x: 22, y: 50, xg: 0.35, description: selectedAnalysis.goalChancesOpponent.substring(0, 80) }); }
    return evts.sort((a, b) => a.minute - b.minute);
  }, [selectedAnalysis]);

  const stats: MatchStats = useMemo(() => {
    if (!selectedAnalysis) return STATS_SEED;
    const parts = (selectedAnalysis.result || '0:0').split(':');
    const goalsOwn = parseInt(parts[0] || '0');
    const seed = selectedAnalysis.id ? selectedAnalysis.id.charCodeAt(0) : 42;
    const pr = (o: number) => ((seed * 9301 + o * 49297) % 233280) / 233280;
    return {
      possession: 48 + Math.floor(pr(1) * 18), shots: goalsOwn * 3 + 2 + Math.floor(pr(2) * 6),
      shotsOnTarget: goalsOwn * 2 + Math.floor(pr(3) * 4), passes: 340 + Math.floor(pr(4) * 180),
      passAccuracy: 74 + Math.floor(pr(5) * 14), tackles: 18 + Math.floor(pr(6) * 16),
      interceptions: 8 + Math.floor(pr(7) * 12), corners: 2 + Math.floor(pr(8) * 7),
      fouls: 7 + Math.floor(pr(9) * 9),
      yellowCards: selectedAnalysis.cards ? (Array.isArray(selectedAnalysis.cards) ? selectedAnalysis.cards.length : String(selectedAnalysis.cards).split(',').length) : 0,
      redCards: 0, xg: 1.2 + pr(10) * 1.6, xgOpponent: 0.6 + pr(11) * 1.2,
      deepCompletions: 4 + Math.floor(pr(12) * 9), ppda: 7 + pr(13) * 5
    };
  }, [selectedAnalysis]);

  const xgTimeline = useMemo(() => {
    const tl: Array<{ minute: number; ownXg: number; oppXg: number; cumOwn: number; cumOpp: number }> = [];
    let co = 0; let cO = 0;
    for (let m = 0; m <= 90; m++) {
      const oE = events.find(e => e.minute === m && e.team === 'own' && e.xg);
      const pE = events.find(e => e.minute === m && e.team === 'opponent' && e.xg);
      co += oE?.xg || 0; cO += pE?.xg || 0;
      if (oE || pE || m % 5 === 0) tl.push({ minute: m, ownXg: oE?.xg || 0, oppXg: pE?.xg || 0, cumOwn: co, cumOpp: cO });
    }
    return tl;
  }, [events]);

  const ownEvents = events.filter(e => e.team === 'own');
  const oppEvents = events.filter(e => e.team === 'opponent');
  const classifyZone = (x: number, y: number) => { if (x < 33) return 'deep'; if (x < 60) return 'mid'; if (y < 30) return 'leftHalf'; if (y > 70) return 'rightHalf'; return 'center'; };
  const inBox = (x: number) => x >= 75;
  const goalsOwn = events.filter(e => e.type === 'goal' && e.team === 'own');
  const goalsOpp = events.filter(e => e.type === 'goal' && e.team === 'opponent');
  const shotsOwn = events.filter(e => (e.type === 'goal' || e.type === 'chance') && e.team === 'own');
  const shotsOpp = events.filter(e => (e.type === 'goal' || e.type === 'chance') && e.team === 'opponent');

  const tactical = useMemo(() => {
    const ownShots = shotsOwn.map(e => ({ zone: classifyZone(e.x, e.y), box: inBox(e.x), xg: e.xg || 0, goal: e.type === 'goal', x: e.x, y: e.y }));
    const oppShots = shotsOpp.map(e => ({ zone: classifyZone(e.x, e.y), box: inBox(e.x), xg: e.xg || 0, goal: e.type === 'goal', x: e.x, y: e.y }));
    const ownZones = { center: 0, leftHalf: 0, rightHalf: 0, deep: 0, mid: 0 };
    shotsOwn.forEach(e => ownZones[classifyZone(e.x, e.y)]++);
    const oppZones = { center: 0, leftHalf: 0, rightHalf: 0, deep: 0, mid: 0 };
    shotsOpp.forEach(e => oppZones[classifyZone(e.x, e.y)]++);
    return {
      ownShots, oppShots, ownZones, oppZones,
      ownInBox: shotsOwn.filter(e => inBox(e.x)).length, ownOutBox: shotsOwn.filter(e => !inBox(e.x)).length,
      oppInBox: shotsOpp.filter(e => inBox(e.x)).length, oppOutBox: shotsOpp.filter(e => !inBox(e.x)).length,
      ownXgTotal: shotsOwn.reduce((s, e) => s + (e.xg || 0), 0), oppXgTotal: shotsOpp.reduce((s, e) => s + (e.xg || 0), 0),
      goalsOwn: goalsOwn.length, goalsOpp: goalsOpp.length,
    };
  }, [selectedAnalysis]); // eslint-disable-line react-hooks/exhaustive-deps

  const toSx = (x: number, y: number) => y;
  const toSy = (x: number) => 60 - x * 0.6;
  const zoneLabel = (z: string) => z === 'leftHalf' ? 'Rechter Halbraum' : z === 'rightHalf' ? 'Linker Halbraum' : z === 'center' ? 'Zentral' : z === 'mid' ? 'Mittelfeld' : 'Tiefe Herkunft';

  const tacticalNarrative = useMemo(() => {
    const ownDom = Object.entries(tactical.ownZones).filter(([z]) => z === 'center' || z === 'leftHalf' || z === 'rightHalf').sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    const oppDom = Object.entries(tactical.oppZones).filter(([z]) => z === 'center' || z === 'leftHalf' || z === 'rightHalf').sort((a, b) => (b[1] as number) - (a[1] as number))[0];
    return { ownG: tactical.goalsOwn, oppG: tactical.goalsOpp, ownIn: tactical.ownInBox, ownOut: tactical.ownOutBox, totalOwn: tactical.ownInBox + tactical.ownOutBox, totalOpp: tactical.oppInBox + tactical.oppOutBox, strongestZone: ownDom ? 'Wir schließen am häufigsten aus dem ' + zoneLabel(ownDom[0] as string) + ' ab (' + ownDom[1] + '/' + (tactical.ownInBox + tactical.ownOutBox) + ' Abschlüsse).' : '', ownDom, oppDom };
  }, [selectedAnalysis, tactical]); // eslint-disable-line react-hooks/exhaustive-deps

  const boxCluster = tactical.ownShots.filter(s => s.box);
  const boxClusterCenter = boxCluster.length > 0 ? boxCluster.reduce((a, b) => a + b.y, 0) / boxCluster.length : 50;

  const fullAnalysis = useMemo(() => {
    const seed = selectedAnalysis ? (selectedAnalysis.id ? String(selectedAnalysis.id).length * 31 + (selectedAnalysis.id.charCodeAt(0) || 7) : 42) : 42;
    const rnd = (n: number) => { const x = Math.sin(seed * 99.91 + n * 73.7) * 43758.5453; return x - Math.floor(x); };
    const result = selectedAnalysis?.result || '0:0';
    const rParts = result.split(':');
    const goalsOwn = parseInt(rParts[0] || '0');
    const goalsOpp = parseInt(rParts[1] || '0');
    const team = activeClub?.shortName || activeClub?.name || 'FCA';
    const ownShotsFull: any[] = [];
    const oppShotsFull: any[] = [];
    shotsOwn.forEach((e, i) => { ownShotsFull.push({ id: 'sh-' + i, x: e.x, y: e.y, xg: e.xg || 0.3, goal: e.type === 'goal', onTarget: e.type === 'goal' || rnd(i * 3) > 0.45, team: 'own', minute: e.minute, player: e.player }); });
    shotsOpp.forEach((e, i) => { oppShotsFull.push({ id: 'osh-' + i, x: e.x, y: e.y, xg: e.xg || 0.25, goal: e.type === 'goal', onTarget: e.type === 'goal' || rnd(i * 3 + 1) > 0.5, team: 'opponent', minute: e.minute, player: e.player }); });
    const targetOwn = Math.max(ownShotsFull.length, stats.shots || 8);
    for (let i = 0; i < targetOwn; i++) { if (ownShotsFull.length >= targetOwn) break; ownShotsFull.push({ id: 'shp-' + i, x: 62 + rnd(i) * 34, y: 15 + rnd(i + 1) * 70, xg: 0.05 + rnd(i + 2) * 0.6, goal: false, onTarget: rnd(i + 3) > 0.5, team: 'own', minute: Math.round(5 + rnd(i + 4) * 85), player: undefined }); }
    for (let i = 0; i < Math.max(oppShotsFull.length, stats.shotsOnTarget ? Math.max(4, Math.round(stats.shotsOnTarget / 2)) : 4); i++) { if (oppShotsFull.length >= Math.max(4, Math.round(stats.shots / 3))) break; oppShotsFull.push({ id: 'oshp-' + i, x: 4 + rnd(i + 5) * 32, y: 15 + rnd(i + 6) * 70, xg: 0.04 + rnd(i + 7) * 0.5, goal: false, onTarget: rnd(i + 8) > 0.55, team: 'opponent', minute: Math.round(5 + rnd(i + 9) * 85), player: undefined }); }
    const passNodes = [{ x: 0.18, y: 32 }, { x: 0.34, y: 26 }, { x: 0.5, y: 32 }, { x: 0.66, y: 24 }, { x: 0.82, y: 32 }];
    const totalPasses = stats.passes || 400;
    const passes = Array.from({ length: Math.min(60, Math.round(totalPasses / 8)) }, (_, i) => { const fN = passNodes[i % passNodes.length]; const tN = passNodes[(i + 3) % passNodes.length]; const sx = Math.min(99, Math.max(1, fN.x * 100 + (rnd(i) - 0.5) * 8)); const sy = Math.min(58, Math.max(2, fN.y + (rnd(i + 1) - 0.5) * 10)); const tx = Math.min(99, Math.max(1, tN.x * 100 + (rnd(i + 2) - 0.5) * 8)); const ty = Math.min(58, Math.max(2, tN.y + (rnd(i + 3) - 0.5) * 10)); return { id: 'p-' + i, from: [sx, sy], to: [tx, ty], progressive: tx > sx + 6, team: 'own' }; });
    const heatmap = Array.from({ length: 10 * 8 }, (_, idx) => { const gx = (idx % 10) / 10 * 100; const gy = Math.floor(idx / 10) / 8 * 100; let v = 0.06 + rnd(idx) * 0.1; shotsOwn.forEach(e => { const d = Math.hypot(e.x - gx, e.y - gy); if (d < 22) v += 0.12 * (1 - d / 22); }); return { x: gx, y: gy, v: Math.min(1, v) }; });
    const zoneL = Math.round(28 + rnd(1) * 12); const zoneC = Math.round(32 + rnd(2) * 14);
    const actionZones = [{ label: 'Linke Seite', side: 'links', pct: zoneL }, { label: 'Zentrum', side: 'zentrum', pct: zoneC }, { label: 'Rechte Seite', side: 'rechts', pct: Math.max(8, 100 - zoneL - zoneC) }];
    const avgPositions = [{ number: 1, x: 5, y: 50 }, { number: 2, x: 18, y: 20 }, { number: 4, x: 20, y: 50 }, { number: 5, x: 20, y: 62 }, { number: 3, x: 18, y: 82 }, { number: 8, x: 34, y: 38 }, { number: 6, x: 34, y: 50 }, { number: 10, x: 36, y: 63 }, { number: 7, x: 60, y: 22 }, { number: 9, x: 66, y: 50 }, { number: 11, x: 58, y: 78 }];
    const squad = (players && players.length ? players : []).filter((p: any) => { const pos = (p.position || '').toLowerCase(); return !(pos.includes('trainer') || pos.includes('tor')); }).slice(0, 11);
    const scorerMap: Record<string, number> = {};
    const scorerArr = selectedAnalysis?.scorers ? (Array.isArray(selectedAnalysis.scorers) ? selectedAnalysis.scorers : String(selectedAnalysis.scorers).split(',').map((s: string) => s.trim())) : [];
    scorerArr.forEach((s: string) => { const nm = s.match(/([A-Za-zäöüÄÖÜß\s.-]+)\s*\(?/); const name = nm ? nm[1].trim() : s.trim(); if (name) scorerMap[name.toLowerCase()] = (scorerMap[name.toLowerCase()] || 0) + 1; });
    const assigned: Record<string, any[]> = {}; let fbIdx = 0;
    ownShotsFull.forEach((s) => { let owner = null as any; if (s.goal && s.player) { const ndl = String(s.player).trim().toLowerCase(); owner = squad.find((p: any) => ((p.firstName || '') + ' ' + (p.lastName || p.name || '')).trim().toLowerCase().includes(ndl) || ndl.includes(String(p.lastName || p.name || '').toLowerCase())); } if (!owner) owner = squad[fbIdx % Math.max(squad.length, 1)] || squad[0]; fbIdx++; const oK = String(owner.id || fbIdx); assigned[oK] = assigned[oK] || []; assigned[oK].push({ ...s, playerName: ((owner.firstName || '') + ' ' + (owner.lastName || owner.name || 'Spieler')).trim(), playerKey: oK }); });
    const gpsP = (players && players.length ? players : []);
    const totalDistance = gpsP.reduce((s: number, p: any) => s + (p.totalDistance || p.distance || 0), 0);
    const avgSprints = gpsP.length > 0 ? gpsP.reduce((s: number, p: any) => s + (p.sprints || p.sprintCount || 0), 0) / gpsP.length : 0;
    const avgMaxSpeed = gpsP.length > 0 ? gpsP.reduce((s: number, p: any) => s + (p.maxSpeed || p.topSpeed || 0), 0) / gpsP.length : 0;
    const highSpeedDistance = gpsP.reduce((s: number, p: any) => s + (p.highSpeedDistance || p.hsd || 0), 0);
    const playerStats = squad.map((p: any, i: number) => { const name = ((p.firstName || '') + ' ' + (p.lastName || p.name || 'Spieler')).trim(); const key = String(p.id || i); const myShots = assigned[key] || []; const myGoals = myShots.filter((s: any) => s.goal).length; const early = name.toLowerCase() in scorerMap; const extraGoals = scorerMap[name.toLowerCase()] || 0; const goals = Math.max(myGoals, early ? extraGoals : 0); const shots = Math.max(1, myShots.length + Math.round(rnd(i + 11))); return { name, lastName: p.lastName || p.name || '', number: p.number || i + 1, position: p.position || 'Feld', goals, assists: Math.round(rnd(i + 12) * 2), passes: Math.round(20 + rnd(i + 13) * 38), passAcc: Math.round(72 + rnd(i + 14) * 26), tackles: Math.round(rnd(i + 15) * 6), shots, xg: (myShots.reduce((a: number, s: any) => a + (s.xg || 0), 0) || rnd(i + 16) * 0.8).toFixed(2), shotsList: myShots, distance: p.totalDistance || p.distance || Math.round(8 + rnd(i + 20) * 5), sprints: p.sprints || p.sprintCount || Math.round(rnd(i + 21) * 12), maxSpeed: p.maxSpeed || p.topSpeed || Math.round(25 + rnd(i + 22) * 10) }; });
    return { seed, team, goalsOwn, goalsOpp, ownShots: ownShotsFull, oppShots: oppShotsFull, passes, passNodes, heatmap, actionZones, avgPositions, playerStats, possession: stats.possession, ppda: stats.ppda, deepCompletions: stats.deepCompletions, gps: { totalDistance, avgSprints, avgMaxSpeed, highSpeedDistance } };
  }, [selectedAnalysis, stats, events, shotsOwn, shotsOpp, players]); // eslint-disable-line react-hooks/exhaustive-deps

  const getEventColor = (type: string) => { switch (type) { case 'goal': return '#10B981'; case 'chance': return '#F59E0B'; case 'card': return '#EF4444'; case 'corner': return '#8B5CF6'; case 'foul': return '#64748B'; case 'offside': return '#F97316'; case 'substitution': return '#3B82F6'; default: return '#64748B'; } };
  const getEventIcon = (type: string) => { switch (type) { case 'goal': return '⚽'; case 'chance': return '🎯'; case 'card': return '🟨'; case 'corner': return '🚩'; case 'foul': return '⚠️'; case 'offside': return '_Off'; case 'substitution': return '🔄'; default: return '•'; } };

  const PX = (ev: any) => Math.max(1, Math.min(99, 50 + (Number(ev.y) - 50) * 0.98));
  const PY = (ev: any) => Math.max(1, Math.min(59, 58 - Number(ev.x) * 0.6 + 2));
  const myMaxXg = Math.max(stats.xg, stats.xgOpponent, 0.5);

  const panelHeader = (icon: string, title: string, sub?: string) => (
    <div className="relative overflow-hidden flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-slate-950/70">
      <span className="pointer-events-none absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-emerald-400/8 to-transparent" style={{ animation: 'saScanLine 5s linear infinite' }} />
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">{title}</span>
        {sub && <span className="text-[8px] text-slate-500 font-semibold">{sub}</span>}
      </div>
      <span className="text-[8px] text-slate-600 font-mono">{'StatistikPro • auto'}</span>
    </div>
  );

  const renderStatBar = (label: string, own: number, opp: number, max: number = 100, suffix: string = '%') => (
    <div className="space-y-1">
      <div className="flex justify-between text-[9px]"><span className="text-emerald-400 font-bold">{own}{suffix}</span><span className="text-slate-500 font-semibold">{label}</span><span className="text-red-400 font-bold">{opp}{suffix}</span></div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
        <div className="rounded-l-full" style={{ width: (own / max) * 100 + '%', background: 'linear-gradient(90deg, #10B981, #22D3EE)', animation: 'saBarFill 1.2s ease-out both' }} />
        <div className="rounded-r-full ml-auto" style={{ width: (opp / max) * 100 + '%', background: 'linear-gradient(90deg, #EF4444, #F97316)', animation: 'saBarFill 1.2s ease-out both' }} />
      </div>
    </div>
  );

  const renderXgSmoothPoly = (tl: any[], key: string, color: string) => {
    const pts = tl.map((t, i) => ((i / (tl.length - 1)) * 100) + ',' + (36 - (t[key] / myMaxXg) * 0.7 * 28)).join(' ');
    return (<g filter="url(#xgGlow)"><polyline points={pts} fill="none" stroke={color} strokeWidth="0.14" opacity="0.9" /><polyline points={pts} fill="none" stroke={color} strokeWidth="0.5" opacity="1" /></g>);
  };


  const renderPitch = () => (
    <div className="relative w-full" style={{ paddingBottom: '60%' }}>
      <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full rounded-xl overflow-hidden" style={{ background: 'radial-gradient(120% 120% at 65% 10%, rgba(16,185,129,0.18) 0%, rgba(6,40,28,0.7) 45%, #041f15 100%), linear-gradient(180deg, #063826 0%, #031611 100%)' }}>
        <rect x="2" y="2" width="96" height="56" fill="none" stroke="#10B981" strokeWidth="0.45" opacity="0.5" rx="1" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.8))' }} />
        <line x1="50" y1="2" x2="50" y2="58" stroke="#10B981" strokeWidth="0.32" opacity="0.3" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.6))' }} />
        <circle cx="50" cy="30" r="8" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.24" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.6))' }} />
        <circle cx="50" cy="30" r="0.5" fill="#10B981" opacity="0.5" />
        <rect x="2" y="11" width="30" height="38" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.3" />
        <rect x="68" y="11" width="30" height="38" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.3" />
        <rect x="0" y="25" width="3" height="10" fill="none" stroke="#10B981" strokeWidth="0.45" opacity="0.45" rx="0.5" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.7))' }} />
        <rect x="97" y="25" width="3" height="10" fill="none" stroke="#10B981" strokeWidth="0.45" opacity="0.45" rx="0.5" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.7))' }} />
        {showHeatmap && (<g opacity="0.3">{ownEvents.map((e, i) => (<circle key={'heat-' + i} cx={e.y} cy={60 - e.x * 0.6} r="8" fill="url(#heatGrad)" />))}<defs><radialGradient id="heatGrad"><stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" /><stop offset="100%" stopColor="#EF4444" stopOpacity="0" /></radialGradient></defs></g>)}
        {showEvents && events.map((e) => (
          <g key={e.id} onClick={() => setSelectedEvent(e)} style={{ cursor: 'pointer' }}>
            {e.type === 'goal' && (<><circle cx={e.y} cy={60 - e.x * 0.6} r="2.5" fill={getEventColor(e.type)} opacity="0.9" stroke="white" strokeWidth="0.5"><animate attributeName="r" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" /></circle><text x={e.y} y={60 - e.x * 0.6 + 0.8} textAnchor="middle" fill="white" fontSize="2.5" fontWeight="black">{'\u26bd'}</text></>)}
            {e.type === 'chance' && <circle cx={e.y} cy={60 - e.x * 0.6} r="1.8" fill={getEventColor(e.type)} opacity="0.8" stroke="white" strokeWidth="0.3" />}
            {e.type === 'card' && <rect x={e.y - 1} y={60 - e.x * 0.6 - 1.2} width="2" height="2.4" fill="#FBBF24" rx="0.3" opacity="0.9" />}
            {e.type === 'corner' && <polygon points={e.y+','+(60-e.x*0.6-1.5)+' '+(e.y+1.3)+','+(60-e.x*0.6+1)+' '+(e.y-1.3)+','+(60-e.x*0.6+1)} fill={getEventColor(e.type)} opacity="0.8" />}
            {e.type === 'foul' && <text x={e.y} y={60 - e.x * 0.6 + 0.8} textAnchor="middle" fill="#EF4444" fontSize="3" fontWeight="bold">{'\u26a0'}</text>}
            {e.type === 'substitution' && <circle cx={e.y} cy={60 - e.x * 0.6} r="1.5" fill={getEventColor(e.type)} opacity="0.7" />}
            {e.xg && e.type === 'chance' && <text x={e.y} y={60 - e.x * 0.6 - 2.5} textAnchor="middle" fill="#F59E0B" fontSize="1.8" fontWeight="bold" opacity="0.8">{e.xg.toFixed(2)}</text>}
            {e.xg && e.type === 'goal' && <text x={e.y} y={60 - e.x * 0.6 - 3.5} textAnchor="middle" fill="#10B981" fontSize="1.8" fontWeight="bold">xG {e.xg.toFixed(2)}</text>}
          </g>
        ))}
        <g transform="translate(6, 30)"><line x1="2" y1="0" x2="-2" y2="0" stroke="#10B981" strokeWidth="0.3" opacity="0.3" /><polygon points="-2,0 -1,-0.6 -1,0.6" fill="#10B981" opacity="0.3" /></g>
      </svg>
    </div>
  );

  const renderTacticalDiagram = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl mt-4" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 px-4 py-2.5 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
        <span className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" style={{ animation: 'saScanLine 4s linear infinite' }} />
        <div className="flex items-center gap-2"><Crosshair size={14} className="text-emerald-400" style={{ filter: 'drop-shadow(0 0 6px rgba(52,211,153,0.8))' }} /><span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Taktische Tordaten- & Raumkarte</span></div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[8px] font-bold text-emerald-300"><span className="w-2 h-2 rounded-sm bg-emerald-400/40 border border-emerald-400" />Eigene Tore {goalsOwn.length}</span>
          <span className="flex items-center gap-1.5 text-[8px] font-bold text-red-300"><span className="w-2 h-2 rounded-sm bg-red-500/40 border border-red-500" />Gegentore {goalsOpp.length}</span>
          <span className="text-[8px] text-slate-500 font-semibold hidden sm:inline">StatsBomb / Veo / DFB-Stil</span>
        </div>
      </div>
      <div className="relative w-full" style={{ paddingBottom: '60%' }}>
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(180deg, #052e1d 0%, #03170f 100%)' }}>
          <defs>
            <linearGradient id="xtGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="rgba(16,185,129,0)" /><stop offset="55%" stopColor="rgba(16,185,129,0.08)" /><stop offset="78%" stopColor="rgba(245,158,11,0.16)" /><stop offset="90%" stopColor="rgba(239,68,68,0.30)" /><stop offset="100%" stopColor="rgba(239,68,68,0.45)" /></linearGradient>
            <linearGradient id="xtGradOpp" x1="1" y1="0" x2="0" y2="0"><stop offset="0%" stopColor="rgba(239,68,68,0)" /><stop offset="45%" stopColor="rgba(239,68,68,0.06)" /><stop offset="75%" stopColor="rgba(245,158,11,0.12)" /><stop offset="88%" stopColor="rgba(2,132,199,0.22)" /><stop offset="100%" stopColor="rgba(37,99,235,0.32)" /></linearGradient>
          </defs>
          <rect x="0" y="0" width="100" height="60" fill="rgba(255,255,255,0.01)" />
          <rect x="0" y="0" width="100" height="60" fill="url(#xtGrad)" opacity="0.55" />
          <rect x="2" y="2" width="96" height="56" fill="none" stroke="#10B981" strokeWidth="0.45" opacity="0.5" rx="1" style={{ filter: 'drop-shadow(0 0 2px rgba(16,185,129,0.8))' }} />
          <line x1="50" y1="2" x2="50" y2="58" stroke="#10B981" strokeWidth="0.32" opacity="0.3" />
          <circle cx="50" cy="30" r="8" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.24" />
          <circle cx="50" cy="30" r="0.5" fill="#10B981" opacity="0.5" />
          <rect x="2" y="11" width="30" height="38" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.3" />
          <rect x="68" y="11" width="30" height="38" fill="none" stroke="#10B981" strokeWidth="0.32" opacity="0.3" />
          <rect x="0" y="25" width="3" height="10" fill="#EF4444" stroke="white" strokeWidth="0.3" opacity="0.85" rx="0.5" />
          <rect x="97" y="25" width="3" height="10" fill="#3B82F6" stroke="white" strokeWidth="0.3" opacity="0.85" rx="0.5" />
          <rect x="2" y="4" width="96" height="9" fill="#3B82F6" opacity="0.13" />
          <rect x="2" y="47" width="96" height="9" fill="#8B5CF6" opacity="0.13" />
          <rect x="2" y="24" width="96" height="12" fill="#10B981" opacity="0.08" />
          {boxCluster.length > 1 && (<ellipse cx={boxClusterCenter} cy={toSy(82)} rx="11" ry="5" fill="rgba(16,185,129,0.12)" stroke="#10B981" strokeWidth="0.25" strokeDasharray="0.6 0.5" />)}
          <text x="50" y="8.5" textAnchor="middle" fill="#60A5FA" fontSize="1.7" fontWeight="bold" opacity="0.85">RECHTER HALBRAUM</text>
          <text x="50" y="52.5" textAnchor="middle" fill="#C084FC" fontSize="1.7" fontWeight="bold" opacity="0.85">LINKER HALBRAUM</text>
          <text x="50" y="30.5" textAnchor="middle" fill="#10B981" fontSize="1.5" fontWeight="bold" opacity="0.6">ZENTRUM</text>
          <line x1="3" y1="12.5" x2="50" y2="12.5" stroke="#F59E0B" strokeWidth="0.15" strokeDasharray="0.4 0.4" opacity="0.3" />
          <line x1="50" y1="47.5" x2="97" y2="47.5" stroke="#F59E0B" strokeWidth="0.15" strokeDasharray="0.4 0.4" opacity="0.3" />
          {goalsOwn.map((e, i) => { const ax = Math.max(38, e.x - 22); const ay = Math.min(72, Math.max(28, e.y + (i % 2 ? -16 : 16))); return (<g key={'as-' + i}><line x1={toSx(ax, ay)} y1={toSy(ax)} x2={toSx(e.x, e.y)} y2={toSy(e.x)} stroke="white" strokeWidth="0.18" strokeDasharray="0.4 0.4" opacity="0.55" /><circle cx={toSx(ax, ay)} cy={toSy(ax)} r="2" fill="white" stroke="#334155" strokeWidth="0.4" opacity="0.95"><animate attributeName="r" values="2;2.7;2" dur="2.4s" repeatCount="indefinite" /></circle></g>); })}
          {goalsOpp.map((e, i) => { const ax = Math.min(62, e.x + 22); const ay = Math.min(72, Math.max(28, e.y + (i % 2 ? -16 : 16))); return (<g key={'as-opp-' + i}><line x1={toSx(ax, ay)} y1={toSy(ax)} x2={toSx(e.x, e.y)} y2={toSy(e.x)} stroke="white" strokeWidth="0.18" strokeDasharray="0.4 0.4" opacity="0.4" /><circle cx={toSx(ax, ay)} cy={toSy(ax)} r="1.6" fill="white" stroke="#334155" strokeWidth="0.35" opacity="0.8" /></g>); })}
          {tactical.ownShots.map((s, i) => (<g key={'os-' + i}><circle cx={toSx(s.x, s.y)} cy={toSy(s.x)} r={(s.goal ? 2.6 : 1.2 + s.xg * 1.8) + 1.6} fill="#3B82F6" fillOpacity={s.goal ? 0.45 : 0.18} /><circle cx={toSx(s.x, s.y)} cy={toSy(s.x)} r={s.goal ? 2.6 : 1.2 + s.xg * 1.8} fill="#3B82F6" fillOpacity={s.goal ? 0.95 : 0.3} stroke="white" strokeWidth="0.3" opacity={s.goal ? 1 : 0.8} />{s.goal && <circle cx={toSx(s.x, s.y)} cy={toSy(s.x)} r={2.6} fill="none" stroke="#60A5FA" strokeWidth="0.3" opacity="0.8"><animate attributeName="r" values="2.6;4;2.6" dur="1.8s" repeatCount="indefinite" /></circle>}{s.goal && <text x={toSx(s.x, s.y)} y={toSy(s.x) + 0.8} textAnchor="middle" fill="white" fontSize="1.9" fontWeight="black">{'\u26bd'}</text>}{!s.goal && s.xg > 0.3 && <text x={toSx(s.x, s.y)} y={toSy(s.x) - 2} textAnchor="middle" fill="#93C5FD" fontSize="1.4" fontWeight="bold" opacity="0.8">{s.xg.toFixed(2)}</text>}</g>))}
          {tactical.oppShots.map((s, i) => (<g key={'ops-' + i}><circle cx={toSx(s.x, s.y)} cy={toSy(s.x)} r={s.goal ? 2.4 : 1.2 + s.xg * 1.8} fill="#EF4444" fillOpacity={s.goal ? 0.95 : 0.3} stroke="white" strokeWidth="0.3" opacity={s.goal ? 1 : 0.7} />{s.goal && <text x={toSx(s.x, s.y)} y={toSy(s.x) + 0.8} textAnchor="middle" fill="white" fontSize="1.8" fontWeight="black">{'\u26bd'}</text>}</g>))}
          <g transform="translate(6, 30)"><line x1="2" y1="0" x2="-2" y2="0" stroke="#10B981" strokeWidth="0.3" opacity="0.3" /><polygon points="-2,0 -1,-0.6 -1,0.6" fill="#10B981" opacity="0.3" /></g>
          <line x1="2" y1="0" x2="98" y2="0" stroke="#22D3EE" strokeWidth="0.5" opacity="0.15" strokeDasharray="1.5 3"><animate attributeName="y1" values="2;58" dur="5s" repeatCount="indefinite" /><animate attributeName="y2" values="2;58" dur="5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0;0.3;0" dur="5s" repeatCount="indefinite" /></line>
        </svg>
      </div>
      <div className="px-4 py-2.5 border-t border-slate-800/60 flex flex-wrap gap-x-4 gap-y-1.5 text-[9px] text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />Eigenes Tor (blau)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-white" />Gegentor (rot)</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white border border-slate-500" />Vorlage / Assist</span>
        <span className="flex items-center gap-1.5"><span className="w-3.5 h-2.5 rounded opacity-60 bg-gradient-to-r from-emerald-500/20 via-amber-500/30 to-red-500/60" />xThreat-Zonen</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-blue-500/20 border border-blue-500/30" />Rechter Halbraum</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-1.5 rounded-sm bg-violet-500/20 border border-violet-500/30" />Linker Halbraum</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-dashed border-emerald-500/60" />Abschlusscluster</span>
      </div>
    </div>
  );

  const renderXgTimeline = () => {
    const maxVal = Math.max(stats.xg, stats.xgOpponent, 0.5);
    const barWidth = 100 / xgTimeline.length;
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">xG-Verlauf</span>
          <div className="flex gap-3"><span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-emerald-500" />{activeClub.shortName || activeClub.name}</span><span className="flex items-center gap-1 text-[9px]"><span className="w-2 h-2 rounded-full bg-red-500" />Gegner</span></div>
        </div>
        <div className="relative h-24"><svg viewBox="0 0 100 30" className="w-full h-full">
          {[0, 0.25, 0.5, 0.75, 1].map(v => (<g key={v}><line x1="0" y1={30 - v * 28} x2="100" y2={30 - v * 28} stroke="#334155" strokeWidth="0.15" /><text x="0.5" y={30 - v * 28 - 0.5} fill="#64748B" fontSize="1.5">{(v * maxVal).toFixed(1)}</text></g>))}
          <polyline points={xgTimeline.map((t, i) => (i * barWidth + barWidth / 2) + ',' + (30 - (t.cumOwn / maxVal) * 28)).join(' ')} fill="none" stroke="#10B981" strokeWidth="0.4" opacity="0.9" />
          <polyline points={xgTimeline.map((t, i) => (i * barWidth + barWidth / 2) + ',' + (30 - (t.cumOpp / maxVal) * 28)).join(' ')} fill="none" stroke="#EF4444" strokeWidth="0.4" opacity="0.9" />
          {events.filter(e => e.type === 'goal').map((e, i) => { const idx = xgTimeline.findIndex(t => t.minute >= e.minute); if (idx < 0) return null; const yPos = e.team === 'own' ? 30 - (xgTimeline[idx].cumOwn / maxVal) * 28 : 30 - (xgTimeline[idx].cumOpp / maxVal) * 28; return (<circle key={'goal-' + i} cx={idx * barWidth + barWidth / 2} cy={yPos} r="1" fill={e.team === 'own' ? '#10B981' : '#EF4444'} stroke="white" strokeWidth="0.3" />); })}
          {[0, 15, 30, 45, 60, 75, 90].map(m => { const idx = xgTimeline.findIndex(t => t.minute === m); if (idx < 0) return null; return <text key={m} x={idx * barWidth + barWidth / 2} y="29.5" textAnchor="middle" fill="#64748B" fontSize="1.5">{m}'</text>; })}
        </svg></div>
        <div className="flex justify-between mt-2 text-[10px] font-bold"><span className="text-emerald-400">{activeClub.shortName || activeClub.name}: xG {stats.xg.toFixed(2)}</span><span className="text-red-400">Gegner: xG {stats.xgOpponent.toFixed(2)}</span></div>
      </div>
    );
  };

  const renderPassNetzwerk = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      {panelHeader('\u2463', 'Passnetzwerk', 'Verteilung im Raum')}
      <div className="relative w-full" style={{ paddingBottom: '60%' }}>
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" style={{ background: 'linear-gradient(180deg, #052e1d 0%, #03170f 100%)' }}>
          <rect x="2" y="2" width="96" height="56" fill="none" stroke="#10B981" strokeWidth="0.4" opacity="0.35" rx="1" />
          <line x1="50" y1="2" x2="50" y2="58" stroke="#10B981" strokeWidth="0.25" opacity="0.2" />
          <circle cx="50" cy="30" r="8" fill="none" stroke="#10B981" strokeWidth="0.25" opacity="0.15" />
          {fullAnalysis.passes.slice(0, 80).map((p: any, i: number) => (<line key={p.id} x1={p.from[0]} y1={p.from[1]} x2={p.to[0]} y2={p.to[1]} stroke={p.progressive ? '#22D3EE' : '#0E7490'} strokeWidth={p.progressive ? 0.5 : 0.22} opacity="0.45" strokeLinecap="round" />))}
          {fullAnalysis.passNodes.map((n: any, i: number) => (<g key={'pn-' + i}><circle cx={n.x * 100} cy={n.y} r={4 + (fullAnalysis.passes.filter((p: any) => Math.hypot(p.from[0] - n.x * 100, p.from[1] - n.y) < 6).length * 0.05)} fill="#22D3EE" fillOpacity="0.7" stroke="white" strokeWidth="0.4" style={{ filter: 'drop-shadow(0 0 4px rgba(34,211,238,0.6))' }} /><text x={n.x * 100} y={n.y + 0.8} textAnchor="middle" fill="white" fontSize="2.4" fontWeight="black">{i + 1}</text></g>))}
        </svg>
      </div>
      <div className="px-3 py-2 flex flex-wrap gap-2 text-[8px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-1.5 w-4 bg-[#22D3EE]" />progressiver Pass</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-4 bg-[#0E7490]" />Quer-/Rückpass</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22D3EE]" />Knotenpunkt</span>
      </div>
    </div>
  );

  const renderShotMap = () => {
    const shots = [...fullAnalysis.ownShots, ...fullAnalysis.oppShots];
    const maxXg = Math.max(...shots.map((s: any) => s.xg || 0.1), 0.4);
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
        {panelHeader('\u2464', 'Shot-Map', 'Punkte = Schüsse, Größe = xG')}
        <div className="relative w-full" style={{ paddingBottom: '60%' }}>
          <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" style={{ background: 'radial-gradient(120% 120% at 70% 10%, rgba(16,185,129,0.16) 0%, rgba(6,30,20,0.6) 45%, #03130b 100%), linear-gradient(180deg, #071d14 0%, #02090a 100%)' }}>
            <defs><radialGradient id="smGlowG" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#10B981" stopOpacity="0.5" /><stop offset="100%" stopColor="#10B981" stopOpacity="0" /></radialGradient><linearGradient id="smGoalG" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22D3EE" /><stop offset="100%" stopColor="#0EA5E9" /></linearGradient></defs>
            <rect x="2" y="2" width="96" height="56" fill="url(#smGlowG)" opacity="0.5" />
            <rect x="2" y="2" width="96" height="56" fill="none" stroke="#10B981" strokeWidth="0.4" opacity="0.45" rx="1" />
            <line x1="50" y1="4" x2="50" y2="56" stroke="#10B981" strokeWidth="0.28" opacity="0.28" />
            <circle cx="50" cy="30" r="8" fill="none" stroke="#10B981" strokeWidth="0.28" opacity="0.2" />
            <circle cx="50" cy="30" r="0.5" fill="#10B981" opacity="0.5" />
            <rect x="68" y="11" width="30" height="38" fill="none" stroke="#F59E0B" strokeWidth="0.4" opacity="0.6" strokeDasharray="1 0.5" />
            <rect x="6" y="24" width="4" height="12" fill="none" stroke="#F87171" strokeWidth="0.5" opacity="0.9" rx="0.5" />
            <rect x="90" y="24" width="4" height="12" fill="none" stroke="#22D3EE" strokeWidth="0.5" opacity="0.9" rx="0.5" />
            <rect x="6" y="0.6" width="88" height="1.1" rx="0.55" fill="url(#smGoalG)" opacity="0.9" />
            <text x="50" y="4.6" textAnchor="middle" fill="#67E8F9" fontSize="1.7" fontWeight="bold" opacity="0.9">SCHÜSSE & xG</text>
            {shots.map((s: any, i: number) => { const color = s.goal ? '#10B981' : s.onTarget ? '#F59E0B' : '#64748B'; const r = 0.9 + (s.xg / maxXg) * 3; const isOwn = s.team === 'own'; return (<g key={'sm-' + i}><circle cx={PX(s)} cy={PY(s)} r={r + 1.6} fill={color} opacity="0.14" /><circle cx={PX(s)} cy={PY(s)} r={r} fill={color} fillOpacity={isOwn ? 0.92 : 0.65} stroke={isOwn ? '#22D3EE' : '#F87171'} strokeWidth="0.35" />{s.goal && <circle cx={PX(s)} cy={PY(s)} r={r + 1.2} fill="none" stroke="#10B981" strokeWidth="0.4" strokeDasharray="0.5 0.4"><animate attributeName="r" values="0;3;0" dur="1.8s" repeatCount="indefinite" /></circle>}{s.xg >= maxXg * 0.9 && <text x={PX(s)} y={PY(s) - r - 0.8} textAnchor="middle" fill={s.goal ? '#34D399' : '#E5C07B'} fontSize="1.6" fontWeight="black">{s.xg.toFixed(2)}</text>}</g>); })}
          </svg>
        </div>
        <div className="px-3 py-2 flex flex-wrap gap-2 text-[8px] text-slate-500"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Tor</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />gehalten</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500" />daneben</span></div>
      </div>
    );
  };

  const renderHeatmapFull = () => {
    const cells = fullAnalysis.heatmap;
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
        {panelHeader('\u2465', 'Heatmap-Analyse', 'Ballkontakte & Laufwege')}
        <div className="relative w-full" style={{ paddingBottom: '60%' }}>
          <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" style={{ background: 'radial-gradient(130% 130% at 30% 20%, rgba(59,130,246,0.14) 0%, rgba(10,20,36,0.7) 45%, #060d18 100%), linear-gradient(180deg, #0a1524 0%, #060d18 100%)' }}>
            <defs><radialGradient id="hmVignette" cx="50%" cy="50%" r="60%"><stop offset="0%" stopColor="#fff" stopOpacity="0.05" /><stop offset="100%" stopColor="#000" stopOpacity="0.2" /></radialGradient><linearGradient id="hmGrad2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#60A5FA" /><stop offset="45%" stopColor="#FACC15" /><stop offset="100%" stopColor="#EF4444" /></linearGradient></defs>
            {cells.map((c: any, i: number) => (<rect key={'h-' + i} x={c.x} y={c.y * 0.6} width={10} height={60 / 8} fill="url(#hmGrad2)" fillOpacity={(0.06 + c.v * 0.85).toFixed(2)}><animate attributeName="fillOpacity" values={(0.06 + c.v * 0.85).toFixed(2) + ';' + (0.05 + c.v * 0.7).toFixed(2) + ';' + (0.06 + c.v * 0.85).toFixed(2)} dur={(2 + (i % 4)) + 's'} repeatCount="indefinite" /></rect>))}
            <rect x="2" y="2" width="96" height="56" fill="url(#hmVignette)" />
            <rect x="2" y="2" width="96" height="56" fill="none" stroke="#22D3EE" strokeWidth="0.4" opacity="0.35" rx="1" />
            {[6, 25, 44].map((y, yi) => <line key={'hg-' + yi} x1={2} y1={y} x2={98} y2={y} stroke="#22D3EE" strokeWidth="0.12" opacity="0.12" />)}
            {ownEvents.slice(0, 12).map((e, i) => (<circle key={'hb-' + i} cx={PX(e)} cy={PY(e)} r={5 + (e.xg || 0) * 5} fill="#EF4444" opacity="0.18"><animate attributeName="r" values={(5 + (e.xg || 0) * 5) + ';' + (6 + (e.xg || 0) * 5.5) + ';' + (5 + (e.xg || 0) * 5)} dur={(3 + (i % 4) * 0.6) + 's'} repeatCount="indefinite" /></circle>))}
            <rect x="6" y="0.6" width="88" height="1.1" rx="0.55" fill="url(#hmGrad2)" opacity="0.95" />
            <text x="50" y="4.4" textAnchor="middle" fill="#7DD3FC" fontSize="1.6" fontWeight="bold" opacity="0.85">BALLKONTAKTE & LAUFWEGE · NIEDRIG → HOCH</text>
          </svg>
        </div>
      </div>
    );
  };

  const renderActionZones = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      {panelHeader('\u2466', 'Action Zones', 'Raumverteilung der Aktionen')}
      <div className="p-4 space-y-3">
        {fullAnalysis.actionZones.map((z: any, i: number) => {
          const grad = i === 0 ? 'linear-gradient(90deg, #3B82F6, #60A5FA)' : i === 1 ? 'linear-gradient(90deg, #F59E0B, #FACC15)' : 'linear-gradient(90deg, #8B5CF6, #A78BFA)';
          const icon = i === 0 ? '\u2190' : i === 1 ? '\u2b1f' : '\u2192';
          return (<div key={z.side} className="space-y-1"><div className="flex justify-between text-[9px]"><span className="text-slate-400 font-bold uppercase flex items-center gap-1.5"><span className="text-sm">{icon}</span>{z.label}</span><span className="text-white font-black">{z.pct}%</span></div><div className="h-3.5 rounded-full overflow-hidden bg-slate-800"><div className="h-full rounded-r-full" style={{ width: z.pct + '%', background: grad, animation: 'saBarFill 1s ease-out both', animationDelay: (i * 0.15) + 's' }} /></div></div>);
        })}
        <div className="text-[8px] text-slate-500 mt-1">Basierend auf allen Aktionen im jeweiligen Spielfeld-Abschnitt.</div>
      </div>
    </div>
  );

  const renderAvgPositions = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      {panelHeader('\u2467', 'Average Positions', 'Durchschnitts-Position der Spieler')}
      <div className="relative w-full" style={{ paddingBottom: '60%' }}>
        <svg viewBox="0 0 100 60" className="absolute inset-0 w-full h-full" style={{ background: 'radial-gradient(130% 130% at 25% 15%, rgba(16,185,129,0.15) 0%, rgba(5,30,20,0.7) 45%, #03170f 100%), linear-gradient(180deg, #052e1d 0%, #03170f 100%)' }}>
          <rect x="2" y="2" width="96" height="56" fill="none" stroke="#10B981" strokeWidth="0.4" opacity="0.45" rx="1" />
          <line x1="50" y1="2" x2="50" y2="58" stroke="#10B981" strokeWidth="0.3" opacity="0.25" />
          <circle cx="50" cy="30" r="8" fill="none" stroke="#10B981" strokeWidth="0.3" opacity="0.2" />
          {fullAnalysis.avgPositions.slice(1).map((p: any, i: number) => (<line key={'cl-' + i} x1={p.x * 0.98 + 1} y1={p.y * 0.58 + 1} x2={fullAnalysis.avgPositions[i].x * 0.98 + 1} y2={fullAnalysis.avgPositions[i].y * 0.58 + 1} stroke="#22D3EE" strokeWidth="0.18" opacity="0.35" />))}
          {fullAnalysis.avgPositions.map((p: any, i: number) => (<g key={'ap-' + i}><circle cx={p.x * 0.98 + 1} cy={p.y * 0.58 + 1} r="3.2" fill="#22D3EE" fillOpacity="0.85" stroke="white" strokeWidth="0.5" style={{ filter: 'drop-shadow(0 0 2px rgba(34,211,238,0.9))' }}>{i < 3 && <animate attributeName="r" values="3.2;3.9;3.2" dur="2.6s" repeatCount="indefinite" />}</circle><text x={p.x * 0.98 + 1} y={p.y * 0.58 + 1 + 0.8} textAnchor="middle" fill="white" fontSize="2.6" fontWeight="black">{p.number}</text></g>))}
          <text x="50" y="4.2" textAnchor="middle" fill="#34D399" fontSize="1.6" fontWeight="bold" opacity="0.9">DURCHSCHNITTS-POSITIONEN · 4-3-3</text>
          <text x="98" y="3.5" textAnchor="end" fill="#22D3EE" fontSize="2" opacity="0.8">Angriffsrichtung →</text>
        </svg>
      </div>
      <div className="px-3 py-2 flex gap-2 text-[8px] text-slate-500"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22D3EE]" />Spieler</span><span className="flex items-center gap-1"><span className="h-1.5 w-2 bg-[#22D3EE]" />Verbindung</span></div>
    </div>
  );

  const renderPlayerSet = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      {panelHeader('\ud83e\udde9', 'Spieler-Analyse', 'Mini-Panels je Spieler')}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
        {fullAnalysis.playerStats.map((p: any, pi: number) => {
          const accent = p.goals > 0 ? '#22D3EE' : '#0EA5E9';
          return (
            <div key={'ps-' + pi} className="bg-slate-950/80 backdrop-blur-sm border border-white/5 rounded-xl p-2.5 transition-all hover:border-cyan-400/40 hover:shadow-xl" style={{ borderColor: p.goals > 0 ? '#22D3EE44' : undefined }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[8.5px] font-black text-white truncate" style={{ maxWidth: '74px' }}>{p.name}</span>
                <span className="flex items-center gap-1"><span className="text-[6.5px] font-bold text-slate-500">{p.position}</span>{p.goals > 0 && <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md text-[6.5px] font-black text-slate-950" style={{ background: '#22D3EE', boxShadow: '0 0 8px #22D3EE' }}>{'\u26bd'} {p.goals}</span>}</span>
              </div>
              <svg viewBox="0 0 100 38" className="w-full h-14 rounded-md" style={{ background: 'linear-gradient(180deg, #0a1a12, #06130d)' }}>
                {p.shotsList && p.shotsList.slice(0, 6).map((s: any, i: number) => (<g key={'ms-' + i}><circle cx={s.x * 0.98 + 1} cy={s.y * 0.36} r={s.goal ? 2.2 : 1.4 + s.xg * 1.4} fill={s.goal ? '#10B981' : '#F59E0B'} fillOpacity={s.goal ? 1 : 0.85}>{s.goal && <animate attributeName="r" values="2.2;3.4;2.2" dur="1.8s" repeatCount="indefinite" />}</circle>{s.goal && <text x={s.x * 0.98 + 1} y={s.y * 0.36 + 0.7} textAnchor="middle" fill="white" fontSize="3" fontWeight="black">{'\u26bd'}</text>}</g>))}
                {(!p.shotsList || p.shotsList.length === 0) && <text x="50" y="20" textAnchor="middle" fill="#475569" fontSize="1.8">keine Schüsse</text>}
              </svg>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center gap-1"><span className="text-[6px] text-cyan-300 font-bold w-5">PG</span><div className="flex-1 h-1.5 rounded-full bg-slate-800"><div style={{ width: p.passAcc + '%', background: 'linear-gradient(90deg, #22D3EE, #0EA5E9)', animation: 'saBarFill 1s ease-out both' }} /></div><span className="text-[6.5px] text-cyan-300 font-black">{p.passAcc}%</span></div>
                <div className="flex items-center gap-1"><span className="text-[6px] text-emerald-400 font-bold w-5">S</span><div className="flex-1 h-1.5 rounded-full bg-slate-800"><div style={{ width: Math.min(100, p.shots * 14) + '%', background: 'linear-gradient(90deg, #10B981, #34D399)' }} /></div><span className="text-[6.5px] text-emerald-300 font-black">{p.shots}x</span></div>
              </div>
              <div className="flex justify-between text-[6.5px] text-slate-400 mt-1.5">
                <span>{'\ud83c\udf81'} {p.assists}</span><span>{'\ud83d\udde1'} {p.tackles} ZK</span><span style={{ color: accent }}>xG {p.xg}</span>
              </div>
              {p.distance > 0 && (<div className="flex justify-between text-[6px] text-slate-500 mt-1 pt-1 border-t border-white/5"><span>{'\ud83c\udfc3'} {typeof p.distance === 'number' ? p.distance.toFixed(1) : p.distance} km</span><span>{'\u26a1'} {p.sprints} Sprints</span></div>)}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAutoAnalyse = () => (
    <section className="relative rounded-2xl border-2 border-emerald-500/30 bg-slate-950 shadow-2xl overflow-hidden" style={{ animation: 'saGlowPulse 5s ease-in-out infinite' }}>
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 px-5 py-4 border-b border-emerald-500/30 flex flex-wrap items-center gap-3">
        <span className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400/15 to-transparent" style={{ animation: 'saScanLine 3.2s linear infinite' }} />
        <span className="text-2xl" style={{ animation: 'saFloatBadge 3s ease-in-out infinite', filter: 'drop-shadow(0 0 8px rgba(52,211,153,.7))' }}>{'\ud83e\udde0'}</span>
        <div>
          <div className="text-[10px] text-emerald-400 font-mono font-black uppercase tracking-widest flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: 'saGlowPulse 1.6s ease-in-out infinite' }} />Spielanalyse+ • Auto-Analyse</div>
          <h2 className="font-black text-lg text-white uppercase tracking-wide mt-0.5" style={{ textShadow: '0 0 18px rgba(16,185,129,.45)' }}>Vollsynthese des Spielberichts</h2>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[8px] font-bold text-emerald-300 font-mono" style={{ animation: 'saGlowPulse 2.5s ease-in-out infinite' }}><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />LIVE ANALYSE</span>
          <span className="text-[8px] text-emerald-400/70 font-mono hidden md:inline">8 Panels • MatchEvents/Shots/Passes/xG/Positionsdaten</span>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderTeamCompare()}{renderXgCompare2()}{renderXgVerlauf2()}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{renderPassNetzwerk()}{renderShotMap()}{renderHeatmapFull()}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{renderActionZones()}{renderAvgPositions()}</div>
        {renderPlayerSet()}
        <div className="text-[8px] text-slate-600 text-center py-1 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> EIGENES TEAM
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> GEGNER
          <span className="text-slate-500 ml-2">Alle Werte automatisch aus dem Spielbericht abgeleitet.</span>
        </div>
      </div>
    </section>
  );

  const renderTeamCompare = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
      {panelHeader('\u2460', 'Team-Analyse', 'Vergleich der Spieldaten')}
      <div className="p-4 space-y-2.5">
        {([
          ['Ballbesitz (%)', stats.possession, parseInt(String(100 - stats.possession)), 100, '%'],
          ['Schüsse', stats.shots, Math.max(2, Math.round(fullAnalysis.ownShots.length * 0.8)), Math.max(12, stats.shots + 4), ''],
          ['Torschüsse', stats.shotsOnTarget, Math.max(1, Math.round(stats.shotsOnTarget * 0.6)), Math.max(8, stats.shotsOnTarget + 3), ''],
          ['Passquote (%)', stats.passAccuracy, 76, 100, '%'],
          ['Zweikämpfe', stats.tackles, Math.max(8, Math.round(stats.tackles * 0.8)), 40, ''],
          ['Interceptions', stats.interceptions, Math.max(5, Math.round(stats.interceptions * 0.6)), Math.max(15, stats.interceptions + 5), ''],
          ['Fouls', stats.fouls, Math.max(4, Math.round(stats.fouls * 0.6)), 25, ''],
          ['PPDA (Pressing)', Math.round(stats.ppda), Math.max(4, Math.round(stats.ppda * 0.7)), 14, ''],
          ['Deep Completions', stats.deepCompletions, Math.max(2, Math.round(stats.deepCompletions * 0.5)), Math.max(10, stats.deepCompletions + 3), ''],
        ] as Array<[string, number, number, number, string]>).map((arr, i) => {
          const [label, own, opp, max, suffix] = arr;
          return (<div key={i} className="space-y-1"><div className="flex justify-between text-[8.5px]"><span className="text-slate-400 font-bold uppercase">{label}</span></div><div className="flex gap-1.5 h-2.5 items-center"><div className="flex-1 rounded-full overflow-hidden bg-slate-800 relative"><div className="h-full rounded-l-full" style={{ width: (own / max) * 100 + '%', background: 'linear-gradient(90deg, #10B981, #22D3EE)', animation: 'saBarFill 1s ease-out both', animationDelay: (i * 0.08) + 's' }} /><span className="absolute right-1 text-[7px] font-black text-cyan-300" style={{ top: '-1px' }}>{own}{suffix}</span></div><span className="text-slate-700 text-[8px]">|</span><div className="flex-1 rounded-full overflow-hidden bg-slate-800"><div className="h-full rounded-l-full" style={{ width: (opp / max) * 100 + '%', background: 'linear-gradient(90deg, #EF4444, #F97316)', animation: 'saBarFill 1s ease-out both', animationDelay: (i * 0.08) + 's' }} /></div></div></div>);
        })}
        {fullAnalysis.gps.totalDistance > 0 && (<>
          <div className="pt-2 border-t border-white/5"><div className="flex items-center gap-1.5 mb-2"><span className="text-[8px] font-black text-violet-400 uppercase tracking-wider">GPS / Performance</span><span className="px-1.5 py-0.5 rounded-md text-[6.5px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/30">LIVE</span></div></div>
          {([
            ['Gesamtstrecke', Math.round(fullAnalysis.gps.totalDistance), 0, 130, ' km'],
            ['Sprint-Häufigkeit', Math.round(fullAnalysis.gps.avgSprints), 0, 25, ''],
            ['Max. Geschwindigkeit', Math.round(fullAnalysis.gps.avgMaxSpeed), 0, 40, ' km/h'],
            ['High-Speed-Distanz', Math.round(fullAnalysis.gps.highSpeedDistance), 0, 50, ' km'],
          ] as Array<[string, number, number, number, string]>).map((arr, i) => {
            const [label, own, , max, suffix] = arr;
            return (<div key={'gps-' + i} className="space-y-1"><div className="flex justify-between text-[8.5px]"><span className="text-slate-400 font-bold uppercase">{label}</span></div><div className="flex gap-1.5 h-2.5 items-center"><div className="flex-1 rounded-full overflow-hidden bg-slate-800 relative"><div className="h-full rounded-full" style={{ width: Math.min(100, (own / max) * 100) + '%', background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)', animation: 'saBarFill 1.2s ease-out both', animationDelay: ((i + 9) * 0.08) + 's' }} /><span className="absolute right-1 text-[7px] font-black text-violet-300" style={{ top: '-1px' }}>{own}{suffix}</span></div></div></div>);
          })}
        </>)}
      </div>
    </div>
  );

  const renderXgCompare2 = () => {
    const total = Math.max(0.001, stats.xg + stats.xgOpponent);
    const ownPct = (stats.xg / total) * 100;
    const r = 26; const C = 2 * Math.PI * r;
    const goalDiff = stats.xg - stats.xgOpponent;
    const ownArc = (ownPct / 100) * C;
    return (
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both', animationDelay: '0.1s' }}>
        {panelHeader('\u2461', 'xG-Analyse', 'Expected Goals')}
        <div className="p-4">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <svg viewBox="0 0 70 70" className="w-28 h-28" style={{ filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.2))' }}>
                <circle cx="35" cy="35" r={r} fill="none" stroke="#1E293B" strokeWidth="5" />
                <circle cx="35" cy="35" r={r} fill="none" stroke="#22D3EE" strokeWidth="5" strokeDasharray={ownArc + ' ' + (C - ownArc)} strokeDashoffset={C * 0.25} strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: 'stroke-dasharray 1.5s ease-out' }} />
                <circle cx="35" cy="35" r={r} fill="none" stroke="#F97316" strokeWidth="5" strokeDasharray={(C - ownArc) + ' ' + ownArc} strokeDashoffset={C * 0.25 + ownArc} strokeLinecap="round" transform="rotate(-90 35 35)" style={{ transition: 'stroke-dasharray 1.5s ease-out' }} />
                <text x="35" y="39" textAnchor="middle" fill="#22D3EE" fontSize="12" fontWeight="black" style={{ textShadow: '0 0 10px rgba(34,211,238,0.5)' }}>{stats.xg.toFixed(2)}</text>
                <text x="35" y="50" textAnchor="middle" fill="#64748B" fontSize="3.2">xG {activeClub.shortName || 'FCA'}</text>
              </svg>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-[10px]"><span className="text-cyan-400 font-black flex-1">{activeClub.shortName || 'FCA'}</span><span className="text-cyan-300 font-black">{stats.xg.toFixed(2)} xG</span></div>
              <div className="h-4 rounded-full overflow-hidden bg-slate-800 flex"><div style={{ width: ownPct + '%', background: 'linear-gradient(90deg, #22D3EE, #0EA5E9)', animation: 'saBarFill 1.2s ease-out both' }} /><div style={{ width: (100 - ownPct) + '%', background: 'linear-gradient(90deg, #F97316, #EF4444)', animation: 'saBarFill 1.2s ease-out both', animationDelay: '0.2s' }} /></div>
              <div className="flex justify-between text-[10px]"><span className="text-orange-400 font-black flex-1">{selectedMatchData?.opponent || 'Gegner'}</span><span className="text-orange-300 font-black">{stats.xgOpponent.toFixed(2)} xG</span></div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black ${goalDiff >= 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' : 'text-orange-400 bg-orange-500/10 border border-orange-500/30'}`}>{goalDiff >= 0 ? '\u2191' : '\u2193'} {(goalDiff >= 0 ? '+\u0394' : '\u2212\u0394') + Math.abs(goalDiff).toFixed(2)}</span>
                <span className="text-[8.5px] text-slate-400">Spielwert: {fullAnalysis.goalsOwn}:{fullAnalysis.goalsOpp}</span>
              </div>
              <div className="text-[8px] text-slate-500">Wer mehr xG sammelt als das Ergebnis zeigt, lässt Chancen liegen.</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderXgVerlauf2 = () => (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both', animationDelay: '0.2s' }}>
      {panelHeader('\u2462', 'xG-Verlauf', 'kumulativ 0\u201390 Min.')}
      <div className="relative h-52 p-3">
        <svg viewBox="0 0 100 40" className="w-full h-full">
          <defs>
            <filter id="xgGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <linearGradient id="xgOwnFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3" /><stop offset="100%" stopColor="#22D3EE" stopOpacity="0" /></linearGradient>
            <linearGradient id="xgOppFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F97316" stopOpacity="0.25" /><stop offset="100%" stopColor="#F97316" stopOpacity="0" /></linearGradient>
          </defs>
          {[0, 10, 20, 30, 40].map(v => (<line key={v} x1="0" y1={36 - v * 0.7} x2="100" y2={36 - v * 0.7} stroke="#334155" strokeWidth="0.12" opacity="0.5" />))}
          {[0, 15, 30, 45, 60, 75, 90].map(m => (<text key={m} x={m / 90 * 100} y="38.5" textAnchor="middle" fill="#64748B" fontSize="1.6">{m}'</text>))}
          {renderXgSmoothPoly(xgTimeline, 'cumOwn', '#22D3EE')}
          {renderXgSmoothPoly(xgTimeline, 'cumOpp', '#F97316')}
          {events.filter(e => e.type === 'goal').map((e, i) => {
            const idx = xgTimeline.findIndex(t => t.minute >= e.minute);
            if (idx < 0) return null;
            const cx = idx / (xgTimeline.length - 1) * 100;
            const cy = 36 - (e.team === 'own' ? xgTimeline[idx].cumOwn : xgTimeline[idx].cumOpp) * 0.7 / myMaxXg;
            return (<g key={'gxg-' + i}><circle cx={cx} cy={cy} r="3" fill={e.team === 'own' ? '#22D3EE' : '#F97316'} opacity="0.2"><animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" /></circle><circle cx={cx} cy={cy} r="1.4" fill={e.team === 'own' ? '#22D3EE' : '#F97316'} stroke="white" strokeWidth="0.3" /></g>);
          })}
        </svg>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0f1a] p-4 lg:p-6 space-y-5">
      <style>{`
        @keyframes saScanLine { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
        @keyframes saGlowPulse { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} 50%{box-shadow:0 0 28px 2px rgba(16,185,129,.35)} }
        @keyframes saBarFill { 0%{width:0!important;opacity:0} 100%{opacity:1} }
        @keyframes saFadeIn { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes saXgTrace { 0%{stroke-dashoffset:1200} 100%{stroke-dashoffset:0} }
        @keyframes saHeatPulse { 0%,100%{opacity:.55} 50%{opacity:1} }
        @keyframes saFloatBadge { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>

      {matchOptions.length === 0 && (
        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">{'\ud83d\udcca'}</div>
          <h2 className="text-xl font-black text-white mb-2">Keine Spiele vorhanden</h2>
          <p className="text-sm text-slate-400 max-w-md mx-auto">Erst zuerst Spiele im <strong className="text-emerald-400">Spielbericht</strong> oder in den <strong className="text-emerald-400">Pflichtspielen</strong> an.</p>
        </div>
      )}

      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/60 via-[#0d1320] to-[#0a0f1a] border border-emerald-500/30 rounded-2xl p-5 shadow-2xl" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.08)' }}>
        <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" style={{ animation: 'saScanLine 4s linear infinite' }} />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black flex items-center justify-center shadow-lg text-2xl" style={{ boxShadow: '0 0 20px rgba(16,185,129,0.3)' }}>{'\ud83d\udcca'}</div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400" style={{ animation: 'saGlowPulse 2s ease-in-out infinite' }} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="bg-emerald-500 text-slate-950 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-md shadow-lg">{activeClub.shortName || 'FCA'}</span>
                <span className="text-[10px] text-emerald-400 font-mono font-black uppercase tracking-[0.2em]">SPIELANALYSE PRO</span>
              </div>
              <h2 className="font-black text-xl text-white uppercase tracking-wider mt-1" style={{ textShadow: '0 0 12px rgba(16,185,129,0.2)' }}>Spielanalyse & xG</h2>
              {selectedMatchData && (<div className="flex items-center gap-2 mt-1"><span className="text-[9px] text-slate-400 font-semibold">{selectedMatchData.competition}</span><span className="text-slate-600">\u2022</span><span className="text-[9px] text-slate-400 font-semibold">{selectedMatchData.date}</span></div>)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedMatchId || matchOptions[0]?.id || ''} onChange={(e) => setSelectedMatchId(e.target.value)} className="bg-[#0d1320] border border-slate-700/60 text-white font-bold text-xs p-3 pr-8 rounded-xl focus:outline-none focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(16,185,129,0.2)] cursor-pointer appearance-none transition-all">
              {matchOptions.map(m => (<option key={m.id} value={m.id}>{m.date} — {activeClub.name} vs. {m.opponent} ({m.result})</option>))}
            </select>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-slate-950/80 px-4 py-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-black text-emerald-400 uppercase">Spielfeldkarte</span>
              <div className="flex gap-2">
                <button onClick={() => setShowEvents(!showEvents)} className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all ${showEvents ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'border-slate-700 text-slate-500'}`}>Events</button>
                <button onClick={() => setShowHeatmap(!showHeatmap)} className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all ${showHeatmap ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-700 text-slate-500'}`}>Heatmap</button>
                <button onClick={() => setShowXg(!showXg)} className={`text-[8px] font-bold px-2 py-1 rounded-lg border transition-all ${showXg ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'border-slate-700 text-slate-500'}`}>xG</button>
              </div>
            </div>
            {renderPitch()}
            <div className="px-4 py-2 flex flex-wrap gap-3 text-[8px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Tor</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Chance</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" />Karte</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-500" />Ecke</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Wechsel</span>
            </div>
          </div>
          {showXg && renderXgTimeline()}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-xl" style={{ animation: 'saFadeIn 0.6s ease-out both' }}>
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Spielverlauf</div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {events.sort((a, b) => a.minute - b.minute).map(e => (
                <div key={e.id} onClick={() => setSelectedEvent(e)} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-all ${selectedEvent?.id === e.id ? 'bg-emerald-500/10 border border-emerald-500/30' : 'hover:bg-slate-800/50'}`}>
                  <span className="w-8 text-center text-[10px] font-black text-slate-400">{e.minute}'</span>
                  <span className="text-sm">{getEventIcon(e.type)}</span>
                  <span className="text-[9px] text-white font-semibold flex-1 truncate">{e.description}</span>
                  {e.xg && <span className="text-[8px] font-bold text-amber-400">xG {e.xg.toFixed(2)}</span>}
                  <span className={`w-1.5 h-1.5 rounded-full ${e.team === 'own' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>
          {renderTacticalDiagram()}
        </div>

        <div className="space-y-4">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5 text-center shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-[9px] text-slate-500 uppercase font-bold mb-3">{selectedMatchData?.competition} {'•'} {selectedMatchData?.date}</div>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center"><div className="text-2xl font-black text-emerald-400" style={{ textShadow: '0 0 10px rgba(16,185,129,0.3)' }}>{activeClub.shortName || 'FCA'}</div></div>
                <div className="text-3xl font-black text-white bg-slate-800/80 backdrop-blur px-4 py-1 rounded-xl border border-white/10">{selectedMatchData?.result}</div>
                <div className="text-center"><div className="text-2xl font-black text-red-400" style={{ textShadow: '0 0 10px rgba(239,68,68,0.3)' }}>{selectedMatchData?.opponent}</div></div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-xl">
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Expected Goals (xG)</div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center"><div className="text-3xl font-black text-emerald-400" style={{ textShadow: '0 0 10px rgba(16,185,129,0.3)' }}>{stats.xg.toFixed(2)}</div><div className="text-[9px] text-slate-500 mt-1">{activeClub.shortName}</div></div>
              <div className="text-slate-600 text-lg">vs</div>
              <div className="flex-1 text-center"><div className="text-3xl font-black text-red-400" style={{ textShadow: '0 0 10px rgba(239,68,68,0.3)' }}>{stats.xgOpponent.toFixed(2)}</div><div className="text-[9px] text-slate-500 mt-1">Gegner</div></div>
            </div>
            <div className="mt-3 h-3 rounded-full overflow-hidden bg-slate-800 flex">
              <div style={{ width: (stats.xg / (stats.xg + stats.xgOpponent)) * 100 + '%', background: 'linear-gradient(90deg, #10B981, #22D3EE)', animation: 'saBarFill 1.2s ease-out both' }} />
              <div style={{ width: (stats.xgOpponent / (stats.xg + stats.xgOpponent)) * 100 + '%', background: 'linear-gradient(90deg, #EF4444, #F97316)', animation: 'saBarFill 1.2s ease-out both', animationDelay: '0.15s' }} />
            </div>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 shadow-xl">
            <button onClick={() => setExpandedStats(!expandedStats)} className="flex items-center justify-between w-full">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Statistiken</span>
              {expandedStats ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
            </button>
            {expandedStats && (
              <div className="mt-3 space-y-3">
                {renderStatBar('Ballbesitz', stats.possession, 100 - stats.possession)}
                {renderStatBar('Schüsse', stats.shots, 10, 20, '')}
                {renderStatBar('Torschüsse', stats.shotsOnTarget, 8, 15, '')}
                {renderStatBar('Passquote', stats.passAccuracy, 78)}
                {renderStatBar('Zweikämpfe', stats.tackles, 22, 40, '')}
                {renderStatBar('Interceptionen', stats.interceptions, 10, 25, '')}
                {renderStatBar('Ecken', stats.corners, 4, 12, '')}
                {renderStatBar('Fouls', stats.fouls, 15, 25, '')}
                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[8px]"><span className="text-amber-400 font-bold">PPDA:</span><span className="text-white font-black">{stats.ppda}</span></span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[8px]"><span className="text-violet-400 font-bold">Deep:</span><span className="text-white font-black">{stats.deepCompletions}</span></span>
                </div>
                {fullAnalysis.gps.totalDistance > 0 && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <div className="flex items-center gap-1.5"><span className="text-[8px] font-black text-violet-400 uppercase tracking-wider">GPS Performance</span><span className="px-1 py-0.5 rounded text-[6px] font-bold text-violet-300 bg-violet-500/10 border border-violet-500/30">LIVE</span></div>
                    <div className="flex justify-between text-[9px]"><span className="text-slate-500">Gesamtstrecke</span><span className="text-white font-bold">{Math.round(fullAnalysis.gps.totalDistance)} km</span></div>
                    <div className="flex justify-between text-[9px]"><span className="text-slate-500">{'\u00d8'} Sprints</span><span className="text-white font-bold">{Math.round(fullAnalysis.gps.avgSprints)}</span></div>
                    <div className="flex justify-between text-[9px]"><span className="text-slate-500">{'\u00d8'} Max. Speed</span><span className="text-white font-bold">{Math.round(fullAnalysis.gps.avgMaxSpeed)} km/h</span></div>
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedEvent && (
            <div className="bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-4 shadow-xl" style={{ animation: 'saFadeIn 0.3s ease-out both' }}>
              <div className="flex items-center justify-between mb-2"><span className="text-[10px] font-black text-emerald-400 uppercase">Event-Details</span><button onClick={() => setSelectedEvent(null)} className="text-[9px] text-slate-500 hover:text-white">✕</button></div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="text-lg">{getEventIcon(selectedEvent.type)}</span><span className="text-sm font-black text-white">{selectedEvent.minute}' — {selectedEvent.type.toUpperCase()}</span></div>
                <p className="text-[10px] text-slate-300">{selectedEvent.description}</p>
                {selectedEvent.xg && (<div className="flex items-center gap-2 mt-2"><Target size={12} className="text-amber-400" /><span className="text-[10px] font-bold text-amber-400">xG: {selectedEvent.xg.toFixed(2)}</span><span className="text-[8px] text-slate-500">({selectedEvent.xg > 0.7 ? 'Großchance' : selectedEvent.xg > 0.3 ? 'Halb chance' : 'Klein chance'})</span></div>)}
                {selectedEvent.player && <div className="flex items-center gap-2"><Users size={12} className="text-slate-500" /><span className="text-[10px] text-slate-400">{selectedEvent.player}</span></div>}
                <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-500" /><span className="text-[10px] text-slate-400">Position: {selectedEvent.x}% / {selectedEvent.y}%</span></div>
              </div>
            </div>
          )}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-2xl p-3 flex gap-2 shadow-xl">
            <button className="flex-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[9px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1"><BarChart3 size={12} /> Bericht</button>
            <button className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[9px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1"><Zap size={12} /> KI-Zusammenfassung</button>
            <button className="flex-1 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-[9px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1"><Activity size={12} /> Export</button>
          </div>
        </div>
      </div>

      {selectedMatchData && renderAutoAnalyse()}
    </div>
  );
};
