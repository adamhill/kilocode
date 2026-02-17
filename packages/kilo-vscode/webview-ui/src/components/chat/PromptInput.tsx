/**
 * PromptInput component
 * Text input with send/abort buttons, ghost-text autocomplete, and @ file mention support
 */

import { Component, createSignal, onCleanup, Show, For, createEffect } from "solid-js"
import { Button } from "@kilocode/kilo-ui/button"
import { Tooltip } from "@kilocode/kilo-ui/tooltip"
import { FileIcon } from "@kilocode/kilo-ui/file-icon"
import { useSession } from "../../context/session"
import { useServer } from "../../context/server"
import { useLanguage } from "../../context/language"
import { useVSCode } from "../../context/vscode"
import { ModelSelector } from "./ModelSelector"
import { ModeSwitcher } from "./ModeSwitcher"
import type { FileAttachment } from "../../types/messages"

const AUTOCOMPLETE_DEBOUNCE_MS = 500
const FILE_SEARCH_DEBOUNCE_MS = 150
const MIN_TEXT_LENGTH = 3

const AT_PATTERN = /@(\S*)$/

export const PromptInput: Component = () => {
  const session = useSession()
  const server = useServer()
  const language = useLanguage()
  const vscode = useVSCode()

  const [text, setText] = createSignal("")
  const [ghostText, setGhostText] = createSignal("")
  const [attachedFiles, setAttachedFiles] = createSignal<string[]>([])
  const [mentionQuery, setMentionQuery] = createSignal<string | null>(null)
  const [mentionResults, setMentionResults] = createSignal<string[]>([])
  const [mentionIndex, setMentionIndex] = createSignal(0)

  let textareaRef: HTMLTextAreaElement | undefined
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let fileSearchTimer: ReturnType<typeof setTimeout> | undefined
  let requestCounter = 0
  let fileSearchCounter = 0

  const isBusy = () => session.status() === "busy"
  const isDisabled = () => !server.isConnected()
  const canSend = () => text().trim().length > 0 && !isBusy() && !isDisabled()
  const showMention = () => mentionQuery() !== null && mentionResults().length > 0

  createEffect(() => {
    if (!showMention()) {
      setMentionIndex(0)
    }
  })

  const unsubscribe = vscode.onMessage((message) => {
    if (message.type === "chatCompletionResult") {
      const result = message as { type: "chatCompletionResult"; text: string; requestId: string }
      const expectedId = `chat-ac-${requestCounter}`
      if (result.requestId === expectedId && result.text) {
        setGhostText(result.text)
      }
    }

    if (message.type === "fileSearchResult") {
      const result = message as { type: "fileSearchResult"; paths: string[]; requestId: string }
      const expectedId = `file-search-${fileSearchCounter}`
      if (result.requestId === expectedId) {
        setMentionResults(result.paths)
        setMentionIndex(0)
      }
    }
  })

  onCleanup(() => {
    unsubscribe()
    if (debounceTimer) clearTimeout(debounceTimer)
    if (fileSearchTimer) clearTimeout(fileSearchTimer)
  })

  const requestAutocomplete = (currentText: string) => {
    if (currentText.length < MIN_TEXT_LENGTH || isDisabled()) {
      setGhostText("")
      return
    }

    requestCounter++
    vscode.postMessage({
      type: "requestChatCompletion",
      text: currentText,
      requestId: `chat-ac-${requestCounter}`,
    })
  }

  const requestFileSearch = (query: string) => {
    if (fileSearchTimer) clearTimeout(fileSearchTimer)
    fileSearchTimer = setTimeout(() => {
      fileSearchCounter++
      vscode.postMessage({
        type: "requestFileSearch",
        query,
        requestId: `file-search-${fileSearchCounter}`,
      })
    }, FILE_SEARCH_DEBOUNCE_MS)
  }

  const acceptSuggestion = () => {
    const suggestion = ghostText()
    if (!suggestion) return

    const newText = text() + suggestion
    setText(newText)
    setGhostText("")

    vscode.postMessage({
      type: "chatCompletionAccepted",
      suggestionLength: suggestion.length,
    })

    if (textareaRef) {
      textareaRef.value = newText
      adjustHeight()
    }
  }

  const dismissSuggestion = () => {
    setGhostText("")
  }

  const adjustHeight = () => {
    if (!textareaRef) return
    textareaRef.style.height = "auto"
    textareaRef.style.height = `${Math.min(textareaRef.scrollHeight, 200)}px`
  }

  const closeMention = () => {
    setMentionQuery(null)
    setMentionResults([])
  }

  const selectMentionFile = (path: string) => {
    if (!textareaRef) return

    const val = textareaRef.value
    const cursor = textareaRef.selectionStart ?? val.length
    const before = val.substring(0, cursor)
    const after = val.substring(cursor)

    const replaced = before.replace(AT_PATTERN, "")
    const newText = replaced + after
    setText(newText)
    textareaRef.value = newText

    const newCursor = replaced.length
    textareaRef.setSelectionRange(newCursor, newCursor)
    textareaRef.focus()
    adjustHeight()

    setAttachedFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
    closeMention()
  }

  const removeFile = (path: string) => {
    setAttachedFiles((prev) => prev.filter((p) => p !== path))
  }

  const handleInput = (e: InputEvent) => {
    const target = e.target as HTMLTextAreaElement
    const val = target.value
    setText(val)
    adjustHeight()
    setGhostText("")

    const cursor = target.selectionStart ?? val.length
    const before = val.substring(0, cursor)
    const match = before.match(AT_PATTERN)

    if (match) {
      const query = match[1]
      setMentionQuery(query)
      requestFileSearch(query)
    } else {
      closeMention()
    }

    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      requestAutocomplete(val)
    }, AUTOCOMPLETE_DEBOUNCE_MS)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (showMention()) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setMentionIndex((i) => Math.min(i + 1, mentionResults().length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setMentionIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        const path = mentionResults()[mentionIndex()]
        if (path) selectMentionFile(path)
        return
      }
      if (e.key === "Escape") {
        e.preventDefault()
        closeMention()
        return
      }
    }

    if ((e.key === "Tab" || e.key === "ArrowRight") && ghostText()) {
      e.preventDefault()
      acceptSuggestion()
      return
    }

    if (e.key === "Escape" && ghostText()) {
      e.preventDefault()
      dismissSuggestion()
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      dismissSuggestion()
      handleSend()
    }
  }

  const handleSend = () => {
    const message = text().trim()
    if (!message || isBusy() || isDisabled()) return

    const files = attachedFiles().map<FileAttachment>((path) => ({
      mime: "text/plain",
      url: `file://${path}`,
    }))

    const sel = session.selected()
    session.sendMessage(message, sel?.providerID, sel?.modelID, files.length > 0 ? files : undefined)
    setText("")
    setGhostText("")
    setAttachedFiles([])
    closeMention()

    if (textareaRef) {
      textareaRef.style.height = "auto"
    }
  }

  const handleAbort = () => {
    session.abort()
  }

  const fileName = (path: string) => path.split("/").pop() ?? path
  const dirName = (path: string) => {
    const parts = path.split("/")
    if (parts.length <= 1) return ""
    const dir = parts.slice(0, -1).join("/")
    return dir.length > 30 ? `…/${parts.slice(-3, -1).join("/")}` : dir
  }

  return (
    <div class="prompt-input-container">
      <Show when={showMention()}>
        <div class="file-mention-dropdown">
          <For each={mentionResults()}>
            {(path, index) => (
              <div
                class="file-mention-item"
                classList={{ "file-mention-item--active": index() === mentionIndex() }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  selectMentionFile(path)
                }}
                onMouseEnter={() => setMentionIndex(index())}
              >
                <FileIcon node={{ path, type: "file" }} class="file-mention-icon" />
                <span class="file-mention-name">{fileName(path)}</span>
                <span class="file-mention-dir">{dirName(path)}</span>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="prompt-input-wrapper">
        <div class="prompt-input-ghost-wrapper">
          <textarea
            ref={textareaRef}
            class="prompt-input"
            placeholder={
              isDisabled() ? language.t("prompt.placeholder.connecting") : language.t("prompt.placeholder.default")
            }
            value={text()}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isDisabled()}
            rows={1}
          />
          <Show when={ghostText()}>
            <div class="prompt-input-ghost-overlay" aria-hidden="true">
              <span class="prompt-input-ghost-text-hidden">{text()}</span>
              <span class="prompt-input-ghost-text">{ghostText()}</span>
            </div>
          </Show>
        </div>
        <div class="prompt-input-actions">
          <Show
            when={isBusy()}
            fallback={
              <Tooltip value={language.t("prompt.action.send")} placement="top">
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSend}
                  disabled={!canSend()}
                  aria-label={language.t("prompt.action.send")}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M1.5 1.5L14.5 8L1.5 14.5V9L10 8L1.5 7V1.5Z" />
                  </svg>
                </Button>
              </Tooltip>
            }
          >
            <Tooltip value={language.t("prompt.action.stop")} placement="top">
              <Button variant="ghost" size="small" onClick={handleAbort} aria-label={language.t("prompt.action.stop")}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="3" y="3" width="10" height="10" rx="1" />
                </svg>
              </Button>
            </Tooltip>
          </Show>
        </div>
      </div>
      <Show when={attachedFiles().length > 0}>
        <div class="file-chips-row">
          <For each={attachedFiles()}>
            {(path) => (
              <div class="file-chip">
                <FileIcon node={{ path, type: "file" }} class="file-chip-icon" />
                <span class="file-chip-name">{fileName(path)}</span>
                <button class="file-chip-remove" onClick={() => removeFile(path)} aria-label="Remove file">
                  ×
                </button>
              </div>
            )}
          </For>
        </div>
      </Show>
      <div class="prompt-input-hint">
        <ModeSwitcher />
        <ModelSelector />
      </div>
    </div>
  )
}
