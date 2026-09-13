import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  Upload, 
  FolderPlus, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  FileText, 
  FileSpreadsheet, 
  File, 
  Folder, 
  CheckCircle2, 
  AlertCircle,
  Database,
  CloudUpload,
  LogOut
} from 'lucide-react';
import { 
  googleSignInDrive, 
  getCachedDriveToken, 
  setCachedDriveToken, 
  listDriveFiles, 
  uploadFileToDrive, 
  createDriveFolder, 
  deleteDriveFile, 
  DriveFile 
} from '../services/googleDriveService';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  appExportData?: () => any; // Function to get all app data for backup
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  appExportData
}) => {
  const [token, setToken] = useState<string | null>(getCachedDriveToken());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New folder state
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Confirm Delete state (MANDATORY: explicit user confirmation for deletion)
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);

  useEffect(() => {
    if (token && isOpen) {
      loadFiles(token);
    }
  }, [token, isOpen]);

  const loadFiles = async (authToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(authToken);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Fehler beim Laden der Google Drive Dateien.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const { token: newTok, user: u } = await googleSignInDrive();
      setToken(newTok);
      setUser(u);
      setSuccessMsg('Erfolgreich mit Google Drive verbunden!');
      await loadFiles(newTok);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        setError('Das Anmeldefenster wurde geschlossen. Klicke erneut auf "Mit Google anmelden", um dich zu verbinden.');
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
    setCachedDriveToken(null);
    setToken(null);
    setUser(null);
    setFiles([]);
    setSuccessMsg('Verbindung zu Google Drive getrennt.');
  };

  const handleCreateFolder = async () => {
    if (!token || !newFolderName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createDriveFolder(token, newFolderName.trim());
      setSuccessMsg(`Ordner "${newFolderName}" erstellt.`);
      setNewFolderName('');
      setShowFolderInput(false);
      await loadFiles(token);
    } catch (err: any) {
      setError(err.message || 'Ordner konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setLoading(true);
    setError(null);
    try {
      await uploadFileToDrive(token, file.name, file.type || 'application/octet-stream', file);
      setSuccessMsg(`Datei "${file.name}" erfolgreich auf Google Drive hochgeladen!`);
      await loadFiles(token);
    } catch (err: any) {
      setError(err.message || 'Upload fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupAppState = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = appExportData ? appExportData() : { backupTime: new Date().toISOString(), app: 'FC Auggen Analyse-System' };
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `FC_Auggen_Backup_${dateStr}.json`;
      const jsonContent = JSON.stringify(data, null, 2);

      await uploadFileToDrive(token, fileName, 'application/json', jsonContent);
      setSuccessMsg(`FC Auggen Datenbank-Backup (${fileName}) wurde in deinem Google Drive gespeichert!`);
      await loadFiles(token);
    } catch (err: any) {
      setError(err.message || 'Backup konnte nicht erstellt werden.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete || !token) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDriveFile(token, fileToDelete.id);
      setSuccessMsg(`Datei "${fileToDelete.name}" gelöscht.`);
      setFileToDelete(null);
      await loadFiles(token);
    } catch (err: any) {
      setError(err.message || 'Löschen fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <HardDrive size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Google Drive Integration
                {token && <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full uppercase font-extrabold">Aktiv</span>}
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Sichere FC Auggen Daten, Spielberichte & Medien direkt in deinem Google Drive
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Connection Status Section */}
          {!token ? (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-inner">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 shadow-sm">
                <HardDrive size={32} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900">Google Drive nicht verbunden</h3>
                <p className="text-xs text-slate-600 font-medium">
                  Verbinde dein Google-Konto, um Backups, Taktikanalysen und FC Auggen Dateien direkt mit deiner Cloud zu synchronisieren.
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
                <span>Mit Google anmelden & Drive verbinden</span>
              </button>
            </div>
          ) : (
            <>
              {/* Actions & Backup Toolbar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={handleBackupAppState}
                  disabled={loading}
                  className="p-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <CloudUpload size={16} />
                  <span>Kader- & System-Backup speichern</span>
                </button>

                <label className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer">
                  <Upload size={16} className="text-teal-600" />
                  <span>Datei hochladen</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={loading} />
                </label>

                <button
                  onClick={() => setShowFolderInput(!showFolderInput)}
                  className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <FolderPlus size={16} className="text-teal-600" />
                  <span>Neuer Ordner</span>
                </button>
              </div>

              {/* Folder Input Drawer */}
              {showFolderInput && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 animate-fade-in">
                  <input
                    type="text"
                    placeholder="Ordnername (z. B. FC Auggen Taktik)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-bold border border-slate-300 rounded-lg focus:outline-none focus:border-teal-600"
                  />
                  <button
                    onClick={handleCreateFolder}
                    disabled={loading || !newFolderName.trim()}
                    className="px-3 py-1.5 bg-teal-600 text-white text-xs font-black rounded-lg hover:bg-teal-700 disabled:opacity-50"
                  >
                    Erstellen
                  </button>
                  <button onClick={() => setShowFolderInput(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Files List Header */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2">
                  <Database size={14} className="text-teal-600" />
                  Deine Google Drive Dateien ({files.length})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadFiles(token)}
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

              {/* Files Table / Cards */}
              {files.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs font-medium">
                  {loading ? 'Dateien werden geladen...' : 'Keine Dateien im Google Drive gefunden.'}
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3 w-28">Typ</th>
                        <th className="p-3 w-32">Erstellt</th>
                        <th className="p-3 text-right w-24">Aktion</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {files.map((file) => {
                        const isFolder = file.mimeType.includes('folder');
                        const isJson = file.mimeType.includes('json');
                        const isSheet = file.mimeType.includes('spreadsheet');

                        return (
                          <tr key={file.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-bold flex items-center gap-2.5">
                              {isFolder ? (
                                <Folder size={16} className="text-amber-500 shrink-0" />
                              ) : isJson ? (
                                <FileText size={16} className="text-teal-600 shrink-0" />
                              ) : isSheet ? (
                                <FileSpreadsheet size={16} className="text-emerald-600 shrink-0" />
                              ) : (
                                <File size={16} className="text-slate-400 shrink-0" />
                              )}
                              <span className="truncate max-w-xs">{file.name}</span>
                            </td>
                            <td className="p-3 text-[10px] text-slate-500 font-semibold uppercase">
                              {isFolder ? 'Ordner' : isJson ? 'JSON / Backup' : 'Datei'}
                            </td>
                            <td className="p-3 text-[10px] text-slate-500">
                              {file.createdTime ? new Date(file.createdTime).toLocaleDateString('de-DE') : '-'}
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex p-1.5 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                                  title="In Google Drive öffnen"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                              <button
                                onClick={() => setFileToDelete(file)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Datei löschen"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 size={22} />
              </div>
              <h3 className="text-base font-black text-slate-900">Datei löschen?</h3>
            </div>
            <p className="text-xs font-medium text-slate-600">
              Möchtest du die Datei <strong className="text-slate-900">"{fileToDelete.name}"</strong> wirklich aus deinem Google Drive löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmDeleteFile}
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
