/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen} from '@testing-library/react';

import {useReactTable} from '@qualcomm-ui/react/table';

import {TableComponent} from '~features/generic-tree-view/ui/components/element-table';

function makeData(count: number) {
  return Array.from({length: count}, (_, i) => ({
    index: i,
    value: `0x${i.toString(16).padStart(8, '0')}`,
  }));
}

// Override the default stub (empty rows) so cell renderers actually execute.
function setupTableMock() {
  (useReactTable as jest.Mock).mockImplementation(({columns, data}) => ({
    getHeaderGroups: () => [],
    getRowModel: () => ({
      rows: (data as {index: number; value: string}[]).map((row, rowIdx) => ({
        getVisibleCells: () =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (columns as any[]).map((col) => ({
            column: {columnDef: col, id: col.accessorKey},
            getContext: () => ({
              getValue: () => row[col.accessorKey as 'index' | 'value'],
              row: {index: rowIdx},
            }),
            id: `r${rowIdx}_${col.accessorKey}`,
          })),
        id: `row${rowIdx}`,
      })),
    }),
  }));
}

describe('TableComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setupTableMock();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders one TextInput per row for the value column', () => {
    render(<TableComponent data={makeData(3)} onCellChange={jest.fn()} />);
    expect(screen.getAllByTestId('text-input')).toHaveLength(3);
  });

  it('debounces onCellChange: fires after 100ms, not before', () => {
    const onCellChange = jest.fn();
    render(<TableComponent data={makeData(1)} onCellChange={onCellChange} />);
    fireEvent.change(screen.getByTestId('text-input'), {
      target: {value: '0xFF'},
    });
    expect(onCellChange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(onCellChange).not.toHaveBeenCalled();
    jest.advanceTimersByTime(50);
    expect(onCellChange).toHaveBeenCalledWith(0, '0xFF');
  });

  it('replaces in-flight timer on rapid edits to the same row', () => {
    const onCellChange = jest.fn();
    render(<TableComponent data={makeData(1)} onCellChange={onCellChange} />);
    const input = screen.getByTestId('text-input');
    fireEvent.change(input, {target: {value: '0x01'}});
    jest.advanceTimersByTime(50);
    fireEvent.change(input, {target: {value: '0x02'}});
    jest.advanceTimersByTime(100);
    expect(onCellChange).toHaveBeenCalledTimes(1);
    expect(onCellChange).toHaveBeenCalledWith(0, '0x02');
  });

  it('passes disabled to every TextInput when disabled prop is set', () => {
    render(
      <TableComponent data={makeData(2)} disabled onCellChange={jest.fn()} />,
    );
    screen
      .getAllByTestId('text-input')
      .forEach((input) => expect(input).toBeDisabled());
  });

  it('cancels pending timers on unmount', () => {
    const onCellChange = jest.fn();
    const {unmount} = render(
      <TableComponent data={makeData(1)} onCellChange={onCellChange} />,
    );
    fireEvent.change(screen.getByTestId('text-input'), {
      target: {value: '0xAB'},
    });
    unmount();
    jest.advanceTimersByTime(200);
    expect(onCellChange).not.toHaveBeenCalled();
  });
});
