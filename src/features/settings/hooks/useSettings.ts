// Lecture/écriture des préférences de compte
import { useSettingsStore } from '../store/settingsStore';
import type { Language, Settings } from '../types';

interface UseSettingsResult {
  data: Settings;
  setDisplayName: (displayName: string) => void;
  setLanguage: (language: Language) => void;
}

export function useSettings(): UseSettingsResult {
  const displayName = useSettingsStore((s) => s.displayName);
  const language = useSettingsStore((s) => s.language);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  return {
    data: { displayName, language },
    setDisplayName,
    setLanguage,
  };
}