import { collection, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

/**
 * Migrates Firestore data to ensure consistency and modern formats.
 * - Fixes missing IDs
 * - Normalizes categories (player, coach, staff, medical)
 * - Converts date strings to Firestore Timestamps
 * - Logs all changes to the console
 */
export async function migrateFirestoreData() {
  console.log('Starting comprehensive Firestore data migration...');
  const batch = writeBatch(db);
  let totalUpdated = 0;

  const collections = [
    'spieler',
    'attendance',
    'competitive_minutes',
    'test_minutes',
    'card_records',
    'budget_finanz',
    'individual_training',
    'run_records',
    'physio_entries',
    'meetings_data',
    'training_sessions',
    'vorbereitung_sommer',
    'vorbereitung_winter',
    'yearly_plan'
  ];

  const normalizeCategory = (cat: string): 'player' | 'coach' | 'staff' | 'medical' => {
    const c = (cat || '').toLowerCase();
    if (c.includes('player') || c.includes('spieler')) return 'player';
    if (c.includes('coach') || c.includes('trainer')) return 'coach';
    if (c.includes('staff') || c.includes('funktion') || c.includes('official')) return 'staff';
    if (c.includes('medical') || c.includes('physio') || c.includes('arzt')) return 'medical';
    return 'player';
  };

  const toTimestamp = (val: any): Timestamp | null => {
    if (!val) return null;
    if (val instanceof Timestamp) return val;
    // Handle plain objects that look like Timestamps (e.g. from JSON)
    if (val && typeof val === 'object' && 'seconds' in val) return new Timestamp(val.seconds, val.nanoseconds || 0);
    if (val instanceof Date) return Timestamp.fromDate(val);
    if (typeof val === 'string') {
      // Try DD.MM.YYYY
      const parts = val.split('.');
      if (parts.length === 3) {
        const d = parseInt(parts[0]);
        const m = parseInt(parts[1]) - 1;
        const y = parseInt(parts[2]);
        if (y > 1900 && y < 2100) {
          const date = new Date(y, m, d);
          if (!isNaN(date.getTime())) return Timestamp.fromDate(date);
        }
      }
      // Try YYYY-MM-DD
      const date = new Date(val);
      if (!isNaN(date.getTime())) return Timestamp.fromDate(date);
    }
    return null;
  };

  try {
    for (const collName of collections) {
      console.log(`Checking collection: ${collName}`);
      const snap = await getDocs(collection(db, collName));
      
      snap.forEach((d) => {
        const data = d.data();
        let changed = false;
        const newData = { ...data };

        // 1. Fix missing ID
        if (!newData.id) {
          newData.id = d.id;
          changed = true;
          console.log(`[${collName}] Fixed missing ID for ${d.id}`);
        }

        // 2. Normalize Category (for spieler)
        if (collName === 'spieler' && newData.category) {
          const newCat = normalizeCategory(newData.category);
          if (newCat !== newData.category) {
            console.log(`[${collName}] Normalizing category for ${d.id}: ${newData.category} -> ${newCat}`);
            newData.category = newCat;
            changed = true;
          }
        }

        // 3. Convert Date Strings to Timestamps
        const dateFields = ['geburtsdatum', 'date', 'datum', 'kickOff', 'meetingTime', 'targetDate', 'timestamp'];
        for (const field of dateFields) {
          if (newData[field] && typeof newData[field] === 'string') {
            const ts = toTimestamp(newData[field]);
            if (ts) {
              const tsField = `${field}Timestamp`;
              if (!newData[tsField] || !(newData[tsField] instanceof Timestamp)) {
                console.log(`[${collName}] Converting ${field} to Timestamp for ${d.id}: ${newData[field]}`);
                newData[tsField] = ts;
                changed = true;
              }
            }
          }
        }

        // 4. Specific fixes for collections
        if (collName === 'spieler') {
          if (!newData.name && (newData.firstName || newData.lastName)) {
            newData.name = `${newData.firstName || ''} ${newData.lastName || ''}`.trim();
            changed = true;
            console.log(`[${collName}] Fixed missing name for ${d.id}`);
          }
          if (newData.number === undefined && newData.nummer !== undefined) {
            newData.number = newData.nummer;
            changed = true;
            console.log(`[${collName}] Fixed missing number (from nummer) for ${d.id}`);
          }
        }

        if (changed) {
          batch.set(doc(db, collName, d.id), newData, { merge: true });
          totalUpdated++;
        }
      });
    }

    if (totalUpdated > 0) {
      await batch.commit();
      console.log(`Migration successful! Updated ${totalUpdated} documents across all collections.`);
    } else {
      console.log('No documents needed migration.');
    }
    return totalUpdated;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'migration_batch');
    throw err;
  }
}
