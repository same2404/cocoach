import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, collection } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const cols = ['run_records', 'run_meta', 'training', 'yearly_plan', 'vorbereitung_winter', 'individual_training'];
const PAT = /2026-07-0[0-9]|2026-06-(1[7-9]|2\d|30)|Fahrtspiel|Dauerlauf|Aktiv/i;

for (const c of cols) {
  console.log('\n============ ' + c + ' ============');
  try {
    const snap = await getDocs(collection(db, c));
    console.log('count:', snap.size);
    const rows = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
      .sort((a, b) => JSON.stringify(a.data).localeCompare(JSON.stringify(b.data)));
    for (const r of rows) {
      const txt = JSON.stringify(r.data);
      console.log(`${r.id} :: ${txt.slice(0, 400)}`);
    }
  } catch (e) { console.log('FAIL', e.code, e.message); }
}
process.exit(0);
