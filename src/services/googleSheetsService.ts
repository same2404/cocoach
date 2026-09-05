import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

let cachedSheetsToken: string | null = null;

export const SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.file'
];

/**
 * Initiates Google OAuth Sign-in with Google Sheets Scopes.
 * Caches access token in memory.
 */
export async function googleSignInSheets(): Promise<{ token: string; user: any }> {
  const provider = new GoogleAuthProvider();
  SHEETS_SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Kein Access Token von Google OAuth erhalten.');
    }

    cachedSheetsToken = credential.accessToken;
    return { token: cachedSheetsToken, user: result.user };
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error('Google Sheets Auth Fehler:', error);
    }
    throw error;
  }
}

export function getCachedSheetsToken(): string | null {
  return cachedSheetsToken;
}

export function setCachedSheetsToken(token: string | null) {
  cachedSheetsToken = token;
}

export interface SpreadsheetFile {
  id: string;
  name: string;
  webViewLink?: string;
  createdTime?: string;
}

/**
 * Lists Google Sheets spreadsheets in Drive
 */
export async function listSpreadsheets(token: string): Promise<SpreadsheetFile[]> {
  const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,createdTime)&pageSize=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Laden der Tabellen.');
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Creates a new Google Spreadsheet
 */
export async function createSpreadsheet(token: string, title: string, sheetName = 'FC Auggen Data'): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title
      },
      sheets: [
        {
          properties: {
            title: sheetName
          }
        }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Erstellen der Google Tabelle.');
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl
  };
}

/**
 * Updates or sets values in a Google Sheet range
 */
export async function updateSheetValues(
  token: string,
  spreadsheetId: string,
  range: string,
  values: (string | number)[][]
): Promise<any> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Schreiben in die Google Tabelle.');
  }

  return await response.json();
}

/**
 * Reads values from a Google Sheet range
 */
export async function getSheetValues(token: string, spreadsheetId: string, range = 'A1:Z100'): Promise<(string | number)[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Lesen der Google Tabelle.');
  }

  const data = await response.json();
  return data.values || [];
}

/**
 * Export FC Auggen Players Squad to a new Google Sheet
 */
export async function exportSquadToNewSheet(token: string, players: any[]): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `FC Auggen - Kader & Spielerliste (${new Date().toLocaleDateString('de-DE')})`;
  const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(token, title, 'Kader Uebersicht');

  const headers = ['Rückennummer', 'Name', 'Position', 'Status', 'Tore', 'Vorlagen', 'Gelbe Karten', 'Rote Karten', 'Einsätze', 'Fitness (%)', 'Notizen'];
  
  const rows = players.map(p => [
    p.number ?? p.rückennummer ?? '',
    p.name ?? '',
    p.position ?? '',
    p.status ?? 'Aktiv',
    p.goals ?? p.tore ?? 0,
    p.assists ?? p.vorlagen ?? 0,
    p.yellowCards ?? p.gelbeKarten ?? 0,
    p.redCards ?? p.roteKarten ?? 0,
    p.appearances ?? p.einsätze ?? 0,
    p.fitness ?? 100,
    p.notes ?? p.notizen ?? ''
  ]);

  await updateSheetValues(token, spreadsheetId, 'Kader Uebersicht!A1:K' + (rows.length + 1), [headers, ...rows]);

  return { spreadsheetId, spreadsheetUrl };
}

/**
 * Export FC Auggen Competitive Matches to a new Google Sheet
 */
export async function exportMatchesToNewSheet(token: string, matches: any[]): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const title = `FC Auggen - Spielplan & Ergebnisse (${new Date().toLocaleDateString('de-DE')})`;
  const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(token, title, 'Spielplan Verbandsliga');

  const headers = ['Datum', 'Uhrzeit', 'Heimteam', 'Auswärtsteam', 'Ergebnis', 'Spielort', 'Status', 'Wettbewerb'];
  
  const rows = matches.map(m => [
    m.date ?? m.datum ?? '',
    m.time ?? m.uhrzeit ?? '',
    m.homeTeam ?? m.heim ?? 'FC Auggen',
    m.awayTeam ?? m.gast ?? '',
    m.score ?? (m.homeScore !== undefined ? `${m.homeScore}:${m.awayScore}` : '-'),
    m.location ?? m.ort ?? 'Lettenpark Auggen',
    m.status ?? 'Anstehend',
    m.competition ?? 'Verbandsliga Südbaden'
  ]);

  await updateSheetValues(token, spreadsheetId, 'Spielplan Verbandsliga!A1:H' + (rows.length + 1), [headers, ...rows]);

  return { spreadsheetId, spreadsheetUrl };
}
