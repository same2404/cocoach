// Cleanup trackerHistory across players:
//  - remove DUPLICATE entries (same normalized fileName), keeping the richest/newest
//  - FIX broken spielerId refs (set to the owning player's id)
//  - FIX players missing an `id` field (set id = docId)
// Writes a fresh backup first. Dry-run by default; pass --apply to write.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
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

function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
function histKey(item) {
  const fn = item.fileName || item.matchName || '';
  if (fn) return `fn:${norm(fn)}`;
  const d = item.datum || item.date || item.sessionDate || item.recordingDate || '';
  return `d:${d}|q:${norm(item.trackerQuelle || '')}`;
}
function score(h) {
  let s = 0;
  if (Number(h.gesamtDauerSekunden) > 0) s += 4;
  if (Array.isArray(h.sprints) && h.sprints.length) s += 3;
  if (Array.isArray(h.gpsPunkte) && h.gpsPunkte.length) s += 3;
  const bz = h.belastungsZonen || {};
  if (Object.values(bz).some(v => Number(v) > 0)) s += 2;
  if (h.uploadedAt) s += 1;
  if (!String(h.id || '').startsWith('tracker_link_')) s += 1;
  return s;
}
function nameOf(p) { return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || ''; }

async function main() {
  await signInAnonymously(auth);
  const pSnap = await getDocs(collection(db, 'spieler'));
  const players = pSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(outDir, `backup_spieler_${stamp}.json`),
    JSON.stringify({ fetchedAt: new Date().toISOString(), project: cfg.projectId, dbId: cfg.firestoreDatabaseId, playersCount: players.length, players }, null, 2));

  const plan = [];
  let dupRemoved = 0, refsFixed = 0, idsFixed = 0, playersTouched = 0;
  const samples = [];

  for (const p of players) {
    const roster = !p.category || p.category === 'player' || p.category === 'spieler';
    if (!roster) continue;
    const correctId = String(p.id ?? p._docId);
    const hist = Array.isArray(p.trackerHistory) ? p.trackerHistory : [];
    if (!hist.length && p.id !== undefined) continue;

    const groups = new Map();
    for (const h of hist) { const k = histKey(h); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(h); }

    const removeSet = new Set();
    for (const [k, arr] of groups) {
      if (arr.length < 2) continue;
      let best = arr[0];
      for (const h of arr) if (score(h) > score(best)) best = h;
      let removedHere = 0;
      for (const h of arr) { if (h !== best) { removeSet.add(h); removedHere++; } }
      dupRemoved += removedHere;
      if (samples.length < 8) samples.push({ player: nameOf(p), kept: best.id || best.fileName, removed: arr.filter(x => x !== best).map(x => x.id || x.fileName) });
    }

    const newHist = [];
    for (const h of hist) {
      if (removeSet.has(h)) continue;
      const entry = { ...h };
      if (String(entry.spielerId ?? '') !== correctId) { entry.spielerId = correctId; refsFixed++; }
      newHist.push(entry);
    }

    const changes = {};
    if (removeSet.size) changes.trackerHistory = newHist;
    if (p.id === undefined) { changes.id = correctId; idsFixed++; }
    if (Object.keys(changes).length) { plan.push({ _docId: p._docId, name: nameOf(p), removed: removeSet.size, idFix: p.id === undefined }); playersTouched++; }
  }

  fs.writeFileSync(path.join(outDir, `cleanup_plan_${stamp}.json`), JSON.stringify({ apply: APPLY, totals: { dupRemoved, refsFixed, idsFixed, playersTouched }, plan, samples }, null, 2));

  console.log(`MODE: ${APPLY ? 'APPLY (schreibt!)' : 'DRY-RUN (nur Vorschau)'}`);
  console.log(`Backup: backup_spieler_${stamp}.json`);
  console.log(`Duplikate zu entfernen: ${dupRemoved}`);
  console.log(`kaputte spielerId-Refs zu korrigieren: ${refsFixed}`);
  console.log(`fehlende id-Felder zu setzen: ${idsFixed}`);
  console.log(`betroffene Profile: ${playersTouched}`);
  if (samples.length) { console.log('\nBeispiele (Duplikat entfernt):'); for (const s of samples) console.log(`  ${s.player}: behalten="${s.kept}" entfernen=[${s.removed.join(', ')}]`); }
  for (const x of plan.sort((a, b) => b.removed - a.removed)) console.log(`  ${x.name} [${x._docId}] -dupes:${x.removed}${x.idFix ? ' +id' : ''}`);

  if (!APPLY) { console.log('\nDRY-RUN. Zum Schreiben: node scripts/tracker_cleanup.mjs --apply'); await auth.signOut(); process.exit(0); }

  const log = [];
  for (const p of players) {
    const roster = !p.category || p.category === 'player' || p.category === 'spieler';
    if (!roster) continue;
    const correctId = String(p.id ?? p._docId);
    const hist = Array.isArray(p.trackerHistory) ? p.trackerHistory : [];
    const groups = new Map();
    for (const h of hist) { const k = histKey(h); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(h); }
    const removeSet = new Set();
    for (const arr of groups.values()) { if (arr.length < 2) continue; let best = arr[0]; for (const h of arr) if (score(h) > score(best)) best = h; for (const h of arr) if (h !== best) removeSet.add(h); }
    const changes = {};
    if (removeSet.size) changes.trackerHistory = hist.filter(h => !removeSet.has(h)).map(h => (String(h.spielerId ?? '') !== correctId ? { ...h, spielerId: correctId } : h));
    if (p.id === undefined) changes.id = correctId;
    if (!Object.keys(changes).length) continue;
    try { await setDoc(doc(db, 'spieler', p._docId), changes, { merge: true }); log.push({ docId: p._docId, name: nameOf(p), ok: true, ...changes.trackerHistory ? { newLen: changes.trackerHistory.length } : {} }); console.log(`  geschrieben: ${nameOf(p)}`); }
    catch (e) { log.push({ docId: p._docId, name: nameOf(p), ok: false, error: String(e?.message || e) }); console.log(`  FEHLER ${nameOf(p)}: ${e?.message || e}`); }
  }
  fs.writeFileSync(path.join(outDir, `cleanup_log_${stamp}.json`), JSON.stringify(log, null, 2));
  console.log('\nFertig. Log: cleanup_log_' + stamp + '.json');
  await auth.signOut();
  process.exit(0);
}
main().catch(e => { console.error('CLEANUP ERROR:', e?.message || e); process.exit(1); });
