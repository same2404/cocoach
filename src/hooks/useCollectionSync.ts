import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { getLocalCollection, saveLocalCollection, enqueueSyncOperation } from '../lib/offlineStorage';

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

// Club-aware collection prefix - set synchronously by ClubProvider before child renders
let CLUB_PREFIX = '';
let CLUB_IS_DEMO = true;
let CLUB_READONLY = true;

export function setClubPrefix(prefix: string, isDemo: boolean) {
  CLUB_PREFIX = isDemo ? '' : `_${prefix}`;
  CLUB_IS_DEMO = isDemo;
  CLUB_READONLY = false;
}

// Allow enabling writes while keeping the (empty) demo prefix so no data is lost
export function setClubReadOnly(readOnly: boolean) {
  CLUB_READONLY = readOnly;
}

function prefixed(name: string): string {
  return `${name}${CLUB_PREFIX}`;
}

function isReadOnly(): boolean {
  return CLUB_READONLY;
}

// ── Automatische Versions-Archivierung ──────────────────────────────────────
// Jede Änderung an jedem Datensatz wird IMMER mit Tag, Datum und Uhrzeit
// (minutengenau nach einem Klick) in eigene History-Dokumente gesichert.
// So gehen Inhalte nie mehr verloren – weder durch eigene noch durch
// Kollegen-Änderungen. Versionen lassen sich jederzeit wiederherstellen.
function tsToReadable(ts: number): string {
  return new Date(ts).toLocaleString('de-DE', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Große Bild-Blobs (Base64) würden die History aufblähen → im Snapshot kürzen.
function trimImagesForHistory<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(trimImagesForHistory).filter(v => v !== undefined) as unknown as T;
  }
  const out: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && val.startsWith('data:') && val.length > 400) {
      out[key] = '[Bild ' + Math.round(val.length / 3) + 'KB gespeichert]';
    } else {
      out[key] = trimImagesForHistory(val);
    }
  }
  return out as T;
}

async function writeAutoHistory<T>(
  effectiveCollection: string,
  idField: keyof T,
  item: T,
  action: 'save' | 'delete'
) {
  try {
    if (effectiveCollection.endsWith('_history')) return;
    if (effectiveCollection.includes('_documents_content')) return;
    const itemId = String((item as any)[idField] || (item as any).id);
    const ts = Date.now();
    const { [idField]: _, ...snapshot } = item as any;
    const trimmed = trimImagesForHistory(sanitizeFirestoreData(snapshot));
    const histRef = doc(db, `${effectiveCollection}_history`, `${itemId}_${ts}_${Math.random().toString(36).slice(2, 7)}`);
    await setDoc(histRef, {
      itemId,
      ts,
      tsIso: new Date(ts).toISOString(),
      readable: tsToReadable(ts),
      action,
      data: trimmed
    });
  } catch (err) {
    console.error('[History] Archivierung fehlgeschlagen (nicht kritisch):', err);
  }
}

export function useCollectionSync<T>(
  collectionName: string,
  idField: keyof T = 'id' as keyof T,
  sortField?: string,
  sortDirection: 'asc' | 'desc' = 'asc',
  enabled: boolean = true
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const effectiveCollection = prefixed(collectionName);
  const prevCollectionRef = useRef(effectiveCollection);
  const dataRef = useRef<T[]>([]);

  // Offline-first: sofort lokale Daten (IndexedDB) anzeigen, bevor Firestore antwortet.
  useEffect(() => {
    let cancelled = false;
    getLocalCollection(effectiveCollection).then((localItems) => {
      if (cancelled) return;
      if (Array.isArray(localItems) && localItems.length > 0) {
        setData(localItems as T[]);
        dataRef.current = localItems as T[];
        setLoading(false);
      }
    }).catch((e) => console.warn(`[Offline] Lokale Daten für ${effectiveCollection} nicht lesbar:`, e));
    return () => { cancelled = true; };
  }, [effectiveCollection]);

  useEffect(() => {
    if (!enabled || !collectionName) {
      setLoading(false);
      return;
    }

    // Clear stale data when the club changes
    if (prevCollectionRef.current !== effectiveCollection) {
      setData([]);
      dataRef.current = [];
      prevCollectionRef.current = effectiveCollection;
    }

    setLoading(true);
    setError(null);

    const colRef = collection(db, effectiveCollection);
    const q = sortField ? query(colRef, orderBy(sortField as string, sortDirection)) : colRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ [idField]: docSnap.id, ...docSnap.data() } as unknown as T);
        });

        if (sortField && !q) {
          items.sort((a: any, b: any) => {
            const valA = a[sortField];
            const valB = b[sortField];
            if (valA === undefined) return 1;
            if (valB === undefined) return -1;
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
          });
        }

        setData(items);
        dataRef.current = items;
        setLoading(false);
        // Caching: Firestore-Stand immer lokal spiegeln, damit nichts verloren geht.
        saveLocalCollection(effectiveCollection, items).catch((e) =>
          console.warn(`[Offline] Cache ${effectiveCollection} nicht geschrieben:`, e)
        );
      },
      (err) => {
        console.error(`[Firestore] Error ${effectiveCollection}:`, err.message);
        setError(err);
        setLoading(false);
        // Beim Lesefehler lokale Daten behalten (nicht leeren!)
      }
    );

    return () => unsubscribe();
  }, [effectiveCollection, idField, sortField, sortDirection, enabled]);

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
        await writeAutoHistory(effectiveCollection, idField, item, 'save');
      } catch (err) {
        console.error(`Error saving item to Firestore ${effectiveCollection}/${id}:`, err);
        // Offline-first: Write in Warteschlange legen statt Fehler werfen,
        // damit das Speichern UI-seitig als Erfolg durchgeht und die Daten
        // lokal erhalten bleiben. Sobald Auth/Wiederholung verfügbar ist,
        // wird der Write automatisch nachgespielt.
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
        if (deletedItem) {
          await writeAutoHistory(effectiveCollection, idField, deletedItem, 'delete');
        }
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
        await writeAutoHistory(effectiveCollection, idField, item, 'save');
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
