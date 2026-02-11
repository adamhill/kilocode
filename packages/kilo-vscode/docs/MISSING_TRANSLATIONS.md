# Missing Translations

Hardcoded English strings in `webview-ui/src/` that have **no matching key** in
`webview-ui/src/i18n/en.ts`. Each entry needs a new translation key added to all
locale files before the string can be replaced with `language.t("key")`.

> Generated from branch `mark/i18n-hardcoded-strings`.

---

## `webview-ui/src/components/DeviceAuthCard.tsx`

| Line | Hardcoded String                           | Suggested Key                   |
| ---- | ------------------------------------------ | ------------------------------- |
| 54   | `"URL copied to clipboard"` (toast title)  | `deviceAuth.toast.urlCopied`    |
| 61   | `"Code copied to clipboard"` (toast title) | `deviceAuth.toast.codeCopied`   |
| 79   | `"Starting login..."`                      | `deviceAuth.status.initiating`  |
| 96   | `"Sign in to Kilo Code"`                   | `deviceAuth.title`              |
| 111  | `"Step 1: Open this URL"`                  | `deviceAuth.step1`              |
| 136  | `"Copy URL"` (title attr)                  | `deviceAuth.action.copyUrl`     |
| 139  | `"Open Browser"`                           | `deviceAuth.action.openBrowser` |
| 156  | `"QR Code"` (alt text)                     | `deviceAuth.qrCode.alt`         |
| 179  | `"Step 2: Enter this code"`                | `deviceAuth.step2`              |
| 192  | `"Click to copy"` (title attr)             | `deviceAuth.action.clickToCopy` |
| 211  | `"Click to copy"` (text)                   | `deviceAuth.action.clickToCopy` |
| 234  | `"Waiting for authorization..."`           | `deviceAuth.status.waiting`     |
| 258  | `"Login successful!"`                      | `deviceAuth.status.success`     |
| 276  | `"Login failed"` (fallback)                | `deviceAuth.status.failed`      |
| 279  | `"Retry"`                                  | `common.retry`                  |
| 296  | `"Login cancelled"`                        | `deviceAuth.status.cancelled`   |
| 300  | `"Try Again"`                              | `deviceAuth.action.tryAgain`    |

## `webview-ui/src/components/ProfileView.tsx`

| Line | Hardcoded String              | Suggested Key              |
| ---- | ----------------------------- | -------------------------- |
| 55   | `"Profile"`                   | `profile.title`            |
| 81   | `"Not logged in"`             | `profile.notLoggedIn`      |
| 84   | `"Login with Kilo Code"`      | `profile.action.login`     |
| 147  | `"Balance"`                   | `profile.balance.title`    |
| 160  | `"Refresh balance"` (tooltip) | `profile.balance.refresh`  |
| 162  | `"↻ Refresh"`                 | `common.refresh`           |
| 172  | `"Dashboard"`                 | `profile.action.dashboard` |
| 179  | `"Log Out"`                   | `profile.action.logout`    |

## `webview-ui/src/components/Settings.tsx`

| Line | Hardcoded String                  | Suggested Key                    |
| ---- | --------------------------------- | -------------------------------- |
| 54   | `"Configuration"` (section title) | `settings.section.configuration` |
| 61   | `"Agent Behaviour"` (tab trigger) | `settings.agentBehaviour.title`  |
| 65   | `"Auto-Approve"` (tab trigger)    | `settings.autoApprove.title`     |
| 69   | `"Browser"` (tab trigger)         | `settings.browser.title`         |
| 73   | `"Checkpoints"` (tab trigger)     | `settings.checkpoints.title`     |
| 77   | `"Display"` (tab trigger)         | `settings.display.title`         |
| 81   | `"Autocomplete"` (tab trigger)    | `settings.autocomplete.title`    |
| 85   | `"Notifications"` (tab trigger)   | `settings.notifications.title`   |
| 89   | `"Context"` (tab trigger)         | `settings.context.title`         |
| 93   | `"Terminal"` (tab trigger)        | `settings.terminal.title`        |
| 97   | `"Prompts"` (tab trigger)         | `settings.prompts.title`         |
| 101  | `"Experimental"` (tab trigger)    | `settings.experimental.title`    |
| 105  | `"Language"` (tab trigger)        | `settings.language.title`        |
| 109  | `"About Kilo Code"` (tab trigger) | `settings.aboutKiloCode.title`   |
| 118  | `"Agent Behaviour"` (h3)          | `settings.agentBehaviour.title`  |
| 122  | `"Auto-Approve"` (h3)             | `settings.autoApprove.title`     |
| 126  | `"Browser"` (h3)                  | `settings.browser.title`         |
| 130  | `"Checkpoints"` (h3)              | `settings.checkpoints.title`     |
| 134  | `"Display"` (h3)                  | `settings.display.title`         |
| 138  | `"Autocomplete"` (h3)             | `settings.autocomplete.title`    |
| 142  | `"Notifications"` (h3)            | `settings.notifications.title`   |
| 146  | `"Context"` (h3)                  | `settings.context.title`         |
| 150  | `"Terminal"` (h3)                 | `settings.terminal.title`        |
| 154  | `"Prompts"` (h3)                  | `settings.prompts.title`         |
| 158  | `"Experimental"` (h3)             | `settings.experimental.title`    |
| 162  | `"Language"` (h3)                 | `settings.language.title`        |
| 166  | `"About Kilo Code"` (h3)          | `settings.aboutKiloCode.title`   |

## `webview-ui/src/components/chat/MessageList.tsx`

| Line | Hardcoded String                                    | Suggested Key                     |
| ---- | --------------------------------------------------- | --------------------------------- |
| 67   | `"Start a conversation by typing a message below."` | `session.messages.empty`          |
| 74   | `"Scroll to bottom"` (aria-label)                   | `session.messages.scrollToBottom` |

## `webview-ui/src/components/chat/ModelSelector.tsx`

| Line | Hardcoded String                  | Suggested Key              |
| ---- | --------------------------------- | -------------------------- |
| 162  | `"No providers"` (fallback label) | `dialog.model.noProviders` |

## `webview-ui/src/components/chat/PermissionDialog.tsx`

| Line | Hardcoded String | Suggested Key                   |
| ---- | ---------------- | ------------------------------- |
| 48   | `"Reject"`       | `permission.action.reject`      |
| 51   | `"Always Allow"` | `permission.action.alwaysAllow` |
| 54   | `"Allow Once"`   | `permission.action.allowOnce`   |

## `webview-ui/src/components/chat/PromptInput.tsx`

| Line | Hardcoded String                                  | Suggested Key                   |
| ---- | ------------------------------------------------- | ------------------------------- |
| 72   | `"Connecting to server..."` (placeholder)         | `prompt.placeholder.connecting` |
| 72   | `"Type a message..."` (placeholder)               | `prompt.placeholder.default`    |
| 112  | `"Press Enter to send, Shift+Enter for new line"` | `prompt.hint.sendShortcut`      |

## `webview-ui/src/components/chat/TaskHeader.tsx`

| Line | Hardcoded String           | Suggested Key               |
| ---- | -------------------------- | --------------------------- |
| 48   | `"Session cost"` (tooltip) | `context.usage.sessionCost` |

## `webview-ui/src/components/history/SessionList.tsx`

| Line | Hardcoded String                                          | Suggested Key                |
| ---- | --------------------------------------------------------- | ---------------------------- |
| 19   | `"just now"`                                              | `time.justNow`               |
| 24   | `"min ago"` (template: `${n} min ago`)                    | `time.minutesAgo`            |
| 29   | `"h ago"` (template: `${n}h ago`)                         | `time.hoursAgo`              |
| 34   | `"d ago"` (template: `${n}d ago`)                         | `time.daysAgo`               |
| 38   | `"mo ago"` (template: `${n}mo ago`)                       | `time.monthsAgo`             |
| 70   | `"Search sessions..."` (placeholder)                      | `session.search.placeholder` |
| 71   | `"No sessions yet. Click + to start a new conversation."` | `session.empty`              |
| 75   | `"Untitled"` (fallback title)                             | `session.untitled`           |

## `webview-ui/src/components/settings/AboutKiloCodeTab.tsx`

| Line | Hardcoded String        | Suggested Key                                |
| ---- | ----------------------- | -------------------------------------------- |
| 26   | `"Connected"`           | `settings.aboutKiloCode.status.connected`    |
| 28   | `"Connecting..."`       | `settings.aboutKiloCode.status.connecting`   |
| 30   | `"Disconnected"`        | `settings.aboutKiloCode.status.disconnected` |
| 32   | `"Error"`               | `settings.aboutKiloCode.status.error`        |
| 56   | `"CLI Server"`          | `settings.aboutKiloCode.cliServer`           |
| 74   | `"Status:"`             | `settings.aboutKiloCode.status.label`        |
| 117  | `"Port:"`               | `settings.aboutKiloCode.port.label`          |
| 148  | `"Version Information"` | `settings.aboutKiloCode.versionInfo`         |
| 157  | `"Kilo Code Extension"` | `settings.aboutKiloCode.extensionName`       |

## `webview-ui/src/components/settings/AgentBehaviourTab.tsx`

| Line | Hardcoded String | Suggested Key                               |
| ---- | ---------------- | ------------------------------------------- |
| 11   | `"Modes"`        | `settings.agentBehaviour.subtab.modes`      |
| 12   | `"MCP Servers"`  | `settings.agentBehaviour.subtab.mcpServers` |
| 13   | `"Rules"`        | `settings.agentBehaviour.subtab.rules`      |
| 14   | `"Workflows"`    | `settings.agentBehaviour.subtab.workflows`  |
| 15   | `"Skills"`       | `settings.agentBehaviour.subtab.skills`     |

## `webview-ui/src/components/settings/LanguageTab.tsx`

| Line | Hardcoded String                                                                         | Suggested Key                   |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| 14   | `'Choose the language for the Kilo Code UI. "Auto" uses your VS Code display language.'` | `settings.language.description` |
| 19   | `"Auto (VS Code language)"`                                                              | `settings.language.auto`        |
| 30   | `"Current: "` (prefix)                                                                   | `settings.language.current`     |

## Stub settings tabs (placeholder text)

The following settings tabs contain `"This section is not implemented yet."` placeholder
text. These should be replaced with proper i18n keys once the tabs are implemented:

- `AutoApproveTab.tsx`
- `AutocompleteTab.tsx`
- `BrowserTab.tsx`
- `CheckpointsTab.tsx`
- `ContextTab.tsx`
- `DisplayTab.tsx`
- `ExperimentalTab.tsx`
- `NotificationsTab.tsx`
- `PromptsTab.tsx`
- `ProvidersTab.tsx`
- `TerminalTab.tsx`
