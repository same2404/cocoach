import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
  CLUB_READONLY = isDemo;
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

  useEffect(() => {
    if (!enabled || !collectionName) {
      setLoading(false);
      return;
    }

    // Clear stale data when the club changes
    if (prevCollectionRef.current !== effectiveCollection) {
      setData([]);
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
        setLoading(false);
      },
      (err) => {
        console.error(`[Firestore] Error ${effectiveCollection}:`, err.message);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [effectiveCollection, idField, sortField, sortDirection, enabled]);

  const addOrUpdateItem = useCallback(
    async (item: T) => {
      if (isReadOnly()) {
        console.warn(`[Schreibschutz] FC Auggen Demo - Speichern von ${effectiveCollection} blockiert`);
        return;
      }
      const id = String((item as any)[idField] || (item as any).id);
      if (!id) return;

      setData((prev) => {
        const index = prev.findIndex((x) => String((x as any)[idField] || (x as any).id) === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return sortDirection === 'desc' ? [item, ...prev] : [...prev, item];
      });

      const docRef = doc(db, effectiveCollection, id);
      const { [idField]: _, ...dataToSave } = item as any;
      const sanitized = sanitizeFirestoreData(dataToSave);

      try {
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.error(`Error saving item to Firestore ${effectiveCollection}/${id}:`, err);
        throw err;
      }
    },
    [effectiveCollection, idField, sortDirection]
  );

  const removeItem = useCallback(
    async (id: string | number) => {
      if (isReadOnly()) {
        console.warn(`[Schreibschutz] FC Auggen Demo - Löschen aus ${effectiveCollection} blockiert`);
        return;
      }
      const idStr = String(id);
      if (!idStr) return;

      setData((prev) => prev.filter((x) => String((x as any)[idField] || (x as any).id) !== idStr));

      const docRef = doc(db, effectiveCollection, idStr);
      try {
        await deleteDoc(docRef);
      } catch (err) {
        console.error(`Error removing item from Firestore ${effectiveCollection}/${idStr}:`, err);
        throw err;
      }
    },
    [effectiveCollection, idField]
  );

  const saveItem = useCallback(
    async (id: string, item: T) => {
      if (isReadOnly()) {
        console.warn(`[Schreibschutz] FC Auggen Demo - Speichern von ${effectiveCollection}/${id} blockiert`);
        return;
      }
      setData((prev) => {
        const index = prev.findIndex((x) => String((x as any)[idField] || (x as any).id) === id);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = item;
          return updated;
        }
        return sortDirection === 'desc' ? [item, ...prev] : [...prev, item];
      });

      const docRef = doc(db, effectiveCollection, id);
      const { [idField]: _, ...dataToSave } = item as any;
      const sanitized = sanitizeFirestoreData(dataToSave);
      try {
        await setDoc(docRef, sanitized, { merge: true });
      } catch (err) {
        console.error(`Error saving item to Firestore ${effectiveCollection}/${id}:`, err);
        throw err;
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
