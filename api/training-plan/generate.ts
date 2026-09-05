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
        console.warn(`[TrainingPlan] ${modelName} attempt ${attempt}: ${msg}`);
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
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  return null;
}

export default async function handler(req: any, res: any) {
  if (!authGuard(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { datum, wochentag, gegner, ort, team, intensitaet, belastung, schwerpunkt, anwesenheit, trainer, dauer, clubName } = req.body;

    const prompt = `Du bist ein professioneller Fußballtrainer und Trainingsplaner für ${clubName || 'einen Verein'}.

Erstelle einen vollständigen Trainingsplan basierend auf diesen Angaben:
- Datum: ${datum || 'heute'}
- Wochentag: ${wochentag || ''}
- Gegner: ${gegner || 'keiner'}
- Ort: ${ort || 'Vereinsgelände'}
- Team: ${team || 'Erwachsene'}
- Intensität (0-10): ${intensitaet || '6'}
- Belastung: ${belastung || 'mittel'}
- Schwerpunkt: ${schwerpunkt || 'Ballbesitz'}
- Dauer: ${dauer || '90 Minuten'}
- Trainer: ${trainer || 'Trainer'}
- Anwesenheit: ${anwesenheit || 'Standard-Kader'}

Antworte NUR mit einem JSON-Objekt mit dieser Struktur:
{
  "metadaten": { "datum", "wochentag", "ort", "gegner", "team", "belastung", "dauer", "intensitaet", "wochenschwerpunkt", "schwerpunktEinheit", "trainer" },
  "anwesenheit": [{ "name", "nummer", "position", "status" }],
  "erwarmung": { "block", "zeit", "inhalt", "videoLink", "varianten" },
  "hauptteil1": { "block", "zeit", "uebung", "aufbau", "gruppen", "coachingpunkte", "varianten" },
  "hauptteil2": { "block", "zeit", "uebung", "aufbau", "gruppen", "ziel", "coachingpunkte", "varianten" },
  "schluss": { "block", "zeit", "spielform", "taktiktafel", "gruppen", "ziel" },
  "gesamtDauer": "string",
  "wichtigeInformationen": "string"
}

Jeder Block soll fachlich präzise, sofort nutzbar und im Deutschen sein.`;

    const response = await safeGenerate({
      model: 'gemini-3.6-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.5,
        maxOutputTokens: 6144
      }
    });

    let text = (response as any)?.text || '{}';
    let plan = extractJSON(text);
    if (!plan) plan = {};

    return res.status(200).json({ success: true, plan, model: (response as any)?.modelVersion });
  } catch (err: any) {
    console.error('[TrainingPlan Error]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
}
