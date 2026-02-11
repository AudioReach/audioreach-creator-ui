import {Logger} from "./logger"

export const logger = Logger.createInstance()
// Re-export types for convenience
export {LogLevel} from "../../api/logging.types"
export type {LogContext} from "../../api/logging.types"
// Re-export event system for external use
export {
  logEventEmitter,
  type LogEvent,
  type LogEventListener,
} from "./logger-events"
