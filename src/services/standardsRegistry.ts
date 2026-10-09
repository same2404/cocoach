/**
 * Standards-Registry (NEU)
 * ══════════════════════════════════════════════════════════════════════════════
 * Vollständiger Neuaufbau. Alte Inhalte aus `set_pieces` und
 * `localStorage['fc_auggen_set_pieces_v2']` werden NICHT mehr gelesen.
 *
 * Single Source of Truth = `match_analyses` (Spielberichte).
 * Diese Registry ist ein abgeleiteter, jederzeit neu generierbarer Index.
 *
 * Bilder: Die KI kann keine Bilder lesen. Deshalb werden Bilder als
 * REFERENZEN gespeichert (analysisId + Feld + Index) und nicht als Blob
 * kopiert. Die Base64 bleibt genau einmal im Spielbericht – spart Speicher,
 * bleibt dauerhaft abrufbar und erlaubt exaktes Zurücklesen.
 */

export type StandardSide = 'own' | 'opponent';
export type StandardMatchType = 'pflicht' | 'test' | 'u23';

/** Verweis auf ein Bild im Spielbericht – kein Bildinhalt, nur Adressierung. */
export interface StandardImageRef {
  /** Eindeutige Bild-ID innerhalb des Spiels: `${analysisId}__${field}__${index}` */
  imageId: string;
  /** Ursprungs-Spielbericht */
  analysisId: string;
  /** Feldname im Spielbericht, z. B. `standardsOwnImages` */
  field: string;
  /** Position im Bild-Array */
  index: number;
  /** Anzeigename der Bildergruppe */
  groupLabel: string;
  /** Kurzform des Datentyps – Base64, URL oder Blob */
  kind: 'base64' | 'url' | 'blob';
  /** Byte-Länge des Bildes (base64) bzw. 0 bei URL */
  byteSize: number;
}

export interface StandardEntry {
  /** Deterministische ID: `${analysisId}__${side}` → deterministisch, kein Zufall */
  id: string;
  analysisId: string;
  matchId: string;
  matchType: StandardMatchType;
  matchDate: string;
  opponent: string;
  isHome?: boolean;
  result?: string;
  side: StandardSide;

  /** Standard-Text aus dem Spielbericht */
  text: string;
  /** Erkannte Standard-Arten (ecke / freistoss / einwurf / elfmeter / abstoß) */
  detectedTypes: string[];
  /** Referenzen auf ALLE Bilder des Spielberichts, nach Gruppe getrennt */
  imageRefs: StandardImageRef[];
  /** Referenzen nur der standard-spezifischen Bilder dieser Seite */
  standardImageRefs: StandardImageRef[];

  /** Prüfsumme des Inhalts – verhindert unnötige Writes und erkennt Änderungen */
  contentHash: string;
  generatedAt: string;
  /** Schema-Version, damit spätere Umbauten erkennbar bleiben */
  schemaVersion: number;
}

const SCHEMA_VERSION = 1;

/** Textfeld + Bildfeld + Anzeigename pro Spielbericht-Feld */
const FIELD_MAP: Array<{
  field: string;
  groupLabel: string;
  side: StandardSide;
  isStandard: boolean;
  textField?: string;
}> = [
  { field: 'standardsOwnImages', groupLabel: 'Standards Offensiv', side: 'own', isStandard: true, textField: 'standardsOwn' },
  { field: 'standardsOpponentImages', groupLabel: 'Standards Defensiv', side: 'opponent', isStandard: true, textField: 'standardsOpponent' },
  { field: 'lineupImages', groupLabel: 'Aufstellung', side: 'own', isStandard: false },
  { field: 'openingPlayImages', groupLabel: 'Spielaufbau', side: 'own', isStandard: false },
  { field: 'transitionOffensiveImages', groupLabel: 'Umspiel Offensiv', side: 'own', isStandard: false },
  { field: 'transitionDefensiveImages', groupLabel: 'Umspel Defensiv', side: 'opponent', isStandard: false },
  { field: 'goalChancesOwnImages', groupLabel: 'Torchancen Offensiv', side: 'own', isStandard: false },
  { field: 'goalChancesOpponentImages', groupLabel: 'Torchancen Gegner', side: 'opponent', isStandard: false },
  { field: 'trainerGoodImages', groupLabel: 'Trainer Positiv', side: 'own', isStandard: false },
  { field: 'trainerBadImages', groupLabel: 'Trainer Negativ', side: 'opponent', isStandard: false },
  { field: 'trainerFazitImages', groupLabel: 'Fazit', side: 'own', isStandard: false },
  { field: 'presentationImages', groupLabel: 'Präsentation', side: 'own', isStandard: false },
];

/** Alleinstehendes Altbild-Feld (String statt Array). */
const LEGACY_LINEUP_IMAGE = 'lineupImage';

/** Erkennung der Standard-Arten aus dem Text. */
const TYPE_PATTERNS: Array<[RegExp, string]> = [
  [/ecke|corner/i, 'Ecke'],
  [/freistoß|freistoss|free.?kick/i, 'Freistoß'],
  [/elfmeter|penalty/i, 'Elfmeter'],
  [/einwurf/i, 'Einwurf'],
  [/abstoß|abstoss/i, 'Abstoß'],
];

export function detectStandardTypes(text: string): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const [pattern, label] of TYPE_PATTERNS) {
    if (pattern.test(text) && !found.includes(label)) found.push(label);
  }
  return found;
}

/** djb2 – kurz, deterministisch, ausreichend für Änderungserkennung. */
function hashString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

/** Bild-URLs/Base64 → Referenz. Inhalt wird bewusst NICHT kopiert. */
function toImageRef(
  analysisId: string,
  field: string,
  index: number,
  groupLabel: string,
  raw: unknown
): StandardImageRef | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const isBase64 = raw.startsWith('data:');
  const isBlob = raw.startsWith('blob:');
  const byteSize = isBase64
    ? Math.max(0, Math.floor((raw.length - (raw.indexOf(',') + 1)) * 0.75))
    : 0;
  return {
    imageId: `${analysisId}__${field}__${index}`,
    analysisId,
    field,
    index,
    groupLabel,
    kind: isBase64 ? 'base64' : isBlob ? 'blob' : 'url',
    byteSize,
  };
}

/**
 * Ermittelt den Spieltyp aus dem Spielbericht.
 * Reihenfolge: `category` → ID-Abgleich mit Pflicht/Test/U23-Spielen → Default.
 */
export function resolveMatchType(
  analysis: any,
  ids: { competitive?: Set<string>; test?: Set<string>; u23?: Set<string> }
): StandardMatchType {
  const cat = String(analysis?.category || '').toLowerCase();
  if (cat.includes('test')) return 'test';
  if (cat.includes('u23') || cat.includes('u 23')) return 'u23';
  if (cat.includes('pflicht') || cat.includes('pokal')) return 'pflicht';

  const matchId = String(analysis?.matchId || analysis?.id || '');
  if (ids.u23?.has(matchId)) return 'u23';
  if (ids.test?.has(matchId)) return 'test';
  if (ids.competitive?.has(matchId)) return 'pflicht';
  return 'pflicht';
}

/**
 * Erzeugt alle Standard-Einträge eines Spielberichts (einer pro Seite).
 * Wird bei jeder Änderung des Spielberichts erneut ausgeführt.
 */
export function buildStandardsForAnalysis(
  analysis: any,
  matchTypeIds: { competitive?: Set<string>; test?: Set<string>; u23?: Set<string> } = {}
): StandardEntry[] {
  if (!analysis || !analysis.id) return [];
  const analysisId = String(analysis.id);
  const matchType = resolveMatchType(analysis, matchTypeIds);

  // ALLE Bilder des Spielberichts einsammeln – nicht nur die Standard-Bilder.
  const allRefs: StandardImageRef[] = [];
  for (const entry of FIELD_MAP) {
    const arr = analysis[entry.field];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const ref = toImageRef(analysisId, entry.field, i, entry.groupLabel, arr[i]);
      if (ref) allRefs.push(ref);
    }
  }
  if (typeof analysis[LEGACY_LINEUP_IMAGE] === 'string' && analysis[LEGACY_LINEUP_IMAGE].trim()) {
    const ref = toImageRef(analysisId, LEGACY_LINEUP_IMAGE, 0, 'Aufstellung', analysis[LEGACY_LINEUP_IMAGE]);
    if (ref) allRefs.push(ref);
  }

  const sides: StandardSide[] = ['own', 'opponent'];
  const generatedAt = new Date().toISOString();

  return sides.map(side => {
    const textField = FIELD_MAP.find(f => f.side === side && f.isStandard)?.textField || '';
    const text = String(analysis[textField] || '').trim();
    const standardRefs = allRefs.filter(
      r => FIELD_MAP.some(f => f.field === r.field && f.side === side && f.isStandard)
    );

    const id = `${analysisId}__${side}`;
    const contentHash = hashString(
      [
        analysisId,
        String(analysis.matchId || ''),
        matchType,
        text,
        ...allRefs.map(r => `${r.imageId}:${r.kind}:${r.byteSize}`),
        ...standardRefs.map(r => `${r.imageId}:${r.kind}:${r.byteSize}`),
      ].join('|')
    );

    return {
      id,
      analysisId,
      matchId: String(analysis.matchId || analysisId),
      matchType,
      matchDate: String(analysis.date || ''),
      opponent: String(analysis.opponent || 'Gegner'),
      isHome: analysis.isHome,
      result: analysis.result ? String(analysis.result) : undefined,
      side,
      text,
      detectedTypes: detectStandardTypes(text),
      imageRefs: allRefs,
      standardImageRefs: standardRefs,
      contentHash,
      generatedAt,
      schemaVersion: SCHEMA_VERSION,
    };
  });
}

/**
 * Baut den kompletten Registry-Stand aus allen Spielberichten.
 * Deterministisch: gleiche Eingabe → gleiches Ergebnis.
 */
export function buildStandardsRegistry(
  analyses: any[],
  matchLists: {
    competitiveMatches?: any[];
    testMatches?: any[];
    u23Matches?: any[];
  } = {}
): StandardEntry[] {
  const idSet = (rows?: any[]) =>
    new Set((rows || []).map(r => String(r?.id)).filter(Boolean));

  const matchTypeIds = {
    competitive: idSet(matchLists.competitiveMatches),
    test: idSet(matchLists.testMatches),
    u23: idSet(matchLists.u23Matches),
  };

  const out: StandardEntry[] = [];
  for (const analysis of analyses || []) {
    out.push(...buildStandardsForAnalysis(analysis, matchTypeIds));
  }
  return out;
}

/**
 * Löst eine Bild-Referenz wieder zum echten Bild auf.
 * `analysesById` = Index der Spielberichte (siehe `indexAnalysesById`).
 */
export function resolveImageRef(
  ref: StandardImageRef,
  analysesById: Record<string, any>
): string | null {
  if (!ref || !analysesById) return null;
  const analysis = analysesById[ref.analysisId];
  if (!analysis) return null;

  if (ref.field === LEGACY_LINEUP_IMAGE) {
    const v = analysis[LEGACY_LINEUP_IMAGE];
    return typeof v === 'string' && v.trim() ? v : null;
  }
  const arr = analysis[ref.field];
  if (!Array.isArray(arr)) return null;
  const v = arr[ref.index];
  return typeof v === 'string' && v.trim() ? v : null;
}

export function indexAnalysesById(analyses: any[]): Record<string, any> {
  const acc: Record<string, any> = {};
  for (const a of analyses || []) {
    if (a?.id) acc[String(a.id)] = a;
  }
  return acc;
}

/** Anzeigename für einen Registry-Eintrag. */
export function describeStandard(entry: StandardEntry): string {
  const type = entry.matchType === 'pflicht' ? 'Pflichtspiel' : entry.matchType === 'test' ? 'Testspiel' : 'U23';
  const side = entry.side === 'own' ? 'Offensiv' : 'Defensiv';
  return `${type} · ${entry.matchDate || 'ohne Datum'} · ${entry.opponent} · ${side}`;
}
