// Types des préférences de compte
export type Language = 'fr' | 'en';

export interface Settings {
  displayName: string;
  language: Language;
}