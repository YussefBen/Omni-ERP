import { useContext } from 'react';
import { ThemeContext } from './themeContextInstance';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme doit etre utilise a l'interieur de ThemeProvider");
  return context;
}