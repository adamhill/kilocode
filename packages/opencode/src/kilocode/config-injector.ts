import { Config } from "../config/config"
import { ModesMigrator } from "./modes-migrator"

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

    // Migrate custom modes only
    const modesMigration = await ModesMigrator.migrate(options)

    // Log skipped default modes (for debugging)
    for (const skipped of modesMigration.skipped) {
      warnings.push(`Mode '${skipped.slug}' skipped: ${skipped.reason}`)
    }

    // Build config object
    const config: Partial<Config.Info> = {}

    if (Object.keys(modesMigration.agents).length > 0) {
      config.agent = modesMigration.agents
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
