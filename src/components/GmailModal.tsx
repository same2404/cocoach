import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Inbox, 
  FileText, 
  Users, 
  ShieldAlert,
  LogOut,
  Sparkles,
  Search,
  UserCheck,
  UserPlus,
  Check,
  Filter,
  Building,
  User,
  CheckSquare,
  Square
} from 'lucide-react';
import { 
  googleSignInGmail, 
  getCachedGmailToken, 
  setCachedGmailToken, 
  listGmailMessages, 
  sendGmailMessage, 
  trashGmailMessage, 
  GmailMessageSummary 
} from '../services/gmailService';

interface GmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: any[];
  matches?: any[];
}

export interface FCContact {
  id: string;
  name: string;
  role: string;
  category: 'spieler' | 'funktionaer';
  email: string;
  number?: number | string;
}

export const GmailModal: React.FC<GmailModalProps> = ({
  isOpen,
  onClose,
  players = [],
  matches = []
}) => {
  const [token, setToken] = useState<string | null>(getCachedGmailToken());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'inbox'>('compose');
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compose Form state
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Contacts picker states
  const [contactSearch, setContactSearch] = useState('');
  const [contactFilter, setContactFilter] = useState<'all' | 'spieler' | 'funktionaer'>('all');
  const [showContactPicker, setShowContactPicker] = useState(true);

  // Confirmation dialog state for sending email (MANDATORY for mutating user data)
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);

  // Confirmation dialog state for deleting email (MANDATORY for deleting user data)
  const [msgToDelete, setMsgToDelete] = useState<GmailMessageSummary | null>(null);

  useEffect(() => {
    if (token && isOpen && activeTab === 'inbox') {
      loadMessages(token);
    }
  }, [token, isOpen, activeTab]);

  const loadMessages = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const msgs = await listGmailMessages(authToken, 'FC Auggen');
      setMessages(msgs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Laden der E-Mails.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token: newTok } = await googleSignInGmail();
      setToken(newTok);
      setSuccessMsg('Erfolgreich mit Gmail verbunden!');
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
    setCachedGmailToken(null);
    setToken(null);
    setMessages([]);
    setSuccessMsg('Verbindung zu Gmail getrennt.');
  };

  // Extract / Normalize FC Auggen Contacts (Spieler & Funktionäre)
  const getFCContacts = (): FCContact[] => {
    const list: FCContact[] = [
      { id: 'off_vorstand', name: 'FC Auggen 1926 e.V. Vorstand', role: 'Vorstand & Geschäftsstelle', category: 'funktionaer', email: 'vorstand@fc-auggen.de' },
      { id: 'off_sportleiter', name: 'Sportliche Leitung FC Auggen', role: 'Sportlicher Leiter', category: 'funktionaer', email: 'sportleiter@fc-auggen.de' },
      { id: 'off_finanzen', name: 'Finanzen & Sponsoring', role: 'Schatzmeister / Finanzen', category: 'funktionaer', email: 'finanzen@fc-auggen.de' },
      { id: 'off_jugend', name: 'Jugendleitung & Nachwuchs', role: 'Jugendleiter NLZ', category: 'funktionaer', email: 'jugend@fc-auggen.de' }
    ];

    players.forEach((p, idx) => {
      const isStaff = p.category === 'staff' || p.category === 'coach' || p.category === 'official' || p.category === 'medical';
      const fullName = p.firstName && p.lastName 
        ? `${p.firstName} ${p.lastName}`
        : (p.name || `Mitglied ${p.number || idx + 1}`);

      let email = p.email?.trim();
      if (!email) {
        const cleanFirst = (p.firstName || p.name || 'spieler').toLowerCase().trim()
          .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'');
        const cleanLast = (p.lastName || '').toLowerCase().trim()
          .replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss').replace(/[^a-z0-9]/g,'');
        email = cleanLast ? `${cleanFirst}.${cleanLast}@fc-auggen.de` : `${cleanFirst}@fc-auggen.de`;
      }

      list.push({
        id: p.id || `p_${idx}`,
        name: fullName,
        role: p.position ? `${p.position}` : (isStaff ? 'Funktionär' : 'Spieler'),
        category: isStaff ? 'funktionaer' : 'spieler',
        email: email.toLowerCase(),
        number: p.number || p.nummer
      });
    });

    return list;
  };

  const allContacts = getFCContacts();
  const spielerContacts = allContacts.filter(c => c.category === 'spieler');
  const funktionaerContacts = allContacts.filter(c => c.category === 'funktionaer');

  // Currently selected emails
  const selectedEmails = recipient
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

  const isEmailSelected = (email: string) => selectedEmails.includes(email.toLowerCase());

  const toggleContactEmail = (emailToToggle: string) => {
    const norm = emailToToggle.toLowerCase().trim();
    if (!norm) return;
    if (selectedEmails.includes(norm)) {
      const updated = selectedEmails.filter(e => e !== norm);
      setRecipient(updated.join(', '));
    } else {
      const updated = [...selectedEmails, norm];
      setRecipient(updated.join(', '));
    }
  };

  const removeEmail = (emailToRemove: string) => {
    const updated = selectedEmails.filter(e => e !== emailToRemove.toLowerCase());
    setRecipient(updated.join(', '));
  };

  const applyAllSpieler = () => {
    const spielerEmails = spielerContacts.map(c => c.email);
    const merged = Array.from(new Set([...selectedEmails, ...spielerEmails]));
    setRecipient(merged.join(', '));
    setSuccessMsg(`${spielerEmails.length} Spieler E-Mail-Adressen eingefügt.`);
  };

  const applyAllFunktionaere = () => {
    const funkEmails = funktionaerContacts.map(c => c.email);
    const merged = Array.from(new Set([...selectedEmails, ...funkEmails]));
    setRecipient(merged.join(', '));
    setSuccessMsg(`${funkEmails.length} Funktionärs E-Mail-Adressen eingefügt.`);
  };

  const applyAllContacts = () => {
    const allEmails = allContacts.map(c => c.email);
    const merged = Array.from(new Set([...selectedEmails, ...allEmails]));
    setRecipient(merged.join(', '));
    setSuccessMsg(`Alle ${allEmails.length} Vereins E-Mail-Adressen eingefügt.`);
  };

  const clearRecipients = () => {
    setRecipient('');
    setSuccessMsg('Empfängerliste geleert.');
  };

  // Filter contacts by search and category
  const filteredContacts = allContacts.filter(c => {
    const matchesCategory = 
      contactFilter === 'all' ||
      (contactFilter === 'spieler' && c.category === 'spieler') ||
      (contactFilter === 'funktionaer' && c.category === 'funktionaer');

    const searchLower = contactSearch.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      c.name.toLowerCase().includes(searchLower) ||
      c.role.toLowerCase().includes(searchLower) ||
      c.email.toLowerCase().includes(searchLower);

    return matchesCategory && matchesSearch;
  });

  // Quick Template Injectors
  const applySquadCallupTemplate = () => {
    const nextMatch = matches[0] || { opponent: 'Verbandsliga Gegner', date: 'Kommendes Wochenende', location: 'Lettenpark Auggen' };
    setSubject(`[FC Auggen] Kaderberufung & Spieltags-Info: FC Auggen vs. ${nextMatch.opponent || 'Gegner'}`);
    setBodyText(`Hallo Team,

hiermit erhaltet ihr die offiziellen Informationen und das Kaderaufgebot für das anstehende Verbandsliga-Spiel.

DETAILS ZUM SPIEL:
- Spiel: FC Auggen vs. ${nextMatch.opponent || nextMatch.gast || 'Gegner'}
- Datum/Zeit: ${nextMatch.date || nextMatch.datum || 'Samstag'} um ${nextMatch.time || '15:30 Uhr'}
- Treffpunkt: Kabine Lettenpark Auggen (1,5 Stunden vor Anpfiff)

KADERAUFGEBOT:
Alle nominierten Spieler haben sich pünktlich und in kompletter Vereinskleidung einzufinden. Bei Verhinderung oder gesundheitlichen Beschwerden ist umgehend das Trainerteam zu informieren.

Mit sportlichen Grüßen,
Trainerteam FC Auggen 1926 e.V.`);
  };

  const applyTacticalReportTemplate = () => {
    setSubject(`[FC Auggen Taktik] Analyse & Ausrichtung - Matchday Prep`);
    setBodyText(`Liebe Spieler,

anbei erhaltet ihr den taktischen Leitfaden für unser kommendes Meisterschaftsspiel:

TAKTISCHER SCHWERPUNKT:
1. Hohes Pressing & Kompaktheit im Mittelfeld
2. Schnelle Umschaltmomente nach Ballgewinn
3. Disziplinierte Absicherung bei gegnerischen Standards

Bitte schaut euch die Notizen aufmerksam an. Morgen im Abschlusstraining gehen wir die Abläufe auf dem Platz durch.

Viele Grüße,
Chef-Trainer FC Auggen`);
  };

  const handleSendEmailConfirmed = async () => {
    if (!token || !recipient.trim() || !subject.trim() || !bodyText.trim()) return;
    setLoading(true);
    setError(null);
    setShowSendConfirmation(false);

    try {
      const formattedBody = bodyText.replace(/\n/g, '<br/>');
      await sendGmailMessage(token, recipient.trim(), subject.trim(), formattedBody);
      setSuccessMsg(`E-Mail an (${selectedEmails.length}) Empfänger wurde erfolgreich über Gmail versendet!`);
      setRecipient('');
      setSubject('');
      setBodyText('');
    } catch (err: any) {
      setError(err.message || 'E-Mail konnte nicht gesendet werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrashConfirmed = async () => {
    if (!token || !msgToDelete) return;
    setLoading(true);
    setError(null);

    try {
      await trashGmailMessage(token, msgToDelete.id);
      setSuccessMsg('E-Mail wurde in den Papierkorb verschoben.');
      setMsgToDelete(null);
      await loadMessages(token);
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
        
        {/* Header */}
        <div className="p-5 bg-rose-950 text-white flex items-center justify-between border-b border-rose-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Gmail Center • FC Auggen
                {token && <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-full uppercase font-extrabold">Aktiv</span>}
              </h2>
              <p className="text-xs text-rose-200/80 font-medium">
                Versende Nachrichten direkt an Spieler & Funktionäre von FC Auggen
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-rose-300 hover:text-white hover:bg-rose-900 transition-colors cursor-pointer"
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
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {!token ? (
            <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700 shadow-sm">
                <Mail size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Gmail nicht verbunden</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Verbinde dein Google-Konto, um offizielle FC Auggen Nachrichten und Spieltagseinladungen direkt per E-Mail zu verschicken.
                </p>
              </div>

              {/* Google Sign In Button */}
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
                <span>Mit Google anmelden & Gmail verbinden</span>
              </button>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('compose')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'compose'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Send size={14} />
                    <span>E-Mail Verfassen</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('inbox')}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === 'inbox'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Inbox size={14} />
                    <span>Posteingang</span>
                  </button>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50"
                >
                  <LogOut size={12} />
                  <span>Trennen</span>
                </button>
              </div>

              {/* Compose Tab */}
              {activeTab === 'compose' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Verteiler-Schnellauswahl Bar */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                        <Users size={14} className="text-rose-600" />
                        Verteilergruppen Schnellauswahl (FC Auggen):
                      </p>
                      <button 
                        onClick={() => setShowContactPicker(!showContactPicker)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                      >
                        <span>{showContactPicker ? 'Kontaktsuche ausblenden' : 'Kontaktsuche einblenden'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={applyAllSpieler}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <User size={13} className="text-rose-600" />
                        <span>Alle Spieler ({spielerContacts.length})</span>
                      </button>

                      <button
                        onClick={applyAllFunktionaere}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Building size={13} className="text-rose-600" />
                        <span>Alle Funktionäre & Staff ({funktionaerContacts.length})</span>
                      </button>

                      <button
                        onClick={applyAllContacts}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Users size={13} />
                        <span>Gesamter Verein ({allContacts.length})</span>
                      </button>

                      {selectedEmails.length > 0 && (
                        <button
                          onClick={clearRecipients}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
                          <span>Leeren</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* FC Auggen Contacts Database Browser */}
                  {showContactPicker && (
                    <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black uppercase text-slate-700 tracking-wider">
                            FC Auggen Kontakte & E-Mail Adressen ({filteredContacts.length})
                          </p>
                        </div>

                        {/* Category Filter Tabs */}
                        <div className="flex items-center gap-1 bg-white p-1 border border-slate-200 rounded-lg">
                          <button
                            onClick={() => setContactFilter('all')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              contactFilter === 'all' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Alle ({allContacts.length})
                          </button>
                          <button
                            onClick={() => setContactFilter('spieler')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              contactFilter === 'spieler' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Spieler ({spielerContacts.length})
                          </button>
                          <button
                            onClick={() => setContactFilter('funktionaer')}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
                              contactFilter === 'funktionaer' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            Funktionäre ({funktionaerContacts.length})
                          </button>
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Name, Position oder E-Mail suchen..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="w-full pl-9 pr-8 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-rose-600"
                        />
                        {contactSearch && (
                          <button onClick={() => setContactSearch('')} className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>

                      {/* Contact Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                        {filteredContacts.map((contact) => {
                          const selected = isEmailSelected(contact.email);
                          return (
                            <div
                              key={contact.id}
                              onClick={() => toggleContactEmail(contact.email)}
                              className={`p-2.5 rounded-lg border text-left flex items-start justify-between gap-2 transition-all cursor-pointer select-none ${
                                selected
                                  ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-100/80 text-slate-800'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold truncate">{contact.name}</span>
                                  {contact.number ? (
                                    <span className="text-[10px] bg-slate-100 text-slate-600 font-extrabold px-1 rounded">#{contact.number}</span>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                                  <span className={`font-semibold px-1 py-0.2 rounded text-[9px] uppercase ${
                                    contact.category === 'funktionaer' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}>
                                    {contact.role}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-mono truncate mt-0.5">{contact.email}</p>
                              </div>

                              <button
                                type="button"
                                className={`p-1 rounded-md shrink-0 transition-colors ${
                                  selected ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-700'
                                }`}
                              >
                                {selected ? <Check size={12} /> : <UserPlus size={12} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recipient Input & Selected Chips */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700 uppercase flex items-center gap-1.5">
                        <Mail size={13} className="text-rose-600" />
                        Empfänger ({selectedEmails.length} E-Mails ausgewählt):
                      </label>
                    </div>

                    {/* Active Selected Recipient Chips */}
                    {selectedEmails.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                        {selectedEmails.map((email) => {
                          const contactObj = allContacts.find(c => c.email.toLowerCase() === email);
                          return (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-rose-200 text-rose-900 font-bold text-[11px] rounded-lg shadow-2xs"
                            >
                              <span>{contactObj ? contactObj.name : email}</span>
                              <button
                                onClick={() => removeEmail(email)}
                                className="text-rose-400 hover:text-rose-700 cursor-pointer ml-0.5"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="E-Mail-Adressen (durch Komma getrennt oder aus Kontakten oben wählen)"
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono font-medium border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 bg-white"
                    />
                  </div>

                  {/* Template Quick Injection */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-rose-600" />
                      Schnell-Vorlagen (FC Auggen):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={applySquadCallupTemplate}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Users size={12} className="text-rose-600" />
                        <span>Kaderberufung / Spieltag</span>
                      </button>
                      <button
                        onClick={applyTacticalReportTemplate}
                        className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText size={12} className="text-rose-600" />
                        <span>Taktikbericht / Vorbereitung</span>
                      </button>
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 uppercase">Betreff:</label>
                    <input
                      type="text"
                      placeholder="Betreff der E-Mail..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 bg-white"
                    />
                  </div>

                  {/* Body TextArea */}
                  <div className="space-y-1">
                    <label className="text-xs font-black text-slate-700 uppercase">Nachricht / Inhalt:</label>
                    <textarea
                      rows={7}
                      placeholder="Schreibe deine Nachricht..."
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="w-full p-3.5 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 bg-white"
                    />
                  </div>

                  {/* Send Button Trigger */}
                  <button
                    onClick={() => setShowSendConfirmation(true)}
                    disabled={loading || !recipient.trim() || !subject.trim() || !bodyText.trim()}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Send size={16} />
                    <span>E-Mail an ({selectedEmails.length}) Empfänger versenden</span>
                  </button>
                </div>
              )}

              {/* Inbox Tab */}
              {activeTab === 'inbox' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                      <Inbox size={14} className="text-rose-600" />
                      Aktuelle E-Mails ({messages.length})
                    </h3>
                    <button
                      onClick={() => loadMessages(token)}
                      disabled={loading}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                      title="Aktualisieren"
                    >
                      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {messages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                      {loading ? 'E-Mails werden geladen...' : 'Keine passenden E-Mails im Posteingang gefunden.'}
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-slate-100">
                      {messages.map((msg) => (
                        <div key={msg.id} className="p-3.5 hover:bg-slate-50 flex items-start justify-between gap-3 transition-colors">
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900 truncate">{msg.subject}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">{msg.date ? new Date(msg.date).toLocaleDateString('de-DE') : ''}</span>
                            </div>
                            <p className="text-[11px] text-rose-700 font-bold truncate">Von: {msg.from}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 font-medium">{msg.snippet}</p>
                          </div>

                          <button
                            onClick={() => setMsgToDelete(msg)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="E-Mail löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
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

      {/* Explicit User Confirmation for Sending Email (MANDATORY for mutating Workspace user data) */}
      {showSendConfirmation && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Send size={22} />
              </div>
              <h3 className="text-base font-black text-slate-900">E-Mail wirklich senden?</h3>
            </div>

            <div className="text-xs font-medium text-slate-600 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <p><strong className="text-slate-900">Anzahl Empfänger:</strong> {selectedEmails.length}</p>
              <p className="text-[11px] font-mono break-all line-clamp-2"><strong className="text-slate-900">Empfänger:</strong> {recipient}</p>
              <p><strong className="text-slate-900">Betreff:</strong> {subject}</p>
            </div>

            <p className="text-xs text-slate-500">
              Diese Nachricht wird direkt über dein verknüpftes Gmail-Konto versendet.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSendConfirmation(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendEmailConfirmed}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {loading ? 'Sende...' : 'Jetzt Senden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Explicit User Confirmation for Trashing Email (MANDATORY for deleting Workspace user data) */}
      {msgToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-black text-slate-900">E-Mail in Papierkorb verschieben?</h3>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Möchtest du die E-Mail <strong className="text-slate-900">"{msgToDelete.subject}"</strong> wirklich in den Gmail-Papierkorb verschieben?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setMsgToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleTrashConfirmed}
                disabled={loading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                {loading ? 'Lösche...' : 'In Papierkorb verschieben'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
