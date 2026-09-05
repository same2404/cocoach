
// Holiday calendar for Baden-Württemberg, Germany
// Reference years 2026 and 2027

export interface Holiday {
  date: string;
  name: string;
  isPublicHoliday: boolean;
}

function getEasterDate(year: number): Date {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);

  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getHolidays(year: number): Record<string, string> {
  const holidays: Record<string, string> = {
    [`${year}-01-01`]: 'Neujahr',
    [`${year}-01-06`]: 'Heilige Drei Könige',
    [`${year}-05-01`]: 'Tag der Arbeit',
    [`${year}-10-03`]: 'Tag der Deutschen Einheit',
    [`${year}-11-01`]: 'Allerheiligen',
    [`${year}-12-25`]: '1. Weihnachtstag',
    [`${year}-12-26`]: '2. Weihnachtstag',
  };

  const easter = getEasterDate(year);
  
  // Karfreitag (Easter - 2 days)
  const karfreitag = new Date(easter);
  karfreitag.setDate(easter.getDate() - 2);
  holidays[formatLocalDate(karfreitag)] = 'Karfreitag';

  // Ostermontag (Easter + 1 day)
  const ostermontag = new Date(easter);
  ostermontag.setDate(easter.getDate() + 1);
  holidays[formatLocalDate(ostermontag)] = 'Ostermontag';

  // Christi Himmelfahrt (Easter + 39 days)
  const himmelfahrt = new Date(easter);
  himmelfahrt.setDate(easter.getDate() + 39);
  holidays[formatLocalDate(himmelfahrt)] = 'Christi Himmelfahrt';

  // Pfingstmontag (Easter + 50 days)
  const pfingstmontag = new Date(easter);
  pfingstmontag.setDate(easter.getDate() + 50);
  holidays[formatLocalDate(pfingstmontag)] = 'Pfingstmontag';

  // Fronleichnam (Easter + 60 days)
  const fronleichnam = new Date(easter);
  fronleichnam.setDate(easter.getDate() + 60);
  holidays[formatLocalDate(fronleichnam)] = 'Fronleichnam';

  return holidays;
}

