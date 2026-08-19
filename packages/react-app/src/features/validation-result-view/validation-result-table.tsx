/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {ExternalLink, Wand2} from 'lucide-react';

import {
  type Cell,
  type CellContext,
  createColumnHelper,
  getCoreRowModel,
  type Header,
  type HeaderGroup,
  type Row,
} from '@qualcomm-ui/core/table';
import {IconButton} from '@qualcomm-ui/react/button';
import {flexRender, Table, useReactTable} from '@qualcomm-ui/react/table';
import {Tooltip} from '@qualcomm-ui/react/tooltip';

import {useValidationResults} from '~features/graph-designer';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

import {filterValidationResults} from './lib/filter-validation-results';
import {getSeverityIcon} from './utils/severity-icons';

// React Table column helper for type-safe column definitions
const columnHelper = createColumnHelper<ValidationResult>();

/**
 * TextCell component renders text content with overflow handling and conditional
 * tooltip Handles text truncation and shows tooltip only when text overflows
 * Uses Qualcomm UI Tooltip component with ResizeObserver for dynamic detection
 */
function TextCell({
  className = '',
  isSelected,
  text,
}: {
  className?: string;
  isSelected: boolean;
  text: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);
  // Track whether text is truncated (cut off with ellipses)
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    const element = spanRef.current;
    if (element) {
      setIsOverflowing(element.scrollWidth > element.clientWidth);
    }
  }, []);

  useEffect(() => {
    const element = spanRef.current;
    if (!element) {
      return;
    }
    // ResizeObserver_API that watches for size changes
    // Callback Runs 'checkOverflow()' when element resizes
    const resizeObserver = new ResizeObserver(() => {
      checkOverflow();
    });
    // Watch the span element for size changes
    // Triggers callback when column is resized, text changes, etc.
    resizeObserver.observe(element);
    return () => {
      // Cleanup function Runs when component unmounts
      // Prevents memory leaks Stops observing
      resizeObserver.disconnect();
    };
  }, [checkOverflow]);

  return (
    <Tooltip
      disabled={!isOverflowing}
      positioning={{
        placement: 'bottom',
        strategy: 'fixed',
      }}
      trigger={
        <span
          ref={spanRef}
          className={`block overflow-hidden text-ellipsis whitespace-nowrap ${isSelected ? 'font-bold' : ''} ${className}`}
        >
          {text}
        </span>
      }
    >
      <div
        style={{
          maxWidth: '400px',
          whiteSpace: 'normal',
          wordWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </Tooltip>
  );
}

/**
 *ValidationResultTable component that renders a filterable, searchable table of
 *validation results
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
  } = useValidationResults();

  const filteredResults = useMemo(
    () =>
      filterValidationResults(
        validationResults,
        selectedSeverities,
        searchQuery,
      ),
    [validationResults, selectedSeverities, searchQuery],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor('severity', {
        cell: (info: CellContext<ValidationResult, string>) => (
          <div className="flex items-center justify-center">
            {getSeverityIcon(info.getValue())}
          </div>
        ),
        header: 'Severity',
        maxSize: 40,
        minSize: 30,
        size: 30,
      }),
      columnHelper.accessor('errorCode', {
        cell: (info: CellContext<ValidationResult, string | undefined>) => {
          const result = info.row.original;
          const isSelected = selectedRowId === result.id;
          return (
            <TextCell isSelected={isSelected} text={info.getValue() ?? ''} />
          );
        },
        header: 'Error Code',
        maxSize: 200,
        minSize: 80,
        size: 120,
      }),
      columnHelper.accessor('message', {
        cell: (info: CellContext<ValidationResult, string>) => {
          const result = info.row.original;
          const isSelected = selectedRowId === result.id;
          return <TextCell isSelected={isSelected} text={info.getValue()} />;
        },
        header: 'Message',
        maxSize: 500,
        minSize: 150,
        size: 300,
      }),
      columnHelper.accessor('errorDetails', {
        cell: (info: CellContext<ValidationResult, string | undefined>) => {
          const result = info.row.original;
          const isSelected = selectedRowId === result.id;
          return (
            <TextCell
              className="text-xs"
              isSelected={isSelected}
              text={info.getValue() ?? ''}
            />
          );
        },
        header: 'Error Details',
        maxSize: 500,
        minSize: 150,
        size: 380,
      }),
      columnHelper.accessor('canAutoFix', {
        cell: (info: CellContext<ValidationResult, boolean | undefined>) => (
          <div className="flex items-center justify-center">
            <IconButton
              aria-label="Auto fix"
              disabled={!info.getValue()}
              emphasis="neutral"
              icon={Wand2}
              size="sm"
              variant="ghost"
            />
          </div>
        ),
        header: 'Auto Fix',
        maxSize: 80,
        minSize: 50,
        size: 60,
      }),
      columnHelper.accessor('canShowControls', {
        cell: (info: CellContext<ValidationResult, boolean | undefined>) => (
          <div className="flex items-center justify-center">
            <IconButton
              aria-label="Show controls"
              disabled={!info.getValue()}
              emphasis="neutral"
              icon={ExternalLink}
              size="sm"
              variant="ghost"
            />
          </div>
        ),
        header: 'Show Controls',
        maxSize: 90,
        minSize: 50,
        size: 60,
      }),
    ],
    [selectedRowId],
  );

  // Initialize React Table with configuration
  const table = useReactTable({
    columnResizeMode: 'onChange', // Enable real-time column resizing
    columns,
    data: filteredResults,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Table.Root className="min-h-0 flex-1" size="sm">
        <Table.ScrollContainer className="h-full">
          <Table.Table
            className="text-[10px]"
            style={{minWidth: '100%', width: table.getCenterTotalSize()}}
          >
            {/* Table header */}
            <Table.Header>
              {table
                .getHeaderGroups()
                .map((headerGroup: HeaderGroup<ValidationResult>) => (
                  <Table.Row key={headerGroup.id} style={{height: '30px'}}>
                    {headerGroup.headers.map(
                      (
                        header: Header<ValidationResult, string>,
                        index: number,
                      ) => (
                        <Table.HeaderCell
                          key={header.id}
                          className={`relative select-none whitespace-nowrap ${index !== 0 ? 'border-neutral-03 border-l-2' : ''}`}
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
                const result = row.original;
                const isSelected = selectedRowId === result.id;

                return (
                  <Fragment key={row.id}>
                    {/* Main validation result row */}
                    <Table.Row
                      className="cursor-pointer"
                      isSelected={isSelected}
                      onClick={(e) => {
                        // Prevent browser default behaviors that cause blue flash
                        e.preventDefault();
                        e.stopPropagation();

                        // Toggle row selection
                        if (selectedRowId === result.id) {
                          clearRowSelection();
                        } else {
                          selectRow(result.id);
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevent text selection and focus behaviors
                      }}
                      style={{
                        borderBottom: 'none',
                        borderTop: 'none',
                        height: '40px',
                      }}
                    >
                      {row
                        .getVisibleCells()
                        .map((cell: Cell<ValidationResult, unknown>) => (
                          <Table.Cell
                            key={cell.id}
                            className="overflow-hidden"
                            style={{
                              borderBottom: 'none',
                              borderTop: 'none',
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
                );
              })}
            </Table.Body>
          </Table.Table>
        </Table.ScrollContainer>
      </Table.Root>
    </div>
  );
}
export default ValidationResultTable;
