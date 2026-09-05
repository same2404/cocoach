/**
 * Date and time formatting & extraction utilities for Session Telemetry and Tracker Records
 */

export const formatSessionDate = (rawDate?: string | null): string => {
  if (!rawDate) return '';
  const trimmed = String(rawDate).trim();
  if (!trimmed || trimmed === '-') return '';

  // Match ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }

  // Match German DD.MM.YYYY
  const deMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (deMatch) {
    const [, d, m, y] = deMatch;
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
  }

  // Match Compact YYYYMMDD
  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})/);
  if (compactMatch) {
    const [, y, m, d] = compactMatch;
    return `${d}.${m}.${y}`;
  }

  // If full timestamp string with T
  if (trimmed.includes('T')) {
    const part = trimmed.split('T')[0];
    const parts = part.split('-');
    if (parts.length === 3) {
      return `${parts[2].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[0]}`;
    }
  }

  return trimmed;
};

export const extractSessionDate = (item: any): string => {
  if (!item) return '';

  // If item is already a string
  if (typeof item === 'string') {
    const trimmed = item.trim();
    const isoMatch = trimmed.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
    if (isoMatch) return isoMatch[1];
    const deMatch = trimmed.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
    if (deMatch) return `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
    const compactMatch = trimmed.match(/\b(202\d)([01]\d)([0-3]\d)\b/);
    if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
    return trimmed;
  }

  // 1. Direct date properties
  const direct = item.datum || item.sessionDate || item.recordingDate || item.aufnahmeDatum || item.analysisDate || item.date || item.Date;
  if (direct && typeof direct === 'string' && direct.trim()) {
    const trimmed = direct.trim();
    if (trimmed.includes('T')) {
      return trimmed.split('T')[0];
    }
    return trimmed;
  }

  // 2. Check file names or text strings
  const searchStr = `${item.fileName || ''} ${item.matchName || ''} ${item.trainingId || ''} ${item.rawFileName || ''} ${item.name || ''}`;
  const isoMatch = searchStr.match(/\b(202\d-[01]\d-[0-3]\d)\b/);
  if (isoMatch) return isoMatch[1];
  const deMatch = searchStr.match(/\b([0-3]\d)\.([01]\d)\.(202\d)\b/);
  if (deMatch) return `${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`;
  const compactMatch = searchStr.match(/\b(202\d)([01]\d)([0-3]\d)\b/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  // 3. Fallback to uploadDate / uploadedAt
  const upload = item.uploadDate || item.uploadedAt;
  if (upload && typeof upload === 'string') {
    if (upload.includes('T')) return upload.split('T')[0];
    return upload;
  }

  return '';
};

export const extractSessionTime = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') {
    const match = item.match(/\b([0-2]\d:[0-5]\d)\b/);
    return match ? match[1] : '';
  }
  const direct = item.uhrzeit || item.time || item.sessionTime || item.recordingTime || item.Time;
  if (direct && typeof direct === 'string') {
    return direct.substring(0, 5);
  }
  if (item.uploadedAt && typeof item.uploadedAt === 'string' && item.uploadedAt.includes('T')) {
    const timePart = item.uploadedAt.split('T')[1];
    if (timePart) return timePart.substring(0, 5);
  }
  return '';
};
