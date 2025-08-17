import { useState, useEffect, useRef } from "react"
import { vscode } from "@/utils/vscode"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useAppTranslation } from "@/i18n/TranslationContext"
// Using custom dropdown, no VSCode toolkit dropdown
import { ProfileDataResponsePayload, WebviewMessage, UserOrganizationWithApiKey } from "@roo/WebviewMessage"

export const OrganizationSelector = () => {
	const [organizations, setOrganizations] = useState<UserOrganizationWithApiKey[]>([])
	const { apiConfiguration, currentApiConfigName } = useExtensionState()
	// const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>(apiConfiguration?.kilocodeOrganizationId)
	const { t } = useAppTranslation()
	const [isOpen, setIsOpen] = useState(false)
	const selectedOrg = organizations.find((o) => o.id === apiConfiguration?.kilocodeOrganizationId)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false)
		}
		window.addEventListener("keydown", onKeyDown)

		const onMouseDown = (e: MouseEvent) => {
			if (!containerRef.current) return
			if (!containerRef.current.contains(e.target as Node)) {
				setIsOpen(false)
			}
		}

		window.addEventListener("mousedown", onMouseDown)

		return () => {
			window.removeEventListener("keydown", onKeyDown)
			window.removeEventListener("mousedown", onMouseDown)
		}
	}, [])

	useEffect(() => {
		if (!apiConfiguration?.kilocodeToken) return

		vscode.postMessage({
			type: "fetchProfileDataRequest",
		})
	}, [apiConfiguration?.kilocodeToken])

	useEffect(() => {
		const handleMessage = (event: MessageEvent<WebviewMessage>) => {
			const message = event.data
			if (message.type === "profileDataResponse") {
				const payload = message.payload as ProfileDataResponsePayload
				if (payload.success) {
					setOrganizations(payload.data?.organizations ?? [])
				} else {
					console.error("Error fetching profile organizations data:", payload.error)
					setOrganizations([])
				}
			} else if (message.type === "updateProfileData") {
				vscode.postMessage({
					type: "fetchProfileDataRequest",
				})
			}
		}

		window.addEventListener("message", handleMessage)

		return () => window.removeEventListener("message", handleMessage)
	}, [apiConfiguration?.kilocodeToken])

	const setSelectedOrganization = (organization: UserOrganizationWithApiKey | null) => {
		if (organization === null) {
			// Switch back to personal account - clear organization token
			vscode.postMessage({
				type: "upsertApiConfiguration",
				text: currentApiConfigName,
				apiConfiguration: {
					...apiConfiguration,
					kilocodeOrganizationId: undefined,
				},
			})
			vscode.postMessage({
				type: "fetchBalanceDataRequest",
				values: {
					apiKey: apiConfiguration?.kilocodeToken,
				},
			})
		} else {
			vscode.postMessage({
				type: "upsertApiConfiguration",
				text: currentApiConfigName,
				apiConfiguration: {
					...apiConfiguration,
					kilocodeOrganizationId: organization.id,
				},
			})
			vscode.postMessage({
				type: "fetchBalanceDataRequest",
			})
		}
	}

	if (!organizations.length) return null

	return (
		<div className="mb-6">
			<div className="relative" ref={containerRef}>
				<button
					type="button"
					onClick={() => setIsOpen((o) => !o)}
					aria-haspopup="listbox"
					aria-expanded={isOpen}
					title={
						selectedOrg
							? `${selectedOrg.name} – ${selectedOrg.role.toUpperCase()}`
							: t("kilocode:profile.personal")
					}
					className="w-full cursor-pointer border border-[var(--vscode-dropdown-border)] bg-[var(--vscode-dropdown-background)] text-[var(--vscode-dropdown-foreground)] rounded px-3 py-2 flex items-center justify-between gap-2 focus:outline-none focus:ring-1 focus:ring-[var(--vscode-focusBorder)]">
					<span className="truncate">{selectedOrg ? selectedOrg.name : t("kilocode:profile.personal")}</span>
					<span className="flex items-center gap-2 shrink-0">
						{selectedOrg && (
							<span className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
								{selectedOrg.role.toUpperCase()}
							</span>
						)}
						<svg
							className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true">
							<path
								fillRule="evenodd"
								d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z"
								clipRule="evenodd"
							/>
						</svg>
					</span>
				</button>

				{isOpen && (
					<div className="absolute z-20 mt-1 w-full max-h-60 overflow-auto rounded border border-[var(--vscode-dropdown-border)] bg-[var(--vscode-dropdown-background)] shadow">
						<div role="listbox" aria-label={t("kilocode:profile.organization")}>
							<button
								type="button"
								role="option"
								aria-selected={!selectedOrg || selectedOrg.id === "personal"}
								onClick={() => {
									setSelectedOrganization(null)
									setIsOpen(false)
								}}
								className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--vscode-list-hoverBackground)] text-[var(--vscode-foreground)]">
								<span className="truncate">{t("kilocode:profile.personal")}</span>
							</button>

							{organizations.map((org) => (
								<button
									key={org.id}
									type="button"
									role="option"
									aria-selected={selectedOrg?.id === org.id}
									onClick={() => {
										setSelectedOrganization(org)
										setIsOpen(false)
									}}
									className="flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left hover:bg-[var(--vscode-list-hoverBackground)] text-[var(--vscode-foreground)]">
									<span className="truncate">{org.name}</span>
									<span className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide bg-[var(--vscode-badge-background)] text-[var(--vscode-badge-foreground)]">
										{org.role.toUpperCase()}
									</span>
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
