import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import config from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(config, 'p1');
const db = getFirestore(app, config.firestoreDatabaseId || '');
await signInAnonymously(getAuth(app));
async function all(name) {
  const snap = await getDocs(query(collection(db, name)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
const sessions = await all('training_sessions');
const meta = await all('attendance_unit_meta');
const att = await all('attendance');
const spieler = await all('spieler');

console.log('==== STRUCTURE ====');
console.log('attendance doc[0]:', JSON.stringify(att[0]).slice(0, 500));
console.log('meta doc[0]:', JSON.stringify(meta[0]).slice(0, 500));
console.log('meta doc#63 (ohne Datum?):', JSON.stringify(meta.find((m) => m.sessionNum === 63) || {}) .slice(0, 400));
console.log('session doc[0]:', JSON.stringify(sessions[0]).slice(0, 500));

// chronologische Sessions
const sorted = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
console.log('\n==== CHRONOLOGISCHE REIHENFOLGE (57 erwartet) ====');
console.log('Anzahl Sessions:', sorted.length);
console.log('Erste 3:', sorted.slice(0, 3).map((s) => `${s.id}:${s.date}`).join(', '));
console.log('Letzte 3:', sorted.slice(-3).map((s) => `${s.id}:${s.date}`).join(', '));

// Hat jede session ein date?
const noDate = sorted.filter((s) => !s.date);
console.log('Sessions ohne date:', noDate.length, noDate.map((s) => s.id).join(', ') || '(keine)');

// doppelte dates?
const byDate = new Map();
for (const s of sessions) {
  if (!byDate.has(s.date)) byDate.set(s.date, []);
  byDate.get(s.date).push(s.id);
}
const dupDates = [...byDate.entries()].filter(([, v]) => v.length > 1);
console.log('Doppelte Daten:', dupDates.length, dupDates.map(([d, v]) => `${d}:${v.join(',')}`).join(' | ') || '(keine)');

// session fields
console.log('\nsession Felder:', Object.keys(sessions[0]).join(', '));

// spieler: Kader
const kader = spieler.filter((x) => x.category === 'player');
console.log('\nspieler gesamt:', spieler.length, '| Kader(player):', kader.length);

// Spielernamen im Training, die nicht exakt matchen - Muster zeigen
function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zäöüß ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function spielerName(sp) { const ln = sp.lastName || sp.nachname || sp.name || ''; const fn = sp.firstName || sp.vorname || ''; return (ln && fn) ? `${ln}, ${fn}` : (ln || fn || ''); }
function spielerName2(sp) { const ln = sp.lastName || sp.nachname || sp.name || ''; const fn = sp.firstName || sp.vorname || ''; return `${ln} ${fn}`; }
const exactMap = new Map();
const spaceMap = new Map();
const lowerMap = new Map();
for (const sp of spieler) {
  exactMap.set(norm(spielerName(sp)), sp.id);
  spaceMap.set(norm(spielerName2(sp)), sp.id);
  lowerMap.set(norm((sp.lastName || sp.nachname || sp.name || '')), sp.id);
}
let notFound = [];
for (const sess of sessions) for (const p of (sess.players || [])) {
  const name = String(p.name || '');
  const id = exactMap.get(norm(name)) || spaceMap.get(norm(name)) || lowerMap.get(norm(name));
  if (!id) notFound.push({ date: sess.date, name, status: p.status });
}
console.log('\nNicht zuordenbar (robust):', notFound.length);
const uniq = [...new Set(notFound.map((n) => n.name))];
console.log('Eindeutige ungematchte Namen:', uniq.length);
console.log(uniq.join('\n'));