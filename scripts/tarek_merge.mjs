// Zusammenführen der Tarek-Schlehuber-Dublette.
// KEEP doc 1783859791577 (vollständig) ; DELETE doc "undefined" (mager, kaputte ID).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const outDir = path.join(root, '_tracker_audit');
fs.mkdirSync(outDir, { recursive: true });
const APPLY = process.argv.includes('--apply');

const KEEP = '1783859791577';
const DROP = 'undefined';

const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);

function stripUndef(o) {
  if (Array.isArray(o)) return o.map(stripUndef);
  if (o && typeof o === 'object' && !(o instanceof Date)) {
    const r = {};
    for (const [k, v] of Object.entries(o)) if (v !== undefined) r[k] = stripUndef(v);
    return r;
  }
  return o;
}

async function main() {
  await signInAnonymously(auth);
  const keepSnap = await getDoc(doc(db, 'spieler', KEEP));
  const dropSnap = await getDoc(doc(db, 'spieler', DROP));
  if (!keepSnap.exists()) throw new Error('KEEP-Doc fehlt: ' + KEEP);
  const keep = keepSnap.data();
  const drop = dropSnap.exists() ? dropSnap.data() : {};

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(outDir, `backup_tarek_${ts}.json`), JSON.stringify({ keep, drop }, null, 2));

  // Merge: bestehende (vollständige) Daten behalten, fehlende Titel/Position aus drop übernehmen, Namen normalisieren.
  const merged = {
    ...keep,
    id: KEEP,
    firstName: 'Tarek',
    lastName: 'Schlehuber',
    name: 'Tarek Schlehuber',
    titel: drop.titel || 'Dr.',
    position: 'Mannschaftsarzt',
    beruf: keep.beruf || drop.beruf || 'Arzt',
    category: 'medical',
    status: keep.status || drop.status || 'Aktiv',
    notizen: keep.notizen && keep.notizen.trim() ? keep.notizen : (drop.notizen || 'Mannschaftsarzt'),
  };

  console.log('=== MERGE-PLAN ===');
  console.log('KEEP  spieler/' + KEEP + '  ->', {
    firstName: merged.firstName, lastName: merged.lastName, name: merged.name,
    titel: merged.titel, position: merged.position, notizen: merged.notizen, category: merged.category,
  });
  console.log('DELETE spieler/' + DROP + '  ("' + (drop.name || '?') + '")');

  if (!APPLY) {
    console.log('\n[DRY-RUN] Nichts geschrieben. Mit --apply anwenden.');
    await auth.signOut(); process.exit(0);
  }

  await setDoc(doc(db, 'spieler', KEEP), stripUndef(merged), { merge: true });
  await deleteDoc(doc(db, 'spieler', DROP));

  const check = await getDoc(doc(db, 'spieler', KEEP));
  const gone = await getDoc(doc(db, 'spieler', DROP));
  console.log('\n[APPLIED] KEEP vorhanden:', check.exists(), '| DROP entfernt:', !gone.exists());
  console.log('KEEP jetzt:', JSON.stringify({ firstName: check.data().firstName, lastName: check.data().lastName, name: check.data().name, titel: check.data().titel, position: check.data().position, id: check.data().id }));
  await auth.signOut(); process.exit(0);
}
main().catch(e => { console.error('MERGE ERROR:', e?.message || e); process.exit(1); });
