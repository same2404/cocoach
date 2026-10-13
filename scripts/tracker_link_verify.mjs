// Verify the append-only linkage: compare pre-change backup vs current Firestore.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const dir = path.join(root, '_tracker_audit');
const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);

const backupFile = fs.readdirSync(dir).filter(f => f.startsWith('backup_spieler_')).sort().pop();
const before = JSON.parse(fs.readFileSync(path.join(dir, backupFile), 'utf8'));
const beforeIds = new Map(before.players.map(p => [p._docId, p]));

async function main() {
  await signInAnonymously(auth);
  const snap = await getDocs(collection(db, 'spieler'));
  const after = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));

  let lostTotal = 0, addedTotal = 0;
  const rows = [];
  for (const a of after) {
    const b = beforeIds.get(a._docId);
    const bh = b && Array.isArray(b.trackerHistory) ? b.trackerHistory : [];
    const ah = Array.isArray(a.trackerHistory) ? a.trackerHistory : [];
    const bIds = new Set(bh.map(h => String(h.id || h.fileName)));
    const aIds = new Set(ah.map(h => String(h.id || h.fileName)));
    const lost = [...bIds].filter(x => !aIds.has(x));
    const added = [...aIds].filter(x => !bIds.has(x));
    if (lost.length || added.length) {
      rows.push({ docId: a._docId, name: `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.name, before: bh.length, after: ah.length, added: added.length, lost: lost.length, lostItems: lost });
    }
    lostTotal += lost.length; addedTotal += added.length;
  }

  console.log(`Backup (vorher): ${backupFile}`);
  console.log(`Spieler gesamt: ${after.length}`);
  console.log(`Neu hinzugefügt (gesamt): ${addedTotal}`);
  console.log(`VERLOREN/ÜBERSCHRIEBEN (gesamt): ${lostTotal}  <-- muss 0 sein`);
  console.log('');
  console.log('Spieler | vorher | nachher | +neu | verloren');
  for (const r of rows.sort((a, b) => b.added - a.added)) console.log(`${r.name} [${r.docId}] | ${r.before} | ${r.after} | +${r.added} | ${r.lost}`);
  if (lostTotal > 0) { console.log('\nWARNUNG – verlorene Einträge:'); for (const r of rows) for (const l of r.lostItems) console.log(`  ${r.name}: ${l}`); }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(dir, `verify_${stamp}.json`), JSON.stringify({ backupFile, addedTotal, lostTotal, rows }, null, 2));
  await auth.signOut();
  process.exit(lostTotal > 0 ? 2 : 0);
}
main().catch(e => { console.error('VERIFY ERROR:', e?.message || e); process.exit(1); });
