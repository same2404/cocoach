export interface ThemePalette {
  background: string;
  surface: string;
  card: string;
  textMain: string;
  textSub: string;
  primary: string;
  primaryHover: string;
  accent: string;
  accentHover: string;
  border: string;

  // Tabelle / Spieler-Kader-Liste
  squadTableBg: string;
  squadTableHeaderBg: string;
  squadTableHeaderText: string;
  squadTableTextMain: string;
  squadTableTextSub: string;
  squadTableBorder: string;
  squadTableHover: string;

  // Anwesenheit (Attendance)
  attendanceBox: string;
  attendanceText: string;
  attendanceLegendPresent: string;
  attendanceLegendExcused: string;
  attendanceLegendUnexcused: string;
  attendanceLegendPrivate: string;
  attendanceLegendSick: string;
  attendanceLegendInjured: string;

  // Erweiterbar für zukünftige Farbwerte
  [key: string]: string;
}

export type ThemeMode = 'dark' | 'light';

export const darkTheme: ThemePalette = {
  background: "#0A0E17",
  surface: "#121824",
  card: "#1E293B",
  textMain: "#F8FAFC",
  textSub: "#94A3B8",
  primary: "#10B981",
  primaryHover: "#059669",
  accent: "#06B6D4",
  accentHover: "#0891B2",
  border: "#334155",

  // Tabelle / Spieler-Kader-Liste (Dark Mode)
  squadTableBg: "#FFFFFF",
  squadTableHeaderBg: "#F1F5F9",
  squadTableHeaderText: "#0F172A",
  squadTableTextMain: "#0F172A",
  squadTableTextSub: "#475569",
  squadTableBorder: "#E2E8F0",
  squadTableHover: "#F8FAFC",

  // Anwesenheit (Dark Mode: Neutrale weiße Kästen, klare dunkle Schrift, farbige Legenden)
  attendanceBox: "#FFFFFF",
  attendanceText: "#0F172A",
  attendanceLegendPresent: "#000000",
  attendanceLegendExcused: "#2563EB",
  attendanceLegendUnexcused: "#EF4444",
  attendanceLegendPrivate: "#8B5CF6",
  attendanceLegendSick: "#EAB308",
  attendanceLegendInjured: "#F43F5E"
};

export const lightTheme: ThemePalette = {
  background: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#F1F5F9",
  textMain: "#0F172A",
  textSub: "#475569",
  primary: "#0D9488",
  primaryHover: "#0F766E",
  accent: "#0284C7",
  accentHover: "#0369A1",
  border: "#CBD5E1",

  // Tabelle / Spieler-Kader-Liste (Light Mode)
  squadTableBg: "#FFFFFF",
  squadTableHeaderBg: "#F1F5F9",
  squadTableHeaderText: "#0F172A",
  squadTableTextMain: "#0F172A",
  squadTableTextSub: "#475569",
  squadTableBorder: "#E2E8F0",
  squadTableHover: "#F8FAFC",

  // Anwesenheit (Light Mode: neutrale weiße Kästen #FFFFFF, schwarze Schrift #000000, farbig hervorgehobene Legenden)
  attendanceBox: "#FFFFFF",
  attendanceText: "#000000",
  attendanceLegendPresent: "#000000",
  attendanceLegendExcused: "#2563EB",
  attendanceLegendUnexcused: "#EF4444",
  attendanceLegendPrivate: "#8B5CF6",
  attendanceLegendSick: "#EAB308",
  attendanceLegendInjured: "#F43F5E"
};

/**
 * Erweiterbare Theme-Registrierung
 */
export const themes: Record<string, ThemePalette> = {
  dark: darkTheme,
  light: lightTheme
};

/**
 * getTheme(mode)
 * @param mode "dark" oder "light"
 * @returns Gibt das passende Theme-Objekt zurück
 */
export function getTheme(mode: ThemeMode | string = 'dark'): ThemePalette {
  return themes[mode] || darkTheme;
}

/**
 * getColor(mode, name)
 * @param mode "dark" oder "light"
 * @param name Schlüsselname der Farbe (z.B. "background", "primary", "attendanceBox")
 * @returns Gibt eine einzelne Farbe aus dem gewählten Theme zurück
 */
export function getColor(mode: ThemeMode | string, name: keyof ThemePalette | string): string {
  const theme = getTheme(mode);
  return theme[name] || '';
}

/**
 * getAllColors(mode)
 * @param mode "dark" oder "light"
 * @returns Gibt alle Farben des Themes als Objekt/JSON-Kopie zurück
 */
export function getAllColors(mode: ThemeMode | string): ThemePalette {
  return { ...getTheme(mode) };
}

/**
 * Hilfsfunktion zum Registrieren weiterer Theme-Varianten (Erweiterbarkeit)
 */
export function registerTheme(name: string, palette: ThemePalette): void {
  themes[name] = palette;
}

