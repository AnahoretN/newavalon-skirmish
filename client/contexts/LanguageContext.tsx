import React, { createContext, useState, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { resources } from '@/locales'
import type { LanguageCode, TranslationResource, CardTranslation } from '@/locales/types'

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof TranslationResource['ui']) => string;
  getCardTranslation: (cardId: string) => CardTranslation | undefined;
  getCounterTranslation: (type: string) => { name: string; description: string } | undefined;
  getDeckTranslation: (deckId: string) => string | undefined;
  resources: TranslationResource;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('en')

  useEffect(() => {
    const savedLang = localStorage.getItem('app_language')
    if (savedLang && savedLang in resources) {
      setLanguage(savedLang as LanguageCode)
    }
  }, [])

  const handleSetLanguage = (lang: LanguageCode) => {
    setLanguage(lang)
    localStorage.setItem('app_language', lang)
  }

  const t = (key: keyof TranslationResource['ui']): string => {
    return resources[language].ui[key] || resources['en'].ui[key] || key
  }

  const getCardTranslation = (cardId: string): CardTranslation | undefined => {
    // The cardId might be a complex instance ID like "SYN_RIOT_AGENT_1".
    // We need to map it to the locale key (e.g. "riotAgent").
    // However, since we don't have a direct map here, we assume the 'contentDatabase' keys are the IDs.
    // We need a robust way to match.
    // Strategy: The raw card object has 'name'. We use the *English Name* as the key if possible,
    // OR we assume the ID passed here is the base ID (e.g. 'riotAgent').
    // Components should pass the base ID if possible, or we try to find it in the English dictionary first?
    // No, let's rely on the caller passing the key from contentDatabase.

    return resources[language].cards[cardId] || resources['en'].cards[cardId]
  }

  const getCounterTranslation = (type: string) => {
    return resources[language].counters[type] || resources['en'].counters[type]
  }

  const getDeckTranslation = (deckId: string) => {
    const deckNames = resources[language].deckNames
    const enDeckNames = resources['en'].deckNames
    return deckNames[deckId as keyof typeof enDeckNames] || enDeckNames[deckId as keyof typeof enDeckNames]
  }

  const isRTL = false // Current languages (en, ru, sr) are all LTR

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage: handleSetLanguage,
      t,
      getCardTranslation,
      getCounterTranslation,
      getDeckTranslation,
      resources: resources[language],
      isRTL,
    }}>
      <div dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LanguageContext.Provider>
  )
}

/* eslint-disable react-refresh/only-export-components */
export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
