import { initializeApp } from 'firebase/app';
import { initializeFirestore, setDoc, getDoc, doc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

// ── Live-Spieler-IDs (Doc-IDs in spieler) ──────────────────────────────
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

// ── Pflichtspiel-Dokus (competitive_matches) ───────────────────────────
const matches = {
  '2': {
    id: '2', opponent: 'FSV Rheinfelden', location: 'Rheinfelden (Auswärts)', isHome: false,
    kickOff: '19:30', meetingTime: '18:00', date: '2026-08-07',
    competition: 'SBFV-Rothaus-Pokal', result: '1:0', status: 'Gespielt',
    lineup: ['Lauer', 'Agbozo', 'Fangmeier', 'Reinecker', 'Souleymané', 'Dischinger', 'Ehret Jo', 'Scalici', 'Roth Y', 'Tiedemann', 'Nguyen'],
    startingLineup: [
      '23 S. Lauer (TW)', '6 J. Agbozo (RV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)',
      '14 S. Souleymané (IV)', '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)',
      '24 Y. Roth (LA)', '9 T. Tiedemann (RA)', '20 T. Nguyen (ST)'
    ],
    substitutes: ['2 T. Podlich', '28 M. Roth', '21 M. Disch', '29 J. Akuegwu', '11 J. Ehret', '1 L. Misic', '43 K. Yarayan'],
    scorers: '', goals: '', cards: ''
  },
  '3': {
    id: '3', opponent: '1. FC Rielasingen-Arlen', location: 'Rielasingen (Auswärts)', isHome: false,
    kickOff: '18:00', meetingTime: '16:00', date: '2026-08-15',
    competition: 'Verbandsliga Südbaden', result: '2:2', status: 'Gespielt',
    lineup: ['Lauer', 'Reinecker', 'Fangmeier', 'Agbozo', 'Souleymané', 'Scalici', 'Roth M', 'Ehret Jo', 'Dischinger', 'Tiedemann', 'Ontuzans', 'Akuegwu', 'Roth Y', 'Nguyen', 'Ehret Ju', 'Ismaili'],
    startingLineup: [
      '23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '5 J. Fangmeier (IV)', '6 J. Agbozo (RV)',
      '14 S. Souleymané (IV)', '18 G. Scalici (ZM)', '28 M. Roth (MS)', '10 J. Ehret (DM)',
      '7 J. Dischinger (ZM)', '9 T. Tiedemann (RA)', '22 D. Ontuzans (LA)'
    ],
    substitutes: ['29 J. Akuegwu (Angriff)', '24 Y. Roth (Angriff)', '20 T. Nguyen (Mittelfeld)', '11 J. Ehret (Mittelfeld)', '19 S. Ismaili (Mittelfeld)', '1 L. Misic (Torwart)', '2 T. Podlich (Abwehr)'],
    scorers: "6' T. Tiedemann | 82' Y. Roth", goals: "6' 1:0 T. Tiedemann | 82' 1:1 Y. Roth", cards: ''
  },
  '4': {
    id: '4', opponent: 'SC Hofstetten', location: 'Auggen (Heim)', isHome: true,
    kickOff: '18:00', meetingTime: '16:30', date: '2026-08-22',
    competition: 'Verbandsliga Südbaden', result: '1:1', status: 'Gespielt',
    lineup: ['Lauer', 'Reinecker', 'Fangmeier', 'Souleymané', 'Ehret Jo', 'Dischinger', 'Scalici', 'Agbozo', 'Ontuzans', 'Nguyen', 'Tiedemann', 'Ehret Ju', 'Akuegwu', 'Roth Y', 'Podlich'],
    startingLineup: [
      '23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '5 J. Fangmeier (IV)', '14 S. Souleymané (IV)',
      '6 J. Agbozo (RV)', '10 J. Ehret (DM)', '7 J. Dischinger (ZM)', '18 G. Scalici (ZM)',
      '22 D. Ontuzans (LA)', '20 T. Nguyen (RA)', '9 T. Tiedemann (MS)'
    ],
    substitutes: ['11 J. Ehret (Mittelfeld)', '29 J. Akuegwu (Angriff)', '24 Y. Roth (Angriff)', '2 T. Podlich (Abwehr)', '1 L. Misic (Torwart)', '19 S. Ismaili (Mittelfeld)', '15 D. Valchuk (Mittelfeld)'],
    scorers: "74' J. Dischinger", goals: "74' 1:0 J. Dischinger | 75' 1:1 Kempe", cards: "80' Gelb Steffen Reinecker"
  },
  '5': {
    id: '5', opponent: 'FC Denzlingen', location: 'Denzlingen (Auswärts)', isHome: false,
    kickOff: '14:00', meetingTime: '12:15', date: '2026-08-29',
    competition: 'Verbandsliga Südbaden', result: '0:2', status: 'Gespielt',
    lineup: ['Lauer', 'Podlich', 'Reinecker', 'Souleymané', 'Agbozo', 'Roth Y', 'Scalici', 'Ehret Jo', 'Dischinger', 'Ontuzans', 'Tiedemann', 'Akuegwu', 'Roth M'],
    startingLineup: [
      '23 S. Lauer (TW)', '2 T. Podlich (LV)', '13 S. Reinecker (C, IV)', '14 S. Souleymané (IV)',
      '6 J. Agbozo (RV)', '24 Y. Roth (LA)', '18 G. Scalici (ZM)', '10 J. Ehret (DM)',
      '7 J. Dischinger (ZM)', '22 D. Ontuzans (RA)', '9 T. Tiedemann (MS)'
    ],
    substitutes: ['29 J. Akuegwu (Angriff)', '28 M. Roth (Angriff)', '1 L. Misic (Torwart)', '4 F. Brombacher', '19 S. Ismaili (Mittelfeld)', '21 M. Disch (Abwehr)', '43 K. Yarayan (Abwehr)'],
    scorers: "82' J. Akuegwu | 92' G. Scalici", goals: "82' 0:1 J. Akuegwu | 92' 0:2 G. Scalici", cards: ''
  },
  '6': {
    id: '6', opponent: 'SC Konstanz-Wollmatingen', location: 'Auggen (Heim)', isHome: true,
    kickOff: '16:30', meetingTime: '15:00', date: '2026-09-05',
    competition: 'Verbandsliga Südbaden', result: '3:3', status: 'Gespielt',
    lineup: ['Lauer', 'Reinecker', 'Agbozo', 'Scalici', 'Roth Y', 'Ehret Jo', 'Tiedemann', 'Podlich', 'Fangmeier', 'Dischinger', 'Nguyen', 'Ehret Ju', 'Roth M', 'Akuegwu', 'Yarayan', 'Disch'],
    startingLineup: [
      '23 S. Lauer (TW)', '13 S. Reinecker (C, LV)', '6 J. Agbozo (IV)', '18 G. Scalici (ZV)',
      '24 Y. Roth (LA)', '10 J. Ehret (DM)', '9 T. Tiedemann (MS)', '2 T. Podlich (RV)',
      '5 J. Fangmeier (IV)', '7 J. Dischinger (ZM)', '20 T. Nguyen (RA)'
    ],
    substitutes: ['11 J. Ehret (Mittelfeld)', '28 M. Roth (Angriff)', '29 J. Akuegwu (Angriff)', '43 K. Yarayan (Abwehr)', '21 M. Disch (Abwehr)', '1 L. Misic (Torwart)', '19 S. Ismaili (Mittelfeld)'],
    scorers: "17' Y. Roth | 52' T. Tiedemann | 81' T. Tiedemann", goals: "17' 0:1 Y. Roth | 33' 1:1 | 52' 1:2 T. Tiedemann | 70' 2:2 | 81' 2:3 T. Tiedemann | 88' 3:3", cards: ''
  },
  '8': {
    id: '8', opponent: 'FC Wolfenweiler-Schallstadt', location: 'Auggen (Heim)', isHome: true,
    kickOff: '17:30', meetingTime: '16:00', date: '2026-09-18',
    competition: 'Verbandsliga Südbaden', result: '1:2', status: 'Gespielt',
    lineup: ['Lauer', 'Agbozo', 'Fangmeier', 'Reinecker', 'Dischinger', 'Ehret Jo', 'Scalici', 'Roth M', 'Roth Y', 'Nguyen', 'Disch', 'Tiedemann', 'Souleymané'],
    startingLineup: [
      '23 S. Lauer (TW)', '6 J. Agbozo (RV)', '5 J. Fangmeier (IV)', '13 S. Reinecker (C, LV)',
      '7 J. Dischinger (ZM)', '10 J. Ehret (DM)', '18 G. Scalici (ZM)', '28 M. Roth (MS)',
      '24 Y. Roth (LA)', '20 T. Nguyen (RA)', '21 M. Disch (IV)'
    ],
    substitutes: ['9 T. Tiedemann (Angriff)', '14 S. Souleymané (Abwehr)', '2 T. Podlich (Abwehr)', '1 L. Misic (Torwart)', '29 J. Akuegwu (Angriff)', '11 J. Ehret (Mittelfeld)', '43 K. Yarayan (Abwehr)'],
    scorers: "54' J. Ehret", goals: "30' 0:1 | 54' 1:1 J. Ehret | 78' 1:2", cards: ''
  }
};

// ── Spieler-Minuten pro Pflichtspiel (matchMinutes-Key = Match-Doc-ID) ─
function mm(entries) {
  const out = {};
  for (const [pid, min] of Object.entries(entries)) out[pid] = min;
  return out;
}

const minutesData = {
  '3': mm({
    [P.lauer]: 90, [P.reinecker]: 90, [P.fangmeier]: 90, [P.agbozo]: 90, [P.souleymane]: 90, [P.scalici]: 90,
    [P.rothM]: 75, [P.ehretJo]: 70, [P.dischinger]: 65, [P.tiedemann]: 60, [P.ontuzans]: 60,
    [P.akuegwu]: 30, [P.rothY]: 30, [P.nguyen]: 25, [P.ehretJu]: 20, [P.ismaili]: 15
  }),
  '4': mm({
    [P.lauer]: 90, [P.reinecker]: 90, [P.fangmeier]: 90, [P.souleymane]: 90, [P.ehretJo]: 90, [P.dischinger]: 90, [P.scalici]: 90,
    [P.agbozo]: 70, [P.ontuzans]: 65, [P.nguyen]: 60, [P.tiedemann]: 60,
    [P.ehretJu]: 30, [P.akuegwu]: 30, [P.rothY]: 25, [P.podlich]: 20
  }),
  '5': mm({
    [P.lauer]: 90, [P.podlich]: 90, [P.reinecker]: 90, [P.souleymane]: 90, [P.agbozo]: 90, [P.rothY]: 90, [P.scalici]: 90, [P.ehretJo]: 90, [P.dischinger]: 90,
    [P.ontuzans]: 65, [P.tiedemann]: 80, [P.akuegwu]: 25, [P.rothM]: 10
  }),
  '6': mm({
    [P.lauer]: 90, [P.reinecker]: 90, [P.agbozo]: 90, [P.scalici]: 90, [P.rothY]: 90, [P.ehretJo]: 90,
    [P.tiedemann]: 85, [P.podlich]: 75, [P.fangmeier]: 65, [P.dischinger]: 60, [P.nguyen]: 60,
    [P.ehretJu]: 30, [P.rothM]: 30, [P.akuegwu]: 25, [P.yarayan]: 15, [P.disch]: 5
  }),
  '33': mm({
    [P.lauer]: 90, [P.agbozo]: 90, [P.fangmeier]: 90, [P.reinecker]: 90, [P.dischinger]: 90, [P.ehretJo]: 90, [P.scalici]: 90, [P.rothY]: 90,
    [P.disch]: 75, [P.nguyen]: 60, [P.rothM]: 60, [P.akuegwu]: 30, [P.tiedemann]: 30, [P.souleymane]: 15
  }),
  '8': mm({
    [P.lauer]: 90, [P.agbozo]: 90, [P.fangmeier]: 90, [P.reinecker]: 90, [P.dischinger]: 90, [P.ehretJo]: 90, [P.scalici]: 90, [P.rothM]: 90, [P.rothY]: 90,
    [P.nguyen]: 50, [P.disch]: 54, [P.tiedemann]: 40, [P.souleymane]: 36
  })
};

// ── In Firestore schreiben ──────────────────────────────────────────────
async function run() {
  // 1) competitive_matches (nicht Salem, existiert bereits als id 33)
  for (const [id, data] of Object.entries(matches)) {
    await setDoc(doc(db, 'competitive_matches', id), data, { merge: true });
    console.log('MATCH ok:', id, data.date, data.result);
  }
  // Salem-Doku aktualisieren (Ergebnis/Bank laut User-Daten = bereits vorhanden), Datum von 12.09 bestätigen
  await setDoc(doc(db, 'competitive_matches', '33'), { id: '33', date: '2026-09-12' }, { merge: true });
  console.log('MATCH ok: 33 (Salem) date->2026-09-12');

  // 2) competitive_minutes pro Spieler
  const playerMin = {};
  for (const [matchKey, perPlayer] of Object.entries(minutesData)) {
    for (const [pid, min] of Object.entries(perPlayer)) {
      if (!playerMin[pid]) playerMin[pid] = {};
      playerMin[pid][matchKey] = min;
    }
  }
  for (const [pid, matchMinutes] of Object.entries(playerMin)) {
    await setDoc(doc(db, 'competitive_minutes', pid), { playerId: pid, minutes: matchMinutes, matchMinutes }, { merge: true });
    console.log('MIN ok:', pid, JSON.stringify(matchMinutes));
  }
  console.log('DONE. Spieler mit Minuten:', Object.keys(playerMin).length);
}

run().then(() => process.exit(0)).catch((e) => { console.error('FAIL', e.message); process.exit(1); });