/**
 * ThinkingSelector component
 * Popover-based dropdown for choosing a thinking effort variant.
 * Only rendered when the selected model supports reasoning variants.
 */

import { Component, createSignal, For, Show } from "solid-js"
import { Popover } from "@kilocode/kilo-ui/popover"
import { Button } from "@kilocode/kilo-ui/button"
import { useSession } from "../../context/session"
import { useLanguage } from "../../context/language"

export const ThinkingSelector: Component = () => {
  const session = useSession()
  const language = useLanguage()
  const [open, setOpen] = createSignal(false)

  const variants = () => session.variantList()
  const current = () => session.currentVariant()

  function pick(value: string | undefined) {
    session.selectVariant(value)
    setOpen(false)
  }

  const triggerLabel = () => {
    const v = current()
    return v ? v.charAt(0).toUpperCase() + v.slice(1) : language.t("common.default")
  }

  return (
    <Show when={variants().length > 0}>
      <Popover
        placement="top-start"
        open={open()}
        onOpenChange={setOpen}
        triggerAs={Button}
        triggerProps={{ variant: "ghost", size: "small" }}
        trigger={
          <>
            <span class="thinking-selector-trigger-label">{triggerLabel()}</span>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" style={{ "flex-shrink": "0" }}>
              <path d="M8 4l4 5H4l4-5z" />
            </svg>
          </>
        }
      >
        <div class="thinking-selector-list" role="listbox">
          <div
            class={`thinking-selector-item${!current() ? " selected" : ""}`}
            role="option"
            aria-selected={!current()}
            onClick={() => pick(undefined)}
          >
            <span class="thinking-selector-item-name" style={{ "font-style": "italic" }}>
              {language.t("common.default")}
            </span>
          </div>
          <For each={variants()}>
            {(v) => (
              <div
                class={`thinking-selector-item${current() === v ? " selected" : ""}`}
                role="option"
                aria-selected={current() === v}
                onClick={() => pick(v)}
              >
                <span class="thinking-selector-item-name">{v.charAt(0).toUpperCase() + v.slice(1)}</span>
              </div>
            )}
          </For>
        </div>
      </Popover>
    </Show>
  )
}
