# Fertiger Analyse-Prompt (mit echtem Code aus der App)

Stand: 10.11.2026
Quelle: dieses Repository, `fc-auggen-manager-26-27`
Zweck: Nur Analyse. Es wird nichts am App-Code geändert, nichts gelöscht, nichts geschrieben.

---

## 1. Was hier eingesetzt wurde

| Platzhalter | ersetzt durch | Fundstelle |
|---|---|---|
| Teil 1 – Feldnamen | echte Interfaces `Player`, `MatchMinuteRecord`, `TrackerAcademyReport` | `src/types.ts` |
| Teil 2, Bug 1 – Trainingsbeteiligung | Render-Teil, Datenfluss, Firestore-Mapping | `TrainingAttendanceView.tsx`, `App.tsx`, `useCollectionSync.ts` |
| Teil 2, Bug 2 – Spiel-Formular | `handleAddMatch`, Verdrahtung, Speicherfunktion, Rules | `MatchPlanningView.tsx`, `App.tsx`, `useCollectionSync.ts`, `firestore.rules` |

## 2. Was noch fehlt – und warum

Die **Zahlenwerte** (Minuten, km, Sprints, Topspeed) stehen nicht im Quellcode, sondern in der
Firestore-Datenbank. Sie sind in der App sichtbar (Spielerportal / Tracker-Analyse), aber nicht
als Datei im Repository. Deshalb bleibt genau **ein** Platzhalter im Prompt: `[DATEN EINFÜGEN]`.

So füllst du ihn in 1 Minute:
1. In der App den persönlichen Spielerbericht des Spielers öffnen.
2. Den sichtbaren Berichtstext kopieren (oder die Tabelle der Einsätze).
3. In den Prompt unter `[DATEN EINFÜGEN]` einfügen.

Mehr braucht es nicht – die KI bekommt die Feldbedeutung aus dem Code, die Werte aus dem Bericht.

---

## 3. Der Prompt (ab hier komplett kopieren)

````text
Du bist mein sportwissenschaftlicher Datenanalyst, Leistungs-Coach und vorsichtiger Code-Reviewer für meine Fußball-Management-App (React, TypeScript, Tailwind CSS, Firestore).

ABSOLUTE SICHERHEITSREGELN (gelten für alles):
- Ändere keinen bestehenden Code eigenmächtig. Schreibe keine Dateien neu und refactore nichts.
- Lösche nichts: keine Daten, keine Firestore-Dokumente, keine Code-Zeilen, keine Funktionen, keine Features.
- Schlage keine Skripte vor, die Daten löschen oder überschreiben.
- Bestehende Funktionen, Layouts und Datenstrukturen bleiben unverändert.
- Erfinde keine Werte und rate nicht. Fehlen Informationen, schreibe "keine Daten" bzw. sag mir, was du zusätzlich brauchst.
- Wenn du etwas nicht aus dem eingefügten Code ableiten kannst, frage nach, statt zu vermuten.

Bearbeite die zwei Teile getrennt voneinander. Beginne mit Teil 1, danach Teil 2.

==================================================
TEIL 1: PERSÖNLICHER SPIELERBERICHT
==================================================

Erstelle pro Spieler einen individuellen Leistungsbericht, der AUSSCHLIESSLICH für den jeweiligen Spieler bestimmt ist.

Grundregeln:
1. NUR FÜR DEN SPIELER: Persönliche Ansprache ("Du"). Motivierend, keine Vergleiche mit Mitspielern, keine Trainer-Interna, nichts Demotivierendes oder Bloßstellendes.
2. DATENQUELLEN: Nutze die gesamte App-Historie (bisherige Saisonspiele, Trainingsdaten, bisherige Gesamtminuten) zusammen mit den Daten des aktuellen Spielberichts.
3. FORTFÜHRUNG: Addiere die Einsatzminuten von heute zur bisherigen Saisonspielzeit. Berechne die kumulierten Werte (Gesamtdistanz, Gesamtsprints).
4. RELATIVE INTENSITÄT: Meter pro Minute = Gesamtmeter / Spielminuten, damit Einwechselspieler fair bewertet werden.
5. TREND-PFEILE: Heute vs. persönlicher Saisonschnitt (▲ = gesteigert, ▼ = unter Schnitt, ▬ = konstant).
6. Fehlen Daten, schreibe "keine Daten" und lass den Pfeil weg.

DATENQUELLE IM CODE (so speichert die App die Werte – verbindlich):

Spieler (src/types.ts, interface Player):
- id, number, firstName, lastName, position, age
- einsatzzeitenGesamt (bisherige Gesamt-Einsatzzeit in Minuten)
- testEinsatzzeitenGesamt (Einsatzzeit Testspiele)
- loadAmpel ('Grün' | 'Gelb' | 'Rot')

Einsätze pro Spiel (src/types.ts, interface MatchMinuteRecord):
- playerId
- minutes: Record<matchId, number>  → Minuten pro Spiel
- details: Record<matchId, { start, end, notes }>
- matchAvailability: Record<matchId, 'Anwesend' | 'Verletzt' | 'Entschuldigt' | ''>
- manualPlayedGames, manualTotalGames (manuell gepflegte Einsatz-/Spielzahl, leer = automatisch)

Messwerte je Spiel (src/types.ts, interface TrackerAcademyReport.metrics):
- totalDistanceKm      → Laufleistung in km
- sprintCount          → Anzahl Sprints
- highSpeedDistanceMeters → High-Speed-Lauf in Metern
- maxSpeedKmh          → Topspeed in km/h
- avgSpeedKmh, accelerationsCount, decelerationsCount, workloadScore

Wichtig:
- "m/min" wird NICHT gespeichert. Es wird gerechnet: (totalDistanceKm * 1000) / Minuten.
- Die Saisonspielzeit ergibt sich aus der Summe von minutes über alle Spiele oder aus einsatzzeitenGesamt.
- Der Saisonschnitt eines Messwerts ist der Durchschnitt über alle Spiele mit vorhandenem Messwert.

Definitionen (verbindlich, nicht abweichen):
- Einsatz: Ein Spiel zählt als Einsatz, wenn die Einsatzminuten > 0 sind. Kaderplätze ohne Minuten zählen nicht.
- Saisonschnitt: Nur Spiele mit vorhandenen Messwerten fließen in den Schnitt ein. Spiele ohne Daten zählen weder als 0 noch als Ausreißer mit.
- Trendschwelle: Abweichung < 3 % vom Saisonschnitt = ▬. Ab 3 % nach oben = ▲, ab 3 % nach unten = ▼.
- Kleine Stichprobe: Bei unter 10 Minuten Einsatzzeit heute den m/min-Wert ausgeben, aber mit dem Zusatz "(kleine Stichprobe)".
- Heutiger Wert fehlt: Zeile mit "keine Daten" füllen, Vergleich und Pfeil komplett weglassen. Nie einen alten Wert als heutigen Wert einsetzen.
- Saisonrekord Topspeed: nur aus tatsächlich erfassten Werten der bisherigen Spiele. Existiert kein Rekordwert, schreibe "keine Daten" – nicht den heutigen Wert.
- Kumulierte Werte nur addieren, wenn beide Werte (bisher + heute) vorhanden sind. Sonst "keine Daten" mit Hinweis, welcher Teil fehlt.

Ausgabeformat (pro Spieler ein eigener Bericht):

==================================================
DEIN PERSÖNLICHER SPIELERBERICHT
Name: [Spielername] | Rückennummer: #[Nummer]
Position: [Position]
Spiel: [Gegner] ([Datum])
==================================================

1. DEINE EINSATZZEIT & SAISON-HISTORIE:
• Einsatzzeit heute: [X] Minuten
• Deine gesamte Saisonspielzeit bis heute: [Bisherige Min + Heute] Minuten ([Anzahl] Einsätze)

2. DEINE LEISTUNGSDATEN HEUTE VS. DEIN SAISONSCHNITT:
• Laufleistung:       [Heute] km      (Dein Schnitt: [X] km)      [▲/▼/▬]
• Intensität:         [Heute] m/min   (Dein Schnitt: [X] m/min)   [▲/▼/▬]
• High-Speed-Lauf:    [Heute] m       (Dein Schnitt: [X] m)       [▲/▼/▬]
• Sprints (>24 km/h): [Heute] Sprints (Dein Schnitt: [X] Sprints) [▲/▼/▬]
• Topspeed heute:     [Heute] km/h    (Dein Saisonrekord: [X] km/h)

3. DEIN COACHING-FEEDBACK:
• Was heute stark war: [1 konkreter Satz]
• Worauf du im nächsten Spiel achten kannst: [1 motivierender Impuls]

==================================================

Zusatzregeln für Teil 1:
- Feedback-Sätze nur auf Basis der vorhandenen Zahlen. Keine erfundenen Beobachtungen, keine Floskeln ohne Datenbezug.
- Bei "keine Daten" im Feedback sachlich bleiben, z. B.: "Für heute liegen keine Messwerte vor – dein Einsatz zählt trotzdem."
- Kein Spieler wird mit einem anderen Spieler verglichen, auch nicht indirekt.
- Am Ende von Teil 1 eine kurze Liste: "Fehlende Daten für diesen Bericht:" mit den konkret fehlenden Feldern.

MEINE DATEN:
[DATEN EINFÜGEN]

==================================================
TEIL 2: ANALYSE VON ZWEI BUGS (NUR LESEN, NICHTS ÄNDERN)
==================================================

Analysiere nur anhand des Codes, den ich unten einfüge. Gib pro Bug aus:
a) die wahrscheinlichste Ursache, mit Verweis auf Datei, Funktion und Zeile,
b) den kleinstmöglichen Fix als Diff (nur die geänderten Zeilen, mit Kontext), rein additiv und ohne Entfernen bestehender Logik,
c) mögliche Nebenwirkungen des Fixes,
d) was du nicht beurteilen kannst, weil Code oder Daten fehlen.

Harte Grenzen für Fixes:
- Maximal 10 geänderte Zeilen pro Fix. Wird mehr benötigt, beschreibe die Lösung nur und liefere keinen Diff.
- Keine neuen Komponenten, keine neuen Dateien, keine Umbenennungen, keine Formatänderungen.
- Keine Änderung an Datenmodell, Firestore-Pfaden oder Security Rules.
- Wenn die Ursache in den Daten liegt: keine Codeänderung vorschlagen, sondern nur die betroffenen Dokument-IDs nennen.

--- BUG 1: Spieler "Björn Giesel" erscheint doppelt in der Trainingsbeteiligung ---

Bekannter Aufbau (aus dem Code):
- Die Anwesenheit kommt als Array `AttendanceRecord[]` von außen in die View.
- Jeder Datensatz hat `id`, `playerId` und `sessions: Record<SessionNummer, StatusCode>`.
- Die View rendert `players` und sucht pro Spieler den passenden Datensatz über `attendance.find(a => a.playerId === p.id)`.
- Gespeichert wird pro Spieler ein Firestore-Dokument `attendance/{playerId}`.

Datei: src/components/views/TrainingAttendanceView.tsx (Render-Teil, Zeilen 306–345)

```tsx
const renderTableSection = (title: string, category: string) => {
  const filteredPlayers = sortPlayers(players.filter(p => {
    if (category === 'player') {
      const cat = (p.category || 'player').toLowerCase();
      return cat === 'player' || cat === 'spieler';
    }
    const cat = (p.category || 'player').toLowerCase();
    if (category === 'coach') return cat === 'coach' || cat === 'trainer';
    if (category === 'staff') return cat === 'staff' || cat === 'funktionär' || cat === 'betreuer' || cat === 'teammanager';
    if (category === 'medical') return cat === 'medical' || cat === 'medizinisch' || cat === 'arzt' || cat === 'ärztlich' || cat === 'physio';
    return false;
  }));

  return (
    <>
      {filteredPlayers.map((player, idx) => {
        const stats = calculateStats(player.id);
        const record = attendance.find(a => a.playerId === player.id);
        ...
        return (
          <tr key={player.id} ...>
```

Datei: src/App.tsx (Zeilen 472 und 2233–2242)

```tsx
const { data: attendance, loading: loadingAttendance, addOrUpdateItem: saveAttendance, removeItem: deleteAttendance } =
  useCollectionSync<any>('attendance', 'playerId', undefined, 'asc', true);

case 'attendance':
  return (
    <TrainingAttendanceView
      players={sortedPlayers}
      attendance={attendance}
      onUpdateAttendance={handleUpdateAttendance}
      ...
```

Datei: src/App.tsx (Zeilen 1568–1596) – Schreibpfad

```tsx
const handleUpdateAttendance = useCallback(async (playerId: string, session: number, status: string) => {
  try {
    const docRef = doc(db, 'attendance', playerId);
    const updateValue = status === '' ? deleteField() : status;
    try {
      await updateDoc(docRef, { [`sessions.${session}`]: updateValue });
    } catch (e: any) {
      if (e.code === 'not-found') {
        if (status !== '') {
          await setDoc(docRef, { playerId: playerId, sessions: { [session]: status } });
        }
      } else { throw e; }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `attendance/${playerId}`);
  }
}, []);
```

Datei: src/hooks/useCollectionSync.ts (Zeilen 167–174) – Lesepfad

```ts
currentUnsubscribe = onSnapshot(q, async (snapshot) => {
  const items: T[] = [];
  snapshot.forEach((docSnap) => {
    items.push({ [idField]: docSnap.id, ...docSnap.data() } as unknown as T);
  });
```

Zusatzhinweis: Diese Datei führt zusätzlich einen Offline-Zusammenführ-Schritt aus
(`getPendingLocalItems` / `getLocalCollection`, Zeilen 188–230), der Serverstand, lokalen
Zwischenspeicher und Sync-Queue vereinigt. Wenn dabei ein Eintrag doppelt in `items` landet,
entsteht die Doppelung erst im Frontend.

Prüfe in dieser Reihenfolge:
1. Frontend-State/Mapping: doppeltes Pushen, zwei parallele Datenquellen, Merge im Offline-Schritt.
2. Datenbestand: zwei Spielerdatensätze mit gleichem Namen oder zwei `attendance`-Dokumente für denselben Spieler.
3. Rendering: fehlende Deduplizierung, instabile Keys, Sortierung ohne eindeutiges Kriterium.

Bevorzugter Fix: reine Anzeige-Deduplizierung beim Rendern über eine Map nach Spieler-ID.
Regeln dafür:
- Der erste Treffer bleibt erhalten, weitere Treffer derselben ID werden nur beim Rendern übersprungen.
- Die Datenbank bleibt unverändert, es wird nichts gelöscht und nichts geschrieben.
- Die bestehende Sortierung bleibt erhalten; der React-Key bleibt die Spieler-ID.
- Wenn zwei unterschiedliche IDs mit identischem Namen existieren: nur die IDs und Fundstellen nennen, keinen Fix vorschlagen.

--- BUG 2: Bei der U23 (2. Mannschaft) lassen sich keine Spiele anlegen ---

Bekannter Aufbau (aus dem Code):
- U23-Spiele liegen in einer EIGENEN Collection `u23_matches`, nicht in `matches` mit teamId.
- Die Collection wird in App.tsx geladen und an `MatchPlanningView` als `matches` übergeben.
- Das Formular ist KEIN eigenes Modal und hat kein teamId-Feld: "Spiel anlegen" erzeugt direkt ein neues Match-Objekt und speichert es.
- Gespeichert wird über `onSaveMatch` → `saveU23Match` → `addOrUpdateItem` → `setDoc(..., { merge: true })`.

Datei: src/App.tsx (Zeile 776 und 2769–2785)

```tsx
const { data: u23Matches, loading: loadingU23Matches, addOrUpdateItem: saveU23Match, removeItem: deleteU23Match } =
  useCollectionSync<any>('u23_matches', 'id', 'date', 'asc', true);

case 'u23_planning':
  return (
    <MatchPlanningView
      players={sortedPlayers}
      matches={u23Matches}
      matchMinutes={u23Minutes}
      opponents={opponents}
      onSaveMatch={saveU23Match}
      onDeleteMatch={deleteU23Match}
      onSaveMinutes={saveU23Minutes}
      onSaveOpponent={saveOpponent}
      onDeleteOpponent={deleteOpponent}
      title="U23 – Einsatzzeiten A‑Kader"
      stammspielerMatches={competitiveMatches}
      stammspielerMinutes={competitiveMinutes}
    />
  );
```

Datei: src/components/views/MatchPlanningView.tsx (Zeilen 595–616)

```tsx
const handleMatchChange = (field: keyof Match, value: any) => {
  if (!selectedMatch) return;
  onSaveMatch({ ...selectedMatch, [field]: value });
};

const handleAddMatch = async () => {
  const newIndex = matches.length > 0 ? Math.max(...matches.map(m => Number(m.index) || 0)) + 1 : 1;
  const newMatch: Match = {
    id: `match_${Date.now()}`,
    index: newIndex,
    opponent: 'NEUER GEGNER',
    location: 'Auggen',
    isHome: true,
    kickOff: '15:30',
    endTime: '17:15',
    meetingTime: '14:15',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  };
  await onSaveMatch(newMatch);
  setSelectedMatchId(newMatch.id);
};
```

Datei: src/hooks/useCollectionSync.ts (Zeilen 277–314) – Speicherfunktion

```ts
const addOrUpdateItem = useCallback(async (item: T) => {
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
    enqueueSyncOperation(effectiveCollection, String(idField), 'SET', id, item).catch(() => {});
    return;
  }
}, [effectiveCollection, idField, sortDirection]);
```

Wichtig: Ein Fehler wird abgefangen, in die Sync-Queue gelegt und NICHT nach oben geworfen.
Ein "Anlegen" kann deshalb UI-seitig erfolgreich wirken, obwohl nichts in Firestore landet.

Datei: firestore.rules (vollständig)

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Prüfe in dieser Reihenfolge:
1. `handleAddMatch`: Wird es überhaupt aufgerufen? Ist der Button sichtbar/aktiv? Existiert `selectedMatch` danach?
2. `addOrUpdateItem`: Ist `id` gesetzt? Greift der `catch` (Konsole: "Error saving item to Firestore u23_matches/...")?
3. `useCollectionSync('u23_matches', 'id', 'date', 'asc', true)`: Kommen die Daten nach dem Schreiben per Snapshot zurück?
4. Rules: `allow read, write: if request.auth != null` – ist der Nutzer angemeldet? (Rules sind offen, ein Berechtigungsproblem ist damit unwahrscheinlich.)
5. Unterschied zur funktionierenden Testspiel-Planung: gleiche Komponente (`MatchPlanningView`), andere Collection (`test_matches` vs. `u23_matches`).

Bevorzugter Fix: nur die minimal nötige Änderung im bestehenden Formular bzw. in `handleAddMatch`.
Keine neue Komponente, kein neuer Dialog.

Zusätzlich für Bug 2 ausgeben:
- Welche Security Rules ich prüfen soll (Pfad + Bedingung), ohne sie zu ändern.
- Welche Konsolenausgabe oder welcher Firestore-Fehlercode den Verdacht bestätigen würde, damit ich es selbst testen kann.
````

---

## 4. Befunde, die ich vorab schon sehe (nur Hinweise, keine Änderung)

1. **Bug 2 ist wahrscheinlich kein Rules-Problem.** `firestore.rules` erlaubt jedem angemeldeten
   Nutzer alles. Wenn U23-Spiele nicht erscheinen, liegt es eher an `handleAddMatch`,
   am stillen `catch` in `addOrUpdateItem` oder am Zurücklesen über `u23_matches`.
2. **Bug 2 hat kein `teamId`.** Der Verdacht "teamId leer" trifft hier nicht zu, weil U23 eine
   eigene Collection ist. Der Vergleich mit der funktionierenden Testspiel-Planung ist der
   schnellste Weg (gleiche Komponente, nur andere Collection).
3. **Bug 1 kann im Offline-Merge entstehen.** `useCollectionSync` vereinigt Serverstand,
   IndexedDB-Cache und Sync-Queue. Doppelte Einträge können dort entstehen, ohne dass die
   Datenbank doppelt ist. Eine reine Anzeige-Deduplizierung bleibt der sicherste Fix.
4. **`m/min` existiert nicht als Feld.** Wer es im Bericht braucht, muss es rechnen
   (`totalDistanceKm * 1000 / Minuten`) – das steht jetzt im Prompt.
