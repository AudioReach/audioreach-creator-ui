import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  type Cell,
  type CellContext,
  createColumnHelper,
  getCoreRowModel,
  type Header,
  type HeaderGroup,
  type Row,
} from "@qualcomm-ui/core/table"
import {Button} from "@qualcomm-ui/react/button"
import {flexRender, Table, useReactTable} from "@qualcomm-ui/react/table"
import {Tooltip} from "@qualcomm-ui/react/tooltip"

import {getSeverityIcon} from "./utils/SeverityIcons"
import {useValidationResultStore} from "./validation-result-store"
import type {ValidationResult} from "./validation-result-types"

// React Table column helper for type-safe column definitions
const columnHelper = createColumnHelper<ValidationResult>()

/**
 * ActionButtonCell component renders action buttons (Auto Fix and Goto Error)
 * Handles conditional enabling based on result properties and callback availability
 */
function ActionButtonCell({
  result,
  type,
}: {
  result: ValidationResult
  type: "autoFix" | "gotoError"
}) {
  const handleClick = () => {
    if (type === "autoFix" && result.autoFixCallback && result.canAutoFix) {
      result.autoFixCallback(result)
    } else if (
      type === "gotoError" &&
      result.showControlsCallback &&
      result.canShowControls
    ) {
      result.showControlsCallback(result)
    }
  }
  // Decide if the button should be ENABLED or DISABLED
  const isEnabled =
    type === "autoFix"
      ? result.canAutoFix && !!result.autoFixCallback
      : result.canShowControls && !!result.showControlsCallback

  return (
    <Button
      density="compact"
      disabled={!isEnabled}
      onClick={handleClick}
      size="sm"
    >
      {type === "autoFix" ? "Auto Fix" : "Goto Error"}
    </Button>
  )
}

/**
 * TextCell component renders text content with overflow handling and conditional tooltip
 * Handles text truncation and shows tooltip only when text overflows
 * Uses Qualcomm UI Tooltip component with ResizeObserver for dynamic detection
 */
function TextCell({
  className = "",
  isSelected,
  text,
}: {
  className?: string
  isSelected: boolean
  text: string
}) {
  const spanRef = useRef<HTMLSpanElement>(null)
  // Track whether text is truncated (cut off with ellipses)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const checkOverflow = useCallback(() => {
    const element = spanRef.current
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth)
    }
  }, [])

  useEffect(() => {
    const element = spanRef.current
    if (!element) {
      return
    }
    // ResizeObserver_API that watches for size changes
    // Callback Runs 'checkOverflow()' when element resizes
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow()
    })
    // Watch the span element for size changes
    // Triggers callback when column is resized, text changes, etc.
    resizeObserver.observe(element)
    return () => {
      // Cleanup function Runs when component unmounts
      // Prevents memory leaks Stops observing
      resizeObserver.disconnect()
    }
  }, [checkOverflow])

  return (
    <Tooltip
      disabled={!isOverflowing}
      positioning={{
        placement: "bottom",
        strategy: "fixed",
      }}
      trigger={
        <span
          ref={spanRef}
          className={`block overflow-hidden text-ellipsis whitespace-nowrap ${isSelected ? "font-bold" : ""} ${className}`}
        >
          {text}
        </span>
      }
    >
      <div
        style={{
          maxWidth: "400px",
          whiteSpace: "normal",
          wordWrap: "break-word",
        }}
      >
        {text}
      </div>
    </Tooltip>
  )
}

/**
 *ValidationResultTable component that renders a filterable, searchable table of validation results
 * Features include:
 * - Severity-based filtering (critical, error, warning)
 * - Text search across description, error details, and error code
 * - Row selection
 * - action buttons
 * - Column resizing capabilities
 */
function ValidationResultTable() {
  const {
    clearRowSelection,
    searchQuery,
    selectedRowId,
    selectedSeverities,
    selectRow,
    validationResults,
  } = useValidationResultStore()

  // Memoized filtering logic to optimize performance
  // Filters validation results based on selected severities and search query
  const filteredResults = useMemo(() => {
    let filtered = validationResults

    // Apply severity filter (critical, error, warning, or all)
    if (selectedSeverities.length > 0) {
      filtered = filtered.filter((result) =>
        selectedSeverities.includes(result.severity),
      )
    } else {
      filtered = [] // Show no results if no severities selected
    }

    // Apply text search filter (searches description, error details, and error code)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (result) =>
          result.description.toLowerCase().includes(query) ||
          result.errorDetails.toLowerCase().includes(query) ||
          result.errorCode.toLowerCase().includes(query),
      )
    }
    return filtered
  }, [validationResults, selectedSeverities, searchQuery])

  // Column definitions for the validation result table
  // Memoized to prevent unnecessary re-renders when selectedRowId changes
  const columns = useMemo(
    () => [
      // Severity column - displays color-coded icons for validation severity
      columnHelper.accessor("severity", {
        cell: (info: CellContext<ValidationResult, string>) => (
          <div className="flex items-center justify-center">
            {getSeverityIcon(info.getValue())}
          </div>
        ),
        header: "Severity",
        maxSize: 40,
        minSize: 30,
        size: 30,
      }),
      // Error Code column
      columnHelper.accessor("errorCode", {
        cell: (info: CellContext<ValidationResult, string>) => {
          const result = info.row.original
          const isSelected = selectedRowId === result.id

          return (
            <TextCell
              className="font-mono text-xs"
              isSelected={isSelected}
              text={info.getValue()}
            />
          )
        },
        header: "Code",
        maxSize: 40,
        minSize: 30,
        size: 30,
      }),
      // Description column
      columnHelper.accessor("description", {
        cell: (info: CellContext<ValidationResult, string>) => {
          const result = info.row.original
          const isSelected = selectedRowId === result.id

          return <TextCell isSelected={isSelected} text={info.getValue()} />
        },
        header: "Description",
        maxSize: 500,
        minSize: 150,
        size: 300,
      }),
      // Error Details column
      columnHelper.accessor("errorDetails", {
        cell: (info: CellContext<ValidationResult, string>) => {
          const result = info.row.original
          const isSelected = selectedRowId === result.id

          return (
            <TextCell
              className="text-xs"
              isSelected={isSelected}
              text={info.getValue()}
            />
          )
        },
        header: "Error Details",
        maxSize: 500,
        minSize: 150,
        size: 380,
      }),
      // Auto Fix button column
      columnHelper.accessor("canAutoFix", {
        cell: (info: CellContext<ValidationResult, boolean | undefined>) => (
          <div className="flex items-center justify-center">
            <ActionButtonCell result={info.row.original} type="autoFix" />
          </div>
        ),
        header: "Auto Fix",
        maxSize: 80,
        minSize: 50,
        size: 60,
      }),
      // Show Controls button column
      columnHelper.accessor("canShowControls", {
        cell: (info: CellContext<ValidationResult, boolean | undefined>) => (
          <div className="flex items-center justify-center">
            <ActionButtonCell result={info.row.original} type="gotoError" />
          </div>
        ),
        header: "Show Controls",
        maxSize: 90,
        minSize: 50,
        size: 60,
      }),
    ],
    [selectedRowId],
  )

  // Initialize React Table with configuration
  const table = useReactTable({
    columnResizeMode: "onChange", // Enable real-time column resizing
    columns,
    data: filteredResults,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Table.Root className="min-h-0 flex-1" size="sm">
        <Table.ScrollContainer className="h-full">
          <Table.Table
            className="text-[10px]"
            style={{minWidth: "100%", width: table.getCenterTotalSize()}}
          >
            {/* Table header */}
            <Table.Header>
              {table
                .getHeaderGroups()
                .map((headerGroup: HeaderGroup<ValidationResult>) => (
                  <Table.Row key={headerGroup.id} style={{height: "30px"}}>
                    {headerGroup.headers.map(
                      (
                        header: Header<ValidationResult, string>,
                        index: number,
                      ) => (
                        <Table.HeaderCell
                          key={header.id}
                          className={`relative select-none whitespace-nowrap ${index !== 0 ? "border-neutral-09 border-l-2" : ""}`}
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

            {/* Table body with validation result entries */}
            <Table.Body>
              {table.getRowModel().rows.map((row: Row<ValidationResult>) => {
                const result = row.original
                const isSelected = selectedRowId === result.id

                return (
                  <Fragment key={row.id}>
                    {/* Main validation result row */}
                    <Table.Row
                      className="cursor-pointer"
                      isSelected={isSelected}
                      onClick={(e) => {
                        // Prevent browser default behaviors that cause blue flash
                        e.preventDefault()
                        e.stopPropagation()

                        // Toggle row selection
                        if (selectedRowId === result.id) {
                          clearRowSelection()
                        } else {
                          selectRow(result.id)
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault() // Prevent text selection and focus behaviors
                      }}
                      style={{
                        borderBottom: "none",
                        borderTop: "none",
                        height: "40px",
                      }}
                    >
                      {row
                        .getVisibleCells()
                        .map((cell: Cell<ValidationResult, unknown>) => (
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
                  </Fragment>
                )
              })}
            </Table.Body>
          </Table.Table>
        </Table.ScrollContainer>
      </Table.Root>
    </div>
  )
}
export default ValidationResultTable
