import { Component } from "solid-js";

const AdvancedTab: Component = () => {
  return (
    <div>
      <h3 style={{
        "font-size": "14px",
        "font-weight": "600",
        "margin-bottom": "16px",
        color: "var(--vscode-foreground)",
      }}>
        Advanced
      </h3>

      <div style={{
        background: "var(--vscode-editor-background)",
        border: "1px solid var(--vscode-panel-border)",
        "border-radius": "4px",
        padding: "16px",
      }}>
        <p style={{
          "font-size": "12px",
          color: "var(--vscode-descriptionForeground)",
          margin: 0,
          "line-height": "1.5",
        }}>
          <strong style={{ color: "var(--vscode-foreground)" }}>This section is not implemented yet.</strong>
          {" "}It will contain advanced configuration options including experimental features, 
          debug settings, performance tuning, and other power-user options.
        </p>
      </div>
    </div>
  );
};

export default AdvancedTab;
