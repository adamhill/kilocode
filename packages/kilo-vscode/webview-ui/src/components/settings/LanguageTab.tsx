import { Component } from "solid-js"
import { Select } from "@kilocode/kilo-ui/select"
import { useLanguage, LOCALES, LOCALE_LABELS, type Locale } from "../../context/language"

const options = ["", ...LOCALES] as const
type Option = "" | Locale

const LanguageTab: Component = () => {
  const language = useLanguage()

  return (
    <div style={{ padding: "16px" }}>
      <p style={{ "font-size": "13px", "margin-bottom": "12px" }}>
        Choose the language for the Kilo Code UI. "Auto" uses your VS Code display language.
      </p>
      <Select
        options={[...options]}
        current={language.userOverride()}
        label={(opt: Option) => (opt === "" ? "Auto (VS Code language)" : LOCALE_LABELS[opt])}
        value={(opt: Option) => opt}
        onSelect={(opt) => {
          if (opt !== undefined) {
            language.setLocale(opt as Locale | "")
          }
        }}
        variant="secondary"
        size="large"
      />
      <p style={{ "font-size": "12px", color: "var(--vscode-descriptionForeground)", "margin-top": "8px" }}>
        Current: {LOCALE_LABELS[language.locale()]}
      </p>
    </div>
  )
}

export default LanguageTab
