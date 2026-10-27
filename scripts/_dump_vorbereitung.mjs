import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, collection } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const cols = ['vorbereitung_sommer', 'vorbereitung_winter', 'winter_prep_config', 'sommer_prep_config', 'preparation_plan', 'ten_day_plan', 'einheiten', 'vorbereitung_plan'];
for (const c of cols) {
  try {
    const snap = await getDocs(collection(db, c));
    console.log(c, snap.size);
  } catch (e) { console.log(c, 'FAIL', e.code); }
}

console.log('\n=== vorbereitung_sommer (nach Datum) ===');
const snap = await getDocs(collection(db, 'vorbereitung_sommer'));
const rows = snap.docs.map((d) => {
  const x = d.data();
  return { date: x.date || '', day: x.day || '', type: x.type || '', content: x.content || '', remarks: x.remarks || '', start: x.start || '', end: x.end || '', intensity: x.intensity || '', te: x.te, kw: x.kw };
}).sort((a, b) => String(a.date).localeCompare(String(b.date)));
rows.forEach((r) => console.log(`${r.date} ${String(r.day).padEnd(3)} ${String(r.type).padEnd(10)} te=${r.te} kw=${r.kw} ${r.start}-${r.end} ${r.content} ${r.remarks} ${r.opponent || ''}`));
process.exit(0);
