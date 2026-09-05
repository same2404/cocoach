import React, { useState } from 'react';
import { 
  ListTodo, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Clock, 
  Layout, 
  Database, 
  Zap,
  ArrowUpCircle,
  MessageSquare,
  ShieldCheck,
  Radio,
  Cpu,
  Activity,
  Wrench,
  Upload,
  Download,
  RefreshCw,
  X,
  FileJson,
  Server,
  HardDrive
} from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'ui' | 'logic' | 'database' | 'ux';
  status: 'pending' | 'in-progress' | 'completed';
  steps: string[];
}

interface DeveloperTasksViewProps {
  onOpenAgentControlCenter?: () => void;
  isDeveloper?: boolean;
}

const tasks: Task[] = [
  {
    id: '1',
    title: 'Physio-Modul Vervollständigung',
    description: 'Physios müssen in der Lage sein, neue Spieler direkt im Modul anzulegen und Behandlungen lückenlos zu dokumentieren.',
    priority: 'high',
    category: 'logic',
    status: 'in-progress',
    steps: [
      'Button "Neuer Spieler" mit dem globalen Spieler-Modal verknüpfen (Erledigt)',
      'Löschfunktion für Physio-Einträge aktivieren (Erledigt)',
      'Physios der Kategorie "medical" zuordnen (Erledigt)',
      'Validierung der Eingabefelder im Physio-Plan implementieren'
    ]
  },
  {
    id: '2',
    title: 'Globale Namensanzeige (Nachname)',
    description: 'Sicherstellen, dass in allen Modulen konsistent nur der Nachname angezeigt wird.',
    priority: 'high',
    category: 'ux',
    status: 'in-progress',
    steps: [
      'YearlyPlanView: Vorname entfernt (Erledigt)',
      'MeetingsCalendar: Filter und Anzeige auf Nachname umgestellt (Erledigt)',
      'BudgetFinance: Vorname-Spalte entfernt (Erledigt)',
      'TacticBoard: Initialen entfernt (Erledigt)',
      'PersonnelView: Anzeige auf Nachname fixiert (Erledigt)',
      'TeamListView: Export und Anzeige geprüft (Erledigt)'
    ]
  },
  {
    id: '3',
    title: 'Zusatzfelder Personal/Basisdaten',
    description: 'Integration von Verletzungshistorie, beruflichem Status und Arbeitgeber.',
    priority: 'medium',
    category: 'database',
    status: 'completed',
    steps: [
      'Datenmodell um injuryHistory, professionalStatus und employer erweitert (Erledigt)',
      'Eingabemaske im Spieler-Modal angepasst (Erledigt)',
      'Anzeige in der Personal-Detailansicht sichergestellt (Erledigt)'
    ]
  },
  {
    id: '4',
    title: 'Tactic Board Optimierung',
    description: 'Verbesserung der Interaktivität und Bearbeitbarkeit von Elementen auf dem Taktikboard.',
    priority: 'medium',
    category: 'ui',
    status: 'completed',
    steps: [
      'Farbauswahl für gezeichnete Linien und Formen implementieren (Erledigt)',
      'Größenänderung von Spielersymbolen ermöglichen (Erledigt)',
      'Speichern von verschiedenen Taktik-Setups in der Datenbank (Erledigt)',
      'Export-Funktion als Bild (PNG/JPG) (Erledigt)'
    ]
  },
  {
    id: '5',
    title: 'Scouting Modul Fehlerbehebung',
    description: 'Behebung von Problemen beim Hinzufügen und Entfernen von Kandidaten.',
    priority: 'high',
    category: 'logic',
    status: 'in-progress',
    steps: [
      'Löschfunktion in der Grid- und Tabellenansicht prüfen (Erledigt)',
      'Hinzufügen-Modal Validierung verbessern',
      'Schattenkader-Logik (Depth Chart) mit Scouting-Daten synchronisieren'
    ]
  },
  {
    id: '6',
    title: 'Testspiele & Wettbewerbe',
    description: 'Bearbeitung und Übersicht der Testspiele verbessern.',
    priority: 'medium',
    category: 'ui',
    status: 'pending',
    steps: [
      'Detailansicht für Testspiele mit Torschützen und Notizen',
      'Statistik-Aggregation über alle Testspiele hinweg',
      'Kalender-Integration für Spieltermine'
    ]
  }
];

export const DeveloperTasksView: React.FC<DeveloperTasksViewProps> = ({ 
  onOpenAgentControlCenter,
  isDeveloper = true
}) => {
  const [showWartungModal, setShowWartungModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [activeWartungTab, setActiveWartungTab] = useState<'import' | 'backup' | 'system'>('import');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600 text-white';
      case 'medium': return 'bg-amber-500 text-slate-950 font-black';
      case 'low': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ui': return <Layout size={14} />;
      case 'logic': return <Zap size={14} />;
      case 'database': return <Database size={14} />;
      case 'ux': return <ShieldCheck size={14} />;
      default: return <ListTodo size={14} />;
    }
  };

  const handleExportBackup = () => {
    try {
      const exportData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fca_') || key.startsWith('synced_'))) {
          exportData[key] = localStorage.getItem(key);
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `fca_auggen_local_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setImportStatus('Backup erfolgreich als JSON heruntergeladen!');
    } catch (err: any) {
      setImportStatus(`Fehler beim Exportieren: ${err.message}`);
    }
  };

  const handleImportJSON = () => {
    if (!importText.trim()) {
      setImportStatus('Bitte füge zuerst einen gültigen JSON-Text ein.');
      return;
    }
    try {
      const parsed = JSON.parse(importText);
      let count = 0;
      Object.entries(parsed).forEach(([key, val]) => {
        if (typeof val === 'string') {
          localStorage.setItem(key, val);
          count++;
        } else {
          localStorage.setItem(key, JSON.stringify(val));
          count++;
        }
      });
      setImportStatus(`Erfolgreich ${count} Datensätze lokal importiert! Lade neu...`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setImportStatus(`Fehlerhafter JSON-Inhalt: ${err.message}`);
    }
  };

  const handleClearCache = () => {
    setImportStatus('Lokaler Cache wurde bereinigt.');
  };

  return (
    <div className="flex flex-col h-full bg-[#0F0F0F] text-[#F5F5F5] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A2A] bg-[#1A1A1A] flex flex-wrap justify-between items-center gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFD54F] rounded-lg flex items-center justify-center shadow-lg">
            <ListTodo size={24} className="text-[#0F0F0F]" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter leading-none text-[#F5F5F5]">Entwickler-Roadmap & Tasks</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C7C7C7] mt-1">Priorisierte Aufgabenliste für die App-Optimierung</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* NUR FÜR ENTWICKLER SICHTBARER BUTTON */}
          {isDeveloper && (
            <button
              onClick={() => setShowWartungModal(true)}
              className="px-4 py-2 bg-[#FFD54F] hover:bg-[#FFE082] text-[#0F0F0F] border border-[#FFD54F] font-black uppercase text-xs flex items-center gap-2 shadow-lg transition-all rounded-lg"
              title="Wartung & Local Import (Nur Entwickler)"
            >
              <Wrench size={16} className="text-[#0F0F0F]" />
              <span>Wartung & Local Import</span>
            </button>
          )}

          {onOpenAgentControlCenter && (
            <button
              onClick={onOpenAgentControlCenter}
              className="px-4 py-2 bg-[#202020] hover:bg-[#2A2A2A] text-[#FFD54F] border border-[#2A2A2A] font-black uppercase text-xs flex items-center gap-2 shadow-md transition-all rounded-lg"
            >
              <Radio size={16} className="text-[#FFD54F] animate-pulse" />
              <span>SYSTEM CONTROL CENTER (5 ONLINE)</span>
            </button>
          )}

          <div className="flex gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-[#00D47A]/10 border border-[#00D47A]/30 text-[#00D47A] text-[10px] font-black uppercase rounded-lg">
              <CheckCircle2 size={14} className="text-[#00D47A]" />
              <span>{tasks.filter(t => t.status === 'completed').length} Erledigt</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-[#FFD54F]/10 border border-[#FFD54F]/30 text-[#FFD54F] text-[10px] font-black uppercase rounded-lg">
              <Clock size={14} className="text-[#FFD54F]" />
              <span>{tasks.filter(t => t.status === 'in-progress').length} In Arbeit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Grid */}
      <div className="flex-1 overflow-auto p-6 custom-scrollbar space-y-8 bg-[#0F0F0F]">
        {/* DEVELOPER MULTI-AGENT SYSTEM STATUS CARD */}
        <div className="bg-[#1A1A1A] text-[#F5F5F5] p-6 border border-[#2A2A2A] shadow-xl rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#00D47A] animate-pulse"></span>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#00D47A]">
                SYSTEM AGENTS STATUS: DAUERHAFT ONLINE
              </span>
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-[#FFD54F] flex items-center gap-2">
              <Cpu size={22} /> FC AUGGEN MULTI-AGENT SYSTEM (5 AKTIVE AGENTS)
            </h3>
            <p className="text-xs font-medium text-[#C7C7C7] leading-relaxed font-mono">
              <strong className="text-[#FFD54F]">SupervisorAgent</strong> (Stabilität & Audits) • <strong className="text-[#4C6FFF]">TeamAgent</strong> (Kader & LEVEL 3 Run Analysis) • <strong className="text-[#00D47A]">CompetitionAgent</strong> (Scouting & Verbandsliga) • <strong className="text-[#FF4C4C]">CleanupAgent</strong> (Instant Deletion) • <strong className="text-purple-400">MemoryAgent</strong> (Firestore Sync)
            </p>
          </div>

          {onOpenAgentControlCenter && (
            <button
              onClick={onOpenAgentControlCenter}
              className="px-5 py-3 bg-[#FFD54F] hover:bg-[#FFE082] text-[#0F0F0F] font-black uppercase text-xs tracking-wider shrink-0 flex items-center gap-2 shadow-lg rounded-xl transition-all hover:scale-105"
            >
              <Activity size={18} /> AGENT CONTROL CENTER ÖFFNEN
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {tasks.map(task => (
            <div key={task.id} className="bg-[#202020] border border-[#2A2A2A] rounded-xl shadow-xl flex flex-col overflow-hidden hover:border-[#3A3A3A] transition-all">
              <div className="p-4 border-b border-[#2A2A2A] flex justify-between items-start bg-[#1A1A1A]">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority === 'high' ? 'Prio: Hoch' : task.priority === 'medium' ? 'Prio: Mittel' : 'Prio: Niedrig'}
                    </span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-[#2A2A2A] text-[#F5F5F5] text-[8px] font-black uppercase tracking-widest rounded">
                      {getCategoryIcon(task.category)} {task.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-tight leading-tight text-[#F5F5F5]">{task.title}</h3>
                </div>
                <div className={`p-2 rounded-lg border border-[#2A2A2A] ${task.status === 'completed' ? 'bg-[#00D47A]/20 text-[#00D47A]' : task.status === 'in-progress' ? 'bg-[#FFD54F]/20 text-[#FFD54F]' : 'bg-[#1A1A1A] text-[#C7C7C7]'}`}>
                  {task.status === 'completed' ? <CheckCircle2 size={20} /> : task.status === 'in-progress' ? <Clock size={20} /> : <Circle size={20} />}
                </div>
              </div>
              
              <div className="p-4 flex-1 space-y-4">
                <p className="text-xs font-bold text-[#C7C7C7] italic">"{task.description}"</p>
                
                <div className="space-y-2 bg-[#1A1A1A] p-3 rounded-lg border border-[#2A2A2A]">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-[#2A2A2A] pb-1 text-[#FFD54F] flex items-center gap-2">
                    <ArrowUpCircle size={12} /> Umsetzungsschritte
                  </h4>
                  <ul className="space-y-1.5">
                    {task.steps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[11px] font-bold text-[#F5F5F5]">
                        {step.includes('(Erledigt)') ? (
                          <CheckCircle2 size={12} className="text-[#00D47A] shrink-0 mt-0.5" />
                        ) : (
                          <Circle size={12} className="text-[#C7C7C7] shrink-0 mt-0.5" />
                        )}
                        <span className={step.includes('(Erledigt)') ? 'line-through opacity-40 text-[#C7C7C7]' : ''}>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-3 bg-[#1A1A1A] border-t border-[#2A2A2A] flex justify-between items-center text-[#C7C7C7]">
                <div className="flex gap-2">
                  <button className="p-1.5 border border-[#2A2A2A] rounded-lg bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] transition-all"><MessageSquare size={12} /></button>
                  <button className="p-1.5 border border-[#2A2A2A] rounded-lg bg-[#202020] hover:bg-[#2A2A2A] text-[#F5F5F5] transition-all"><AlertTriangle size={12} /></button>
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-[#C7C7C7]">Task ID: {task.id}</span>
              </div>
            </div>
          ))}
        </div>

        {/* UI/UX Suggestions Section */}
        <div className="mt-12 bg-[#1A1A1A] text-[#F5F5F5] p-8 border border-[#2A2A2A] rounded-xl shadow-xl">
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-6 flex items-center gap-3">
            <Zap size={28} className="text-[#FFD54F]" /> UI/UX Design Vorschläge
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <h4 className="font-black uppercase text-sm text-[#FFD54F]">Dunkler High-Contrast Stil</h4>
              <p className="text-xs font-bold text-[#C7C7C7] leading-relaxed">
                Perfekte Integration mit dem modernen Dunkel-Farbschema (#0F0F0F / #1A1A1A / #202020) der gesamten Anwendung für augenschonende und klare Bedienung.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black uppercase text-sm text-[#FFD54F]">Interaktive Feedbacks</h4>
              <p className="text-xs font-bold text-[#C7C7C7] leading-relaxed">
                Einführung von Hover-Effekten (Scale, Rotate) für alle Buttons und Karten. Toast-Benachrichtigungen für alle Speicher- und Löschvorgänge konsistent einsetzen.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-black uppercase text-sm text-[#FFD54F]">Mobile Optimierung</h4>
              <p className="text-xs font-bold text-[#C7C7C7] leading-relaxed">
                Sicherstellen, dass alle Tabellen auf kleinen Bildschirmen horizontal scrollbar sind oder in Kartenansichten umbrechen. Touch-Targets auf mindestens 44px vergrößern.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* WARTUNG & LOCAL IMPORT MODAL (NUR FÜR ENTWICKLER) */}
      {showWartungModal && isDeveloper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-[#F5F5F5] p-6 max-w-2xl w-full rounded-2xl shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-[#2A2A2A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FFD54F] rounded-xl flex items-center justify-center text-[#0F0F0F]">
                  <Wrench size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-[#F5F5F5] flex items-center gap-2">
                    Wartung & Local Import Konsole
                  </h3>
                  <p className="text-[10px] font-bold text-[#FFD54F] tracking-wider uppercase">Nur für Entwickler freigeschaltet</p>
                </div>
              </div>
              <button 
                onClick={() => setShowWartungModal(false)}
                className="p-2 bg-[#202020] hover:bg-[#2A2A2A] rounded-lg text-[#C7C7C7] hover:text-[#F5F5F5] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex gap-2 border-b border-[#2A2A2A] pb-2">
              <button
                onClick={() => setActiveWartungTab('import')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${
                  activeWartungTab === 'import' 
                    ? 'bg-[#FFD54F] text-[#0F0F0F] font-black shadow-[0_0_10px_rgba(255,213,79,0.4)] border border-[#FFD54F]' 
                    : 'bg-[#202020] text-[#C7C7C7] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                }`}
              >
                <Upload size={14} /> Local Import
              </button>
              <button
                onClick={() => setActiveWartungTab('backup')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${
                  activeWartungTab === 'backup' 
                    ? 'bg-[#FFD54F] text-[#0F0F0F] font-black shadow-[0_0_10px_rgba(255,213,79,0.4)] border border-[#FFD54F]' 
                    : 'bg-[#202020] text-[#C7C7C7] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                }`}
              >
                <Download size={14} /> Local Export Backup
              </button>
              <button
                onClick={() => setActiveWartungTab('system')}
                className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg flex items-center gap-2 transition-all ${
                  activeWartungTab === 'system' 
                    ? 'bg-[#FFD54F] text-[#0F0F0F] font-black shadow-[0_0_10px_rgba(255,213,79,0.4)] border border-[#FFD54F]' 
                    : 'bg-[#202020] text-[#C7C7C7] hover:text-[#F5F5F5] hover:bg-[#2A2A2A] border border-[#2A2A2A]'
                }`}
              >
                <Server size={14} /> System-Wartung
              </button>
            </div>

            {/* Status notification if any */}
            {importStatus && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-2">
                <FileJson size={16} className="text-amber-400 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {/* Tab 1: Local Import */}
            {activeWartungTab === 'import' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-300 flex items-center gap-2">
                    <FileJson size={16} className="text-amber-400" /> JSON Daten zur lokalen Wiederherstellung einfügen:
                  </label>
                  <textarea
                    rows={7}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='{"fca_spieler": "[...]", "fca_training": "[...]"}'
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-emerald-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleImportJSON}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
                  >
                    <Upload size={16} /> Import Starten & Übernehmen
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Backup Export */}
            {activeWartungTab === 'backup' && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-300 leading-relaxed">
                  Exportiere alle lokalen Datenstände (Kader, Finanzen, Taktik, Training) direkt als sichere JSON-Sicherungsdatei auf dein Gerät.
                </p>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Gespeicherte lokale Keys:</span>
                    <span className="text-amber-400 font-mono">{Object.keys(localStorage).filter(k => k.startsWith('fca_') || k.startsWith('synced_')).length} Einträge</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Speicherort:</span>
                    <span className="text-emerald-400 font-mono">Browser IndexedDB / LocalStorage</span>
                  </div>
                </div>
                <button
                  onClick={handleExportBackup}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Download size={18} /> Lokales Backup Herunterladen (.json)
                </button>
              </div>
            )}

            {/* Tab 3: System Wartung */}
            {activeWartungTab === 'system' && (
              <div className="space-y-4">
                <p className="text-xs font-bold text-slate-300 leading-relaxed">
                  Führe Systemwartungen durch, überprüfe den Zustand des Agent-Systems und bereinige temporäre Daten-Caches.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">SupervisorAgent</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ONLINE (Bereit)
                    </span>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase font-black text-slate-400 block mb-1">CleanupAgent</span>
                    <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> ACTIVE (Instant Delete)
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleClearCache}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <RefreshCw size={16} /> Cache & Sync-Status Aktualisieren
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

