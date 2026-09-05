import { doc, setDoc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Match, MatchAnalysis } from '../types';

/**
 * MatchReportService (Pflichtspiel-Import & Spielbericht Management)
 * 
 * Stellt saubere Backend-Endpunkte & Logik bereit:
 * 1. Pflichtspiel abrufen
 * 2. 1-Click Import in Spielbericht (Kopie & Single Source of Truth Referenz)
 * 3. Spielbericht speichern & löschen
 */

export class MatchReportService {
  private static MATCHES_COLLECTION = 'matches';
  private static REPORTS_COLLECTION = 'match_analyses';

  /**
   * Lädt alle Pflichtspiele aus Firestore
   */
  static async getPflichtspiele(): Promise<Match[]> {
    try {
      const snap = await getDocs(collection(db, this.MATCHES_COLLECTION));
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, this.MATCHES_COLLECTION);
      return [];
    }
  }

  /**
   * Lädt ein einzelnes Pflichtspiel anhand ID
   */
  static async getPflichtspielById(matchId: string | number): Promise<Match | null> {
    const docPath = `${this.MATCHES_COLLECTION}/${matchId}`;
    try {
      const snap = await getDoc(doc(db, this.MATCHES_COLLECTION, String(matchId)));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as Match;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, docPath);
      return null;
    }
  }

  /**
   * 1-CLICK-IMPORT: Generiert aus einem Pflichtspiel (Match) einen vorausgefüllten Spielbericht (MatchAnalysis).
   * 
   * Transponiert 1:1 alle Basisdaten:
   * Gegner, Datum, Uhrzeit, Heim/Auswärts, Ergebnis, Wettbewerb, Aufstellung, Bank, Auswechslungen, Torschützen, Karten & Notizen.
   * 
   * @param match Das aus der DB/State gewählte Pflichtspiel
   * @param existingReportId Optionale ID eines bestehenden Spielberichts zum Überschreiben/Verknüpfen
   * @returns Vollständiges MatchAnalysis-Objekt mit allen vorausgefüllten Feldern
   */
  static createSpielberichtFromPflichtspiel(match: Match, existingReportId?: string): MatchAnalysis {
    const reportId = existingReportId || `report_${match.id}_${Date.now()}`;

    // Formatierung der Aufstellung falls als Array vorhanden
    const startingLineupStr = Array.isArray(match.startingLineup)
      ? match.startingLineup.join(', ')
      : (match.startingLineup || '');

    const substitutesStr = Array.isArray(match.substitutes)
      ? match.substitutes.join(', ')
      : (match.substitutes || '');

    const scorersFormatted = match.goalRecords 
      ? match.goalRecords.map(g => `${g.minute}' ${g.scorer}${g.assist ? ` (Vorlage: ${g.assist})` : ''}`).join('; ')
      : (match.scorers || '');

    const cardsFormatted = match.cardDetails
      ? match.cardDetails.map(c => `${c.minute}' ${c.player} (${c.cardType})`).join('; ')
      : (match.cards || '');

    return {
      id: reportId,
      matchId: match.id,
      opponent: match.opponent,
      date: match.date || new Date().toISOString().split('T')[0],
      kickOff: match.kickOff || '',
      location: match.location || '',
      category: match.competition || 'Pflichtspiel',
      isHome: match.isHome,
      result: match.result || '',
      
      // 1:1 Vorausgefüllte Pflichtspieldaten (Basisdaten)
      startingLineup: startingLineupStr,
      substitutes: substitutesStr,
      substitutions: match.substitutions || [],
      scorers: scorersFormatted,
      cards: cardsFormatted,
      matchNotes: match.notes || match.trainerNote || '',
      
      // Statusflags für Nachverfolgbarkeit
      isAutoImported: true,
      importedMatchTimestamp: new Date().toISOString(),

      // Editierbare Zusatzfelder (Start-Platzhalter für die Trainer-Ergänzung)
      berichtText: '',
      trainerFazit: '',
      trainerTactical: '',
      teamRating: '8.0',
      playerOfTheMatch: '',
      goodActions: '',
      badActions: '',
      specialMoments: '',
      lineupImages: [],
      presentationImages: [],
      videoClips: []
    };
  }

  /**
   * Speichert den Spielbericht in Firestore
   */
  static async saveSpielbericht(report: MatchAnalysis): Promise<void> {
    const docPath = `${this.REPORTS_COLLECTION}/${report.id}`;
    try {
      await setDoc(doc(db, this.REPORTS_COLLECTION, report.id), report, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, docPath);
    }
  }

  /**
   * Löscht einen Spielbericht aus Firestore
   */
  static async deleteSpielbericht(reportId: string): Promise<void> {
    const docPath = `${this.REPORTS_COLLECTION}/${reportId}`;
    try {
      await deleteDoc(doc(db, this.REPORTS_COLLECTION, reportId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, docPath);
    }
  }
}
