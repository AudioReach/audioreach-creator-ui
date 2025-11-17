/**
 * Standard API response format returned by all backend endpoints
 */
export interface ApiResult<T = unknown> {
  /**
   * The actual data returned by the API
   */
  data?: T

  /**
   * Array of error messages if any occurred
   */
  errors?: string[]

  /**
   * A human-readable message describing the result
   */
  message: string

  /**
   * Whether the API call was successful
   */
  success: boolean

  /**
   * Array of warning messages that don't prevent operation but should be noted
   */
  warnings?: string[]
}

/**
 * Log levels supported by the backend logging system
 */
export enum LogLevel {
  VERBOSE = "verbose",
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
}

/**
 * Log request DTO matching backend UserLogRequestDto
 */
export interface UserLogRequestDto {
  action: string
  clientId: string
  component?: string
  error?: string
  logLevel: LogLevel
  msg: string
  projectId?: string
  tag?: string
  timestamp: Date
}

/**
 * Optional context that can be provided when logging
 */
export interface LogContext {
  action?: string
  component?: string
  error?: string
  projectId?: string
  tag?: string
}
