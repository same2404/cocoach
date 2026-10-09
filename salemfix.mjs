import { initializeApp } from 'firebase/app';
import { initializeFirestore, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const salem = {
  id: '33',
  opponent: 'FC Rot-Weiß Salem',
  location: 'Salem (Auswärts)',
  isHome: false,
  kickOff: '15:30',
  meetingTime: '14:00',
  date: '2026-09-12',
  competition: 'Verbandsliga Südbaden',
  result: '1:2',
  status: 'Gespielt',
  index: 8,
  avgAge: 25.3,
  lineup: ['Lauer', 'Agbozo', 'Fangmeier', 'Reinecker', 'Dischinger', 'Ehret Jo', 'Scalici', 'Roth Y', 'Roth M', 'Disch', 'Nguyen', 'Tiedemann', 'Souleymané', 'Akuegwu'],
  startingLineup: [
    '23 S. Lauer (TW)', '6 J. Agbozo (RV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)',
    '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '28 M. Roth (MS)',
    '24 Y. Roth (LA)', '20 T. Nguyen (RA)', '21 M. Disch (IV)'
  ],
  substitutes: ['9 T. Tiedemann (Angriff)', '14 S. Souleymané (Abwehr)', '2 T. Podlich (Abwehr)', '1 L. Misic (Torwart)', '29 J. Akuegwu (Angriff)', '11 J. Ehret (Mittelfeld)', '43 K. Yarayan (Abwehr)'],
  scorers: 'Yanik Roth(2)',
  goals: "54' J. Ehret",
  cards: '',
  highlights: []
};

await setDoc(doc(db, 'competitive_matches', '33'), salem, { merge: true });
console.log('Salem 33 enriched OK');
process.exit(0);