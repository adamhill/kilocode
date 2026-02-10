# Auto-Approval Controls

Interactive UI for configuring and toggling auto-approval.

## Location

- [`webview-ui/src/components/settings/AutoApproveDropdown.tsx`](../../webview-ui/src/components/settings/AutoApproveDropdown.tsx:1)
- [`webview-ui/src/components/settings/AutoApproveMenu.tsx`](../../webview-ui/src/components/settings/AutoApproveMenu.tsx:1)

## Interactions

- Auto-approval toggle to enable/disable
- Scope selectors to configure which actions auto-approve
- Timeout configuration for auto-approval delays

## Suggested migration

**Reimplement?** Partial.

- Kilo CLI’s permission system supports “remember/always allow” patterns; Kilo’s auto-approve controls should map onto Kilo CLI permission replies (e.g. “allow once” vs “allow always”) plus Kilo CLI-side permission configuration.
- The Kilo UI can remain, but the extension host needs a translation layer that:
    - updates Kilo CLI permission config (if supported) or
    - chooses `remember` appropriately when replying to permission prompts.
- Kilo CLI reference: “autoaccept edits” exists in the app command set (see `command.permissions.autoaccept.*` labels in [`packages/app/src/i18n/en.ts`](https://github.com/Kilo-Org/kilo/blob/main/packages/app/src/i18n/en.ts:1)).
