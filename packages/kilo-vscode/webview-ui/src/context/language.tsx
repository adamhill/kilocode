/**
 * Language context
 * Provides i18n translations for kilo-ui components.
 * Merges UI translations from @opencode-ai/ui and Kilo overrides from @kilocode/kilo-i18n.
 *
 * Locale priority: user override → VS Code display language → browser language → "en"
 */

import { createSignal, createMemo, createEffect, ParentComponent, Accessor } from "solid-js"
import { I18nProvider } from "@kilocode/kilo-ui/context"
import type { UiI18nKey, UiI18nParams } from "@kilocode/kilo-ui/context"
import { dict as uiEn } from "@kilocode/kilo-ui/i18n/en"
import { dict as uiZh } from "@kilocode/kilo-ui/i18n/zh"
import { dict as uiZht } from "@kilocode/kilo-ui/i18n/zht"
import { dict as uiKo } from "@kilocode/kilo-ui/i18n/ko"
import { dict as uiDe } from "@kilocode/kilo-ui/i18n/de"
import { dict as uiEs } from "@kilocode/kilo-ui/i18n/es"
import { dict as uiFr } from "@kilocode/kilo-ui/i18n/fr"
import { dict as uiDa } from "@kilocode/kilo-ui/i18n/da"
import { dict as uiJa } from "@kilocode/kilo-ui/i18n/ja"
import { dict as uiPl } from "@kilocode/kilo-ui/i18n/pl"
import { dict as uiRu } from "@kilocode/kilo-ui/i18n/ru"
import { dict as uiAr } from "@kilocode/kilo-ui/i18n/ar"
import { dict as uiNo } from "@kilocode/kilo-ui/i18n/no"
import { dict as uiBr } from "@kilocode/kilo-ui/i18n/br"
import { dict as uiTh } from "@kilocode/kilo-ui/i18n/th"
import { dict as uiBs } from "@kilocode/kilo-ui/i18n/bs"
import { dict as kiloEn } from "@kilocode/kilo-i18n/en"
import { dict as kiloZh } from "@kilocode/kilo-i18n/zh"
import { dict as kiloZht } from "@kilocode/kilo-i18n/zht"
import { dict as kiloKo } from "@kilocode/kilo-i18n/ko"
import { dict as kiloDe } from "@kilocode/kilo-i18n/de"
import { dict as kiloEs } from "@kilocode/kilo-i18n/es"
import { dict as kiloFr } from "@kilocode/kilo-i18n/fr"
import { dict as kiloDa } from "@kilocode/kilo-i18n/da"
import { dict as kiloJa } from "@kilocode/kilo-i18n/ja"
import { dict as kiloPl } from "@kilocode/kilo-i18n/pl"
import { dict as kiloRu } from "@kilocode/kilo-i18n/ru"
import { dict as kiloAr } from "@kilocode/kilo-i18n/ar"
import { dict as kiloNo } from "@kilocode/kilo-i18n/no"
import { dict as kiloBr } from "@kilocode/kilo-i18n/br"
import { dict as kiloTh } from "@kilocode/kilo-i18n/th"
import { dict as kiloBs } from "@kilocode/kilo-i18n/bs"
import { useVSCode } from "./vscode"

export type Locale =
  | "en"
  | "zh"
  | "zht"
  | "ko"
  | "de"
  | "es"
  | "fr"
  | "da"
  | "ja"
  | "pl"
  | "ru"
  | "ar"
  | "no"
  | "br"
  | "th"
  | "bs"

export const LOCALES: readonly Locale[] = [
  "en",
  "zh",
  "zht",
  "ko",
  "de",
  "es",
  "fr",
  "da",
  "ja",
  "pl",
  "ru",
  "ar",
  "no",
  "br",
  "th",
  "bs",
]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  zh: "简体中文",
  zht: "繁體中文",
  ko: "한국어",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  da: "Dansk",
  ja: "日本語",
  pl: "Polski",
  ru: "Русский",
  ar: "العربية",
  no: "Norsk",
  br: "Português (Brasil)",
  th: "ภาษาไทย",
  bs: "Bosanski",
}

// Merge UI + Kilo dicts (kilo overrides last, English base always present)
const dicts: Record<Locale, Record<string, string>> = {
  en: { ...uiEn, ...kiloEn },
  zh: { ...uiEn, ...kiloEn, ...uiZh, ...kiloZh },
  zht: { ...uiEn, ...kiloEn, ...uiZht, ...kiloZht },
  ko: { ...uiEn, ...kiloEn, ...uiKo, ...kiloKo },
  de: { ...uiEn, ...kiloEn, ...uiDe, ...kiloDe },
  es: { ...uiEn, ...kiloEn, ...uiEs, ...kiloEs },
  fr: { ...uiEn, ...kiloEn, ...uiFr, ...kiloFr },
  da: { ...uiEn, ...kiloEn, ...uiDa, ...kiloDa },
  ja: { ...uiEn, ...kiloEn, ...uiJa, ...kiloJa },
  pl: { ...uiEn, ...kiloEn, ...uiPl, ...kiloPl },
  ru: { ...uiEn, ...kiloEn, ...uiRu, ...kiloRu },
  ar: { ...uiEn, ...kiloEn, ...uiAr, ...kiloAr },
  no: { ...uiEn, ...kiloEn, ...uiNo, ...kiloNo },
  br: { ...uiEn, ...kiloEn, ...uiBr, ...kiloBr },
  th: { ...uiEn, ...kiloEn, ...uiTh, ...kiloTh },
  bs: { ...uiEn, ...kiloEn, ...uiBs, ...kiloBs },
}

function normalizeLocale(lang: string): Locale {
  const lower = lang.toLowerCase()
  if (lower.startsWith("zh")) {
    return lower.includes("hant") ? "zht" : "zh"
  }
  for (const loc of LOCALES) {
    if (lower.startsWith(loc)) {
      return loc
    }
  }
  // Special cases
  if (lower.startsWith("nb") || lower.startsWith("nn")) {
    return "no"
  }
  if (lower.startsWith("pt")) {
    return "br"
  }
  return "en"
}

function resolveTemplate(text: string, params?: UiI18nParams) {
  if (!params) {
    return text
  }
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey) => {
    const value = params[String(rawKey)]
    return value === undefined ? "" : String(value)
  })
}

interface LanguageProviderProps {
  vscodeLanguage?: Accessor<string | undefined>
  languageOverride?: Accessor<string | undefined>
}

export const LanguageProvider: ParentComponent<LanguageProviderProps> = (props) => {
  const vscode = useVSCode()
  const [userOverride, setUserOverride] = createSignal<Locale | "">("")

  // Initialize from extension-side override
  createEffect(() => {
    const override = props.languageOverride?.()
    if (override) {
      setUserOverride(normalizeLocale(override))
    }
  })

  // Resolved locale: user override → VS Code language → browser language → "en"
  const locale = createMemo<Locale>(() => {
    const override = userOverride()
    if (override) {
      return override
    }
    const vscodeLang = props.vscodeLanguage?.()
    if (vscodeLang) {
      return normalizeLocale(vscodeLang)
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      return normalizeLocale(navigator.language)
    }
    return "en"
  })

  const dict = createMemo(() => dicts[locale()] ?? dicts.en)

  const t = (key: UiI18nKey, params?: UiI18nParams) => {
    const text = (dict() as Record<string, string>)[key] ?? String(key)
    return resolveTemplate(text, params)
  }

  const setLocale = (next: Locale | "") => {
    setUserOverride(next)
    vscode.postMessage({ type: "setLanguage", locale: next })
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, userOverride }}>
      <I18nProvider value={{ locale: () => locale(), t }}>{props.children}</I18nProvider>
    </LanguageContext.Provider>
  )
}

// Expose locale + setLocale for the LanguageTab
import { createContext, useContext } from "solid-js"

interface LanguageContextValue {
  locale: Accessor<Locale>
  setLocale: (locale: Locale | "") => void
  userOverride: Accessor<Locale | "">
}

const LanguageContext = createContext<LanguageContextValue>()

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return ctx
}
