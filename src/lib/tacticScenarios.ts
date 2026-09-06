/**
 * 1:1 Taktik-Szenarien-Bank — FC Auggen
 *
 * Diese Bank enthält alle Spielsysteme und Standardsituationen exakt nach dem
 * Taktik-Material (Trainer-Vorgabe). Einheitlicher Koordinatenraum:
 *   - view 'full': ganzes Spielfeld, X 0-100 (links-rechts), Y 0-100 (Y=0 gegnerisches Tor oben, Y=100 eigenes Tor unten)
 *   - view 'half': eine Spielfeldhälfte, X 0-100, Y 0-100 (Y=0 = angegriffene Torlinie, Y=100 = Mittel-/Seitenlinie)
 *
 * Farben (INTERNE Diagramm-Farbcodes aus der Taktiktafel, NUR Anzeige):
 *   own = FC Auggen (Blau in Diagrammen), opp = Gegner (Rot), gk = Torwart (Grün)
 */

export type TacticView = 'full' | 'half';

export interface ScenarioPlayer {
  num: string;
  x: number;
  y: number;
  team: 'own' | 'opp' | 'gk';
  pos?: string;
}

export interface ScenarioZone {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Drehung in Grad (0 = horizontal) */
  angle?: number;
  color: string;
  label?: string;
  shape?: 'ellipse' | 'rect';
}

export interface ScenarioArrow {
  from: [number, number];
  to: [number, number];
  color?: string;
  /** solid = Ball/Pass, dashed = Lauf ohne Ball */
  style?: 'solid' | 'dashed';
  kind?: 'pass' | 'run' | 'block';
  tooltip?: string;
}

export interface TacticScenario {
  id: string;
  category: 'spielsystem' | 'standard';
  group: string;
  name: string;
  sub?: string;
  view: TacticView;
  /** Orientierung des Halbfelds: 'vertical' (Tor oben/unten) oder 'horizontal' (Tor links/rechts) */
  orientation?: 'vertical' | 'horizontal';
  players: ScenarioPlayer[];
  zones: ScenarioZone[];
  arrows: ScenarioArrow[];
  note?: string;
}

const OWN = '#3B82F6';
const OPP = '#EF4444';
const GK = '#22C55E';
const YELLOW = 'rgba(245,158,11,0.28)';
const ORANGE = 'rgba(249,115,22,0.28)';
const VIOLET = 'rgba(139,92,246,0.28)';
const ZONE_STROKE = 'rgba(255,255,255,0.55)';

/* ════════════════════════════════════════════════════════════════
   SPIELSYSTEME
   ════════════════════════════════════════════════════════════════ */

export const SPIELSYSTEME: TacticScenario[] = [
  {
    id: 'sys-433',
    category: 'spielsystem',
    group: '4-2-3-1',
    name: '4-3-3',
    sub: 'Startelf · Grundordnung · FC Auggen',
    view: 'full',
    note: '4-3-3 Grundordnung im Startelf-Look: Kette, drei zentrale Mittelfeldspieler, offensives Trio mit Mittelstürmer.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 12, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 65, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 88, y: 85, team: 'own' },
      { num: '6', pos: '6er', x: 40, y: 58, team: 'own' },
      { num: '8', pos: '8er', x: 58, y: 58, team: 'own' },
      { num: '10', pos: '10er', x: 50, y: 40, team: 'own' },
      { num: '11', pos: 'LA', x: 22, y: 28, team: 'own' },
      { num: '9', pos: 'ST', x: 50, y: 18, team: 'own' },
      { num: '7', pos: 'RA', x: 78, y: 28, team: 'own' },
    ],
    zones: [],
    arrows: [
      { from: [8, 96], to: [40, 58], color: '#93C5FD', style: 'solid', kind: 'pass', tooltip: 'Aufbau 6er' },
      { from: [50, 40], to: [50, 18], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Sturmspitze' },
    ],
  },
  {
    id: 'sys-4231',
    category: 'spielsystem',
    group: '4-2-3-1',
    name: '4-2-3-1',
    sub: 'Ausschnitt A · Normalstaffelung · Aufbauzone linker Halbraum',
    view: 'full',
    note: 'Doppel-6 (8er + 6er), 10er im freien Raum, Kette Y=85. Gelbe Aufbauzone links mit Flügelüberladung.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 12, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 65, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 88, y: 85, team: 'own' },
      { num: '6', pos: '6er', x: 40, y: 60, team: 'own' },
      { num: '8', pos: '8er', x: 58, y: 60, team: 'own' },
      { num: '11', pos: 'LA', x: 25, y: 30, team: 'own' },
      { num: '10', pos: '10er', x: 48, y: 28, team: 'own' },
      { num: '7', pos: 'RA', x: 72, y: 30, team: 'own' },
      { num: '9', pos: 'ST', x: 85, y: 18, team: 'own' },
      { num: '13', pos: 'IV', x: 98, y: 88, team: 'opp' },
      { num: '4', pos: 'IV', x: 98, y: 78, team: 'opp' },
      { num: '5', pos: 'IV', x: 98, y: 68, team: 'opp' },
    ],
    zones: [
      { cx: 30, cy: 55, rx: 11, ry: 7, color: YELLOW, label: 'Aufbauzone L' },
      { cx: 65, cy: 55, rx: 11, ry: 7, color: YELLOW, label: 'Aufbauzone R' },
    ],
    arrows: [
      { from: [8, 96], to: [30, 60], color: '#93C5FD', style: 'solid', kind: 'pass', tooltip: 'Aufbau 6er' },
      { from: [30, 60], to: [25, 30], color: '#93C5FD', style: 'dashed', kind: 'run', tooltip: 'Lauf LA' },
    ],
  },
  {
    id: 'sys-4231-press',
    category: 'spielsystem',
    group: '4-2-3-1',
    name: '4-2-3-1',
    sub: 'Ausschnitt B · Pressing',
    view: 'full',
    note: 'Aktive Pressingzone oben rechts, umschließt 2 Blaue + 2 Rote. Torwart stößt mit heraus (Grün gestrichelter Pfeil).',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 12, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 65, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 88, y: 85, team: 'own' },
      { num: '6', pos: '6er', x: 40, y: 60, team: 'own' },
      { num: '8', pos: '8er', x: 58, y: 60, team: 'own' },
      { num: '11', pos: 'LA', x: 25, y: 30, team: 'own' },
      { num: '10', pos: '10er', x: 48, y: 28, team: 'own' },
      { num: '7', pos: 'RA', x: 72, y: 30, team: 'own' },
      { num: '9', pos: 'ST', x: 85, y: 18, team: 'own' },
      { num: '14', pos: 'ST', x: 78, y: 20, team: 'opp' },
      { num: '15', pos: 'OM', x: 80, y: 30, team: 'opp' },
    ],
    zones: [
      { cx: 28, cy: 25, rx: 13, ry: 8, angle: 20, color: YELLOW, label: 'Pressingzone' },
      { cx: 65, cy: 55, rx: 11, ry: 7, color: YELLOW, label: 'Aufbauzone R' },
    ],
    arrows: [
      { from: [10, 45], to: [28, 25], color: GK, style: 'dashed', kind: 'run', tooltip: 'TW mitschieben' },
      { from: [25, 30], to: [28, 22], color: OWN, style: 'solid', kind: 'run', tooltip: 'Anlauf 11' },
    ],
  },
  {
    id: 'sys-442',
    category: 'spielsystem',
    group: '4-4-2',
    name: '4-4-2',
    sub: 'Ausschnitt A · Pressinglinie volle Breite · Überzahl Zentrum',
    view: 'full',
    note: 'Flache zweite Linie Y=70, Abwehrkette Y=85. Orange Überzahl-Zone zentral, gelbe vorderste Pressinglinie volle Breite.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 15, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 38, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 62, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 85, y: 85, team: 'own' },
      { num: '7', pos: 'RM', x: 15, y: 70, team: 'own' },
      { num: '8', pos: 'ZM', x: 38, y: 70, team: 'own' },
      { num: '6', pos: 'ZM', x: 62, y: 70, team: 'own' },
      { num: '11', pos: 'LM', x: 85, y: 70, team: 'own' },
      { num: '9', pos: 'ST', x: 40, y: 18, team: 'own' },
      { num: '10', pos: 'ST', x: 60, y: 18, team: 'own' },
    ],
    zones: [
      { cx: 50, cy: 15, rx: 40, ry: 6, color: YELLOW, label: 'Pressinglinie volle Breite' },
      { cx: 50, cy: 50, rx: 20, ry: 20, color: ORANGE, label: 'Überzahl Zentrum' },
    ],
    arrows: [
      { from: [40, 18], to: [40, 40], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Anlauf 9' },
      { from: [60, 18], to: [60, 40], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Anlauf 10' },
    ],
  },
  {
    id: 'sys-442-b',
    category: 'spielsystem',
    group: '4-4-2',
    name: '4-4-2',
    sub: 'Ausschnitt B · Standard-Staffelung · Sturmreihe/Dribbling',
    view: 'full',
    note: 'Zwei Viererreihen geschlossen, gelbe Sturm-/Dribbling-Zone unten. Gegner zieht an den Sechzehnern (rote gestrichelte Läufe).',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 15, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 38, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 62, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 85, y: 85, team: 'own' },
      { num: '7', pos: 'RM', x: 15, y: 70, team: 'own' },
      { num: '8', pos: 'ZM', x: 38, y: 70, team: 'own' },
      { num: '6', pos: 'ZM', x: 62, y: 70, team: 'own' },
      { num: '11', pos: 'LM', x: 85, y: 70, team: 'own' },
      { num: '9', pos: 'ST', x: 40, y: 18, team: 'own' },
      { num: '10', pos: 'ST', x: 60, y: 18, team: 'own' },
    ],
    zones: [
      { cx: 50, cy: 85, rx: 20, ry: 7, color: YELLOW, label: 'Sturm-/Dribbling-Zone' },
    ],
    arrows: [
      { from: [20, 95], to: [20, 60], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Gegnerlauf L' },
      { from: [80, 95], to: [80, 60], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Gegnerlauf R' },
    ],
  },
  {
    id: 'sys-343',
    category: 'spielsystem',
    group: '3-4-3',
    name: '3-4-3',
    sub: 'Ausschnitt A · Dreierkette · große zentrale Überzahlzone',
    view: 'full',
    note: '3er-Kette Y=85, 4er-Reihe Y=60 (Schienenspieler außen), 3 Angreifer Y=25. Große orange Überzahl-Zone zentral.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 50, y: 85, team: 'own' },
      { num: '6', pos: 'IV', x: 70, y: 85, team: 'own' },
      { num: '8', pos: 'Schiene', x: 20, y: 60, team: 'own' },
      { num: '3', pos: 'ZM', x: 40, y: 60, team: 'own' },
      { num: '7', pos: 'ZM', x: 60, y: 60, team: 'own' },
      { num: '9', pos: 'Schiene', x: 80, y: 60, team: 'own' },
      { num: '11', pos: 'LA', x: 30, y: 25, team: 'own' },
      { num: '10', pos: 'ST', x: 50, y: 25, team: 'own' },
      { num: '2', pos: 'RA', x: 70, y: 25, team: 'own' },
    ],
    zones: [
      { cx: 50, cy: 55, rx: 25, ry: 25, color: ORANGE, label: 'Überzahl Zentrum' },
    ],
    arrows: [],
  },
  {
    id: 'sys-343-b',
    category: 'spielsystem',
    group: '3-4-3',
    name: '3-4-3',
    sub: 'Ausschnitt B · Angriff über rechten Halbraum',
    view: 'full',
    note: 'Rote (Gegner-)Läufe im rechten Halbraum in drei Phasen: (65,65) → (75,45) → (85,25).',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 50, y: 85, team: 'own' },
      { num: '6', pos: 'IV', x: 70, y: 85, team: 'own' },
      { num: '8', pos: 'Schiene', x: 20, y: 60, team: 'own' },
      { num: '3', pos: 'ZM', x: 40, y: 60, team: 'own' },
      { num: '7', pos: 'ZM', x: 60, y: 60, team: 'own' },
      { num: '9', pos: 'Schiene', x: 80, y: 60, team: 'own' },
      { num: '11', pos: 'LA', x: 30, y: 25, team: 'own' },
      { num: '10', pos: 'ST', x: 50, y: 25, team: 'own' },
      { num: '2', pos: 'RA', x: 70, y: 25, team: 'own' },
    ],
    zones: [],
    arrows: [
      { from: [65, 65], to: [75, 45], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Phase 1' },
      { from: [75, 45], to: [85, 25], color: OPP, style: 'dashed', kind: 'run', tooltip: 'Phase 2' },
    ],
  },
  {
    id: 'sys-352',
    category: 'spielsystem',
    group: '3-5-2',
    name: '3-5-2',
    sub: 'Ausschnitt A · Fünferkette · kompletter Flügelkorridor links + rechts',
    view: 'full',
    note: '3er-Kette Y=85, 5er-Reihe Y=60 (10,30,50,70,90), 2 Stürmer Y=25. Orange Flügelkorridore vertikal über die volle Höhe.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 50, y: 85, team: 'own' },
      { num: '6', pos: 'IV', x: 70, y: 85, team: 'own' },
      { num: '8', pos: 'Schiene', x: 10, y: 60, team: 'own' },
      { num: '3', pos: 'ZM', x: 30, y: 60, team: 'own' },
      { num: '10', pos: '10er', x: 50, y: 60, team: 'own' },
      { num: '7', pos: 'ZM', x: 70, y: 60, team: 'own' },
      { num: '9', pos: 'Schiene', x: 90, y: 60, team: 'own' },
      { num: '2', pos: 'ST', x: 40, y: 25, team: 'own' },
      { num: '11', pos: 'ST', x: 60, y: 25, team: 'own' },
    ],
    zones: [
      { cx: 10, cy: 60, rx: 8, ry: 28, color: ORANGE, label: 'Flügelkorridor L' },
      { cx: 90, cy: 60, rx: 8, ry: 28, color: ORANGE, label: 'Flügelkorridor R' },
    ],
    arrows: [],
  },
  {
    id: 'sys-352-b',
    category: 'spielsystem',
    group: '3-5-2',
    name: '3-5-2',
    sub: 'Ausschnitt B · Pressinglinie 2 Stürmer + Mittelfeld',
    view: 'full',
    note: 'Gelbe Pressinglinie oben volle Breite. Blaue (eigene) Flügelläufe nach innen-vorne (15,55)→(10,80) u. (85,55)→(90,80).',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 50, y: 85, team: 'own' },
      { num: '6', pos: 'IV', x: 70, y: 85, team: 'own' },
      { num: '8', pos: 'Schiene', x: 10, y: 60, team: 'own' },
      { num: '3', pos: 'ZM', x: 30, y: 60, team: 'own' },
      { num: '10', pos: '10er', x: 50, y: 60, team: 'own' },
      { num: '7', pos: 'ZM', x: 70, y: 60, team: 'own' },
      { num: '9', pos: 'Schiene', x: 90, y: 60, team: 'own' },
      { num: '2', pos: 'ST', x: 40, y: 25, team: 'own' },
      { num: '11', pos: 'ST', x: 60, y: 25, team: 'own' },
    ],
    zones: [
      { cx: 50, cy: 15, rx: 30, ry: 6, color: YELLOW, label: 'Pressinglinie' },
    ],
    arrows: [
      { from: [15, 55], to: [10, 80], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Lauf Schiene L' },
      { from: [85, 55], to: [90, 80], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Lauf Schiene R' },
    ],
  },
  {
    id: 'sys-352-c',
    category: 'spielsystem',
    group: '3-5-2',
    name: '3-5-2',
    sub: 'Ausschnitt C · Dribbling-Angriffszone linker Halbraum',
    view: 'full',
    note: 'Gelbe Dribbling-Angriffszone im linken Halbraum (25,80).',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 50, y: 85, team: 'own' },
      { num: '6', pos: 'IV', x: 70, y: 85, team: 'own' },
      { num: '8', pos: 'Schiene', x: 10, y: 60, team: 'own' },
      { num: '3', pos: 'ZM', x: 30, y: 60, team: 'own' },
      { num: '10', pos: '10er', x: 50, y: 60, team: 'own' },
      { num: '7', pos: 'ZM', x: 70, y: 60, team: 'own' },
      { num: '9', pos: 'Schiene', x: 90, y: 60, team: 'own' },
      { num: '2', pos: 'ST', x: 40, y: 25, team: 'own' },
      { num: '11', pos: 'ST', x: 60, y: 25, team: 'own' },
    ],
    zones: [
      { cx: 25, cy: 80, rx: 15, ry: 8, color: YELLOW, label: 'Dribbling-Zone L' },
    ],
    arrows: [],
  },
];

/* ════════════════════════════════════════════════════════════════
   STANDARDSITUATIONEN (entfernt auf Wunsch — Stand Sep 2026)
   ════════════════════════════════════════════════════════════════ */

export const STANDARDS: TacticScenario[] = [];

/* ════════════════════════════════════════════════════════════════
   FOLIEN-DIAGRAMME (aus den PNG-Schautafeln gelesen, ohne Namen/Wappen)
   ════════════════════════════════════════════════════════════════ */
export const FOLIEN_DIAGRAMME: TacticScenario[] = [
  {
    id: 'f-r1',
    category: 'standard',
    group: 'Rotation Spielaufbau',
    name: 'Rotation · Bild 1',
    sub: 'Intervalle 1',
    view: 'full',
    note: 'Aus Diagramm gelesen: Blaue eigene Rotation mit gelber Zone oben rechts, rote Gegner, grüner Torwart.',
    players: [
      { num: '1', pos: 'TW', x: 50.4, y: 93, team: 'gk' },
      { num: '2', x: 15.1, y: 49.9, team: 'own' },
      { num: '4', x: 42.3, y: 19.5, team: 'own' },
      { num: '5', x: 58.9, y: 20.4, team: 'own' },
      { num: '3', x: 83.2, y: 24.5, team: 'own' },
      { num: '6', x: 24.3, y: 22, team: 'own' },
      { num: '8', x: 40, y: 37.5, team: 'own' },
      { num: '7', x: 57.7, y: 40.3, team: 'own' },
      { num: '10', x: 49.6, y: 54, team: 'own' },
      { num: '11', x: 50.5, y: 68, team: 'own' },
      { num: '9', x: 81.3, y: 51.4, team: 'own' },
      { num: '21', x: 12.9, y: 29.8, team: 'opp' },
      { num: '22', x: 49.2, y: 25.2, team: 'opp' },
      { num: '23', x: 88.5, y: 30.1, team: 'opp' },
      { num: '24', x: 41.6, y: 42.9, team: 'opp' },
      { num: '25', x: 61.1, y: 45, team: 'opp' },
      { num: '26', x: 49.3, y: 59.4, team: 'opp' },
      { num: '27', x: 12.1, y: 63.7, team: 'opp' },
      { num: '28', x: 36, y: 72.9, team: 'opp' },
      { num: '29', x: 66.4, y: 72.2, team: 'opp' },
      { num: '30', x: 85.9, y: 58.7, team: 'opp' },
    ],
    zones: [
      { cx: 69.7, cy: 36.6, rx: 8.5, ry: 6.8, color: YELLOW, label: 'Rotations-Zone' },
    ],
    arrows: [
      { from: [50.4, 93], to: [24.3, 22], color: GK, style: 'dashed', kind: 'run', tooltip: 'Aufbau' },
      { from: [24.3, 22], to: [42.3, 19.5], color: OWN, style: 'solid', kind: 'pass', tooltip: 'Pass' },
    ],
  },
  {
    id: 'f-r2',
    category: 'standard',
    group: 'Rotation Spielaufbau',
    name: 'Rotation · Bild 2',
    sub: 'Intervalle 2',
    view: 'full',
    note: 'Aus Diagramm gelesen: Rot als eigene Mannschaft, große gelbe Angriffszone oben, orange Zentrums-Zone.',
    players: [
      { num: '1', pos: 'TW', x: 50.1, y: 91.9, team: 'gk' },
      { num: '2', x: 7.8, y: 77.5, team: 'own' },
      { num: '3', x: 49.2, y: 48.8, team: 'own' },
      { num: '4', x: 32.5, y: 57, team: 'own' },
      { num: '5', x: 68.4, y: 57, team: 'own' },
      { num: '6', x: 12.2, y: 49.5, team: 'own' },
      { num: '7', x: 89.9, y: 49.7, team: 'own' },
      { num: '8', x: 51.1, y: 67.7, team: 'own' },
      { num: '9', x: 87.9, y: 66.4, team: 'own' },
      { num: '10', x: 66.4, y: 81.3, team: 'own' },
      { num: '11', x: 35.5, y: 82, team: 'own' },
    ],
    zones: [
      { cx: 50.5, cy: 21.1, rx: 16, ry: 14, color: YELLOW, label: 'Angriffszone' },
      { cx: 49.5, cy: 56.8, rx: 5, ry: 5, color: ORANGE, label: 'Zentrum' },
    ],
    arrows: [],
  },
  {
    id: 'f-d1',
    category: 'standard',
    group: 'Dreiecks-Rotation',
    name: 'Dreiecks-Rotation · Bild 1',
    sub: 'Intervalle 1',
    view: 'full',
    note: 'Aus Diagramm gelesen: Dreiecksbildung mit gelber Zone rechts, blaue eigene, rote Gegner.',
    players: [
      { num: '1', pos: 'TW', x: 50.7, y: 93.8, team: 'gk' },
      { num: '2', x: 14.6, y: 51.6, team: 'own' },
      { num: '4', x: 42.5, y: 22.1, team: 'own' },
      { num: '5', x: 59.4, y: 22.9, team: 'own' },
      { num: '3', x: 84.6, y: 52.2, team: 'own' },
      { num: '6', x: 24, y: 24.4, team: 'own' },
      { num: '8', x: 40.1, y: 39.5, team: 'own' },
      { num: '7', x: 62.5, y: 39.8, team: 'own' },
      { num: '10', x: 50.8, y: 56.2, team: 'own' },
      { num: '11', x: 50.8, y: 69.3, team: 'own' },
      { num: '9', x: 84.2, y: 27, team: 'own' },
      { num: '21', x: 12.4, y: 32.1, team: 'opp' },
      { num: '22', x: 49.5, y: 27.6, team: 'opp' },
      { num: '23', x: 89.3, y: 33.4, team: 'opp' },
      { num: '24', x: 41.7, y: 44.9, team: 'opp' },
      { num: '25', x: 64.2, y: 44.9, team: 'opp' },
      { num: '26', x: 51.1, y: 61.5, team: 'opp' },
      { num: '27', x: 11.6, y: 65.1, team: 'opp' },
      { num: '28', x: 35.9, y: 74, team: 'opp' },
      { num: '29', x: 67, y: 73.4, team: 'opp' },
      { num: '30', x: 91.4, y: 55.9, team: 'opp' },
    ],
    zones: [
      { cx: 73.7, cy: 37.7, rx: 7.8, ry: 6, color: YELLOW, label: 'Dreiecks-Zone' },
    ],
    arrows: [
      { from: [40.1, 39.5], to: [50.8, 56.2], color: OWN, style: 'solid', kind: 'pass', tooltip: 'Dreieck' },
      { from: [50.8, 56.2], to: [62.5, 39.8], color: OWN, style: 'solid', kind: 'pass', tooltip: 'Dreieck' },
    ],
  },
  {
    id: 'f-d2',
    category: 'standard',
    group: 'Dreiecks-Rotation',
    name: 'Dreiecks-Rotation · Bild 2',
    sub: 'Intervalle 2',
    view: 'full',
    note: 'Aus Diagramm gelesen: Dreiecks-Rotation mit gelber Zone, blaue eigene, rote Gegner.',
    players: [
      { num: '1', pos: 'TW', x: 49.6, y: 93.9, team: 'gk' },
      { num: '2', x: 14.5, y: 53.7, team: 'own' },
      { num: '4', x: 41.6, y: 25.6, team: 'own' },
      { num: '5', x: 58.1, y: 26.5, team: 'own' },
      { num: '3', x: 86.2, y: 41.8, team: 'own' },
      { num: '6', x: 23.7, y: 27.8, team: 'own' },
      { num: '8', x: 39.3, y: 42.2, team: 'own' },
      { num: '7', x: 82.5, y: 58.9, team: 'own' },
      { num: '10', x: 49.7, y: 58.1, team: 'own' },
      { num: '11', x: 49.7, y: 70.5, team: 'own' },
      { num: '9', x: 79.9, y: 34.9, team: 'own' },
      { num: '21', x: 12.3, y: 35.2, team: 'opp' },
      { num: '22', x: 48.5, y: 30.9, team: 'opp' },
      { num: '23', x: 90.1, y: 34.8, team: 'opp' },
      { num: '24', x: 40.9, y: 47.3, team: 'opp' },
      { num: '25', x: 75.7, y: 40.8, team: 'opp' },
      { num: '26', x: 50, y: 63.1, team: 'opp' },
      { num: '27', x: 11.6, y: 66.6, team: 'opp' },
      { num: '28', x: 35.2, y: 75.1, team: 'opp' },
      { num: '29', x: 65.6, y: 73.8, team: 'opp' },
      { num: '30', x: 83.2, y: 63.1, team: 'opp' },
    ],
    zones: [
      { cx: 71.7, cy: 40.4, rx: 7.8, ry: 6, color: YELLOW, label: 'Dreiecks-Zone' },
    ],
    arrows: [],
  },
  {
    id: 'f-mb',
    category: 'standard',
    group: 'Mit Ball',
    name: 'Mit Ball · Spielaufbau',
    sub: 'Spielaufbau · Dreiecksbildung',
    view: 'full',
    note: 'Spielaufbau: 8er-Raum finden, kurze Optionen, Dreiecksbildung. Gelbe Zonen = Angebotsflächen.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 12, y: 85, team: 'own' },
      { num: '4', pos: 'IV', x: 30, y: 85, team: 'own' },
      { num: '5', pos: 'IV', x: 65, y: 85, team: 'own' },
      { num: '3', pos: 'LV', x: 88, y: 85, team: 'own' },
      { num: '6', pos: '6er', x: 40, y: 60, team: 'own' },
      { num: '8', pos: '8er', x: 58, y: 60, team: 'own' },
      { num: '10', pos: '10er', x: 50, y: 40, team: 'own' },
      { num: '11', pos: 'LA', x: 22, y: 30, team: 'own' },
      { num: '9', pos: 'ST', x: 50, y: 18, team: 'own' },
      { num: '7', pos: 'RA', x: 78, y: 30, team: 'own' },
      { num: '21', pos: 'DM', x: 50, y: 70, team: 'opp' },
      { num: '22', pos: 'IV', x: 30, y: 62, team: 'opp' },
      { num: '23', pos: 'IV', x: 70, y: 62, team: 'opp' },
    ],
    zones: [
      { cx: 55, cy: 55, rx: 12, ry: 8, color: YELLOW, label: '8er-Raum' },
      { cx: 25, cy: 42, rx: 10, ry: 7, color: YELLOW, label: 'Halbraum L' },
      { cx: 75, cy: 42, rx: 10, ry: 7, color: YELLOW, label: 'Halbraum R' },
    ],
    arrows: [
      { from: [40, 60], to: [58, 60], color: OWN, style: 'solid', kind: 'pass', tooltip: 'Doppelpass 6er ↔ 8er' },
      { from: [50, 40], to: [50, 18], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Tiefer Lauf ST' },
    ],
  },
  {
    id: 'f-gb',
    category: 'standard',
    group: 'Gegen Ball',
    name: 'Gegen Ball · Pressing',
    sub: 'Pressing auslösen · Außen lenken',
    view: 'full',
    note: 'Gegen den Ball: anlaufen und nach außen lenken, kompakt im Zentrum, kleines Gegenpressing.',
    players: [
      { num: '1', pos: 'TW', x: 50, y: 97, team: 'gk' },
      { num: '2', pos: 'RV', x: 14, y: 72, team: 'own' },
      { num: '4', pos: 'IV', x: 32, y: 74, team: 'own' },
      { num: '5', pos: 'IV', x: 68, y: 74, team: 'own' },
      { num: '3', pos: 'LV', x: 86, y: 72, team: 'own' },
      { num: '6', pos: '6er', x: 40, y: 50, team: 'own' },
      { num: '8', pos: '8er', x: 60, y: 50, team: 'own' },
      { num: '11', pos: 'RA', x: 20, y: 32, team: 'own' },
      { num: '10', pos: 'OM', x: 50, y: 30, team: 'own' },
      { num: '7', pos: 'LA', x: 80, y: 32, team: 'own' },
      { num: '9', pos: 'ST', x: 50, y: 16, team: 'own' },
      { num: '21', pos: 'DV', x: 50, y: 62, team: 'opp' },
      { num: '22', pos: 'IV', x: 30, y: 66, team: 'opp' },
      { num: '23', pos: 'IV', x: 70, y: 66, team: 'opp' },
      { num: '24', pos: 'DM', x: 50, y: 78, team: 'opp' },
      { num: '25', pos: 'RV', x: 14, y: 82, team: 'opp' },
      { num: '26', pos: 'LV', x: 86, y: 82, team: 'opp' },
    ],
    zones: [
      { cx: 50, cy: 42, rx: 16, ry: 8, angle: 6, color: ORANGE, label: 'Pressing auslösen' },
      { cx: 70, cy: 60, rx: 10, ry: 7, color: YELLOW, label: 'Leite raus' },
      { cx: 30, cy: 60, rx: 10, ry: 7, color: YELLOW, label: 'Leite raus' },
      { cx: 50, cy: 88, rx: 22, ry: 6, color: 'rgba(104,211,145,0.28)', label: 'Tiefensicherung' },
    ],
    arrows: [
      { from: [80, 32], to: [86, 82], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Anlauf LA' },
      { from: [60, 50], to: [50, 78], color: OWN, style: 'dashed', kind: 'run', tooltip: 'Doppeln auf DM' },
      { from: [50, 50], to: [50, 40], color: OPP, style: 'solid', kind: 'pass', tooltip: 'Pass lenken' },
    ],
  },
];

export const SCENARIO_GROUP_ORDER = [
  '4-2-3-1',
  '4-4-2',
  '3-4-3',
  '3-5-2',
  'Rotation Spielaufbau',
  'Dreiecks-Rotation',
  'Mit Ball',
  'Gegen Ball',
];

export const ALL_SCENARIOS: TacticScenario[] = [...SPIELSYSTEME, ...STANDARDS, ...FOLIEN_DIAGRAMME];
