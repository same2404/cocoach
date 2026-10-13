// Report-level cleanup for the central collection `tracker_academy_reports`:
//  - remove DUPLICATE reports (same playerId + rawFileName + analysisDate), keep newest
//  - remove JUNK-source reports (auto/simulated imports, settings.zip, trackerId.zip, zentri.upd)
// Backup first. Dry-run by default; pass --apply to delete.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const APPLY = process.argv.includes('--apply');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const outDir = path.join(root, '_tracker_audit');
fs.mkdirSync(outDir, { recursive: true });

const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);

const JUNK_NAMES = [
  'live-tracker import (gps telemetrie)',
  'manueller text-import',
  'automatischer tracker-import (gps/hr)',
  '',
];
const JUNK_RE = /settings\.zip|trackerid\.zip|zentri\.upd|standardkonfiguration/i;
function isJunk(r) {
  const n = String(r.rawFileName || '').toLowerCase().trim();
  if (JUNK_RE.test(n)) return true;
  return JUNK_NAMES.includes(n);
}

async function main() {
  await signInAnonymously(auth);
  const snap = await getDocs(collection(db, 'tracker_academy_reports'));
  const rows = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(outDir, `backup_reports_${stamp}.json`),
    JSON.stringify({ fetchedAt: new Date().toISOString(), dbId: cfg.firestoreDatabaseId, count: rows.length, reports: rows }, null, 2));

  const removeIds = new Set();
  const reasons = new Map();

  // 1. junk-source
  for (const r of rows) if (isJunk(r)) { removeIds.add(r._docId); reasons.set(r._docId, 'junk'); }

  // 2. duplicates (keep newest per playerId|rawFileName|analysisDate)
  const groups = new Map();
  for (const r of rows) {
    if (removeIds.has(r._docId)) continue;
    const k = `${r.playerId}|${String(r.rawFileName || '').toLowerCase()}|${r.analysisDate || ''}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const arr of groups.values()) {
    if (arr.length < 2) continue;
    arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    for (const r of arr.slice(1)) { removeIds.add(r._docId); reasons.set(r._docId, 'dupe'); }
  }

  // report
  const byReason = { junk: 0, dupe: 0 };
  for (const id of removeIds) byReason[reasons.get(id)]++;
  console.log(`MODE: ${APPLY ? 'APPLY (loescht!)' : 'DRY-RUN (nur Vorschau)'}`);
  console.log(`Backup: backup_reports_${stamp}.json (${rows.length} Reports)`);
  console.log(`Zu loeschen: ${removeIds.size}  (Junk: ${byReason.junk}, Duplikate: ${byReason.dupe})`);
  console.log(`Bleiben: ${rows.length - removeIds.size}`);
  const survivorsByPlayer = {};
  for (const r of rows) if (!removeIds.has(r._docId)) survivorsByPlayer[r.playerName] = (survivorsByPlayer[r.playerName] || 0) + 1;
  console.log('Verbleibende Reports je Spieler (Top 15):');
  Object.entries(survivorsByPlayer).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([n, c]) => console.log(`  ${n}: ${c}`));

  fs.writeFileSync(path.join(outDir, `reports_cleanup_plan_${stamp}.json`),
    JSON.stringify({ apply: APPLY, total: rows.length, remove: removeIds.size, byReason, removeList: [...removeIds].map(id => { const r = rows.find(x => x._docId === id); return { _docId: id, reason: reasons.get(id), playerName: r?.playerName, rawFileName: r?.rawFileName, analysisDate: r?.analysisDate, createdAt: r?.createdAt }; }) }, null, 2));

  if (!APPLY) { console.log('\nDRY-RUN. Zum Loeschen: node scripts/tracker_reports_cleanup.mjs --apply'); await auth.signOut(); process.exit(0); }

  let ok = 0, fail = 0;
  for (const r of rows) {
    if (!removeIds.has(r._docId)) continue;
    try { await deleteDoc(doc(db, 'tracker_academy_reports', r._docId)); ok++; }
    catch (e) { fail++; console.log(`  FEHLER ${r._docId}: ${e?.message || e}`); }
  }
  fs.writeFileSync(path.join(outDir, `reports_cleanup_log_${stamp}.json`), JSON.stringify({ ok, fail, total: removeIds.size }, null, 2));
  console.log(`\nFertig. geloescht: ${ok}, Fehler: ${fail}`);
  await auth.signOut();
  process.exit(0);
}
main().catch(e => { console.error('REPORTS CLEANUP ERROR:', e?.message || e); process.exit(1); });
