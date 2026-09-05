import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

let cachedGmailToken: string | null = null;

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
];

/**
 * Initiates Google OAuth Sign-in with Gmail Scopes.
 * Caches access token in memory.
 */
export async function googleSignInGmail(): Promise<{ token: string; user: any }> {
  const provider = new GoogleAuthProvider();
  GMAIL_SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Kein Access Token von Google OAuth erhalten.');
    }

    cachedGmailToken = credential.accessToken;
    return { token: cachedGmailToken, user: result.user };
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error('Gmail Auth Fehler:', error);
    }
    throw error;
  }
}

export function getCachedGmailToken(): string | null {
  return cachedGmailToken;
}

export function setCachedGmailToken(token: string | null) {
  cachedGmailToken = token;
}

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
}

/**
 * Encodes subject and body to RFC 2822 base64url for Gmail API
 */
function createRawEmail(to: string, subject: string, body: string): string {
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    '',
    body
  ];

  const emailText = emailLines.join('\r\n');
  return btoa(unescape(encodeURIComponent(emailText)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email via Gmail API.
 * MANDATORY: Requires explicit user confirmation dialog before sending!
 */
export async function sendGmailMessage(
  token: string,
  to: string,
  subject: string,
  bodyHtml: string
): Promise<{ id: string; threadId: string }> {
  const raw = createRawEmail(to, subject, bodyHtml);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Senden der E-Mail über Gmail.');
  }

  return await response.json();
}

/**
 * Lists recent messages in Gmail
 */
export async function listGmailMessages(token: string, qQuery = 'FC Auggen'): Promise<GmailMessageSummary[]> {
  const qParam = encodeURIComponent(qQuery);
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15&q=${qParam}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Laden der E-Mails.');
  }

  const data = await response.json();
  if (!data.messages || data.messages.length === 0) return [];

  // Fetch headers for each message concurrently
  const summaries: GmailMessageSummary[] = await Promise.all(
    data.messages.slice(0, 10).map(async (msg: { id: string; threadId: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!detailRes.ok) return { id: msg.id, threadId: msg.threadId };
        const detail = await detailRes.json();
        
        const headers = detail.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'Kein Betreff';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'Unbekannt';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: detail.snippet,
          subject,
          from,
          date
        };
      } catch {
        return { id: msg.id, threadId: msg.threadId };
      }
    })
  );

  return summaries;
}

/**
 * Trashes a Gmail Message.
 * MANDATORY: Always require explicit user confirmation before executing!
 */
export async function trashGmailMessage(token: string, messageId: string): Promise<void> {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Verschieben der E-Mail in den Papierkorb.');
  }
}
