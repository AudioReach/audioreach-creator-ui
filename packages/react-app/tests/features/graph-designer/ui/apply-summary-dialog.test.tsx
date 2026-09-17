/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Children, isValidElement} from 'react';

import {fireEvent, render, screen} from '@testing-library/react';

jest.mock('@qualcomm-ui/react/accordion', () => ({
  Accordion: {
    ItemContent: ({children}: any) => <div>{children}</div>,
    ItemIndicator: () => <span />,
    ItemRoot: ({children, value}: any) => (
      <div data-testid={`accordion-item-${value}`}>{children}</div>
    ),
    ItemSecondaryText: ({children}: any) => <span>{children}</span>,
    ItemText: ({children}: any) => <span>{children}</span>,
    ItemTrigger: ({children}: any) => <button type="button">{children}</button>,
    Root: ({children, defaultValue}: any) => (
      <div
        data-default-value={JSON.stringify(defaultValue)}
        data-testid="accordion-root"
      >
        {children}
      </div>
    ),
  },
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, onClick}: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({checked, label, onCheckedChange, readOnly}: any) => (
    <label>
      <input
        checked={checked ?? false}
        onChange={(e) => {
          if (!readOnly) {
            onCheckedChange(e.target.checked);
          }
        }}
        readOnly={readOnly}
        type="checkbox"
      />
      {label}
    </label>
  ),
}));

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: any) => <div>{children}</div>,
    Description: ({children}: any) => <p>{children}</p>,
    FloatingPortal: ({children}: any) => <div>{children}</div>,
    Footer: ({children}: any) => <div>{children}</div>,
    Heading: ({children}: any) => <h2>{children}</h2>,
    IndicatorIcon: () => <span />,
    Root: ({children, open}: any) => (open ? <div>{children}</div> : null),
  },
}));

jest.mock('@qualcomm-ui/react/icon', () => ({
  Icon: () => <span />,
}));

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: ({label, value}: {label: string; value: string}) => (
    <label>
      <input aria-label={label} readOnly type="radio" value={value} />
      {label}
    </label>
  ),
  RadioGroup: {
    Items: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Root: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (value: string) => void;
    }) => (
      <div>
        {Children.map(children, (section) => {
          if (!isValidElement(section)) {
            return section;
          }
          return Children.map(
            (section.props as {children: React.ReactNode}).children,
            (child) => {
              if (!isValidElement<{value: string}>(child)) {
                return child;
              }
              return (
                <button
                  data-testid={`nav-choice-${child.props.value}`}
                  onClick={() => onValueChange(child.props.value)}
                  type="button"
                >
                  {child}
                </button>
              );
            },
          );
        })}
      </div>
    ),
  },
}));

jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: {
    Arrow: ({children}: any) => <>{children}</>,
    ArrowTip: () => null,
    Content: ({children}: any) => <div>{children}</div>,
    Positioner: ({children}: any) => <div>{children}</div>,
    Root: ({children}: any) => <div>{children}</div>,
    Trigger: ({children}: any) => <>{children}</>,
  },
}));

import type {
  CreateUsecasesResponseDto,
  UsecaseChangeDetailsDto,
} from '~entities/edit-session';
import {ApplySummaryDialog} from '~features/graph-designer/ui/apply-summary-dialog';

const makeRow = (
  overrides: Partial<UsecaseChangeDetailsDto> & {alias?: string | null} = {},
): UsecaseChangeDetailsDto => ({
  after: {
    alias: overrides.alias ?? null,
    aliasId: null,
    categories: [],
    controlLinks: [],
    dataLinks: [],
    gkv: [],
    isEc: false,
    subgraphSystemIds: [],
  },
  before: null,
  changeId: 'change-1',
  operation: 'CREATE',
  source: 'MANUAL',
  systemId: 'sys-1',
  ...overrides,
});

const buildResponse = (
  overrides: Partial<CreateUsecasesResponseDto> = {},
): CreateUsecasesResponseDto => ({
  changes: [],
  groupId: 'group-1',
  issues: [],
  ...overrides,
});

const makeRows = (
  prefix: string,
  count: number,
  operation: UsecaseChangeDetailsDto['operation'],
): UsecaseChangeDetailsDto[] =>
  Array.from({length: count}, (_, index) =>
    makeRow({
      changeId: `${prefix}-${index}`,
      operation,
      systemId: `${prefix}-${index}`,
    }),
  );

describe('ApplySummaryDialog', () => {
  it('expands every category by default when total rows are at or below the threshold', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({
          changes: [
            ...makeRows('created', 8, 'CREATE'),
            ...makeRows('updated', 7, 'UPDATE'),
          ],
        })}
      />,
    );

    const root = screen.getByTestId('accordion-root');
    expect(JSON.parse(root.getAttribute('data-default-value') ?? '[]')).toEqual(
      ['created', 'updated'],
    );
  });

  it('expands only the first category by default when total rows exceed the threshold', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({
          changes: [
            ...makeRows('created', 10, 'CREATE'),
            ...makeRows('updated', 6, 'UPDATE'),
          ],
        })}
      />,
    );

    const root = screen.getByTestId('accordion-root');
    expect(JSON.parse(root.getAttribute('data-default-value') ?? '[]')).toEqual(
      ['created'],
    );
  });

  it('renders a flat layout with no accordion when only one category is non-empty', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({changes: makeRows('created', 20, 'CREATE')})}
      />,
    );

    expect(screen.queryByTestId('accordion-root')).not.toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders only non-empty sections', () => {
    const updatedRow = makeRow({
      alias: 'Updated Alias',
      changeId: 'updated-1',
      operation: 'UPDATE',
      systemId: 'sys-updated',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({changes: [updatedRow]})}
      />,
    );

    expect(screen.getByText('Updated')).toBeInTheDocument();
    expect(screen.getByText('Updated Alias')).toBeInTheDocument();
    expect(screen.queryByText('Created')).not.toBeInTheDocument();
    expect(screen.queryByText('Deleted')).not.toBeInTheDocument();
  });

  it('hides the radio group when there are no created rows', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({
          changes: [makeRow({changeId: 'updated-1', operation: 'UPDATE'})],
        })}
      />,
    );

    expect(
      screen.queryByText('Keep current selection'),
    ).not.toBeInTheDocument();
  });

  it('shows the radio group defaulted to keep when there are created rows', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({
          changes: [makeRow({changeId: 'created-1'})],
        })}
      />,
    );

    expect(screen.getByText('Keep current selection')).toBeInTheDocument();
    expect(
      screen.getByText('Add created usecases to selection'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Switch to created usecases only'),
    ).toBeInTheDocument();
  });

  it('hides the radio group once every created row is unchecked', () => {
    const createdRow = makeRow({
      alias: 'Created Alias',
      changeId: 'created-1',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({changes: [createdRow]})}
      />,
    );

    expect(screen.getByText('Keep current selection')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Created Alias'));

    expect(
      screen.queryByText('Keep current selection'),
    ).not.toBeInTheDocument();
  });

  it('makes deleted-row checkboxes read-only so they cannot be unchecked', () => {
    const onOK = jest.fn();
    const deletedRow = makeRow({
      alias: 'Deleted Alias',
      changeId: 'deleted-1',
      operation: 'DELETE',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={onOK}
        open
        response={buildResponse({changes: [deletedRow]})}
      />,
    );

    const checkbox = screen.getByLabelText('Deleted Alias');
    expect(checkbox).toHaveAttribute('readonly');
    expect(checkbox).not.toBeDisabled();

    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('OK'));

    expect(onOK).toHaveBeenCalledWith(['deleted-1'], 'keep');
  });

  it('invokes onOK with all change ids checked and the default nav choice', () => {
    const onOK = jest.fn();
    const createdRow = makeRow({changeId: 'created-1'});
    const updatedRow = makeRow({changeId: 'updated-1'});
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={onOK}
        open
        response={buildResponse({
          changes: [
            createdRow,
            {...updatedRow, operation: 'UPDATE'},
          ],
        })}
      />,
    );

    fireEvent.click(screen.getByText('OK'));

    expect(onOK).toHaveBeenCalledTimes(1);
    expect(onOK).toHaveBeenCalledWith(
      expect.arrayContaining(['created-1', 'updated-1']),
      'keep',
    );
    expect(onOK.mock.calls[0][0]).toHaveLength(2);
  });

  it('excludes unchecked rows and reports the chosen nav value', () => {
    const onOK = jest.fn();
    const createdRow = makeRow({
      alias: 'Created Alias',
      changeId: 'created-1',
    });
    const updatedRow = makeRow({
      alias: 'Updated Alias',
      changeId: 'updated-1',
      operation: 'UPDATE',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={onOK}
        open
        response={buildResponse({
          changes: [createdRow, updatedRow],
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText('Updated Alias'));
    fireEvent.click(screen.getByTestId('nav-choice-switch'));
    fireEvent.click(screen.getByText('OK'));

    expect(onOK).toHaveBeenCalledTimes(1);
    expect(onOK).toHaveBeenCalledWith(['created-1'], 'switch');
  });

  it('invokes onCancel and never onOK when Cancel is clicked', () => {
    const onCancel = jest.fn();
    const onOK = jest.fn();
    render(
      <ApplySummaryDialog
        onCancel={onCancel}
        onOK={onOK}
        open
        response={buildResponse({
          changes: [makeRow({changeId: 'created-1'})],
        })}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOK).not.toHaveBeenCalled();
  });
});
