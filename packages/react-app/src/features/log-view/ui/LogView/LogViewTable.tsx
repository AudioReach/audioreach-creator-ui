import {Fragment, useEffect, useMemo, useRef, useState} from "react"

import {
  type Cell,
  type CellContext,
  createColumnHelper,
  getCoreRowModel,
  type Header,
  type HeaderGroup,
  type Row,
} from "@qualcomm-ui/core/table"
import {Icon} from "@qualcomm-ui/react/icon"
import {flexRender, Table, useReactTable} from "@qualcomm-ui/react/table"
import {Info, MessageSquareText, TriangleAlert, X} from "lucide-react"

import {type LogEntry, LogType} from "./LogView.interface"
import {useLogViewStore} from "./LogView.store"

// React Table column helper for type-safe column definitions
const columnHelper = createColumnHelper<LogEntry>()

// Returns appropriate colored icon based on log severity level
const getLogIcon = (logType: LogType) => {
  switch (logType) {
    case LogType.INFO:
      return (
        <Icon
          icon={Info}
          size="xs"
          style={{color: "var(--color-icon-support-info)"}}
        />
      )
    case LogType.WARNING:
      return (
        <Icon
          icon={TriangleAlert}
          size="xs"
          style={{color: "var(--color-icon-support-warning)"}}
        />
      )
    case LogType.ERROR:
      return (
        <Icon
          icon={X}
          size="xs"
          style={{color: "var(--color-icon-support-danger)"}}
        />
      )
    default:
      return (
        <Icon
          icon={Info}
          size="xs"
          style={{color: "var(--color-icon-neutral-secondary)"}}
        />
      )
  }
}

// Renders message cell with expansion icon and overflow tooltip
function MessageCell({logEntry}: {logEntry: LogEntry}) {
  const {selectedRowLogId, selectRowLog, toggleLogExpansion} = useLogViewStore()
  const isSelected = selectedRowLogId === logEntry.id
  const isExpanded = logEntry.logMessageExpanded || false
  const spanRef = useRef<HTMLSpanElement>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  useEffect(() => {
    const element = spanRef.current
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth)
    }
  }, [logEntry.message])

  return (
    <div className="flex w-full max-w-full items-center gap-1">
      <div className="h-3 w-3 flex-shrink-0">
        {logEntry.detailedMessage && (
          <Icon
            icon={MessageSquareText}
            onMouseDown={(e: React.MouseEvent) => {
              e.preventDefault()
              selectRowLog(logEntry.id)
              toggleLogExpansion(logEntry.id)
            }}
            size={12}
            style={{
              color: isExpanded
                ? "var(--color-icon-brand-primary)"
                : "var(--color-icon-neutral-secondary)",
            }}
          />
        )}
      </div>
      <span
        ref={spanRef}
        className={`block min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap ${isSelected ? "font-bold" : ""}`}
        title={isOverflowing ? logEntry.message : undefined}
      >
        {logEntry.message}
      </span>
    </div>
  )
}

// Main table component that displays filtered log entries with selection and expansion
function LogViewTable() {
  const {
    clearLogRowSelection,
    logs,
    searchLogQuery,
    selectedLogTypes,
    selectedRowLogId,
    selectRowLog,
  } = useLogViewStore()

  const filteredLogs = useMemo(() => {
    let filtered = logs

    // Filter by log types - if no types selected, show no logs
    if (selectedLogTypes.length > 0) {
      filtered = filtered.filter((log) =>
        selectedLogTypes.includes(log.logType),
      )
    } else {
      // If no types selected, show no logs
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

  const columns = useMemo(
    () => [
      columnHelper.accessor("logType", {
        cell: (info: CellContext<LogEntry, string>) => (
          <div className="flex items-center justify-center">
            {getLogIcon(info.getValue() as LogType)}
          </div>
        ),
        header: "Type",
        minSize: 30,
        size: 30,
      }),
      // Timestamp column - shows formatted time with 24-hour format
      columnHelper.accessor("timestamp", {
        cell: (info: CellContext<LogEntry, Date | undefined>) => {
          const logEntry = info.row.original
          const timestamp = info.getValue()
          const isSelected = selectedRowLogId === logEntry.id
          // Format timestamp to HH:MM:SS.mmm format - timestamp is always present now
          const date = new Date(timestamp!)
          const timeString = `${date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            hour12: false, // 24-hour format
            minute: "2-digit",
            second: "2-digit",
          })}.${date.getMilliseconds().toString().padStart(3, "0")}`
          // Apply bold styling when row is selected
          return (
            <span className={isSelected ? "font-bold" : ""}>{timeString}</span>
          )
        },
        header: "Timestamp",
        minSize: 60,
        size: 60,
      }),
      // Message column - displays log message with expand/collapse functionality
      columnHelper.accessor("message", {
        cell: (info: CellContext<LogEntry, string>) => (
          <MessageCell logEntry={info.row.original} />
        ),
        header: "Message",
        minSize: 150,
        size: 1150,
      }),
    ],
    [selectedRowLogId],
  )

  const table = useReactTable({
    columnResizeMode: "onChange", // Enable real-time column resizing
    columns,
    data: filteredLogs,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Table.Root size="sm">
      <Table.ScrollContainer>
        <Table.Table className="text-[10px]">
          <Table.Header>
            {table
              .getHeaderGroups()
              .map((headerGroup: HeaderGroup<LogEntry>) => (
                <Table.Row key={headerGroup.id}>
                  {headerGroup.headers.map(
                    (header: Header<LogEntry, string>, index: number) => (
                      <Table.HeaderCell
                        key={header.id}
                        className={`relative select-none ${index !== 0 ? "border-neutral-09 border-l-2" : ""}`}
                        style={{width: header.getSize()}}
                      >
                        <div className="inline-flex w-full items-center justify-between gap-2">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {header.column.getCanResize() && (
                            <Table.ColumnResizeHandle header={header} />
                          )}
                        </div>
                      </Table.HeaderCell>
                    ),
                  )}
                </Table.Row>
              ))}
          </Table.Header>
          <Table.Body>
            {table.getRowModel().rows.map((row: Row<LogEntry>) => {
              const logEntry = row.original
              const isSelected = selectedRowLogId === logEntry.id
              const shouldShowDetails =
                logEntry.logMessageExpanded && logEntry.detailedMessage
              return (
                <Fragment key={row.id}>
                  <Table.Row
                    className="cursor-pointer"
                    isSelected={isSelected}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (selectedRowLogId === logEntry.id) {
                        clearLogRowSelection()
                      } else {
                        selectRowLog(logEntry.id)
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault()
                    }}
                    style={{
                      borderBottom: "none",
                      borderTop: "none",
                      height: "40px",
                    }}
                  >
                    {row
                      .getVisibleCells()
                      .map((cell: Cell<LogEntry, unknown>) => (
                        <Table.Cell
                          key={cell.id}
                          className="overflow-hidden"
                          style={{
                            borderBottom: "none",
                            borderTop: "none",
                            maxWidth: cell.column.getSize(),
                            width: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </Table.Cell>
                      ))}
                  </Table.Row>
                  {shouldShowDetails && (
                    <Table.Row>
                      <Table.Cell className="p-2" colSpan={3}>
                        <div className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                          {logEntry.detailedMessage}
                        </div>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Fragment>
              )
            })}
          </Table.Body>
        </Table.Table>
      </Table.ScrollContainer>
    </Table.Root>
  )
}

export default LogViewTable
