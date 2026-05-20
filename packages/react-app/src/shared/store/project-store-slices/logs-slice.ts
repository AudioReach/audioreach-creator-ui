/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {SliceStatus} from '../global-store.types';

// ── Types ──────────────────────────────────────────────────────────────────

export type LogType = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  isExpanded?: boolean;
  message: string;
  source?: string;
  timestamp: number;
  type: LogType;
}

export interface LogsSlice {
  addLog: (log: Omit<LogEntry, 'id'>) => void;
  clearLogRowSelection: () => void;
  clearLogs: () => void;
  logs: LogEntry[];
  logsStatus: SliceStatus;

  searchLogQuery: string;
  selectedLogTypes: LogType[];
  selectedRowLogId: string | null;
  selectRowLog: (logId: string) => void;
  setSearchLogQuery: (query: string) => void;
  setSelectedLogTypes: (types: LogType[]) => void;
  toggleLogExpansion: (logId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateLogId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Slice creator ──────────────────────────────────────────────────────────

export function createLogsSlice(
  set: (partial: Partial<LogsSlice>) => void,
  get: () => LogsSlice,
): LogsSlice {
  return {
    addLog: (log: Omit<LogEntry, 'id'>): void => {
      const newEntry: LogEntry = {
        ...log,
        id: generateLogId(),
      };

      logger.debug('Adding log entry', {
        action: 'add_log',
        component: 'LogsSlice',
      });

      set({
        logs: [...get().logs, newEntry],
        logsStatus: 'ready',
      });
    },
    clearLogRowSelection: (): void => {
      logger.debug('Clearing log row selection', {
        action: 'clear_log_row_selection',
        component: 'LogsSlice',
      });

      set({selectedRowLogId: null});
    },
    clearLogs: (): void => {
      logger.debug('Clearing all logs', {
        action: 'clear_logs',
        component: 'LogsSlice',
      });

      set({logs: [], selectedRowLogId: null});
    },
    logs: [],
    logsStatus: 'uninitialized',

    searchLogQuery: '',

    selectedLogTypes: [],

    selectedRowLogId: null,

    selectRowLog: (logId: string): void => {
      logger.debug('Selecting log row', {
        action: 'select_row_log',
        component: 'LogsSlice',
      });

      set({selectedRowLogId: logId});
    },

    setSearchLogQuery: (query: string): void => {
      logger.debug('Setting log search query', {
        action: 'set_search_log_query',
        component: 'LogsSlice',
      });

      set({searchLogQuery: query});
    },

    setSelectedLogTypes: (types: LogType[]): void => {
      logger.debug('Setting selected log types', {
        action: 'set_selected_log_types',
        component: 'LogsSlice',
      });

      set({selectedLogTypes: types});
    },

    toggleLogExpansion: (logId: string): void => {
      logger.debug('Toggling log expansion', {
        action: 'toggle_log_expansion',
        component: 'LogsSlice',
      });

      set({
        logs: get().logs.map((entry) =>
          entry.id === logId
            ? {...entry, isExpanded: !entry.isExpanded}
            : entry,
        ),
      });
    },
  };
}
