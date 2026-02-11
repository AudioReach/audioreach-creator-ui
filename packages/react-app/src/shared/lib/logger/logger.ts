import {useProjectLayoutStore} from "~shared/store"

import {type LogContext, LogLevel} from "../../api/logging.types"

import {logEventEmitter} from "./logger-events"

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
    this.log(LogLevel.Critical, msg, context)
  }

  /**
   * Log debug message
   */
  debug(msg: string, context?: LogContext): void {
    this.log(LogLevel.Debug, msg, context)
  }

  /**
   * Log error message (sent immediately)
   */
  error(msg: string, context?: LogContext): void {
    this.log(LogLevel.Error, msg, context)
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
    this.log(LogLevel.Info, msg, context)
  }

  /**
   * Check if backend logging is enabled
   */
  isBackendEnabled(): boolean {
    return this.backendEnabled
  }

  /**
   * Emit log event for UI consumption (INFO/WARN/ERROR only)
   */
  private emitLogEvent(
    logLevel: LogLevel,
    msg: string,
    context?: LogContext,
  ): void {
    try {
      // Only emit events for visible log levels
      if (
        logLevel !== LogLevel.Info &&
        logLevel !== LogLevel.Warn &&
        logLevel !== LogLevel.Error &&
        logLevel !== LogLevel.Critical
      ) {
        // Skip non-visible levels (verbose/debug)
        return
      }

      // Get project ID from context or current active project
      const projectId = context?.projectId || this.getCurrentProjectId()

      // Emit log event with project context
      logEventEmitter.emit({
        context,
        level: logLevel,
        message: msg,
        projectId,
        timestamp: new Date(),
      })
    } catch {
      // Swallow errors to avoid impacting normal logging
    }
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

    // Always emit log event for UI consumption
    this.emitLogEvent(logLevel, msg, context)
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
      case LogLevel.Verbose:
      case LogLevel.Debug:
        console.debug(logMessage, contextStr)
        break
      case LogLevel.Info:
        console.info(logMessage, contextStr)
        break
      case LogLevel.Warn:
        console.warn(logMessage, contextStr)
        break
      case LogLevel.Error:
      case LogLevel.Critical:
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
    this.log(LogLevel.Verbose, msg, context)
  }

  /**
   * Log warning message
   */
  warn(msg: string, context?: LogContext): void {
    this.log(LogLevel.Warn, msg, context)
  }
}
