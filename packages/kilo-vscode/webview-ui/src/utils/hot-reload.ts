/**
 * Hot reload state management
 * Saves and restores critical UI state across JS reloads
 */

import type { VSCodeAPI } from "../types/messages"

export interface HotReloadState {
  _hotReload?: {
    timestamp: number
    currentView?: string
    currentSessionID?: string
    inputText?: string
    scrollPosition?: number
    selectedProviderID?: string
    selectedModelID?: string
    selectedAgent?: string
  }
}

/**
 * Save current state before a hot reload
 */
export function saveHotReloadState(
  vscodeApi: VSCodeAPI,
  state: {
    currentView?: string
    currentSessionID?: string
    inputText?: string
    scrollPosition?: number
    selectedProviderID?: string
    selectedModelID?: string
    selectedAgent?: string
  },
): void {
  const existing = (vscodeApi.getState() || {}) as HotReloadState
  existing._hotReload = {
    timestamp: Date.now(),
    ...state,
  }
  vscodeApi.setState(existing)
  console.log("[Kilo HMR] 💾 Saved state:", existing._hotReload)
}

/**
 * Restore state after a hot reload
 * Returns the saved state and clears it from storage
 */
export function restoreHotReloadState(vscodeApi: VSCodeAPI): HotReloadState["_hotReload"] | undefined {
  const state = (vscodeApi.getState() || {}) as HotReloadState
  const hotReloadState = state._hotReload

  if (hotReloadState) {
    // Check if the reload happened within the last 5 seconds
    const age = Date.now() - hotReloadState.timestamp
    if (age < 5000) {
      console.log("[Kilo HMR] 📦 Restored state:", hotReloadState)
      // Clear the hot reload state after restoring
      delete state._hotReload
      vscodeApi.setState(state)
      return hotReloadState
    }
    console.log("[Kilo HMR] ⏰ Hot reload state expired (age: ${age}ms)")
  }

  return undefined
}

/**
 * Check if this is a hot reload (vs initial load)
 */
export function isHotReload(vscodeApi: VSCodeAPI): boolean {
  const state = (vscodeApi.getState() || {}) as HotReloadState
  return !!state._hotReload
}
