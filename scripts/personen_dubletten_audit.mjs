// READ-ONLY Dubletten-Audit für Personendaten (Spieler + Funktionäre/Betreuer).
// Regeln: nichts löschen; nur klassifizieren (eindeutig / manuell prüfen / klare Dublette).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const outDir = path.join(root, '_tracker_audit');
fs.mkdirSync(outDir, { recursive: true });

const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);

const PROBE = ['spieler', 'funktionaere', 'funktionaeres', 'funktion', 'betreuer', 'staff', 'personal', 'officials', 'mitarbeiter', 'trainer', 'vorstand', 'personen'];
const TITLES = ['dr', 'prof', 'jr', 'sr', 'dipl', 'med'];

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:()\[\]{}"']/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokens(s) { return norm(s).split(' ').filter(Boolean).filter(t => !TITLES.includes(t)); }
function lev(a, b) {
  a = a || ''; b = b || ''; const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

function personInfo(docId, d) {
  const first = String(d.firstName || '').trim();
  const last = String(d.lastName || '').trim();
  let firstN = norm(first), lastN = norm(last);
  if (!firstN && !lastN && d.name) { // "Nachname, Vorname"
    const parts = String(d.name).split(',').map(s => s.trim());
    if (parts.length === 2) { lastN = norm(parts[0]); firstN = norm(parts[1]); }
    else { const tk = tokens(d.name); lastN = tk[tk.length - 1] || ''; firstN = tk.slice(0, -1).join(' '); }
  }
  const full = norm(`${first} ${last}`) || norm(d.name);
  const numData = ['number', 'nummer', 'position', 'geburtsdatum', 'status'].filter(k => d[k] !== undefined && d[k] !== '' && d[k] !== null).length
    + (d.finance && Object.values(d.finance).some(v => v)) ? 1 : 0;
  const complete = numData > 1; // mehr als nur ein Feld
  return { docId, coll: d.__coll, _docId: docId, name: `${first} ${last}`.trim() || d.name || '(kein Name)', firstN, lastN, full, category: d.category || '', position: d.position || '', number: d.number ?? d.nummer ?? '', complete, numData, raw: d };
}

function pairMatch(a, b) {
  // returns {level: 'strong'|'weak'|null, reason}
  if (!a.full && !b.full) return { level: null };
  const aT = new Set(tokens(`${a.firstN} ${a.lastN}`));
  const bT = new Set(tokens(`${b.firstN} ${b.lastN}`));
  const sameSet = aT.size && aT.size === bT.size && [...aT].every(x => bT.has(x));
  if (a.full && a.full === b.full) return { level: 'strong', reason: 'identischer Name' };
  if (sameSet) return { level: 'strong', reason: 'gleiche Namensteile (andere Reihenfolge/Format)' };
  const sameLast = a.lastN && a.lastN === b.lastN;
  if (sameLast) {
    if (a.firstN && a.firstN === b.firstN) return { level: 'strong', reason: 'gleicher Vor- und Nachname' };
    const dF = lev(a.firstN, b.firstN);
    if (a.firstN[0] && a.firstN[0] === b.firstN[0] && (a.firstN.length === 1 || b.firstN.length === 1)) return { level: 'weak', reason: 'Initiale + gleicher Nachname: ' + a.firstN + '/' + b.firstN };
    if (dF <= 2) return { level: 'weak', reason: 'Vor-Name ähnlich (Diff ' + dF + '): ' + a.firstN + '~' + b.firstN };
  }
  const dFull = lev(a.full, b.full);
  if (a.full && b.full && dFull <= 2 && Math.abs(a.full.length - b.full.length) <= 3) return { level: 'weak', reason: 'Name sehr ähnlich (Diff ' + dFull + ')' };
  return { level: null };
}

async function main() {
  await signInAnonymously(auth);
  const found = {};
  const persons = [];
  for (const c of PROBE) {
    try {
      const s = await getDocs(collection(db, c));
      if (s.size > 0) { found[c] = s.size; s.docs.forEach(d => persons.push(personInfo(d.id, { ...d.data(), __coll: c }))); }
    } catch { /* ignore */ }
  }

  console.log('Gefundene Collections:', JSON.stringify(found));
  console.log('Personen gesamt:', persons.length);

  // group via union-find on strong+weak matches
  const parent = persons.map((_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const uni = (i, j) => { parent[find(i)] = find(j); };
  const edges = [];
  for (let i = 0; i < persons.length; i++) for (let j = i + 1; j < persons.length; j++) {
    const m = pairMatch(persons[i], persons[j]);
    if (m.level) { edges.push({ i, j, ...m }); uni(i, j); }
  }
  const groups = new Map();
  persons.forEach((p, i) => { const r = find(i); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(i); });

  const strong = [], weak = [], unique = [];
  for (const idxs of groups.values()) {
    if (idxs.length === 1) { unique.push(persons[idxs[0]]); continue; }
    const g = idxs.map(i => persons[i]);
    const hasStrong = edges.some(e => idxs.includes(e.i) && idxs.includes(e.j) && e.level === 'strong');
    const anyComplete = g.some(p => p.complete);
    (hasStrong ? strong : weak).push({ persons: g, anyComplete });
  }

  const lines = [];
  lines.push('=== DUBLETTEN-AUDIT PERSONDATEN (READ-ONLY) ===');
  lines.push(`Collections: ${JSON.stringify(found)}`);
  lines.push(`✅ Eindeutige Datensätze: ${unique.length}`);
  lines.push(`❌ Klare Dubletten (gleicher Name): ${strong.length} Gruppen`);
  lines.push(`⚠️  Mögliche Dubletten (manuell prüfen): ${weak.length} Gruppen`);
  lines.push('');
  lines.push('--- ❌ KLARE DUBLETTEN ---');
  for (const grp of strong) {
    lines.push(`Gruppe (${grp.persons.length}):`);
    for (const p of grp.persons) lines.push(`   [${p.coll}/${p._docId}] "${p.name}" | ${p.position} | #${p.number} | ${p.complete ? 'vollständig' : 'UNVOLLSTÄNDIG'}`);
  }
  lines.push('');
  lines.push('--- ⚠️ MÖGLICHE DUBLETTEN (manuell) ---');
  for (const grp of weak) {
    lines.push(`Gruppe (${grp.persons.length}):`);
    for (const p of grp.persons) lines.push(`   [${p.coll}/${p._docId}] "${p.name}" | ${p.position} | #${p.number} | ${p.complete ? 'vollständig' : 'UNVOLLSTÄNDIG'}`);
  }
  const txt = lines.join('\n');
  fs.writeFileSync(path.join(outDir, `dubletten_audit_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`), txt);
  console.log('\n' + txt);

  // group-level details to find the Jonathan Dischinger example
  const jd = persons.filter(p => /disching|jonath|johnat|jonatan/i.test(p.full));
  if (jd.length) { console.log('\n--- Treffer "Jonathan/Dischinger" ---'); jd.forEach(p => console.log(`   [${p.coll}/${p._docId}] "${p.name}" | #${p.number} | ${p.position}`)); }

  await auth.signOut();
  process.exit(0);
}
main().catch(e => { console.error('AUDIT ERROR:', e?.message || e); process.exit(1); });
