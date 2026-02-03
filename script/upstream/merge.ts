#!/usr/bin/env bun
/**
 * Upstream Merge Orchestration Script
 *
 * Automates the process of merging upstream opencode changes into Kilo.
 *
 * Usage:
 *   bun run script/upstream/merge.ts [options]
 *
 * Options:
 *   --version <version>  Target upstream version (e.g., v1.1.49)
 *   --commit <hash>      Target upstream commit hash
 *   --dry-run            Preview changes without applying them
 *   --no-push            Don't push branches to remote
 *   --report-only        Only generate conflict report, don't merge
 *   --verbose            Enable verbose logging
 *   --author <name>      Author name for branch prefix (default: from git config)
 */

import { $ } from "bun"
import * as git from "./utils/git"
import * as logger from "./utils/logger"
import * as version from "./utils/version"
import * as report from "./utils/report"
import { defaultConfig, loadConfig, type MergeConfig } from "./utils/config"
import { transformAll as transformPackageNames } from "./transforms/package-names"
import { preserveAllVersions } from "./transforms/preserve-versions"
import { keepOursFiles, resetToOurs } from "./transforms/keep-ours"

interface MergeOptions {
  version?: string
  commit?: string
  dryRun: boolean
  push: boolean
  reportOnly: boolean
  verbose: boolean
  author?: string
}

function parseArgs(): MergeOptions {
  const args = process.argv.slice(2)

  const options: MergeOptions = {
    dryRun: args.includes("--dry-run"),
    push: !args.includes("--no-push"),
    reportOnly: args.includes("--report-only"),
    verbose: args.includes("--verbose"),
  }

  const versionIdx = args.indexOf("--version")
  if (versionIdx !== -1 && args[versionIdx + 1]) {
    options.version = args[versionIdx + 1]
  }

  const commitIdx = args.indexOf("--commit")
  if (commitIdx !== -1 && args[commitIdx + 1]) {
    options.commit = args[commitIdx + 1]
  }

  const authorIdx = args.indexOf("--author")
  if (authorIdx !== -1 && args[authorIdx + 1]) {
    options.author = args[authorIdx + 1]
  }

  return options
}

async function getAuthor(): Promise<string> {
  const result = await $`git config user.name`.text()
  return result.trim().toLowerCase().replace(/\s+/g, "")
}

async function createBackupBranch(baseBranch: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
  const backupName = `backup/${baseBranch}-${timestamp}`

  await git.createBranch(backupName, baseBranch)
  await git.checkout(baseBranch)

  return backupName
}

async function main() {
  const options = parseArgs()
  const config = loadConfig()

  if (options.verbose) {
    logger.setVerbose(true)
  }

  logger.header("Kilo Upstream Merge Tool")

  // Step 1: Validate environment
  logger.step(1, 8, "Validating environment...")

  if (!(await git.hasUpstreamRemote())) {
    logger.error("No 'upstream' remote found. Please add it:")
    logger.info("  git remote add upstream git@github.com:anomalyco/opencode.git")
    process.exit(1)
  }

  if (await git.hasUncommittedChanges()) {
    logger.error("Working directory has uncommitted changes. Please commit or stash them first.")
    process.exit(1)
  }

  const currentBranch = await git.getCurrentBranch()
  logger.info(`Current branch: ${currentBranch}`)

  // Step 2: Fetch upstream
  logger.step(2, 8, "Fetching upstream...")

  if (!options.dryRun) {
    await git.fetchUpstream()
  }

  // Step 3: Determine target version/commit
  logger.step(3, 8, "Determining target version...")

  let targetVersion: version.VersionInfo | null = null

  if (options.commit) {
    targetVersion = await version.getVersionForCommit(options.commit)
    if (!targetVersion) {
      targetVersion = {
        version: "unknown",
        tag: "unknown",
        commit: options.commit,
      }
    }
  } else if (options.version) {
    const versions = await version.getAvailableUpstreamVersions()
    targetVersion = versions.find((v) => v.version === options.version || v.tag === options.version) || null

    if (!targetVersion) {
      logger.error(`Version ${options.version} not found in upstream`)
      logger.info("Available versions:")
      for (const v of versions.slice(0, 10)) {
        logger.info(`  - ${v.tag} (${v.commit.slice(0, 8)})`)
      }
      process.exit(1)
    }
  } else {
    targetVersion = await version.getLatestUpstreamVersion()
  }

  if (!targetVersion) {
    logger.error("Could not determine target version")
    process.exit(1)
  }

  logger.success(`Target: ${targetVersion.tag} (${targetVersion.commit.slice(0, 8)})`)

  // Step 4: Generate conflict report
  logger.step(4, 8, "Analyzing potential conflicts...")

  const conflicts = await report.analyzeConflicts(`upstream/${targetVersion.tag}`, config.baseBranch, config.keepOurs)

  const conflictReport: report.ConflictReport = {
    timestamp: new Date().toISOString(),
    upstreamVersion: targetVersion.version,
    upstreamCommit: targetVersion.commit,
    baseBranch: config.baseBranch,
    mergeBranch: "", // Will be set later
    totalConflicts: conflicts.length,
    conflicts,
    recommendations: [],
  }

  // Add recommendations
  const manualCount = conflicts.filter((c) => c.recommendation === "manual").length
  if (manualCount > 0) {
    conflictReport.recommendations.push(`${manualCount} files require manual review`)
  }

  const codemodCount = conflicts.filter((c) => c.recommendation === "codemod").length
  if (codemodCount > 0) {
    conflictReport.recommendations.push(`${codemodCount} files will be processed by codemods`)
  }

  logger.info(`Total files changed: ${conflicts.length}`)
  logger.info(`  - Keep ours: ${conflicts.filter((c) => c.recommendation === "keep-ours").length}`)
  logger.info(`  - Codemod: ${codemodCount}`)
  logger.info(`  - Manual review: ${manualCount}`)

  if (options.reportOnly) {
    const reportPath = `upstream-merge-report-${targetVersion.version}.md`
    await report.saveReport(conflictReport, reportPath)
    logger.success(`Report saved to ${reportPath}`)
    process.exit(0)
  }

  if (options.dryRun) {
    logger.info("[DRY-RUN] Would proceed with merge")
    const reportPath = `upstream-merge-report-${targetVersion.version}.md`
    await report.saveReport(conflictReport, reportPath)
    logger.success(`Report saved to ${reportPath}`)
    process.exit(0)
  }

  // Step 5: Create branches
  logger.step(5, 8, "Creating branches...")

  const author = options.author || (await getAuthor())
  const kiloVersion = await version.getCurrentKiloVersion()

  // Create backup branch
  await git.checkout(config.baseBranch)
  await git.pull(config.originRemote)
  const backupBranch = await createBackupBranch(config.baseBranch)
  logger.info(`Created backup branch: ${backupBranch}`)

  // Create Kilo merge branch
  const kiloBranch = `${author}/kilo-opencode-${targetVersion.tag}`
  await git.createBranch(kiloBranch)

  if (options.push) {
    await git.push(config.originRemote, kiloBranch, true)
  }
  logger.info(`Created Kilo branch: ${kiloBranch}`)

  // Create opencode compatibility branch from upstream commit
  await git.checkout(targetVersion.commit)
  const opencodeBranch = `${author}/opencode-${targetVersion.tag}`
  await git.createBranch(opencodeBranch)
  logger.info(`Created opencode branch: ${opencodeBranch}`)

  // Step 6: Apply transformations to opencode branch
  logger.step(6, 8, "Applying transformations to opencode branch...")

  // Transform package names
  logger.info("Transforming package names...")
  const nameResults = await transformPackageNames({ dryRun: false, verbose: options.verbose })
  logger.success(`Transformed ${nameResults.length} files`)

  // Preserve Kilo versions
  logger.info("Preserving Kilo versions...")
  const versionResults = await preserveAllVersions({
    dryRun: false,
    verbose: options.verbose,
    targetVersion: kiloVersion,
  })
  logger.success(`Preserved versions in ${versionResults.length} files`)

  // Reset keep-ours files to Kilo's version
  logger.info("Resetting Kilo-specific files...")
  const keepOursResults = await resetToOurs(config.keepOurs, { dryRun: false, verbose: options.verbose })
  logger.success(`Reset ${keepOursResults.length} files to Kilo's version`)

  // Commit transformations
  await git.stageAll()
  await git.commit(`refactor: kilo compat for ${targetVersion.tag}`)
  logger.success("Committed transformations")

  // Step 7: Merge into Kilo branch
  logger.step(7, 8, "Merging into Kilo branch...")

  await git.checkout(kiloBranch)
  const mergeResult = await git.merge(opencodeBranch)

  if (!mergeResult.success) {
    logger.warn("Merge has conflicts")
    logger.info("Conflicted files:")
    logger.list(mergeResult.conflicts)

    // Auto-resolve keep-ours conflicts
    const resolved = await keepOursFiles({ dryRun: false, verbose: options.verbose })
    const autoResolved = resolved.filter((r) => r.action === "kept")

    if (autoResolved.length > 0) {
      logger.success(`Auto-resolved ${autoResolved.length} conflicts (kept Kilo's version)`)
    }

    // Check remaining conflicts
    const remaining = await git.getConflictedFiles()
    if (remaining.length > 0) {
      logger.warn(`${remaining.length} conflicts require manual resolution:`)
      logger.list(remaining)
      logger.info("")
      logger.info("After resolving conflicts, run:")
      logger.info("  git add -A && git commit -m 'resolve merge conflicts'")
    } else {
      await git.stageAll()
      await git.commit(`merge: upstream ${targetVersion.tag}`)
      logger.success("Merge completed")
    }
  } else {
    logger.success("Merge completed without conflicts")
  }

  // Step 8: Push and cleanup
  logger.step(8, 8, "Finalizing...")

  if (options.push) {
    await git.push(config.originRemote, kiloBranch)
    logger.success(`Pushed ${kiloBranch} to ${config.originRemote}`)
  }

  // Update merge branch in report
  conflictReport.mergeBranch = kiloBranch

  // Save final report
  const reportPath = `upstream-merge-report-${targetVersion.version}.md`
  await report.saveReport(conflictReport, reportPath)
  logger.success(`Report saved to ${reportPath}`)

  // Summary
  logger.divider()
  logger.header("Merge Summary")

  logger.info(`Upstream version: ${targetVersion.tag}`)
  logger.info(`Kilo branch: ${kiloBranch}`)
  logger.info(`Opencode branch: ${opencodeBranch}`)
  logger.info(`Backup branch: ${backupBranch}`)
  logger.info(`Report: ${reportPath}`)

  const remainingConflicts = await git.getConflictedFiles()
  if (remainingConflicts.length > 0) {
    logger.warn(`${remainingConflicts.length} conflicts need manual resolution`)
  } else {
    logger.success("All conflicts resolved")
  }

  logger.divider()

  logger.info("Next steps:")
  if (remainingConflicts.length > 0) {
    logger.info("  1. Resolve remaining conflicts")
    logger.info("  2. git add -A && git commit -m 'resolve merge conflicts'")
    logger.info(`  3. git push ${config.originRemote} ${kiloBranch}`)
    logger.info("  4. Create PR from " + kiloBranch + " to " + config.baseBranch)
  } else {
    logger.info("  1. Review changes")
    logger.info("  2. Create PR from " + kiloBranch + " to " + config.baseBranch)
  }

  logger.info("")
  logger.info("To rollback:")
  logger.info(`  git checkout ${config.baseBranch}`)
  logger.info(`  git reset --hard ${backupBranch}`)
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`)
  process.exit(1)
})
