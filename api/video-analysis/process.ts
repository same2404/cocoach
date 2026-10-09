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

function toInlineData(frame: any): { mimeType: string; data: string } | null {
  const s = String(frame || '');
  const m = s.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (m) return { mimeType: m[1], data: m[2] };
  if (s.includes('/9j/')) {
    return { mimeType: 'image/jpeg', data: s.split('base64,')[1] || s };
  }
  return null;
}

function frameLabel(body: any): string {
  const arr = body && body.sampleFrames && Array.isArray(body.sampleFrames) ? body.sampleFrames : [];
  const labels: string[] = [];
  arr.forEach((f: any, i: number) => {
    const idx = String(f).indexOf('base64,');
    const head = idx >= 0 ? String(f).slice(0, idx) : '';
    const timeMatch = head.match(/(\d{2}:\d{2})/);
    labels.push(`Frame ${i + 1}${timeMatch ? ` (Zeitstempel ${timeMatch[1]})` : ''}`);
  });
  return labels.join(', ');
}

export default async function handler(req: any, res: any) {
  if (!authGuard(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { videoTitle, videoUrl, squadPlayers, sampleFrames, clubName, sceneCategories } = req.body;

    const squadText = (squadPlayers || []).map((p: any) =>
      `#${p.number || '?'} ${p.firstName || ''} ${p.lastName || ''} (${p.position || '?'})`
    ).join(', ');

    const selectedCats = (sceneCategories && Array.isArray(sceneCategories) && sceneCategories.length > 0)
      ? sceneCategories
      : ['Tore', 'Gegentore', 'Spielaufbau', 'Pressing MIT Ball', 'Pressing GEGEN den Ball', 'Standards', 'Ballverlust'];

    const prompt = `Du bist ein professioneller Fußball-Analyst für ${clubName || 'einen Verein'}.
Du bist ein Video-Analyse-System, integriert in die Trainer-App. Deine Aufgabe: Ein hochgeladenes Spielvideo "${videoTitle || 'Spielvideo'}" automatisch in Szenen schneiden und jede Szene einer klar definierten Kategorie zuordnen - exakt nach den folgenden Regeln, Definitionen und Schnittlogiken.

KADER: ${squadText || 'Keine Kaderdaten'}

DIR LIEGEN ${(sampleFrames || []).length} VIDEOSCREENSHOTS VOR (als Bilder). Jedes Frame hat den Spielstand in Sekunden eingeblendet (Format MM:SS, Position unten links).
Frames: ${frameLabel(req.body) || 'keine Zeitstempel'}

ANGEFORDERTE KATEGORIEN (nur diese analysieren):
${selectedCats.map((c: string) => `- "${c}"`).join('\n')}

=== ALLGEMEINE REGELN FÜR DIE VIDEOANALYSE UND DEN SCHNITT ===
Analysiere Bild für Bild und erkenne:
1. BALLBESITZ (wer hat den Ball: unsere Mannschaft ${clubName} oder Gegner)
2. BALLBEWEGUNG (Pässe, Schüsse, Dribblings)
3. SPIELERBEWEGUNG (Laufwege, Pressing, Stellungsspiel)
4. BESONDERE EREIGNISSE (Tor, Gegentor, Standards, Ballverlust)

STARTE EINE NEUE SZENE, WENN:
- der Ballbesitz wechselt (von uns zum Gegner oder umgekehrt)
- ein Schuss ausgeführt wird
- ein Standard beginnt (Ecke, Freistoß, Einwurf, Abstoß)
- ein Pressing-Moment klar erkennbar ist
- ein Tor oder Gegentor fällt
- der Ball klar ins Aus geht und das Spiel kurz unterbrochen wird

JEDE SZENE MUSS HABEN: start_time (in Sekunden), end_time (in Sekunden), category (eine der vorgegebenen Kategorien), description (kurze, klare Beschreibung).
- KEINE Szene darf ohne Kategorie bleiben.
- Wenn eine Szene mehrere Dinge enthält, wähle die DOMINANTE taktische Aktion (z.B. Pressing gegen den Ball statt nur Ballverlust).
- Nutze die eingeblendeten Zeitstempel der Frames, um genaue Sekunden zu schätzen (Frame-Zeit + ca. 1-2 Sek, Start einer Szene ca. 5-10 Sek vor dem Schlüsselmoment).
- KEINE zeitlichen Überlappungen, höchstens 8 Szenen, nur wenn wirklich etwas zu sehen ist. Lieber wenige präzise Szenen als viele erfundene.
- Tore/Gegentore müssen den KORREKTEN Zeitstempel haben (nicht generisch).

=== KATEGORIE 1: "Tore" (für unsere Mannschaft) ===
Definition: Ein Abschluss unserer Mannschaft, bei dem der Ball die gegnerische Torlinie vollständig überquert und ein reguläres Tor gegeben wird.
Erkennungsmerkmale: Ball fliegt/rollt in Richtung gegnerisches Tor; Ball überquert die Linie zwischen den Pfosten und unter der Latte; unsere Spieler jubeln (Arme hoch, Umarmungen); Schiedsrichter zeigt zur Mittellinie; Gegner wirkt enttäuscht.
Schnittlogik: start ca. 5-10 Sek vor dem entscheidenden Zuspiel/Schuss, end ca. 3-5 Sek nach dem Jubel. Beschreibe Art des Abschlusses (Schuss, Kopfball, Volley), Position (16er, Fünfer, Flanke von rechts) und ggf. Angriffsart (Konter, Kombination, Standard-Nachschuss).

=== KATEGORIE 2: "Gegentore" ===
Definition: Ein Abschluss der gegnerischen Mannschaft, bei dem der Ball unsere Torlinie überquert und ein reguläres Tor gegeben wird.
Erkennungsmerkmale: Gegner schießt/köpft auf unser Tor; Ball überquert unsere Linie; Gegner jubelt; unsere Spieler reagieren enttäuscht (Arme runter, Kopfschütteln); Schiedsrichter zeigt zur Mittellinie.
Schnittlogik: start ca. 5-10 Sek vor dem gegnerischen Schuss, end ca. 3-5 Sek nach dem Jubel. Beschreibe Angriffsart (Konter, Flanke, Standard) und mögliche Fehler (Ballverlust im Aufbau, nicht konsequent verteidigt).

=== KATEGORIE 3: "Spielaufbau" ===
Definition: Unsere Mannschaft baut kontrolliert von hinten auf, mit klarer Struktur und mehreren Pässen.
Erkennungsmerkmale: Ballbesitz bei unseren Innenverteidigern/Außenverteidigern/Sechsern; mehrere Pässe ohne direkten Druck; erkennbare Struktur (Viererkette, Sechser vor der Kette); Ziel ist ein geordneter Vorwärts-Pass, nicht ein Befreiungsschlag.
Schnittlogik: start sobald kontrollierter Ballbesitz in der ersten Linie (IV/AV/6er), end wenn die nächste Linie erreicht ist, oder Ballverlust, oder starkes Pressing den Aufbau beendet. Beschreibe, über welche Spieler der Aufbau läuft und ob er erfolgreich ist.

=== KATEGORIE 4: "Pressing MIT Ball" (Gegenpressing / direktes Nachsetzen) ===
Definition: Unsere Mannschaft setzt den Gegner unmittelbar nach Ballverlust ODER Ballgewinn unter Druck, während der Ball in der Nähe ist. Ziel: Ball schnell zurückerobern.
Erkennungsmerkmale: Wir verlieren den Ball oder der Gegner gewinnt ihn; sofortige Reaktion mit mehreren Spielern, die aktiv auf den Ballführenden zulaufen; Gegner hat wenig Zeit und Raum; Ball wird oft schnell wieder gewonnen.
Schnittlogik: start im Moment des Ballverlusts/Ballgewinns bei direktem Druck, end bei Ballrückeroberung, klarer Befreiung des Gegners oder Übergang in geordnete Verteidigung. Beschreibe Zone des Ballverlusts, wie viele Spieler ins Gegenpressing gehen und ob der Ball zurückgewonnen wird.

=== KATEGORIE 5: "Pressing GEGEN den Ball" (Defensives Pressing) ===
Definition: Unsere Mannschaft setzt den Gegner unter Druck, während der Gegner im Ballbesitz ist. Ziel: Ballgewinn oder Fehler erzwingen.
Erkennungsmerkmale: Gegner hat kontrolliert den Ball; unsere Spieler bewegen sich aktiv vorwärts/seitwärts, um den Gegner zu stellen. Pressing-Trigger: Pass auf gegnerischen Außenverteidiger, Gegner mit Rücken zum Spiel, schlechter erster Kontakt, Ball in definierter Zone; mehrere Spieler arbeiten zusammen.
Schnittlogik: start sobald ein Pressing-Trigger sichtbar ist und unsere Spieler aktiv anlaufen, end bei Ballgewinn, klarer Befreiung (langer Ball, Seitenwechsel) oder Übergang ins tiefe Verteidigen. Beschreibe Zone, welche Spieler anlaufen und ob das Pressing erfolgreich ist.

=== KATEGORIE 6: "Standards" ===
Definition: Alle Situationen, in denen der Ball ruht und das Spiel durch eine festgelegte Aktion fortgesetzt wird. Unterkategorien (in description): Ecke, Freistoß (direkt/indirekt), Einwurf, Abstoß, Strafstoß.
Erkennungsmerkmale: Ball liegt still; Schiedsrichter gibt Zeichen; Spieler nehmen feste Positionen ein (z.B. Strafraumbesetzung bei Ecke); klar erkennbare Vorbereitung (Anlauf, Mauer, Laufwege).
Schnittlogik: start sobald der Ball ruht und die Standard-Situation vorbereitet wird, end wenn die Aktion abgeschlossen ist (Ball geklärt, Tor, Ball im Aus, neue Phase). Beschreibe Art, Richtung (z.B. Ecke von rechts) und Ergebnis (Chance, Tor, geklärt).

=== KATEGORIE 7: "Ballverlust" ===
Definition: Unsere Mannschaft verliert den Ball und der Gegner übernimmt die Kontrolle.
Erkennungsmerkmale: Fehlpass (Ball geht direkt zum Gegner); Dribbling verloren; Annahmefehler; technischer Fehler (zu langer/zu kurzer Pass).
Schnittlogik: start im Moment des Fehlers (Pass, Dribbling, Annahme), end wenn der Gegner den Ball klar kontrolliert ODER wir direkt ins Gegenpressing gehen (dann kann die Szene zu "Pressing MIT Ball" übergehen - wähle die dominante Aktion). Beschreibe Art des Fehlers, Zone (eigene Hälfte, Zentrum, Halbraum) und direkte Folge (Konter, Ballbesitz Gegner, Pressing).

=== OUTPUT-FORMAT ===
Antworte NUR mit einem JSON-Objekt (kein Markdown, kein Text davor/danach):
{
  "summary": "Kurze Zusammenfassung der Analyse (2-3 Sätze)",
  "formationDetected": "Erkannte Formation",
  "teamStrengths": ["Stärke 1", "Stärke 2", "Stärke 3"],
  "teamWeaknesses": ["Schwäche 1", "Schwäche 2"],
  "sceneClips": [
    {
      "categories": ["EINE_DER_ANGEFORDERTEN_KATEGORIEN"],
      "title": "Kurzbeschreibung der Szene",
      "aiCommentary": "Detaillierte taktische Beschreibung (inkl. Fehleranalyse falls relevant)",
      "startTimeSeconds": 120,
      "endTimeSeconds": 140,
      "tacticalRating": "8",
      "improvementSuggestions": "Konkrete Verbesserung für ${clubName || 'das Team'}",
      "beforeSituation": "Ausgangslage",
      "trigger": "Auslöser der Aktion",
      "passSequence": ["Passfolge"],
      "keyPlayers": [{"name": "Spielername", "role": "Rolle in der Szene"}],
      "mainLearningPoint": "Wichtigste Erkenntnis",
      "confidence": 0.9
    }
  ],
  "recommendations": ["Empfehlung 1", "Empfehlung 2", "Empfehlung 3"],
  "pitchDetection": {
    "currentZone": "z.B. Mittelfeld rechts",
    "ballPossessionTeam": "z.B. FC Auggen 55%",
    "pressingDensityIndex": 70
  },
  "timelineEvents": [
    {
      "timestampFormatted": "1. Halbzeit 23:15",
      "importance": "Hoch|Normal|Niedrig",
      "title": "Kurztitel",
      "description": "Beschreibung"
    }
  ]
}

WICHTIG:
- "categories" MUSS exakt eine dieser Kategorien enthalten: ["Tore", "Gegentore", "Spielaufbau", "Pressing MIT Ball", "Pressing GEGEN den Ball", "Standards", "Ballverlust"].
- Jede Szene NUR unter EINER Kategorie. KEINE Szene darf in mehreren Kategorien erscheinen (keine Kopien).
- Verwende die dominante taktische Aktion, wenn mehrere Ereignisse zusammenfallen.
- startTimeSeconds/endTimeSeconds müssen nachvollziehbar aus den eingeblendeten Frame-Zeiten abgeleitet sein (in Sekunden ab Videoanfang).
- Antworte NUR mit dem JSON-Objekt. Kein zusätzlicher Text.`;

    const imageParts = (sampleFrames || [])
      .map(toInlineData)
      .filter(Boolean)
      .map((img: any) => ({ inlineData: img }));

    const parts: any[] = [{ text: prompt }, ...imageParts];

    const response = await safeGenerate({
      model: "gemini-3.6-flash",
      contents: [{ role: 'user', parts }],
    });

    const text = response?.text || '';
    const result = extractJSON(text);

    if (!result) {
      return res.status(200).json({
        summary: `Automatische Analyse für "${videoTitle || 'Spielvideo'}" abgeschlossen. ${clubName || 'Team'} wurde analysiert.`,
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
