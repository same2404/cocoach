export interface QualityCheckResult {
  score: number;
  flags: string[];
  passed: boolean;
  cleanedText: string;
}

const HALLUCINATION_PATTERNS = [
  /ich habe (gesehen|beobachtet|analyiert)/i,
  /laut meinen (daten|informationen|aufzeichnungen)/i,
  /das video zeigt/i,
  /in der (37|45|67|78)\. minute/i,
];

const LOW_QUALITY_PATTERNS = [
  /\b(keine ahnung|weiß nicht|kann ich nicht|unbekannt)\b/i,
  /\b(error|fehler|undefined|null)\b/i,
  /\.{3,}/,
  /(.{20,})\1{2,}/,
];

const PROFANITY_HINTS = [
  /\b(scheiße|verdammt|mist|kacke)\b/i,
];

const BIAS_PATTERNS = [
  /immer (schlecht|schwach|mies)/i,
  /niemals (gut|stark|brauchbar)/i,
  /(alle|keiner) (spieler|mannschaft)/i,
];

const cleanText = (text: string): string => {
  let cleaned = text;
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/(.)\1{4,}/g, '$1$1$1');
  cleaned = cleaned.replace(/https?:\/\/\S+/g, '[Link entfernt]');
  cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[E-Mail entfernt]');
  return cleaned;
};

const checkHallucinations = (text: string): string[] => {
  const flags: string[] = [];
  HALLUCINATION_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) flags.push('Mögliche Halluzination erkannt');
  });
  return flags;
};

const checkQuality = (text: string): string[] => {
  const flags: string[] = [];
  if (text.length < 20) flags.push('Zu kurz');
  if (text.length > 5000) flags.push('Zu lang');
  LOW_QUALITY_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) flags.push('Niedrige Qualität');
  });
  return flags;
};

const checkBias = (text: string): string[] => {
  const flags: string[] = [];
  BIAS_PATTERNS.forEach(pattern => {
    if (pattern.test(text)) flags.push('Mögliche Verzerrung');
  });
  return flags;
};

const checkProfanity = (text: string): string[] => {
  const flags: string[] = [];
  PROFANITY_HINTS.forEach(pattern => {
    if (pattern.test(text)) flags.push('Unangemessener Inhalt');
  });
  return flags;
};

export const filterAIOutput = (text: string): QualityCheckResult => {
  const cleaned = cleanText(text);
  const allFlags = [
    ...checkHallucinations(cleaned),
    ...checkQuality(cleaned),
    ...checkBias(cleaned),
    ...checkProfanity(cleaned),
  ];

  const uniqueFlags = [...new Set(allFlags)];
  const score = Math.max(0, 100 - uniqueFlags.length * 20);

  return {
    score,
    flags: uniqueFlags,
    passed: score >= 60 && uniqueFlags.length <= 2,
    cleanedText: cleaned,
  };
};

export const getQualityColor = (score: number): string => {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#F59E0B';
  if (score >= 40) return '#F97316';
  return '#EF4444';
};

export const getQualityLabel = (score: number): string => {
  if (score >= 80) return 'Ausgezeichnet';
  if (score >= 60) return 'Gut';
  if (score >= 40) return 'Befriedigend';
  return 'Schlecht';
};
