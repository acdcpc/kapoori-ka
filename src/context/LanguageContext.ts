import { createContext } from 'react';

export interface LanguageContextType {
  language: 'ne' | 'en';
  setLanguage: (lang: 'ne' | 'en') => void;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'ne',
  setLanguage: () => {},
});
