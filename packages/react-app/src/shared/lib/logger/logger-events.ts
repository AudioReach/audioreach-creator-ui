import type {LogContext, LogLevel} from "../../api/logging.types"

/**
 * Log event data structure for the event-driven logging system
 */
export interface LogEvent {
  context?: LogContext
  level: LogLevel
  message: string
  projectId?: string
  timestamp: Date
}

/**
 * Log event listener function type
 */
export type LogEventListener = (event: LogEvent) => void

/**
 * Project-aware log event emitter
 * Allows decoupled communication between logger and log consumers
 * while maintaining project context for proper log isolation
 */
export class LogEventEmitter {
  private listeners: LogEventListener[] = []

  /**
   * Subscribe to log events
   * @param listener Function to handle log events
   * @returns Unsubscribe function
   */
  subscribe(listener: LogEventListener): () => void {
    this.listeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Emit a log event to all subscribers
   * @param event Log event with project context
   */
  emit(event: LogEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        // Prevent listener errors from breaking the logging system
        console.error("Log event listener error:", error)
      }
    })
  }

  /**
   * Get the number of active listeners (useful for testing)
   */
  getListenerCount(): number {
    return this.listeners.length
  }
}

// Global log event emitter instance
export const logEventEmitter = new LogEventEmitter()
