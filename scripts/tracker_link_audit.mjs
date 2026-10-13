// Read-only audit: linkage between players (spieler) and central tracker reports (tracker_academy_reports)
// AND each player's own trackerHistory. Writes a backup + dry-run report. NEVER writes to Firestore.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));

const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);

const outDir = path.join(root, '_tracker_audit');
fs.mkdirSync(outDir, { recursive: true });

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}
function histKey(item) {
  const fn = item.fileName || item.matchName || '';
  const d = item.datum || item.date || item.sessionDate || item.recordingDate || '';
  if (fn) return `fn:${norm(fn)}`;
  return `d:${d}|q:${norm(item.trackerQuelle || '')}`;
}

async function main() {
  await signInAnonymously(auth);
  const [playersSnap, reportsSnap] = await Promise.all([
    getDocs(collection(db, 'spieler')),
    getDocs(collection(db, 'tracker_academy_reports')),
  ]);
  const players = playersSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  const reports = reportsSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(outDir, `backup_spieler_${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify({ fetchedAt: new Date().toISOString(), project: cfg.projectId, dbId: cfg.firestoreDatabaseId, playersCount: players.length, reportsCount: reports.length, players, reports }, null, 2));

  const rosterPlayers = players.filter(p => {
    const c = p.category;
    return !c || c === 'player' || c === 'spieler';
  });

  const reportByPlayerId = new Map();
  const reportByName = new Map();
  for (const r of reports) {
    if (r.playerId) {
      if (!reportByPlayerId.has(String(r.playerId))) reportByPlayerId.set(String(r.playerId), []);
      reportByPlayerId.get(String(r.playerId)).push(r);
    }
    const n = norm(r.playerName);
    if (n) {
      if (!reportByName.has(n)) reportByName.set(n, []);
      reportByName.get(n).push(r);
    }
  }

  const rows = [];
  const matchedReportIds = new Set();

  for (const p of rosterPlayers) {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || '';
    const hist = Array.isArray(p.trackerHistory) ? p.trackerHistory : [];
    const seen = new Set();
    const dupes = [];
    let brokenRef = 0;
    for (const h of hist) {
      const k = histKey(h);
      if (seen.has(k)) dupes.push(k); else seen.add(k);
      if (h.spielerId && String(h.spielerId) !== String(p.id)) brokenRef++;
    }
    const repForPlayer = [...(reportByPlayerId.get(String(p.id)) || [])];
    for (const r of (reportByName.get(norm(fullName)) || [])) if (!repForPlayer.includes(r)) repForPlayer.push(r);
    repForPlayer.forEach(r => matchedReportIds.add(r._docId));

    // Reports that are not yet represented in this player's trackerHistory
    const missing = repForPlayer.filter(r => {
      const kFn = r.rawFileName ? `fn:${norm(r.rawFileName)}` : null;
      const kD = `d:${r.analysisDate || ''}`;
      return !(seen.has(kFn) || seen.has(kD));
    });

    rows.push({
      id: p.id, name: fullName, position: p.position || '', category: p.category || '',
      histCount: hist.length, dupes: dupes.length, brokenRef,
      hasTrackerAnalysis: !!p.trackerAnalysis,
      reportsLinked: repForPlayer.length, reportsMissingInHistory: missing.length,
      missingFiles: missing.map(r => r.rawFileName || r.analysisDate || r.id),
    });
  }

  const orphanReports = reports.filter(r => !matchedReportIds.has(r._docId));

  const totalHist = rows.reduce((a, r) => a + r.histCount, 0);
  const totalMissing = rows.reduce((a, r) => a + r.reportsMissingInHistory, 0);
  const totalDupes = rows.reduce((a, r) => a + r.dupes, 0);
  const totalBroken = rows.reduce((a, r) => a + r.brokenRef, 0);

  const summary = {
    fetchedAt: new Date().toISOString(),
    playersTotal: players.length,
    rosterPlayers: rosterPlayers.length,
    reportsTotal: reports.length,
    trackerHistoryEntriesTotal: totalHist,
    reportsMissingInHistory: totalMissing,
    duplicateHistoryEntries: totalDupes,
    brokenSpielerIdRefs: totalBroken,
    orphanReports: orphanReports.length,
    playersWithTrackerHistory: rows.filter(r => r.histCount > 0).length,
    playersWithTrackerAnalysis: rows.filter(r => r.hasTrackerAnalysis).length,
  };

  fs.writeFileSync(path.join(outDir, `dryrun_summary_${stamp}.json`), JSON.stringify({ summary, rows, orphanReports: orphanReports.map(r => ({ id: r.id, playerId: r.playerId, playerName: r.playerName, rawFileName: r.rawFileName, analysisDate: r.analysisDate })) }, null, 2));

  // Text table
  const lines = [];
  lines.push('=== TRACKER LINKAGE – DRY RUN (READ ONLY) ===');
  lines.push(`Backup: ${backupPath}`);
  lines.push(`Players: ${players.length} (Roster: ${rosterPlayers.length}) | Zentral-Reports: ${reports.length}`);
  lines.push(`trackerHistory-Einträge gesamt: ${totalHist}`);
  lines.push(`Fehlende Verknüpfungen (Report -> History): ${totalMissing}`);
  lines.push(`Doppelte History-Einträge: ${totalDupes}`);
  lines.push(`Kaputte spielerId-Referenzen: ${totalBroken}`);
  lines.push(`Verwaiste Reports (kein Spieler): ${orphanReports.length}`);
  lines.push('');
  lines.push('Spieler | Pos | History | Reports | fehlt | Dupl | kaputt | Analyse');
  lines.push('-'.repeat(90));
  for (const r of rows.sort((a, b) => b.reportsMissingInHistory - a.reportsMissingInHistory)) {
    lines.push(`${r.name} (${r.id}) | ${r.position} | ${r.histCount} | ${r.reportsLinked} | ${r.reportsMissingInHistory} | ${r.dupes} | ${r.brokenRef} | ${r.hasTrackerAnalysis ? 'ja' : 'nein'}`);
  }
  if (orphanReports.length) {
    lines.push('');
    lines.push('Verwaiste Reports (playerId passt zu keinem Roster-Spieler):');
    for (const r of orphanReports) lines.push(`  - ${r.playerName} (playerId=${r.playerId}) ${r.rawFileName || ''} ${r.analysisDate || ''}`);
  }
  const txt = lines.join('\n');
  fs.writeFileSync(path.join(outDir, `dryrun_table_${stamp}.txt`), txt);
  console.log(txt);

  await auth.signOut();
  process.exit(0);
}

main().catch(e => { console.error('AUDIT ERROR:', e?.message || e); process.exit(1); });
