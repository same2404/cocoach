import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'firebase-applet-config.json'), 'utf8'));
const app = initializeApp(cfg);
const db = initializeFirestore(app, {}, cfg.firestoreDatabaseId);
const auth = getAuth(app);
const count = async () => { const s = await getDocs(collection(db, 'tracker_academy_reports')); return s.size; };
await signInAnonymously(auth);
for (let i = 0; i < 4; i++) { console.log(`t=${i * 20}s  reports=${await count()}`); if (i < 3) await new Promise(r => setTimeout(r, 20000)); }
await auth.signOut();
process.exit(0);
