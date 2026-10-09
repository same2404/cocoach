import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, getFirestore, collection, documentId } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const names = [
  'training_sessions', 'match_analyses', 'spieler', 'training', 'spiele', 'attendance',
  'yearly_plan', 'card_records', 'scouting_candidates', 'depth_chart', 'finance_meta',
  'meetings_data', 'individual_training', 'run_records', 'run_meta', 'physio_entries',
  'formation', 'vorbereitung_sommer', 'vorbereitung_winter', 'winter_prep_config',
  'competitive_matches', 'training_documents_global', 'agent_logs', 'academy_evaluations',
  'academy_weekly_reports', 'tracker_academy_reports', 'spielerkarten', 'video_analysis',
  'season_storage'
];

const results = [];
for (const name of names) {
  try {
    const snap = await getDocs(collection(db, name));
    let total = 0, docs = 0;
    const docSizes = [];
    for (const d of snap.docs) {
      const size = JSON.stringify(d.data()).length;
      total += size; docs++;
      docSizes.push(size);
    }
    docSizes.sort((a, b) => b - a);
    results.push({ name, docs, totalKB: Math.round(total / 1024), maxKB: Math.round((docSizes[0] || 0) / 1024) });
  } catch (e) {
    results.push({ name, error: String(e.message || e).slice(0, 80) });
  }
}
results.sort((a, b) => (b.totalKB || 0) - (a.totalKB || 0));
results.forEach(r => console.log(`${r.name}: ${r.docs ?? '?'} docs, ${r.totalKB ?? '?'} KB, max ${r.maxKB ?? '?'} KB ${r.error ? ' ERROR ' + r.error : ''}`));
process.exit(0);