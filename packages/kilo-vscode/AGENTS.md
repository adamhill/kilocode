# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Package Context

VSCode extension for Kilo Code. Part of a Bun/Turbo monorepo but this package uses **pnpm** (not Bun).

## Commands

```bash
pnpm compile          # Type-check + lint + build
pnpm watch            # Watch mode (esbuild + tsc)
pnpm test             # Run tests (requires pretest compilation)
pnpm lint             # ESLint on src/
pnpm run format       # Run formatter (do this before committing to avoid styling-only changes in commits)
```

Single test: `pnpm test -- --grep "test name"`

## Architecture (Non-Obvious)

- Two separate esbuild builds in [`esbuild.js`](esbuild.js): extension (Node/CJS) and webview (browser/IIFE)
- Webview uses **Solid.js** (not React) - JSX compiles via `esbuild-plugin-solid`
- Extension code in `src/`, webview code in `webview-ui/src/` with separate tsconfig
- Tests compile to `out/` via `compile-tests`, not `dist/`
- CSP requires nonce for scripts and `font-src` for bundled fonts - see [`KiloProvider.ts`](src/KiloProvider.ts:777)
- HTML root has `data-theme="kilo-vscode"` to activate kilo-ui's VS Code theme bridge
- Extension and webview have no shared state - communicate via `vscode.Webview.postMessage()`
- For editor panels, use [`AgentManagerProvider`](src/AgentManagerProvider.ts) pattern with `retainContextWhenHidden: true`
- esbuild webview build includes [`cssPackageResolvePlugin`](esbuild.js:29) for CSS `@import` resolution and font loaders (`.woff`, `.woff2`, `.ttf`)

## Webview UI (kilo-ui)

New webview features must use **`@kilocode/kilo-ui`** components instead of raw HTML elements with inline styles. This is a Solid.js component library built on `@kobalte/core`.

- Import via deep subpaths: `import { Button } from "@kilocode/kilo-ui/button"`
- Available components include `Button`, `IconButton`, `Dialog`, `Spinner`, `Card`, `Tabs`, `Tooltip`, `Toast`, `Code`, `Markdown`, and more — see the [component migration table](docs/ui-implementation-plan.md#6-component-migration-reference-table) for the full list
- Provider hierarchy in [`App.tsx`](webview-ui/src/App.tsx:113): `ThemeProvider → I18nProvider → DialogProvider → VSCodeProvider → ServerProvider → ProviderProvider → SessionProvider`
- Global styles imported via `import "@kilocode/kilo-ui/styles"` in [`index.tsx`](webview-ui/src/index.tsx:2)
- [`chat.css`](webview-ui/src/styles/chat.css) is being progressively migrated — when replacing a component with kilo-ui, remove the corresponding CSS rules from it
- See [`docs/ui-implementation-plan.md`](docs/ui-implementation-plan.md) for the full migration plan and phased rollout
- **Check the desktop app first**: [`packages/app/src/`](../../packages/app/src/) is the reference implementation for how kilo-ui components are composed together. Always check how the app uses a component before implementing it in the webview — don't just look at the component API in isolation.
- **`data-component` and `data-slot` attributes carry CSS styling** — kilo-ui uses `[data-component]` and `[data-slot]` attribute selectors, not class names. When the app uses e.g. `data-component="permission-prompt"` and `data-slot="permission-actions"`, these get kilo-ui styling for free.
- **Icons**: kilo-ui has 75+ custom SVG icons in [`packages/ui/src/components/icon.tsx`](../../packages/ui/src/components/icon.tsx). To list all available icon names: `node -e "const c=require('fs').readFileSync('../../packages/ui/src/components/icon.tsx','utf8');[...c.matchAll(/^\\s{2}[\"']?([\\w-]+)[\"']?:\\s*\x60/gm)].map(m=>m[1]).sort().forEach(n=>console.log(n))"`. Icon names use both hyphenated (`arrow-left`) and bare-word (`brain`, `console`, `providers`) keys.

## Debugging

- Extension logs: "Extension Host" output channel (not Debug Console)
- Webview logs: Command Palette → "Developer: Open Webview Developer Tools"
- All debug output must be prepended with `[Kilo New]` for easy filtering

## Naming Conventions

- All VSCode commands must use `kilo-code.new.` prefix (not `kilo-code.`)
- All view IDs must use `kilo-code.new.` prefix (e.g., `kilo-code.new.sidebarView`)

## Style

Follow monorepo root AGENTS.md style guide:

- Prefer `const` over `let`, early returns over `else`
- Single-word variable names when possible
- Avoid `try`/`catch`, avoid `any` type
- ESLint enforces: curly braces, strict equality, semicolons, camelCase/PascalCase imports

## Committing

- Before committing, always run `pnpm run format` so commits don't accidentally include formatting/styling-only diffs.
