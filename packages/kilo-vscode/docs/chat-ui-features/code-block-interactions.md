# Code Block Interactions

Interactive functionality for rendered code blocks (copying, expanding, scroll behavior).

## Location

- [`webview-ui/src/components/common/CodeBlock.tsx`](../../webview-ui/src/components/common/CodeBlock.tsx:1)

## Interactions

- Copy button with visual feedback (checkmark icon)
- Expand/collapse for long code blocks (500px threshold)
- Sticky button positioning during scroll
- Inertial scroll chaining between code block and container
- Auto-hide buttons during text selection

## Suggested migration

**Reimplement?** No (UI-only).

- Keep this behavior in the webview as-is when switching the backend per [`docs/opencode-core/opencode-migration-plan.md`](docs/opencode-core/opencode-migration-plan.md:1).
- Ensure the Kilo CLI→Kilo event mapping preserves fenced code blocks in assistant output so the existing code-block renderer continues to activate.
- Reference: Kilo CLI also implements code-block copy in its own UI markdown renderer ([`packages/ui/src/components/markdown.tsx`](https://github.com/Kilo-Org/kilo/blob/main/packages/ui/src/components/markdown.tsx:1)), but Kilo does not need to adopt it.
