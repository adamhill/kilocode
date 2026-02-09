/**
 * Session context
 * Manages session state, messages, and handles SSE events from the extension.
 * Also owns per-session model selection (provider context is catalog-only).
 */

import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  createEffect,
  onMount,
  onCleanup,
  ParentComponent,
  Accessor,
  batch,
} from "solid-js"
import { createStore, produce } from "solid-js/store"
import { useVSCode } from "./vscode"
import { useServer } from "./server"
import { useProvider } from "./provider"
import type {
  SessionInfo,
  Message,
  Part,
  PartDelta,
  SessionStatus,
  PermissionRequest,
  TodoItem,
  ModelSelection,
  ExtensionMessage,
} from "../types/messages"

// Store structure for messages and parts
interface SessionStore {
  sessions: Record<string, SessionInfo>
  messages: Record<string, Message[]> // sessionID -> messages
  parts: Record<string, Part[]> // messageID -> parts
  todos: Record<string, TodoItem[]> // sessionID -> todos
  modelSelections: Record<string, ModelSelection> // sessionID -> model
}

interface SessionContextValue {
  // Current session
  currentSessionID: Accessor<string | undefined>
  currentSession: Accessor<SessionInfo | undefined>
  setCurrentSessionID: (id: string | undefined) => void

  // All sessions (sorted most recent first)
  sessions: Accessor<SessionInfo[]>

  // Session status
  status: Accessor<SessionStatus>

  // Messages for current session
  messages: Accessor<Message[]>

  // Parts for a specific message
  getParts: (messageID: string) => Part[]

  // Todos for current session
  todos: Accessor<TodoItem[]>

  // Pending permission requests
  permissions: Accessor<PermissionRequest[]>

  // Model selection (per-session)
  selected: Accessor<ModelSelection | null>
  selectModel: (providerID: string, modelID: string) => void

  // Actions
  sendMessage: (text: string, providerID?: string, modelID?: string) => void
  abort: () => void
  respondToPermission: (permissionId: string, response: "once" | "always" | "reject") => void
  createSession: () => void
  loadSessions: () => void
  selectSession: (id: string) => void
}

const SessionContext = createContext<SessionContextValue>()

export const SessionProvider: ParentComponent = (props) => {
  const vscode = useVSCode()
  const server = useServer()
  const provider = useProvider()

  // Current session ID
  const [currentSessionID, setCurrentSessionID] = createSignal<string | undefined>()

  // Session status
  const [status, setStatus] = createSignal<SessionStatus>("idle")

  // Pending permissions
  const [permissions, setPermissions] = createSignal<PermissionRequest[]>([])

  // Pending model selection for before a session exists
  const [pendingModelSelection, setPendingModelSelection] = createSignal<ModelSelection | null>(null)

  // Store for sessions, messages, parts, todos, modelSelections
  const [store, setStore] = createStore<SessionStore>({
    sessions: {},
    messages: {},
    parts: {},
    todos: {},
    modelSelections: {},
  })

  // Initialize pending selection from provider's defaultSelection once it loads
  createEffect(() => {
    const def = provider.defaultSelection()
    if (!pendingModelSelection()) {
      setPendingModelSelection(def)
    }
  })

  // Per-session model selection
  const selected = createMemo<ModelSelection | null>(() => {
    const id = currentSessionID()
    if (id) {
      return store.modelSelections[id] ?? provider.defaultSelection()
    }
    return pendingModelSelection()
  })

  function selectModel(providerID: string, modelID: string) {
    const selection: ModelSelection = { providerID, modelID }
    const id = currentSessionID()
    if (id) {
      setStore("modelSelections", id, selection)
    } else {
      setPendingModelSelection(selection)
    }
  }

  // Handle messages from extension
  onMount(() => {
    const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
      switch (message.type) {
        case "sessionCreated":
          handleSessionCreated(message.session)
          break

        case "messagesLoaded":
          handleMessagesLoaded(message.sessionID, message.messages)
          break

        case "messageCreated":
          handleMessageCreated(message.message)
          break

        case "partUpdated":
          handlePartUpdated(message.sessionID, message.messageID, message.part, message.delta)
          break

        case "sessionStatus":
          handleSessionStatus(message.sessionID, message.status)
          break

        case "permissionRequest":
          handlePermissionRequest(message.permission)
          break

        case "todoUpdated":
          handleTodoUpdated(message.sessionID, message.items)
          break

        case "sessionsLoaded":
          handleSessionsLoaded(message.sessions)
          break
      }
    })

    onCleanup(unsubscribe)
  })

  // Event handlers
  function handleSessionCreated(session: SessionInfo) {
    console.log("[Kilo New] Session created:", session.id)
    batch(() => {
      setStore("sessions", session.id, session)
      setStore("messages", session.id, [])

      // If there's a pending model selection, assign it to this new session
      const pending = pendingModelSelection()
      if (pending) {
        setStore("modelSelections", session.id, pending)
        setPendingModelSelection(null)
      }

      setCurrentSessionID(session.id)
    })
  }

  function handleMessagesLoaded(sessionID: string, messages: Message[]) {
    console.log("[Kilo New] Messages loaded for session:", sessionID, messages.length)
    setStore("messages", sessionID, messages)

    // Also extract parts from messages
    messages.forEach((msg) => {
      if (msg.parts && msg.parts.length > 0) {
        setStore("parts", msg.id, msg.parts)
      }
    })
  }

  function handleMessageCreated(message: Message) {
    console.log("[Kilo New] Message created/updated:", message.id, message.role)

    setStore("messages", message.sessionID, (msgs = []) => {
      // Check if message already exists (update case)
      const existingIndex = msgs.findIndex((m) => m.id === message.id)
      if (existingIndex >= 0) {
        // Update existing message
        const updated = [...msgs]
        updated[existingIndex] = { ...msgs[existingIndex], ...message }
        return updated
      }
      // Add new message
      return [...msgs, message]
    })

    if (message.parts && message.parts.length > 0) {
      setStore("parts", message.id, message.parts)
    }
  }

  function handlePartUpdated(
    sessionID: string | undefined,
    messageID: string | undefined,
    part: Part,
    delta?: PartDelta,
  ) {
    // Get messageID from the part itself if not provided in the message
    const effectiveMessageID = messageID || part.messageID

    if (!effectiveMessageID) {
      console.warn("[Kilo New] Part updated without messageID:", part.id, part.type)
      return
    }

    console.log("[Kilo New] Part updated:", effectiveMessageID, part.id, part.type)

    setStore(
      "parts",
      produce((parts) => {
        if (!parts[effectiveMessageID]) {
          parts[effectiveMessageID] = []
        }

        const existingIndex = parts[effectiveMessageID].findIndex((p) => p.id === part.id)

        if (existingIndex >= 0) {
          // Update existing part
          if (
            delta?.type === "text-delta" &&
            delta.textDelta &&
            parts[effectiveMessageID][existingIndex].type === "text"
          ) {
            // Append text delta
            ;(parts[effectiveMessageID][existingIndex] as { text: string }).text += delta.textDelta
          } else {
            // Replace entire part
            parts[effectiveMessageID][existingIndex] = part
          }
        } else {
          // Add new part
          parts[effectiveMessageID].push(part)
        }
      }),
    )
  }

  function handleSessionStatus(sessionID: string, newStatus: SessionStatus) {
    console.log("[Kilo New] Session status:", sessionID, newStatus)
    if (sessionID === currentSessionID()) {
      setStatus(newStatus)
    }
  }

  function handlePermissionRequest(permission: PermissionRequest) {
    console.log("[Kilo New] Permission request:", permission.toolName)
    setPermissions((prev) => [...prev, permission])
  }

  function handleTodoUpdated(sessionID: string, items: TodoItem[]) {
    console.log("[Kilo New] Todos updated:", sessionID, items.length)
    setStore("todos", sessionID, items)
  }

  function handleSessionsLoaded(loaded: SessionInfo[]) {
    console.log("[Kilo New] Sessions loaded:", loaded.length)
    batch(() => {
      for (const s of loaded) {
        setStore("sessions", s.id, s)
      }
    })
  }

  // Actions
  function sendMessage(text: string, providerID?: string, modelID?: string) {
    if (!server.isConnected()) {
      console.warn("[Kilo New] Cannot send message: not connected")
      return
    }

    console.log("[Kilo New] Sending message:", text.substring(0, 50))
    vscode.postMessage({
      type: "sendMessage",
      text,
      sessionID: currentSessionID(),
      providerID,
      modelID,
    })
  }

  function abort() {
    const sessionID = currentSessionID()
    if (!sessionID) {
      console.warn("[Kilo New] Cannot abort: no current session")
      return
    }

    console.log("[Kilo New] Aborting session:", sessionID)
    vscode.postMessage({
      type: "abort",
      sessionID,
    })
  }

  function respondToPermission(permissionId: string, response: "once" | "always" | "reject") {
    // Resolve sessionID from the stored permission request
    const permission = permissions().find((p) => p.id === permissionId)
    const sessionID = permission?.sessionID ?? currentSessionID() ?? ""

    console.log("[Kilo New] Permission response:", permissionId, response, "sessionID:", sessionID)
    vscode.postMessage({
      type: "permissionResponse",
      permissionId,
      sessionID,
      response,
    })

    // Remove from pending permissions
    setPermissions((prev) => prev.filter((p) => p.id !== permissionId))
  }

  function createSession() {
    if (!server.isConnected()) {
      console.warn("[Kilo New] Cannot create session: not connected")
      return
    }

    console.log("[Kilo New] Creating new session")
    // Reset pending selection to default for the new session
    setPendingModelSelection(provider.defaultSelection())
    vscode.postMessage({ type: "createSession" })
  }

  function loadSessions() {
    if (!server.isConnected()) {
      console.warn("[Kilo New] Cannot load sessions: not connected")
      return
    }
    console.log("[Kilo New] Loading sessions")
    vscode.postMessage({ type: "loadSessions" })
  }

  function selectSession(id: string) {
    if (!server.isConnected()) {
      console.warn("[Kilo New] Cannot select session: not connected")
      return
    }
    console.log("[Kilo New] Selecting session:", id)
    setCurrentSessionID(id)
    setStatus("idle")
    vscode.postMessage({ type: "loadMessages", sessionID: id })
  }

  // Computed values
  const currentSession = () => {
    const id = currentSessionID()
    return id ? store.sessions[id] : undefined
  }

  const messages = () => {
    const id = currentSessionID()
    return id ? store.messages[id] || [] : []
  }

  const getParts = (messageID: string) => {
    return store.parts[messageID] || []
  }

  const todos = () => {
    const id = currentSessionID()
    return id ? store.todos[id] || [] : []
  }

  const sessions = createMemo(() =>
    Object.values(store.sessions).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  )

  const value: SessionContextValue = {
    currentSessionID,
    currentSession,
    setCurrentSessionID,
    sessions,
    status,
    messages,
    getParts,
    todos,
    permissions,
    selected,
    selectModel,
    sendMessage,
    abort,
    respondToPermission,
    createSession,
    loadSessions,
    selectSession,
  }

  return <SessionContext.Provider value={value}>{props.children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
