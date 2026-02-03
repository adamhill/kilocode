# Upstream Merge Automation

Scripts for automating the merge of upstream opencode changes into Kilo.

## Quick Start

```bash
# Install dependencies (from script/upstream directory)
cd script/upstream
bun install

# List available upstream versions
bun run list-versions.ts

# Analyze changes for a specific version (without merging)
bun run analyze.ts --version v1.1.49

# Run the full merge process
bun run merge.ts --version v1.1.49

# Dry-run to preview what would happen
bun run merge.ts --version v1.1.49 --dry-run
```

## Scripts

### Main Scripts

| Script             | Description                                   |
| ------------------ | --------------------------------------------- |
| `merge.ts`         | Main orchestration script for upstream merges |
| `list-versions.ts` | List available upstream versions              |
| `analyze.ts`       | Analyze changes without merging               |

### Transform Scripts

| Script                                 | Description                                                 |
| -------------------------------------- | ----------------------------------------------------------- |
| `transforms/package-names.ts`          | Transform opencode package names to kilo                    |
| `transforms/preserve-versions.ts`      | Preserve Kilo's package versions                            |
| `transforms/keep-ours.ts`              | Keep Kilo's version of specific files                       |
| `transforms/skip-files.ts`             | Skip/remove files that shouldn't exist in Kilo              |
| `transforms/transform-i18n.ts`         | Transform i18n files with Kilo branding                     |
| `transforms/transform-take-theirs.ts`  | Take upstream + apply Kilo branding for branding-only files |
| `transforms/transform-tauri.ts`        | Transform Tauri/Desktop config files                        |
| `transforms/transform-package-json.ts` | Enhanced package.json with Kilo dependency injection        |
| `transforms/transform-scripts.ts`      | Transform script files with GitHub API references           |
| `transforms/transform-extensions.ts`   | Transform extension files (Zed, etc.)                       |
| `transforms/transform-web.ts`          | Transform web/docs files (.mdx)                             |

### Codemods (AST-based)

| Script                          | Description                                |
| ------------------------------- | ------------------------------------------ |
| `codemods/transform-imports.ts` | Transform import statements using ts-morph |
| `codemods/transform-strings.ts` | Transform string literals                  |

## Merge Process

The merge automation follows this process:

1. **Validate environment**
   - Check for upstream remote
   - Ensure working directory is clean

2. **Fetch upstream** and determine target version

3. **Generate conflict report** analyzing which files will conflict

4. **Create branches**
   - `backup/<branch>-<timestamp>` - Backup of current state
   - `<author>/kilo-opencode-<version>` - Merge target branch
   - `<author>/opencode-<version>` - Transformed upstream branch

5. **Apply transformations** to upstream branch:
   - Transform package names (opencode-ai -> @kilocode/cli)
   - Preserve Kilo's versions
   - Reset Kilo-specific files

6. **Merge** transformed upstream into Kilo branch

7. **Auto-resolve** known conflicts (markdown, Kilo-specific files)

8. **Push** and generate final report

## Configuration

Configuration is defined in `utils/config.ts`:

```typescript
{
  // Package name mappings
  packageMappings: [
    { from: "opencode-ai", to: "@kilocode/cli" },
    { from: "@opencode-ai/cli", to: "@kilocode/cli" },
    // ...
  ],

  // Files to always keep Kilo's version (never take upstream)
  keepOurs: [
    "README.md",
    "CONTRIBUTING.md",
    "AGENTS.md",
    ".github/workflows/publish.yml",  // GitHub workflows - manual review
    // ...
  ],

  // Files to skip entirely (remove from merge)
  skipFiles: [
    "README.*.md",  // Translated READMEs
    "STATS.md",
    ".github/workflows/update-nix-hashes.yml",
    // ...
  ],

  // Files to take upstream + apply Kilo branding transforms
  takeTheirsAndTransform: [
    "packages/app/src/components/**/*.tsx",
    "packages/app/src/context/**/*.tsx",
    "packages/ui/src/**/*.tsx",
    // ...
  ],

  // Tauri/Desktop config files
  tauriFiles: [
    "packages/desktop/src-tauri/*.json",
    "packages/desktop/src-tauri/src/*.rs",
    // ...
  ],

  // Kilo-specific directories (preserved)
  kiloDirectories: [
    "packages/opencode/src/kilocode",
    "packages/kilo-gateway",
    "packages/kilo-telemetry",
    // ...
  ],
}
```

## Auto-Resolution Strategies

The merge tool uses different strategies based on file type:

| File Type         | Strategy                | Description                                      |
| ----------------- | ----------------------- | ------------------------------------------------ |
| i18n files        | `i18n-transform`        | Take upstream, apply Kilo branding               |
| App components    | `take-theirs-transform` | Take upstream, apply branding (no logic changes) |
| Tauri configs     | `tauri-transform`       | Take upstream, transform identifiers/names       |
| package.json      | `package-transform`     | Take upstream, transform names, inject Kilo deps |
| Script files      | `script-transform`      | Take upstream, transform GitHub references       |
| Extensions        | `extension-transform`   | Take upstream, apply branding                    |
| Web/docs          | `web-transform`         | Take upstream, apply branding                    |
| README/docs       | `keep-ours`             | Keep Kilo's version                              |
| GitHub workflows  | `keep-ours`             | Keep Kilo's version (manual review)              |
| Code with markers | `manual`                | Has `kilocode_change` markers, needs review      |

## CLI Options

### merge.ts

```
Options:
  --version <version>  Target upstream version (e.g., v1.1.49)
  --commit <hash>      Target upstream commit hash
  --dry-run            Preview changes without applying them
  --no-push            Don't push branches to remote
  --report-only        Only generate conflict report
  --verbose            Enable verbose logging
  --author <name>      Author name for branch prefix
```

### analyze.ts

```
Options:
  --version <version>  Target upstream version
  --commit <hash>      Target commit hash
  --output <file>      Output file for report
```

## Manual Conflict Resolution

After running the merge script, you may have remaining conflicts. To resolve:

1. Open each conflicted file
2. Look for `kilocode_change` markers to identify Kilo-specific code
3. Resolve conflicts, keeping Kilo-specific changes
4. Stage and commit:
   ```bash
   git add -A
   git commit -m "resolve merge conflicts"
   ```

## Rollback

If something goes wrong:

```bash
# Find your backup branch
git branch | grep backup

# Reset to backup
git checkout dev
git reset --hard backup/dev-<timestamp>
```

## Adding New Transformations

### String-based (simple)

Edit `transforms/package-names.ts` and add patterns to `PACKAGE_PATTERNS`.

### AST-based (robust)

1. Create a new file in `codemods/`
2. Use ts-morph for TypeScript AST manipulation
3. Export transform functions
4. Add to the merge orchestration if needed

## Troubleshooting

### "No upstream remote found"

```bash
git remote add upstream git@github.com:anomalyco/opencode.git
```

### "Working directory has uncommitted changes"

```bash
git stash
# or
git commit -am "WIP"
```

### Merge conflicts after auto-resolution

Some files require manual review. Check the generated report for guidance.
