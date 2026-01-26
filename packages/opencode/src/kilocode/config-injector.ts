import { Config } from "../config/config"
import { ModesMigrator } from "./modes-migrator"
import { RulesMigrator } from "./rules-migrator" // kilocode_change

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
    /** Include rules migration. Defaults to true. */
    includeRules?: boolean
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

    // kilocode_change start - Rules migration
    if (options.includeRules !== false) {
      const rulesMigration = await RulesMigrator.migrate({
        projectDir: options.projectDir,
        includeGlobal: !options.skipGlobalPaths,
        includeModeSpecific: true,
      })

      warnings.push(...rulesMigration.warnings)

      if (rulesMigration.instructions.length > 0) {
        config.instructions = rulesMigration.instructions
      }
    }
    // kilocode_change end

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
