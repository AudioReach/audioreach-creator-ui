import {create} from "zustand"
import {subscribeWithSelector} from "zustand/middleware"

import {LogLevel} from "~shared/api/types"
import {type LogEvent, logEventEmitter} from "~shared/lib/logger/logger-events"
import {useProjectLayoutStore} from "~shared/store"

import {LogType, type LogViewStore} from "./LogView-types"

/**
 * Create a new LogView store instance for a specific project
 */
function createLogViewStore() {
  return create<LogViewStore>()(
    subscribeWithSelector((set) => ({
      // Add new log entry to the logs array
      addLog: (logData) => {
        try {
          const newLogId = crypto.randomUUID() // Generate unique ID for new log
          set((state) => ({
            logs: [
              ...state.logs,
              {
                detailedMessage: logData.detailedMessage,
                id: newLogId,
                logMessageExpanded: false, // Default to collapsed
                logType: logData.logType,
                message: logData.message,
                timestamp: logData.timestamp || new Date(), // Always add timestamp
              },
            ],
            selectedRowLogId: newLogId, // Auto-select the new log
          }))
          return true
        } catch (error) {
          console.error(`Failed to add log: ${error}`)
          return false
        }
      },
      // Row selection actions
      clearLogRowSelection: () => {
        try {
          set({selectedRowLogId: null}) // Remove row highlighting
          return true
        } catch (error) {
          console.error(`Failed to clear log row selection: ${error}`)
          return false
        }
      },
      clearLogs: () => {
        try {
          set({
            logs: [], // Clear all logs
            searchLogQuery: "", // Clear search
            selectedLogTypes: [LogType.INFO, LogType.WARNING, LogType.ERROR], // Reset multi-select filter - all types selected by default
            selectedRowLogId: null, // Clear selection
          })
          return true
        } catch (error) {
          console.error(`Failed to clear logs: ${error}`)
          return false
        }
      },

      logs: [], // All log entries

      searchLogQuery: "", // Current search text

      selectedLogTypes: [LogType.INFO, LogType.WARNING, LogType.ERROR], // Multi-select type filters - all types selected by default

      selectedRowLogId: null, // Currently highlighted row

      selectRowLog: (logId) => {
        try {
          set({selectedRowLogId: logId}) // Set selected row for highlighting and copy
          return true
        } catch (error) {
          console.error(`Failed to select row log: ${error}`)
          return false
        }
      },

      setSearchLogQuery: (query) => {
        try {
          set((state) => ({
            logs: state.logs.map((log) => ({
              ...log,
              logMessageExpanded:
                query && log.detailedMessage
                  ? log.detailedMessage
                      .toLowerCase()
                      .includes(query.toLowerCase())
                  : false,
            })),
            searchLogQuery: query,
          }))
          return true
        } catch (error) {
          console.error(`Failed to set search log query: ${error}`)
          return false
        }
      },

      setSelectedLogTypes: (types) => {
        try {
          set({selectedLogTypes: types}) // Update multi-select type filters
          return true
        } catch (error) {
          console.error(`Failed to set selected log types: ${error}`)
          return false
        }
      },

      // expansion toggle
      toggleLogExpansion: (logId) => {
        try {
          set((state) => ({
            logs: state.logs.map((log) =>
              log.id === logId
                ? {...log, logMessageExpanded: !log.logMessageExpanded}
                : log,
            ),
          }))
          return true
        } catch (error) {
          console.error(`Failed to toggle log expansion: ${error}`)
          return false
        }
      },
    })),
  )
}

/**
 * Project-aware log store manager
 * Creates and manages separate log stores for each project
 */
class LogViewStoreManager {
  private stores = new Map<string, ReturnType<typeof createLogViewStore>>()
  private eventUnsubscribe: (() => void) | null = null

  constructor() {
    this.setupEventListener()
  }

  /**
   * Get or create a log store for a specific project
   */
  getStore(projectId: string): ReturnType<typeof createLogViewStore> {
    if (!this.stores.has(projectId)) {
      this.stores.set(projectId, createLogViewStore())
    }
    return this.stores.get(projectId)!
  }

  /**
   * Get the store for the currently active project
   */
  getCurrentProjectStore(): ReturnType<typeof createLogViewStore> | null {
    try {
      const state = useProjectLayoutStore.getState()
      const activeProjectGroup = state.getActiveProjectGroup()
      const projectId = activeProjectGroup?.id

      if (!projectId) {
        return null
      }

      return this.getStore(projectId)
    } catch (error) {
      console.error("Failed to get current project store:", error)
      return null
    }
  }

  /**
   * Clear logs for a specific project
   */
  clearProjectLogs(projectId: string): void {
    const store = this.stores.get(projectId)
    if (store) {
      store.getState().clearLogs()
    }
  }

  /**
   * Remove store for a project (cleanup when project is closed)
   */
  removeProjectStore(projectId: string): void {
    this.stores.delete(projectId)
  }

  /**
   * Setup event listener for log events from the logger
   */
  private setupEventListener(): void {
    this.eventUnsubscribe = logEventEmitter.subscribe((event: LogEvent) => {
      const projectId = event.projectId
      if (!projectId) {
        // If no project ID, add to current project store
        const currentStore = this.getCurrentProjectStore()
        if (currentStore) {
          this.addLogToStore(currentStore, event)
        }
        return
      }

      // Add to specific project store
      const store = this.getStore(projectId)
      this.addLogToStore(store, event)
    })
  }

  /**
   * Add a log event to a specific store
   */
  private addLogToStore(
    store: ReturnType<typeof createLogViewStore>,
    event: LogEvent,
  ): void {
    // Map LogLevel to LogType
    let logType: LogType
    switch (event.level) {
      case LogLevel.INFO:
        logType = LogType.INFO
        break
      case LogLevel.WARN:
        logType = LogType.WARNING
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        logType = LogType.ERROR
        break
      default:
        return // Skip other levels
    }

    const detailed = event.context
      ? JSON.stringify(event.context, null, 2)
      : undefined

    store.getState().addLog({
      detailedMessage: detailed,
      logType,
      message: event.message,
      timestamp: event.timestamp,
    })
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.eventUnsubscribe) {
      this.eventUnsubscribe()
      this.eventUnsubscribe = null
    }
    this.stores.clear()
  }
}

// Global instance
const logViewStoreManager = new LogViewStoreManager()

/**
 * Hook to get the LogView store for the current project
 */
export function useLogViewStore() {
  const currentStore = logViewStoreManager.getCurrentProjectStore()

  if (!currentStore) {
    // Fallback: create a temporary store if no project is active
    // This prevents crashes during app initialization
    return createLogViewStore()()
  }

  return currentStore()
}

export {logViewStoreManager}
