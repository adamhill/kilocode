/**
 * Provider/model context
 * Manages available providers, models, and user's model selection
 */

import { createContext, useContext, createSignal, createMemo, onMount, onCleanup, ParentComponent, Accessor } from "solid-js"
import { useVSCode } from "./vscode"
import type { Provider, ProviderModel, ModelSelection, ExtensionMessage } from "../types/messages"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

interface ProviderContextValue {
  providers: Accessor<Record<string, Provider>>
  connected: Accessor<string[]>
  defaults: Accessor<Record<string, string>>
  selected: Accessor<ModelSelection | null>
  models: Accessor<EnrichedModel[]>
  selectedModel: Accessor<EnrichedModel | undefined>
  selectModel: (providerID: string, modelID: string) => void
}

const ProviderContext = createContext<ProviderContextValue>()

export const ProviderProvider: ParentComponent = (props) => {
  const vscode = useVSCode()

  const [providers, setProviders] = createSignal<Record<string, Provider>>({})
  const [connected, setConnected] = createSignal<string[]>([])
  const [defaults, setDefaults] = createSignal<Record<string, string>>({})
  const [selected, setSelected] = createSignal<ModelSelection | null>(null)

  // Flat list of all models enriched with provider info
  const models = createMemo<EnrichedModel[]>(() => {
    const result: EnrichedModel[] = []
    const provs = providers()
    for (const providerID of Object.keys(provs)) {
      const provider = provs[providerID]
      for (const modelID of Object.keys(provider.models)) {
        result.push({
          ...provider.models[modelID],
          providerID,
          providerName: provider.name,
        })
      }
    }
    return result
  })

  // Full model object for the current selection
  const selectedModel = createMemo<EnrichedModel | undefined>(() => {
    const sel = selected()
    if (!sel) {
      return undefined
    }
    return models().find((m) => m.providerID === sel.providerID && m.id === sel.modelID)
  })

  onMount(() => {
    const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
      if (message.type !== "providersLoaded") {
        return
      }

      console.log("[Kilo New] Providers loaded:", Object.keys(message.providers).length, "providers,", message.connected.length, "connected")

      setProviders(message.providers)
      setConnected(message.connected)
      setDefaults(message.defaults)

      // Determine initial selection
      const saved = message.savedSelection
      if (saved?.providerID && saved?.modelID) {
        // Validate saved selection: provider must be connected and model must exist
        const provider = message.providers[saved.providerID]
        const isConnected = message.connected.includes(saved.providerID)
        if (isConnected && provider?.models[saved.modelID]) {
          setSelected({ providerID: saved.providerID, modelID: saved.modelID })
          return
        }
      }

      // Fall back to first connected provider's default model
      const firstConnected = message.connected[0]
      if (!firstConnected) {
        return
      }

      const defaultModel = message.defaults[firstConnected]
      if (defaultModel) {
        setSelected({ providerID: firstConnected, modelID: defaultModel })
      }
    })

    onCleanup(unsubscribe)
  })

  function selectModel(providerID: string, modelID: string) {
    console.log("[Kilo New] Model selected:", providerID, modelID)
    setSelected({ providerID, modelID })
    vscode.postMessage({ type: "saveModel", providerID, modelID })
  }

  const value: ProviderContextValue = {
    providers,
    connected,
    defaults,
    selected,
    models,
    selectedModel,
    selectModel,
  }

  return <ProviderContext.Provider value={value}>{props.children}</ProviderContext.Provider>
}

export function useProvider(): ProviderContextValue {
  const context = useContext(ProviderContext)
  if (!context) {
    throw new Error("useProvider must be used within a ProviderProvider")
  }
  return context
}
