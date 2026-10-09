import { useEffect, useRef } from 'react';
import { useLiteCollectionSync } from './useLiteCollectionSync';

const dateOnly = (d: any) => (d ? String(d).slice(0, 10) : '');

/**
 * Übernimmt automatisch neue Einheiten aus dem Trainingsplan (`training_sessions`)
 * in das Einheiten-Register (`attendance_unit_meta`), damit sie in der
 * Anwesenheits-/Monats-Ansicht erscheinen.
 *
 * Sicherheit:
 * - Läuft nur, wenn das Register bereits geladen ist (kein Massen-Anlegen bei leerem Cache).
 * - Legt nur Einheiten für Termine an, die NACH dem letzten bekannten Datum liegen.
 * - Überspringt bereits vorhandene Daten; idempotent.
 */
export function useAutoUnitSync(trainingSessions: any[]) {
  const { data: unitMeta, loading, addOrUpdateItem: saveUnitMeta } = useLiteCollectionSync<any>(
    'attendance_unit_meta',
    'id',
    undefined,
    'asc',
    true
  );
  const busyRef = useRef(false);

  useEffect(() => {
    if (busyRef.current || loading) return;
    if (!Array.isArray(unitMeta) || unitMeta.length === 0) return;
    if (!Array.isArray(trainingSessions) || trainingSessions.length === 0) return;

    const existingDates = new Set<string>();
    let maxEh = 5;
    let maxDate = '';
    unitMeta.forEach((u: any) => {
      const num = Number(u?.sessionNum ?? u?.id);
      const d = dateOnly(u?.date);
      if (d) {
        existingDates.add(d);
        if (d > maxDate) maxDate = d;
        if (!isNaN(num) && num > maxEh) maxEh = num;
      }
    });

    const additions: any[] = [];
    trainingSessions
      .filter((s: any) => {
        const d = dateOnly(s?.date);
        return d && d > maxDate && !existingDates.has(d);
      })
      .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)))
      .forEach((s: any) => {
        const d = dateOnly(s.date);
        if (existingDates.has(d)) return;
        existingDates.add(d);
        maxEh += 1;
        additions.push({
          id: String(maxEh),
          sessionNum: maxEh,
          date: d,
          focus: s.sessionFocus || s.focus || '',
          trainer: s.trainer ? String(s.trainer).trim() : '',
          loadLevel: s.load || s.loadLevel || 'Mittel',
          duration: s.duration || '',
        });
      });

    if (additions.length === 0 || additions.length > 60) return;

    busyRef.current = true;
    (async () => {
      try {
        for (const a of additions) {
          await saveUnitMeta(a);
        }
      } finally {
        busyRef.current = false;
      }
    })();
  }, [trainingSessions, unitMeta, loading, saveUnitMeta]);
}
