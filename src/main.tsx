import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import { NaomiErrorBoundary } from './components/NaomiErrorBoundary';
import { ClubProvider } from './contexts/ClubContext';
import AccessGate from './components/AccessGate';
import { isStaleChunkError, hardReloadForStaleChunk } from './lib/staleChunk';
import { ensurePrintHardening } from './lib/printHardening';
import { startVersionWatch } from './lib/versionWatch';
import { dbReadiness } from './firebase';

// Druck-Regeln sofort hinterlegen: greifen bei JEDEM Druckweg
// (Toolbar-Drucken, "Als PDF drucken", Auto-Druck) – und unabhängig davon,
// ob das Stylesheet aus dem Browser-Cache veraltet ist.
ensurePrintHardening();
// Veralteten Browser-Cache erkennen und einmal automatisch neu laden,
// sonst fehlen die Druck-Regeln und der Ausdruck wird auf 1 Seite gezwungen.
startVersionWatch();

// ── Diagnose-Monitor: statt "schwarz" die echte Fehlerstelle anzeigen ──────
function showDiagnostic(title: string, detail?: string) {
  try {
    document.title = '⚠️ ' + title;
  } catch {}
  let box = document.getElementById('fca-diag') as HTMLDivElement | null;
  if (!box) {
    box = document.createElement('div');
    box.id = 'fca-diag';
    box.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#7f1d1d;color:#fff;font:12px/1.5 monospace;padding:10px 16px;max-height:45vh;overflow:auto;white-space:pre-wrap;border-top:3px solid #f87171;';
    document.body.appendChild(box);
  }
  box.textContent = `[FCA-Diag] ${new Date().toISOString()} ${title}${detail ? '\n' + detail : ''}`;
  try { console.error('[FCA-Diag]', title, detail || ''); } catch {}
}

window.addEventListener('error', (e) => {
  // Alte (veraltete) Build-Dateien: Nach jedem Deploy ändert Vite die
  // Dateinamen (Hash). Lädt der Browser noch die alte Version, schlägt der
  // dynamische Import fehl -> einmalig neu laden (mit Cache-Busting),
  // dann ist die neue Version aktiv.
  const msg = e.message || '';
  if (isStaleChunkError(msg)) {
    if (hardReloadForStaleChunk()) {
      showDiagnostic('Alte Version erkannt – lade neue Version…', msg);
      return;
    }
    showDiagnostic('Globaler JS-Fehler', `${msg}\n${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}\nStack:\n${e.error?.stack || '(kein Stack)'}`);
    return;
  }
  showDiagnostic('Globaler JS-Fehler', `${msg}\n${e.filename || ''}:${e.lineno || ''}:${e.colno || ''}\nStack:\n${e.error?.stack || '(kein Stack)'}`);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason?.message || String(e.reason || '');
  // Gleiches stale-chunk-Problem kann auch als Promise-Rejection auftreten.
  if (isStaleChunkError(msg)) {
    if (hardReloadForStaleChunk()) {
      showDiagnostic('Alte Version erkannt – lade neue Version…', msg);
      return;
    }
  }
  showDiagnostic('Unbehandelte Promise', `${msg}\nStack:\n${e.reason?.stack || ''}`);
});

// Hänger-Watchdog: meldet nur einen ECHTEN synchronen Dauerblock (z. B.
// Endlosschleife) – KEIN Fehlalarm bei langsamem, aber funktionierendem Start.
//
// Wichtig: requestAnimationFrame läuft in einem HINTERGRUND-TAB NICHT.
// Ein Tab im Hintergrund oder verdeckt darf deshalb nie als "Hänger" gelten,
// sonst bekommt der Trainer eine falsche Fehlermeldung nach jedem Tab-Wechsel.
let startMark = Date.now();
let renderedFrames = 0;
let watchdogTimer: number | null = null;
const ORIGINAL_TITLE = typeof document !== 'undefined' ? document.title : '';

const markRendered = () => {
  renderedFrames += 1;
  window.__FCA_APP_RENDERED__ = true;
  try { sessionStorage.removeItem('fca_reloaded_for_stale_chunk'); } catch {}
  // Nach erfolgreichem Start eine vorherige "Hänger"-Fehlerbox entfernen,
  // damit sie nicht irreführend stehen bleibt.
  try {
    const box = document.getElementById('fca-diag');
    if (box) box.remove();
    if (document.title.startsWith('⚠️ ')) document.title = ORIGINAL_TITLE;
  } catch {}
};

// Echtes React-Mount-Signal: setzt die Marke, sobald React tatsächlich
// gerendert hat (useEffect nach dem ersten Commit – nicht nur "Browser malt").
function StartupSignal() {
  useEffect(() => { markRendered(); }, []);
  return null;
}

const paintWatch = () => {
  if (window.__FCA_APP_RENDERED__) return;
  renderedFrames += 1;
  if (renderedFrames >= 3) markRendered();
  else requestAnimationFrame(paintWatch);
};
requestAnimationFrame(paintWatch);

// Beim Zurückkehren in den Tab das Zeitbudget neu starten, sonst feuert der
// Watchdog sofort, obwohl die App längst läuft.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    startMark = Date.now();
    renderedFrames = 0;
  }
});

const startWatchdog = () => {
  if (watchdogTimer !== null) return;
  watchdogTimer = window.setInterval(() => {
    if (window.__FCA_APP_RENDERED__) {
      window.clearInterval(watchdogTimer!);
      watchdogTimer = null;
      return;
    }
    const elapsed = Date.now() - startMark;
    // Nur melden, wenn der Tab wirklich sichtbar ist – im Hintergrund ist
    // rAF pausiert und die Messung wäre wertlos.
    if (elapsed > 8000 && !document.hidden) {
      showDiagnostic(
        'App startet nicht (Hänger)',
        `Seit ${Math.round(elapsed / 1000)}s kein React-Rendering. Der Start-Code blockiert den Haupt-Thread synchron.\nKonsole: F12 → Console. Bitte die Seite neu laden (Strg+F5).`
      );
    }
  }, 1000);
};
if (!document.hidden) startWatchdog();

declare global { interface Window { __FCA_APP_RENDERED__?: boolean } }

const rootEl = document.getElementById('root')!;
rootEl.setAttribute('style', 'min-height:100vh');

// Erst rendern, wenn die Firestore-Anmeldung (anonym) abgeschlossen ist – sonst
// starten alle onSnapshot-Listener ohne Token, bekommen einmalig "permission-denied"
// und der Firebase-SDK erholt sich nie wieder (App bliebe dauerhaft leer / "hängt").
const renderApp = () => {
  try {
    // Watchdog-Uhr ab hier neu starten: Die Wartezeit auf die (anonyme)
    // Anmeldung (dbReadiness) darf nicht als "Hänger" gewertet werden.
    startMark = Date.now();
    createRoot(rootEl).render(
      <StrictMode>
        <AccessGate>
          <NaomiErrorBoundary>
            <ClubProvider>
              <App />
              <StartupSignal />
            </ClubProvider>
          </NaomiErrorBoundary>
        </AccessGate>
      </StrictMode>,
    );
  } catch (err: unknown) {
    showDiagnostic('createRoot-Fehler (App startet nicht)', err instanceof Error ? `${err.message}\n${err.stack || ''}` : String(err));
  }
};
dbReadiness.then(renderApp, renderApp);

// Tab wird wieder sichtbar → Watchdog ggf. erneut starten (Fehlalarm-Schutz).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !window.__FCA_APP_RENDERED__) {
    startMark = Date.now();
    renderedFrames = 0;
    startWatchdog();
  }
});
