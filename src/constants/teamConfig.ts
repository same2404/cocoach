export interface TeamPlayer {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  positions: string[];
  role: 'torwart' | 'abwehr' | 'mittelfeld' | 'sturm';
}

export interface TeamConfig {
  id: string;
  name: string;
  shortName: string;
  kit: {
    jersey: string;
    shorts: string;
    socks: string;
    goalkeeper: string;
    jerseySecondary?: string;
  };
  formation: string;
  players: TeamPlayer[];
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export const FC_AUGGEN: TeamConfig = {
  id: 'fc-auggen',
  name: 'FC Auggen',
  shortName: 'FCA',
  kit: {
    jersey: 'Rot',
    shorts: 'Schwarz',
    socks: 'Rot',
    goalkeeper: 'Gelb',
    jerseySecondary: 'Schwarz',
  },
  formation: '4-2-3-1',
  colors: {
    primary: '#DC2626',
    secondary: '#000000',
    accent: '#DC2626',
  },
  players: [
    { id: 'misic-luka', number: 1, firstName: 'Luka', lastName: 'Misic', positions: ['TW'], role: 'torwart' },
    { id: 'rufer-fabian', number: 50, firstName: 'Fabian', lastName: 'Rufer', positions: ['TW'], role: 'torwart' },

    { id: 'agbozo-jesse', number: 22, firstName: 'Jesse', lastName: 'Agbozo', positions: ['LV', 'IV'], role: 'abwehr' },
    { id: 'disch-maximilian', number: 21, firstName: 'Maximilian', lastName: 'Disch', positions: ['IV'], role: 'abwehr' },
    { id: 'fangmeier-jakob', number: 5, firstName: 'Jakob', lastName: 'Fangmeier', positions: ['IV'], role: 'abwehr' },
    { id: 'podlich-timm', number: 2, firstName: 'Timm', lastName: 'Podlich', positions: ['RV'], role: 'abwehr' },
    { id: 'reichert-lenny', number: 19, firstName: 'Lenny', lastName: 'Reichert', positions: ['LV', 'MF'], role: 'abwehr' },
    { id: 'reinecker-steffen', number: 13, firstName: 'Steffen', lastName: 'Reinecker', positions: ['IV'], role: 'abwehr' },
    { id: 'souleymane-said', number: 11, firstName: 'Said', lastName: 'Souleymané', positions: ['IV'], role: 'abwehr' },

    { id: 'bao-nguyen', number: 20, firstName: 'Nguyen Thai', lastName: 'Bao', positions: ['LM', 'RM'], role: 'mittelfeld' },
    { id: 'ehret-jonathan', number: 10, firstName: 'Jonathan', lastName: 'Ehret', positions: ['OM'], role: 'mittelfeld' },
    { id: 'ehret-julian', number: 11, firstName: 'Julian', lastName: 'Ehret', positions: ['ZM'], role: 'mittelfeld' },
    { id: 'ismaili-sabahudin', number: 19, firstName: 'Sabahudin', lastName: 'Ismaili', positions: ['ZDM', 'ZM'], role: 'mittelfeld' },
    { id: 'pereira-marques', number: 8, firstName: 'Francisco', lastName: 'Pereira Marques', positions: ['DM'], role: 'mittelfeld' },
    { id: 'roth-matti', number: 28, firstName: 'Matti', lastName: 'Roth', positions: ['ZDM', 'ZM'], role: 'mittelfeld' },
    { id: 'roth-yanik', number: 24, firstName: 'Yanik', lastName: 'Roth', positions: ['ZM', 'ZOM', 'LF', 'RF'], role: 'mittelfeld' },
    { id: 'scalici-giuliano', number: 8, firstName: 'Giuliano', lastName: 'Scalici', positions: ['ZM', 'ZOM', 'LF'], role: 'mittelfeld' },
    { id: 'schafer-tim', number: 17, firstName: 'Tim', lastName: 'Schäfer', positions: ['ZDM'], role: 'mittelfeld' },
    { id: 'valchuk-david', number: 17, firstName: 'David', lastName: 'Valchuk', positions: ['ZM'], role: 'mittelfeld' },

    { id: 'tiedemann-tim', number: 9, firstName: 'Tim', lastName: 'Tiedemann', positions: ['ST', 'ZOM', 'RM'], role: 'sturm' },
    { id: 'tschira-julien', number: 27, firstName: 'Julien', lastName: 'Tschira', positions: ['LM', 'LW'], role: 'sturm' },
    { id: 'akuegwu-jack', number: 11, firstName: 'Jack', lastName: 'Akuegwu', positions: ['ST'], role: 'sturm' },
    { id: 'ontuzans-daniels', number: 22, firstName: 'Daniels', lastName: 'Ontuzans', positions: ['LF'], role: 'sturm' },
  ],
};

export const DEFAULT_OPPONENT识别UNG = {
  method: 'jersey_color',
  description: 'Gegner wird anhand der Trikotfarbe automatisch erkannt',
  autoDetect: true,
};

export interface ActiCodeScene {
  id: string;
  startTime: number;
  endTime: number;
  type: 'aufbau' | 'pressing' | 'gegenpressing' | 'umschalt' | ' Standards' | 'torgefahr' | 'fehler' | 'spielzug' | 'rueckgewinnung' | 'durchbruch';
  confidence: number;
  description: string;
  involvedPlayers: string[];
  fieldZone: 'defensiv' | 'mittelfeld' | 'offensiv' | 'halbraum_links' | 'halbraum_rechts' | 'zentrum' | 'fluegel_links' | 'fluegel_rechts';
  outcome: 'erfolgreich' | 'teilweise' | 'fehlgeschlagen';
  coachingPoints: string[];
  rating: 1 | 2 | 3 | 4 | 5;
}

export interface ActiCodePlayerTrack {
  playerId: string;
  frame: number;
  x: number;
  y: number;
  speed: number;
  action: 'sprint' | 'laufen' | 'gehen' | 'stehen' | 'duell' | 'pass' | 'schuss' | 'kopfball' | 'pressing' | 'fallenlassen';
}

export interface ActiCodeTeamAnalysis {
  blockHeight: number;
  compactness: number;
  horizontalSpread: number;
  pressingIntensity: number;
  buildUpVariant: 'kurz' | 'lang' | 'mit_tw' | 'pressing_ausloesen' | 'gegenpressing';
  chanceQuality: number;
}

export interface ActiCodeResult {
  scenes: ActiCodeScene[];
  playerTracks: ActiCodePlayerTrack[];
  teamAnalysis: ActiCodeTeamAnalysis;
  recommendations: string[];
  matchRating: number;
}

export const ACTICODE_TASKS = {
  spielertracking: {
    name: 'Spielertracking',
    icon: '🏃',
    description: 'Position, Bewegung, Geschwindigkeit jedes Spielers in Echtzeit',
  },
  teamtracking: {
    name: 'Teamtracking',
    icon: '📐',
    description: 'Blockhöhe, Kompaktheit, Verschieben des gesamten Teams',
  },
  ereigniserkennung: {
    name: 'Ereigniserkennung',
    icon: '⚽',
    description: 'Pass, Dribbling, Ballverlust, Schuss, Pressing automatisch erkennen',
  },
  raumanalyse: {
    name: 'Raum- & Zonenanalyse',
    icon: '🗺️',
    description: 'Halbraum, Flügel, Zentrum — Raumkontrolle analysieren',
  },
  pressing_trigger: {
    name: 'Pressing-Trigger',
    icon: '🔥',
    description: 'Wann und wo wird Pressing ausgelöst? Automatische Erkennung',
  },
  aufbau: {
    name: 'Aufbauvarianten',
    icon: '🔄',
    description: 'Kurz, lang, mit TW, Pressing auslösen — Aufbau erkennen',
  },
  torchancen: {
    name: 'Torchancen',
    icon: '🥅',
    description: 'Alle Torchancen automatisch erkennen und bewerten',
  },
  fehler: {
    name: 'Fehlererkennung',
    icon: '⚠️',
    description: 'Positionsfehler, Timingfehler, Entscheidungsfehler',
  },
  empfehlungen: {
    name: 'Handlungsempfehlungen',
    icon: '💡',
    description: 'Automatisch erzeugte Empfehlungen für Trainer und Spieler',
  },
} as const;
