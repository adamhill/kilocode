import { Component } from "solid-js"
import type { ConnectionState } from "../../types/messages"

export interface AboutKiloCodeTabProps {
  port: number | null
  connectionState: ConnectionState
}

const AboutKiloCodeTab: Component<AboutKiloCodeTabProps> = (props) => {
  const getStatusColor = () => {
    switch (props.connectionState) {
      case "connected":
        return "var(--vscode-testing-iconPassed, #89d185)"
      case "connecting":
        return "var(--vscode-testing-iconQueued, #cca700)"
      case "disconnected":
        return "var(--vscode-testing-iconFailed, #f14c4c)"
      case "error":
        return "var(--vscode-testing-iconFailed, #f14c4c)"
    }
  }

  const getStatusText = () => {
    switch (props.connectionState) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "disconnected":
        return "Disconnected"
      case "error":
        return "Error"
    }
  }

  return (
    <div>
      <div style={{
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-panel-border)",
        "border-radius": "4px",
        padding: "16px",
        "margin-bottom": "16px",
      }}>
        <h4 style={{
          "font-size": "13px",
          "font-weight": "600",
          "margin-bottom": "12px",
          "margin-top": "0",
          color: "var(--vscode-foreground)",
        }}>
          CLI Server
        </h4>

        {/* Connection Status */}
        <div style={{
          display: "flex",
          "align-items": "center",
          "margin-bottom": "12px",
        }}>
          <span style={{
            "font-size": "12px",
            color: "var(--vscode-descriptionForeground)",
            width: "100px",
          }}>
            Status:
          </span>
          <div style={{
            display: "flex",
            "align-items": "center",
            gap: "8px",
          }}>
            <span style={{
              width: "8px",
              height: "8px",
              "border-radius": "50%",
              background: getStatusColor(),
              display: "inline-block",
            }} />
            <span style={{
              "font-size": "12px",
              color: "var(--vscode-foreground)",
            }}>
              {getStatusText()}
            </span>
          </div>
        </div>

        {/* Port Number */}
        <div style={{
          display: "flex",
          "align-items": "center",
        }}>
          <span style={{
            "font-size": "12px",
            color: "var(--vscode-descriptionForeground)",
            width: "100px",
          }}>
            Port:
          </span>
          <span style={{
            "font-size": "12px",
            color: "var(--vscode-foreground)",
            "font-family": "var(--vscode-editor-font-family, monospace)",
          }}>
            {props.port !== null ? props.port : "—"}
          </span>
        </div>
      </div>

      <div style={{
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-panel-border)",
        "border-radius": "4px",
        padding: "16px",
      }}>
        <h4 style={{
          "font-size": "13px",
          "font-weight": "600",
          "margin-bottom": "12px",
          "margin-top": "0",
          color: "var(--vscode-foreground)",
        }}>
          Version Information
        </h4>
        <p style={{
          "font-size": "12px",
          color: "var(--vscode-descriptionForeground)",
          margin: 0,
        }}>
          Kilo Code Extension
        </p>
      </div>
    </div>
  )
}

export default AboutKiloCodeTab
