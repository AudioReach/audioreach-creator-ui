/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

export interface LogEntry {
  detailedMessage?: string
  id: string
  logMessageExpanded?: boolean
  logType: LogType.Info | LogType.Warning | LogType.Error
  message: string
  timestamp?: Date
}

export enum LogType {
  Info = "info",
  Warning = "warning",
  Error = "error",
}

// Constant for "All Types"
export const ALL_TYPES = "all"

export interface LogViewStore {
  // Add new log entry to the logs array
  addLog: (logData: {
    detailedMessage?: string
    logType: LogType.Info | LogType.Warning | LogType.Error
    message: string
    timestamp?: Date
  }) => boolean
  // Row selection action
  clearLogRowSelection: () => boolean
  clearLogs: () => boolean

  logs: LogEntry[]

  searchLogQuery: string

  selectedLogTypes: string[]

  selectedRowLogId: string | null
  selectRowLog: (logId: string) => boolean

  // Search and filter actions
  setSearchLogQuery: (query: string) => boolean
  setSelectedLogTypes: (types: string[]) => boolean

  // expansion toggle
  toggleLogExpansion: (logId: string) => boolean
}
