/**
 * Druck-Absicherung zur Laufzeit.
 *
 * Chrome-Symptome beim Trainingsplan-Druck:
 *  - veraltetes Cache-CSS ohne `print:h-auto`/`print:overflow-visible`
 *    -> Container bleiben auf 100vh/`overflow:hidden` und ALLES wird auf
 *       EINE Seite gezwungen (Übungsseiten fehlen komplett)
 *  - dauerhaft laufende Animationen (z.B. Notification-Bounce)
 *    -> Druckvorschau bleibt ewig auf "wird vorbereitet"
 *
 * Diese Regeln werden direkt vor dem Druck in den <head> geschrieben und
 * stehen damit IMMER hinten - sie überschreiben auch ein veraltetes
 * Stylesheet aus dem Browser-Cache.
 */
const STYLE_ID = 'fca-print-hardening';

const PRINT_CSS = `
@media print {
  /* Gesamtkette auf normale Hoehe bringen - sonst wird der Druck auf
     eine Bildschirmhoeh (= genau EINE Seite) begrenzt. */
  html, body, #root, #root > div,
  main, nav, header,
  [class~="h-screen"], [class~="h-full"], [class~="min-h-screen"],
  [class~="min-h-full"], [class~="overflow-hidden"], [class~="overflow-auto"] {
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow: visible !important;
  }
  [class*="overflow-hidden"], [class*="overflow-auto"],
  [class*="overflow-y"], [class*="overflow-x"] {
    overflow: visible !important;
    max-height: none !important;
  }
  /* Kein Zoom/Skalierung - Inhalt muss ueber N Seiten fliessen. */
  html, body, #root { zoom: 1 !important; transform: none !important; }
  img, svg, canvas, video {
    max-width: 100% !important;
    height: auto !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  *, *::before, *::after {
    animation: none !important;
    animation-play-state: paused !important;
    transition: none !important;
    transition-duration: 0s !important;
    will-change: auto !important;
  }
  tr, li, .print-avoid-break, .print\\:avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
`;

export function ensurePrintHardening(): void {
  if (typeof document === 'undefined' || !document.head) return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.setAttribute('data-fca', 'print');
  el.textContent = PRINT_CSS;
  document.head.appendChild(el);
}

/** Entfernt sichtbare Overlays (Notification etc.), die den Druck stören würden. */
export function hidePrintOverlays(): void {
  if (typeof document === 'undefined') return;
  const nodes = document.querySelectorAll<HTMLElement>('[data-fca-print-overlay]');
  nodes.forEach((n) => {
    n.style.setProperty('display', 'none', 'important');
  });
}
