# Memory Bank

- **What it is**: Structured project documentation read at task start (stored under a `.kilocode` folder) to improve cross-session continuity.

## Docs references

- [`apps/kilocode-docs/pages/customize/context/memory-bank.md`](../../apps/kilocode-docs/pages/customize/context/memory-bank.md)

## Suggested migration

- **Kilo CLI availability**: Not present.
- **Migration recommendation**:
    - Keep the Memory Bank feature in the VS Code extension host.
    - Optionally define a file convention that Kilo CLI can read, but assume extension ownership until explicitly supported server-side.
- **Reimplementation required?**: Yes.

## Implementation notes

- This is primarily a convention + file-based system and may not map 1:1 to a single service directory.
