// kilocode_change - new file

/**
 * Generic API provider error for structured error tracking.
 */
export class ApiProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly modelId: string,
    public readonly operation: string,
    public readonly errorCode?: number,
  ) {
    super(message)
    this.name = "ApiProviderError"
  }
}

/**
 * Type guard for ApiProviderError.
 */
export function isApiProviderError(error: unknown): error is ApiProviderError {
  return (
    error instanceof Error &&
    error.name === "ApiProviderError" &&
    "provider" in error &&
    "modelId" in error &&
    "operation" in error
  )
}

/**
 * Extract telemetry properties from an ApiProviderError.
 */
export function getApiProviderErrorProperties(error: ApiProviderError): Record<string, unknown> {
  return {
    provider: error.provider,
    modelId: error.modelId,
    operation: error.operation,
    ...(error.errorCode !== undefined && { errorCode: error.errorCode }),
  }
}

/**
 * Reason why the consecutive mistake limit was reached.
 */
export type ConsecutiveMistakeReason = "no_tools_used" | "tool_repetition" | "unknown"

/**
 * Error for consecutive mistake scenarios (agent keeps failing).
 */
export class ConsecutiveMistakeError extends Error {
  constructor(
    message: string,
    public readonly taskId: string,
    public readonly consecutiveMistakeCount: number,
    public readonly consecutiveMistakeLimit: number,
    public readonly reason: ConsecutiveMistakeReason = "unknown",
    public readonly provider?: string,
    public readonly modelId?: string,
  ) {
    super(message)
    this.name = "ConsecutiveMistakeError"
  }
}

/**
 * Type guard for ConsecutiveMistakeError.
 */
export function isConsecutiveMistakeError(error: unknown): error is ConsecutiveMistakeError {
  return (
    error instanceof Error &&
    error.name === "ConsecutiveMistakeError" &&
    "taskId" in error &&
    "consecutiveMistakeCount" in error &&
    "consecutiveMistakeLimit" in error
  )
}

/**
 * Extract telemetry properties from a ConsecutiveMistakeError.
 */
export function getConsecutiveMistakeErrorProperties(error: ConsecutiveMistakeError): Record<string, unknown> {
  return {
    taskId: error.taskId,
    consecutiveMistakeCount: error.consecutiveMistakeCount,
    consecutiveMistakeLimit: error.consecutiveMistakeLimit,
    reason: error.reason,
    ...(error.provider !== undefined && { provider: error.provider }),
    ...(error.modelId !== undefined && { modelId: error.modelId }),
  }
}
