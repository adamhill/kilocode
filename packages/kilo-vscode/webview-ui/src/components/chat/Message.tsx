/**
 * Message component
 * Displays a single chat message with its parts (text, tool calls, reasoning)
 */

import { Component, For, Show, createSignal, JSX } from "solid-js"
import { Spinner } from "@kilocode/kilo-ui/spinner"
import { useSession } from "../../context/session"
import type { Message as MessageType, Part, TextPart, ToolPart, ReasoningPart } from "../../types/messages"

interface MessageProps {
  message: MessageType
}

// Text part display
const TextPartView: Component<{ part: TextPart }> = (props) => {
  return <div class="message-text">{props.part.text}</div>
}

// Reasoning part display
const ReasoningPartView: Component<{ part: ReasoningPart }> = (props) => {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="message-reasoning">
      <button class="reasoning-header" onClick={() => setExpanded(!expanded())} aria-expanded={expanded()}>
        <span class="reasoning-icon">💭</span>
        <span class="reasoning-label">Thinking...</span>
        <span class="reasoning-toggle">{expanded() ? "▼" : "▶"}</span>
      </button>
      <Show when={expanded()}>
        <div class="reasoning-content">{props.part.text}</div>
      </Show>
    </div>
  )
}

// Tool part display
const ToolPartView: Component<{ part: ToolPart }> = (props) => {
  const [expanded, setExpanded] = createSignal(false)

  const getStatusIcon = (): JSX.Element | string => {
    switch (props.part.state.status) {
      case "pending":
      case "running":
        return <Spinner style={{ width: "14px", height: "14px" }} />
      case "completed":
        return "✓"
      case "error":
        return "✕"
    }
  }

  const getStatusClass = () => {
    return `tool-status-${props.part.state.status}`
  }

  const getTitle = () => {
    if ("title" in props.part.state && props.part.state.title) {
      return props.part.state.title
    }
    return props.part.tool
  }

  return (
    <div class={`message-tool ${getStatusClass()}`}>
      <button class="tool-header" onClick={() => setExpanded(!expanded())} aria-expanded={expanded()}>
        <span class="tool-icon">{getStatusIcon()}</span>
        <span class="tool-name">{getTitle()}</span>
        <span class="tool-toggle">{expanded() ? "▼" : "▶"}</span>
      </button>
      <Show when={expanded()}>
        <div class="tool-details">
          <div class="tool-input">
            <strong>Input:</strong>
            <pre>{JSON.stringify(props.part.state.input, null, 2)}</pre>
          </div>
          <Show when={props.part.state.status === "completed" && "output" in props.part.state}>
            <div class="tool-output">
              <strong>Output:</strong>
              <pre>{(props.part.state as { output: string }).output}</pre>
            </div>
          </Show>
          <Show when={props.part.state.status === "error" && "error" in props.part.state}>
            <div class="tool-error">
              <strong>Error:</strong>
              <pre>{(props.part.state as { error: string }).error}</pre>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

// Part renderer
const PartView: Component<{ part: Part }> = (props) => {
  // Skip step-start and step-finish parts - they're metadata, not displayable content
  if (props.part.type === "step-start" || props.part.type === "step-finish") {
    return null
  }

  return (
    <>
      <Show when={props.part.type === "text"}>
        <TextPartView part={props.part as TextPart} />
      </Show>
      <Show when={props.part.type === "tool"}>
        <ToolPartView part={props.part as ToolPart} />
      </Show>
      <Show when={props.part.type === "reasoning"}>
        <ReasoningPartView part={props.part as ReasoningPart} />
      </Show>
    </>
  )
}

export const Message: Component<MessageProps> = (props) => {
  const session = useSession()

  // Get parts for this message from the store
  const parts = () => session.getParts(props.message.id)

  // Determine if we should show parts or content
  const hasParts = () => parts().length > 0

  return (
    <div class={`message message-${props.message.role}`}>
      <div class="message-header">
        <span class="message-role">{props.message.role === "user" ? "You" : "Assistant"}</span>
      </div>
      <div class="message-content">
        <Show
          when={hasParts()}
          fallback={
            <Show when={props.message.content}>
              <div class="message-text">{props.message.content}</div>
            </Show>
          }
        >
          <For each={parts()}>{(part) => <PartView part={part} />}</For>
        </Show>
      </div>
    </div>
  )
}
