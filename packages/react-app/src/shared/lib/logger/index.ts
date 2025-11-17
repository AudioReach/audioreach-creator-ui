import {Logger} from "./logger"

export const logger = Logger.createInstance()
// Re-export types for convenience
export {LogLevel} from "../../api/types"
export type {LogContext} from "../../api/types"
