// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import { initializeApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Festgelegte ID deiner Datenbank mit all deinen Daten
const TARGET_DATABASE_ID = "ai-studio-20b6fe19-5950-4d1f-9c88-e7f55ed9a819";

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
export const googleProvider = new GoogleAuthProvider();

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
