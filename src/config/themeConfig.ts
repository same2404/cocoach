import { 
  darkTheme, 
  lightTheme, 
  getTheme, 
  getColor, 
  getAllColors, 
  registerTheme, 
  ThemePalette, 
  ThemeMode 
} from '../theme';

export { 
  darkTheme, 
  lightTheme, 
  getTheme, 
  getColor, 
  getAllColors, 
  registerTheme, 
  type ThemePalette, 
  type ThemeMode 
};

export interface DesignColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  secondaryHover: string;
  background: string;
  header: string;
  accentGold: string;
  accentGoldHover: string;
  textMain: string;
  textSub: string;
}

export interface DesignFonts {
  fontMain: string;
  fontCode: string;
}

export interface DesignConfig {
  name: string;
  version: string;
  system: string;
  colors: DesignColors;
  fonts: DesignFonts;
}

export interface ThemeVariant {
  mode: 'dark' | 'light';
  colors: ThemePalette;
  fonts: DesignFonts;
}

export const DESIGN_COLORS: DesignColors = {
  primary: darkTheme.primary,
  primaryHover: darkTheme.primaryHover,
  secondary: darkTheme.card,
  secondaryHover: darkTheme.border,
  background: darkTheme.background,
  header: darkTheme.surface,
  accentGold: darkTheme.accent,
  accentGoldHover: darkTheme.accentHover,
  textMain: darkTheme.textMain,
  textSub: darkTheme.textSub
};

export const DESIGN_FONTS: DesignFonts = {
  fontMain: "Inter",
  fontCode: "JetBrains Mono"
};

export function getDesignConfig(): DesignConfig {
  return {
    name: "CoCoach Theme System",
    version: "2.0.0",
    system: "CoCoach Theme System",
    colors: { ...DESIGN_COLORS },
    fonts: { ...DESIGN_FONTS }
  };
}

export function exportThemeForStitch(): string {
  return JSON.stringify({
    config: getDesignConfig(),
    darkTheme,
    lightTheme
  }, null, 2);
}
