# File Permission Dialogs

**Priority:** P1
**Status:** 🔨 Partial

## What Exists

- Single permission requests render inline above prompt input with Deny / Allow Always / Allow Once buttons
- Tool-level inline permissions appear inside tool cards in `message-part.tsx`
- Permission queue (`permission-queue.ts`) handles upsert/remove, processes one at a time

## Remaining Work

- Batch file read approval (approve multiple pending file reads at once)
- Per-file granularity in batch approvals
- Render permissions inline in the prompt dock area instead of the current modal `Dialog` wrapper — match the pattern used by the desktop app (`packages/app/`) where permissions replace the text input while pending

## TODO: Inline Permission Rendering

Both the desktop app and the old extension render permission prompts inline in the prompt area. The current rebuild uses a modal `Dialog` wrapper. Change to:

- Render `BasicTool` + `permission-prompt` block in the prompt dock area, conditionally replacing the input when `permissions().length > 0`
- Remove the `Dialog` / `useDialog()` wrapper
- This naturally blocks user input while permissions are pending, matching the app's `blocked()` memo pattern
