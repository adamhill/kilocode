# Comprehensive Architecture Diagrams

This document provides visual diagrams of the JetBrains plugin architecture covering all major subsystems.

## Table of Contents

- [High-Level Architecture Overview](#high-level-architecture-overview)
- [Initialization Sequence](#initialization-sequence)
- [IPC Protocol Flow](#ipc-protocol-flow)
- [RPC Proxy Architecture](#rpc-proxy-architecture)
- [WebView Message Flow](#webview-message-flow)
- [Complete System Diagram](#complete-system-diagram)
- [Component Reference](#component-reference)

---

## High-Level Architecture Overview

```mermaid
graph TB
    subgraph IDE["JetBrains IDE"]
        UI["Tool Window UI"]
        WVM["WebViewManager"]
        WVI["WebViewInstance"]
        JCEF["JBCefBrowser"]

        WPS["WecoderPluginService"]
        SOP["SystemObjectProvider"]
        SPR["ServiceProxyRegistry"]

        ESS["ExtensionSocketServer"]
        UDSS["ExtensionUnixDomainSocketServer"]
        EPM["ExtensionProcessManager"]
        EHM["ExtensionHostManager"]

        PP["PersistentProtocol"]
        RPC["RPCManager"]

        subgraph Actors["MainThread Actors"]
            MTC["Commands"]
            MTT["Terminal"]
            MTF["FileSystem"]
            MTW["Webviews"]
            MTO["...others"]
        end
    end

    subgraph ExtHost["Node.js Extension Host"]
        EXT["extension.js"]
        EHPP["PersistentProtocol"]

        subgraph ExtProxies["ExtHost Proxies"]
            EHC["Commands"]
            EHT["Terminal"]
            EHF["FileSystem"]
            EHW["Webviews"]
            EHO["...others"]
        end

        VSAPI["VSCode API Shim"]
        KILO["Kilo Code Extension"]
    end

    UI --> WVM
    WVM --> WVI
    WVI --> JCEF

    WPS --> ESS
    WPS --> UDSS
    WPS --> EPM
    WPS --> SOP
    WPS --> SPR

    ESS --> EHM
    UDSS --> EHM
    EPM --> EXT

    EHM --> PP
    PP --> RPC
    RPC --> Actors

    PP <-->|Socket| EHPP

    EHPP --> ExtProxies
    ExtProxies --> VSAPI
    VSAPI --> KILO

    JCEF <-->|Messages| MTW
    MTW <--> EHW
```

---

## Initialization Sequence

### Complete Startup Flow

```mermaid
sequenceDiagram
    participant IDE as JetBrains IDE
    participant WP as WecoderPlugin
    participant WPS as WecoderPluginService
    participant SOP as SystemObjectProvider
    participant SPR as ServiceProxyRegistry
    participant SS as Socket Server
    participant EPM as ExtensionProcessManager
    participant Node as Node.js Process
    participant EHM as ExtensionHostManager
    participant RPC as RPCManager
    participant WVM as WebViewManager
    participant RTW as RooToolWindowFactory

    Note over IDE: IDE Startup
    IDE->>WP: runActivity project

    rect rgb(240, 248, 255)
        Note over WP,WPS: Plugin Initialization
        WP->>WPS: getInstance project
        WP->>WPS: initialize project
        WPS->>SOP: getService
        WPS->>SOP: initialize project
        WPS->>SOP: register pluginService
        WPS->>SPR: getService
        WPS->>SPR: initialize
    end

    rect rgb(255, 248, 240)
        Note over WPS,EPM: Socket and Process Setup
        alt Windows
            WPS->>SS: ExtensionSocketServer.start
            SS-->>WPS: port number
        else macOS/Linux
            WPS->>SS: ExtensionUnixDomainSocketServer.start
            SS-->>WPS: socket path
        end

        WPS->>EPM: start portOrPath
        EPM->>EPM: findNodeExecutable
        EPM->>EPM: findExtensionEntryFile
        EPM->>Node: spawn with args
    end

    rect rgb(240, 255, 240)
        Note over Node,RPC: Extension Host Handshake
        Node->>SS: connect to socket
        SS->>EHM: create ExtensionHostManager
        EHM->>EHM: create PersistentProtocol

        Node-->>EHM: Ready message byte=0x02
        EHM->>Node: initData JSON
        Node->>Node: parse initData
        Node-->>EHM: Initialized message byte=0x01

        EHM->>RPC: create RPCManager
        EHM->>RPC: startInitialize
        EHM->>EHM: activateExtension
    end

    rect rgb(255, 240, 255)
        Note over RTW,WVM: WebView Initialization
        IDE->>RTW: createToolWindowContent
        RTW->>WPS: initialize project
        RTW->>WVM: getService
        WVM->>WVM: await WebView creation

        Note over EHM: Extension registers provider
        EHM-->>WVM: WebviewViewProviderData
        WVM->>WVM: registerProvider
        WVM->>WVM: createWebViewInstance
        WVM-->>RTW: onWebViewCreated callback
        RTW->>RTW: addWebViewComponent
    end

    Note over IDE: Plugin Ready
```

---

## IPC Protocol Flow

### Binary Message Framing

```mermaid
graph LR
    subgraph Header["Header: 13 bytes"]
        T["Type<br/>1 byte"]
        I["ID<br/>4 bytes"]
        A["ACK<br/>4 bytes"]
        S["Size<br/>4 bytes"]
    end

    subgraph Body["Body: Size bytes"]
        D["Data<br/>Variable"]
    end

    T --> I --> A --> S --> D
```

### Message Exchange

```mermaid
sequenceDiagram
    participant KT as Kotlin Plugin
    participant PW as ProtocolWriter
    participant SK as Socket
    participant PR as ProtocolReader
    participant Node as Extension Host

    rect rgb(240, 248, 255)
        Note over KT,Node: Send Message
        KT->>PW: send data
        PW->>PW: create ProtocolMessage
        Note over PW: type=REGULAR, id++, ack=incomingId
        PW->>PW: write header 13 bytes
        PW->>PW: write body N bytes
        PW->>SK: binary data
        SK->>Node: transmit
    end

    rect rgb(255, 248, 240)
        Note over KT,Node: Receive Message
        Node->>SK: response data
        SK->>PR: binary data
        PR->>PR: read header 13 bytes
        Note over PR: parse type, id, ack, size
        PR->>PR: read body size bytes
        PR->>PR: create ProtocolMessage
        PR->>KT: onMessage callback
    end

    rect rgb(240, 255, 240)
        Note over KT,Node: Acknowledgment Flow
        Note over KT: outgoingAckId = msg.ack
        Note over KT: Remove acked from queue
        Note over KT: If no ack in 2s, send ACK
        alt Timeout: 20s no ack
            KT->>KT: onSocketTimeout
        end
    end
```

### Protocol Message Types

```mermaid
graph TD
    subgraph Transport["Transport Layer Messages"]
        NONE["NONE: 0<br/>Undefined"]
        REGULAR["REGULAR: 1<br/>Data message"]
        CONTROL["CONTROL: 2<br/>Control message"]
        ACK["ACK: 3<br/>Acknowledgment"]
        DISCONNECT["DISCONNECT: 5<br/>Close connection"]
        REPLAY["REPLAY_REQUEST: 6<br/>Resend unacked"]
        PAUSE["PAUSE: 7<br/>Pause writing"]
        RESUME["RESUME: 8<br/>Resume writing"]
        KEEPALIVE["KEEP_ALIVE: 9<br/>Keep alive ping"]
    end

    subgraph App["Application Layer Messages"]
        INIT["Initialized: 0x01<br/>Host initialized"]
        READY["Ready: 0x02<br/>Awaiting initData"]
        TERM["Terminate: 0x03<br/>Shutting down"]
    end
```

---

## RPC Proxy Architecture

### Proxy System Overview

```mermaid
graph TB
    subgraph Registration["ServiceProxyRegistry"]
        MC["MainContext<br/>73 identifiers"]
        EC["ExtHostContext<br/>69 identifiers"]
    end

    subgraph ProxyId["ProxyIdentifier System"]
        PI["ProxyIdentifier<br/>sid: String<br/>nid: Int"]
        CREATE["createProxyIdentifier"]
        LOOKUP["getStringIdentifierForProxy"]
    end

    subgraph MsgTypes["RPC MessageType"]
        REQ1["RequestJSONArgs: 1"]
        REQ2["RequestJSONArgsWithCancellation: 2"]
        REQ3["RequestMixedArgs: 3"]
        REQ4["RequestMixedArgsWithCancellation: 4"]
        ACK["Acknowledged: 5"]
        CANCEL["Cancel: 6"]
        ROK1["ReplyOKEmpty: 7"]
        ROK2["ReplyOKVSBuffer: 8"]
        ROK3["ReplyOKJSON: 9"]
        ROK4["ReplyOKJSONWithBuffers: 10"]
        RERR1["ReplyErrError: 11"]
        RERR2["ReplyErrEmpty: 12"]
    end

    Registration --> ProxyId
    MC --> CREATE
    EC --> CREATE
    CREATE --> PI
    PI --> LOOKUP
```

### RPC Call Flow

```mermaid
sequenceDiagram
    participant Caller as Kotlin Caller
    participant RPCProto as RPCProtocol
    participant PP as PersistentProtocol
    participant Socket as Socket
    participant EHRPC as ExtHost RPC
    participant Target as Target Handler

    rect rgb(240, 248, 255)
        Note over Caller,Target: Outgoing Request
        Caller->>RPCProto: getProxy identifier
        RPCProto-->>Caller: proxy object
        Caller->>RPCProto: proxy.method args
        RPCProto->>RPCProto: serialize args
        RPCProto->>RPCProto: create RequestJSONArgs
        Note over RPCProto: rpcId, method, args
        RPCProto->>PP: send buffer
        PP->>Socket: binary message
        Socket->>EHRPC: receive
    end

    rect rgb(255, 248, 240)
        Note over Caller,Target: Processing
        EHRPC->>EHRPC: deserialize message
        EHRPC->>Target: invoke handler
        Target->>Target: execute logic
        Target-->>EHRPC: result or error
    end

    rect rgb(240, 255, 240)
        Note over Caller,Target: Response
        EHRPC->>EHRPC: serialize response
        alt Success
            EHRPC->>Socket: ReplyOKJSON
        else Error
            EHRPC->>Socket: ReplyErrError
        end
        Socket->>PP: binary response
        PP->>RPCProto: message callback
        RPCProto->>RPCProto: match request id
        RPCProto-->>Caller: CompletableFuture result
    end
```

### MainThread Actors

```mermaid
graph LR
    subgraph MT["MainThread Actors in Kotlin"]
        MTCmd["MainThreadCommands<br/>register/execute commands"]
        MTTerm["MainThreadTerminal<br/>create/manage terminals"]
        MTFS["MainThreadFileSystem<br/>read/write files"]
        MTWin["MainThreadWindow<br/>dialogs, messages"]
        MTWebview["MainThreadWebviews<br/>webview panels"]
        MTDoc["MainThreadDocuments<br/>document operations"]
        MTEdit["MainThreadTextEditors<br/>editor operations"]
        MTCfg["MainThreadConfiguration<br/>settings access"]
        MTStore["MainThreadStorage<br/>state persistence"]
        MTClip["MainThreadClipboard<br/>clipboard ops"]
        MTSecret["MainThreadSecretState<br/>secure storage"]
        MTStatus["MainThreadStatusBar<br/>status items"]
        MTMore["...32 more actors"]
    end

    subgraph JB["JetBrains Platform APIs"]
        AM["ActionManager"]
        TW["TerminalWidget"]
        VFS["VirtualFileSystem"]
        MSG["Messages"]
        JCEF["JBCefBrowser"]
        Doc["Document"]
        Editor["Editor"]
        Props["PropertiesComponent"]
        State["Workspace Storage"]
        CPM["CopyPasteManager"]
        PWS["PasswordSafe"]
        SB["StatusBar"]
    end

    MTCmd --> AM
    MTTerm --> TW
    MTFS --> VFS
    MTWin --> MSG
    MTWebview --> JCEF
    MTDoc --> Doc
    MTEdit --> Editor
    MTCfg --> Props
    MTStore --> State
    MTClip --> CPM
    MTSecret --> PWS
    MTStatus --> SB
```

---

## WebView Message Flow

### Complete WebView Communication

```mermaid
sequenceDiagram
    participant User as User
    participant React as React UI
    participant VSApi as acquireVsCodeApi
    participant JSQ as JBCefJSQuery
    participant WVI as WebViewInstance
    participant JCEF as CefBrowser
    participant RPC as RPCProtocol
    participant EHW as ExtHostWebviews
    participant Ext as Extension Code
    participant MTW as MainThreadWebviews

    rect rgb(240, 248, 255)
        Note over User,Ext: User Action to Extension
        User->>React: interact with UI
        React->>VSApi: vscode.postMessage data
        VSApi->>VSApi: sendMessageToPlugin
        VSApi->>JSQ: inject msgStr
        JSQ->>WVI: handler callback
        WVI->>RPC: getProxy ExtHostWebviews
        WVI->>EHW: onMessage viewId, message, buffers
        EHW->>Ext: webview.onDidReceiveMessage
    end

    rect rgb(255, 248, 240)
        Note over Ext,React: Extension Response to UI
        Ext->>Ext: process message
        Ext->>EHW: webview.postMessage result
        EHW->>RPC: MainThreadWebviews.postMessage
        RPC->>MTW: $postMessage handle, message
        MTW->>WVI: postMessageToWebView
        WVI->>JCEF: executeJavaScript
        Note over JCEF: receiveMessageFromPlugin
        JCEF->>React: MessageEvent dispatched
        React->>React: update UI
        React->>User: visual feedback
    end
```

### WebView Component Hierarchy

```mermaid
graph TB
    subgraph ToolWindow["RooToolWindowFactory"]
        RTW["RooToolWindowContent"]
        Panel["JPanel BorderLayout"]

        subgraph Content["Content Area"]
            Placeholder["System Info Label<br/>shown during init"]
            Browser["JBCefBrowser.component"]
        end
    end

    subgraph WebViewMgr["WebViewManager"]
        WVM["WebViewManager"]
        WVI["WebViewInstance"]

        subgraph JCEF["JCEF Browser"]
            JBB["JBCefBrowser"]
            CEF["CefBrowser"]
            JSQ["JBCefJSQuery"]
        end

        subgraph Handlers["CEF Handlers"]
            Display["CefDisplayHandler<br/>console logging"]
            Load["CefLoadHandler<br/>page lifecycle"]
            Request["CefRequestHandler<br/>resource loading"]
        end
    end

    subgraph Resources["Resource Serving"]
        LRH["LocalResHandler"]
        LCRH["LocalCefResHandle"]
        Files["Local Files<br/>index.html, js, css"]
    end

    RTW --> Panel
    Panel --> Content
    Placeholder -.->|hidden after load| Browser

    WVM --> WVI
    WVI --> JBB
    JBB --> CEF
    JBB --> JSQ
    CEF --> Handlers

    Request --> LRH
    LRH --> LCRH
    LCRH --> Files
```

---

## Complete System Diagram

### Full Architecture

```mermaid
graph TB
    subgraph User["User Interface"]
        UI["React UI in WebView"]
    end

    subgraph JCEF["JCEF Layer"]
        Browser["JBCefBrowser"]
        JSQuery["JBCefJSQuery"]
        ResHandler["LocalResHandler"]
    end

    subgraph Plugin["Kotlin Plugin"]
        subgraph Services["Core Services"]
            WPS["WecoderPluginService"]
            WVM["WebViewManager"]
            WVI["WebViewInstance"]
            SOP["SystemObjectProvider"]
            SPR["ServiceProxyRegistry"]
        end

        subgraph Socket["Socket Layer"]
            ESS["ExtensionSocketServer"]
            UDSS["UnixDomainSocketServer"]
            EPM["ExtensionProcessManager"]
        end

        subgraph Protocol["Protocol Layer"]
            EHM["ExtensionHostManager"]
            PP["PersistentProtocol"]
            RPC["RPCManager"]
        end

        subgraph MainThreadActors["MainThread Actors"]
            MTA["Commands Terminal<br/>FileSystem Webviews<br/>... 40+ actors"]
        end
    end

    subgraph ExtensionHost["Node.js Extension Host"]
        EXT["extension.js entry"]
        EHPP["PersistentProtocol"]

        subgraph ExtHostProxies["ExtHost Proxies"]
            EHP["Commands Workspace<br/>Webviews Terminal<br/>... 60+ proxies"]
        end

        subgraph VSCodeShim["VSCode API Shim"]
            VSCODE["vscode namespace"]
            CMDS["commands"]
            WIN["window"]
            WS["workspace"]
            ENV["env"]
        end

        subgraph Extension["Kilo Code Extension"]
            KILO["Extension Logic"]
        end
    end

    UI <--> Browser
    Browser --> JSQuery
    Browser --> ResHandler
    JSQuery <--> WVI

    WPS --> WVM
    WPS --> Socket
    WVM --> WVI
    WVI --> Browser

    Socket --> Protocol
    ESS --> EHM
    UDSS --> EHM
    EPM -.->|spawns| EXT

    EHM --> PP
    PP --> RPC
    RPC <--> MainThreadActors

    PP <-->|Binary IPC| EHPP

    EHPP --> ExtHostProxies
    ExtHostProxies <--> VSCodeShim
    VSCodeShim --> KILO

    MainThreadActors <--> MTA
```

---

## Component Reference

### File Locations

| Component                                                                                                                                     | File Path                               |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`WecoderPlugin`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/plugin/WecoderPlugin.kt#L47)                                   | plugin/WecoderPlugin.kt                 |
| [`WecoderPluginService`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/plugin/WecoderPlugin.kt#L188)                           | plugin/WecoderPlugin.kt                 |
| [`SystemObjectProvider`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/plugin/SystemObjectProvider.kt#L20)                     | plugin/SystemObjectProvider.kt          |
| [`ExtensionSocketServer`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ExtensionSocketServer.kt#L26)                     | core/ExtensionSocketServer.kt           |
| [`ExtensionUnixDomainSocketServer`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ExtensionUnixDomainSocketServer.kt#L20) | core/ExtensionUnixDomainSocketServer.kt |
| [`ExtensionProcessManager`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ExtensionProcessManager.kt#L28)                 | core/ExtensionProcessManager.kt         |
| [`ExtensionHostManager`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ExtensionHostManager.kt#L35)                       | core/ExtensionHostManager.kt            |
| [`PersistentProtocol`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/PersistentProtocol.kt#L19)                            | ipc/PersistentProtocol.kt               |
| [`ProtocolReader`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/ProtocolReader.kt#L15)                                    | ipc/ProtocolReader.kt                   |
| [`ProtocolMessageType`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/ProtocolMessageType.kt#L11)                          | ipc/ProtocolMessageType.kt              |
| [`ProtocolConstants`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/ProtocolConstants.kt#L11)                              | ipc/ProtocolConstants.kt                |
| [`ServiceProxyRegistry`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ServiceProxyRegistry.kt#L60)                       | core/ServiceProxyRegistry.kt            |
| [`ProxyIdentifier`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/proxy/ProxyIdentifier.kt#L11)                            | ipc/proxy/ProxyIdentifier.kt            |
| [`MessageType`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ipc/proxy/MessageType.kt#L11)                                    | ipc/proxy/MessageType.kt                |
| [`WebViewManager`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/webview/WebViewManager.kt#L68)                                | webview/WebViewManager.kt               |
| [`WebViewInstance`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/webview/WebViewManager.kt#L507)                              | webview/WebViewManager.kt               |
| [`LocalResHandler`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/webview/LocalResHandler.kt#L20)                              | webview/LocalResHandler.kt              |
| [`RooToolWindowFactory`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/ui/RooToolWindowFactory.kt#L37)                         | ui/RooToolWindowFactory.kt              |
| [`ExtensionHostMessageType`](../../jetbrains/plugin/src/main/kotlin/ai/kilocode/jetbrains/core/ExtensionHostMessageType.kt#L11)               | core/ExtensionHostMessageType.kt        |

### Related Documentation

| Document                                               | Description                  |
| ------------------------------------------------------ | ---------------------------- |
| [README](./README.md)                                  | Main overview and index      |
| [Plugin Initialization](./01-plugin-initialization.md) | Startup and service creation |
| [Extension Host IPC](./02-extension-host-ipc.md)       | Binary protocol details      |
| [VSCode API Bridging](./03-vscode-api-bridging.md)     | Proxy system architecture    |
| [WebView Communication](./04-webview-communication.md) | UI messaging flow            |
