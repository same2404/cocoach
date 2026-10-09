import React, { Component, ReactNode } from 'react';
import { isStaleChunkError, hardReloadForStaleChunk } from '../lib/staleChunk';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class NaomiErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unbekannter Fehler' };
  }

  componentDidCatch(error: Error) {
    // Alte (veraltete) Build-Datei: Nach Deploy neue Hashes → Import fehlt.
    // Einmalig (mit Cache-Busting) neu laden, damit die aktuelle Version aktiv ist.
    const msg = error?.message || '';
    if (isStaleChunkError(msg)) {
      if (hardReloadForStaleChunk()) return;
    }
    console.warn('[Naomi] Fehler abgefangen, KEIN Auto-Reload:', error);
  }

  render() {
    if (this.state.hasError) {
      if (isStaleChunkError(this.state.message)) {
        // Nur Stale-Chunk: automatisch neu laden, das ist sicher und ohne Datenverlust.
        if (hardReloadForStaleChunk()) return null;
      }
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '18px',
          background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
          textAlign: 'center', padding: 24
        }}>
          <div style={{ fontSize: 44 }}>🛑</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, textTransform: 'uppercase' }}>
            Da ist etwas schiefgelaufen
          </h1>
          <p style={{ margin: 0, maxWidth: 520, fontSize: 14, color: '#94a3b8' }}>
            Die App stoppt hier bewusst und lädt nicht von selbst neu, damit nichts überschrieben wird.
            Bitte lade die App manuell neu.
          </p>
          <code style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
            padding: '8px 14px', fontSize: 12, color: '#f87171', maxWidth: 520, overflowWrap: 'anywhere'
          }}>
            {this.state.message}
          </code>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10b981', color: '#0f172a', border: 'none', borderRadius: 12,
              padding: '12px 26px', fontSize: 14, fontWeight: 900, textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            App neu laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
