# Kilocode Change Markers

To minimize merge conflicts when syncing with upstream, mark Kilo Code-specific changes in shared code with `kilocode_change` comments.

**Single line:**

```typescript
const value = 42 // kilocode_change
```

**Multi-line:**

```typescript
// kilocode_change start
const foo = 1
const bar = 2
// kilocode_change end
```

**New files:**

```typescript
// kilocode_change - new file
```

## When markers are NOT needed

Code in these paths is Kilo Code-specific and does NOT need `kilocode_change` markers:

- `packages/opencode/src/kilocode/` - All files in this directory
- `packages/opencode/test/kilocode/` - All test files for kilocode
- Any other path containing `kilocode` in filename or directory name

These paths are entirely Kilo Code additions and won't conflict with upstream.
