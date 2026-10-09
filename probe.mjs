import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, collection } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);
console.log('UID:', auth.currentUser?.uid, new Date().toISOString());
for (const coll of ['competitive_matches', 'competitive_minutes', 'test_matches', 'test_minutes', 'match_analyses', 'spieler']) {
  try {
    const snap = await getDocs(collection(db, coll));
    console.log(`${coll}: ${snap.size}`);
  } catch (e) { console.log(`${coll} FAIL:`, e.code, e.message); }
}
process.exit(0);