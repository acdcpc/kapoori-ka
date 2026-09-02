import { createContext } from 'react';
import { Palette, makePalette } from '../theme';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  palette: Palette;
}

export const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  setMode: () => {},
  isDark: false,
  palette: makePalette(false),
});
