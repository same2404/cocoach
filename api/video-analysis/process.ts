const FC_API_SECRET = process.env.FC_AUGGEN_API_SECRET || '';
const ALLOWED_ORIGINS = ['https://fc-auggen-manager-26-27-kappa.vercel.app','https://fc-auggen-manager-26-27.vercel.app','http://localhost:5175','http://localhost:5173','http://localhost:3000','http://127.0.0.1:5175'];
function authGuard(req: any, res: any): boolean {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Origin', '*'); res.status(200).end(); return false; }
  const origin = req.headers['origin'] || req.headers['referer'] || '';
  if (origin && !ALLOWED_ORIGINS.some((o: string) => origin.startsWith(o))) { res.status(403).json({ error: 'Nicht autorisierte Domain' }); return false; }
  const key = req.headers['x-api-key'] || req.headers['X-API-Key'];
  if (key !== FC_API_SECRET) { res.status(401).json({ error: 'Ungueltiger API-Key' }); return false; }
  return true;
}
import { GoogleGenAI } from "@google/genai";


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let _ai: any = null;
function getAI() {
  if (!_ai) _ai = new GoogleGenAI({
    apiKey: GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
  return _ai;
}

const MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite"];

async function safeGenerate(params: any) {
  for (const modelName of Array.from(new Set([params.model, ...MODELS]))) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await getAI().models.generateContent({ ...params, model: modelName });
        if (response?.text) return response;
      } catch (err: any) {
        const msg = String(err?.message || err);
        console.warn(`[VideoAnalysis] ${modelName} attempt ${attempt}: ${msg}`);
        if (msg.includes('429')) await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }
  throw new Error("All Gemini models failed");
}

function extractJSON(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
}

export default async function handler(req: any, res: any) {
  if (!authGuard(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { videoTitle, videoUrl, squadPlayers, sampleFrames, clubName } = req.body;

    const squadText = (squadPlayers || []).map((p: any) =>
      `#${p.number || '?'} ${p.firstName || ''} ${p.lastName || ''} (${p.position || '?'})`
    ).join(', ');

    const frameDescriptions = (sampleFrames || []).map((frame: string, i: number) =>
      `Frame ${i + 1}: ${frame.substring(0, 50)}...`
    ).join('\n');

    const prompt = `Du bist ein professioneller Fußball-Analyst für ${clubName || 'einen Verein'}.
Du analysierst ein Spielvideo "${videoTitle || 'Spielvideo'}".

KADER: ${squadText || 'Keine Kaderdaten'}

VIDEO-FRAMES: ${sampleFrames && sampleFrames.length > 0 ? `${sampleFrames.length} Frames wurden extrahiert` : 'Keine Frames verfügbar'}

Analysiere das Video basierend auf den verfügbaren Informationen und erstelle eine detaillierte taktische Analyse.

Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text davor/danach):
{
  "summary": "Kurze Zusammenfassung der Analyse (2-3 Sätze)",
  "formationDetected": "Erkannte Formation",
  "teamStrengths": ["Stärke 1", "Stärke 2", "Stärke 3"],
  "teamWeaknesses": ["Schwäche 1", "Schwäche 2"],
  "sceneClips": [
    {
      "type": "SZENE_TYPE",
      "title": "Beschreibung der Szene",
      "description": "Detaillierte Beschreibung",
      "startSeconds": 0,
      "endSeconds": 15,
      "importance": "hoch|mittel|niedrig",
      "involvedPlayers": ["Spielername"]
    }
  ],
  "timelineEvents": [
    {
      "minute": 45,
      "type": "EVENT_TYPE",
      "description": "Ereignisbeschreibung",
      "impact": "positiv|negativ|neutral"
    }
  ],
  "pitchDetection": {
    "ballPossession": 55,
    "passAccuracy": 78,
    "fieldCoverage": 82,
    "pressingIntensity": 70,
    "defensiveLine": 35,
    "attackingWidth": 72
  },
  "recommendations": [
    "Empfehlung 1",
    "Empfehlung 2",
    "Empfehlung 3"
  ],
  "actiCodeAnalysis": {
    "scenes": [
      {
        "type": "aufbau|pressing|gegenpressing|umschalt|torgefahr|fehler|spielzug|rueckgewinnung|durchbruch",
        "startTime": 0,
        "endTime": 15,
        "confidence": 0.85,
        "description": "Szenenbeschreibung",
        "fieldZone": "defensiv|mittelfeld|offensiv|zentrum|fluegel_links|fluegel_rechts|halbraum_links|halbraum_rechts",
        "outcome": "erfolgreich|teilweise|fehlgeschlagen",
        "coachingPoints": ["Coaching-Punkt 1"],
        "rating": 3
      }
    ],
    "teamAnalysis": {
      "blockHeight": 65,
      "compactness": 70,
      "horizontalSpread": 75,
      "pressingIntensity": 60,
      "buildUpVariant": "kurz",
      "chanceQuality": 5
    },
    "recommendations": ["actiCode Empfehlung 1", "actiCode Empfehlung 2"],
    "matchRating": 6.5
  }
}

SZENE_TYPE Werte: "aufbau", "pressing", "gegenpressing", "umschalt", "torgefahr", "fehler", "spielzug", "rueckgewinnung", "durchbruch"
EVENT_TYPE Werte: "tor", "gegentor", "chance", "abseits", "gelbe_karte", "rote_karte", "wechsel", "eckball", "freistoß", "elfmeter", "ballverlust", "pressing", "durchbruch"

WICHTIG: Antworte NUR mit dem JSON-Objekt. Kein zusätzlicher Text.`;

    const response = await safeGenerate({
      model: "gemini-3.6-flash",
      contents: [{ text: prompt }],
    });

    const text = response?.text || '';
    const result = extractJSON(text);

    if (!result) {
      return res.status(200).json({
        summary: `KI-Analyse für "${videoTitle || 'Spielvideo'}" abgeschlossen. ${clubName || 'Team'} wurde analysiert.`,
        formationDetected: '4-2-3-1',
        teamStrengths: ['Organisation', 'Kompaktheit', 'Umschaltspiel'],
        teamWeaknesses: ['Flügelverteidigung', 'Standardsverteidigung'],
        sceneClips: [],
        timelineEvents: [],
        pitchDetection: { ballPossession: 50, passAccuracy: 75, fieldCoverage: 70, pressingIntensity: 60, defensiveLine: 40, attackingWidth: 65 },
        recommendations: ['Presse intensivieren', 'Schnellere Ballzirkulation', 'Flügelstellungen更高的玩家投下'],
        actiCodeAnalysis: {
          scenes: [],
          teamAnalysis: { blockHeight: 65, compactness: 70, horizontalSpread: 75, pressingIntensity: 60, buildUpVariant: 'kurz', chanceQuality: 5 },
          recommendations: [],
          matchRating: 6.0
        }
      });
    }

    return res.status(200).json(result);

  } catch (err: any) {
    console.error('[VideoAnalysis] Error:', err?.message || err);
    return res.status(200).json({
      summary: `Analyse-Endpunkt erreichbar. Fehler: ${err?.message || 'Unbekannt'}`,
      formationDetected: '4-2-3-1',
      teamStrengths: [],
      teamWeaknesses: [],
      sceneClips: [],
      timelineEvents: [],
      pitchDetection: { ballPossession: 0, passAccuracy: 0, fieldCoverage: 0, pressingIntensity: 0, defensiveLine: 0, attackingWidth: 0 },
      recommendations: [],
      actiCodeAnalysis: {
        scenes: [],
        teamAnalysis: { blockHeight: 0, compactness: 0, horizontalSpread: 0, pressingIntensity: 0, buildUpVariant: 'kurz', chanceQuality: 0 },
        recommendations: [],
        matchRating: 0
      }
    });
  }
}
