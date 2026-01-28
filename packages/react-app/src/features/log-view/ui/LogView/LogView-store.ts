import {create} from "zustand"

import {logger} from "~shared/lib/logger"

import {LogType, type LogViewStore} from "./LogView-types"

// Zustand store for log viewer state management
export const useLogViewStore = create<LogViewStore>((set) => ({
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
      logger.error(`Failed to add log: ${error}`)
      return false
    }
  },
  // Row selection actions
  clearLogRowSelection: () => {
    try {
      set({selectedRowLogId: null}) // Remove row highlighting
      return true
    } catch (error) {
      logger.error(`Failed to clear log row selection: ${error}`)
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
      logger.error(`Failed to clear logs: ${error}`)
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
      logger.error(`Failed to select row log: ${error}`)
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
              ? log.detailedMessage.toLowerCase().includes(query.toLowerCase())
              : false,
        })),
        searchLogQuery: query,
      }))
      return true
    } catch (error) {
      logger.error(`Failed to set search log query: ${error}`)
      return false
    }
  },

  setSelectedLogTypes: (types) => {
    try {
      set({selectedLogTypes: types}) // Update multi-select type filters
      return true
    } catch (error) {
      logger.error(`Failed to set selected log types: ${error}`)
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
      logger.error(`Failed to toggle log expansion: ${error}`)
      return false
    }
  },
}))
