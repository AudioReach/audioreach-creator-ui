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
  Checkbox: ({checked, label, onCheckedChange}: any) => (
    <label>
      <input
        checked={checked ?? false}
        onChange={(e) => onCheckedChange(e.target.checked)}
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

import type {CreateUsecasesResponseDto} from '~entities/edit-session';
import {ApplySummaryDialog} from '~features/graph-designer/ui/apply-summary-dialog';

const makeRow = (
  overrides: Partial<CreateUsecasesResponseDto['created'][number]> = {},
): CreateUsecasesResponseDto['created'][number] => ({
  changeId: 'change-1',
  keyValueCollection: [],
  systemId: 'sys-1',
  usecaseType: 'Regular',
  ...overrides,
});

const buildResponse = (
  overrides: Partial<CreateUsecasesResponseDto> = {},
): CreateUsecasesResponseDto => ({
  created: [],
  deleted: [],
  issues: [],
  updated: [],
  ...overrides,
});

const makeRows = (
  prefix: string,
  count: number,
): CreateUsecasesResponseDto['created'] =>
  Array.from({length: count}, (_, index) =>
    makeRow({changeId: `${prefix}-${index}`, systemId: `${prefix}-${index}`}),
  );

describe('ApplySummaryDialog', () => {
  it('expands every category by default when total rows are at or below the threshold', () => {
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({
          created: makeRows('created', 8),
          updated: makeRows('updated', 7),
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
          created: makeRows('created', 10),
          updated: makeRows('updated', 6),
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
        response={buildResponse({created: makeRows('created', 20)})}
      />,
    );

    expect(screen.queryByTestId('accordion-root')).not.toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('renders only non-empty sections', () => {
    const updatedRow = makeRow({
      changeId: 'updated-1',
      systemId: 'sys-updated',
      usecaseAliasName: 'Updated Alias',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={jest.fn()}
        open
        response={buildResponse({updated: [updatedRow]})}
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
          updated: [makeRow({changeId: 'updated-1'})],
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
          created: [makeRow({changeId: 'created-1'})],
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
          created: [createdRow],
          updated: [updatedRow],
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
      changeId: 'created-1',
      usecaseAliasName: 'Created Alias',
    });
    const updatedRow = makeRow({
      changeId: 'updated-1',
      usecaseAliasName: 'Updated Alias',
    });
    render(
      <ApplySummaryDialog
        onCancel={jest.fn()}
        onOK={onOK}
        open
        response={buildResponse({
          created: [createdRow],
          updated: [updatedRow],
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
          created: [makeRow({changeId: 'created-1'})],
        })}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onOK).not.toHaveBeenCalled();
  });
});
