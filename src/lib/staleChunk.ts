// Copyright (c) 2026 FC Auggen Manager. All rights reserved.

// Stale-Chunk-Handling: Vite benennt Assets nach jedem Deploy um (Hash im
// Dateinamen). Liegt im Browser/iframe noch eine alte index.html mit alten
// Chunk-Namen vor, schlägt der dynamische Import fehl
// ("Failed to fetch dynamically imported module"). Dann wird einmalig mit
// Cache-Busting neu geladen, damit definitiv die aktuelle index.html aktiv wird.
// Der Guard wird erst nach erfolgreichem App-Start zurückgesetzt.

const STALE_CHUNK_GUARD_KEY = 'fca_reloaded_for_stale_chunk';

export function isStaleChunkError(msg: string): boolean {
  return (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Failed to fetch dynamically imported') ||
    msg.includes("The requested module" )
  );
}

export function hardReloadForStaleChunk(): boolean {
  try {
    const flag = sessionStorage.getItem(STALE_CHUNK_GUARD_KEY);
    if (flag) return false;
    sessionStorage.setItem(STALE_CHUNK_GUARD_KEY, '1');
    const bust = 'v=' + Date.now();
    const url = window.location.pathname + (window.location.search ? window.location.search + '&' : '?') + bust;
    window.location.replace(url);
    return true;
  } catch {
    return false;
  }
}

export function clearStaleChunkGuard(): void {
  try {
    sessionStorage.removeItem(STALE_CHUNK_GUARD_KEY);
  } catch {}
}