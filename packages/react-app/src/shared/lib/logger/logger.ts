import {useProjectLayoutStore} from "~shared/store"

import {type LogContext, LogLevel} from "../../api/types"

/**
 * Main logger class providing convenient logging methods
 * Two-phase initialization:
 * - Phase 1: Console-only logging (before client registration)
 * - Phase 2: Full backend logging (after client registration with backend client ID)
 */
export class Logger {
  private static instance: Logger
  private backendEnabled: boolean = false
  private clientId: string | null = null

  private constructor() {
    // Logger starts in console-only mode
    // Backend logging will be enabled after setClientId() is called
  }

  static createInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * Log critical message (sent immediately)
   */
  critical(msg: string, context?: LogContext): void {
    this.log(LogLevel.CRITICAL, msg, context)
  }

  /**
   * Log debug message
   */
  debug(msg: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, msg, context)
  }

  /**
   * Log error message (sent immediately)
   */
  error(msg: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, msg, context)
  }

  /**
   * Get current project ID from application store
   */
  private getCurrentProjectId(): string | undefined {
    try {
      const state = useProjectLayoutStore.getState()
      const activeProjectGroup = state.getActiveProjectGroup()
      return activeProjectGroup?.id || undefined
    } catch (error) {
      // Store may not be initialized yet
      return undefined
    }
  }

  /**
   * Log info message
   */
  info(msg: string, context?: LogContext): void {
    this.log(LogLevel.INFO, msg, context)
  }

  /**
   * Check if backend logging is enabled
   */
  isBackendEnabled(): boolean {
    return this.backendEnabled
  }

  /**
   * Internal logging method
   * Fire-and-forget: sends log to backend without blocking
   * Only sends to backend if client ID is set (after registration)
   */
  private log(logLevel: LogLevel, msg: string, context?: LogContext): void {
    // Only send to backend if we have a client ID (after registration)
    if (this.backendEnabled && this.clientId) {
      // const logEntry: UserLogRequestDto = {
      //   action: context?.action || "unknown",
      //   clientId: this.clientId,
      //   component: context?.component,
      //   error: context?.error,
      //   logLevel,
      //   msg,
      //   projectId: context?.projectId || this.getCurrentProjectId(),
      //   tag: context?.tag,
      //   timestamp: new Date(),
      // }
      // The promise is intentionally not awaited to avoid blocking
      // loggingApi.sendLog(logEntry).catch(() => {
      // Silently handle errors - already logged in loggingApi
      // })
    } else {
      this.logToConsole(logLevel, msg, context)
    }
  }

  /**
   * Log to browser console
   */
  private logToConsole(
    logLevel: LogLevel,
    msg: string,
    context?: LogContext,
  ): void {
    const contextStr = context ? JSON.stringify(context, null, 2) : ""
    const logMessage = `[${logLevel.toUpperCase()}] ${msg}`

    switch (logLevel) {
      case LogLevel.VERBOSE:
      case LogLevel.DEBUG:
        console.debug(logMessage, contextStr)
        break
      case LogLevel.INFO:
        console.info(logMessage, contextStr)
        break
      case LogLevel.WARN:
        console.warn(logMessage, contextStr)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, contextStr)
        break
      default:
        console.log(logMessage, contextStr)
    }
  }

  /**
   * Set the client ID received from backend registration
   * This enables backend logging
   */
  setClientId(clientId: string): void {
    this.clientId = clientId
    this.backendEnabled = true
    this.info("Logger initialized with backend client ID", {
      action: "logger_initialized",
      component: "Logger",
    })
  }

  /**
   * Log verbose message (detailed debug info)
   */
  verbose(msg: string, context?: LogContext): void {
    this.log(LogLevel.VERBOSE, msg, context)
  }

  /**
   * Log warning message
   */
  warn(msg: string, context?: LogContext): void {
    this.log(LogLevel.WARN, msg, context)
  }
}
