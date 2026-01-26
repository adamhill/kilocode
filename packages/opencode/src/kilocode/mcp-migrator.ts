import * as fs from "fs/promises"
import * as path from "path"
import os from "os"
import { Config } from "../config/config"

export namespace McpMigrator {
  // Kilocode MCP server structure
  export interface KilocodeMcpServer {
    command: string
    args?: string[]
    env?: Record<string, string>
    disabled?: boolean
    alwaysAllow?: string[]
  }

  export interface KilocodeMcpSettings {
    mcpServers: Record<string, KilocodeMcpServer>
  }

  export interface MigrationResult {
    mcp: Record<string, Config.Mcp>
    warnings: string[]
    skipped: Array<{ name: string; reason: string }>
  }

  // Platform-specific VSCode global storage path
  function getVSCodeGlobalStoragePath(): string {
    const home = os.homedir()
    switch (process.platform) {
      case "darwin":
        return path.join(home, "Library", "Application Support", "Code", "User", "globalStorage", "kilocode.kilo-code")
      case "win32":
        return path.join(
          process.env.APPDATA || path.join(home, "AppData", "Roaming"),
          "Code",
          "User",
          "globalStorage",
          "kilocode.kilo-code",
        )
      default:
        return path.join(home, ".config", "Code", "User", "globalStorage", "kilocode.kilo-code")
    }
  }

  async function fileExists(filePath: string): Promise<boolean> {
    return fs
      .access(filePath)
      .then(() => true)
      .catch(() => false)
  }

  export async function readMcpSettings(filepath: string): Promise<KilocodeMcpSettings | null> {
    if (!(await fileExists(filepath))) return null

    const content = await fs.readFile(filepath, "utf-8")
    return JSON.parse(content) as KilocodeMcpSettings
  }

  export function convertServer(name: string, server: KilocodeMcpServer): Config.Mcp | null {
    // Skip disabled servers
    if (server.disabled) return null

    // Build command array: [command, ...args]
    const command = [server.command, ...(server.args ?? [])]

    // Build the MCP config object
    const mcpConfig: Config.Mcp = {
      type: "local",
      command,
      ...(server.env && Object.keys(server.env).length > 0 && { environment: server.env }),
    }

    return mcpConfig
  }

  export async function migrate(options?: {
    projectDir?: string
    skipGlobalPaths?: boolean
  }): Promise<MigrationResult> {
    const warnings: string[] = []
    const skipped: Array<{ name: string; reason: string }> = []
    const mcp: Record<string, Config.Mcp> = {}

    const allServers: Array<{ name: string; server: KilocodeMcpServer }> = []

    if (!options?.skipGlobalPaths) {
      // 1. VSCode extension global storage (primary location for global MCP settings)
      const vscodeSettingsPath = path.join(getVSCodeGlobalStoragePath(), "settings", "mcp_settings.json")
      const vscodeSettings = await readMcpSettings(vscodeSettingsPath)
      if (vscodeSettings?.mcpServers) {
        for (const [name, server] of Object.entries(vscodeSettings.mcpServers)) {
          allServers.push({ name, server })
        }
      }
    }

    // 2. Project-level MCP settings (if projectDir provided)
    if (options?.projectDir) {
      const projectSettingsPath = path.join(options.projectDir, ".kilocode", "mcp_settings.json")
      const projectSettings = await readMcpSettings(projectSettingsPath)
      if (projectSettings?.mcpServers) {
        for (const [name, server] of Object.entries(projectSettings.mcpServers)) {
          allServers.push({ name, server }) // Later entries win in deduplication
        }
      }
    }

    // Deduplicate by name (later entries win - project overrides global)
    const serversByName = new Map<string, KilocodeMcpServer>()
    for (const { name, server } of allServers) {
      serversByName.set(name, server)
    }

    // Convert each server
    for (const [name, server] of serversByName) {
      if (server.disabled) {
        skipped.push({ name, reason: "Server is disabled" })
        continue
      }

      // Warn about alwaysAllow permissions that cannot be migrated
      if (server.alwaysAllow && server.alwaysAllow.length > 0) {
        warnings.push(
          `MCP server '${name}' has alwaysAllow permissions that cannot be migrated: ${server.alwaysAllow.join(", ")}`,
        )
      }

      const converted = convertServer(name, server)
      if (converted) {
        mcp[name] = converted
      }
    }

    return { mcp, warnings, skipped }
  }
}
