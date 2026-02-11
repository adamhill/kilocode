# Missing Translations

Hardcoded English strings in `webview-ui/src/` that have **no matching key** in
`webview-ui/src/i18n/en.ts`. Each entry needs a new translation key added to all
locale files before the string can be replaced with `language.t("key")`.

> Generated from branch `mark/i18n-hardcoded-strings`.

---

## `webview-ui/src/components/DeviceAuthCard.tsx`

| Line | Hardcoded String                           | Suggested Key                   | EN                             | DE                                    |
| ---- | ------------------------------------------ | ------------------------------- | ------------------------------ | ------------------------------------- |
| 54   | `"URL copied to clipboard"` (toast title)  | `deviceAuth.toast.urlCopied`    | URL copied to clipboard        | URL in die Zwischenablage kopiert     |
| 61   | `"Code copied to clipboard"` (toast title) | `deviceAuth.toast.codeCopied`   | Code copied to clipboard       | Code in die Zwischenablage kopiert    |
| 79   | `"Starting login..."`                      | `deviceAuth.status.initiating`  | Starting login...              | Anmeldung wird gestartet...           |
| 96   | `"Sign in to Kilo Code"`                   | `deviceAuth.title`              | Sign in to Kilo Code           | Bei Kilo Code anmelden               |
| 111  | `"Step 1: Open this URL"`                  | `deviceAuth.step1`              | Step 1: Open this URL          | Schritt 1: Diese URL öffnen          |
| 136  | `"Copy URL"` (title attr)                  | `deviceAuth.action.copyUrl`     | Copy URL                       | URL kopieren                          |
| 139  | `"Open Browser"`                           | `deviceAuth.action.openBrowser` | Open Browser                   | Browser öffnen                        |
| 156  | `"QR Code"` (alt text)                     | `deviceAuth.qrCode.alt`         | QR Code                        | QR-Code                               |
| 179  | `"Step 2: Enter this code"`                | `deviceAuth.step2`              | Step 2: Enter this code        | Schritt 2: Diesen Code eingeben      |
| 192  | `"Click to copy"` (title attr)             | `deviceAuth.action.clickToCopy` | Click to copy                  | Klicken zum Kopieren                  |
| 211  | `"Click to copy"` (text)                   | `deviceAuth.action.clickToCopy` | Click to copy                  | Klicken zum Kopieren                  |
| 234  | `"Waiting for authorization..."`           | `deviceAuth.status.waiting`     | Waiting for authorization...   | Warten auf Autorisierung...           |
| 258  | `"Login successful!"`                      | `deviceAuth.status.success`     | Login successful!              | Anmeldung erfolgreich!               |
| 276  | `"Login failed"` (fallback)                | `deviceAuth.status.failed`      | Login failed                   | Anmeldung fehlgeschlagen             |
| 279  | `"Retry"`                                  | `common.retry`                  | Retry                          | Erneut versuchen                      |
| 296  | `"Login cancelled"`                        | `deviceAuth.status.cancelled`   | Login cancelled                | Anmeldung abgebrochen                |
| 300  | `"Try Again"`                              | `deviceAuth.action.tryAgain`    | Try Again                      | Erneut versuchen                      |

## `webview-ui/src/components/ProfileView.tsx`

| Line | Hardcoded String              | Suggested Key              | EN                     | DE                        |
| ---- | ----------------------------- | -------------------------- | ---------------------- | ------------------------- |
| 55   | `"Profile"`                   | `profile.title`            | Profile                | Profil                    |
| 81   | `"Not logged in"`             | `profile.notLoggedIn`      | Not logged in          | Nicht angemeldet          |
| 84   | `"Login with Kilo Code"`      | `profile.action.login`     | Login with Kilo Code   | Mit Kilo Code anmelden    |
| 147  | `"Balance"`                   | `profile.balance.title`    | Balance                | Guthaben                  |
| 160  | `"Refresh balance"` (tooltip) | `profile.balance.refresh`  | Refresh balance        | Guthaben aktualisieren    |
| 162  | `"↻ Refresh"`                 | `common.refresh`           | Refresh                | Aktualisieren             |
| 172  | `"Dashboard"`                 | `profile.action.dashboard` | Dashboard              | Dashboard                 |
| 179  | `"Log Out"`                   | `profile.action.logout`    | Log Out                | Abmelden                  |

## `webview-ui/src/components/Settings.tsx`

| Line | Hardcoded String                  | Suggested Key                    | EN              | DE                  |
| ---- | --------------------------------- | -------------------------------- | --------------- | ------------------- |
| 54   | `"Configuration"` (section title) | `settings.section.configuration` | Configuration   | Konfiguration       |
| 61   | `"Agent Behaviour"` (tab trigger) | `settings.agentBehaviour.title`  | Agent Behaviour | Agentenverhalten    |
| 65   | `"Auto-Approve"` (tab trigger)    | `settings.autoApprove.title`     | Auto-Approve    | Automatisch genehmigen |
| 69   | `"Browser"` (tab trigger)         | `settings.browser.title`         | Browser         | Browser             |
| 73   | `"Checkpoints"` (tab trigger)     | `settings.checkpoints.title`     | Checkpoints     | Checkpoints         |
| 77   | `"Display"` (tab trigger)         | `settings.display.title`         | Display         | Anzeige             |
| 81   | `"Autocomplete"` (tab trigger)    | `settings.autocomplete.title`    | Autocomplete    | Autovervollständigung |
| 85   | `"Notifications"` (tab trigger)   | `settings.notifications.title`   | Notifications   | Benachrichtigungen  |
| 89   | `"Context"` (tab trigger)         | `settings.context.title`         | Context         | Kontext             |
| 93   | `"Terminal"` (tab trigger)        | `settings.terminal.title`        | Terminal        | Terminal            |
| 97   | `"Prompts"` (tab trigger)         | `settings.prompts.title`         | Prompts         | Prompts             |
| 101  | `"Experimental"` (tab trigger)    | `settings.experimental.title`    | Experimental    | Experimentell       |
| 105  | `"Language"` (tab trigger)        | `settings.language.title`        | Language        | Sprache             |
| 109  | `"About Kilo Code"` (tab trigger) | `settings.aboutKiloCode.title`   | About Kilo Code | Über Kilo Code      |
| 118  | `"Agent Behaviour"` (h3)          | `settings.agentBehaviour.title`  | Agent Behaviour | Agentenverhalten    |
| 122  | `"Auto-Approve"` (h3)             | `settings.autoApprove.title`     | Auto-Approve    | Automatisch genehmigen |
| 126  | `"Browser"` (h3)                  | `settings.browser.title`         | Browser         | Browser             |
| 130  | `"Checkpoints"` (h3)              | `settings.checkpoints.title`     | Checkpoints     | Checkpoints         |
| 134  | `"Display"` (h3)                  | `settings.display.title`         | Display         | Anzeige             |
| 138  | `"Autocomplete"` (h3)             | `settings.autocomplete.title`    | Autocomplete    | Autovervollständigung |
| 142  | `"Notifications"` (h3)            | `settings.notifications.title`   | Notifications   | Benachrichtigungen  |
| 146  | `"Context"` (h3)                  | `settings.context.title`         | Context         | Kontext             |
| 150  | `"Terminal"` (h3)                 | `settings.terminal.title`        | Terminal        | Terminal            |
| 154  | `"Prompts"` (h3)                  | `settings.prompts.title`         | Prompts         | Prompts             |
| 158  | `"Experimental"` (h3)             | `settings.experimental.title`    | Experimental    | Experimentell       |
| 162  | `"Language"` (h3)                 | `settings.language.title`        | Language        | Sprache             |
| 166  | `"About Kilo Code"` (h3)          | `settings.aboutKiloCode.title`   | About Kilo Code | Über Kilo Code      |

## `webview-ui/src/components/chat/MessageList.tsx`

| Line | Hardcoded String                                    | Suggested Key                     | EN                                                  | DE                                                          |
| ---- | --------------------------------------------------- | --------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 67   | `"Start a conversation by typing a message below."` | `session.messages.empty`          | Start a conversation by typing a message below.     | Starten Sie eine Unterhaltung, indem Sie unten eine Nachricht eingeben. |
| 74   | `"Scroll to bottom"` (aria-label)                   | `session.messages.scrollToBottom` | Scroll to bottom                                    | Nach unten scrollen                                         |

## `webview-ui/src/components/chat/ModelSelector.tsx`

| Line | Hardcoded String                  | Suggested Key              | EN           | DE                  |
| ---- | --------------------------------- | -------------------------- | ------------ | ------------------- |
| 162  | `"No providers"` (fallback label) | `dialog.model.noProviders` | No providers | Keine Anbieter      |

## `webview-ui/src/components/chat/PromptInput.tsx`

| Line | Hardcoded String                                  | Suggested Key                   | EN                                                | DE                                                        |
| ---- | ------------------------------------------------- | ------------------------------- | ------------------------------------------------- | --------------------------------------------------------- |
| 72   | `"Connecting to server..."` (placeholder)         | `prompt.placeholder.connecting` | Connecting to server...                           | Verbindung zum Server wird hergestellt...                  |
| 72   | `"Type a message..."` (placeholder)               | `prompt.placeholder.default`    | Type a message...                                 | Nachricht eingeben...                                     |
| 112  | `"Press Enter to send, Shift+Enter for new line"` | `prompt.hint.sendShortcut`      | Press Enter to send, Shift+Enter for new line     | Enter zum Senden, Shift+Enter für neue Zeile              |

## `webview-ui/src/components/chat/TaskHeader.tsx`

| Line | Hardcoded String           | Suggested Key               | EN           | DE              |
| ---- | -------------------------- | --------------------------- | ------------ | --------------- |
| 48   | `"Session cost"` (tooltip) | `context.usage.sessionCost` | Session cost | Sitzungskosten  |

## `webview-ui/src/components/history/SessionList.tsx`

| Line | Hardcoded String                                          | Suggested Key                | EN                                                        | DE                                                                    |
| ---- | --------------------------------------------------------- | ---------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| 19   | `"just now"`                                              | `time.justNow`               | just now                                                  | gerade eben                                                           |
| 24   | `"min ago"` (template: `${n} min ago`)                    | `time.minutesAgo`            | {{count}} min ago                                         | vor {{count}} Min.                                                    |
| 29   | `"h ago"` (template: `${n}h ago`)                         | `time.hoursAgo`              | {{count}}h ago                                            | vor {{count}} Std.                                                    |
| 34   | `"d ago"` (template: `${n}d ago`)                         | `time.daysAgo`               | {{count}}d ago                                            | vor {{count}} T.                                                      |
| 38   | `"mo ago"` (template: `${n}mo ago`)                       | `time.monthsAgo`             | {{count}}mo ago                                           | vor {{count}} Mon.                                                    |
| 70   | `"Search sessions..."` (placeholder)                      | `session.search.placeholder` | Search sessions...                                        | Sitzungen durchsuchen...                                              |
| 71   | `"No sessions yet. Click + to start a new conversation."` | `session.empty`              | No sessions yet. Click + to start a new conversation.     | Noch keine Sitzungen. Klicken Sie auf +, um eine neue Unterhaltung zu starten. |
| 75   | `"Untitled"` (fallback title)                             | `session.untitled`           | Untitled                                                  | Ohne Titel                                                            |

## `webview-ui/src/components/settings/AboutKiloCodeTab.tsx`

| Line | Hardcoded String        | Suggested Key                                | EN                  | DE                      |
| ---- | ----------------------- | -------------------------------------------- | ------------------- | ----------------------- |
| 26   | `"Connected"`           | `settings.aboutKiloCode.status.connected`    | Connected           | Verbunden               |
| 28   | `"Connecting..."`       | `settings.aboutKiloCode.status.connecting`   | Connecting...       | Verbindung wird hergestellt... |
| 30   | `"Disconnected"`        | `settings.aboutKiloCode.status.disconnected` | Disconnected        | Getrennt                |
| 32   | `"Error"`               | `settings.aboutKiloCode.status.error`        | Error               | Fehler                  |
| 56   | `"CLI Server"`          | `settings.aboutKiloCode.cliServer`           | CLI Server          | CLI-Server              |
| 74   | `"Status:"`             | `settings.aboutKiloCode.status.label`        | Status:             | Status:                 |
| 117  | `"Port:"`               | `settings.aboutKiloCode.port.label`          | Port:               | Port:                   |
| 148  | `"Version Information"` | `settings.aboutKiloCode.versionInfo`         | Version Information | Versionsinformationen   |
| 157  | `"Kilo Code Extension"` | `settings.aboutKiloCode.extensionName`       | Kilo Code Extension | Kilo Code Erweiterung   |

## `webview-ui/src/components/settings/AgentBehaviourTab.tsx`

| Line | Hardcoded String | Suggested Key                               | EN          | DE            |
| ---- | ---------------- | ------------------------------------------- | ----------- | ------------- |
| 11   | `"Modes"`        | `settings.agentBehaviour.subtab.modes`      | Modes       | Modi          |
| 12   | `"MCP Servers"`  | `settings.agentBehaviour.subtab.mcpServers` | MCP Servers | MCP-Server    |
| 13   | `"Rules"`        | `settings.agentBehaviour.subtab.rules`      | Rules       | Regeln        |
| 14   | `"Workflows"`    | `settings.agentBehaviour.subtab.workflows`  | Workflows   | Workflows     |
| 15   | `"Skills"`       | `settings.agentBehaviour.subtab.skills`     | Skills      | Fähigkeiten   |

## `webview-ui/src/components/settings/LanguageTab.tsx`

| Line | Hardcoded String                                                                         | Suggested Key                   | EN                                                                                       | DE                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 14   | `'Choose the language for the Kilo Code UI. "Auto" uses your VS Code display language.'` | `settings.language.description` | Choose the language for the Kilo Code UI. "Auto" uses your VS Code display language.     | Wählen Sie die Sprache für die Kilo Code Oberfläche. „Auto" verwendet die VS Code Anzeigesprache.     |
| 19   | `"Auto (VS Code language)"`                                                              | `settings.language.auto`        | Auto (VS Code language)                                                                  | Auto (VS Code Sprache)                                                                                |
| 30   | `"Current: "` (prefix)                                                                   | `settings.language.current`     | Current:                                                                                 | Aktuell:                                                                                              |

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
