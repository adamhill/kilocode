/**
 * TaskHeader component
 * Sticky header above the chat messages showing session title,
 * cost, context usage, and a compact button.
 */

import { Component, Show, createMemo } from "solid-js"
import { IconButton } from "@kilocode/kilo-ui/icon-button"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { useSession } from "../../context/session"

export const TaskHeader: Component = () => {
  const session = useSession()

  const title = createMemo(() => session.currentSession()?.title)
  const hasMessages = createMemo(() => session.messages().length > 0)
  const visible = createMemo(() => hasMessages())
  const busy = createMemo(() => session.status() === "busy")

  const cost = createMemo(() => {
    const total = session.totalCost()
    if (total === 0) return undefined
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total)
  })

  const context = createMemo(() => {
    const usage = session.contextUsage()
    if (!usage) return undefined
    const tokens = usage.tokens.toLocaleString("en-US")
    const pct = usage.percentage !== null ? `${usage.percentage}%` : undefined
    return { tokens, pct }
  })

  return (
    <Show when={visible()}>
      <div class="task-header">
        <div class="task-header-title" title={title()}>
          {title()}
        </div>
        <div class="task-header-stats">
          <Show when={cost()}>
            {(c) => (
              <Tooltip value="Session cost" placement="bottom">
                <span class="task-header-stat">{c()}</span>
              </Tooltip>
            )}
          </Show>
          <Show when={context()}>
            {(ctx) => (
              <Tooltip
                value={ctx().pct ? `${ctx().tokens} tokens (${ctx().pct} of context)` : `${ctx().tokens} tokens`}
                placement="bottom"
              >
                <span class="task-header-stat">{ctx().pct ?? ctx().tokens}</span>
              </Tooltip>
            )}
          </Show>
          <Tooltip value="Compact session" placement="bottom">
            <IconButton
              icon="collapse"
              size="small"
              variant="ghost"
              disabled={busy() || !hasMessages()}
              onClick={() => session.compact()}
              aria-label="Compact session"
            />
          </Tooltip>
        </div>
      </div>
    </Show>
  )
}
