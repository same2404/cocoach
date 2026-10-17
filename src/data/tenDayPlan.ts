export interface TenDayPlanUnit {
  id: number;
  tag: string;
  date: string;
  dateIso: string;
  title: string;
  content: string;
  goal: string;
  type: 'Dauerlauf' | 'Intervall leicht' | 'Fahrtspiel' | 'Intervall intensiv' | 'Intervall' | 'Sprints / Explosivität';
  intensity: 'Niedrig (60-70%)' | 'Leicht (70-80%)' | 'Wechselnd (70-85%)' | 'Intensiv (80-90%)' | 'Maximal (90-100%)';
}

export const TEN_DAY_ACTIV_PLAN: TenDayPlanUnit[] = [
  {
    id: 1,
    tag: 'Tag 1',
    date: '17.06.2026',
    dateIso: '2026-06-17',
    title: 'Lockerer Dauerlauf',
    content: '35–45 Minuten locker (Plaudertempo).',
    goal: 'Grundlagenausdauer aktivieren, Körper vorbereiten.',
    type: 'Dauerlauf',
    intensity: 'Niedrig (60-70%)'
  },
  {
    id: 2,
    tag: 'Tag 2',
    date: '18.06.2026',
    dateIso: '2026-06-18',
    title: 'Intervall leicht',
    content: '15–20 min lockerer Lauf, 6–8 × 200m (70–80%), Pause: 1–2 Minuten gehen/traben zwischen den Intervallen, 15–20 min lockeres Auslaufen.',
    goal: 'Erste Intensitätsreize setzen.',
    type: 'Intervall leicht',
    intensity: 'Leicht (70-80%)'
  },
  {
    id: 3,
    tag: 'Tag 3',
    date: '22.06.2026',
    dateIso: '2026-06-22',
    title: 'Fahrtspiel',
    content: '30 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 4,
    tag: 'Tag 4',
    date: '23.06.2026',
    dateIso: '2026-06-23',
    title: 'Intervall intensiv',
    content: 'Einlaufen wie benötigt, 8–10 × 200m oder 5–6 × 400m (80–90%), 20 min locker Auslaufen.',
    goal: 'Spielnahe Ausdauer & Belastbarkeit.',
    type: 'Intervall intensiv',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 5,
    tag: 'Tag 5',
    date: '25.06.2026',
    dateIso: '2026-06-25',
    title: 'Fahrtspiel',
    content: '30 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 6,
    tag: 'Tag 6',
    date: '26.06.2026',
    dateIso: '2026-06-26',
    title: 'Intervall intensiv',
    content: 'Einlaufen wie benötigt, 8–10 × 200m oder 5–6 × 400m (80–90%), 20 min locker Auslaufen.',
    goal: 'Spielnahe Ausdauer & Belastbarkeit.',
    type: 'Intervall intensiv',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 7,
    tag: 'Tag 7',
    date: '29.06.2026',
    dateIso: '2026-06-29',
    title: 'Intervall',
    content: 'Locker einlaufen 25 min, 8–10 × 300m (80–90%), Pause: 2–3 Minuten gehen/traben.',
    goal: 'Laktat-Toleranz & Ausdauer.',
    type: 'Intervall',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 8,
    tag: 'Tag 8',
    date: '30.06.2026',
    dateIso: '2026-06-30',
    title: 'Sprints / Explosivität',
    content: 'Lockeres Einlaufen 20 min, 6–10 × 10–30m (volle Pause zwischen den Läufen), 25 min locker Auslaufen.',
    goal: 'Antritt, Explosivität, Spritzigkeit.',
    type: 'Sprints / Explosivität',
    intensity: 'Maximal (90-100%)'
  },
  {
    id: 9,
    tag: 'Tag 9',
    date: '01.07.2026',
    dateIso: '2026-07-01',
    title: 'Fahrtspiel',
    content: '50–60 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 10,
    tag: 'Tag 10',
    date: '03.07.2026',
    dateIso: '2026-07-03',
    title: 'Sprints / Explosivität',
    content: 'Lockeres Einlaufen 20 min, 6–10 × 10–30m (volle Pause zwischen den Läufen), 25 min locker Auslaufen.',
    goal: 'Antritt, Explosivität, Spritzigkeit.',
    type: 'Sprints / Explosivität',
    intensity: 'Maximal (90-100%)'
  }
];

export const TEN_DAY_ACTIV_RULES = {
  reihenfolge: 'Reihenfolge der Einheiten einhalten',
  ruhetage: 'Zwischen intensiven Tagen immer mindestens 1 Ruhetag',
  verletzungsprophylaxe: 'Locker heißt wirklich locker, Intensiv heißt sauber & mit Qualität (nicht völlig erschöpfen).',
  datenuebermittlung: 'Tracking über die Adidas Running App und Übermittlung an Co-Trainer/Athletik Klaus.'
};

// Wintervorbereitung / Eigenvorbereitung vor Trainingsstart (11.01. - 31.01.27)
export const TEN_DAY_ACTIV_PLAN_WINTER: TenDayPlanUnit[] = [
  {
    id: 1,
    tag: 'Tag 1',
    date: '11.01.27',
    dateIso: '2027-01-11',
    title: 'Lockerer Dauerlauf',
    content: '35–45 Minuten locker (Plaudertempo).',
    goal: 'Grundlagenausdauer aktivieren, Körper vorbereiten.',
    type: 'Dauerlauf',
    intensity: 'Niedrig (60-70%)'
  },
  {
    id: 2,
    tag: 'Tag 2',
    date: '12.01.27',
    dateIso: '2027-01-12',
    title: 'Intervall leicht',
    content: '15–20 min lockerer Lauf, 6–8 × 200 m (70–80%), Pause: zwischen den Intervallen 1–2 Minuten gehen/traben, 15–20 min locker Auslaufen.',
    goal: 'Erste Intensitätsreize setzen.',
    type: 'Intervall leicht',
    intensity: 'Leicht (70-80%)'
  },
  {
    id: 3,
    tag: 'Tag 3',
    date: '14.01.27',
    dateIso: '2027-01-14',
    title: 'Fahrtspiel',
    content: '30 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 4,
    tag: 'Tag 4',
    date: '16.01.27',
    dateIso: '2027-01-16',
    title: 'Intervall intensiv',
    content: 'Einlaufen wie benötigt, 8–10 × 200 m oder 5–6 × 400 m (80–90%), 20 min locker Auslaufen.',
    goal: 'Spielnahe Ausdauer & Belastbarkeit.',
    type: 'Intervall intensiv',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 5,
    tag: 'Tag 5',
    date: '19.01.27',
    dateIso: '2027-01-19',
    title: 'Fahrtspiel',
    content: '30 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 6,
    tag: 'Tag 6',
    date: '21.01.27',
    dateIso: '2027-01-21',
    title: 'Intervall intensiv',
    content: 'Einlaufen wie benötigt, 8–10 × 200 m oder 5–6 × 400 m (80–90%), 20 min locker Auslaufen.',
    goal: 'Spielnahe Ausdauer & Belastbarkeit.',
    type: 'Intervall intensiv',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 7,
    tag: 'Tag 7',
    date: '23.01.27',
    dateIso: '2027-01-23',
    title: 'Intervall',
    content: 'Locker einlaufen 25 min, 8–10 × 300 m (80–90%), Pause: 2–3 Minuten gehen/traben.',
    goal: 'Laktat-Toleranz & Ausdauer.',
    type: 'Intervall',
    intensity: 'Intensiv (80-90%)'
  },
  {
    id: 8,
    tag: 'Tag 8',
    date: '26.01.27',
    dateIso: '2027-01-26',
    title: 'Sprints / Explosivität',
    content: 'Lockeres Einlaufen 20 min, 6–10 × 10–30 m (volle Pause zwischen den Läufen), 25 min locker Auslaufen.',
    goal: 'Antritt, Explosivität, Spritzigkeit.',
    type: 'Sprints / Explosivität',
    intensity: 'Maximal (90-100%)'
  },
  {
    id: 9,
    tag: 'Tag 9',
    date: '28.01.27',
    dateIso: '2027-01-28',
    title: 'Fahrtspiel',
    content: '50–60 Minuten gesamt (Wechsel zwischen locker und schnell).',
    goal: 'Anpassung an wechselnde Belastungen im Spiel.',
    type: 'Fahrtspiel',
    intensity: 'Wechselnd (70-85%)'
  },
  {
    id: 10,
    tag: 'Tag 10',
    date: '30.01.27',
    dateIso: '2027-01-30',
    title: 'Sprints / Explosivität',
    content: 'Lockeres Einlaufen 20 min, 6–10 × 10–30 m (volle Pause zwischen den Läufen), 25 min locker Auslaufen.',
    goal: 'Antritt, Explosivität, Spritzigkeit.',
    type: 'Sprints / Explosivität',
    intensity: 'Maximal (90-100%)'
  }
];

export const TEN_DAY_ACTIV_RULES_WINTER = {
  reihenfolge: 'Reihenfolge der Einheiten einhalten – Einheiten nacheinander absolvieren (nicht tauschen).',
  ruhetage: 'Zwischen intensiven Tagen immer mindestens 1 Ruhetag.',
  verletzungsprophylaxe: 'Vor jeder Einheit 5–10 Minuten aufwärmen; zusätzlich 2–3x/Woche Core-Stabi und Sprunggelenk-/Knie-Stabilisation; nach der Belastung ausgiebig dehnen!',
  datenuebermittlung: 'Kontrolle vor Trainingsstart (31.01.27): alle Einheiten durchgeführt, Körper belastbar, keine akuten Beschwerden.'
};
