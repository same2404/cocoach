# AGENTS.md – FC Auggen KI-System

## Core Directives
1. **App Stability & Reliability**:
   - Always run linter (`lint_applet`) and build check (`compile_applet`) after every feature change to ensure zero build errors.
   - Maintain instant interactive deletion for video analysis records and scene clips without UI blocking.
   - Fallback video streaming must always remain functional even when third-party video links fail.

2. **Video Analysis & Clip Cutter**:
   - Ensure scene clips can be created, cut (5s, 10s, 15s quick-cuts or custom timing), played inline with mini-preview, and deleted instantly without dialog popups.
   - Never use blocking `window.confirm` dialogs inside the iframe sandbox.

3. **Data Persistence**:
   - Sync all video analysis records, scene clips, and tactical reports to Firebase Firestore DB (`ai-studio-20b6fe19-5950-4d1f-9c88-e7f55ed9a819`).

4. **3D-Taktiktafel & Interaktive Laufwege (Profi-Modus)**:
   - Render 3D angled isometric pitch canvas with toggleable 2D/3D perspective, player 3D node markers, animated 3D run curves, and intensity color paths (Blau = Offensiv, Rot = Defensiv, Gelb = Umschalten).
   - Provide game situation detection (Ballgewinn, Ballverlust, Umschaltmoment, Pressing-Auslöser, Überzahl/Unterzahl, Flügelüberladung, Tiefe Läufe, Rückwärtige Sprints) with position-specific run models (ST, RA/LA, ZM/DM/OM, RV/LV, IV, TW).
   - Display live simulation controls, 3D Heatmap color cloud overlays, high-intensity load surfaces, and trainer position advice.

---

## Specialized Agent Modules & Roles

### 1. `SupervisorAgent`
- **Rolle**: Überwacht alle Agents, verhindert Fehler, steuert Prozesse. Overall application architecture & quality gatekeeper.
- **Aufgaben**: Validierung, Fehlererkennung, Prozesskontrolle. Ensures all system modules (video analysis, squad management, tactical board, match reports) function seamlessly without syntax or build failures.
- **Regeln**: Keine eigenen Daten ändern, nur überwachen und steuern. Bei Konflikten entscheidet stets der SupervisorAgent.

### 2. `TeamAgent`
- **Rolle**: Spieler- und Teamverwaltung (FC Auggen team management & player analytics).
- **Aufgaben**: Spieler hinzufügen, aktualisieren, abrufen, löschen. Manages player rosters, positions, injury updates, attendance, individual performance metrics, and LEVEL 3 Position-Specific Run Analysis (ST, RA/LA, ZM/DM/OM, RV/LV, IV, TW).
- **Regeln**: Eindeutige IDs, keine Duplikate, saubere Statistiken. LEVEL 3 Position-Evaluation muss IMMER den Satz enthalten: „Für die Position [X] ist diese Laufbewegung typisch/ungewöhnlich/überlastend.“

### 3. `CompetitionAgent`
- **Rolle**: Tabellen, Spielpläne, Ergebnisse & Verbandsliga Match performance analyst.
- **Aufgaben**: Tabelle berechnen, Spielpläne erstellen, Matches aktualisieren. Tracks Verbandsliga match schedules, opponent scouting, live scores, and tactical gameplans.
- **Regeln**: Punkte korrekt, keine doppelten Spiele, chronologische Spieltage.

### 4. `CleanupAgent`
- **Rolle**: Datenbereinigung & Instant state maintenance.
- **Aufgaben**: Duplikate entfernen, Daten komprimieren, Logs aufräumen. Ensures zero-latency deletion of outdated analysis records, temporary clips, and orphaned Firestore entries without blocking UI prompts.
- **Regeln**: Keine aktiven Daten löschen, nur veraltete oder doppelte.

### 5. `MemoryAgent`
- **Rolle**: Datenkonsistenz, Archivierung & persistent data sync manager.
- **Aufgaben**: Archivieren, Strukturvalidierung, Synchronisation. Maintains long-term team memory, match history logs, video analysis annotations, and tactical presets across sessions.
- **Regeln**: Archivierte Daten schützen, Strukturfehler melden.

---

## System-Regeln
- Jeder Agent arbeitet nur in seinem zugewiesenen Bereich.
- **SupervisorAgent** entscheidet bei System- oder Daten-Konflikten.
- Keine Aktion ohne qualifizierte Operation/Function-Call.
- Fehler werden sofort an den **SupervisorAgent** gemeldet und isoliert.
- Große Datenmengen werden in Chunks verarbeitet.
- Tabellarische Ansichten nutzen saubere Pagination.
- Jede relevante Daten- oder Zustandsänderung wird lückenlos geloggt.


