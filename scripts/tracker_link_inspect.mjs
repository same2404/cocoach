import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(__dirname, '..', '_tracker_audit');
const files = fs.readdirSync(dir);
const backupFile = files.filter(f => f.startsWith('backup_spieler_')).sort().pop();
const sumFile = files.filter(f => f.startsWith('dryrun_summary_')).sort().pop();
const b = JSON.parse(fs.readFileSync(path.join(dir, backupFile), 'utf8'));
const s = JSON.parse(fs.readFileSync(path.join(dir, sumFile), 'utf8'));

console.log('== SUMMARY ==');
console.log(JSON.stringify(s.summary, null, 2));

console.log('\n== SAMPLE REPORTS (erste 8) ==');
for (const r of b.reports.slice(0, 8)) {
  console.log(JSON.stringify({ id: r.id, playerId: r.playerId, playerName: r.playerName, rawFileName: r.rawFileName, analysisDate: r.analysisDate, dist: r.metrics?.totalDistanceKm, maxSpeed: r.metrics?.maxSpeedKmh, overall: r.overallScore, createdAt: r.createdAt }));
}

console.log('\n== TIM M PODLICH missing (27) ==');
const t = s.rows.find(r => String(r.name).includes('Timm Podlich'));
console.log(JSON.stringify(t, null, 2));

console.log('\n== FABIAN RUFER ==');
const fr = s.rows.find(r => String(r.name).includes('Fabian Rufer'));
console.log(JSON.stringify(fr, null, 2));

console.log('\n== SAMPLE: Luka Misic trackerHistory (erste 3) ==');
const luka = b.players.find(p => String(p.id) === '1');
if (luka) for (const h of (luka.trackerHistory || []).slice(0, 3)) console.log(JSON.stringify({ fileName: h.fileName, datum: h.datum, spielerId: h.spielerId, name: h.name, dist: h.gesamtDistanzMeter }));

console.log('\n== SAMPLE: Spieler ohne id / problematisch ==');
for (const p of b.players.filter(p => !p.id)) console.log(JSON.stringify({ docId: p._docId, name: `${p.firstName || ''} ${p.lastName || ''}`, pos: p.position, hist: (p.trackerHistory || []).length }));
