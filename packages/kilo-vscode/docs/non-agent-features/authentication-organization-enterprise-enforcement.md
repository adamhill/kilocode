# Authentication / organization / enterprise enforcement

- **What it is**: Cloud auth and organization-aware behavior.

## Capabilities

- Device-code style auth.
- Org feature flags.
- MDM policy enforcement.

## Suggested migration

- **Kilo CLI availability**: Partial.
- **Migration recommendation**:
    - Split responsibilities: Kilo CLI handles its own auth/session for server APIs.
    - The VS Code extension remains responsible for org/MDM enforcement and for supplying/mediating credentials as needed.
- **Reimplementation required?**: Partial.

## Primary implementation anchors

- [`src/services/kilocode/`](../../src/services/kilocode/)
- [`src/services/mdm/`](../../src/services/mdm/)
