/**
 * VS Code API context provider
 * Provides access to the VS Code webview API for posting messages
 */

import { createContext, useContext, onCleanup, ParentComponent } from "solid-js"
import type { VSCodeAPI, WebviewMessage, ExtensionMessage } from "../types/messages"

// Get the VS Code API (only available in webview context)
let vscodeApi: VSCodeAPI | undefined

function getVSCodeAPI(): VSCodeAPI {
  if (!vscodeApi) {
    // In VS Code webview, acquireVsCodeApi is available globally
    if (typeof acquireVsCodeApi === "function") {
      vscodeApi = acquireVsCodeApi()
    } else {
      // Mock for development/testing outside VS Code
      console.warn("[Kilo New] Running outside VS Code, using mock API")
      vscodeApi = {
        postMessage: (msg) => console.log("[Kilo New] Mock postMessage:", msg),
        getState: () => undefined,
        setState: () => {},
      }
    }
  }
  return vscodeApi
}

// Context value type
interface VSCodeContextValue {
  postMessage: (message: WebviewMessage) => void
  onMessage: (handler: (message: ExtensionMessage) => void) => () => void
  getState: <T>() => T | undefined
  setState: <T>(state: T) => void
}

const VSCodeContext = createContext<VSCodeContextValue>()

export const VSCodeProvider: ParentComponent = (props) => {
  console.log("[Kilo Debug] VSCodeProvider initializing")
  const api = getVSCodeAPI()
  console.log("[Kilo Debug] VSCodeProvider got API")
  const handlers = new Set<(message: ExtensionMessage) => void>()

  // Listen for messages from the extension
  const messageListener = (event: MessageEvent) => {
    const message = event.data as ExtensionMessage

    // Handle hot reload messages first (dev mode only)
    if (message?.type === "hotReloadCSS") {
      const link = document.getElementById("kilo-stylesheet") as HTMLLinkElement
      if (link) {
        console.log("[Kilo HMR] Swapping CSS")
        link.href = (message as any).href
      }
      return
    }

    if (message?.type === "hotReloadJS") {
      console.log("[Kilo HMR] Reloading with state preservation")

      // Collect state from the app
      const appState = (window as any).__getHotReloadState ? (window as any).__getHotReloadState() : {}
      const inputText = (window as any).__getPromptInputText ? (window as any).__getPromptInputText() : ""

      // Save current state before reload
      const state = (api.getState() || {}) as any
      state._hotReload = {
        timestamp: Date.now(),
        currentView: appState.currentView,
        currentSessionID: appState.currentSessionID,
        selectedAgent: appState.selectedAgent,
        inputText,
      }

      api.setState(state)
      console.log("[Kilo HMR] Saved state:", state._hotReload)

      // Reload the webview
      location.reload()
      return
    }

    // Forward all other messages to handlers
    handlers.forEach((handler) => handler(message))
  }

  window.addEventListener("message", messageListener)

  onCleanup(() => {
    window.removeEventListener("message", messageListener)
    handlers.clear()
  })

  const value: VSCodeContextValue = {
    postMessage: (message: WebviewMessage) => {
      api.postMessage(message)
    },
    onMessage: (handler: (message: ExtensionMessage) => void) => {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    getState: <T,>() => api.getState() as T | undefined,
    setState: <T,>(state: T) => api.setState(state),
  }

  console.log("[Kilo Debug] VSCodeProvider rendering children")
  return <VSCodeContext.Provider value={value}>{props.children}</VSCodeContext.Provider>
}

export function useVSCode(): VSCodeContextValue {
  const context = useContext(VSCodeContext)
  if (!context) {
    throw new Error("useVSCode must be used within a VSCodeProvider")
  }
  return context
}
