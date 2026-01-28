import {useMemo} from "react"

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
} from "lucide-react"

import {IconButton} from "@qualcomm-ui/react/button"
import {InlineIconButton} from "@qualcomm-ui/react/inline-icon-button"
import {Menu} from "@qualcomm-ui/react/menu"
import {TextInput} from "@qualcomm-ui/react/text-input"
import {Tooltip} from "@qualcomm-ui/react/tooltip"

import {logger} from "~shared/lib/logger"

import {useLogViewStore} from "./LogView-store"
import {ALL_TYPES, LogType} from "./LogView-types"

// function to get the appropriate icon for each log type
const getLogTypeIcon = (logType: LogType) => {
  switch (logType) {
    case LogType.INFO:
      return (
        <Info size={14} style={{color: "var(--color-icon-support-info)"}} />
      )
    case LogType.WARNING:
      return (
        <TriangleAlert
          size={14}
          style={{color: "var(--color-icon-support-warning)"}}
        />
      )
    case LogType.ERROR:
      return <X size={14} style={{color: "var(--color-icon-support-danger)"}} />
    default:
      return null
  }
}

const LogViewToolbar: React.FC = () => {
  // Extract necessary state and actions from the log view store
  const {
    clearLogs,
    logs,
    searchLogQuery,
    selectedLogTypes,
    selectedRowLogId,
    setSearchLogQuery,
    setSelectedLogTypes,
  } = useLogViewStore()

  // Calculate "All Types" checkbox state (checked, unchecked, or indeterminate)
  const allTypesState = useMemo(() => {
    // Creates array of the 3 individual log types (excludes `LogType.ALL`)
    const individualTypes = [LogType.INFO, LogType.WARNING, LogType.ERROR]
    // selectedLogTypes = current state (e.g., `["info", "error"]`)
    // filter() keeps only types that are in `selectedLogTypes`
    const selectedCount = individualTypes.filter((type) =>
      selectedLogTypes.includes(type),
    ).length

    if (selectedCount === 0) {
      return {checked: false, indeterminate: false} // None selected = show no logs = unchecked
    }
    if (selectedCount === individualTypes.length) {
      return {checked: true, indeterminate: false} // All selected = checked
    }
    return {checked: false, indeterminate: true} // Some selected = indeterminate
  }, [selectedLogTypes])

  // Handles multiple selection logic for log type filters
  const handleFilterToggle = (type: string) => {
    // Get fresh state from store
    const currentState = useLogViewStore.getState()
    const currentSelectedTypes = currentState.selectedLogTypes

    if (type === ALL_TYPES) {
      // Toggle "All Types"
      const individualTypes = [LogType.INFO, LogType.WARNING, LogType.ERROR]
      const allToggled = individualTypes.every((t) =>
        currentSelectedTypes.includes(t),
      )

      if (allToggled) {
        setSelectedLogTypes([]) // Clear all = show no logs
      } else {
        setSelectedLogTypes([...individualTypes]) // Select all individual types (create new array)
      }
      return
    }

    // Toggle individual type using fresh state
    if (currentSelectedTypes.includes(type)) {
      // Remove this type
      const newTypes = currentSelectedTypes.filter((t) => t !== type)
      setSelectedLogTypes(newTypes)
    } else {
      // Add this type
      const newTypes = [...currentSelectedTypes, type]
      setSelectedLogTypes(newTypes)
    }
  }

  const filteredLogs = useMemo(() => {
    let filtered = logs

    if (selectedLogTypes.length > 0) {
      filtered = filtered.filter((log) =>
        selectedLogTypes.includes(log.logType),
      )
    } else {
      filtered = []
    }

    if (searchLogQuery.trim()) {
      const query = searchLogQuery.toLowerCase()
      filtered = filtered.filter(
        (log) =>
          log.message.toLowerCase().includes(query) ||
          (log.detailedMessage &&
            log.detailedMessage.toLowerCase().includes(query)),
      )
    }

    return filtered
  }, [logs, selectedLogTypes, searchLogQuery])

  // Copies the currently selected log entry to clipboard with formatting
  const copySelectedLog = async () => {
    const selectedLog = filteredLogs.find((log) => log.id === selectedRowLogId)
    if (!selectedLog) {
      return
    }

    const logText = `[${selectedLog.logType.toUpperCase()}] ${selectedLog.timestamp?.toString() ?? new Date().toLocaleString()} - ${selectedLog.message}`
    const fullText = selectedLog.detailedMessage
      ? `${logText}\n${selectedLog.detailedMessage}`
      : logText

    try {
      await navigator.clipboard.writeText(fullText)
    } catch (error) {
      logger.error(`Failed to copy to clipboard: ${error}`)
    }
  }

  // Saves all filtered logs to clipboard with consistent formatting
  const saveAllFilteredLogs = async () => {
    if (filteredLogs.length === 0) {
      return
    }

    const logsText = filteredLogs
      .map((log) => {
        const timestamp =
          log.timestamp?.toString() ?? new Date().toLocaleString()
        const logLine = `[${log.logType.toUpperCase()}] ${timestamp} - ${log.message}`
        return log.detailedMessage
          ? `${logLine}\n${log.detailedMessage}\n`
          : `${logLine}\n`
      })
      .join("\n")

    try {
      await navigator.clipboard.writeText(logsText)
    } catch (error) {
      logger.error(`Failed to save logs to clipboard: ${error}`)
    }
  }

  return (
    <div className="flex items-center gap-1 bg-grey px-1">
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
                      <InlineIconButton
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
                  {[ALL_TYPES, ...Object.values(LogType)].map((type) => (
                    <Menu.CheckboxItem
                      key={type}
                      checked={
                        type === ALL_TYPES
                          ? allTypesState.checked
                          : selectedLogTypes.includes(type)
                      }
                      closeOnSelect={false}
                      onCheckedChange={() => handleFilterToggle(type)}
                      value={type}
                    >
                      {type === ALL_TYPES && allTypesState.indeterminate ? (
                        <div
                          className="mr-1.5 flex h-4 w-4 items-center justify-center rounded border-2"
                          style={{
                            backgroundColor:
                              "var(--color-background-brand-primary)",
                            borderColor:
                              "var(--color-background-brand-primary)",
                            color: "var(--color-text-neutral-inverse)",
                          }}
                        >
                          <Minus
                            size={10}
                            strokeWidth={4}
                            style={{
                              color: "var(--color-text-neutral-inverse)",
                              stroke: "var(--color-text-neutral-inverse)",
                            }}
                          />
                        </div>
                      ) : (
                        <Menu.CheckboxItemControl />
                      )}
                      <div className="flex items-center gap-0.5">
                        <span>{type === ALL_TYPES ? "All Types" : type}</span>
                        {type !== ALL_TYPES && getLogTypeIcon(type as LogType)}
                      </div>
                    </Menu.CheckboxItem>
                  ))}
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
              onClick={copySelectedLog}
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
            onClick={saveAllFilteredLogs}
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
  )
}

export default LogViewToolbar
