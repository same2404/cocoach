import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, RotateCcw } from 'lucide-react';
import { isStaleChunkError, hardReloadForStaleChunk } from '../lib/staleChunk';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SupervisorAgent [System Protection]: Caught uncaught UI error:', error, errorInfo);
    // Stale-Chunk: Nach jedem Deploy neue Datei-Hashes. Lädt der Browser noch
    // die alte Version, schlägt der dynamische Import fehl → einmalig (mit
    // Cache-Busting) neu laden.
    const msg = error?.message || '';
    if (isStaleChunkError(msg)) {
      hardReloadForStaleChunk();
    }
  }

  public componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  public componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    // Prevent unhandled promise rejections (like transient stream errors or network timeouts) from crashing the UI
    console.warn('SupervisorAgent [System Protection]: Intercepted unhandled promise rejection:', event.reason);
    // Stale-Chunk kann auch als Promise-Rejection ankommen → automatisch neu laden.
    const msg = event.reason?.message || String(event.reason || '');
    if (isStaleChunkError(msg)) {
      hardReloadForStaleChunk();
    }
    // Don't mark as fatal error unless explicitly necessary
  };

  private handleSoftReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleFullReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Ein unerwarteter Systemfehler wurde isoliert.';
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error && parsed.operationType) {
            errorMessage = `Datenbank-Protokoll: ${parsed.error}`;
            isFirestoreError = true;
          }
        } else if (typeof this.state.error === 'string') {
          errorMessage = this.state.error;
        }
      } catch (e) {
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen bg-[#0d131f] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#182032] border-2 border-slate-700 rounded-2xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center mx-auto border border-rose-500/30 shadow-inner">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full">
                SupervisorAgent • System-Schutz
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight text-white">Prozess isoliert</h1>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {isFirestoreError ? errorMessage : 'Das System hat eine Abweichung im UI-Thread erkannt und sicher isoliert. Deine Daten sind in der Datenbank geschützt.'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleSoftReset}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} /> Ansicht wiederherstellen
              </button>

              <button
                onClick={this.handleFullReload}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} /> Anwendung neu starten
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono">
              <ShieldCheck size={12} className="text-emerald-500" />
              <span>CoCoach Analyse-System • Stabilitäts-Garantie</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
