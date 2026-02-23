import { Component, createSignal } from "solid-js"
import { Dialog } from "@kilocode/kilo-ui/dialog"
import { Button } from "@kilocode/kilo-ui/button"
import { useDialog } from "@kilocode/kilo-ui/context/dialog"
import { useLanguage } from "../../context/language"

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function extractSessionId(raw: string): string | null {
  const trimmed = raw.trim()
  const match = trimmed.match(UUID_RE)
  return match ? match[0] : null
}

interface CloudImportDialogProps {
  onImport: (sessionId: string) => void
}

export const CloudImportDialog: Component<CloudImportDialogProps> = (props) => {
  const language = useLanguage()
  const dialog = useDialog()
  const [value, setValue] = createSignal("")
  const [error, setError] = createSignal<string | null>(null)

  function submit() {
    const id = extractSessionId(value())
    if (!id) {
      setError(language.t("session.cloud.import.invalid"))
      return
    }
    props.onImport(id)
    dialog.close()
  }

  return (
    <Dialog title={language.t("session.cloud.import.title")} fit>
      <div class="cloud-import-dialog">
        <input
          class="cloud-import-input"
          type="text"
          placeholder={language.t("session.cloud.import.placeholder")}
          value={value()}
          onInput={(e) => {
            setValue(e.currentTarget.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit()
          }}
          autofocus
        />
        {error() && <span class="cloud-import-error">{error()}</span>}
        <div class="cloud-import-actions">
          <Button variant="ghost" size="large" onClick={() => dialog.close()}>
            {language.t("common.cancel")}
          </Button>
          <Button variant="primary" size="large" onClick={submit}>
            {language.t("session.cloud.import.button")}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
