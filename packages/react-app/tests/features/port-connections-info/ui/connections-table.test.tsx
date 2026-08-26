/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {ReactNode} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

import {Table, useReactTable} from '@qualcomm-ui/react/table';

import type {ConnectionRow} from '~features/port-connections-info/model/port-connections-info.types';
import {ConnectionsTable} from '~features/port-connections-info/ui/connections-table';

interface MockColumn {
  accessorKey: keyof ConnectionRow;
  cell: (info: {getValue: () => unknown}) => unknown;
  header: () => unknown;
}

// The global test-setup mock stubs getHeaderGroups/getRowModel to always be
// empty (see tests/test-setup.ts) — override per-file so cell/header
// renderers actually execute against real columns/data, matching the
// precedent in element-table.test.tsx. Table.Row's global mock also drops
// onClick/isSelected/className (only forwards children), so it's overridden
// here too.
function setupTableMock() {
  (useReactTable as jest.Mock).mockImplementation(
    ({columns, data}: {columns: MockColumn[]; data: ConnectionRow[]}) => ({
      getHeaderGroups: () => [
        {
          headers: columns.map((col) => ({
            column: {columnDef: col, id: col.accessorKey},
            getContext: () => ({}),
            id: col.accessorKey,
            isPlaceholder: false,
          })),
          id: 'header-group',
        },
      ],
      getRowModel: () => ({
        rows: data.map((row) => ({
          getVisibleCells: () =>
            columns.map((col) => ({
              column: {columnDef: col, id: col.accessorKey},
              getContext: () => ({getValue: () => row[col.accessorKey]}),
              id: `${row.systemId}_${col.accessorKey}`,
            })),
          id: row.systemId,
          original: row,
        })),
      }),
    }),
  );
  (Table.Row as unknown as jest.Mock).mockImplementation(
    ({
      children,
      className,
      isSelected,
      onClick,
    }: {
      children: ReactNode;
      className?: string;
      isSelected?: boolean;
      onClick?: () => void;
    }) => (
      <tr className={className} data-selected={isSelected} onClick={onClick}>
        {children}
      </tr>
    ),
  );
}

const rowA: ConnectionRow = {
  connectionType: 'MODULE_MODULE',
  isDangling: false,
  moduleId: '0x100',
  moduleName: 'ModuleA',
  otherModuleSystemId: 'mod-a',
  otherPortId: '0x10',
  subgraphSystemId: 'sg-sys-1',
  systemId: 'row-a',
  usecases: [],
};
const rowB: ConnectionRow = {
  connectionType: 'SUBSYSTEM_MODULE',
  isDangling: true,
  moduleId: '0x200',
  moduleName: 'ModuleB',
  otherModuleSystemId: 'mod-b',
  otherPortId: '0x20',
  subgraphSystemId: 'sg-sys-2',
  systemId: 'row-b',
  usecases: [],
};
const resolveSubgraphDisplayMock = jest.fn((id: string) => `SG-${id}`);

describe('ConnectionsTable', () => {
  beforeEach(() => {
    setupTableMock();
  });

  it('renders the always-visible columns for every row', () => {
    render(
      <ConnectionsTable
        onSelectRow={jest.fn()}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA, rowB]}
        selectedRowSystemId={undefined}
        showAdvancedDetails={false}
      />,
    );

    expect(screen.getByText(rowA.otherPortId)).toBeInTheDocument();
    expect(screen.getByText(rowA.moduleName)).toBeInTheDocument();
    expect(screen.getByText('Subgraph')).toBeInTheDocument();
    expect(screen.getByText(rowB.moduleName)).toBeInTheDocument();
    expect(screen.getByText('Dangling')).toBeInTheDocument();
    expect(screen.queryByText('Module Id')).not.toBeInTheDocument();
    expect(screen.queryByText('Subgraph Id')).not.toBeInTheDocument();
  });

  it('calls onSelectRow with the row systemId when a row is clicked', () => {
    const onSelectRow = jest.fn();
    render(
      <ConnectionsTable
        onSelectRow={onSelectRow}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA, rowB]}
        selectedRowSystemId={undefined}
        showAdvancedDetails={false}
      />,
    );

    fireEvent.click(screen.getByText(rowA.moduleName));
    expect(onSelectRow).toHaveBeenCalledWith('row-a');
  });

  it('highlights the row matching selectedRowSystemId', () => {
    render(
      <ConnectionsTable
        onSelectRow={jest.fn()}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA, rowB]}
        selectedRowSystemId="row-b"
        showAdvancedDetails={false}
      />,
    );

    const selectedRowEl = screen.getByText(rowB.moduleName).closest('tr');
    const otherRowEl = screen.getByText(rowA.moduleName).closest('tr');
    expect(selectedRowEl).toHaveAttribute('data-selected', 'true');
    expect(selectedRowEl).toHaveClass('bg-support-info-subtle');
    expect(otherRowEl).toHaveAttribute('data-selected', 'false');
    expect(otherRowEl).not.toHaveClass('bg-support-info-subtle');
  });

  it('highlights no row when selectedRowSystemId is undefined', () => {
    render(
      <ConnectionsTable
        onSelectRow={jest.fn()}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA, rowB]}
        selectedRowSystemId={undefined}
        showAdvancedDetails={false}
      />,
    );

    const rowAEl = screen.getByText(rowA.moduleName).closest('tr');
    const rowBEl = screen.getByText(rowB.moduleName).closest('tr');
    expect(rowAEl).toHaveAttribute('data-selected', 'false');
    expect(rowAEl).not.toHaveClass('bg-support-info-subtle');
    expect(rowBEl).toHaveAttribute('data-selected', 'false');
    expect(rowBEl).not.toHaveClass('bg-support-info-subtle');
  });

  it('hides Module Id and Subgraph Id columns when showAdvancedDetails is false', () => {
    render(
      <ConnectionsTable
        onSelectRow={jest.fn()}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA]}
        selectedRowSystemId={undefined}
        showAdvancedDetails={false}
      />,
    );
    expect(screen.queryByText('Module Id')).not.toBeInTheDocument();
    expect(screen.queryByText('Subgraph Id')).not.toBeInTheDocument();
    expect(screen.queryByText(rowA.moduleId)).not.toBeInTheDocument();
  });

  it('shows Module Id and resolved Subgraph Id when showAdvancedDetails is true', () => {
    render(
      <ConnectionsTable
        onSelectRow={jest.fn()}
        resolveSubgraphDisplay={resolveSubgraphDisplayMock}
        rows={[rowA]}
        selectedRowSystemId={undefined}
        showAdvancedDetails
      />,
    );
    expect(screen.getByText('Module Id')).toBeInTheDocument();
    expect(screen.getByText('Subgraph Id')).toBeInTheDocument();
    expect(screen.getByText(rowA.moduleId)).toBeInTheDocument();
    expect(resolveSubgraphDisplayMock).toHaveBeenCalledWith(
      rowA.subgraphSystemId,
    );
    expect(screen.getByText(`SG-${rowA.subgraphSystemId}`)).toBeInTheDocument();
  });
});
