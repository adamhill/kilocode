# File Permission Dialogs

Batch approval UI for file read operations.

## Location

- [`webview-ui/src/components/chat/tool-message/BatchFilePermission.tsx`](../../webview-ui/src/components/chat/tool-message/BatchFilePermission.tsx:1)

## Interactions

- Batch file read approval interface
- Per-file permission management
- Approve/deny multiple file read requests

## Suggested migration

**Reimplement?** Partial (UI can stay; semantics need remapping).

- Kilo CLI uses a permission-request queue (asked/replied) model; the extension host must translate Kilo CLI permission events into Kilo’s existing approval UX per [`docs/opencode-core/opencode-migration-plan.md`](docs/opencode-core/opencode-migration-plan.md:1).
- If Kilo CLI permission prompts are per-tool-call (not “batch per-file”), you may need to:
    - either keep a batch UI but respond to permissions one-by-one, or
    - simplify the UI to match Kilo CLI’s permission granularity.
- Kilo CLI UI reference: permission prompt actions exist in [`packages/ui/src/components/message-part.tsx`](https://github.com/Kilo-Org/kilo/blob/main/packages/ui/src/components/message-part.tsx:1).
