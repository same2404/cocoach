import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config, 'a4');
const db = getFirestore(app, config.firestoreDatabaseId || '');
await signInAnonymously(getAuth(app));
const snap = await getDocs(query(collection(db, 'training_sessions')));
for (const d of snap.docs) {
  const p = d.data().players;
  if (Array.isArray(p) && p.length) {
    console.log('id', d.id, 'date', d.data().date);
    console.log('  players[0] =', JSON.stringify(p[0]).slice(0, 400));
    console.log('  Fields eines players-Objekts:', Object.keys(p[0]).join(', '));
    break;
  }
}

// Anwesenheit-in-Trainingsplan: gibt es einen Status wie anwesend/teilgenommen?
const snap2 = await getDocs(query(collection(db, 'training_sessions')));
for (const d of snap2.docs) {
  const p = d.data().players || [];
  const vals = new Map();
  for (const pl of p) for (const k of Object.keys(pl)) if (typeof pl[k] === 'string') vals.set(k, pl[k]);
  const suspicious = [...vals.keys()].filter((k) => /an|att|pres|status|teil|v|x/i.test(k));
  if (suspicious.length) {
    console.log('date', d.data().date, '-> Status-ähnliche Felder:', [...new Set(p.flatMap((pl) => Object.keys(pl)))].join(', '));
    console.log('Beispiel-Werte:', JSON.stringify(p[0]).slice(0, 600));
    break;
  }
}
console.log('fertig');