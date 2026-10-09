import { initializeApp } from 'firebase/app';
import { initializeFirestore, getDocs, query, collection, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync('C:/Users/samer/OneDrive/Dokumente/New OpenCode Project/fc-auggen-manager-26-27/firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId || '');
const auth = getAuth(app);
await signInAnonymously(auth);

const snap = await getDocs(query(collection(db, 'training_session_images')));
const docs = [];
const fields = {};
snap.forEach(d => { const dt = d.data(); docs.push({ id: d.id, sessionId: dt.sessionId, field: dt.field, index: dt.index }); fields[dt.field] = (fields[dt.field] || 0) + 1; });
console.log('total:', docs.length);
console.log('fields:', JSON.stringify(fields));
const bySession = {};
docs.forEach(d => { (bySession[d.sessionId] = bySession[d.sessionId] || []).push(d.field); });
const max = Object.entries(bySession).sort((a,b)=>b[1].length-a[1].length)[0];
console.log('most populated session:', max[0], 'fields:', JSON.stringify(max[1]));
process.exit(0);