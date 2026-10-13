// Link central tracker reports into each player's trackerHistory.
// APPEND-ONLY: existing trackerHistory entries are preserved untouched; new entries are prepended.
// Filtered + deduplicated. Dry-run by default; pass --apply to write.
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

const ALLOWED_EXT = /\.(bin|zip|fit|gpx|tcx|csv|json)$/i;
const BLACKLIST = ['settings', 'trackerid', 'zentri', '.upd', 'live-tracker', 'live tracker', 'automatisch', 'config', 'manifest', 'readme', 'androidmanifest', 'gradle', 'license', '.txt'];

function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function stripUndef(o) {
  if (Array.isArray(o)) return o.map(stripUndef);
  if (o && typeof o === 'object') {
    const r = {};
    for (const k of Object.keys(o)) { if (o[k] !== undefined) r[k] = stripUndef(o[k]); }
    return r;
  }
  return o;
}
function coreName(fn) {
  let s = String(fn || '').replace(/^ZIP Archive:\s*/i, '').trim();
  s = s.split(/[\\/]/).pop();
  s = s.replace(/\.[a-z0-9]+$/i, '');
  s = s.replace(/\s*\(\d+\)\s*$/, '');
  return s.toLowerCase();
}
function isValidFile(fn) {
  const s = String(fn || '').replace(/^ZIP Archive:\s*/i, '').trim();
  if (!ALLOWED_EXT.test(s)) return false;
  const low = s.toLowerCase();
  return !BLACKLIST.some(b => low.includes(b));
}
function histCore(item) {
  return coreName(item.fileName || item.matchName || '');
}
function fullName(p) { return `${p.firstName || ''} ${p.lastName || ''}`.trim() || p.name || ''; }

async function main() {
  await signInAnonymously(auth);
  const [pSnap, rSnap] = await Promise.all([
    getDocs(collection(db, 'spieler')),
    getDocs(collection(db, 'tracker_academy_reports')),
  ]);
  const players = pSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  const reports = rSnap.docs.map(d => ({ _docId: d.id, ...d.data() }));

  const reportsById = new Map();
  for (const r of reports) { if (!reportsById.has(String(r.playerId))) reportsById.set(String(r.playerId), []); reportsById.get(String(r.playerId)).push(r); }

  const plan = [];
  let totalNew = 0, totalSkipped = 0;

  for (const p of players) {
    const cat = p.category;
    if (cat && cat !== 'player' && cat !== 'spieler') continue;
    const hist = Array.isArray(p.trackerHistory) ? p.trackerHistory : [];
    // Candidate reports for this player (by id field OR doc id fallback handled by caller linking)
    const reps = reportsById.get(String(p.id)) || [];
    // existing ids and cores (append-only safety)
    const existingIds = new Set(hist.map(h => String(h.id)));
    const existingCores = new Set(hist.map(histCore).filter(Boolean));

    // filter + dedup candidates
    const byCore = new Map();
    for (const r of reps) {
      const fn = r.rawFileName;
      if (!isValidFile(fn)) { totalSkipped++; continue; }
      const core = coreName(fn);
      if (!core) { totalSkipped++; continue; }
      if (existingCores.has(core)) { totalSkipped++; continue; }
      const linkId = `tracker_link_${r.id || r._docId}`;
      if (existingIds.has(linkId)) { totalSkipped++; continue; }
      const prev = byCore.get(core);
      if (!prev || (r.createdAt || 0) > (prev.createdAt || 0)) byCore.set(core, r);
    }

    const newEntries = [];
    for (const r of [...byCore.values()].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))) {
      const m = r.metrics || {};
      const rId = String(r.id || r._docId);
      newEntries.push(stripUndef({
        id: `tracker_link_${rId}`,
        spielerId: String(p.id ?? p._docId),
        name: fullName(p),
        datum: r.analysisDate || '',
        uhrzeit: '12:00',
        trainingId: `TR-${(r.analysisDate || '').replace(/-/g, '')}`,
        trackerQuelle: 'Tracker-Akademie (zentral)',
        gesamtDistanzMeter: Math.round((m.totalDistanceKm || 0) * 1000),
        gesamtDauerSekunden: 0,
        durchschnittsGeschwindigkeitKmh: m.avgSpeedKmh || 0,
        maxGeschwindigkeitKmh: m.maxSpeedKmh || 0,
        durchschnittsHerzfrequenz: m.avgHeartRateBpm || 0,
        maxHerzfrequenz: m.maxHeartRateBpm || 0,
        belastungsZonen: { zone1LockerMin: 0, zone2NormalMin: 0, zone3IntensivMin: 0, zone4SehrIntensivMin: 0 },
        sprints: [],
        gpsPunkte: [],
        fileName: r.rawFileName || 'Tracker_Data.bin',
        uploadedAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        sourceReportId: rId,
        linkedFrom: 'tracker_academy_reports',
      }));
    }

    if (newEntries.length) {
      plan.push({ _docId: p._docId, id: p.id, name: fullName(p), existingCount: hist.length, addCount: newEntries.length, newEntries, hist });
      totalNew += newEntries.length;
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const planSummary = plan.map(x => ({ docId: x._docId, id: x.id, name: x.name, existing: x.existingCount, add: x.addCount, files: x.newEntries.map(e => e.fileName) }));
  fs.writeFileSync(path.join(outDir, `link_plan_${stamp}.json`), JSON.stringify({ apply: APPLY, totals: { playersAffected: plan.length, newEntries: totalNew, skipped: totalSkipped }, plan: planSummary }, null, 2));

  console.log(`MODE: ${APPLY ? 'APPLY (schreibt!)' : 'DRY-RUN (nur Vorschau)'}`);
  console.log(`Neue Verknüpfungen: ${totalNew} in ${plan.length} Spielerprofilen | übersprungen (Junk/Duplikat): ${totalSkipped}`);
  for (const x of plan.sort((a, b) => b.addCount - a.addCount)) {
    console.log(`  ${x.name} [doc ${x._docId}] : +${x.addCount} (hat ${x.existingCount})  -> ${x.newEntries.map(e => e.fileName).join(', ')}`);
  }

  if (!APPLY) { console.log('\nDRY-RUN beendet. Zum Schreiben: node scripts/tracker_link_apply.mjs --apply'); await auth.signOut(); process.exit(0); }

  // APPLY
  const log = [];
  for (const x of plan) {
    const merged = [...x.newEntries, ...x.hist]; // prepend new, keep existing untouched
    try {
      await setDoc(doc(db, 'spieler', x._docId), { trackerHistory: merged }, { merge: true });
      log.push({ docId: x._docId, name: x.name, added: x.newEntries.length, ok: true });
      console.log(`  geschrieben: ${x.name} (+${x.newEntries.length})`);
    } catch (e) {
      log.push({ docId: x._docId, name: x.name, added: x.newEntries.length, ok: false, error: String(e?.message || e) });
      console.log(`  FEHLER ${x.name}: ${e?.message || e}`);
    }
  }
  fs.writeFileSync(path.join(outDir, `link_apply_log_${stamp}.json`), JSON.stringify(log, null, 2));
  console.log('\nFertig. Log: link_apply_log_' + stamp + '.json');
  await auth.signOut();
  process.exit(0);
}

main().catch(e => { console.error('LINK ERROR:', e?.message || e); process.exit(1); });
