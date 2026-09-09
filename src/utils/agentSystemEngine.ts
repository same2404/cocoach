import { Player, Match } from '../types';

export interface AgentFinding {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  text: string;
  count?: number;
  items?: string[];
}

export interface AgentStatus {
  id: 'SupervisorAgent' | 'TeamAgent' | 'CompetitionAgent' | 'CleanupAgent' | 'MemoryAgent';
  name: string;
  role: string;
  tasks: string;
  status: 'ONLINE' | 'ACTIVE' | 'PROCESSING' | 'STANDBY';
  lastRun: string;
  metrics: {
    processedCount: number;
    healthScore: number;
    syncStatus: string;
  };
  findings: AgentFinding[];
  rules: string[];
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agentId: 'SupervisorAgent' | 'TeamAgent' | 'CompetitionAgent' | 'CleanupAgent' | 'MemoryAgent';
  agentName: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  details?: string;
}

const now = () => new Date().toLocaleTimeString('de-DE');
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export const INITIAL_AGENTS_STATE: Record<string, AgentStatus> = {
  SupervisorAgent: {
    id: 'SupervisorAgent',
    name: 'SupervisorAgent',
    role: 'Überwacht alle Agents, verhindert Fehler, steuert Prozesse & Overall Quality Gatekeeper',
    tasks: 'Validierung, Fehlererkennung, Prozesskontrolle, Stabilitäts-Audits',
    status: 'ONLINE',
    lastRun: now(),
    metrics: { processedCount: 0, healthScore: 100, syncStatus: 'System 100% Stabil' },
    findings: [],
    rules: [
      'Keine eigenen Daten ändern, nur überwachen und steuern.',
      'Bei System- oder Daten-Konflikten entscheidet stets der SupervisorAgent.',
      'Fehler werden sofort isoliert und behoben.'
    ]
  },
  TeamAgent: {
    id: 'TeamAgent',
    name: 'TeamAgent',
    role: 'Spieler- & Teamverwaltung (FC Auggen Roster, Fitness, Injury & LEVEL 3 Run Analysis)',
    tasks: 'Kaderverwaltung, Fitness-Tracking, LEVEL 3 Positionsevaluierung',
    status: 'ONLINE',
    lastRun: now(),
    metrics: { processedCount: 0, healthScore: 100, syncStatus: 'Kader Synchron' },
    findings: [],
    rules: [
      'Eindeutige IDs, keine Duplikate, saubere Statistiken.',
      'LEVEL 3 Position-Evaluation muss IMMER den Satz enthalten: „Für die Position [X] ist diese Laufbewegung typisch/ungewöhnlich/überlastend.“'
    ]
  },
  CompetitionAgent: {
    id: 'CompetitionAgent',
    name: 'CompetitionAgent',
    role: 'Tabellen, Spielpläne, Ergebnisse & Verbandsliga Match performance analyst',
    tasks: 'Verbandsliga Tabelle berechnen, Spielpläne aktualisieren, Gegner-Scouting',
    status: 'ONLINE',
    lastRun: now(),
    metrics: { processedCount: 0, healthScore: 100, syncStatus: 'Matchdaten Aktuell' },
    findings: [],
    rules: [
      'Punkte korrekt, keine doppelten Spiele, chronologische Spieltage.',
      'Regelmäßiges Gegner-Scouting und Taktik-Abgleich.'
    ]
  },
  CleanupAgent: {
    id: 'CleanupAgent',
    name: 'CleanupAgent',
    role: 'Datenbereinigung & Instant state maintenance',
    tasks: 'Duplikate entfernen, temporäre Clips bereinigen, Firestore schlank halten',
    status: 'ONLINE',
    lastRun: now(),
    metrics: { processedCount: 0, healthScore: 100, syncStatus: '0 Verwaiste Einträge' },
    findings: [],
    rules: [
      'Keine aktiven Daten löschen, nur veraltete oder doppelte.',
      'Sofortiges Löschen von Videos/Clips ohne UI-blockierende Dialoge.'
    ]
  },
  MemoryAgent: {
    id: 'MemoryAgent',
    name: 'MemoryAgent',
    role: 'Datenkonsistenz, Archivierung & persistent data sync manager',
    tasks: 'Archivieren, Strukturvalidierung, Persistent Firestore Sync',
    status: 'ONLINE',
    lastRun: now(),
    metrics: { processedCount: 0, healthScore: 100, syncStatus: 'Firestore DB Synced' },
    findings: [],
    rules: [
      'Archivierte Daten schützen, Strukturfehler melden.',
      'Langzeit-Gedächtnis aller Match-Analysen & Taktik-Presets wahren.'
    ]
  }
};

const hasResult = (m: any) => {
  const r = String(m?.result || '').trim();
  return r !== '' && r !== '0:0';
};

const shortName = (p: any) => {
  const fn = String(p?.firstName || '').trim();
  const ln = String(p?.lastName || p?.name || '').trim();
  return fn && ln ? `${fn} ${ln}` : (ln || fn || 'Unbekannt');
};

/** Haut-Routine: alle 5 Agents mit ECHTEN Checks auf den übergebenen Daten. */
export function runMasterAgentCycle(
  players: Player[] = [],
  matches: Match[] = [],
  analyses: any[] = [],
  extra: { spiele?: any[]; testMatches?: any[] } = {}
): { updatedAgents: Record<string, AgentStatus>; logs: AgentLog[] } {
  const timestamp = now();
  const newLogs: AgentLog[] = [];
  const squad = players.filter((p: any) => (p.category || 'player') === 'player');
  const compMatches = (extra.testMatches && extra.testMatches.length ? [...matches, ...extra.testMatches] : matches) as any[];

  /* ── 2. TEAMAGENT: echte Kader-Checks ─────────────────────────────── */
  const findingsTeam: AgentFinding[] = [];
  const noNumber = squad.filter((p: any) => !String(p.number || '').trim());
  const noPosition = squad.filter((p: any) => !String(p.position || '').trim());
  const keyOf = (p: any) => `${String(p.firstName || '')}|${String(p.lastName || p.name || '')}`.toLowerCase().replace(/\s+/g, ' ');
  const seen = new Map<string, string[]>();
  squad.forEach((p: any) => {
    const k = keyOf(p);
    const arr = seen.get(k) || [];
    arr.push(p.id);
    seen.set(k, arr);
  });
  const dupNames = [...seen.entries()].filter(([, ids]) => ids.length > 1);
  const injuredCount = squad.filter((p: any) => p.isInjured || String(p.status || '') === 'Verletzt').length;
  if (noNumber.length) findingsTeam.push({ severity: 'WARNING', text: `${noNumber.length} Spieler ohne Rückennummer`, count: noNumber.length });
  if (noPosition.length) findingsTeam.push({ severity: 'WARNING', text: `${noPosition.length} Spieler ohne Position`, count: noPosition.length });
  if (dupNames.length) findingsTeam.push({ severity: 'ERROR', text: `${dupNames.length} doppelte Spieler-Einträge`, count: dupNames.length, items: dupNames.map(([k]) => k.replace('|', ' ')) });
  if (injuredCount) findingsTeam.push({ severity: 'INFO', text: `${injuredCount} verletzt/einsatzbedingt markiert`, count: injuredCount });
  if (!findingsTeam.length) findingsTeam.push({ severity: 'INFO', text: 'Kader sauber: Nummern, Positionen und IDs verifiziert.' });

  const teamScore = clamp(100 - noNumber.length * 4 - noPosition.length * 3 - dupNames.length * 8);
  const teamHasIssues = findingsTeam.some((f) => f.severity === 'ERROR' || f.severity === 'WARNING');
  newLogs.push({
    id: `log-team-${Date.now()}`,
    timestamp,
    agentId: 'TeamAgent',
    agentName: 'TeamAgent',
    type: teamHasIssues ? 'WARNING' : 'SUCCESS',
    message: teamHasIssues ? `Kader-Check: ${squad.length} Spieler geprüft — ${noNumber.length + noPosition.length + dupNames.length} Auffälligkeiten.` : `Kader verifiziert: ${squad.length} Spieler, keine Auffälligkeiten.`,
    details: findingsTeam.map((f) => `${f.severity}: ${f.text}`).join(' | ')
  });

  /* ── 3. COMPETITIONAGENT: echte Spielplan-Checks ──────────────────── */
  const findingsComp: AgentFinding[] = [];
  const dupMatchIds = compMatches.filter((m: any, i: number) => compMatches.findIndex((x: any) => String(x.id) === String(m.id)) !== i);
  const noResult = compMatches.filter((m: any) => !hasResult(m));
  const noOpponent = compMatches.filter((m: any) => !String(m?.opponent || '').trim());
  const dated = compMatches.filter((m: any) => m?.date).map((m: any, i: number) => ({ m, i }));
  // nicht-chronologisch: Datum folgt nicht strikt aufsteigend
  let chronoBreaks = 0;
  for (let i = 1; i < dated.length; i++) {
    const t1 = new Date(String(dated[i - 1].m.date)).getTime();
    const t2 = new Date(String(dated[i].m.date)).getTime();
    if (!isNaN(t1) && !isNaN(t2) && t2 < t1) chronoBreaks++;
  }
  const reportsNoOpp = analyses.filter((a) => !String(a?.opponent || '').trim());
  const reportsNoDate = analyses.filter((a) => !String(a?.date || '').trim());
  if (dupMatchIds.length) findingsComp.push({ severity: 'ERROR', text: `${dupMatchIds.length} doppelte Spiele`, count: dupMatchIds.length });
  if (noResult.length) findingsComp.push({ severity: 'WARNING', text: `${noResult.length} Spiele ohne Ergebnis`, count: noResult.length });
  if (noOpponent.length) findingsComp.push({ severity: 'WARNING', text: `${noOpponent.length} Spiele ohne Gegner`, count: noOpponent.length });
  if (chronoBreaks) findingsComp.push({ severity: 'WARNING', text: `${chronoBreaks} Datums-Sprünge im Spielplan`, count: chronoBreaks });
  if (reportsNoOpp.length) findingsComp.push({ severity: 'WARNING', text: `${reportsNoOpp.length} Spielberichte ohne Gegner`, count: reportsNoOpp.length });
  if (reportsNoDate.length) findingsComp.push({ severity: 'WARNING', text: `${reportsNoDate.length} Spielberichte ohne Datum`, count: reportsNoDate.length });
  if (!findingsComp.length) findingsComp.push({ severity: 'INFO', text: 'Spielplan sauber: chronologisch, keine Duplikate.' });

  const compScore = clamp(100 - dupMatchIds.length * 8 - noResult.length * 2 - noOpponent.length * 2 - chronoBreaks * 3 - (reportsNoOpp.length + reportsNoDate.length) * 2);
  const compHasIssues = findingsComp.some((f) => f.severity === 'ERROR' || f.severity === 'WARNING');
  newLogs.push({
    id: `log-comp-${Date.now()}`,
    timestamp,
    agentId: 'CompetitionAgent',
    agentName: 'CompetitionAgent',
    type: compHasIssues ? 'WARNING' : 'SUCCESS',
    message: compHasIssues ? `Spielplan-Check: ${compMatches.length} Spiele, ${findingsComp.length} Befunde.` : `Spielplan verifiziert: ${compMatches.length} Spiele, chronologisch korrekt.`,
    details: findingsComp.map((f) => `${f.severity}: ${f.text}`).join(' | ')
  });

  /* ── 4. CLEANUPAGENT: echte Bereinigung-VORSCHLÄGE ─────────────────── */
  const findingsClean: AgentFinding[] = [];
  const cleanupProposals: string[] = [];
  const emptyReports = analyses.filter((a: any) => {
    const hasContent = String(a?.berichtText || '').trim().length > 0 || (Array.isArray(a?.presentationImages) && a.presentationImages.length > 0) || (Array.isArray(a?.videoClips) && a.videoClips.length > 0) || (Array.isArray(a?.scorers) && a.scorers.length > 0);
    return !hasContent && !String(a?.startingLineup || '').trim() ? a : null;
  }).filter(Boolean);
  emptyReports.forEach((a: any) => cleanupProposals.push(`Bericht "${a?.opponent || 'ohne Gegner'}"${a?.date ? ` (${a.date})` : ''} — leer, ohne Startelf/Inhalt`));
  dupNames.forEach(([k]) => cleanupProposals.push(`Duplikat im Kader: ${k.replace('|', ' ')} (${k})`));
  reportsNoDate.forEach((a: any) => cleanupProposals.push(`Bericht ${a?.opponent ? `"${a.opponent}"` : 'ohne Gegner'} fehlt ein Datum`));
  if (cleanupProposals.length) {
    findingsClean.push({ severity: 'WARNING', text: `${cleanupProposals.length} Bereinigung-Vorschläge (keine automatische Löschung!)`, count: cleanupProposals.length, items: cleanupProposals.slice(0, 8) });
  } else {
    findingsClean.push({ severity: 'INFO', text: 'Keine verwaisten oder doppelten Datensätze gefunden.' });
  }
  const cleanScore = clamp(100 - cleanupProposals.length * 5);
  newLogs.push({
    id: `log-clean-${Date.now()}`,
    timestamp,
    agentId: 'CleanupAgent',
    agentName: 'CleanupAgent',
    type: cleanupProposals.length ? 'WARNING' : 'SUCCESS',
    message: cleanupProposals.length ? `${cleanupProposals.length} Bereinigung-Vorschläge erkannt (Vorsicht: kein Selbst-Löschen).` : 'Datenbestand sauber: keine verwaisten Einträge.',
    details: findingsClean.map((f) => `${f.severity}: ${f.text}`).join(' | ')
  });

  /* ── 5. MEMORYAGENT: echte Archiv-Zusammenfassung ─────────────────── */
  const findingsMem: AgentFinding[] = [];
  const clipsCount = analyses.reduce((sum: number, a: any) => sum + (Array.isArray(a?.videoClips) ? a.videoClips.length : 0), 0);
  const kb = Math.round((JSON.stringify({ players, matches: compMatches, analyses }).length) / 1024);
  const sortedReps = [...analyses].sort((a: any, b: any) => new Date(String(b?.date || b?.createdAt || '')).getTime() - new Date(String(a?.date || a?.createdAt || '')).getTime());
  const latest = sortedReps.slice(0, 3).map((a: any) => `${a?.opponent || '?'}${a?.date ? ` (${a.date})` : ''}`).join(', ');
  if (!analyses.length) findingsMem.push({ severity: 'WARNING', text: 'Noch keine Spielberichte im Langzeitgedächtnis.', count: 0 });
  findingsMem.push({ severity: 'INFO', text: `Archiv: ${analyses.length} Spielberichte, ${clipsCount} Video-Clips, ${players.length} Personen (${kb} KB Datenvolumen im Sync)` });
  if (latest) findingsMem.push({ severity: 'INFO', text: `Neueste Berichte: ${latest}`, items: latest.split(', ') });

  const memScore = analyses.length ? 100 : 60;
  newLogs.push({
    id: `log-mem-${Date.now()}`,
    timestamp,
    agentId: 'MemoryAgent',
    agentName: 'MemoryAgent',
    type: analyses.length ? 'SUCCESS' : 'WARNING',
    message: `Memory Sync: ${analyses.length} Berichte, ${clipsCount} Clips, ${players.length} Personen — ${kb} KB synchronisiert.`,
    details: findingsMem.map((f) => `${f.severity}: ${f.text}`).join(' | ')
  });

  /* ── 1. SUPERVISORAGENT: echte Aggregation über alle Befunde ──────── */
  const allFindings = [...findingsTeam, ...findingsComp, ...findingsClean, ...findingsMem];
  const errCount = allFindings.filter((f) => f.severity === 'ERROR').length;
  const warnCount = allFindings.filter((f) => f.severity === 'WARNING').length;
  const aggScore = clamp(Math.min(teamScore, compScore, cleanScore, memScore) - errCount * 8 - warnCount * 2);
  const findingsSup: AgentFinding[] = [];
  if (errCount || warnCount) {
    findingsSup.push({ severity: errCount ? 'ERROR' : 'WARNING', text: `${errCount} Fehler und ${warnCount} Warnungen im System erkannt.`, count: errCount + warnCount });
  } else {
    findingsSup.push({ severity: 'INFO', text: 'Alle Systeme geprüft: keine Fehler, keine Warnungen.' });
  }
  findingsSup.push({ severity: 'INFO', text: `Health-Status: Supervisor ${aggScore}% · Team ${teamScore}% · Competition ${compScore}% · Cleanup ${cleanScore}% · Memory ${memScore}%` });
  newLogs.unshift({
    id: `log-sup-${Date.now()}`,
    timestamp,
    agentId: 'SupervisorAgent',
    agentName: 'SupervisorAgent',
    type: errCount ? 'ERROR' : warnCount ? 'WARNING' : 'SUCCESS',
    message: errCount ? `⚠ ${errCount} Fehler, ${warnCount} Warnungen — Befunde der Agents melden und beheben.` : warnCount ? `${warnCount} Warnungen — Empfehlung: Befunde in den Agent-Panels prüfen.` : 'Qualitäts-Gate: System 100% stabil, alle Agents ONLINE.',
    details: findingsSup.map((f) => `${f.severity}: ${f.text}`).join(' | ')
  });

  const updatedAgents: Record<string, AgentStatus> = {
    SupervisorAgent: {
      ...INITIAL_AGENTS_STATE.SupervisorAgent,
      status: 'ACTIVE',
      lastRun: timestamp,
      metrics: { processedCount: allFindings.length, healthScore: aggScore, syncStatus: errCount ? `${errCount} Fehler gefunden` : warnCount ? `${warnCount} Warnungen` : 'System 100% Stabil' },
      findings: findingsSup
    },
    TeamAgent: {
      ...INITIAL_AGENTS_STATE.TeamAgent,
      status: 'ACTIVE',
      lastRun: timestamp,
      metrics: { processedCount: squad.length, healthScore: teamScore, syncStatus: `${squad.length} Spieler · ${noNumber.length + noPosition.length + dupNames.length} Befunde` },
      findings: findingsTeam
    },
    CompetitionAgent: {
      ...INITIAL_AGENTS_STATE.CompetitionAgent,
      status: 'ACTIVE',
      lastRun: timestamp,
      metrics: { processedCount: compMatches.length, healthScore: compScore, syncStatus: `${compMatches.length} Spiele · ${findingsComp.length} Befunde` },
      findings: findingsComp
    },
    CleanupAgent: {
      ...INITIAL_AGENTS_STATE.CleanupAgent,
      status: 'ACTIVE',
      lastRun: timestamp,
      metrics: { processedCount: cleanupProposals.length, healthScore: cleanScore, syncStatus: cleanupProposals.length ? `${cleanupProposals.length} Bereinigung-Vorschläge` : '0 Konflikte' },
      findings: findingsClean
    },
    MemoryAgent: {
      ...INITIAL_AGENTS_STATE.MemoryAgent,
      status: 'ACTIVE',
      lastRun: timestamp,
      metrics: { processedCount: analyses.length + clipsCount, healthScore: memScore, syncStatus: `${kb} KB Firebase-Sync` },
      findings: findingsMem
    }
  };

  return { updatedAgents, logs: newLogs };
}