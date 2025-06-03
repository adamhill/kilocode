import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import { vscode } from "@/utils/vscode"

const RuleRow: React.FC<{
	rulePath: string
	enabled: boolean
	isGlobal: boolean
	ruleType: string
	toggleRule: (rulePath: string, enabled: boolean) => void
}> = ({ rulePath, enabled, isGlobal, toggleRule, ruleType }) => {
	// Check if the path type is Windows
	const win32Path = /^[a-zA-Z]:\\/.test(rulePath)
	// Get the filename from the path for display
	const displayName = rulePath.split(win32Path ? "\\" : "/").pop() || rulePath

	const getRuleTypeIcon = () => {
		switch (ruleType) {
			case "workflow":
				return (
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						style={{ verticalAlign: "middle" }}>
						<g fill="currentColor" stroke="currentColor" strokeWidth="1">
							<path d="M6 18L16 5L14 18H6z" fill="currentColor" />
							<line x1="14" y1="18" x2="16" y2="5" strokeWidth="1.5" />
							<path
								d="M4 19h12c0.5 0 1-0.3 1-1s-0.3-1-1-1H4c-0.5 0-1 0.3-1 1s0.3 1 1 1z"
								fill="currentColor"
							/>
							<line x1="14" y1="13" x2="16" y2="9" strokeWidth="1" />
						</g>
					</svg>
				)
			default:
				return null
		}
	}

	const handleEditClick = () => {
		vscode.postMessage({
			type: "openFile",
			text: rulePath,
		})
	}

	const handleDeleteClick = () => {
		vscode.postMessage({
			type: "deleteRuleFile",
			rulePath: rulePath,
			isGlobal: isGlobal,
			ruleType: ruleType || "kilocode",
		})
	}

	return (
		<div className="mb-2.5">
			<div
				className={`flex items-center p-2 rounded bg-[var(--vscode-textCodeBlock-background)] h-[18px] ${
					enabled ? "opacity-100" : "opacity-60"
				}`}>
				<span
					className="flex-1 overflow-hidden break-all whitespace-normal flex items-center mr-1"
					title={rulePath}>
					{getRuleTypeIcon() && <span className="mr-1.5">{getRuleTypeIcon()}</span>}
					<span className="ph-no-capture">{displayName}</span>
				</span>

				{/* Toggle Switch */}
				<div className="flex items-center ml-2 space-x-2">
					<div
						role="switch"
						aria-checked={enabled}
						tabIndex={0}
						className={`w-[20px] h-[10px] rounded-[5px] relative cursor-pointer transition-colors duration-200 flex items-center ${
							enabled
								? "bg-[var(--vscode-testing-iconPassed)] opacity-90"
								: "bg-[var(--vscode-titleBar-inactiveForeground)] opacity-50"
						}`}
						onClick={() => toggleRule(rulePath, !enabled)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()
								toggleRule(rulePath, !enabled)
							}
						}}>
						<div
							className={`w-[8px] h-[8px] bg-white border border-[#66666699] rounded-full absolute transition-all duration-200 ${
								enabled ? "left-[11px]" : "left-[1px]"
							}`}
						/>
					</div>
					<VSCodeButton
						appearance="icon"
						aria-label="Edit rule file"
						title="Edit rule file"
						onClick={handleEditClick}
						style={{ height: "20px" }}>
						<span className="codicon codicon-edit" style={{ fontSize: "14px" }} />
					</VSCodeButton>
					<VSCodeButton
						appearance="icon"
						aria-label="Delete rule file"
						title="Delete rule file"
						onClick={handleDeleteClick}
						style={{ height: "20px" }}>
						<span className="codicon codicon-trash" style={{ fontSize: "14px" }} />
					</VSCodeButton>
				</div>
			</div>
		</div>
	)
}

export default RuleRow
