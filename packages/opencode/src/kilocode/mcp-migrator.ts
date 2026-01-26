import * as fs from "fs/promises"
import * as path from "path"
import os from "os"
import { Config } from "../config/config"
import { Log } from "../util/log"

export namespace McpMigrator {
  const log = Log.create({ service: "kilocode.mcp-migrator" })

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

  /**
   * Load Kilocode MCP servers and return them as an opencode config partial.
   * This function handles all logging internally, so callers just need to merge the result.
   */
  export async function loadMcpConfig(projectDir: string): Promise<Record<string, Config.Mcp>> {
    try {
      const result = await migrate({ projectDir })

      if (Object.keys(result.mcp).length > 0) {
        log.debug("loaded kilocode MCP servers", {
          count: Object.keys(result.mcp).length,
          servers: Object.keys(result.mcp),
        })
      }

      for (const skipped of result.skipped) {
        log.debug("skipped kilocode MCP server", { name: skipped.name, reason: skipped.reason })
      }

      for (const warning of result.warnings) {
        log.warn("kilocode MCP migration warning", { warning })
      }

      return result.mcp
    } catch (err) {
      log.warn("failed to load kilocode MCP servers", { error: err })
      return {}
    }
  }
}
