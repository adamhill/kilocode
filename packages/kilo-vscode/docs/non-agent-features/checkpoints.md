# Checkpoints (Shadow Versioning, Workspace Time Travel)

**Priority:** P1
**Status:** 🔨 Partial

## What Exists

- `CheckpointsTab` settings toggle to enable/disable snapshot creation before file edits (`config.snapshot`)

## Remaining Work

- Checkpoint service with shadow git repo for per-task snapshots
- Restore files only vs restore files + task state
- Safety checks to avoid problematic paths/nested repos
- Checkpoint navigation UI (timeline/list of checkpoints per task)
- Diff viewing between checkpoints
- Evaluate whether CLI session undo/redo/revert maps to Kilo's checkpoint model or if extension needs its own git-based implementation
