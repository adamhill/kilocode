import { test, expect, describe } from "bun:test"
import { KilocodeConfigInjector } from "../../src/kilocode/config-injector"
import { tmpdir } from "../fixture/fixture"
import path from "path"

describe("KilocodeConfigInjector", () => {
  describe("buildConfig", () => {
    test("returns empty config when no modes exist", async () => {
      await using tmp = await tmpdir()

      const result = await KilocodeConfigInjector.buildConfig({ projectDir: tmp.path, skipGlobalPaths: true })

      expect(result.configJson).toBe("{}")
      expect(result.warnings).toHaveLength(0)
    })

    test("includes custom modes in config", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(
            path.join(dir, ".kilocodemodes"),
            `customModes:
  - slug: translate
    name: Translate
    roleDefinition: You are a translator
    groups:
      - read
      - edit`,
          )
        },
      })

      const result = await KilocodeConfigInjector.buildConfig({ projectDir: tmp.path, skipGlobalPaths: true })
      const config = JSON.parse(result.configJson)

      expect(config.agent).toBeDefined()
      expect(config.agent.translate).toBeDefined()
      expect(config.agent.translate.mode).toBe("primary")
    })

    test("adds warnings for skipped default modes", async () => {
      await using tmp = await tmpdir({
        init: async (dir) => {
          await Bun.write(
            path.join(dir, ".kilocodemodes"),
            `customModes:
  - slug: code
    name: Code
    roleDefinition: Default code
    groups:
      - read`,
          )
        },
      })

      const result = await KilocodeConfigInjector.buildConfig({ projectDir: tmp.path, skipGlobalPaths: true })

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toContain("code")
      expect(result.warnings[0]).toContain("skipped")
    })
  })

  describe("getEnvVars", () => {
    test("returns empty object for empty config", () => {
      const envVars = KilocodeConfigInjector.getEnvVars("{}")
      expect(envVars).toEqual({})
    })

    test("returns empty object for empty string", () => {
      const envVars = KilocodeConfigInjector.getEnvVars("")
      expect(envVars).toEqual({})
    })

    test("returns OPENCODE_CONFIG_CONTENT for non-empty config", () => {
      const config = JSON.stringify({ agent: { test: {} } })
      const envVars = KilocodeConfigInjector.getEnvVars(config)

      expect(envVars).toEqual({
        OPENCODE_CONFIG_CONTENT: config,
      })
    })
  })
})
