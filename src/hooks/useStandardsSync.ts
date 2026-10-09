import { useEffect, useRef } from 'react';
import { useCollectionSync } from './useCollectionSync';
import {
  StandardEntry,
  buildStandardsRegistry,
} from '../services/standardsRegistry';

/**
 * Automatische Standards-Generierung
 * ══════════════════════════════════════════════════════════════════════════════
 * Spiegelt ALLE Standards aus den Spielberichten (`match_analyses`) in die neue
 * Collection `match_standards`.
 *
 * Eigenschaften:
 * • Läuft automatisch, sobald ein Spielbericht erstellt/aktualisiert wird.
 * • Deterministisch: gleiche Spielberichte → identische Einträge (gleiche IDs,
 *   gleiche `contentHash`) → kein unnötiger Schreibverkehr.
 * • Löscht verwaiste Standards-Einträge, deren Spielbericht nicht mehr existiert.
 * • Verwendet `useCollectionSync` → Club-Prefix, Offline-Cache und
 *   Auto-History kommen automatisch mit.
 * • Schreibt nie in andere Collections.
 */

export interface UseStandardsSyncOptions {
  analyses: any[];
  competitiveMatches?: any[];
  testMatches?: any[];
  u23Matches?: any[];
  /** Läuft erst, wenn alle Quell-Collections geladen sind. */
  ready: boolean;
}

export function useStandardsSync({
  analyses,
  competitiveMatches,
  testMatches,
  u23Matches,
  ready,
}: UseStandardsSyncOptions) {
  const {
    data: storedEntries,
    addOrUpdateItem: saveEntry,
    removeItem: deleteEntry,
  } = useCollectionSync<StandardEntry>('match_standards', 'id', undefined, 'asc', true);

  // Verhindert, dass derselbe Sync mehrfach parallel läuft.
  const runningRef = useRef(false);
  // Bekannter Hash-Stand → nur bei echter Änderung schreiben.
  const syncedHashRef = useRef<string>('');

  useEffect(() => {
    if (!ready) return;
    if (runningRef.current) return;

    const desired = buildStandardsRegistry(analyses || [], {
      competitiveMatches,
      testMatches,
      u23Matches,
    });

    const fingerprint = desired
      .map(e => `${e.id}:${e.contentHash}`)
      .sort()
      .join('#');

    const existing = storedEntries || [];
    const existingById = new Map(existing.map(e => [String(e.id), e]));

    // Nur schreiben, wo sich der Inhalt tatsächlich geändert hat.
    const toWrite = desired.filter(e => existingById.get(e.id)?.contentHash !== e.contentHash);

    // Verwaiste Einträge entfernen (Spielbericht wurde gelöscht).
    const desiredIds = new Set(desired.map(e => e.id));
    const toDelete = existing.filter(e => !desiredIds.has(String(e.id)));

    if (toWrite.length === 0 && toDelete.length === 0) {
      syncedHashRef.current = fingerprint;
      return;
    }

    runningRef.current = true;
    (async () => {
      try {
        for (const entry of toWrite) {
          await saveEntry(entry);
        }
      } catch (err) {
        console.warn('[Standards-Sync] Schreiben fehlgeschlagen:', err);
      }
      for (const entry of toDelete) {
        try {
          await deleteEntry(String(entry.id));
        } catch (err) {
          console.warn('[Standards-Sync] Löschen fehlgeschlagen:', err);
        }
      }
      syncedHashRef.current = fingerprint;
      runningRef.current = false;
    })();
  }, [
    ready,
    analyses,
    competitiveMatches,
    testMatches,
    u23Matches,
    storedEntries,
    saveEntry,
    deleteEntry,
  ]);

  return storedEntries || [];
}
