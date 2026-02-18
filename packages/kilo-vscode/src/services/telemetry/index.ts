// kilocode_change - new file

export { TelemetryEventName, type TelemetryPropertiesProvider, type TelemetrySetting } from "./types"
export {
  ApiProviderError,
  isApiProviderError,
  getApiProviderErrorProperties,
  ConsecutiveMistakeError,
  isConsecutiveMistakeError,
  getConsecutiveMistakeErrorProperties,
  type ConsecutiveMistakeReason,
} from "./errors"
export { TelemetryProxy } from "./telemetry-proxy"
