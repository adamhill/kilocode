const esbuild = require("esbuild")
const { solidPlugin } = require("esbuild-plugin-solid")

const production = process.argv.includes("--production")
const watch = process.argv.includes("--watch")

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
  name: "esbuild-problem-matcher",

  setup(build) {
    build.onStart(() => {
      console.log("[watch] build started")
    })
    build.onEnd((result) => {
      result.errors.forEach(({ text, location }) => {
        console.error(`✘ [ERROR] ${text}`)
        if (location) {
          console.error(`    ${location.file}:${location.line}:${location.column}:`)
        }
      })
      console.log("[watch] build finished")
    })
  },
}

const cssPackageResolvePlugin = {
  name: "css-package-resolve",
  setup(build) {
    build.onResolve({ filter: /^@/, namespace: "file" }, (args) => {
      if (args.kind === "import-rule") {
        return build.resolve(args.path, {
          kind: "import-statement",
          resolveDir: args.resolveDir,
        })
      }
    })
  },
}

async function main() {
  // Build extension
  const extensionCtx = await esbuild.context({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    format: "cjs",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "node",
    outfile: "dist/extension.js",
    external: ["vscode"],
    logLevel: "silent",
    plugins: [esbuildProblemMatcherPlugin],
  })

  // Build webview
  const webviewCtx = await esbuild.context({
    entryPoints: ["webview-ui/src/index.tsx"],
    bundle: true,
    format: "iife",
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: "browser",
    outfile: "dist/webview.js",
    logLevel: "silent",
    loader: {
      ".woff": "file",
      ".woff2": "file",
      ".ttf": "file",
    },
    plugins: [cssPackageResolvePlugin, solidPlugin(), esbuildProblemMatcherPlugin],
  })

  if (watch) {
    await Promise.all([extensionCtx.watch(), webviewCtx.watch()])
  } else {
    await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()])
    await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()])
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
