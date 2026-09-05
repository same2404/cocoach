export interface StructuredAnalysis {
  type: 'formation' | 'player' | 'tactical' | 'statistical' | 'narrative';
  data: any;
  confidence: number;
  timestamp: number;
}

export interface ParsedFormation {
  name: string;
  players: Array<{
    number?: number;
    name: string;
    position: string;
    role: string;
  }>;
}

export interface ParsedPlayerAnalysis {
  playerName: string;
  number?: number;
  position: string;
  metrics: Record<string, number | string>;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
}

export interface ParsedTacticalAnalysis {
  phase: string;
  description: string;
  keyMoments: Array<{
    time: string;
    event: string;
    impact: 'positive' | 'negative' | 'neutral';
  }>;
  suggestions: string[];
}

export const extractJSON = <T = any>(text: string): T | null => {
  const patterns = [
    /```json\s*([\s\S]*?)\s*```/,
    /```\s*([\s\S]*?)\s*```/,
    /\{[\s\S]*\}/,
    /\[[\s\S]*\]/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        return JSON.parse(jsonStr) as T;
      } catch (e) {
        continue;
      }
    }
  }
  return null;
};

export const parseFormation = (aiResponse: string): ParsedFormation | null => {
  const json = extractJSON<Record<string, any>>(aiResponse);
  if (!json) return null;

  if (json.formations?.home || json.formations?.away) {
    const formation = json.formations.home || json.formations.away;
    return {
      name: formation.name || 'Unbekannt',
      players: (formation.positions || []).map((p: any) => ({
        number: p.number,
        name: p.player || 'Unbekannt',
        position: p.position || '?',
        role: inferRole(p.position)
      }))
    };
  }

  if (json.players && Array.isArray(json.players)) {
    return {
      name: json.formation || 'Analysiert',
      players: json.players.map((p: any) => ({
        number: p.number,
        name: p.name || 'Unbekannt',
        position: p.position || '?',
        role: inferRole(p.position)
      }))
    };
  }

  return null;
};

export const parsePlayerAnalysis = (aiResponse: string): ParsedPlayerAnalysis | null => {
  const json = extractJSON<Record<string, any>>(aiResponse);
  if (!json) return null;

  return {
    playerName: json.playerName || json.name || 'Unbekannt',
    number: json.number,
    position: json.position || '?',
    metrics: json.metrics || json.statistics || {},
    strengths: json.strengths || json.stärken || [],
    weaknesses: json.weaknesses || json.schwächen || [],
    recommendation: json.recommendation || json.empfehlung || ''
  };
};

export const parseTacticalAnalysis = (aiResponse: string): ParsedTacticalAnalysis | null => {
  const json = extractJSON<Record<string, any>>(aiResponse);
  if (!json) return null;

  return {
    phase: json.phase || json.spielphase || 'Unbekannt',
    description: json.description || json.beschreibung || '',
    keyMoments: (json.keyMoments || json.schlüsselmomente || []).map((m: any) => ({
      time: m.time || m.zeit || '',
      event: m.event || m.ereignis || '',
      impact: m.impact || m.auswirkung || 'neutral'
    })),
    suggestions: json.suggestions || json.vorschläge || []
  };
};

const inferRole = (position: string): string => {
  const pos = position.toLowerCase();
  if (pos.includes('tw') || pos.includes('gk') || pos.includes('goalkeeper')) return 'Torwart';
  if (pos.includes('iv') || pos.includes('cb') || pos.includes('central')) return 'Innenverteidiger';
  if (pos.includes('rv') || pos.includes('lv') || pos.includes('rb') || pos.includes('lb')) return 'Außenverteidiger';
  if (pos.includes('zm') || pos.includes('dm') || pos.includes('cm')) return 'Mittelfeldspieler';
  if (pos.includes('om') || pos.includes('zm') || pos.includes('am')) return 'Offensives Mittelfeld';
  if (pos.includes('ra') || pos.includes('la') || pos.includes('rw') || pos.includes('lw')) return 'Flügelspieler';
  if (pos.includes('st') || pos.includes('cf') || pos.includes('stürmer')) return 'Stürmer';
  return 'Spieler';
};

export const formatToTable = (data: Record<string, any>[], columns: string[]): string => {
  if (data.length === 0) return 'Keine Daten vorhanden';

  const header = columns.join(' | ');
  const separator = columns.map(() => '---').join(' | ');
  const rows = data.map(row => columns.map(col => String(row[col] || '-')).join(' | '));

  return [header, separator, ...rows].join('\n');
};

export const formatToStats = (metrics: Record<string, number | string>): string => {
  return Object.entries(metrics)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};
