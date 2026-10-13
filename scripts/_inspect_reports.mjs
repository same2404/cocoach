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

await signInAnonymously(auth);
const snap = await getDocs(collection(db, 'tracker_academy_reports'));
const rows = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
console.log('TOTAL reports:', rows.length);
const byMin = {};
for (const r of rows) { const t = r.createdAt ? new Date(r.createdAt) : null; const k = t ? t.toISOString().slice(0, 16) : 'no-createdAt'; byMin[k] = (byMin[k] || 0) + 1; }
console.log('\nPer minute (top 20):');
Object.entries(byMin).sort().slice(-20).forEach(([k, v]) => console.log(`  ${k} : ${v}`));
console.log('\nLatest 12:');
rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
for (const r of rows.slice(0, 12)) console.log(`  ${r.createdAt ? new Date(r.createdAt).toISOString().slice(0,19) : '?'} | ${r.playerName} | ${r.rawFileName} | id=${r.id}`);
const distinctPlayers = new Set(rows.map(r => r.playerId));
console.log('\ndistinct playerIds:', distinctPlayers.size);
const byName = {};
for (const r of rows) byName[r.rawFileName] = (byName[r.rawFileName] || 0) + 1;
const dupNames = Object.entries(byName).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
console.log('duplicate rawFileName count:', dupNames.length, '-> top:', dupNames.slice(0, 5));
await auth.signOut();
process.exit(0);
