import { initializeApp } from 'firebase/app';
import { initializeFirestore, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const P = {
  misic: '1', podlich: '2', reinecker: '13', valchuk: '15', tschira: '27',
  yarayan: '43', schaefer: '17', ehretJo: '10', ehretJu: '11',
  disch: '1774352325883', pereira: '1774353082308', akuegwu: '1774353406268',
  nguyen: '1774353522982', tiedemann: '1774509700375', scalici: '1774513370994',
  ontuzans: '1776370685547', rothY: '1776405617838', rothM: '1776405809408',
  rufer: '1776411907189', souleymane: '1776621192537', ismaili: '1776708944690',
  reichert: '1780331046568', fangmeier: '1780332432669', agbozo: '1782405930764',
  dischinger: '1783456953709', lauer: '1783457389317'
};

// matchMinutes pro Spiel (Key = Match-Doc-ID), 1:1 aus der User-Liste
const minutesData = {
  '2': { // SBFV-Pokal, 07.08.2026, FSV Rheinfelden (1:0)
    [P.lauer]: 90, [P.agbozo]: 90, [P.fangmeier]: 90, [P.reinecker]: 90, [P.souleymane]: 90,
    [P.dischinger]: 90, [P.ehretJo]: 90, [P.scalici]: 80, [P.rothY]: 90, [P.tiedemann]: 72,
    [P.nguyen]: 60, [P.akuegwu]: 30, [P.rothM]: 18, [P.ehretJu]: 10
  },
  '3': { // Verbandsliga, 15.08.2026, Rielasingen (2:2)
    [P.lauer]: 90, [P.reinecker]: 90, [P.fangmeier]: 90, [P.agbozo]: 90, [P.souleymane]: 90,
    [P.scalici]: 90, [P.rothM]: 75, [P.ehretJo]: 70, [P.dischinger]: 65, [P.tiedemann]: 60,
    [P.ontuzans]: 60, [P.akuegwu]: 30, [P.rothY]: 30, [P.nguyen]: 25, [P.ehretJu]: 20, [P.ismaili]: 15
  },
  '4': { // Verbandsliga, 22.08.2026, Hofstetten (1:1)
    [P.lauer]: 90, [P.reinecker]: 90, [P.fangmeier]: 90, [P.souleymane]: 90, [P.ehretJo]: 90,
    [P.dischinger]: 90, [P.scalici]: 90, [P.agbozo]: 70, [P.ontuzans]: 65, [P.nguyen]: 60,
    [P.tiedemann]: 60, [P.ehretJu]: 30, [P.akuegwu]: 30, [P.rothY]: 25, [P.podlich]: 20
  },
  '5': { // Verbandsliga, 29.08.2026, Denzlingen (0:2)
    [P.lauer]: 90, [P.podlich]: 90, [P.reinecker]: 90, [P.souleymane]: 90, [P.agbozo]: 90,
    [P.rothY]: 90, [P.scalici]: 90, [P.ehretJo]: 90, [P.dischinger]: 90, [P.tiedemann]: 80,
    [P.ontuzans]: 65, [P.akuegwu]: 25, [P.rothM]: 10
  },
  '6': { // Verbandsliga, 05.09.2026, Konstanz-Wollmatingen (3:3)
    [P.lauer]: 90, [P.reinecker]: 90, [P.agbozo]: 90, [P.scalici]: 90, [P.rothY]: 90, [P.ehretJo]: 90,
    [P.tiedemann]: 85, [P.podlich]: 75, [P.fangmeier]: 65, [P.dischinger]: 60, [P.nguyen]: 60,
    [P.ehretJu]: 30, [P.rothM]: 30, [P.akuegwu]: 25, [P.yarayan]: 15, [P.disch]: 5
  },
  '33': { // Verbandsliga, 12.09.2026, Salem (1:2)
    [P.lauer]: 90, [P.agbozo]: 90, [P.disch]: 75, [P.fangmeier]: 90, [P.reinecker]: 90,
    [P.dischinger]: 90, [P.ehretJo]: 90, [P.scalici]: 90, [P.rothY]: 90, [P.nguyen]: 60, [P.rothM]: 60,
    [P.akuegwu]: 30, [P.tiedemann]: 30, [P.souleymane]: 15
  },
  '8': { // Verbandsliga, 18.09.2026, Wolfenweiler-Schallstadt (1:2)
    [P.lauer]: 90, [P.agbozo]: 90, [P.fangmeier]: 90, [P.reinecker]: 90, [P.dischinger]: 90,
    [P.ehretJo]: 90, [P.scalici]: 90, [P.rothM]: 90, [P.rothY]: 90, [P.nguyen]: 50, [P.disch]: 54,
    [P.tiedemann]: 40, [P.souleymane]: 36
  }
};

// Salem-Doku 1:1 aus der Liste (Disch in Startelf, Souleymane/Tiedemann/Akuegwu eingewechselt)
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
  avgAge: 25.0,
  lineup: ['Lauer', 'Agbozo', 'Disch', 'Fangmeier', 'Reinecker', 'Dischinger', 'Ehret Jo', 'Scalici', 'Roth Y', 'Nguyen', 'Roth M', 'Akuegwu', 'Tiedemann', 'Souleymané'],
  startingLineup: [
    '23 S. Lauer (TW)', '6 J. Agbozo (RV)', '21 M. Disch (IV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)',
    '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '24 Y. Roth (LA)', '20 T. Nguyen (RA)', '28 M. Roth (MS)'
  ],
  substitutes: ['9 T. Tiedemann (Angriff)', '29 J. Akuegwu (Angriff)', '14 S. Souleymané (Abwehr)', '2 T. Podlich (Abwehr)', '1 L. Misic (Torwart)', '11 J. Ehret (Mittelfeld)', '43 K. Yarayan (Abwehr)'],
  scorers: "37' Y. Roth | 54' Y. Roth",
  goals: "37' 0:1 Y. Roth | 54' 1:2 Y. Roth",
  cards: '',
  highlights: []
};

const playerMin = {};
for (const [matchKey, perPlayer] of Object.entries(minutesData)) {
  for (const [pid, min] of Object.entries(perPlayer)) {
    if (!playerMin[pid]) playerMin[pid] = {};
    playerMin[pid][matchKey] = min;
  }
}

await setDoc(doc(db, 'competitive_matches', '33'), salem, { merge: true });
console.log('Salem 33 updated (Disch Startelf)');

let count = 0;
for (const [pid, matchMinutes] of Object.entries(playerMin)) {
  await setDoc(doc(db, 'competitive_minutes', pid), { playerId: pid, minutes: matchMinutes, matchMinutes }, { merge: true });
  count++;
  console.log(`MIN ok ${pid}: ${JSON.stringify(matchMinutes)}`);
}
console.log('DONE players:', count);
process.exit(0);