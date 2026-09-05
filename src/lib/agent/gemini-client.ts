import { GoogleGenAI } from '@google/genai';
import type { AgentResult } from './types';

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY
  || (typeof process !== 'undefined' && (process as any).env?.VITE_GEMINI_API_KEY)
  || '';

let ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return ai;
}

const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];

export async function agentGenerate<T = string>(
  systemPrompt: string,
  userPrompt: string,
  outputSchema?: any
): Promise<AgentResult<T>> {
  const client = getClient();
  const uniqueModels = Array.from(new Set(MODELS));
  let lastError: any = null;

  for (const model of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [{ text: userPrompt }],
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            maxOutputTokens: 8192,
            ...(outputSchema ? { responseMimeType: 'application/json', responseSchema: outputSchema } : {}),
          },
        });

        const text = response?.text ?? '';
        const data = outputSchema ? safeParseJSON<T>(text) : (text as unknown as T);

        return { success: true, data, model, tokens: response?.usageMetadata?.totalTokenCount };
      } catch (err: any) {
        lastError = err;
        if (attempt < 2) await sleep(1000 * attempt);
      }
    }
  }

  return {
    success: false,
    data: null as unknown as T,
    model: '',
    error: lastError?.message || 'Alle Modelle fehlgeschlagen',
  };
}

function safeParseJSON<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    return text as unknown as T;
  }
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
