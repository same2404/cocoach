import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';

let cachedCalendarToken: string | null = null;

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Initiates Google OAuth Sign-in with Google Calendar Scopes.
 * Caches access token in memory.
 */
export async function googleSignInCalendar(): Promise<{ token: string; user: any }> {
  const provider = new GoogleAuthProvider();
  CALENDAR_SCOPES.forEach(scope => provider.addScope(scope));

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Kein Access Token von Google OAuth erhalten.');
    }

    cachedCalendarToken = credential.accessToken;
    return { token: cachedCalendarToken, user: result.user };
  } catch (error: any) {
    if (error?.code !== 'auth/popup-closed-by-user' && error?.code !== 'auth/cancelled-popup-request') {
      console.error('Google Calendar Auth Fehler:', error);
    }
    throw error;
  }
}

export function getCachedCalendarToken(): string | null {
  return cachedCalendarToken;
}

export function setCachedCalendarToken(token: string | null) {
  cachedCalendarToken = token;
}

export interface CalendarEventItem {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
}

/**
 * Lists upcoming events from primary Google Calendar
 */
export async function listCalendarEvents(token: string, timeMin?: string): Promise<CalendarEventItem[]> {
  const minTime = timeMin || new Date().toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(minTime)}&singleEvents=true&orderBy=startTime&maxResults=50`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Laden der Google Kalender Termine.');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates an event in primary Google Calendar
 */
export async function createCalendarEvent(token: string, event: CalendarEventItem): Promise<CalendarEventItem> {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(event)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Erstellen des Kalendereintrags.');
  }

  return await response.json();
}

/**
 * Deletes a Google Calendar event.
 * MANDATORY: Always require user confirmation before calling this function!
 */
export async function deleteCalendarEvent(token: string, eventId: string): Promise<void> {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Fehler beim Löschen des Termins im Google Kalender.');
  }
}
