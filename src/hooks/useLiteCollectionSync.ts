import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db, ensureAnonymousSession, isRetryableSnapshotError } from '../firebase';
import { getLocalCollection, saveLocalCollection, enqueueSyncOperation, getPendingLocalItems } from '../lib/offlineStorage';

function sanitizeFirestoreData<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData).filter(v => v !== undefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeFirestoreData(value);
    }
  }
  return clean as T;
}

// Club-aware collection prefix
let CLUB_PREFIX = '';
let CLUB_IS_DEMO = true;
let CLUB_READONLY = true;

export function setClubPrefix(prefix: string, isDemo: boolean) {
  CLUB_PREFIX = isDemo ? '' : `_${prefix}`;
  CLUB_IS_DEMO = isDemo;
  CLUB_READONLY = false;
}

export function setClubReadOnly(readOnly: boolean) {
  CLUB_READONLY = readOnly;
}

function prefixed(name: string): string {
  return `${name}${CLUB_PREFIX}`;
}

// Entfernt große Base64-Bild-Strings rekursiv, damit sie NICHT im React-State
// und IndexedDB-Cache landen. Metadaten/Text bleiben 1:1 erhalten.
// Bilder werden weiterhin aus der DB geladen, sobald eine Ansicht sie öffnet.
const IMAGE_MIN_LENGTH = 600;
function stripBase64Images<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripBase64Images).filter(v => v !== undefined) as unknown as T;
  }
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.startsWith('data:') && val.length > IMAGE_MIN_LENGTH) {
      continue; // Bild-Blob herausfiltern (Speicherschutz)
    } else {
      out[key] = stripBase64Images(val);
    }
  }
  return out as T;
}

export function useLiteCollectionSync<T>(
  collectionName: string,
  idField: keyof T = 'id' as keyof T,
  sortField?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
  enabled: boolean = true,
  lite: boolean = true,
  maxItems?: number
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const effectiveCollection = prefixed(collectionName);
  const prevCollectionRef = useRef(effectiveCollection);
  const dataRef = useRef<T[]>([]);

  const applyLite = useCallback((items: T[]): T[] => {
    let out = items;
    if (lite) out = out.map((it) => stripBase64Images(it as any)) as unknown as T[];
    if (maxItems && out.length > maxItems) {
      const field = sortField as string;
      if (field) {
        out = [...out].sort((a: any, b: any) => {
          const av = a?.[field];
          const bv = b?.[field];
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1;
          if (bv === undefined || bv === null) return -1;
          return sortDirection === 'desc'
            ? (av < bv ? 1 : -1)
            : (av > bv ? 1 : -1);
        });
      }
      out = out.slice(0, maxItems);
    }
    return out;
  }, [lite, maxItems, sortField, sortDirection]);

  useEffect(() => {
    let cancelled = false;
    getLocalCollection(effectiveCollection).then((localItems) => {
      if (cancelled) return;
      if (Array.isArray(localItems) && localItems.length > 0) {
        const cleaned = applyLite(localItems as T[]);
        setData(cleaned);
        dataRef.current = cleaned;
        setLoading(false);
      }
    }).catch((e) => console.warn(`[Offline] Lokale Daten für ${effectiveCollection} nicht lesbar:`, e));
    return () => { cancelled = true; };
  }, [effectiveCollection, applyLite]);

  useEffect(() => {
    if (!enabled || !collectionName) {
      setLoading(false);
      return;
    }

    if (prevCollectionRef.current !== effectiveCollection) {
      setData([]);
      dataRef.current = [];
      prevCollectionRef.current = effectiveCollection;
    }

    setLoading(true);
    setError(null);

    // Watchdog (Anti-Haenger): Fall Backend/Regeln nicht antworten,
    // wird das Laden nach 9s garantiert beendet.
    // Sobald ein Snapshot eintrifft, wird er abgeschaltet (kein Fehlalarm).
    const watchdog = window.setTimeout(() => {
      setLoading(false);
      console.warn(`[Watchdog] ${effectiveCollection}: Sync nach 9s beendet (Firestore antwortete nicht)`);
    }, 9000);

    const colRef = collection(db, effectiveCollection);
    const q = sortField
      ? (maxItems ? query(colRef, orderBy(sortField as string, sortDirection), limit(maxItems)) : query(colRef, orderBy(sortField as string, sortDirection)))
      : colRef;

    // Selbstheilung: Der Firebase-SDK erholt sich nach einem einmaligen
    // "permission-denied" NIE wieder (Listener bleibt "terminal" ohne Daten).
    // Deshalb wird bei Autorisierungs-/Netzwerkfehlern nach kurzer Pause ein
    // NEUER Listener erstellt und die (anonyme) Anmeldung bei Bedarf erneuert.
    let stopped = false;
    let currentUnsubscribe: (() => void) | null = null;
    let retryTimer: number | null = null;
    let retries = 0;

    const startListener = () => {
      if (stopped) return;
      currentUnsubscribe = onSnapshot(
        q,
        async (snapshot) => {
          window.clearTimeout(watchdog);
          const items: T[] = [];
          snapshot.forEach((docSnap) => {
            items.push({ [idField]: docSnap.id, ...docSnap.data() } as unknown as T);
          });

          try {
            const [pending, cached] = await Promise.all([
              getPendingLocalItems(effectiveCollection),
              getLocalCollection(effectiveCollection),
            ]);
            const idKey = (it: any) => String(it?.[idField] || it?.id);

            const setMap = new Map<string, any>();
            const deleteIds = new Set<string>();
            for (const op of pending) {
              if (op.operation === 'SET' && op.data) setMap.set(op.itemId, op.data);
              else if (op.operation === 'DELETE') deleteIds.add(op.itemId);
            }
            let mergedItems = items;
            if (deleteIds.size > 0) {
              mergedItems = items.filter((it) => !deleteIds.has(idKey(it)));
            }
            for (const [pid, pdata] of setMap) {
              const idx = mergedItems.findIndex((it) => idKey(it) === pid);
              const obj = { [idField]: pid, ...pdata } as unknown as T;
              if (idx >= 0) mergedItems[idx] = obj;
              else mergedItems.push(obj);
            }
            for (const source of [cached, dataRef.current]) {
              if (!Array.isArray(source)) continue;
              const known = new Set(mergedItems.map(idKey));
              for (const localItem of source) {
                const ck = idKey(localItem);
                if (!ck || deleteIds.has(ck)) continue;
                if (!known.has(ck)) {
                  mergedItems.push(localItem as T);
                  known.add(ck);
                }
              }
            }
            if (stopped) return;
            const cleaned = applyLite(mergedItems);
            setData(cleaned);
            dataRef.current = cleaned;
            setLoading(false);
            saveLocalCollection(effectiveCollection, cleaned).catch((e) =>
              console.warn(`[Offline] Cache ${effectiveCollection} nicht geschrieben:`, e)
            );
          } catch (e) {
            if (stopped) return;
            console.warn(`[Offline] Merge der offenen Writes fehlgeschlagen:`, e);
            const cleaned = applyLite(items);
            setData(cleaned);
            dataRef.current = cleaned;
            setLoading(false);
          }
        },
        (err) => {
          if (stopped) return;
          console.error(`[Firestore] Error ${effectiveCollection}:`, err.message);
          setError(err);
          setLoading(false);
          // Bei (teils temporären) Autorisierungs-/Netzwerkfehlern erneut verbinden.
          if (isRetryableSnapshotError(err) && retries < 4) {
            retries += 1;
            const delay = 1500 * Math.pow(2, retries - 1);
            retryTimer = window.setTimeout(() => {
              if (stopped) return;
              void ensureAnonymousSession();
              startListener();
            }, delay);
          } else {
            // Nicht behebbar -> Watchdog aus, lokale Daten bleiben sichtbar.
            window.clearTimeout(watchdog);
          }
        }
      );
    };

    startListener();

    return () => {
      stopped = true;
      if (currentUnsubscribe) currentUnsubscribe();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      window.clearTimeout(watchdog);
    };
  }, [effectiveCollection, idField, sortField, sortDirection, enabled, applyLite, maxItems]);

  const addOrUpdateItem = useCallback(
    async (item: T) => {
      const id = String((item as any)[idField] || (item as any).id);
      if (!id) return;

      const optimistic = (prev: T[]) => {
        const index = prev.findIndex((x) => String((x as any)[idField] || (x as any).id) === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return sortDirection === 'desc' ? [item, ...prev] : [...prev, item];
      };
      const next = optimistic(dataRef.current);
      setData(next);
      dataRef.current = next;
      saveLocalCollection(effectiveCollection, next).catch(() => {});

      const docRef = doc(db, effectiveCollection, id);
      const { [idField]: _, ...dataToSave } = item as any;
      const sanitized = sanitizeFirestoreData(dataToSave);

      try {
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.error(`Error saving item to Firestore ${effectiveCollection}/${id}:`, err);
        enqueueSyncOperation(effectiveCollection, String(idField), 'SET', id, item).catch(() => {});
        return;
      }
    },
    [effectiveCollection, idField, sortDirection]
  );

  const removeItem = useCallback(
    async (id: string | number) => {
      const idStr = String(id);
      if (!idStr) return;

      const next = dataRef.current.filter((x) => String((x as any)[idField] || (x as any).id) !== idStr);
      setData(next);
      dataRef.current = next;
      saveLocalCollection(effectiveCollection, next).catch(() => {});

      const docRef = doc(db, effectiveCollection, idStr);
      try {
        const deletedItem = data.find((x) => String((x as any)[idField] || (x as any).id) === idStr) as unknown as T;
        await deleteDoc(docRef);
      } catch (err) {
        console.error(`Error removing item from Firestore ${effectiveCollection}/${idStr}:`, err);
        enqueueSyncOperation(effectiveCollection, String(idField), 'DELETE', idStr, {}).catch(() => {});
        throw err;
      }
    },
    [effectiveCollection, idField, data]
  );

  const saveItem = useCallback(
    async (id: string, item: T) => {
      const optimistic = (prev: T[]) => {
        const index = prev.findIndex((x) => String((x as any)[idField] || (x as any).id) === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return sortDirection === 'desc' ? [item, ...prev] : [...prev, item];
      };
      const next = optimistic(dataRef.current);
      setData(next);
      dataRef.current = next;
      saveLocalCollection(effectiveCollection, next).catch(() => {});

      const docRef = doc(db, effectiveCollection, id);
      const { [idField]: _, ...dataToSave } = item as any;
      const sanitized = sanitizeFirestoreData(dataToSave);
      try {
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.error(`Error saving item to Firestore ${effectiveCollection}/${id}:`, err);
        enqueueSyncOperation(effectiveCollection, String(idField), 'SET', id, item).catch(() => {});
        return;
      }
    },
    [effectiveCollection, idField, sortDirection]
  );

  return {
    data,
    items: data,
    loading,
    error,
    addOrUpdateItem,
    saveItem,
    removeItem,
  };
}