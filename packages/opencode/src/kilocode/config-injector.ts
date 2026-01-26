import { Config } from "../config/config"
import { ModesMigrator } from "./modes-migrator"
import { WorkflowsMigrator } from "./workflows-migrator"

export namespace KilocodeConfigInjector {
  export interface InjectionResult {
    configJson: string
    warnings: string[]
  }

  export async function buildConfig(options: {
    projectDir: string
    globalSettingsDir?: string
    /** Skip reading from global paths (VSCode storage, home dir). Used for testing. */
    skipGlobalPaths?: boolean
  }): Promise<InjectionResult> {
    const warnings: string[] = []

    // Build config object
    const config: Partial<Config.Info> = {}

    // Migrate custom modes
    const modesMigration = await ModesMigrator.migrate(options)

    // Log skipped default modes (for debugging)
    for (const skipped of modesMigration.skipped) {
      warnings.push(`Mode '${skipped.slug}' skipped: ${skipped.reason}`)
    }

    if (Object.keys(modesMigration.agents).length > 0) {
      config.agent = modesMigration.agents
    }

    // Migrate workflows to commands
    const workflowsMigration = await WorkflowsMigrator.migrate(options)

    warnings.push(...workflowsMigration.warnings)

    if (Object.keys(workflowsMigration.commands).length > 0) {
      config.command = workflowsMigration.commands
    }

    return {
      configJson: JSON.stringify(config),
      warnings,
    }
  }

  export function getEnvVars(configJson: string): Record<string, string> {
    if (!configJson || configJson === "{}") {
      return {}
    }
    return {
      OPENCODE_CONFIG_CONTENT: configJson,
    }
  }
}
