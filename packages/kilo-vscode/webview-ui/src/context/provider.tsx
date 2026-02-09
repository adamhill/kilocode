/**
 * Provider/model context
 * Manages available providers, models, and the global default selection.
 * Selection is now per-session — see session.tsx.
 */

import { createContext, useContext, createSignal, createMemo, onMount, onCleanup, ParentComponent, Accessor } from "solid-js"
import { useVSCode } from "./vscode"
import type { Provider, ProviderModel, ModelSelection, ExtensionMessage } from "../types/messages"

export type EnrichedModel = ProviderModel & { providerID: string; providerName: string }

interface ProviderContextValue {
  providers: Accessor<Record<string, Provider>>
  connected: Accessor<string[]>
  defaults: Accessor<Record<string, string>>
  defaultSelection: Accessor<ModelSelection>
  models: Accessor<EnrichedModel[]>
  findModel: (selection: ModelSelection | null) => EnrichedModel | undefined
}

const KILO_AUTO: ModelSelection = { providerID: "kilo", modelID: "auto" }

const ProviderContext = createContext<ProviderContextValue>()

export const ProviderProvider: ParentComponent = (props) => {
  const vscode = useVSCode()

  const [providers, setProviders] = createSignal<Record<string, Provider>>({})
  const [connected, setConnected] = createSignal<string[]>([])
  const [defaults, setDefaults] = createSignal<Record<string, string>>({})
  const [defaultSelection, setDefaultSelection] = createSignal<ModelSelection>(KILO_AUTO)

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

  // Look up an enriched model by selection
  function findModel(selection: ModelSelection | null): EnrichedModel | undefined {
    if (!selection) {
      return undefined
    }
    return models().find((m) => m.providerID === selection.providerID && m.id === selection.modelID)
  }

  onMount(() => {
    const unsubscribe = vscode.onMessage((message: ExtensionMessage) => {
      if (message.type !== "providersLoaded") {
        return
      }

      console.log("[Kilo New] Providers loaded:", Object.keys(message.providers).length, "providers,", message.connected.length, "connected")

      setProviders(message.providers)
      setConnected(message.connected)
      setDefaults(message.defaults)
      setDefaultSelection(message.defaultSelection)
    })

    onCleanup(unsubscribe)
  })

  const value: ProviderContextValue = {
    providers,
    connected,
    defaults,
    defaultSelection,
    models,
    findModel,
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
