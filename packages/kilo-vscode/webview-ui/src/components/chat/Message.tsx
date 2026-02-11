/**
 * Message component
 * Displays a single chat message with its parts (text, tool calls, reasoning)
 *
 * Uses kilo-ui components:
 * - Markdown for rendering assistant text (headings, lists, code blocks, links)
 * - BasicTool for tool call display (collapsible with icon, title, subtitle)
 * - Collapsible for reasoning blocks
 * - Spinner for pending/running tool status
 */

import { Component, For, Show, JSX } from "solid-js"
import { Markdown } from "@kilocode/kilo-ui/markdown"
import { Spinner } from "@kilocode/kilo-ui/spinner"
import { BasicTool } from "@kilocode/kilo-ui/basic-tool"
import { Collapsible } from "@kilocode/kilo-ui/collapsible"
import { useSession } from "../../context/session"
import type { Message as MessageType, Part, TextPart, ToolPart, ReasoningPart } from "../../types/messages"

interface MessageProps {
  message: MessageType
}

// Text part display — renders markdown for assistant, plain text for user
const TextPartView: Component<{ part: TextPart; role: string }> = (props) => {
  return (
    <Show when={props.role === "assistant"} fallback={<div class="message-text">{props.part.text}</div>}>
      <Markdown text={props.part.text} />
    </Show>
  )
}

// Reasoning part display — collapsible "Thinking..." block
const ReasoningPartView: Component<{ part: ReasoningPart }> = (props) => {
  return (
    <Collapsible variant="ghost">
      <Collapsible.Trigger>
        <span>💭 Thinking...</span>
        <Collapsible.Arrow />
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div class="message-text" style={{ "font-style": "italic", opacity: 0.8 }}>
          {props.part.text}
        </div>
      </Collapsible.Content>
    </Collapsible>
  )
}

// Tool part display — uses BasicTool for collapsible tool header
const ToolPartView: Component<{ part: ToolPart }> = (props) => {
  const getStatusIcon = (): string => {
    switch (props.part.state.status) {
      case "pending":
      case "running":
        return "settings-gear"
      case "completed":
        return "check-small"
      case "error":
        return "circle-x"
    }
  }

  const getTitle = () => {
    if ("title" in props.part.state && props.part.state.title) {
      return props.part.state.title as string
    }
    return props.part.tool
  }

  const isActive = () => props.part.state.status === "pending" || props.part.state.status === "running"

  return (
    <div data-component="tool-part-wrapper">
      <BasicTool
        icon={getStatusIcon()}
        defaultOpen={false}
        trigger={{
          title: getTitle(),
          subtitle: props.part.tool !== getTitle() ? props.part.tool : undefined,
          action: isActive() ? ((<Spinner style={{ width: "14px", height: "14px" }} />) as JSX.Element) : undefined,
        }}
      >
        <div style={{ padding: "8px", "font-size": "12px" }}>
          <div>
            <strong>Input:</strong>
            <pre style={{ margin: "4px 0 8px", "white-space": "pre-wrap", "word-break": "break-word" }}>
              {JSON.stringify(props.part.state.input, null, 2)}
            </pre>
          </div>
          <Show when={props.part.state.status === "completed" && "output" in props.part.state}>
            <div>
              <strong>Output:</strong>
              <pre style={{ margin: "4px 0 0", "white-space": "pre-wrap", "word-break": "break-word" }}>
                {(props.part.state as { output: string }).output}
              </pre>
            </div>
          </Show>
          <Show when={props.part.state.status === "error" && "error" in props.part.state}>
            <div style={{ color: "var(--vscode-errorForeground)" }}>
              <strong>Error:</strong>
              <pre style={{ margin: "4px 0 0", "white-space": "pre-wrap", "word-break": "break-word" }}>
                {(props.part.state as { error: string }).error}
              </pre>
            </div>
          </Show>
        </div>
      </BasicTool>
    </div>
  )
}

// Part renderer
const PartView: Component<{ part: Part; role: string }> = (props) => {
  // Skip step-start and step-finish parts - they're metadata, not displayable content
  if (props.part.type === "step-start" || props.part.type === "step-finish") {
    return null
  }

  return (
    <>
      <Show when={props.part.type === "text"}>
        <TextPartView part={props.part as TextPart} role={props.role} />
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
              <Show
                when={props.message.role === "assistant"}
                fallback={<div class="message-text">{props.message.content}</div>}
              >
                <Markdown text={props.message.content!} />
              </Show>
            </Show>
          }
        >
          <For each={parts()}>{(part) => <PartView part={part} role={props.message.role} />}</For>
        </Show>
      </div>
    </div>
  )
}
