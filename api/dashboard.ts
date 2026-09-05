const FC_API_SECRET = process.env.FC_AUGGEN_API_SECRET || '';
const ALLOWED_ORIGINS = ['https://fc-auggen-manager-26-27-kappa.vercel.app','https://fc-auggen-manager-26-27.vercel.app','http://localhost:5175','http://localhost:5173','http://localhost:3000','http://127.0.0.1:5175'];
function authGuard(req: any, res: any): boolean {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.status(200).end(); return false; }
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  if (origin && !ALLOWED_ORIGINS.some((o: string) => origin.startsWith(o))) { res.status(403).json({ error: 'Nicht autorisierte Domain' }); return false; }
  const key = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (key !== FC_API_SECRET) { res.status(401).json({ error: 'Ungueltiger API-Key' }); return false; }
  return true;
}
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';


const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0951111843",
  appId: process.env.FIREBASE_APP_ID || "1:367733626474:web:d792fc19f201f24c2c1c13",
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyDbN8YxHtGhTOeAT9Ete98KefDgVZ7c_1k",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0951111843.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_DB_ID || "ai-studio-fcauggenmanager2-20b6fe19-5950-4d1f-9c88-e7f55ed9a819",
  storageBucket: process.env.FIREBASE_STORAGE || "gen-lang-client-0951111843.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_SENDER_ID || "367733626474",
};

const COLS = ["competitive_matches", "match_analyses", "spieler", "physio_entries", "budget_finanz"] as const;

export default async function handler(req: any, res: any) {
  if (!authGuard(req, res)) return;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const results: Record<string, any[]> = {};

    await Promise.all(
      COLS.map(async (col) => {
        try {
          const snap = await getDocs(collection(db, col));
          results[col] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          results[col] = [];
        }
      })
    );

    return res.status(200).json({
      pflichtspiele: results.competitive_matches,
      spielberichte: results.match_analyses,
      spieler: results.spieler,
      verletzungen: results.physio_entries,
      budget: results.budget_finanz,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Dashboard API]', error?.message || error);
    return res.status(500).json({ error: error.message || 'Dashboard-Daten konnten nicht geladen werden.' });
  }
}
