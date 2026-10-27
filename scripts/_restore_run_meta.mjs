import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const missing = [
  {
    id: 'run_13',
    name: 'Tag 14: Start Vorbereitung (Teamtraining)',
    date: '2026-07-06',
    content: 'Einlaufen 20 min, 6–8 × 10–30 m (volle Pause zwischen den Läufen), 25 min locker Auslaufen – im Teamtraining 18:00–20:30 integriert. | Ziel: Direkt mit Intensität in die Vorbereitung starten (Start Vorbereitung mit Besprechung).'
  },
  {
    id: 'run_14',
    name: 'Tag 15: Teamtraining',
    date: '2026-07-07',
    content: 'Locker einlaufen 25 min, 4–6 × 400 m (80–90%), 20 min locker Auslaufen – im Teamtraining 19:00–20:45 integriert. | Ziel: Spielnahe Ausdauer im Teamtraining halten.'
  }
];

for (const m of missing) {
  const snap = await getDoc(doc(db, 'run_meta', m.id));
  if (snap.exists()) {
    console.log(`${m.id} existiert bereits -> übersprungen:`, JSON.stringify(snap.data()));
  } else {
    await setDoc(doc(db, 'run_meta', m.id), m, { merge: true });
    console.log(`${m.id} geschrieben.`);
  }
}

process.exit(0);
