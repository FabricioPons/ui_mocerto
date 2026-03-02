"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { Locale, TranslationKeys } from "./types"
import { locales } from "./types"
import { translations } from "./translations"

const STORAGE_KEY = "mocerto-locale"

type I18nContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: keyof TranslationKeys) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en"

  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale
  }

  // Check browser language
  const browserLang = navigator.language.split("-")[0]
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale
  }

  return "en"
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    setLocaleState(getInitialLocale())
    setIsInitialized(true)
  }, [])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
    document.documentElement.lang = newLocale
  }, [])

  const t = useCallback(
    (key: keyof TranslationKeys): string => {
      const translation = translations[locale][key]
      if (!translation) {
        console.warn(`Missing translation for key: ${key}`)
        return key
      }
      return translation
    },
    [locale]
  )

  // Set document lang attribute on locale change
  useEffect(() => {
    if (isInitialized) {
      document.documentElement.lang = locale
    }
  }, [locale, isInitialized])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

export function useTranslation() {
  const { t } = useI18n()
  return { t }
}
