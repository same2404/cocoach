import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, collection, getDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

for (const id of ['2', '3', '4', '5', '6', '33', '8']) {
  const s = await getDoc(doc(db, 'competitive_matches', id));
  if (s.exists()) {
    const f = s.data();
    console.log(`GET ${id} OK | date=${f.date} opp=${f.opponent} res=${f.result} lineup=${Array.isArray(f.lineup) ? f.lineup.length : '-'}`);
  } else console.log(`GET ${id} NOT EXISTS / denied`);
}
const cm = await getDocs(collection(db, 'competitive_matches'));
console.log('LIST competitive_matches:', cm.size);
const mn = await getDocs(collection(db, 'competitive_minutes'));
console.log('LIST competitive_minutes:', mn.size);
process.exit(0);