#!/usr/bin/env bun
/**
 * Conflict report generation utilities
 */

import { $ } from "bun"

export interface ConflictReport {
  timestamp: string
  upstreamVersion: string
  upstreamCommit: string
  baseBranch: string
  mergeBranch: string
  totalConflicts: number
  conflicts: ConflictFile[]
  recommendations: string[]
}

export interface ConflictFile {
  path: string
  type: "markdown" | "package" | "code" | "config" | "i18n" | "other"
  recommendation: "keep-ours" | "keep-theirs" | "manual" | "codemod" | "skip" | "i18n-transform"
  reason: string
}

/**
 * Check if a file is an i18n translation file
 */
function isI18nFile(path: string): boolean {
  // Match patterns like packages/*/src/i18n/*.ts
  return /packages\/[^/]+\/src\/i18n\/[^/]+\.ts$/.test(path) && !path.endsWith("/index.ts")
}

/**
 * Classify a file based on its path
 */
export function classifyFile(path: string): ConflictFile["type"] {
  if (isI18nFile(path)) return "i18n"
  if (path.endsWith(".md")) return "markdown"
  if (path.includes("package.json")) return "package"
  if (path.endsWith(".ts") || path.endsWith(".tsx") || path.endsWith(".js") || path.endsWith(".jsx")) return "code"
  if (
    path.endsWith(".json") ||
    path.endsWith(".yaml") ||
    path.endsWith(".yml") ||
    path.endsWith(".toml") ||
    path.endsWith(".config.ts")
  )
    return "config"
  return "other"
}

/**
 * Check if a file should be skipped (not added from upstream)
 */
function shouldSkipFile(path: string, skipPatterns: string[]): boolean {
  return skipPatterns.some((pattern) => path === pattern || path.includes(pattern))
}

/**
 * Get recommendation for a conflicted file
 */
export function getRecommendation(
  path: string,
  keepOurs: string[],
  skipFiles: string[] = [],
): { recommendation: ConflictFile["recommendation"]; reason: string } {
  // Check if file should be skipped entirely (doesn't exist in Kilo, shouldn't be added)
  if (shouldSkipFile(path, skipFiles)) {
    return {
      recommendation: "skip",
      reason: "File should be skipped (does not exist in Kilo fork)",
    }
  }

  // Check if file should always keep ours
  if (keepOurs.some((pattern) => path.includes(pattern) || path === pattern)) {
    return {
      recommendation: "keep-ours",
      reason: "File is Kilo-specific and should not be overwritten",
    }
  }

  // Kilo directories should always keep ours
  if (path.includes("kilocode") || path.includes("kilo-gateway") || path.includes("kilo-telemetry")) {
    return {
      recommendation: "keep-ours",
      reason: "File is in a Kilo-specific directory",
    }
  }

  const type = classifyFile(path)

  switch (type) {
    case "i18n":
      return {
        recommendation: "i18n-transform",
        reason: "i18n file: take upstream translations and apply Kilo branding",
      }
    case "markdown":
      return {
        recommendation: "keep-ours",
        reason: "Markdown files are typically Kilo-specific documentation",
      }
    case "package":
      return {
        recommendation: "codemod",
        reason: "Package.json needs codemod to transform names and preserve version",
      }
    case "code":
      return {
        recommendation: "manual",
        reason: "Code files need manual review for kilocode_change markers",
      }
    case "config":
      return {
        recommendation: "manual",
        reason: "Config files may have Kilo-specific settings",
      }
    default:
      return {
        recommendation: "manual",
        reason: "File needs manual review",
      }
  }
}

/**
 * Analyze potential conflicts before merge
 */
export async function analyzeConflicts(
  upstreamRef: string,
  baseBranch: string,
  keepOurs: string[],
  skipFiles: string[] = [],
): Promise<ConflictFile[]> {
  // Get list of files that differ between branches
  // Use quiet to suppress output and nothrow to handle errors
  const result = await $`git diff --name-only ${baseBranch}...${upstreamRef}`.quiet().nothrow()

  if (result.exitCode !== 0) {
    throw new Error(`Failed to analyze conflicts: ${result.stderr.toString()}`)
  }

  const files = result.stdout
    .toString()
    .trim()
    .split("\n")
    .filter((f) => f.length > 0)

  const conflicts: ConflictFile[] = []

  for (const path of files) {
    const type = classifyFile(path)
    const { recommendation, reason } = getRecommendation(path, keepOurs, skipFiles)

    conflicts.push({
      path,
      type,
      recommendation,
      reason,
    })
  }

  return conflicts
}

/**
 * Generate a markdown report
 */
export function generateMarkdownReport(report: ConflictReport): string {
  const lines: string[] = [
    "# Upstream Merge Conflict Report",
    "",
    `Generated: ${report.timestamp}`,
    "",
    "## Summary",
    "",
    `- **Upstream Version**: ${report.upstreamVersion}`,
    `- **Upstream Commit**: \`${report.upstreamCommit.slice(0, 8)}\``,
    `- **Base Branch**: ${report.baseBranch}`,
    `- **Merge Branch**: ${report.mergeBranch}`,
    `- **Total Files Changed**: ${report.totalConflicts}`,
    "",
    "## Files by Recommendation",
    "",
  ]

  const byRecommendation = new Map<string, ConflictFile[]>()
  for (const conflict of report.conflicts) {
    const list = byRecommendation.get(conflict.recommendation) || []
    list.push(conflict)
    byRecommendation.set(conflict.recommendation, list)
  }

  const order: ConflictFile["recommendation"][] = [
    "skip",
    "i18n-transform",
    "keep-ours",
    "codemod",
    "keep-theirs",
    "manual",
  ]

  for (const rec of order) {
    const files = byRecommendation.get(rec)
    if (!files || files.length === 0) continue

    const titleMap: Record<ConflictFile["recommendation"], string> = {
      skip: "Skip (Auto-Remove)",
      "i18n-transform": "i18n Transform (Auto-Apply Kilo Branding)",
      "keep-ours": "Keep Kilo Version (Ours)",
      "keep-theirs": "Take Upstream Version (Theirs)",
      codemod: "Apply Codemod",
      manual: "Manual Review Required",
    }

    const title = titleMap[rec]

    lines.push(`### ${title}`)
    lines.push("")

    for (const file of files) {
      lines.push(`- \`${file.path}\` (${file.type})`)
      lines.push(`  - ${file.reason}`)
    }

    lines.push("")
  }

  if (report.recommendations.length > 0) {
    lines.push("## Recommendations")
    lines.push("")
    for (const rec of report.recommendations) {
      lines.push(`- ${rec}`)
    }
    lines.push("")
  }

  return lines.join("\n")
}

/**
 * Save report to file
 */
export async function saveReport(report: ConflictReport, path: string): Promise<void> {
  const markdown = generateMarkdownReport(report)
  await Bun.write(path, markdown)
}
