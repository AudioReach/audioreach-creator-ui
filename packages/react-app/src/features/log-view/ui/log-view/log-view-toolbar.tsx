/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {
  Ban,
  Copy,
  Info,
  ListFilter,
  Minus,
  Save,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';

import {IconButton} from '@qualcomm-ui/react/button';
import {Menu} from '@qualcomm-ui/react/menu';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {logger} from '~shared/lib/logger';
import type {
  LogEntry,
  LogType,
} from '~shared/store/project-store-slices/logs-slice';

import {useLogView} from '../../hooks/use-log-view';

const ALL_TYPES = 'all';

const LOG_TYPE_LABEL: Record<LogType, string> = {
  debug: 'Debug',
  error: 'Error',
  info: 'Info',
  warn: 'Warning',
};

function formatLogEntry(log: LogEntry): string {
  const timestamp = new Date(log.timestamp).toLocaleString();
  const base = `[${LOG_TYPE_LABEL[log.type]}] ${timestamp} - ${log.message}`;
  return log.detail ? `${base}\n${log.detail}` : base;
}

// function to get the appropriate icon for each log type
const getLogTypeIcon = (logType: LogType) => {
  switch (logType) {
    case 'info':
      return <Info className="text-icon-support-info" size={14} />;
    case 'warn':
      return <TriangleAlert className="text-icon-support-warning" size={14} />;
    case 'error':
      return <X className="text-icon-support-danger" size={14} />;
    default:
      return null;
  }
};

const LogViewToolbar: React.FC<{filteredLogs: LogEntry[]}> = ({
  filteredLogs,
}) => {
  const {
    clearLogs,
    logs,
    searchLogQuery,
    selectedLogTypes,
    selectedRowLogId,
    setSearchLogQuery,
    setSelectedLogTypes,
  } = useLogView();

  // Calculate "All Types" checkbox state (checked, unchecked, or indeterminate)
  const allTypesState = useMemo(() => {
    // Creates array of the 3 individual log types
    const individualTypes: LogType[] = ['info', 'warn', 'error'];
    // selectedLogTypes = current state (e.g., `["info", "error"]`)
    // filter() keeps only types that are in `selectedLogTypes`
    const selectedCount = individualTypes.filter((type) =>
      selectedLogTypes.includes(type),
    ).length;

    if (selectedCount === 0) {
      return {checked: false, indeterminate: false}; // None selected = show no logs = unchecked
    }
    if (selectedCount === individualTypes.length) {
      return {checked: true, indeterminate: false}; // All selected = checked
    }
    return {checked: false, indeterminate: true}; // Some selected = indeterminate
  }, [selectedLogTypes]);

  // Handles multiple selection logic for log type filters
  const handleFilterToggle = (type: string) => {
    if (type === ALL_TYPES) {
      // Toggle "All Types"
      const individualTypes: LogType[] = ['info', 'warn', 'error'];
      const allToggled = individualTypes.every((t: LogType) =>
        selectedLogTypes.includes(t),
      );

      if (allToggled) {
        setSelectedLogTypes([]); // Clear all = show no logs
      } else {
        setSelectedLogTypes([...individualTypes]); // Select all individual types (create new array)
      }
      return;
    }

    // Toggle individual type
    if (selectedLogTypes.includes(type as LogType)) {
      // Remove this type
      const newTypes = selectedLogTypes.filter((t) => t !== type);
      setSelectedLogTypes(newTypes);
    } else {
      // Add this type
      const newTypes = [...selectedLogTypes, type as LogType];
      setSelectedLogTypes(newTypes);
    }
  };

  // Copies the currently selected log entry to clipboard with formatting
  const copySelectedLog = async () => {
    const selectedLog = filteredLogs.find((log) => log.id === selectedRowLogId);
    if (!selectedLog) {
      return;
    }

    const fullText = formatLogEntry(selectedLog);

    try {
      await navigator.clipboard.writeText(fullText);
    } catch (error) {
      logger.error(
        `Failed to copy to clipboard: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Saves all filtered logs to clipboard with consistent formatting
  const saveAllFilteredLogs = async () => {
    if (filteredLogs.length === 0) {
      return;
    }

    const logsText = filteredLogs
      .map((log) => `${formatLogEntry(log)}\n`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(logsText);
    } catch (error) {
      logger.error(
        `Failed to save logs to clipboard: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  return (
    <div className="bg-neutral-02 flex items-center gap-1 px-1">
      <div className="max-w-48">
        <TextInput.Root
          onValueChange={setSearchLogQuery}
          size="sm"
          startIcon={Search}
          value={searchLogQuery}
        >
          <TextInput.InputGroup>
            <TextInput.Input aria-label="Search logs" placeholder="Search" />
            <TextInput.ClearTrigger />

            <Menu.Root>
              <Tooltip
                trigger={
                  <span>
                    <Menu.Trigger>
                      <Menu.InlineIconButton
                        aria-label="Filter logs"
                        icon={ListFilter}
                        size="sm"
                      />
                    </Menu.Trigger>
                  </span>
                }
              >
                Filter logs
              </Tooltip>
              <Menu.Positioner>
                <Menu.Content>
                  {([ALL_TYPES, 'info', 'warn', 'error'] as const).map(
                    (type) => (
                      <Menu.CheckboxItem
                        key={type}
                        checked={
                          type === ALL_TYPES
                            ? allTypesState.checked
                            : selectedLogTypes.includes(type as LogType)
                        }
                        closeOnSelect={false}
                        onCheckedChange={() => handleFilterToggle(type)}
                        value={type}
                      >
                        {type === ALL_TYPES && allTypesState.indeterminate ? (
                          <div className="bg-brand-primary border-brand-primary text-neutral-inverse mr-1.5 flex h-4 w-4 items-center justify-center rounded border-2">
                            <Minus
                              className="text-neutral-inverse"
                              size={10}
                              strokeWidth={4}
                            />
                          </div>
                        ) : (
                          <Menu.CheckboxItemControl />
                        )}
                        <div className="flex items-center gap-0.5">
                          <span>
                            {type === ALL_TYPES
                              ? 'All Types'
                              : LOG_TYPE_LABEL[type]}
                          </span>
                          {type !== ALL_TYPES &&
                            getLogTypeIcon(type as LogType)}
                        </div>
                      </Menu.CheckboxItem>
                    ),
                  )}
                </Menu.Content>
              </Menu.Positioner>
            </Menu.Root>
          </TextInput.InputGroup>
        </TextInput.Root>
      </div>
      {/* Copy Selected Log Button - only visible when a log is selected */}
      {selectedRowLogId && (
        <Tooltip
          trigger={
            <IconButton
              aria-label="Copy selected log"
              emphasis="neutral"
              icon={Copy}
              onClick={() => void copySelectedLog()}
              size="sm"
              variant="ghost"
            />
          }
        >
          Copy selected log
        </Tooltip>
      )}

      <div className="flex-1" />
      {/* Save All/Filtered Logs Button */}
      <Tooltip
        trigger={
          <IconButton
            aria-label={
              searchLogQuery.trim() || selectedLogTypes.length > 0
                ? `Save ${filteredLogs.length} filtered logs`
                : `Save all ${filteredLogs.length} logs`
            }
            disabled={filteredLogs.length === 0}
            emphasis="neutral"
            icon={Save}
            onClick={() => void saveAllFilteredLogs()}
            size="sm"
            variant="ghost"
          />
        }
      >
        {searchLogQuery.trim() || selectedLogTypes.length > 0
          ? `Save ${filteredLogs.length} filtered logs`
          : `Save all ${filteredLogs.length} logs`}
      </Tooltip>
      {/* Clear All Logs Button */}
      <Tooltip
        trigger={
          <IconButton
            aria-label="Clear all logs"
            disabled={logs.length === 0} // Disabled when no logs exist
            emphasis="neutral"
            icon={Ban}
            onClick={clearLogs}
            size="sm"
            variant="ghost"
          />
        }
      >
        Clear all logs
      </Tooltip>
    </div>
  );
};

export default LogViewToolbar;
