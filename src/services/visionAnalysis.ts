// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export interface VisionAnalysisResult {
  formations: {
    home: { name: string; positions: Array<{ player: string; x: number; y: number; number?: number }> };
    away: { name: string; positions: Array<{ player: string; x: number; y: number; number?: number }> };
  };
  players: Array<{
    number: number;
    name: string;
    team: 'home' | 'away';
    position: string;
    x: number;
    y: number;
    action?: string;
  }>;
  ballPosition: { x: number; y: number } | null;
  gamePhase: 'attack' | 'defense' | 'transition' | 'setpiece' | 'unknown';
  description: string;
  confidence: number;
}

const VISION_PROMPT = `Du bist ein professioneller Fußball-Analyst. Analysiere dieses Spielfoto/Screenshot und erkenne:

1. **Aufstellungen** beider Mannschaften (Heim/Auswärts)
2. **Spielerpositionen** mit Trikotnummern (falls sichtbar)
3. **Ballposition** (falls sichtbar)
4. **Spielphase** (Angriff/Verteidigung/Umschaltung/Standardsituation)
5. **Kurze Beschreibung** der Szene

Antworte NUR mit validem JSON in diesem Format:
{
  "formations": {
    "home": { "name": "4-4-2", "positions": [{ "player": "Spielername oder ?", "x": 0.3, "y": 0.5, "number": 7 }] },
    "away": { "name": "4-3-3", "positions": [{ "player": "Spielername oder ?", "x": 0.7, "y": 0.3, "number": 10 }] }
  },
  "players": [{ "number": 7, "name": "?", "team": "home", "position": "RA", "x": 0.3, "y": 0.5, "action": "Ball am Fuß" }],
  "ballPosition": { "x": 0.45, "y": 0.52 },
  "gamePhase": "attack",
  "description": "Kurze Beschreibung der Szene",
  "confidence": 0.85
}

Wichtige Regeln:
- x = 0 links, x = 1 rechts (Horizontal)
- y = 0 oben, y = 1 unten (Vertikal)
- Identifiziere尽可能 viele Spieler mit Trikotnummern
- Wenn ein Spieler nicht erkannt wird, setze name auf "?"
- confidence = 0-1 (wie sicher bist du bei der Erkennung)
- Antworte NUR mit dem JSON-Objekt, kein额外er Text`;

export const analyzeImageWithVision = async (imageBase64: string): Promise<VisionAnalysisResult> => {
  try {
    const response = await genai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          text: VISION_PROMPT
        },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        }
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 2048
      }
    });

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Keine gültige JSON-Antwort von Vision-API');
    }

    const result = JSON.parse(jsonMatch[0]) as VisionAnalysisResult;
    return {
      ...result,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.5))
    };
  } catch (error) {
    console.error('Vision Analysis Error:', error);
    throw error;
  }
};

export const extractFrameFromVideo = (videoElement: HTMLVideoElement, timeInSeconds: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    videoElement.currentTime = timeInSeconds;
    videoElement.onseeked = () => {
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      resolve(base64);
    };
    videoElement.onerror = () => reject(new Error('Video error'));
  });
};

export const autoDetectFormations = async (frames: string[]): Promise<VisionAnalysisResult[]> => {
  const results: VisionAnalysisResult[] = [];
  for (const frame of frames) {
    try {
      const result = await analyzeImageWithVision(frame);
      results.push(result);
    } catch (e) {
      console.warn('Frame analysis failed:', e);
    }
  }
  return results;
};
