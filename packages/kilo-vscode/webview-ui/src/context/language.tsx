/**
 * Language context
 * Provides i18n translations for kilo-ui components.
 * Merges UI translations from @opencode-ai/ui and Kilo overrides from @kilocode/kilo-i18n.
 * Follows the same pattern as the desktop app (packages/app/src/context/language.tsx).
 */

import { createMemo, ParentComponent } from "solid-js"
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

type Locale =
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

// Merge UI + Kilo dicts (kilo overrides last)
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

function detectLocale(): Locale {
  if (typeof navigator !== "object") {
    return "en"
  }

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    if (!language) {
      continue
    }
    const lower = language.toLowerCase()
    if (lower.startsWith("zh")) {
      return lower.includes("hant") ? "zht" : "zh"
    }
    if (lower.startsWith("ko")) {
      return "ko"
    }
    if (lower.startsWith("de")) {
      return "de"
    }
    if (lower.startsWith("es")) {
      return "es"
    }
    if (lower.startsWith("fr")) {
      return "fr"
    }
    if (lower.startsWith("da")) {
      return "da"
    }
    if (lower.startsWith("ja")) {
      return "ja"
    }
    if (lower.startsWith("pl")) {
      return "pl"
    }
    if (lower.startsWith("ru")) {
      return "ru"
    }
    if (lower.startsWith("ar")) {
      return "ar"
    }
    if (lower.startsWith("no") || lower.startsWith("nb") || lower.startsWith("nn")) {
      return "no"
    }
    if (lower.startsWith("pt")) {
      return "br"
    }
    if (lower.startsWith("th")) {
      return "th"
    }
    if (lower.startsWith("bs")) {
      return "bs"
    }
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

export const LanguageProvider: ParentComponent = (props) => {
  const locale = createMemo<Locale>(detectLocale)
  const dict = createMemo(() => dicts[locale()] ?? dicts.en)

  const t = (key: UiI18nKey, params?: UiI18nParams) => {
    const text = (dict() as Record<string, string>)[key] ?? String(key)
    return resolveTemplate(text, params)
  }

  return <I18nProvider value={{ locale: () => locale(), t }}>{props.children}</I18nProvider>
}
