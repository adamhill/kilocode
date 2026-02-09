/**
 * SessionList component
 * Displays all sessions sorted by most recent, allowing selection
 */

import { Component, For, Show, onMount } from "solid-js"
import { useSession } from "../../context/session"

function formatRelativeDate(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) {
    return "just now"
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days}d ago`
  }

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

interface SessionListProps {
  onSelectSession: (id: string) => void
}

const SessionList: Component<SessionListProps> = (props) => {
  const session = useSession()

  onMount(() => {
    console.log("[Kilo New] SessionList mounted, loading sessions")
    session.loadSessions()
  })

  return (
    <div class="session-list">
      <Show
        when={session.sessions().length > 0}
        fallback={
          <div class="session-list-empty">
            <p>No sessions yet. Click + to start a new conversation.</p>
          </div>
        }
      >
        <For each={session.sessions()}>
          {(s) => (
            <div
              class="session-item"
              classList={{ "session-item-active": s.id === session.currentSessionID() }}
              onClick={() => props.onSelectSession(s.id)}
            >
              <div class="session-item-title">{s.title || "Untitled"}</div>
              <div class="session-item-date">{formatRelativeDate(s.updatedAt)}</div>
            </div>
          )}
        </For>
      </Show>
    </div>
  )
}

export default SessionList
