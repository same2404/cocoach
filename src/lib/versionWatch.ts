/**
 * Stale-Version-Wächter.
 *
 * Lädt der Browser ein gecachtes `index.html`, hängt er auf alten
 * JS-/CSS-Dateien fest. Genau das hat den Druck auf EINE Seite erzwungen
 * (die neuen Druck-Regeln fehlten).
 *
 * Prüft alle paar Minuten, ob auf dem Server ein neuer Build liegt,
 * und lädt einmal automatisch neu. Ein Endlos-Reload ist ausgeschlossen,
 * weil die bereits geladene Version in `sessionStorage` gemerkt wird.
 */
const FLAG = 'fca_reloaded_for_version';

function localAsset(): string | null {
  try {
    const el = document.querySelector<HTMLScriptElement>('script[type="module"][src*="/assets/"]');
    const src = el?.getAttribute('src') || '';
    return src.split('/').pop() || null;
  } catch {
    return null;
  }
}

async function checkForNewBuild(current: string | null): Promise<void> {
  if (!current) return;
  try {
    const res = await fetch(`${window.location.origin}/index.html`, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.text();
    const m = html.match(/src="\.\/assets\/(index-[^"]+\.js)"/);
    if (!m || m[1] === current) return;
    if (sessionStorage.getItem(FLAG) === m[1]) return; // bereits neu geladen
    sessionStorage.setItem(FLAG, m[1]);
    console.warn('[Version-Wächter] Neue Version erkannt – aktualisiere…', current, '->', m[1]);
    window.location.reload();
  } catch {
    /* offline / Netzwerkfehler -> nächster Versuch */
  }
}

export function startVersionWatch(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const current = localAsset();
  if (!current) return;
  // Schnell prüfen (3 s), damit Kollegen mit altem Cache zügig auf die aktuelle
  // Version aktualisieren, danach alle 90 s erneut.
  window.setTimeout(() => void checkForNewBuild(current), 3000);
  window.setInterval(() => void checkForNewBuild(current), 90 * 1000);
}
