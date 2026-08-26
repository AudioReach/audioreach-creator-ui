/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('@qualcomm-ui/react/dialog', () => ({
  Dialog: {
    Body: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    FloatingPortal: ({children}: {children: React.ReactNode}) => (
      <div>{children}</div>
    ),
    Footer: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Heading: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
    Root: ({children, open}: {children: React.ReactNode; open: boolean}) =>
      open ? <div>{children}</div> : null,
  },
}));

jest.mock('~features/port-connections-info/ui/connections-table', () => ({
  ConnectionsTable: (props: {
    onSelectRow: (systemId: string) => void;
    rows: {moduleName: string; systemId: string}[];
    selectedRowSystemId: string | undefined;
  }) => (
    <div data-testid="connections-table">
      {props.rows.map((row) => (
        <button
          key={row.systemId}
          aria-pressed={props.selectedRowSystemId === row.systemId}
          data-testid={`row-${row.systemId}`}
          onClick={() => props.onSelectRow(row.systemId)}
        >
          {row.moduleName}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('~features/port-connections-info/ui/usecase-checklist', () => ({
  UsecaseChecklist: (props: {
    checkedUsecases: {systemId: string}[];
    onChange: (checked: {systemId: string}[]) => void;
    usecases: {systemId: string}[];
  }) => (
    <div data-testid="usecase-checklist">
      {props.usecases.map((uc) => (
        <button
          key={uc.systemId}
          aria-pressed={props.checkedUsecases.some(
            (c) => c.systemId === uc.systemId,
          )}
          data-testid={`uc-${uc.systemId}`}
          onClick={() => {
            const isChecked = props.checkedUsecases.some(
              (c) => c.systemId === uc.systemId,
            );
            props.onChange(
              isChecked
                ? props.checkedUsecases.filter(
                    (c) => c.systemId !== uc.systemId,
                  )
                : [...props.checkedUsecases, uc],
            );
          }}
        >
          {uc.systemId}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('~features/port-connections-info/ui/connections-filter', () => ({
  ConnectionsFilter: (props: {
    onChange: (filter: string) => void;
    value: string;
  }) => (
    <select
      data-testid="connections-filter"
      onChange={(e) => props.onChange(e.target.value)}
      value={props.value}
    >
      <option value="all">All</option>
      <option value="sg">Subgraph</option>
      <option value="dangling">Dangling</option>
    </select>
  ),
}));

jest.mock('~features/port-connections-info/ui/advanced-details-toggle', () => ({
  AdvancedDetailsToggle: (props: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  }) => (
    <input
      checked={props.checked}
      data-testid="advanced-details-toggle"
      onChange={(e) => props.onChange(e.target.checked)}
      type="checkbox"
    />
  ),
}));

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type {UsecaseDto} from '~entities/usecases';
import type {ConnectionRow} from '~features/port-connections-info/model/port-connections-info.types';
import {PortConnectionsInfoPopup} from '~features/port-connections-info/ui/port-connections-info-popup';
import {showToast} from '~shared/controls/global-toaster';

function renderWithUser(node: React.ReactElement) {
  return {user: userEvent.setup(), ...render(node)};
}

const uc1 = {systemId: 'uc-1'} as UsecaseDto;
const uc2 = {systemId: 'uc-2'} as UsecaseDto;

const rowA: ConnectionRow = {
  connectionType: 'MODULE_MODULE',
  isDangling: false,
  moduleId: '0x01',
  moduleName: 'Row A',
  otherModuleSystemId: 'mod-a',
  otherPortId: '0x10',
  subgraphSystemId: 'sg-a',
  systemId: 'row-a',
  usecases: [uc1, uc2],
};
const rowB: ConnectionRow = {
  ...rowA,
  moduleName: 'Row B',
  otherModuleSystemId: 'mod-b',
  systemId: 'row-b',
  usecases: [uc1],
};
const rowSg: ConnectionRow = {...rowA, isDangling: false, systemId: 'row-sg'};
const rowDangling: ConnectionRow = {
  ...rowB,
  isDangling: true,
  systemId: 'row-dangling',
};

const baseProps = {
  isReadonly: true,
  onAdd: jest.fn(),
  onClose: jest.fn(),
  onNavigate: jest.fn(),
  open: true,
  resolveSubgraphDisplay: (id: string) => id,
};

describe('PortConnectionsInfoPopup — status branching', () => {
  it('renders a loading indicator while status is loading-modules', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          status: 'loading-modules',
        }}
      />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('connections-table')).not.toBeInTheDocument();
  });

  it('renders the inline error message and no table when status is error', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          message: 'Failed to load module info',
          portSystemId: 'port-1',
          status: 'error',
        }}
      />,
    );
    expect(screen.getByText('Failed to load module info')).toBeInTheDocument();
    expect(screen.queryByTestId('connections-table')).not.toBeInTheDocument();
  });

  it('renders the table and checklist when status is ready', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowA, rowB],
          status: 'ready',
        }}
      />,
    );
    expect(screen.getByTestId('connections-table')).toBeInTheDocument();
    expect(screen.getByTestId('usecase-checklist')).toBeInTheDocument();
  });
});

describe('PortConnectionsInfoPopup — row selection and checklist persistence (I6)', () => {
  it('shows an empty checklist until a row is selected, then persists checks across row switches', async () => {
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowA, rowB],
          status: 'ready',
        }}
      />,
    );
    expect(screen.queryByTestId('uc-uc-1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1'));
    expect(screen.getByTestId('uc-uc-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByTestId('row-row-b'));
    expect(screen.queryByTestId('uc-uc-2')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('row-row-a'));
    expect(screen.getByTestId('uc-uc-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('PortConnectionsInfoPopup — filter/search non-destructiveness (I2)', () => {
  it('narrows visible rows via the segmented filter without clearing selection', async () => {
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowSg, rowDangling],
          status: 'ready',
        }}
      />,
    );
    await user.click(screen.getByTestId('row-row-sg'));
    await user.click(screen.getByTestId('uc-uc-1'));

    await user.selectOptions(
      screen.getByTestId('connections-filter'),
      'dangling',
    );
    expect(screen.queryByTestId('row-row-sg')).not.toBeInTheDocument();
    expect(screen.getByTestId('row-row-dangling')).toBeInTheDocument();

    await user.selectOptions(screen.getByTestId('connections-filter'), 'all');
    expect(screen.getByTestId('row-row-sg')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('uc-uc-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('matches sg:/iid:/mod: prefixes and plain text regardless of Advanced details', async () => {
    // rowB's subgraphSystemId must differ from rowA's for the sg: search
    // to meaningfully distinguish them (rowB normally inherits rowA's via
    // spread — override it here only).
    const rowBDistinctSubgraph: ConnectionRow = {
      ...rowB,
      subgraphSystemId: 'sg-b',
    };
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        resolveSubgraphDisplay={(id) => (id === 'sg-a' ? 'SG_02' : id)}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowA, rowBDistinctSubgraph],
          status: 'ready',
        }}
      />,
    );
    const search = screen.getByTestId('text-input');

    await user.type(search, 'sg:sg_02');
    expect(screen.getByTestId('row-row-a')).toBeInTheDocument();
    expect(screen.queryByTestId('row-row-b')).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'iid:01');
    expect(screen.getByTestId('row-row-a')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'mod:row b');
    expect(screen.getByTestId('row-row-b')).toBeInTheDocument();
    expect(screen.queryByTestId('row-row-a')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('advanced-details-toggle'));
    expect(screen.getByTestId('row-row-b')).toBeInTheDocument();
    expect(screen.queryByTestId('row-row-a')).not.toBeInTheDocument();
  });

  it('toggling Advanced details never clears selection or checklist', async () => {
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowA, rowB],
          status: 'ready',
        }}
      />,
    );
    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1'));

    await user.click(screen.getByTestId('advanced-details-toggle'));
    expect(screen.getByTestId('row-row-a')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('uc-uc-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('PortConnectionsInfoPopup — reset on reopen', () => {
  it('clears selection, checklist, filter, search, and advanced details when reopened', async () => {
    const readyState = {
      componentSystemId: 'comp-1',
      portSystemId: 'port-1',
      rows: [rowA, rowB],
      status: 'ready' as const,
    };
    const {rerender, user} = renderWithUser(
      <PortConnectionsInfoPopup {...baseProps} state={readyState} />,
    );

    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1'));
    await user.type(screen.getByTestId('text-input'), 'mod:row a');
    await user.click(screen.getByTestId('advanced-details-toggle'));
    expect(screen.getByTestId('row-row-a')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Close, then reopen — a fresh open() for the same or a different port.
    rerender(
      <PortConnectionsInfoPopup
        {...baseProps}
        open={false}
        state={readyState}
      />,
    );
    rerender(
      <PortConnectionsInfoPopup {...baseProps} open state={readyState} />,
    );

    expect(screen.getByTestId('row-row-a')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByTestId('row-row-b')).toBeInTheDocument();
    expect(screen.queryByTestId('uc-uc-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('text-input')).toHaveValue('');
    expect(screen.getByTestId('advanced-details-toggle')).not.toBeChecked();
  });
});

describe('PortConnectionsInfoPopup — Add/Navigate/Cancel', () => {
  const readyState = {
    componentSystemId: 'comp-1',
    portSystemId: 'port-1',
    rows: [rowA, rowB],
    status: 'ready' as const,
  };

  it('Add calls onAdd with the deduped union across every row, then closes', async () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onAdd={onAdd}
        onClose={onClose}
        state={readyState}
      />,
    );
    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1')); // uc1 checked on row A
    await user.click(screen.getByTestId('row-row-b'));
    await user.click(screen.getByTestId('uc-uc-1')); // uc1 checked on row B too (dup)

    await user.click(screen.getByRole('button', {name: /add to selected/i}));
    expect(onAdd).toHaveBeenCalledWith([uc1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Add with nothing checked shows a warning toast and does not close', async () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onAdd={onAdd}
        onClose={onClose}
        state={readyState}
      />,
    );
    await user.click(screen.getByRole('button', {name: /add to selected/i}));
    expect(onAdd).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Select at least one usecase.',
      'warning',
    );
  });

  it('Navigate calls onNavigate with the deduped union, then closes', async () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onClose={onClose}
        onNavigate={onNavigate}
        state={readyState}
      />,
    );
    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1'));
    await user.click(screen.getByTestId('row-row-b'));
    await user.click(screen.getByTestId('uc-uc-1')); // uc1, distinct object, same systemId

    await user.click(
      screen.getByRole('button', {name: /navigate to selected/i}),
    );
    expect(onNavigate).toHaveBeenCalledWith([uc1]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Navigate with nothing checked shows a warning toast and does not close', async () => {
    const onNavigate = jest.fn();
    const onClose = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onClose={onClose}
        onNavigate={onNavigate}
        state={readyState}
      />,
    );
    await user.click(
      screen.getByRole('button', {name: /navigate to selected/i}),
    );
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Select at least one usecase.',
      'warning',
    );
  });

  it('Cancel calls only onClose, never onAdd/onNavigate, regardless of checked state', async () => {
    const onAdd = jest.fn();
    const onClose = jest.fn();
    const onNavigate = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onAdd={onAdd}
        onClose={onClose}
        onNavigate={onNavigate}
        state={readyState}
      />,
    );
    await user.click(screen.getByTestId('row-row-a'));
    await user.click(screen.getByTestId('uc-uc-1'));

    await user.click(screen.getByRole('button', {name: /cancel/i}));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAdd).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('shows Add and hides Navigate when ready and not readonly', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        isReadonly={false}
        state={readyState}
      />,
    );
    expect(
      screen.getByRole('button', {name: /add to selected/i}),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', {name: /navigate to selected/i}),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: /cancel/i})).toBeEnabled();
  });

  it('hides both Add and Navigate during the error state even when readonly (Cancel stays enabled)', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        isReadonly
        state={{
          componentSystemId: 'comp-1',
          message: 'Failed to load module info',
          portSystemId: 'port-1',
          status: 'error',
        }}
      />,
    );
    expect(
      screen.queryByRole('button', {name: /add to selected/i}),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: /navigate to selected/i}),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: /cancel/i})).toBeEnabled();
  });

  it('hides both Add and Navigate while loading modules, even when readonly (Cancel stays enabled)', () => {
    render(
      <PortConnectionsInfoPopup
        {...baseProps}
        isReadonly
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          status: 'loading-modules',
        }}
      />,
    );
    expect(
      screen.queryByRole('button', {name: /add to selected/i}),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {name: /navigate to selected/i}),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: /cancel/i})).toBeEnabled();
  });

  it('shows both Add and Navigate when readonly and ready', () => {
    render(
      <PortConnectionsInfoPopup {...baseProps} isReadonly state={readyState} />,
    );
    expect(
      screen.getByRole('button', {name: /add to selected/i}),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', {name: /navigate to selected/i}),
    ).toBeEnabled();
  });
});

describe('PortConnectionsInfoPopup — integration', () => {
  it('preserves checklist state through row switches and filtering, then Adds the full union', async () => {
    const onAdd = jest.fn();
    const {user} = renderWithUser(
      <PortConnectionsInfoPopup
        {...baseProps}
        onAdd={onAdd}
        state={{
          componentSystemId: 'comp-1',
          portSystemId: 'port-1',
          rows: [rowSg, rowDangling],
          status: 'ready',
        }}
      />,
    );

    await user.click(screen.getByTestId('row-row-sg'));
    await user.click(screen.getByTestId('uc-uc-1'));
    await user.click(screen.getByTestId('uc-uc-2'));

    await user.selectOptions(
      screen.getByTestId('connections-filter'),
      'dangling',
    );
    expect(screen.queryByTestId('row-row-sg')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('row-row-dangling'));
    await user.click(screen.getByTestId('uc-uc-1'));

    await user.selectOptions(screen.getByTestId('connections-filter'), 'all');
    await user.click(screen.getByTestId('row-row-sg'));
    expect(screen.getByTestId('uc-uc-1')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByTestId('uc-uc-2')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', {name: /add to selected/i}));
    expect(onAdd).toHaveBeenCalledWith(expect.arrayContaining([uc1, uc2]));
    expect(onAdd.mock.calls[0][0]).toHaveLength(2); // uc1 deduped across both rows
  });
});
