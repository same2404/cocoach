import React, { useState, useEffect } from 'react';
import { Player, Match } from '../types';
import { 
  ShieldCheck, 
  Users, 
  Trophy, 
  Trash2, 
  Database, 
  Sparkles, 
  Activity, 
  RefreshCw, 
  CheckCircle2, 
  X, 
  Cpu, 
  Zap,
  Play,
  Lock,
  Layers,
  FileText,
  Radio,
  Clock,
  Brain,
  ListChecks,
  Loader2,
  BellRing,
  Send
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { AgentStatus, AgentLog, INITIAL_AGENTS_STATE, runMasterAgentCycle } from '../utils/agentSystemEngine';

interface AgentSystemControlCenterModalProps {
  players: Player[];
  matches?: Match[];
  analyses?: any[];
  backgroundLastCycle?: { time: number; summary: string } | null;
  onClose: () => void;
}

export const AgentSystemControlCenterModal: React.FC<AgentSystemControlCenterModalProps> = ({
  players,
  matches = [],
  analyses = [],
  backgroundLastCycle = null,
  onClose
}) => {
  const [agents, setAgents] = useState<Record<string, AgentStatus>>(INITIAL_AGENTS_STATE);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [isAutoLoopActive, setIsAutoLoopActive] = useState<boolean>(true);
  const [activeAgentTab, setActiveAgentTab] = useState<string>('ALL');
  const [monthlyReview, setMonthlyReview] = useState<string | null>(null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);

  // Trigger cycle on load
  useEffect(() => {
    const result = runMasterAgentCycle(players, matches, analyses);
    setAgents(result.updatedAgents);
    setLogs(result.logs);
  }, [players, matches, analyses]);

  // Periodic automatic re-activation loop (every 10 seconds background heartbeat)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoLoopActive) {
      interval = setInterval(() => {
        const result = runMasterAgentCycle(players, matches, analyses);
        setAgents(result.updatedAgents);
        setLogs((prev) => [...result.logs, ...prev].slice(0, 50));
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [isAutoLoopActive, players, matches, analyses]);

  const handleManualTrigger = () => {
    const result = runMasterAgentCycle(players, matches, analyses);
    setAgents(result.updatedAgents);
    setLogs((prev) => [...result.logs, ...prev].slice(0, 50));
  };

  const getAgentIcon = (id: string) => {
    switch (id) {
      case 'SupervisorAgent': return <ShieldCheck className="text-amber-400" size={20} />;
      case 'TeamAgent': return <Users className="text-blue-400" size={20} />;
      case 'CompetitionAgent': return <Trophy className="text-emerald-400" size={20} />;
      case 'CleanupAgent': return <Trash2 className="text-red-400" size={20} />;
      case 'MemoryAgent': return <Database className="text-purple-400" size={20} />;
      default: return <Cpu size={20} />;
    }
  };

  const filteredLogs = activeAgentTab === 'ALL' 
    ? logs 
    : logs.filter((l) => l.agentId === activeAgentTab);

  const selectedFindings = activeAgentTab === 'ALL'
    ? (agents.SupervisorAgent?.findings ?? [])
    : (agents[activeAgentTab]?.findings ?? []);

  const [hasTestedAlert, setHasTestedAlert] = useState<boolean | null>(null);

  const handleTestAlert = async () => {
    try {
      const res = await apiFetch('/api/agent-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ severity: 'INFO', test: true, source: 'control-center' })
      });
      setHasTestedAlert(!!(res as any)?.success);
    } catch (err: any) {
      setHasTestedAlert(false);
      console.error('[Test-Agent Alert Error]', err);
    }
  };

  const handleMonthlyReview = async () => {
    setIsReviewLoading(true);
    setMonthlyReview(null);
    try {
      const data = {
        players: players.map((p: any) => ({ name: `${p?.firstName || ''} ${p?.lastName || p?.name || ''}`.trim(), position: p?.position || '', number: p?.number ?? '', category: p?.category || 'player', isInjured: p?.isInjured || false })),
        matches: matches.map((m) => ({ opponent: m.opponent || '', date: m.date || '', result: m.result || '', competition: m.competition || '' })),
        analyses: analyses.map((a: any) => ({ opponent: a?.opponent || '', date: a?.date || '', result: a?.result || '', hasContent: !!(a?.berichtText || a?.startingLineup) }))
      };
      const res = await apiFetch('/api/agent-monthly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      setMonthlyReview(String((res as any)?.text || 'Keine Antwort erhalten.'));
    } catch (err: any) {
      setMonthlyReview(`Fehler: ${err?.message || err}`);
    } finally {
      setIsReviewLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[999999] flex items-center justify-center p-2 sm:p-4 text-white font-sans overflow-hidden select-none">
      <div className="bg-slate-900 border-4 border-black rounded-xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] max-w-6xl w-full flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-slate-950 p-4 border-b-4 border-black flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 border-2 border-black font-black flex items-center justify-center text-white shadow-md rounded-lg">
              <Radio size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase text-amber-400 flex items-center gap-2 tracking-wider">
                FC AUGGEN CONTROL CENTER <span className="text-[10px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-mono font-bold">5 MODULE DAUERHAFT ONLINE</span>
              </h2>
              <p className="text-xs text-slate-300 font-bold flex items-center gap-2 mt-0.5">
                <span>SupervisorAgent • TeamAgent • CompetitionAgent • CleanupAgent • MemoryAgent</span>
              </p>
              {backgroundLastCycle && (
                <p className="text-[10px] text-emerald-400 font-mono mt-0.5 truncate max-w-[600px]" title={backgroundLastCycle.summary}>
                  <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1" />
                  Background-Cycle {new Date(backgroundLastCycle.time).toLocaleTimeString('de-DE')}: {backgroundLastCycle.summary}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoLoopActive(!isAutoLoopActive)}
              className={`px-3 py-1.5 rounded-lg border-2 border-black text-xs font-black uppercase flex items-center gap-1.5 transition-all ${
                isAutoLoopActive ? 'bg-emerald-500 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Radio size={14} className={isAutoLoopActive ? 'animate-pulse' : ''} />
              <span>{isAutoLoopActive ? 'Auto-Heartbeat Online (10s)' : 'Auto-Loop Pausiert'}</span>
            </button>

            <button
              onClick={handleManualTrigger}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-black rounded-lg text-xs font-black uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              <RefreshCw size={14} /> Reaktivieren & Cycle Starten
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-red-600 rounded-lg border-2 border-black text-slate-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* AGENTS GRID (5 SPECIALIZED AGENTS) */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-b-4 border-black bg-slate-950/60 overflow-y-auto shrink-0">
          {Object.values(agents).map((agent) => (
            <div
              key={agent.id}
              onClick={() => setActiveAgentTab(agent.id)}
              className={`p-3 rounded-xl border-2 border-black cursor-pointer transition-all flex flex-col justify-between ${
                activeAgentTab === agent.id
                  ? 'bg-slate-800 border-amber-400 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getAgentIcon(agent.id)}
                    <span className="text-xs font-black uppercase text-amber-300">{agent.name}</span>
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                </div>
                <p className="text-[10px] text-slate-300 font-medium line-clamp-2 mb-2">{agent.role}</p>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[10px] font-mono space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Status:</span>
                  <span className="text-emerald-400 font-bold">{agent.status}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Last Run:</span>
                  <span className="text-amber-300">{agent.lastRun}</span>
                </div>
                <div className="flex justify-between text-slate-400 items-center">
                  <span>Health:</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`font-bold ${agent.metrics.healthScore >= 90 ? 'text-emerald-400' : agent.metrics.healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{agent.metrics.healthScore}%</span>
                    <span className="w-10 h-1.5 bg-slate-800 rounded-full overflow-hidden inline-block align-middle">
                      <span
                        className={`block h-full ${agent.metrics.healthScore >= 90 ? 'bg-emerald-500' : agent.metrics.healthScore >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${agent.metrics.healthScore}%` }}
                      />
                    </span>
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sync:</span>
                  <span className="text-blue-300 font-bold">{agent.metrics.syncStatus}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* LOGS & AGENT DETAILS PANEL */}
        <div className="flex-1 p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
          
          {/* LEFT 2 COLUMNS: LIVE AGENT LOGS */}
          <div className="lg:col-span-2 bg-slate-950 border-2 border-black rounded-xl p-3 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2.5 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  ECHTZEIT AGENT-LOGS & AKTIVITÄTEN ({activeAgentTab})
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  onClick={() => setActiveAgentTab('ALL')}
                  className={`px-2 py-0.5 rounded border border-black font-bold uppercase ${
                    activeAgentTab === 'ALL' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Alle (5)
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-mono">
                  Keine Logs vorhanden. Heartbeat wird ausgeführt...
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs flex flex-col gap-1 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-black text-amber-300 flex items-center gap-1.5">
                        {getAgentIcon(log.agentId)} {log.agentName}
                      </span>
                      <span className="text-slate-500 text-[10px] flex items-center gap-1">
                        <Clock size={11} /> {log.timestamp}
                      </span>
                    </div>
                    <p className="font-bold text-slate-200">{log.message}</p>
                    {log.details && (
                      <p className="text-[10px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
                        {log.details}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: FINDINGS & RULES & REVIEW */}
          <div className="bg-slate-950 border-2 border-black rounded-xl p-3 flex flex-col overflow-y-auto custom-scrollbar gap-3">
            <div className="border-b-2 border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <ListChecks size={16} /> BEFUNDE {activeAgentTab === 'ALL' ? '(SUPERVISOR)' : activeAgentTab.toUpperCase()}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Echte Checks auf deinen Daten · kein Dummy-Status</p>
            </div>

            <div className="space-y-2 text-[11px]">
              {selectedFindings.length === 0 ? (
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-slate-400 font-mono text-[10px]">
                  Keine Befunde. Cycle läuft...
                </div>
              ) : selectedFindings.map((f, i) => (
                <div key={i} className={`p-2.5 rounded-lg border space-y-1 ${f.severity === 'ERROR' ? 'bg-red-950/60 border-red-900/60' : f.severity === 'WARNING' ? 'bg-amber-950/40 border-amber-900/40' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-start gap-1.5">
                    <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded border border-black ${f.severity === 'ERROR' ? 'bg-red-600 text-white' : f.severity === 'WARNING' ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-200'}`}>
                      {f.severity}
                    </span>
                    <span className="font-bold text-slate-100">{f.text}</span>
                  </div>
                  {f.items && f.items.length > 0 && (
                    <ul className="text-[10px] text-slate-400 font-mono list-disc list-inside space-y-0.5 pl-1">
                      {f.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-lg p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                  <Brain size={16} /> MONATS-REVIEW
                </h3>
                <button
                  onClick={handleMonthlyReview}
                  disabled={isReviewLoading}
                  className={`px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${
                    isReviewLoading ? 'bg-slate-700 text-slate-300' : 'bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isReviewLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                  {isReviewLoading ? 'Erzeuge...' : 'Review'}
                </button>
              </div>
              {monthlyReview && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 whitespace-pre-wrap text-[10px] font-mono text-slate-300 max-h-44 overflow-y-auto custom-scrollbar">
                  {monthlyReview}
                </div>
              )}
            </div>

            <div className="bg-slate-900 border-2 border-slate-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-300">
                <h3 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                  <BellRing size={14} /> HANDY-ALARM (DISCORD)
                </h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                  Fehler/Warnungen → sofortige Push-Meldung aufs Handy
                </p>
              </div>
              <button
                onClick={handleTestAlert}
                className={`px-2.5 py-1 rounded-lg border-2 border-black text-[10px] font-black uppercase flex items-center gap-1.5 transition-all text-slate-950 bg-emerald-400 hover:bg-emerald-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}
              >
                <Send size={12} /> Testen
              </button>
            </div>
            {hasTestedAlert !== null && (
              <p className={`text-[10px] font-mono px-1 ${hasTestedAlert ? 'text-emerald-400' : 'text-red-400'}`}>
                {hasTestedAlert
                  ? '✓ Test-Nachricht an Discord gesendet – prüfe dein Handy!'
                  : '✗ Test fehlgeschlagen – Webhook ist vermutlich nicht eingerichtet (ALERT_WEBHOOK_URL).'}
              </p>
            )}

            <div className="border-b-2 border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                <ShieldCheck size={16} /> SYSTEM-REGELN & DIRECTIVES
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-black text-amber-300 uppercase block">1. SupervisorAgent</span>
                <p className="text-[11px] text-slate-300">Überwacht alle Agents, verhindert Fehler. Entscheidet stets bei Konflikten.</p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-black text-blue-300 uppercase block">2. TeamAgent (LEVEL 3)</span>
                <p className="text-[11px] text-slate-300 font-mono italic">
                  „Für die Position [X] ist diese Laufbewegung typisch/ungewöhnlich/überlastend.“
                </p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-black text-emerald-300 uppercase block">3. CompetitionAgent</span>
                <p className="text-[11px] text-slate-300">Verbandsliga Tabelle, Punkte, Spielpläne ohne Duplikate.</p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-black text-red-300 uppercase block">4. CleanupAgent</span>
                <p className="text-[11px] text-slate-300">Sofortiges Löschen von Videos/Clips ohne UI-blockierende Popups.</p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <span className="font-black text-purple-300 uppercase block">5. MemoryAgent</span>
                <p className="text-[11px] text-slate-300">Synchronisation mit Firestore DB (ai-studio-20b6fe19-5950-4d1f-9c88-e7f55ed9a819).</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
