import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, ensureAnonymousSession, isRetryableSnapshotError } from '../firebase';

// Club-aware document prefix - set by ClubProvider on mount
let CLUB_DOC_PREFIX = '';
let CLUB_IS_DEMO_FLAG = true;
let CLUB_DOC_READONLY = true;

export function setClubDocPrefix(prefix: string, isDemo: boolean) {
  CLUB_DOC_PREFIX = isDemo ? '' : `_${prefix}`;
  CLUB_IS_DEMO_FLAG = isDemo;
  CLUB_DOC_READONLY = false;
}

// Allow enabling writes while keeping the (empty) demo prefix so no data is lost
export function setClubDocReadOnly(readOnly: boolean) {
  CLUB_DOC_READONLY = readOnly;
}

function prefixedDoc(docId: string): string {
  return `${docId}${CLUB_DOC_PREFIX}`;
}

function isReadOnly(): boolean {
  return CLUB_DOC_READONLY;
}

export function useSyncedState<T>(
  keyOrCollection: string,
  initialValueOrId?: any,
  enabledOrInitial?: any
): [T, (value: T | ((val: T) => T)) => void] {
  const isThreeArgCustom = typeof initialValueOrId === 'string';
  const collectionName = isThreeArgCustom ? keyOrCollection : 'appState';
  const rawDocId = isThreeArgCustom ? initialValueOrId : keyOrCollection;
  const initialValue = isThreeArgCustom ? enabledOrInitial : initialValueOrId;
  const enabled = isThreeArgCustom ? true : (enabledOrInitial !== false);
  const docId = prefixedDoc(rawDocId);

  const [state, setState] = useState<T>(() => {
    return initialValue instanceof Function ? initialValue() : initialValue;
  });

  const isInitialized = useRef(false);
  const lastDataRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !docId) return;

    isInitialized.current = false;
    const docRef = doc(db, collectionName, docId);

    // Selbstheilung: Nach einmaligem "permission-denied" erholt sich der SDK nie
    // wieder -> bei Fehlern neuen Listener erstellen + Anmeldung erneuern.
    let stopped = false;
    let currentUnsubscribe: (() => void) | null = null;
    let retryTimer: number | null = null;
    let retries = 0;

    const startListener = () => {
      if (stopped) return;
      currentUnsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          try {
            const rawData = docSnap.data().data ?? docSnap.data();
            const strVal = typeof rawData === 'string' ? rawData : JSON.stringify(rawData);
            if (lastDataRef.current === strVal) {
              isInitialized.current = true;
              return;
            }
            lastDataRef.current = strVal;
            const parsed = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
            setState(parsed);
            isInitialized.current = true;
          } catch (e) {
            console.error(`Error parsing Firestore state for ${collectionName}/${docId}`, e);
            isInitialized.current = true;
          }
        } else {
          isInitialized.current = true;
        }
      }, (error) => {
        if (stopped) return;
        console.error(`Firestore state snapshot error for ${collectionName}/${docId}:`, error);
        isInitialized.current = true;
        if (isRetryableSnapshotError(error) && retries < 4) {
          retries += 1;
          const delay = 1500 * Math.pow(2, retries - 1);
          retryTimer = window.setTimeout(() => {
            if (stopped) return;
            void ensureAnonymousSession();
            startListener();
          }, delay);
        }
      });
    };

    startListener();

    return () => {
      stopped = true;
      if (currentUnsubscribe) currentUnsubscribe();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [collectionName, docId, enabled]);

  const setSyncedState = useCallback((value: T | ((val: T) => T)) => {
    setState((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      const rawData = JSON.stringify(nextValue);

      if (lastDataRef.current === rawData) return prev;
      lastDataRef.current = rawData;

      const docRef = doc(db, collectionName, docId);
      setDoc(docRef, { data: rawData }, { merge: true }).catch((err) => {
        console.error(`Error writing to Firestore ${collectionName}/${docId}:`, err);
      });

      return nextValue;
    });
  }, [collectionName, docId]);

  return [state, setSyncedState];
}
