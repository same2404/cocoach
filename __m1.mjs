import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config, 'a5');
const db = getFirestore(app, config.firestoreDatabaseId || '');
await signInAnonymously(getAuth(app));
async function all(name) {
  const snap = await getDocs(query(collection(db, name)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
const sessions = await all('training_sessions');
const spieler = await all('spieler');

// status-Werte-Verteilung
const stat = new Map();
let total = 0;
for (const s of sessions) for (const p of (s.players || [])) {
  const st = String(p.status ?? '(none)');
  stat.set(st, (stat.get(st) || 0) + 1);
  total++;
}
console.log('players-Einträge gesamt:', total);
console.log('status-Verteilung:', [...stat.entries()].map(([k, v]) => `${k}=${v}`).join(' | '));

// Namens-Format im spieler vs training
function spielerName(sp) {
  const ln = sp.lastName || sp.nachname || sp.name || '';
  const fn = sp.firstName || sp.vorname || '';
  const full = (ln && fn) ? `${ln}, ${fn}` : (ln || fn || '');
  return full.trim();
}
const nameSet = new Map(); // spielerName -> id
for (const sp of spieler) nameSet.set(spielerName(sp), sp.id);

console.log('\nKader-Namen (spieler, ausgewählte):');
for (const sp of spieler.slice(0, 8)) console.log(' ', sp.id, '->', JSON.stringify(spielerName(sp)));

console.log('\ntraining players: Beispiele + Zuordnung');
const s = sessions[0];
for (const p of (s.players || []).slice(0, 5)) {
  const id = nameSet.get(p.name);
  console.log(' name =', JSON.stringify(p.name), '| status =', p.status, '| playerId =', id, id ? '' : '<- NICHT gefunden');
}

// Wie viele players-Einträge lassen sich NICHT zuordnen?
let notFound = 0;
const notFoundNames = new Set();
for (const sess of sessions) for (const p of (sess.players || [])) if (!nameSet.has(p.name)) { notFound++; notFoundNames.add(p.name); }
console.log('\nNicht zuordenbare players-Einträge:', notFound, '| Namen:', [...notFoundNames].join(', '));

// spieler-ID-Felder
console.log('\nspieler Felder:', Object.keys(spieler[0] || {}).join(', '));
console.log('spieler mit name/lastName: Anzahl', spieler.filter((x) => x.lastName || x.nachname || x.name).length, 'von', spieler.length);

// Kader-Spieler (player-Kategorie) in Einheiten ohne Eintrag?
const kaderIds = new Set(spieler.filter((x) => x.category === 'player').map((x) => x.id));
const seenIds = new Set(sessions.flatMap((sess) => (sess.players || []).map((p) => nameSet.get(p.name))).filter(Boolean));
console.log('\nKader-Spieler (player):', kaderIds.size, '| davon mit Trainingsplan-Anwesenheit:', seenIds.size);
const missing = [...kaderIds].filter((i) => !seenIds.has(i)).map((i) => spieler.find((x) => x.id === i)).map((x) => `${x.id}:${spielerName(x)}`);
console.log('Noch NIE in Trainingsplan-Anwesenheit:', missing.join(', ') || '(alle im Plan)');

// Einheiten ohne players-Feld
const noPlayers = sessions.filter((sess) => !Array.isArray(sess.players) || sess.players.length === 0);
console.log('\nEinheiten OHNE Anwesenheits-Liste:', noPlayers.length, noPlayers.map((x) => `${x.date}(${x.id})`).join(', ') || '(keine)');