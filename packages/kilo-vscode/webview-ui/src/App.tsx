import { Component, createSignal, onMount, onCleanup, Switch, Match } from "solid-js";
import Settings, { type ConnectionState } from "./components/Settings";

type ViewType = 
  | "newTask"
  | "marketplace"
  | "history"
  | "profile"
  | "settings";

interface ActionMessage {
  type: "action";
  action: string;
}

interface ReadyMessage {
  type: "ready";
  serverInfo?: {
    port: number;
  };
}

interface ConnectionStateMessage {
  type: "connectionState";
  state: ConnectionState;
}

type WebviewMessage = ActionMessage | ReadyMessage | ConnectionStateMessage;

const DummyView: Component<{ title: string }> = (props) => {
  return (
    <div style={{
      display: "flex",
      "justify-content": "center",
      "align-items": "center",
      height: "100%",
      "min-height": "200px",
      "font-size": "24px",
      color: "var(--vscode-foreground)"
    }}>
      <h1>{props.title}</h1>
    </div>
  );
};

const App: Component = () => {
  const [currentView, setCurrentView] = createSignal<ViewType>("newTask");
  const [serverPort, setServerPort] = createSignal<number | null>(null);
  const [connectionState, setConnectionState] = createSignal<ConnectionState>("disconnected");

  const handleMessage = (event: MessageEvent) => {
    const message = event.data as WebviewMessage;
    
    switch (message.type) {
      case "action":
        switch (message.action) {
          case "plusButtonClicked":
            setCurrentView("newTask");
            break;
          case "marketplaceButtonClicked":
            setCurrentView("marketplace");
            break;
          case "historyButtonClicked":
            setCurrentView("history");
            break;
          case "profileButtonClicked":
            setCurrentView("profile");
            break;
          case "settingsButtonClicked":
            setCurrentView("settings");
            break;
        }
        break;
      case "ready":
        if (message.serverInfo?.port) {
          setServerPort(message.serverInfo.port);
        }
        break;
      case "connectionState":
        setConnectionState(message.state);
        break;
    }
  };

  onMount(() => {
    window.addEventListener("message", handleMessage);
  });

  onCleanup(() => {
    window.removeEventListener("message", handleMessage);
  });

  return (
    <div class="container">
      <Switch fallback={<DummyView title="New Task" />}>
        <Match when={currentView() === "newTask"}>
          <DummyView title="New Task" />
        </Match>
        <Match when={currentView() === "marketplace"}>
          <DummyView title="Marketplace" />
        </Match>
        <Match when={currentView() === "history"}>
          <DummyView title="History" />
        </Match>
        <Match when={currentView() === "profile"}>
          <DummyView title="Profile" />
        </Match>
        <Match when={currentView() === "settings"}>
          <Settings port={serverPort()} connectionState={connectionState()} />
        </Match>
      </Switch>
    </div>
  );
};

export default App;
