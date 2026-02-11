/**
 * SessionList component
 * Displays all sessions sorted by most recent, allowing selection.
 * Uses kilo-ui List component for keyboard navigation and accessibility.
 */

import { Component, onMount } from "solid-js"
import { List } from "@kilocode/kilo-ui/list"
import { useSession } from "../../context/session"
import type { SessionInfo } from "../../types/messages"

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

  const currentSession = (): SessionInfo | undefined => {
    const id = session.currentSessionID()
    return session.sessions().find((s) => s.id === id)
  }

  return (
    <div class="session-list">
      <List<SessionInfo>
        items={session.sessions()}
        key={(s) => s.id}
        filterKeys={["title"]}
        current={currentSession()}
        onSelect={(s) => {
          if (s) {
            props.onSelectSession(s.id)
          }
        }}
        search={{ placeholder: "Search sessions...", autofocus: false }}
        emptyMessage="No sessions yet. Click + to start a new conversation."
      >
        {(s) => (
          <>
            <span data-slot="list-item-title">{s.title || "Untitled"}</span>
            <span data-slot="list-item-description">{formatRelativeDate(s.updatedAt)}</span>
          </>
        )}
      </List>
    </div>
  )
}

export default SessionList
