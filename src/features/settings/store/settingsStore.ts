// Store des préférences de compte
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SETTINGS_STORAGE_KEY } from '@/shared/config/constants';
import type { Language, Settings } from '../types';

interface SettingsState extends Settings {
  setDisplayName: (displayName: string) => void;
  setLanguage: (language: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      displayName: '',
      language: 'fr',
      setDisplayName: (displayName) => set({ displayName }),
      setLanguage: (language) => set({ language }),
    }),
    { name: SETTINGS_STORAGE_KEY },
  ),
);