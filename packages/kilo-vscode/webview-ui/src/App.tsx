import { Component, createSignal, createMemo, Switch, Match, onMount, onCleanup } from "solid-js"
import { ThemeProvider } from "@kilocode/kilo-ui/theme"
import { I18nProvider } from "@kilocode/kilo-ui/context"
import { DialogProvider } from "@kilocode/kilo-ui/context/dialog"
import { MarkedProvider } from "@kilocode/kilo-ui/context/marked"
import { DataProvider } from "@kilocode/kilo-ui/context/data"
import Settings from "./components/Settings"
import ProfileView from "./components/ProfileView"
import { VSCodeProvider } from "./context/vscode"
import { ServerProvider, useServer } from "./context/server"
import { ProviderProvider } from "./context/provider"
import { SessionProvider, useSession } from "./context/session"
import { ChatView } from "./components/chat"
import SessionList from "./components/history/SessionList"
import type { Message as SDKMessage, Part as SDKPart } from "@kilocode/sdk/v2"
import "./styles/chat.css"

type ViewType = "newTask" | "marketplace" | "history" | "profile" | "settings"

const DummyView: Component<{ title: string }> = (props) => {
  return (
    <div
      style={{
        display: "flex",
        "justify-content": "center",
        "align-items": "center",
        height: "100%",
        "min-height": "200px",
        "font-size": "24px",
        color: "var(--vscode-foreground)",
      }}
    >
      <h1>{props.title}</h1>
    </div>
  )
}

/**
 * Bridge our session store to the DataProvider's expected Data shape.
 * Since the runtime data comes from the CLI backend, it's already in SDK format —
 * we just need to restructure it into the Data layout that DataProvider expects.
 *
 * Note: DiffComponentProvider and CodeComponentProvider are NOT included because
 * @pierre/diffs uses Vite's ?worker&url import syntax which is incompatible
 * with esbuild. Tool renderers that need diffs (edit, write, apply_patch)
 * will fall back to GenericTool display. See ui-implementation-plan.md §7.6.
 */
const DataBridge: Component<{ children: any }> = (props) => {
  const session = useSession()

  const data = createMemo(() => ({
    session: session.sessions().map((s) => ({ ...s, id: s.id, role: "user" as const })),
    session_status: {} as Record<string, any>,
    session_diff: {} as Record<string, any[]>,
    message: {
      [session.currentSessionID() ?? ""]: session.messages() as unknown as SDKMessage[],
    },
    part: Object.fromEntries(
      session
        .messages()
        .map((msg) => [msg.id, session.getParts(msg.id) as unknown as SDKPart[]])
        .filter(([, parts]) => (parts as SDKPart[]).length > 0),
    ),
    permission: {
      [session.currentSessionID() ?? ""]: session.permissions() as unknown as any[],
    },
  }))

  const respond = (input: { sessionID: string; permissionID: string; response: "once" | "always" | "reject" }) => {
    session.respondToPermission(input.permissionID, input.response)
  }

  return (
    <DataProvider data={data()} directory="" onPermissionRespond={respond}>
      {props.children}
    </DataProvider>
  )
}

// Inner app component that uses the contexts
const AppContent: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewType>("newTask")
  const session = useSession()
  const server = useServer()

  const handleViewAction = (action: string) => {
    switch (action) {
      case "plusButtonClicked":
        if (session.messages().length > 0 || !session.currentSessionID()) {
          session.createSession()
        }
        setCurrentView("newTask")
        break
      case "marketplaceButtonClicked":
        setCurrentView("marketplace")
        break
      case "historyButtonClicked":
        setCurrentView("history")
        break
      case "profileButtonClicked":
        setCurrentView("profile")
        break
      case "settingsButtonClicked":
        setCurrentView("settings")
        break
    }
  }

  onMount(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data
      if (message?.type === "action" && message.action) {
        console.log("[Kilo New] App: 🎬 action:", message.action)
        handleViewAction(message.action)
      }
    }
    window.addEventListener("message", handler)
    onCleanup(() => window.removeEventListener("message", handler))
  })

  const handleSelectSession = (id: string) => {
    session.selectSession(id)
    setCurrentView("newTask")
  }

  return (
    <div class="container">
      <Switch fallback={<ChatView />}>
        <Match when={currentView() === "newTask"}>
          <ChatView />
        </Match>
        <Match when={currentView() === "marketplace"}>
          <DummyView title="Marketplace" />
        </Match>
        <Match when={currentView() === "history"}>
          <SessionList onSelectSession={handleSelectSession} />
        </Match>
        <Match when={currentView() === "profile"}>
          <ProfileView
            profileData={server.profileData()}
            deviceAuth={server.deviceAuth()}
            onLogin={server.startLogin}
          />
        </Match>
        <Match when={currentView() === "settings"}>
          <Settings onBack={() => setCurrentView("newTask")} />
        </Match>
      </Switch>
    </div>
  )
}

// Main App component with context providers
const App: Component = () => {
  return (
    <ThemeProvider defaultTheme="kilo-vscode">
      <I18nProvider value={{ locale: () => "en", t: (key) => key }}>
        <DialogProvider>
          <MarkedProvider>
            <VSCodeProvider>
              <ServerProvider>
                <ProviderProvider>
                  <SessionProvider>
                    <DataBridge>
                      <AppContent />
                    </DataBridge>
                  </SessionProvider>
                </ProviderProvider>
              </ServerProvider>
            </VSCodeProvider>
          </MarkedProvider>
        </DialogProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
