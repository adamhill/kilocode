/**
 * ModeSwitcher component
 * Dropdown for selecting an agent/mode in the chat prompt area.
 * Mirrors the pattern used in ModelSelector.
 */

import { Component, createSignal, createEffect, onCleanup, For, Show } from "solid-js"
import { useSession } from "../../context/session"

export const ModeSwitcher: Component = () => {
  const session = useSession()

  const [open, setOpen] = createSignal(false)
  let containerRef: HTMLDivElement | undefined

  const available = () => session.agents()
  const hasAgents = () => available().length > 1

  // Click-outside handler
  createEffect(() => {
    if (!open()) {
      return
    }

    const handler = (e: MouseEvent) => {
      if (containerRef && !containerRef.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handler)
    onCleanup(() => document.removeEventListener("mousedown", handler))
  })

  function toggle() {
    if (!hasAgents()) {
      return
    }
    setOpen((prev) => !prev)
  }

  function pick(name: string) {
    session.selectAgent(name)
    setOpen(false)
  }

  const triggerLabel = () => {
    const name = session.selectedAgent()
    const agent = available().find((a) => a.name === name)
    if (agent) {
      // Capitalize first letter for display
      return agent.name.charAt(0).toUpperCase() + agent.name.slice(1)
    }
    return name || "Code"
  }

  return (
    <div class="mode-switcher" ref={containerRef}>
      <button
        class="mode-switcher-trigger"
        onClick={toggle}
        disabled={!hasAgents()}
        aria-haspopup="listbox"
        aria-expanded={open()}
        title={`Mode: ${session.selectedAgent()}`}
      >
        <span class="mode-switcher-trigger-label">{triggerLabel()}</span>
        <Show when={hasAgents()}>
          <svg class="mode-switcher-trigger-chevron" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4l4 5H4l4-5z" />
          </svg>
        </Show>
      </button>

      <Show when={open()}>
        <div class="mode-switcher-dropdown" role="listbox">
          <For each={available()}>
            {(agent) => (
              <div
                class={`mode-switcher-item${agent.name === session.selectedAgent() ? " selected" : ""}`}
                role="option"
                aria-selected={agent.name === session.selectedAgent()}
                onClick={() => pick(agent.name)}
              >
                <span class="mode-switcher-item-name">{agent.name.charAt(0).toUpperCase() + agent.name.slice(1)}</span>
                <Show when={agent.description}>
                  <span class="mode-switcher-item-desc">{agent.description}</span>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
