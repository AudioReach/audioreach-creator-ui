/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {fireEvent, render, screen, waitFor} from '@testing-library/react';

import {applyProjectFix} from '~entities/project';
import {useValidationResults} from '~features/graph-designer';
import ValidationResultTable from '~features/validation-result-view/validation-result-table';
import type {ValidationResult} from '~shared/store/tab-store-slices/validation-result-slice';

const mockMapIssueToValidationResult = jest.fn((issue) => ({
  errorCode: issue.code,
  message: issue.message,
  severity: issue.severity === 'WARNING' ? 'warning' : 'error',
}));

jest.mock('~features/graph-designer', () => ({
  mapIssueToValidationResult: (issue: unknown) =>
    mockMapIssueToValidationResult(issue),
  useValidationResults: jest.fn(),
}));

jest.mock('~entities/project', () => ({
  applyProjectFix: jest.fn(),
}));

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  IconButton: ({
    'aria-label': ariaLabel,
    disabled,
    onClick,
  }: React.ComponentProps<'button'>) => (
    <button aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
      {ariaLabel}
    </button>
  ),
}));

jest.mock('@qualcomm-ui/react/table', () => ({
  flexRender: (renderer: unknown, context: unknown) =>
    typeof renderer === 'function'
      ? (renderer as (context: unknown) => React.ReactNode)(context)
      : renderer,
  Table: {
    Body: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Cell: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    ColumnResizeHandle: () => null,
    Header: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    HeaderCell: ({children}: {children: React.ReactNode}) => (
      <div>{children}</div>
    ),
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Row: ({
      children,
      onClick,
      onMouseDown,
    }: {
      children: React.ReactNode;
      onClick?: React.MouseEventHandler<HTMLDivElement>;
      onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
    }) => (
      <div onClick={onClick} onMouseDown={onMouseDown} role="row">
        {children}
      </div>
    ),
    ScrollContainer: ({children}: {children: React.ReactNode}) => (
      <div>{children}</div>
    ),
    Table: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  },
  useReactTable: ({
    columns,
    data,
  }: {
    columns: Array<{
      accessorKey?: keyof ValidationResult;
      cell?: (context: unknown) => React.ReactNode;
      header?: React.ReactNode;
      id?: string;
      size?: number;
    }>;
    data: ValidationResult[];
  }) => ({
    getCenterTotalSize: () => 500,
    getHeaderGroups: () => [
      {
        headers: columns.map((column, index) => ({
          column: {columnDef: column, getCanResize: () => false},
          getContext: () => ({}),
          getSize: () => column.size ?? 100,
          id: column.id ?? column.accessorKey ?? `header-${index}`,
        })),
        id: 'header-group',
      },
    ],
    getRowModel: () => ({
      rows: data.map((original) => ({
        getVisibleCells: () =>
          columns.map((column, index) => ({
            column: {
              columnDef: column,
              getSize: () => column.size ?? 100,
            },
            getContext: () => ({
              getValue: () =>
                column.accessorKey ? original[column.accessorKey] : undefined,
              row: {original},
            }),
            id: `${original.id}-${index}`,
          })),
        id: original.id,
        original,
      })),
    }),
  }),
}));

jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: ({trigger}: {trigger: React.ReactNode}) => <>{trigger}</>,
}));

jest.mock('~features/validation-result-view/fix-option-dialog', () => ({
  FixOptionDialog: ({
    onConfirm,
    open,
    result,
  }: {
    onConfirm: (
      option: NonNullable<ValidationResult['fixOptions']>[number],
    ) => void;
    open: boolean;
    result: ValidationResult;
  }) =>
    open ? (
      <button
        onClick={() => {
          const option = result.fixOptions?.[0];
          if (option) {
            onConfirm(option);
          }
        }}
        type="button"
      >
        Confirm
      </button>
    ) : null,
}));

const removeValidationResult = jest.fn();
const addValidationResult = jest.fn();

class MockResizeObserver {
  disconnect(): void {
    return undefined;
  }

  observe(): void {
    return undefined;
  }
}

function buildValidationRow(): ValidationResult {
  return {
    canAutoFix: true,
    errorCode: 'ARC-ROUTING-SAME-GKV-CHOICE-REQUIRED',
    fixOptions: [
      {
        commandPayload: {mode: 'KEEP_EXISTING'},
        commandType: 'ResolveSameGkvCollisionCommand',
        description: 'Keep existing usecase',
        id: 'collision-1-KEEP_EXISTING',
        requiredClientInputs: [],
      },
    ],
    id: 'row-1',
    message: 'Choose a routing option',
    severity: 'error',
  };
}

function renderTable(row = buildValidationRow()): void {
  (useValidationResults as jest.Mock).mockReturnValue({
    addValidationResult,
    clearRowSelection: jest.fn(),
    removeValidationResult,
    searchQuery: '',
    selectedRowId: null,
    selectedSeverities: ['critical', 'error', 'warning'],
    selectRow: jest.fn(),
    validationResults: [row],
  });

  render(<ValidationResultTable projectId="project-1" />);
}

describe('ValidationResultTable autofix', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = MockResizeObserver;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes the selected fix and removes the original row on success', async () => {
    (applyProjectFix as jest.Mock).mockResolvedValue({data: undefined});

    renderTable();

    fireEvent.click(screen.getByRole('button', {name: 'Auto fix'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => {
      expect(applyProjectFix).toHaveBeenCalledWith('project-1', {
        commandPayload: {mode: 'KEEP_EXISTING'},
        commandType: 'ResolveSameGkvCollisionCommand',
      });
    });
    expect(removeValidationResult).toHaveBeenCalledWith('row-1');
  });

  it('publishes returned non-blocking issues after removing the original row', async () => {
    const calls: string[] = [];
    removeValidationResult.mockImplementation(() => calls.push('remove'));
    addValidationResult.mockImplementation(() => calls.push('add'));
    (applyProjectFix as jest.Mock).mockResolvedValue({
      issues: [
        {
          code: 'ARC-WARN-001',
          message: 'Created a warning',
          severity: 'WARNING',
        },
      ],
    });

    renderTable();

    fireEvent.click(screen.getByRole('button', {name: 'Auto fix'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => {
      expect(removeValidationResult).toHaveBeenCalledWith('row-1');
    });
    expect(addValidationResult).toHaveBeenCalledWith({
      errorCode: 'ARC-WARN-001',
      message: 'Created a warning',
      severity: 'warning',
    });
    expect(calls).toEqual(['remove', 'add']);
  });

  it('keeps the original row when apply-fix returns blocking issues', async () => {
    (applyProjectFix as jest.Mock).mockResolvedValue({
      issues: [
        {
          code: 'ARC-ERR-001',
          message: 'Still blocked',
          severity: 'ERROR',
        },
      ],
    });

    renderTable();

    fireEvent.click(screen.getByRole('button', {name: 'Auto fix'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => {
      expect(addValidationResult).toHaveBeenCalledWith({
        errorCode: 'ARC-ERR-001',
        message: 'Still blocked',
        severity: 'error',
      });
    });
    expect(removeValidationResult).not.toHaveBeenCalled();
  });
});
