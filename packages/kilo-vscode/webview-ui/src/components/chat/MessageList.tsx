/**
 * MessageList component
 * Scrollable list of messages with auto-scroll behavior.
 * Shows recent sessions in the empty state for quick resumption.
 */

import { Component, For, Show, createSignal, createEffect, createMemo, onCleanup } from "solid-js"
import { useSession } from "../../context/session"
import { useServer } from "../../context/server"
import { Message } from "./Message"

interface MessageListProps {
  onSelectSession?: (id: string) => void
}

function formatRelativeDate(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = now - then

  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export const MessageList: Component<MessageListProps> = (props) => {
  const session = useSession()
  const server = useServer()

  let containerRef: HTMLDivElement | undefined
  const [isAtBottom, setIsAtBottom] = createSignal(true)
  const [showScrollButton, setShowScrollButton] = createSignal(false)

  // Check if scrolled to bottom
  const checkScrollPosition = () => {
    if (!containerRef) return

    const threshold = 50 // pixels from bottom
    const atBottom = containerRef.scrollHeight - containerRef.scrollTop - containerRef.clientHeight < threshold
    setIsAtBottom(atBottom)
    setShowScrollButton(!atBottom)
  }

  // Scroll to bottom
  const scrollToBottom = () => {
    if (!containerRef) return
    containerRef.scrollTo({
      top: containerRef.scrollHeight,
      behavior: "smooth",
    })
  }

  // Auto-scroll when new messages arrive (if already at bottom)
  createEffect(() => {
    const msgs = session.messages()
    if (msgs.length > 0 && isAtBottom()) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (containerRef) {
          containerRef.scrollTop = containerRef.scrollHeight
        }
      })
    }
  })

  // Set up scroll listener
  createEffect(() => {
    if (!containerRef) return

    containerRef.addEventListener("scroll", checkScrollPosition)
    onCleanup(() => {
      containerRef?.removeEventListener("scroll", checkScrollPosition)
    })
  })

  // Load sessions once connected so the recent list is available immediately.
  // Uses createEffect instead of onMount so it retries when connection state changes.
  createEffect(() => {
    if (server.isConnected() && session.sessions().length === 0) {
      session.loadSessions()
    }
  })

  const messages = () => session.messages()
  const isEmpty = () => messages().length === 0 && !session.loading()

  // 3 most recently created sessions (youngest first)
  const recent = createMemo(() =>
    [...session.sessions()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3),
  )

  return (
    <div class="message-list-container">
      <div ref={containerRef} class="message-list" role="log" aria-live="polite">
        <Show when={isEmpty()}>
          <div class="message-list-empty">
            <p>Start a conversation by typing a message below.</p>
            <Show when={recent().length > 0 && props.onSelectSession}>
              <div class="recent-sessions">
                <span class="recent-sessions-label">Recent</span>
                <For each={recent()}>
                  {(s) => (
                    <button class="recent-session-item" onClick={() => props.onSelectSession?.(s.id)}>
                      <span class="recent-session-title">{s.title || "Untitled"}</span>
                      <span class="recent-session-date">{formatRelativeDate(s.updatedAt)}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
        <For each={messages()}>{(message) => <Message message={message} />}</For>
      </div>

      <Show when={showScrollButton()}>
        <button class="scroll-to-bottom-button" onClick={scrollToBottom} aria-label="Scroll to bottom">
          ↓
        </button>
      </Show>
    </div>
  )
}
