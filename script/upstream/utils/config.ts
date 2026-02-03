#!/usr/bin/env bun
/**
 * Configuration for upstream merge automation
 */

export interface PackageMapping {
  from: string
  to: string
}

export interface MergeConfig {
  /** Package name mappings from opencode to kilo */
  packageMappings: PackageMapping[]

  /** Files to always keep Kilo's version (never take upstream changes) */
  keepOurs: string[]

  /** Files to skip entirely (don't add from upstream, remove if added) */
  skipFiles: string[]

  /** Directories that are Kilo-specific and should be preserved */
  kiloDirectories: string[]

  /** File patterns to exclude from codemods */
  excludePatterns: string[]

  /** Default branch to merge into */
  baseBranch: string

  /** Branch prefix for merge branches */
  branchPrefix: string

  /** Remote name for upstream */
  upstreamRemote: string

  /** Remote name for origin */
  originRemote: string

  /** i18n file patterns that need string transformation */
  i18nPatterns: string[]
}

export const defaultConfig: MergeConfig = {
  packageMappings: [
    { from: "opencode-ai", to: "@kilocode/cli" },
    { from: "@opencode-ai/cli", to: "@kilocode/cli" },
    { from: "@opencode-ai/sdk", to: "@kilocode/sdk" },
    { from: "@opencode-ai/plugin", to: "@kilocode/plugin" },
  ],

  keepOurs: [
    "README.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "PRIVACY.md",
    "SECURITY.md",
    "AGENTS.md",
    ".github/workflows/publish-stable.yml",
  ],

  // Files that only exist in upstream and should NOT be added to Kilo
  // These are removed during merge if they appear
  skipFiles: [
    // Translated README files (Kilo doesn't have these)
    "README.ar.md",
    "README.br.md",
    "README.da.md",
    "README.de.md",
    "README.es.md",
    "README.fr.md",
    "README.it.md",
    "README.ja.md",
    "README.ko.md",
    "README.no.md",
    "README.pl.md",
    "README.ru.md",
    "README.th.md",
    "README.tr.md",
    "README.zh.md",
    "README.zht.md",
    // Stats file
    "STATS.md",
  ],

  kiloDirectories: [
    "packages/opencode/src/kilocode",
    "packages/opencode/test/kilocode",
    "packages/kilo-gateway",
    "packages/kilo-telemetry",
    "script/upstream",
  ],

  excludePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.git/**",
    "**/bun.lock",
    "**/package-lock.json",
    "**/yarn.lock",
  ],

  baseBranch: "dev",
  branchPrefix: "upstream-merge",
  upstreamRemote: "upstream",
  originRemote: "origin",

  // i18n translation files that need Kilo branding transforms
  i18nPatterns: ["packages/*/src/i18n/*.ts", "packages/desktop/src/i18n/*.ts"],
}

export function loadConfig(overrides?: Partial<MergeConfig>): MergeConfig {
  return { ...defaultConfig, ...overrides }
}
