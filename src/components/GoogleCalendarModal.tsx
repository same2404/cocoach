import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  CalendarCheck,
  LogOut,
  Send,
  Users,
  Dumbbell,
  Trophy,
  Cake,
  CalendarDays,
  Sparkles,
  Check,
  ChevronRight,
  Filter,
  Layers,
  Zap
} from 'lucide-react';
import { 
  googleSignInCalendar, 
  getCachedCalendarToken, 
  setCachedCalendarToken, 
  listCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  CalendarEventItem 
} from '../services/googleCalendarService';

interface GoogleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: any[];
  trainingSessions?: any[];
  training?: any[];
  competitiveMatches?: any[];
  spiele?: any[];
  yearlyPlan?: any[];
  meetingsData?: any[];
}

export interface SyncableEvent {
  id: string;
  category: 'spiel' | 'training' | 'geburtstag' | 'jahresplan' | 'sitzung';
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  isAllDay?: boolean;
  location?: string;
  description?: string;
}

export const GoogleCalendarModal: React.FC<GoogleCalendarModalProps> = ({
  isOpen,
  onClose,
  players = [],
  trainingSessions = [],
  training = [],
  competitiveMatches = [],
  spiele = [],
  yearlyPlan = [],
  meetingsData = []
}) => {
  const [token, setToken] = useState<string | null>(getCachedCalendarToken());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [syncingCategory, setSyncingCategory] = useState<string | null>(null);
  const [syncedItemIds, setSyncedItemIds] = useState<Record<string, boolean>>({});

  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active Category Filter for Preview
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'spiel' | 'training' | 'geburtstag' | 'jahresplan' | 'sitzung'>('all');

  // Custom Event Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [summary, setSummary] = useState('');
  const [location, setLocation] = useState('Auggen Lettenpark Stadion');
  const [description, setDescription] = useState('FC Auggen 1926 e.V.');
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventStartTime, setEventStartTime] = useState('15:00');
  const [eventEndTime, setEventEndTime] = useState('17:00');

  // Confirmation state for deleting Google Calendar events (MANDATORY explicit confirmation)
  const [eventToDelete, setEventToDelete] = useState<CalendarEventItem | null>(null);

  useEffect(() => {
    if (token && isOpen) {
      loadEvents(token);
    }
  }, [token, isOpen]);

  const loadEvents = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const items = await listCalendarEvents(authToken);
      setEvents(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Laden der Google Kalender Termine.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token: newTok, user: u } = await googleSignInCalendar();
      setToken(newTok);
      setUser(u);
      setSuccessMsg('Erfolgreich mit Google Kalender verbunden!');
      await loadEvents(newTok);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setError('Das Anmeldefenster wurde geschlossen. Klicke erneut auf "Mit Google anmelden".');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setError(null);
      } else {
        console.error(err);
        setError(err.message || 'Anmeldung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    setCachedCalendarToken(null);
    setToken(null);
    setUser(null);
    setEvents([]);
    setSuccessMsg('Verbindung zu Google Kalender getrennt.');
  };

  // Helper to extract and format date strings YYYY-MM-DD
  const formatDateToYMD = (dateVal: any): string | null => {
    if (!dateVal) return null;
    if (typeof dateVal === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
        return dateVal.slice(0, 10);
      }
      if (/^\d{2}\.\d{2}\.\d{4}/.test(dateVal)) {
        const parts = dateVal.split('.');
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        return d.toISOString().slice(0, 10);
      }
    }
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
      return dateVal.toISOString().slice(0, 10);
    }
    return null;
  };

  // Extract all CoCoach Events (Spiele, Trainings, Jahresplan, Geburtstage, Sitzungen)
  const getSyncableAppEvents = (): SyncableEvent[] => {
    const list: SyncableEvent[] = [];

    // 1. SPIELE (Competitive Matches & General Games)
    const allMatches = [...competitiveMatches, ...spiele];
    const uniqueMatchesMap = new Map<string, any>();
    allMatches.forEach(m => {
      const key = `${m.date}_${m.opponent || m.awayTeam || m.homeTeam}`;
      if (!uniqueMatchesMap.has(key)) uniqueMatchesMap.set(key, m);
    });

    uniqueMatchesMap.forEach((m, key) => {
      const ymd = formatDateToYMD(m.date);
      if (!ymd) return;

      const opp = m.opponent || (m.homeTeam && m.homeTeam.includes('Auggen') ? m.awayTeam : m.homeTeam) || 'Gegner';
      const home = m.homeTeam || 'FC Auggen';
      const away = m.awayTeam || opp;
      const title = `⚽ Verbandsliga: ${home} vs. ${away}`;
      const time = m.time || '15:30';

      list.push({
        id: `match_${m.id || key}`,
        category: 'spiel',
        title,
        date: ymd,
        startTime: time,
        endTime: addHoursToTime(time, 2),
        location: m.location || 'Lettenpark Stadion Auggen',
        description: `FC Auggen Spieltag ${m.matchday || ''} • Typ: ${m.type || 'Pflichtspiel'} • Gegner: ${opp}`
      });
    });

    // 2. TRAININGSPLANUNG & EINHEITEN
    const allTrainings = [...trainingSessions, ...training];
    const uniqueTrainingsMap = new Map<string, any>();
    allTrainings.forEach(t => {
      const key = `${t.date}_${t.title || t.topic || 'training'}`;
      if (!uniqueTrainingsMap.has(key)) uniqueTrainingsMap.set(key, t);
    });

    uniqueTrainingsMap.forEach((t, key) => {
      const ymd = formatDateToYMD(t.date);
      if (!ymd) return;

      const titleStr = t.title || t.topic || t.focus || 'Trainingseinheit';
      const time = t.time || '18:30';

      list.push({
        id: `train_${t.id || key}`,
        category: 'training',
        title: `🏋️ FC Auggen Training: ${titleStr}`,
        date: ymd,
        startTime: time,
        endTime: addHoursToTime(time, 1.5),
        location: t.location || 'Auggen Rasenplatz / Kunstrasen',
        description: `Trainingsfokus: ${t.focus || t.topic || 'Einheit'} • Intensität: ${t.intensity || 'Normal'}`
      });
    });

    // 3. JAHRESPLANUNG & VEREINSEVENTS
    yearlyPlan.forEach((y, idx) => {
      const ymd = formatDateToYMD(y.date);
      if (!ymd) return;

      const time = y.time || '10:00';
      const cat: SyncableEvent['category'] = y.type === 'spiel' ? 'spiel' : y.type === 'training' ? 'training' : 'jahresplan';

      list.push({
        id: `yearly_${y.id || idx}`,
        category: cat,
        title: `📅 Jahresplanung: ${y.title || 'Vereinstermin'}`,
        date: ymd,
        startTime: time,
        endTime: addHoursToTime(time, 2),
        location: y.location || 'FC Auggen Vereinsheim / Lettenpark',
        description: `Notes: ${y.notes || y.description || 'FC Auggen Terminkalender Event'}`
      });
    });

    // 4. GEBURTSTAGE (Spieler & Funktionäre)
    const currentYear = new Date().getFullYear();
    players.forEach((p, idx) => {
      const bdateRaw = p.birthDate || p.dateOfBirth || p.geburtstag;
      if (!bdateRaw) return;

      const ymdBirth = formatDateToYMD(bdateRaw);
      if (!ymdBirth) return;

      const parts = ymdBirth.split('-');
      const birthYear = parseInt(parts[0], 10);
      const month = parts[1];
      const day = parts[2];

      const fullName = p.firstName && p.lastName ? `${p.firstName} ${p.lastName}` : (p.name || `Spieler #${p.number || idx+1}`);

      // Generate for Current Year (2026) and Next Year (2027)
      [currentYear, currentYear + 1].forEach(yr => {
        const age = yr - birthYear;
        const targetDate = `${yr}-${month}-${day}`;

        list.push({
          id: `bday_${p.id || idx}_${yr}`,
          category: 'geburtstag',
          title: `🎂 Geburtstag: ${fullName} (${age > 0 ? `${age}. Geburtstag` : 'Geburtstag'})`,
          date: targetDate,
          isAllDay: true,
          location: 'FC Auggen 1926 e.V.',
          description: `Gratuliere ${fullName}! Position: ${p.position || 'Kader'} • Rückennummer: #${p.number || '-'}`
        });
      });
    });

    // 5. TEAM-SITZUNGEN & BESPRECHUNGEN
    meetingsData.forEach((m, idx) => {
      const ymd = formatDateToYMD(m.date);
      if (!ymd) return;

      const time = m.time || '19:00';

      list.push({
        id: `meet_${m.id || idx}`,
        category: 'sitzung',
        title: `📋 Team-Sitzung: ${m.title || m.topic || 'Besprechung'}`,
        date: ymd,
        startTime: time,
        endTime: addHoursToTime(time, 1),
        location: m.location || 'Sitzungszimmer Lettenpark Auggen',
        description: `Tagesordnung / Themen: ${m.notes || m.description || 'Mannschaftsbesprechung FC Auggen'}`
      });
    });

    // Sort chronologically
    return list.sort((a, b) => a.date.localeCompare(b.date));
  };

  const addHoursToTime = (timeStr: string, hoursToAdd: number): string => {
    try {
      const [h, m] = timeStr.split(':').map(Number);
      const totalMin = h * 60 + (m || 0) + hoursToAdd * 60;
      const newH = Math.floor(totalMin / 60) % 24;
      const newM = totalMin % 60;
      return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    } catch {
      return '19:00';
    }
  };

  const allSyncableEvents = getSyncableAppEvents();

  // Category counts
  const matchesCount = allSyncableEvents.filter(e => e.category === 'spiel').length;
  const trainingCount = allSyncableEvents.filter(e => e.category === 'training').length;
  const bdayCount = allSyncableEvents.filter(e => e.category === 'geburtstag').length;
  const jahresplanCount = allSyncableEvents.filter(e => e.category === 'jahresplan').length;
  const sitzungCount = allSyncableEvents.filter(e => e.category === 'sitzung').length;

  const filteredSyncableEvents = allSyncableEvents.filter(e => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  // Sync a single event to Google Calendar
  const syncSingleEvent = async (evt: SyncableEvent) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      let calendarItem: CalendarEventItem;

      if (evt.isAllDay) {
        // Next day for all-day end
        const d = new Date(`${evt.date}T00:00:00`);
        const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
        const nextYmd = nextD.toISOString().slice(0, 10);

        calendarItem = {
          summary: evt.title,
          location: evt.location || 'FC Auggen 1926 e.V.',
          description: evt.description || '',
          start: { date: evt.date },
          end: { date: nextYmd }
        };
      } else {
        const startIso = `${evt.date}T${evt.startTime || '15:00'}:00`;
        const endIso = `${evt.date}T${evt.endTime || '17:00'}:00`;

        calendarItem = {
          summary: evt.title,
          location: evt.location || 'Auggen Lettenpark',
          description: evt.description || '',
          start: { dateTime: new Date(startIso).toISOString() },
          end: { dateTime: new Date(endIso).toISOString() }
        };
      }

      await createCalendarEvent(token, calendarItem);
      setSyncedItemIds(prev => ({ ...prev, [evt.id]: true }));
      setSuccessMsg(`"${evt.title}" erfolgreich synchronisiert!`);
      await loadEvents(token);
    } catch (err: any) {
      setError(err.message || `Fehler beim Synchronisieren von "${evt.title}".`);
    } finally {
      setLoading(false);
    }
  };

  // Sync a list or category of events to Google Calendar
  const syncEventBatch = async (itemsToSync: SyncableEvent[], categoryName: string) => {
    if (!token || itemsToSync.length === 0) return;
    setLoading(true);
    setSyncingCategory(categoryName);
    setError(null);
    let count = 0;

    try {
      for (const evt of itemsToSync) {
        let calendarItem: CalendarEventItem;

        if (evt.isAllDay) {
          const d = new Date(`${evt.date}T00:00:00`);
          const nextD = new Date(d.getTime() + 24 * 60 * 60 * 1000);
          const nextYmd = nextD.toISOString().slice(0, 10);

          calendarItem = {
            summary: evt.title,
            location: evt.location || 'FC Auggen 1926 e.V.',
            description: evt.description || '',
            start: { date: evt.date },
            end: { date: nextYmd }
          };
        } else {
          const startIso = `${evt.date}T${evt.startTime || '15:00'}:00`;
          const endIso = `${evt.date}T${evt.endTime || '17:00'}:00`;

          calendarItem = {
            summary: evt.title,
            location: evt.location || 'Auggen Lettenpark',
            description: evt.description || '',
            start: { dateTime: new Date(startIso).toISOString() },
            end: { dateTime: new Date(endIso).toISOString() }
          };
        }

        await createCalendarEvent(token, calendarItem);
        count++;
        setSyncedItemIds(prev => ({ ...prev, [evt.id]: true }));
      }

      setSuccessMsg(`${count} ${categoryName} Termine erfolgreich in deinen Google Kalender übertragen!`);
      await loadEvents(token);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Synchronisieren der Termine.');
    } finally {
      setLoading(false);
      setSyncingCategory(null);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !summary.trim() || !eventDate) return;

    setLoading(true);
    setError(null);

    try {
      const startIso = `${eventDate}T${eventStartTime}:00`;
      const endIso = `${eventDate}T${eventEndTime}:00`;

      const newEvt: CalendarEventItem = {
        summary: summary.trim(),
        location: location.trim(),
        description: description.trim(),
        start: { dateTime: new Date(startIso).toISOString() },
        end: { dateTime: new Date(endIso).toISOString() }
      };

      await createCalendarEvent(token, newEvt);
      setSuccessMsg(`Termin "${summary}" erfolgreich im Google Kalender eingetragen!`);
      setShowAddForm(false);
      setSummary('');
      await loadEvents(token);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen des Kalendereintrags.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete?.id || !token) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCalendarEvent(token, eventToDelete.id);
      setSuccessMsg(`Termin "${eventToDelete.summary}" aus dem Google Kalender gelöscht.`);
      setEventToDelete(null);
      await loadEvents(token);
    } catch (err: any) {
      setError(err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <CalendarIcon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Google Kalender Integration • FC Auggen
                {token && <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full uppercase font-extrabold">Aktiv</span>}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Synchronisiere Spiele, Trainingspläne, Jahresplanung & Geburtstage live mit Google Calendar
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900"><X size={14} /></button>
          </div>
        )}

        {successMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900"><X size={14} /></button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {!token ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shadow-sm">
                <CalendarIcon size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Google Kalender nicht verbunden</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Verbinde dein Google-Konto, um Spiele, Trainingspläne, Jahresplanung & Geburtstage automatisch mit deinem Kalender zu synchronisieren.
                </p>
              </div>

              {/* Official Google Sign In Button */}
              <button
                onClick={handleConnect}
                disabled={loading}
                className="inline-flex items-center justify-center gap-3 bg-white text-slate-700 font-bold text-sm px-6 py-3 rounded-xl border border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all cursor-pointer"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Mit Google anmelden & Kalender verbinden</span>
              </button>
            </div>
          ) : (
            <>
              {/* Batch Sync Control Dashboard */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black tracking-tight flex items-center gap-2 text-amber-400">
                      <Zap size={18} />
                      FC Auggen Termine Synchronisations-Zentrale
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Insgesamt <span className="text-white font-bold">{allSyncableEvents.length} Termine</span> bereit zur Übertragung in deinen Google Kalender
                    </p>
                  </div>

                  {/* MASTER SYNC ALL BUTTON */}
                  <button
                    onClick={() => syncEventBatch(allSyncableEvents, 'Gesamter Verein')}
                    disabled={loading || allSyncableEvents.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0"
                  >
                    <Sparkles size={16} />
                    <span>{loading && syncingCategory === 'Gesamter Verein' ? 'Synchronisiere...' : 'ALLES in Google Kalender eintragen'}</span>
                  </button>
                </div>

                {/* Categorized Quick Sync Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => syncEventBatch(allSyncableEvents.filter(e => e.category === 'spiel'), 'Pflichtspiele')}
                    disabled={loading || matchesCount === 0}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-emerald-500/30 text-left transition-all cursor-pointer disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <Trophy size={14} />
                      <span>Spiele ({matchesCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Verbandsliga & Pokal</p>
                  </button>

                  <button
                    onClick={() => syncEventBatch(allSyncableEvents.filter(e => e.category === 'training'), 'Trainingsplan')}
                    disabled={loading || trainingCount === 0}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-blue-500/30 text-left transition-all cursor-pointer disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
                      <Dumbbell size={14} />
                      <span>Training ({trainingCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Einheiten & Zeiten</p>
                  </button>

                  <button
                    onClick={() => syncEventBatch(allSyncableEvents.filter(e => e.category === 'geburtstag'), 'Geburtstage')}
                    disabled={loading || bdayCount === 0}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-pink-500/30 text-left transition-all cursor-pointer disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 text-pink-400 font-bold text-xs">
                      <Cake size={14} />
                      <span>Geburtstage ({bdayCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Spieler & Staff</p>
                  </button>

                  <button
                    onClick={() => syncEventBatch(allSyncableEvents.filter(e => e.category === 'jahresplan'), 'Jahresplanung')}
                    disabled={loading || jahresplanCount === 0}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-purple-500/30 text-left transition-all cursor-pointer disabled:opacity-40"
                  >
                    <div className="flex items-center gap-1.5 text-purple-400 font-bold text-xs">
                      <CalendarDays size={14} />
                      <span>Jahresplan ({jahresplanCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Vereinsevents & Camps</p>
                  </button>

                  <button
                    onClick={() => syncEventBatch(allSyncableEvents.filter(e => e.category === 'sitzung'), 'Team-Sitzungen')}
                    disabled={loading || sitzungCount === 0}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-amber-500/30 text-left transition-all cursor-pointer disabled:opacity-40 col-span-2 sm:col-span-1"
                  >
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                      <Users size={14} />
                      <span>Sitzungen ({sitzungCount})</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Besprechungen</p>
                  </button>
                </div>
              </div>

              {/* Toggle Manual Custom Event Form */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus size={15} className="text-amber-600" />
                  <span>Manuell einzelnen Termin eintragen</span>
                </button>
              </div>

              {/* Add Custom Event Form */}
              {showAddForm && (
                <form onSubmit={handleCreateCustomEvent} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                  <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Neuen Google Kalender Termin erstellen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Titel / Event</label>
                      <input
                        type="text"
                        required
                        placeholder="z. B. FC Auggen Taktik-Sitzung"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Ort</label>
                      <input
                        type="text"
                        placeholder="Stadion Auggen"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Datum</label>
                      <input
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Von</label>
                        <input
                          type="time"
                          value={eventStartTime}
                          onChange={(e) => setEventStartTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Bis</label>
                        <input
                          type="time"
                          value={eventEndTime}
                          onChange={(e) => setEventEndTime(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Beschreibung</label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg focus:outline-none focus:border-amber-600"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !summary.trim()}
                      className="px-4 py-1.5 bg-amber-600 text-white text-xs font-black rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send size={12} />
                      <span>Termin eintragen</span>
                    </button>
                  </div>
                </form>
              )}

              {/* App Events Sync Preview List */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <CalendarCheck size={15} className="text-amber-600" />
                    Vorschau: Alle Vereins- & Spieltermine ({filteredSyncableEvents.length})
                  </h3>

                  {/* Category Filter Chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedCategory === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Alle ({allSyncableEvents.length})
                    </button>
                    <button
                      onClick={() => setSelectedCategory('spiel')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedCategory === 'spiel' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      }`}
                    >
                      Spiele ({matchesCount})
                    </button>
                    <button
                      onClick={() => setSelectedCategory('training')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedCategory === 'training' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      Training ({trainingCount})
                    </button>
                    <button
                      onClick={() => setSelectedCategory('geburtstag')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedCategory === 'geburtstag' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-800 hover:bg-pink-100'
                      }`}
                    >
                      Geburtstage ({bdayCount})
                    </button>
                    <button
                      onClick={() => setSelectedCategory('jahresplan')}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                        selectedCategory === 'jahresplan' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                      }`}
                    >
                      Jahresplan ({jahresplanCount})
                    </button>
                  </div>
                </div>

                {filteredSyncableEvents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                    Keine Termine in dieser Kategorie gefunden.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {filteredSyncableEvents.map((item) => {
                      const isSynced = syncedItemIds[item.id];
                      let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-300';
                      let icon = <CalendarIcon size={12} />;

                      if (item.category === 'spiel') {
                        badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                        icon = <Trophy size={12} />;
                      } else if (item.category === 'training') {
                        badgeStyle = 'bg-blue-100 text-blue-800 border-blue-300';
                        icon = <Dumbbell size={12} />;
                      } else if (item.category === 'geburtstag') {
                        badgeStyle = 'bg-pink-100 text-pink-800 border-pink-300';
                        icon = <Cake size={12} />;
                      } else if (item.category === 'jahresplan') {
                        badgeStyle = 'bg-purple-100 text-purple-800 border-purple-300';
                        icon = <CalendarDays size={12} />;
                      } else if (item.category === 'sitzung') {
                        badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
                        icon = <Users size={12} />;
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${badgeStyle}`}>
                                {icon}
                                <span>{item.category}</span>
                              </span>
                              <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                              <span className="font-bold text-slate-700 flex items-center gap-1">
                                <Clock size={12} className="text-amber-600" />
                                {item.date} {item.isAllDay ? '(Ganztägig)' : `• ${item.startTime || '15:00'} Uhr`}
                              </span>
                              {item.location && (
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin size={12} />
                                  {item.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={() => syncSingleEvent(item)}
                            disabled={loading}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                              isSynced
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-2xs'
                            }`}
                          >
                            {isSynced ? (
                              <>
                                <Check size={14} />
                                <span>Übertragen</span>
                              </>
                            ) : (
                              <>
                                <Send size={12} />
                                <span>In Kalender eintragen</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Existing Google Calendar Live List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <CalendarIcon size={14} className="text-amber-600" />
                    Aktuelle Termine im Google Kalender ({events.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadEvents(token)}
                      disabled={loading}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Aktualisieren"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50"
                    >
                      <LogOut size={12} />
                      <span>Trennen</span>
                    </button>
                  </div>
                </div>

                {events.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                    {loading ? 'Termine werden geladen...' : 'Keine anstehenden Termine im Google Kalender gefunden.'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {events.map((evt) => {
                      const startDate = evt.start?.dateTime ? new Date(evt.start.dateTime) : evt.start?.date ? new Date(evt.start.date) : null;
                      const formattedDate = startDate ? startDate.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
                      const formattedTime = startDate && evt.start?.dateTime ? startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Ganztägig';

                      return (
                        <div key={evt.id} className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-amber-400 transition-all flex items-center justify-between gap-3">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{evt.summary}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 font-semibold">
                              <span className="flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                                <Clock size={12} />
                                {formattedDate} • {formattedTime}
                              </span>
                              {evt.location && (
                                <span className="flex items-center gap-1 text-slate-600 truncate max-w-xs">
                                  <MapPin size={12} className="shrink-0" />
                                  {evt.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {evt.htmlLink && (
                              <a
                                href={evt.htmlLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="In Google Kalender öffnen"
                              >
                                <ExternalLink size={14} />
                              </a>
                            )}
                            <button
                              onClick={() => setEventToDelete(evt)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Termin löschen"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>CoCoach</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>

      {/* Delete Confirmation Sub-Dialog (MANDATORY per Workspace integration rule) */}
      {eventToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-black text-slate-900">Termin löschen?</h3>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Möchtest du den Termin <strong className="text-slate-900">"{eventToDelete.summary}"</strong> wirklich aus deinem Google Kalender entfernen?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteEvent}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {loading ? 'Lösche...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
