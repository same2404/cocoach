export function normalizeDateToISO(value: string | Date): string | null {
  if (!value) return null;
  let dateObj: Date | null = null;

  if (value instanceof Date) {
    dateObj = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  } else {
    const s = String(value).trim();
    if (s.includes('T') || s.includes('-')) {
      const parts = s.split('T')[0].split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (y && m && d) dateObj = new Date(y, m - 1, d);
      }
    }
    if (!dateObj && s.includes('.')) {
      const parts = s.split('.');
      if (parts.length === 2 || parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        let y = parts.length === 3 ? parseInt(parts[2], 10) : 0;
        if (y < 100) y += 2000;
        if (d && m && (y || parts.length === 2)) dateObj = new Date(y || new Date().getFullYear(), m - 1, d);
      }
    }
    if (!dateObj) {
      const fallback = new Date(s);
      if (!isNaN(fallback.getTime())) dateObj = new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate());
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) return null;
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function findSessionByDate<T extends { date?: string | Date }>(sessions: T[], dateValue: string | Date): T | undefined {
  const target = normalizeDateToISO(dateValue);
  if (!target || !sessions) return undefined;
  return sessions.find((s) => normalizeDateToISO(s.date) === target);
}

export function hasSessionOnDate<T extends { date?: string | Date }>(sessions: T[], dateValue: string | Date): boolean {
  return findSessionByDate(sessions, dateValue) !== undefined;
}
