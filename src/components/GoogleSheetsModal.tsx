import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Plus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Table,
  LogOut,
  Download,
  Users,
  Calendar
} from 'lucide-react';
import { 
  googleSignInSheets, 
  getCachedSheetsToken, 
  setCachedSheetsToken, 
  listSpreadsheets, 
  createSpreadsheet, 
  exportSquadToNewSheet, 
  exportMatchesToNewSheet, 
  getSheetValues, 
  SpreadsheetFile 
} from '../services/googleSheetsService';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players?: any[];
  matches?: any[];
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  players = [],
  matches = []
}) => {
  const [token, setToken] = useState<string | null>(getCachedSheetsToken());
  const [loading, setLoading] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Custom sheet title
  const [showCustomTitle, setShowCustomTitle] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  // Selected sheet preview
  const [selectedSheet, setSelectedSheet] = useState<SpreadsheetFile | null>(null);
  const [previewValues, setPreviewValues] = useState<(string | number)[][]>([]);

  // Confirm delete state (MANDATORY: explicit user confirmation for deletion)
  const [sheetToDelete, setSheetToDelete] = useState<SpreadsheetFile | null>(null);

  useEffect(() => {
    if (token && isOpen) {
      loadSpreadsheets(token);
    }
  }, [token, isOpen]);

  const loadSpreadsheets = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const files = await listSpreadsheets(authToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Laden der Google Tabellen.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token: newTok } = await googleSignInSheets();
      setToken(newTok);
      setSuccessMsg('Erfolgreich mit Google Sheets verbunden!');
      await loadSpreadsheets(newTok);
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
    setCachedSheetsToken(null);
    setToken(null);
    setSpreadsheets([]);
    setSelectedSheet(null);
    setPreviewValues([]);
    setSuccessMsg('Verbindung zu Google Sheets getrennt.');
  };

  const handleExportSquad = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { spreadsheetUrl } = await exportSquadToNewSheet(token, players);
      setSuccessMsg('FC Auggen Kader erfolgreich in eine neue Google Tabelle exportiert!');
      await loadSpreadsheets(token);
      if (spreadsheetUrl) window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'Kader-Export fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportMatches = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const { spreadsheetUrl } = await exportMatchesToNewSheet(token, matches);
      setSuccessMsg('FC Auggen Spielplan erfolgreich in eine neue Google Tabelle exportiert!');
      await loadSpreadsheets(token);
      if (spreadsheetUrl) window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'Spielplan-Export fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomSheet = async () => {
    if (!token || !customTitle.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { spreadsheetUrl } = await createSpreadsheet(token, customTitle.trim());
      setSuccessMsg(`Tabelle "${customTitle}" wurde erstellt.`);
      setCustomTitle('');
      setShowCustomTitle(false);
      await loadSpreadsheets(token);
      if (spreadsheetUrl) window.open(spreadsheetUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'Tabelle konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewSheet = async (sheet: SpreadsheetFile) => {
    if (!token) return;
    setSelectedSheet(sheet);
    setLoading(true);
    try {
      const values = await getSheetValues(token, sheet.id, 'A1:K20');
      setPreviewValues(values);
    } catch (err: any) {
      setError(err.message || 'Vorschau konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Google Sheets Integration
                {token && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full uppercase font-extrabold">Aktiv</span>}
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                Exportiere Kaderlisten, Spielpläne & Statistiken live in deine Google Tabellen
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors cursor-pointer"
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!token ? (
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-sm">
                <FileSpreadsheet size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Google Sheets nicht verbunden</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Verbinde dein Google-Konto, um FC Auggen Kaderdaten und Spielstatistiken in Google Tabellen zu exportieren.
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
                <span>Mit Google anmelden & Sheets verbinden</span>
              </button>
            </div>
          ) : (
            <>
              {/* Export Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleExportSquad}
                  disabled={loading}
                  className="p-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Users size={20} />
                  <span>Kader-Tabelle exportieren ({players.length} Spieler)</span>
                </button>

                <button
                  onClick={handleExportMatches}
                  disabled={loading}
                  className="p-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Calendar size={20} />
                  <span>Spielplan-Tabelle exportieren ({matches.length} Spiele)</span>
                </button>

                <button
                  onClick={() => setShowCustomTitle(!showCustomTitle)}
                  className="p-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus size={20} className="text-emerald-600" />
                  <span>Neues leeres Tabellenblatt</span>
                </button>
              </div>

              {/* Custom Sheet Input Drawer */}
              {showCustomTitle && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Tabellentitel (z. B. FC Auggen Sponsoren & Budget)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    onClick={handleCreateCustomSheet}
                    disabled={loading || !customTitle.trim()}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Erstellen
                  </button>
                  <button onClick={() => setShowCustomTitle(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Existing Sheets List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                    <Table size={14} className="text-emerald-600" />
                    Vorhandene Google Tabellen ({spreadsheets.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadSpreadsheets(token)}
                      disabled={loading}
                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
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

                {spreadsheets.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                    {loading ? 'Google Tabellen werden geladen...' : 'Keine Tabellen gefunden. Erstelle jetzt deine erste Tabelle!'}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-slate-100">
                    {spreadsheets.map((sheet) => (
                      <div key={sheet.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileSpreadsheet size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{sheet.name}</p>
                            <p className="text-[10px] text-slate-500">
                              Erstellt am: {sheet.createdTime ? new Date(sheet.createdTime).toLocaleDateString('de-DE') : '-'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handlePreviewSheet(sheet)}
                            className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                          >
                            Vorschau
                          </button>
                          {sheet.webViewLink && (
                            <a
                              href={sheet.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="In Google Sheets öffnen"
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sheet Preview Section */}
              {selectedSheet && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <Table size={14} className="text-emerald-600" />
                      Vorschau: {selectedSheet.name}
                    </h4>
                    <button onClick={() => setSelectedSheet(null)} className="p-1 text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>

                  {previewValues.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">Keine Daten oder leere Tabelle.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-48 border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <tbody>
                          {previewValues.map((row, rIdx) => (
                            <tr key={rIdx} className={rIdx === 0 ? 'bg-slate-100 font-black border-b border-slate-200' : 'border-b border-slate-100'}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2 border-r border-slate-100 truncate max-w-xs">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
    </div>
  );
};
