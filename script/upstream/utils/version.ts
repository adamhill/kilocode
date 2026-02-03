#!/usr/bin/env bun
/**
 * Version detection utilities for upstream merge automation
 */

import { $ } from "bun"
import { getUpstreamTags, getCommitMessage, getTagsForCommit } from "./git"

export interface VersionInfo {
  version: string
  tag: string
  commit: string
}

/**
 * Parse version from a tag string (e.g., "v1.1.49" -> "1.1.49")
 */
export function parseVersion(tag: string): string | null {
  const match = tag.match(/^v?(\d+\.\d+\.\d+.*)$/)
  return match?.[1] ?? null
}

/**
 * Compare two semver versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((x) => parseInt(x, 10) || 0)
  const partsB = b.split(".").map((x) => parseInt(x, 10) || 0)

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA < numB) return -1
    if (numA > numB) return 1
  }

  return 0
}

/**
 * Get the latest upstream version from tags
 */
export async function getLatestUpstreamVersion(): Promise<VersionInfo | null> {
  const tags = await getUpstreamTags()

  const versions: Array<{ tag: string; version: string }> = []
  for (const tag of tags) {
    const version = parseVersion(tag)
    if (version) versions.push({ tag, version })
  }

  if (versions.length === 0) return null

  // Sort by version descending
  versions.sort((a, b) => compareVersions(b.version, a.version))

  const latest = versions[0]
  if (!latest) return null

  // Get commit for this tag
  const commit = await $`git rev-list -n 1 upstream/${latest.tag}`.text().then((t) => t.trim())

  return {
    version: latest.version,
    tag: latest.tag,
    commit,
  }
}

/**
 * Get version info for a specific commit
 */
export async function getVersionForCommit(commit: string): Promise<VersionInfo | null> {
  const tags = await getTagsForCommit(commit)

  for (const tag of tags) {
    const version = parseVersion(tag)
    if (version) {
      return { version, tag, commit }
    }
  }

  // Try to extract from commit message
  const message = await getCommitMessage(commit)
  const match = message.match(/v?(\d+\.\d+\.\d+)/)
  if (match && match[1]) {
    return {
      version: match[1],
      tag: `v${match[1]}`,
      commit,
    }
  }

  return null
}

/**
 * Get available upstream versions (sorted newest first)
 */
export async function getAvailableUpstreamVersions(): Promise<VersionInfo[]> {
  const tags = await getUpstreamTags()
  const versions: VersionInfo[] = []

  for (const tag of tags) {
    const version = parseVersion(tag)
    if (version) {
      const commit = await $`git rev-list -n 1 upstream/${tag}`.text().then((t) => t.trim())
      versions.push({ version, tag, commit })
    }
  }

  // Sort by version descending
  versions.sort((a, b) => compareVersions(b.version, a.version))

  return versions
}

/**
 * Get current Kilo version from package.json
 */
export async function getCurrentKiloVersion(): Promise<string> {
  const pkg = await Bun.file("packages/opencode/package.json").json()
  return pkg.version
}
