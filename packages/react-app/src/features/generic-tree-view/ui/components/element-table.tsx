/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useCallback, useEffect, useMemo, useRef} from 'react';

import {createColumnHelper, getCoreRowModel} from '@qualcomm-ui/core/table';
import {flexRender, Table, useReactTable} from '@qualcomm-ui/react/table';
import {TextInput} from '@qualcomm-ui/react/text-input';

interface TableRowData {
  index: number;
  value: string;
}

const columnHelper = createColumnHelper<TableRowData>();

interface TableComponentProps {
  data: Array<{index: number; value: string}>;
  disabled?: boolean;
  onCellChange: (rowIndex: number, value: string) => void;
}

export function TableComponent({
  data,
  disabled,
  onCellChange,
}: TableComponentProps) {
  const tableData = useMemo(() => data, [data]);

  const onCellChangeRef = useRef(onCellChange);
  useEffect(() => {
    onCellChangeRef.current = onCellChange;
  }, [onCellChange]);

  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  useEffect(
    () => () => {
      for (const timer of debounceTimers.current.values()) {
        clearTimeout(timer);
      }
    },
    [],
  );

  const handleCellChange = useCallback((rowIndex: number, newValue: string) => {
    const existing = debounceTimers.current.get(rowIndex);
    if (existing) {
      clearTimeout(existing);
    }
    const timer = setTimeout(() => {
      onCellChangeRef.current(rowIndex, newValue);
      debounceTimers.current.delete(rowIndex);
    }, 100);
    debounceTimers.current.set(rowIndex, timer);
  }, []);

  const columns = useMemo(
    () => [
      columnHelper.accessor('index', {
        cell: (info) => info.getValue(),
        header: () => 'Index',
      }),
      columnHelper.accessor('value', {
        cell: (info) => (
          <div className="w-full">
            <TextInput
              aria-label={`element value row ${info.row.index}`}
              clearable={false}
              defaultValue={info.getValue()}
              disabled={disabled}
              onValueChange={(value) => handleCellChange(info.row.index, value)}
              size="sm"
            />
          </div>
        ),
        header: () => 'Element Value',
      }),
    ],
    [handleCellChange, disabled],
  );

  const table = useReactTable({
    columns,
    data: tableData,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex items-start gap-2">
      <div className="w-full">
        <Table.Root size="sm">
          <Table.ScrollContainer className="max-h-[250px] overflow-x-hidden">
            <Table.Table>
              <Table.Header>
                {table.getHeaderGroups().map((headerGroup) => (
                  <Table.Row key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <Table.HeaderCell
                        key={header.id}
                        style={{
                          width: header.column.id === 'index' ? '33%' : '67%',
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </Table.HeaderCell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Header>
              <Table.Body>
                {table.getRowModel().rows.map((row) => (
                  <Table.Row key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <Table.Cell
                        key={cell.id}
                        style={{
                          width: cell.column.id === 'index' ? '33%' : '67%',
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Table>
          </Table.ScrollContainer>
        </Table.Root>
      </div>
    </div>
  );
}
