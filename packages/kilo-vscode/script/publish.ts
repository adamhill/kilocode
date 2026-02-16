#!/usr/bin/env bun
import { $ } from "bun"
import { join } from "node:path"
import { existsSync, mkdirSync, rmSync, chmodSync } from "node:fs"
import { tmpdir } from "node:os"

const packageJson = await Bun.file(join(import.meta.dir, "..", "package.json")).json()
const version = packageJson.version

console.log(`Publishing version: ${version}`)

// Get release version from env or default to "latest"
const releaseVersion = process.env.KILO_CLI_VERSION || "latest"
console.log(`Using CLI release version: ${releaseVersion}`)

// Target platform configurations
const targets = [
  { target: "linux-x64", asset: "kilo-linux-x64.tar.gz", binary: "kilo" },
  { target: "linux-arm64", asset: "kilo-linux-arm64.tar.gz", binary: "kilo" },
  { target: "alpine-x64", asset: "kilo-linux-x64-musl.tar.gz", binary: "kilo" },
  { target: "alpine-arm64", asset: "kilo-linux-arm64-musl.tar.gz", binary: "kilo" },
  { target: "darwin-x64", asset: "kilo-darwin-x64.zip", binary: "kilo" },
  { target: "darwin-arm64", asset: "kilo-darwin-arm64.zip", binary: "kilo" },
  { target: "win32-x64", asset: "kilo-windows-x64.zip", binary: "kilo.exe" },
]

const binDir = join(import.meta.dir, "..", "bin")
const distDir = join(import.meta.dir, "..", "dist")
const outDir = join(import.meta.dir, "..", "out")

// Clean up directories at start
console.log("\n🧹 Cleaning up directories...")
for (const dir of [binDir, distDir, outDir]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`  ✓ Cleaned ${dir}`)
  }
}

// Ensure directories exist
mkdirSync(outDir, { recursive: true })
mkdirSync(distDir, { recursive: true })

// Compile the extension once (platform-agnostic)
console.log("\n📦 Compiling extension...")
await $`bun run check-types`
await $`bun run lint`
await $`node ${join(import.meta.dir, "..", "esbuild.js")} --production`

// Process each target
for (const config of targets) {
  console.log(`\n🎯 Processing target: ${config.target}`)

  // Clean bin directory
  if (existsSync(binDir)) {
    rmSync(binDir, { recursive: true, force: true })
  }
  mkdirSync(binDir, { recursive: true })

  // Download and extract binary
  console.log(`  📥 Downloading ${config.asset}...`)
  const tmpDir = join(tmpdir(), `kilo-cli-${config.target}-${Date.now()}`)
  mkdirSync(tmpDir, { recursive: true })

  try {
    const downloadUrl =
      releaseVersion === "latest"
        ? `https://github.com/Kilo-Org/kilo/releases/latest/download/${config.asset}`
        : `https://github.com/Kilo-Org/kilo/releases/download/${releaseVersion}/${config.asset}`

    const assetPath = join(tmpDir, config.asset)
    await $`curl -fsSL -o ${assetPath} ${downloadUrl}`

    // Extract based on file type
    console.log(`  📂 Extracting binary...`)
    if (config.asset.endsWith(".tar.gz")) {
      await $`tar -xzf ${assetPath} -C ${tmpDir}`
    } else if (config.asset.endsWith(".zip")) {
      await $`unzip -q ${assetPath} -d ${tmpDir}`
    }

    // Find and copy binary
    const extractedBinary = join(tmpDir, config.binary)
    const targetBinary = join(binDir, config.binary)

    if (!existsSync(extractedBinary)) {
      throw new Error(`Binary not found at ${extractedBinary}`)
    }

    await $`cp ${extractedBinary} ${targetBinary}`

    // Set executable permissions (Unix-like systems)
    if (config.binary !== "kilo.exe") {
      chmodSync(targetBinary, 0o755)
    }

    console.log(`  ✅ Binary ready at ${targetBinary}`)
  } finally {
    // Cleanup temp directory
    rmSync(tmpDir, { recursive: true, force: true })
  }

  // Package for this target (skip prepublish to keep downloaded binary)
  console.log(`  📦 Packaging .vsix for ${config.target}...`)
  const vsixPath = join(outDir, `kilo-code-${config.target}.vsix`)
  await $`vsce package --pre-release --no-dependencies --skip-license --target ${config.target} -o ${vsixPath} ${version}`.env(
    {
      ...process.env,
      npm_config_ignore_scripts: "true",
    },
  )
  console.log(`  ✅ Created ${vsixPath}`)

  // Publish for this target
  console.log(`  🚀 Publishing to VS Code Marketplace for ${config.target}...`)
  await $`vsce publish --pre-release --packagePath ${vsixPath}`
  console.log(`  ✅ Published ${config.target}`)

  // Note: Open VSX publishing is commented out as it doesn't support prereleases
  // console.log("\n📤 Publishing to Open VSX...")
  // await $`npx ovsx publish ${vsixPath} --target ${config.target} -p ${process.env.OPENVSX_TOKEN}`
  // console.log("✅ Published to Open VSX!")
}

console.log("\n✨ All targets published successfully!")
