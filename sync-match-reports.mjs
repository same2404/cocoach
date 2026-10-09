import { initializeApp } from 'firebase/app';
import { initializeFirestore, setDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config, 'spielberichte');
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const now = new Date().toISOString();

const reports = [
  {
    id: 'analysis_1786268120545', matchId: 2, opponent: 'FSV Rheinfelden', date: '2026-08-07',
    kickOff: '19:30', location: 'Rheinfelden (Auswärts)', category: 'SBFV-Rothaus-Pokal', isHome: false, result: '1:0',
    startingLineup: ['23 S. Lauer (TW)', '6 J. Agbozo (RV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)', '14 S. Souleymané (IV)', '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '24 Y. Roth (LA)', '9 T. Tiedemann (RA)', '20 T. Nguyen (ST)'],
    substitutes: ['29 J. Akuegwu', '28 M. Roth', '11 J. Ehret'],
    substitutions: [
      { minute: 60, playerIn: 'J. Akuegwu', playerOut: 'T. Nguyen' },
      { minute: 72, playerIn: 'M. Roth', playerOut: 'T. Tiedemann' },
      { minute: 80, playerIn: 'J. Ehret', playerOut: 'G. Scalici' }
    ],
    scorers: '1:0 J. Akuegwu (60\')', cards: '',
    matchNotes: 'SBFV-Rothaus-Pokal, 1. Runde. Weiterkommen durch Auswärtssieg.'
  },
  {
    id: 'analysis_1776928055672', matchId: 3, opponent: '1. FC Rielasingen-Arlen', date: '2026-08-15',
    kickOff: '18:00', location: 'Rielasingen (Auswärts)', category: 'Verbandsliga Südbaden', isHome: false, result: '2:2',
    startingLineup: ['23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '5 J. Fangmeier (IV)', '6 J. Agbozo (RV)', '14 S. Souleymané (IV)', '18 G. Scalici (ZM)', '28 M. Roth (MS)', '10 J. Ehret (DM)', '7 J. Dischinger (ZM)', '9 T. Tiedemann (RA)', '22 D. Ontuzans (LA)'],
    substitutes: ['29 J. Akuegwu', '24 Y. Roth', '20 T. Nguyen', '11 J. Ehret', '19 S. Ismaili', '1 L. Misic', '2 T. Podlich'],
    substitutions: [
      { minute: 60, playerIn: 'J. Akuegwu', playerOut: 'T. Tiedemann' },
      { minute: 60, playerIn: 'Y. Roth', playerOut: 'D. Ontuzans' },
      { minute: 65, playerIn: 'T. Nguyen', playerOut: 'J. Dischinger' },
      { minute: 70, playerIn: 'J. Ehret', playerOut: 'J. Ehret' },
      { minute: 75, playerIn: 'S. Ismaili', playerOut: 'M. Roth' }
    ],
    scorers: "6' 0:1 T. Tiedemann | 82' 1:2 Y. Roth", cards: '',
    matchNotes: 'Saisonauftakt in der Verbandsliga. Auswärts-Remis durch späten Tor von Y. Roth.'
  },
  {
    id: 'analysis_1786980443685', matchId: 4, opponent: 'SC Hofstetten', date: '2026-08-22',
    kickOff: '18:00', location: 'Auggen (Heim)', category: 'Verbandsliga Südbaden', isHome: true, result: '1:1',
    startingLineup: ['23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '5 J. Fangmeier (IV)', '14 S. Souleymané (IV)', '6 J. Agbozo (RV)', '10 J. Ehret (DM)', '7 J. Dischinger (ZM)', '18 G. Scalici (ZM)', '22 D. Ontuzans (LA)', '20 T. Nguyen (RA)', '9 T. Tiedemann (MS)'],
    substitutes: ['11 J. Ehret', '29 J. Akuegwu', '24 Y. Roth', '2 T. Podlich', '1 L. Misic', '19 S. Ismaili', '15 D. Valchuk'],
    substitutions: [
      { minute: 60, playerIn: 'J. Ehret', playerOut: 'T. Nguyen' },
      { minute: 60, playerIn: 'J. Akuegwu', playerOut: 'T. Tiedemann' },
      { minute: 65, playerIn: 'Y. Roth', playerOut: 'D. Ontuzans' },
      { minute: 70, playerIn: 'T. Podlich', playerOut: 'J. Agbozo' }
    ],
    scorers: "74' 1:0 J. Dischinger | 75' 1:1 Kempe", cards: "80' Gelb S. Reinecker",
    matchNotes: 'Remy-Spiel daheim. Führung durch J. Dischinger, Gegentreffer kurz darauf.'
  },
  {
    id: 'report_5_Denzlingen', matchId: 5, opponent: 'FC Denzlingen', date: '2026-08-29',
    kickOff: '14:00', location: 'Denzlingen (Auswärts)', category: 'Verbandsliga Südbaden', isHome: false, result: '0:2',
    startingLineup: ['23 S. Lauer (TW)', '2 T. Podlich (LV)', '13 S. Reinecker (C, IV)', '14 S. Souleymané (IV)', '6 J. Agbozo (RV)', '24 Y. Roth (LA)', '18 G. Scalici (ZM)', '10 J. Ehret (DM)', '7 J. Dischinger (ZM)', '22 D. Ontuzans (RA)', '9 T. Tiedemann (MS)'],
    substitutes: ['29 J. Akuegwu', '28 M. Roth', '1 L. Misic', '4 F. Brombacher', '19 S. Ismaili', '21 M. Disch', '43 K. Yarayan'],
    substitutions: [
      { minute: 65, playerIn: 'J. Akuegwu', playerOut: 'D. Ontuzans' },
      { minute: 80, playerIn: 'M. Roth', playerOut: 'T. Tiedemann' }
    ],
    scorers: "82' 0:1 J. Akuegwu | 92' 0:2 G. Scalici", cards: '',
    matchNotes: 'Auswärtssieg durch späte zwei Tore nach starker Defensivleistung.'
  },
  {
    id: 'analysis_1788757966467', matchId: 6, opponent: 'SC Konstanz-Wollmatingen', date: '2026-09-05',
    kickOff: '16:30', location: 'Auggen (Heim)', category: 'Verbandsliga Südbaden', isHome: true, result: '3:3',
    startingLineup: ['23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '6 J. Agbozo (IV)', '18 G. Scalici (ZV)', '24 Y. Roth (LA)', '10 J. Ehret (DM)', '9 T. Tiedemann (MS)', '2 T. Podlich (RV)', '5 J. Fangmeier (IV)', '7 J. Dischinger (ZM)', '20 T. Nguyen (RA)'],
    substitutes: ['11 J. Ehret', '28 M. Roth', '29 J. Akuegwu', '43 K. Yarayan', '21 M. Disch', '1 L. Misic', '19 S. Ismaili'],
    substitutions: [
      { minute: 60, playerIn: 'J. Ehret', playerOut: 'T. Nguyen' },
      { minute: 60, playerIn: 'M. Roth', playerOut: 'J. Dischinger' },
      { minute: 65, playerIn: 'J. Akuegwu', playerOut: 'J. Fangmeier' },
      { minute: 75, playerIn: 'K. Yarayan', playerOut: 'T. Podlich' },
      { minute: 85, playerIn: 'M. Disch', playerOut: 'T. Tiedemann' }
    ],
    scorers: "17' 0:1 Y. Roth | 52' 1:2 T. Tiedemann | 81' 2:3 T. Tiedemann", cards: '',
    matchNotes: 'Torreiches Remis daheim. Doppelpack von T. Tiedemann.'
  },
  {
    id: 'report_33_Salem', matchId: 33, opponent: 'FC Rot-Weiß Salem', date: '2026-09-12',
    kickOff: '15:30', location: 'Salem (Auswärts)', category: 'Verbandsliga Südbaden', isHome: false, result: '1:2',
    startingLineup: ['23 S. Lauer (TW)', '6 J. Agbozo (RV)', '21 M. Disch (IV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)', '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '24 Y. Roth (LA)', '20 T. Nguyen (RA)', '28 M. Roth (MS)'],
    substitutes: ['9 T. Tiedemann', '29 J. Akuegwu', '14 S. Souleymané', '2 T. Podlich', '1 L. Misic', '11 J. Ehret', '43 K. Yarayan'],
    substitutions: [
      { minute: 60, playerIn: 'J. Akuegwu', playerOut: 'T. Nguyen' },
      { minute: 60, playerIn: 'T. Tiedemann', playerOut: 'M. Roth' },
      { minute: 75, playerIn: 'S. Souleymané', playerOut: 'M. Disch' }
    ],
    scorers: "37' 0:1 Y. Roth | 54' 1:2 Y. Roth", cards: '',
    matchNotes: 'Auswärts-Niederlage trotz Doppelpack von Y. Roth.'
  },
  {
    id: 'report_8_Wolfenweiler', matchId: 8, opponent: 'FC Wolfenweiler-Schallstadt', date: '2026-09-18',
    kickOff: '17:30', location: 'Auggen (Heim)', category: 'Verbandsliga Südbaden', isHome: true, result: '1:2',
    startingLineup: ['23 S. Lauer (TW)', '6 J. Agbozo (RV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)', '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '28 M. Roth (MS)', '24 Y. Roth (LA)', '20 T. Nguyen (RA)', '21 M. Disch (IV)'],
    substitutes: ['9 T. Tiedemann', '14 S. Souleymané', '2 T. Podlich', '1 L. Misic', '29 J. Akuegwu', '11 J. Ehret', '43 K. Yarayan'],
    substitutions: [
      { minute: 50, playerIn: 'T. Tiedemann', playerOut: 'T. Nguyen' },
      { minute: 54, playerIn: 'S. Souleymané', playerOut: 'M. Disch' }
    ],
    scorers: "54' 1:1 J. Ehret", cards: '',
    matchNotes: 'Heimniederlage trotz Ausgleich von J. Ehret.'
  }
];

for (const r of reports) {
  const payload = {
    id: r.id,
    matchId: r.matchId,
    opponent: r.opponent,
    date: r.date,
    kickOff: r.kickOff,
    location: r.location,
    category: r.category,
    isHome: r.isHome,
    result: r.result,
    startingLineup: r.startingLineup,
    substitutes: r.substitutes,
    substitutions: r.substitutions,
    scorers: r.scorers,
    cards: r.cards,
    matchNotes: r.matchNotes,
    isAutoImported: false,
    importedMatchTimestamp: now,
    berichtText: '',
    trainerFazit: '',
    trainerTactical: '',
    teamRating: '8.0',
    playerOfTheMatch: '',
    goodActions: '',
    badActions: '',
    specialMoments: '',
    lineupImages: [],
    presentationImages: [],
    videoClips: []
  };
  await setDoc(doc(db, 'match_analyses', r.id), payload, { merge: true });
  console.log('Spielbericht OK:', r.id, r.opponent, r.date, r.result);
}

console.log('FERTIG – 7 Spielberichte geschrieben.');
process.exit(0);