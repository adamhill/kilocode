import { Component, createSignal } from "solid-js"
import { Dialog } from "@kilocode/kilo-ui/dialog"
import { Button } from "@kilocode/kilo-ui/button"
import { TextField } from "@kilocode/kilo-ui/text-field"
import { useDialog } from "@kilocode/kilo-ui/context/dialog"
import { useLanguage } from "../../context/language"

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

function extractSessionId(raw: string): string | null {
  const match = raw.trim().match(UUID_RE)
  return match ? match[0] : null
}

interface CloudImportDialogProps {
  onImport: (sessionId: string) => void
}

export const CloudImportDialog: Component<CloudImportDialogProps> = (props) => {
  const language = useLanguage()
  const dialog = useDialog()
  const [value, setValue] = createSignal("")
  const [error, setError] = createSignal<string | undefined>(undefined)

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
      <div class="dialog-confirm-body">
        <TextField
          autofocus
          placeholder={language.t("session.cloud.import.placeholder")}
          value={value()}
          onChange={setValue}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === "Enter") submit()
          }}
          validationState={error() ? "invalid" : undefined}
          error={error()}
        />
        <div class="dialog-confirm-actions">
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
