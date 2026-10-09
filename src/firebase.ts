// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Die Datenbank-ID kommt EINHEITLICH aus der App-Config (firebase-applet-config.json),
// damit Client und Server nie wieder auf verschiedene Datenbanken zeigen.
const TARGET_DATABASE_ID = firebaseConfig.firestoreDatabaseId || '';

let dbInstance;
try {
  // Versuche, Firestore direkt mit der richtigen Datenbank-ID zu initialisieren
  dbInstance = initializeFirestore(app, {}, TARGET_DATABASE_ID);
} catch (e) {
  // Falls bereits initialisiert, hole die bestehende Instanz für diese ID
  dbInstance = getFirestore(app, TARGET_DATABASE_ID);
}

export const db = dbInstance;
export const auth = getAuth(app);

// Anmeldung dauerhaft im Browser speichern (nicht nur pro Sitzung): Die bereits
// vorhandene anonyme Identität wird beim nächsten App-Start sofort wiederhergestellt.
// So bleibt die App sofort nutzbar und es entstehen keine ständig neuen
// aonymen Konten (welche die Auth-Rate-Limits erreicht hätten => "App hängt").
void setPersistence(auth, browserLocalPersistence)
  .then(() => console.info('FC Auggen: Anmeldung wird im Browser gespeichert (Start ohne Wartezeit)'))
  .catch((err) => console.warn('Persistence nicht gesetzt:', err));

let lastAnonAttemptAt = 0;

// Stellt sicher, dass eine (anonyme) Anmeldung existiert. Mit Cooldown, damit
// bei Problemen nicht unbegrenzt neue Anmeldeversuche ankommen (Rate-Limits).
export async function ensureAnonymousSession(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (auth.currentUser) return;
  const now = Date.now();
  if (now - lastAnonAttemptAt < 30_000) return;
  lastAnonAttemptAt = now;
  try {
    await signInAnonymously(auth);
  } catch (err: any) {
    console.warn('Anonyme Anmeldung fehlgeschlagen:', err?.message ?? err);
  }
}

// Fehler, bei denen ein NEUER Firestore-Listener helfen kann: Der SDK erholt
// sich nach einem einmaligen "permission-denied" nie wieder von selbst.
export function isRetryableSnapshotError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /permission-denied|insufficient permissions|unavailable|not-authenticated|auth\//i.test(msg);
}

// RACE-FIX (App "hängt"/bleibt leer): Firestore darf erst benutzt werden, wenn die
// (anonyme) Anmeldung abgeschlossen ist. Starten Listener ohne Token, antwortet
// Firestore einmalig mit "permission-denied" und der SDK erholt sich danach NIE
// wieder – alle Daten bleiben dauerhaft leer. main.tsx wartet auf dbReadiness,
// bevor die App gerendert wird. Bei totalem Ausfall (Offline) nach max. 8 s
// trotzdem fortfahren (App startet dann ggf. ohne Cloud-Sync).
export const dbReadiness: Promise<void> = (async () => {
  if (typeof window === 'undefined') return;
  await new Promise<void>((resolve) => {
    let settled = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid && !settled) {
        settled = true;
        unsubscribe();
        resolve();
      }
    });
    // Hard cap: niemals blockieren (offline = App trotzdem starten).
    setTimeout(() => {
      if (!settled) {
        settled = true;
        unsubscribe();
        resolve();
      }
    }, 8000);
    // Nur nötig, wenn in dieser Browser-Sitzung noch kein Nutzer existiert
    // (dauerhafte Speicherung -> in der Regel sofortiger Wiederherstellung).
    void ensureAnonymousSession();
  });
})();
export const googleProvider = new GoogleAuthProvider();

// Hintergrund-Sync für Offline-Warteschlange starten (Ziel: Firestore, sobald erreichbar/autorisiert)
if (typeof window !== 'undefined') {
  import('./lib/offlineStorage').then(({ setupBackgroundSync }) => {
    setupBackgroundSync(db);
  }).catch((e) => console.warn('Background-Sync nicht gestartet:', e));
}

export function getWeekdayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const dayName = days[date.getDay()];
  const formattedDate = date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  return `${dayName}, ${formattedDate}`;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errStr = error instanceof Error ? error.message : String(error);
  console.error('Firestore Error: ', errStr, operationType, path);
}

export function isQueryParamValid(param: any): boolean {
  return param !== undefined && param !== null;
}
