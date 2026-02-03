#!/usr/bin/env bun
/**
 * Enhanced package.json transform with Kilo dependency injection
 *
 * This script handles package.json conflicts by:
 * 1. Taking upstream's version (to get new dependencies)
 * 2. Transforming package names (opencode -> kilo)
 * 3. Injecting Kilo-specific dependencies
 * 4. Preserving Kilo's version number
 */

import { $ } from "bun"
import { info, success, warn, debug } from "../utils/logger"
import { getCurrentVersion } from "./preserve-versions"

export interface PackageJsonResult {
  file: string
  action: "transformed" | "skipped" | "failed"
  changes: string[]
  dryRun: boolean
}

export interface PackageJsonOptions {
  dryRun?: boolean
  verbose?: boolean
  preserveVersion?: boolean
}

// Package name mappings
const PACKAGE_NAME_MAP: Record<string, string> = {
  "opencode-ai": "@kilocode/cli",
  "@opencode-ai/cli": "@kilocode/cli",
  "@opencode-ai/sdk": "@kilocode/sdk",
  "@opencode-ai/plugin": "@kilocode/plugin",
}

// Kilo-specific dependencies to inject into specific packages
const KILO_DEPENDENCIES: Record<string, Record<string, string>> = {
  // packages/opencode/package.json needs these
  "packages/opencode/package.json": {
    "@kilocode/kilo-gateway": "workspace:*",
    "@kilocode/kilo-telemetry": "workspace:*",
  },
}

// Packages that should have their name transformed
const TRANSFORM_PACKAGE_NAMES: Record<string, string> = {
  "packages/opencode/package.json": "@kilocode/cli",
  "packages/plugin/package.json": "@kilocode/plugin",
  "packages/sdk/js/package.json": "@kilocode/sdk",
}

/**
 * Check if file is a package.json
 */
export function isPackageJson(file: string): boolean {
  return file.endsWith("package.json")
}

/**
 * Transform dependencies in package.json
 */
function transformDependencies(deps: Record<string, string> | undefined): {
  result: Record<string, string>
  changes: string[]
} {
  if (!deps) return { result: {}, changes: [] }

  const result: Record<string, string> = {}
  const changes: string[] = []

  for (const [name, version] of Object.entries(deps)) {
    const newName = PACKAGE_NAME_MAP[name]
    if (newName) {
      result[newName] = version
      changes.push(`${name} -> ${newName}`)
    } else {
      result[name] = version
    }
  }

  return { result, changes }
}

/**
 * Transform a package.json file
 */
export async function transformPackageJson(file: string, options: PackageJsonOptions = {}): Promise<PackageJsonResult> {
  const changes: string[] = []

  if (options.dryRun) {
    info(`[DRY-RUN] Would transform package.json: ${file}`)
    return { file, action: "transformed", changes: [], dryRun: true }
  }

  try {
    // Take upstream's version first
    await $`git checkout --theirs ${file}`.quiet().nothrow()
    await $`git add ${file}`.quiet().nothrow()

    // Read and parse
    const content = await Bun.file(file).text()
    const pkg = JSON.parse(content)

    // 1. Transform package name if needed
    const relativePath = file.replace(process.cwd() + "/", "")
    const newName = TRANSFORM_PACKAGE_NAMES[relativePath]
    if (newName && pkg.name !== newName) {
      changes.push(`name: ${pkg.name} -> ${newName}`)
      pkg.name = newName
    }

    // 2. Preserve Kilo version if requested
    if (options.preserveVersion !== false) {
      const kiloVersion = await getCurrentVersion()
      if (pkg.version !== kiloVersion) {
        changes.push(`version: ${pkg.version} -> ${kiloVersion}`)
        pkg.version = kiloVersion
      }
    }

    // 3. Transform dependencies
    if (pkg.dependencies) {
      const { result, changes: depChanges } = transformDependencies(pkg.dependencies)
      pkg.dependencies = result
      changes.push(...depChanges.map((c) => `dependencies: ${c}`))
    }

    // 4. Transform devDependencies
    if (pkg.devDependencies) {
      const { result, changes: devChanges } = transformDependencies(pkg.devDependencies)
      pkg.devDependencies = devChanges.length > 0 ? result : pkg.devDependencies
      changes.push(...devChanges.map((c) => `devDependencies: ${c}`))
    }

    // 5. Transform peerDependencies
    if (pkg.peerDependencies) {
      const { result, changes: peerChanges } = transformDependencies(pkg.peerDependencies)
      pkg.peerDependencies = peerChanges.length > 0 ? result : pkg.peerDependencies
      changes.push(...peerChanges.map((c) => `peerDependencies: ${c}`))
    }

    // 6. Inject Kilo-specific dependencies
    const kiloDeps = KILO_DEPENDENCIES[relativePath]
    if (kiloDeps) {
      pkg.dependencies = pkg.dependencies || {}
      for (const [name, version] of Object.entries(kiloDeps)) {
        if (!pkg.dependencies[name]) {
          pkg.dependencies[name] = version
          changes.push(`injected: ${name}`)
        }
      }
    }

    // Write back with proper formatting
    const newContent = JSON.stringify(pkg, null, 2) + "\n"
    await Bun.write(file, newContent)
    await $`git add ${file}`.quiet().nothrow()

    if (changes.length > 0) {
      success(`Transformed ${file}: ${changes.length} changes`)
      if (options.verbose) {
        for (const change of changes) {
          debug(`  - ${change}`)
        }
      }
    }

    return { file, action: "transformed", changes, dryRun: false }
  } catch (err) {
    warn(`Failed to transform ${file}: ${err}`)
    return { file, action: "failed", changes: [], dryRun: false }
  }
}

/**
 * Transform conflicted package.json files
 */
export async function transformConflictedPackageJson(
  files: string[],
  options: PackageJsonOptions = {},
): Promise<PackageJsonResult[]> {
  const results: PackageJsonResult[] = []

  for (const file of files) {
    if (!isPackageJson(file)) {
      results.push({ file, action: "skipped", changes: [], dryRun: options.dryRun ?? false })
      continue
    }

    const result = await transformPackageJson(file, options)
    results.push(result)
  }

  return results
}

/**
 * Transform all package.json files (pre-merge, on opencode branch)
 */
export async function transformAllPackageJson(options: PackageJsonOptions = {}): Promise<PackageJsonResult[]> {
  const { Glob } = await import("bun")
  const results: PackageJsonResult[] = []

  // Find all package.json files
  const glob = new Glob("**/package.json")

  for await (const path of glob.scan({ absolute: false })) {
    // Skip node_modules
    if (path.includes("node_modules")) continue

    const file = Bun.file(path)
    if (!(await file.exists())) continue

    try {
      const content = await file.text()
      const pkg = JSON.parse(content)
      const changes: string[] = []

      // 1. Transform package name if needed
      const newName = TRANSFORM_PACKAGE_NAMES[path]
      if (newName && pkg.name !== newName) {
        changes.push(`name: ${pkg.name} -> ${newName}`)
        pkg.name = newName
      }

      // 2. Preserve Kilo version if requested
      if (options.preserveVersion !== false) {
        const kiloVersion = await getCurrentVersion()
        if (pkg.version !== kiloVersion) {
          changes.push(`version: ${pkg.version} -> ${kiloVersion}`)
          pkg.version = kiloVersion
        }
      }

      // 3. Transform dependencies
      if (pkg.dependencies) {
        const { result, changes: depChanges } = transformDependencies(pkg.dependencies)
        if (depChanges.length > 0) {
          pkg.dependencies = result
          changes.push(...depChanges.map((c) => `dependencies: ${c}`))
        }
      }

      // 4. Transform devDependencies
      if (pkg.devDependencies) {
        const { result, changes: devChanges } = transformDependencies(pkg.devDependencies)
        if (devChanges.length > 0) {
          pkg.devDependencies = result
          changes.push(...devChanges.map((c) => `devDependencies: ${c}`))
        }
      }

      // 5. Transform peerDependencies
      if (pkg.peerDependencies) {
        const { result, changes: peerChanges } = transformDependencies(pkg.peerDependencies)
        if (peerChanges.length > 0) {
          pkg.peerDependencies = result
          changes.push(...peerChanges.map((c) => `peerDependencies: ${c}`))
        }
      }

      // 6. Inject Kilo-specific dependencies
      const kiloDeps = KILO_DEPENDENCIES[path]
      if (kiloDeps) {
        pkg.dependencies = pkg.dependencies || {}
        for (const [name, version] of Object.entries(kiloDeps)) {
          if (!pkg.dependencies[name]) {
            pkg.dependencies[name] = version
            changes.push(`injected: ${name}`)
          }
        }
      }

      if (changes.length > 0) {
        if (!options.dryRun) {
          const newContent = JSON.stringify(pkg, null, 2) + "\n"
          await Bun.write(path, newContent)
          success(`Transformed ${path}: ${changes.length} changes`)
        } else {
          info(`[DRY-RUN] Would transform ${path}: ${changes.length} changes`)
        }
      }

      results.push({ file: path, action: "transformed", changes, dryRun: options.dryRun ?? false })
    } catch (err) {
      warn(`Failed to transform ${path}: ${err}`)
      results.push({ file: path, action: "failed", changes: [], dryRun: options.dryRun ?? false })
    }
  }

  return results
}

// CLI entry point
if (import.meta.main) {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const verbose = args.includes("--verbose")

  const files = args.filter((a) => !a.startsWith("--"))

  if (files.length === 0) {
    info("Usage: transform-package-json.ts [--dry-run] [--verbose] <file1> <file2> ...")
    process.exit(1)
  }

  if (dryRun) {
    info("Running in dry-run mode")
  }

  const results = await transformConflictedPackageJson(files, { dryRun, verbose })

  const transformed = results.filter((r) => r.action === "transformed")
  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0)

  console.log()
  success(`Transformed ${transformed.length} package.json files with ${totalChanges} changes`)

  if (dryRun) {
    info("Run without --dry-run to apply changes")
  }
}
