/**
 * MessageList component
 * Scrollable list of messages with auto-scroll behavior
 */

import { Component, For, Show, createSignal, createEffect, onCleanup } from "solid-js"
import { useSession } from "../../context/session"
import { Message } from "./Message"

export const MessageList: Component = () => {
  const session = useSession()

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

  const messages = () => session.messages()
  const isEmpty = () => messages().length === 0

  return (
    <div class="message-list-container">
      <div ref={containerRef} class="message-list" role="log" aria-live="polite">
        <Show when={isEmpty()}>
          <div class="message-list-empty">
            <p>Start a conversation by typing a message below.</p>
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
