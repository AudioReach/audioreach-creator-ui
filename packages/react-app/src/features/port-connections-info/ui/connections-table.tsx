/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {createColumnHelper, getCoreRowModel} from '@qualcomm-ui/core/table';
import {flexRender, Table, useReactTable} from '@qualcomm-ui/react/table';

import type {ConnectionRow} from '../model/port-connections-info.types';

export interface ConnectionsTableProps {
  onSelectRow: (systemId: string) => void;
  resolveSubgraphDisplay: (subgraphSystemId: string) => string;
  rows: ConnectionRow[];
  selectedRowSystemId: string | undefined;
  showAdvancedDetails: boolean;
}

const columnHelper = createColumnHelper<ConnectionRow>();

export function ConnectionsTable({
  onSelectRow,
  resolveSubgraphDisplay,
  rows,
  selectedRowSystemId,
  showAdvancedDetails,
}: ConnectionsTableProps) {
  const columns = useMemo(() => {
    const alwaysVisible = [
      columnHelper.accessor('otherPortId', {
        cell: (info) => info.getValue(),
        header: () => 'Port Id',
      }),
      columnHelper.accessor('moduleName', {
        cell: (info) => info.getValue(),
        header: () => 'Module Name',
      }),
      columnHelper.accessor('isDangling', {
        cell: (info) => (info.getValue() ? 'Dangling' : 'Subgraph'),
        header: () => 'Connection Type',
      }),
    ];
    if (!showAdvancedDetails) {
      return alwaysVisible;
    }
    return [
      ...alwaysVisible,
      columnHelper.accessor('moduleId', {
        cell: (info) => info.getValue(),
        header: () => 'Module Id',
      }),
      columnHelper.accessor('subgraphSystemId', {
        cell: (info) => resolveSubgraphDisplay(info.getValue()) || '—',
        header: () => 'Subgraph Id',
      }),
    ];
  }, [resolveSubgraphDisplay, showAdvancedDetails]);

  const table = useReactTable({
    columns,
    data: rows,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.systemId,
  });

  return (
    <Table.Root size="sm">
      <Table.ScrollContainer>
        <Table.Table>
          <Table.Header>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Row key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <Table.HeaderCell key={header.id}>
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
            {table.getRowModel().rows.map((row) => {
              const isSelected = row.original.systemId === selectedRowSystemId;
              return (
                <Table.Row
                  key={row.id}
                  className={
                    isSelected
                      ? 'bg-support-info-subtle cursor-pointer'
                      : 'cursor-pointer'
                  }
                  isSelected={isSelected}
                  onClick={() => onSelectRow(row.original.systemId)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Table.Cell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </Table.Cell>
                  ))}
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Table>
      </Table.ScrollContainer>
    </Table.Root>
  );
}
