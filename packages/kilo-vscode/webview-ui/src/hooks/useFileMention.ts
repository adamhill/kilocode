import { createEffect, createSignal, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"
import type { FileAttachment, WebviewMessage, ExtensionMessage } from "../types/messages"

const FILE_SEARCH_DEBOUNCE_MS = 150
const AT_PATTERN = /(?:^|\s)@(\S*)$/

interface VSCodeContext {
  postMessage: (message: WebviewMessage) => void
  onMessage: (handler: (message: ExtensionMessage) => void) => () => void
}

export interface FileMention {
  attachedFiles: Accessor<string[]>
  mentionResults: Accessor<string[]>
  mentionIndex: Accessor<number>
  showMention: Accessor<boolean>
  onInput: (val: string, cursor: number) => boolean
  onKeyDown: (e: KeyboardEvent, textarea: HTMLTextAreaElement | undefined) => boolean
  selectFile: (path: string, textarea: HTMLTextAreaElement) => void
  setMentionIndex: (index: number) => void
  removeFile: (path: string) => void
  closeMention: () => void
  buildFileAttachments: () => FileAttachment[]
  clearAttachedFiles: () => void
}

export function useFileMention(vscode: VSCodeContext): FileMention {
  const [attachedFiles, setAttachedFiles] = createSignal<string[]>([])
  const [mentionQuery, setMentionQuery] = createSignal<string | null>(null)
  const [mentionResults, setMentionResults] = createSignal<string[]>([])
  const [mentionIndex, setMentionIndex] = createSignal(0)

  let fileSearchTimer: ReturnType<typeof setTimeout> | undefined
  let fileSearchCounter = 0

  const showMention = () => mentionQuery() !== null && mentionResults().length > 0

  createEffect(() => {
    if (!showMention()) setMentionIndex(0)
  })

  const unsubscribe = vscode.onMessage((message) => {
    if (message.type !== "fileSearchResult") return
    const result = message as { type: "fileSearchResult"; paths: string[]; requestId: string }
    if (result.requestId === `file-search-${fileSearchCounter}`) {
      setMentionResults(result.paths)
      setMentionIndex(0)
    }
  })

  onCleanup(() => {
    unsubscribe()
    if (fileSearchTimer) clearTimeout(fileSearchTimer)
  })

  const requestFileSearch = (query: string) => {
    if (fileSearchTimer) clearTimeout(fileSearchTimer)
    fileSearchCounter++
    const requestId = `file-search-${fileSearchCounter}`
    fileSearchTimer = setTimeout(() => {
      vscode.postMessage({ type: "requestFileSearch", query, requestId })
    }, FILE_SEARCH_DEBOUNCE_MS)
  }

  const closeMention = () => {
    setMentionQuery(null)
    setMentionResults([])
  }

  const selectMentionFile = (path: string, textarea: HTMLTextAreaElement) => {
    const val = textarea.value
    const cursor = textarea.selectionStart ?? val.length
    const before = val.substring(0, cursor)
    const after = val.substring(cursor)

    // Replace @query but preserve any leading whitespace the pattern consumed
    const replaced = before.replace(AT_PATTERN, (match) => (match.startsWith(" ") ? " " : ""))
    const newText = replaced + after
    textarea.value = newText

    const newCursor = replaced.length
    textarea.setSelectionRange(newCursor, newCursor)
    textarea.focus()

    setAttachedFiles((prev) => (prev.includes(path) ? prev : [...prev, path]))
    closeMention()
  }

  const onInput = (val: string, cursor: number): boolean => {
    const before = val.substring(0, cursor)
    const match = before.match(AT_PATTERN)
    if (match) {
      setMentionQuery(match[1])
      requestFileSearch(match[1])
      return true
    }
    closeMention()
    return false
  }

  const onKeyDown = (e: KeyboardEvent, textarea: HTMLTextAreaElement | undefined): boolean => {
    if (!showMention()) return false

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setMentionIndex((i) => Math.min(i + 1, mentionResults().length - 1))
      return true
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      setMentionIndex((i) => Math.max(i - 1, 0))
      return true
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      const path = mentionResults()[mentionIndex()]
      if (path && textarea) selectMentionFile(path, textarea)
      return true
    }
    if (e.key === "Escape") {
      e.preventDefault()
      closeMention()
      return true
    }

    return false
  }

  return {
    attachedFiles,
    mentionResults,
    mentionIndex,
    showMention,
    onInput,
    onKeyDown,
    selectFile: selectMentionFile,
    setMentionIndex,
    removeFile: (path) => setAttachedFiles((prev) => prev.filter((p) => p !== path)),
    closeMention,
    buildFileAttachments: () => attachedFiles().map((path) => ({ mime: "text/plain", url: `file://${path}` })),
    clearAttachedFiles: () => setAttachedFiles([]),
  }
}
