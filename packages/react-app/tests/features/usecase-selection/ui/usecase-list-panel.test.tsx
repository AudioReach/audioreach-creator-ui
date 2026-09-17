/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, onClick}: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  IconButton: ({'aria-label': ariaLabel, onClick}: any) => (
    <button aria-label={ariaLabel} onClick={onClick} />
  ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    'aria-label': ariaLabel,
    checked,
    indeterminate,
    onCheckedChange,
  }: any) => (
    <input
      aria-label={ariaLabel}
      checked={checked ?? false}
      data-indeterminate={String(indeterminate ?? false)}
      onChange={(e) => onCheckedChange(e.target.checked)}
      type="checkbox"
    />
  ),
}));

// Stateful Dialog mock — Trigger opens it; CloseTrigger closes it
jest.mock('@qualcomm-ui/react/dialog', () => {
  const React = jest.requireActual('react');
  const DialogContext = React.createContext({
    open: false,
    setOpen: (_: boolean) => {},
  });

  return {
    Dialog: {
      Body: ({children}: any) => <div>{children}</div>,
      CloseButton: () => {
        const {setOpen} = React.useContext(DialogContext);
        return (
          <button aria-label="Close dialog" onClick={() => setOpen(false)} />
        );
      },
      CloseTrigger: ({children}: any) => {
        const {setOpen} = React.useContext(DialogContext);
        return <span onClick={() => setOpen(false)}>{children}</span>;
      },
      Description: ({children}: any) => <p>{children}</p>,
      FloatingPortal: ({children}: any) => {
        const {open} = React.useContext(DialogContext);
        return open ? <div>{children}</div> : null;
      },
      Footer: ({children}: any) => <div>{children}</div>,
      Heading: ({children}: any) => <h2>{children}</h2>,
      IndicatorIcon: () => <span />,
      Root: ({children}: any) => {
        const [open, setOpen] = React.useState(false);
        return (
          <DialogContext.Provider value={{open, setOpen}}>
            <div>{children}</div>
          </DialogContext.Provider>
        );
      },
      Trigger: ({children}: any) => {
        const {setOpen} = React.useContext(DialogContext);
        return <span onClick={() => setOpen(true)}>{children}</span>;
      },
    },
  };
});

jest.mock('@qualcomm-ui/react/menu', () => ({
  Menu: {
    Content: ({children}: any) => <div>{children}</div>,
    Item: ({children, onClick}: any) => (
      <button onClick={onClick}>{children}</button>
    ),
    Positioner: ({children}: any) => <div>{children}</div>,
    Root: ({children}: any) => <div>{children}</div>,
  },
}));

jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: ({children}: any) => <div>{children}</div>,
}));

jest.mock('@qualcomm-ui/react-core/portal', () => ({
  Portal: ({children}: any) => <div>{children}</div>,
}));

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('lucide-react', () => ({
  ChevronDown: () => <span />,
  ChevronRight: () => <span />,
  ChevronsDown: () => <span />,
  ChevronsUp: () => <span />,
  Loader2: () => <span />,
  SearchX: () => <span />,
  Settings: () => <span />,
  Trash2: () => <span />,
}));

import {UsecaseListPanel} from '~features/usecase-selection/ui/usecase-list-panel';

// ── Test data ─────────────────────────────────────────────────────────────────

/** Leaf item: Speaker_Mic */
const ITEM_SPEAKER: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'DeviceTX', naturalId: 1, systemId: 'k1'},
      value: {name: 'Speaker_Mic', naturalId: 1, systemId: 'v1'},
    },
  ],
  name: 'Speaker_Mic',
  systemId: 'UC_001',
};

/** Leaf item: HFP_Rx_Playback */
const ITEM_HFP: any = {
  expanded: false,
  keyValuePairs: [
    {
      key: {name: 'StreamRX', naturalId: 2, systemId: 'k2'},
      value: {
        name: 'HFP_Rx_Playback',
        naturalId: 2,
        systemId: 'v2',
      },
    },
  ],
  name: 'HFP_Rx_Playback',
  systemId: 'UC_002',
};

/** Flat category with two leaf usecases */
const mockUsecaseData: any[] = [
  {
    expanded: true,
    items: [ITEM_SPEAKER, ITEM_HFP],
    name: 'Default',
  },
];

/** Grouped category (subsystem-level) */
const mockSubsystemData: any[] = [
  {
    expanded: true,
    items: [
      {
        children: [ITEM_SPEAKER, ITEM_HFP],
        expanded: true,
        keyValuePairs: [
          {
            key: {name: 'StreamPP_RX', naturalId: 3, systemId: 'k3'},
            value: {
              name: 'StreamPP_RX',
              naturalId: 3,
              systemId: 'v3',
            },
          },
        ],
        name: 'StreamPP_RX',
      },
    ],
    name: 'Subsystem Filtered Usecases',
  },
];

// ── Default props ─────────────────────────────────────────────────────────────

const defaultProps = {
  expandedCategories: ['Default'],
  handleSelectAll: jest.fn(),
  handleSelectCategory: jest.fn(),
  handleSelectUsecase: jest.fn(),
  isSearching: false,
  onClose: jest.fn(),
  onCollapseAll: jest.fn(),
  onDeleteSelected: jest.fn(),
  onExpandAll: jest.fn(),
  selectedUsecases: [] as string[],
  toggleCategoryExpansion: jest.fn(),
  usecaseData: mockUsecaseData,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('UsecaseListPanel — delete button', () => {
  // ── 1. Delete button hidden when nothing is selected ──────────────────────

  it('does not render delete button when no usecases are selected', () => {
    render(<UsecaseListPanel {...defaultProps} selectedUsecases={[]} />);

    expect(
      screen.queryByRole('button', {name: 'Delete'}),
    ).not.toBeInTheDocument();
  });

  // ── 2. Delete button visible when items are selected ─────────────────────

  it('renders delete button when at least one usecase is selected', () => {
    render(
      <UsecaseListPanel {...defaultProps} selectedUsecases={['Speaker_Mic']} />,
    );

    expect(screen.getByRole('button', {name: 'Delete'})).toBeInTheDocument();
  });

  // ── 3. Clicking trash icon opens dialog, does NOT call onDeleteSelected ───

  it('does not call onDeleteSelected when trash icon is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteSelected = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        onDeleteSelected={onDeleteSelected}
        selectedUsecases={['Speaker_Mic']}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Delete'}));

    expect(onDeleteSelected).not.toHaveBeenCalled();
  });

  // ── 4. Clicking Delete in dialog calls onDeleteSelected ───────────────────

  it('calls onDeleteSelected when Delete button in dialog is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteSelected = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        onDeleteSelected={onDeleteSelected}
        selectedUsecases={['Speaker_Mic']}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Delete'}));
    await user.click(screen.getByText('Delete'));

    expect(onDeleteSelected).toHaveBeenCalledTimes(1);
  });

  // ── 5. Clicking Cancel does NOT call onDeleteSelected ─────────────────────

  it('does not call onDeleteSelected when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteSelected = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        onDeleteSelected={onDeleteSelected}
        selectedUsecases={['Speaker_Mic']}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Delete'}));
    await user.click(screen.getByText('Cancel'));

    expect(onDeleteSelected).not.toHaveBeenCalled();
  });
});

describe('UsecaseListPanel — usecase rendering', () => {
  // ── Flat category ─────────────────────────────────────────────────────────

  it('renders usecase names from a flat category', () => {
    render(<UsecaseListPanel {...defaultProps} />);

    expect(screen.getByText('Speaker_Mic')).toBeInTheDocument();
    expect(screen.getByText('HFP_Rx_Playback')).toBeInTheDocument();
  });

  it('renders category name', () => {
    render(<UsecaseListPanel {...defaultProps} />);

    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('does not render usecases when category is collapsed', () => {
    render(<UsecaseListPanel {...defaultProps} expandedCategories={[]} />);

    expect(screen.queryByText('Speaker_Mic')).not.toBeInTheDocument();
  });

  // ── Grouped category (subsystem) ──────────────────────────────────────────

  it('renders subsystem group header inside a grouped category', () => {
    render(
      <UsecaseListPanel
        {...defaultProps}
        expandedCategories={['Subsystem Filtered Usecases']}
        usecaseData={mockSubsystemData}
      />,
    );

    expect(screen.getByText('Subsystem Filtered Usecases')).toBeInTheDocument();
    expect(screen.getByText('StreamPP_RX')).toBeInTheDocument();
  });

  it('renders child usecases under an expanded subsystem group', () => {
    render(
      <UsecaseListPanel
        {...defaultProps}
        expandedCategories={['Subsystem Filtered Usecases']}
        usecaseData={mockSubsystemData}
      />,
    );

    // Group has expanded: true so children are visible
    expect(screen.getByText('Speaker_Mic')).toBeInTheDocument();
    expect(screen.getByText('HFP_Rx_Playback')).toBeInTheDocument();
  });

  // ── Empty / loading states ────────────────────────────────────────────────

  it('shows "No usecases match" when usecaseData is empty', () => {
    render(<UsecaseListPanel {...defaultProps} usecaseData={[]} />);

    expect(screen.getByText('No usecases match')).toBeInTheDocument();
  });

  it('shows loading spinner when isSearching is true', () => {
    render(<UsecaseListPanel {...defaultProps} isSearching />);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
    expect(screen.queryByText('Speaker_Mic')).not.toBeInTheDocument();
  });
});

describe('UsecaseListPanel — checkbox interactions', () => {
  // ── Individual usecase ────────────────────────────────────────────────────

  it('calls handleSelectUsecase with name and true when usecase is checked', async () => {
    const user = userEvent.setup();
    const handleSelectUsecase = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        handleSelectUsecase={handleSelectUsecase}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select Speaker_Mic'}),
    );

    expect(handleSelectUsecase).toHaveBeenCalledWith('Speaker_Mic', true);
  });

  it('calls handleSelectUsecase with name and false when usecase is unchecked', async () => {
    const user = userEvent.setup();
    const handleSelectUsecase = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        handleSelectUsecase={handleSelectUsecase}
        selectedUsecases={['Speaker_Mic']}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select Speaker_Mic'}),
    );

    expect(handleSelectUsecase).toHaveBeenCalledWith('Speaker_Mic', false);
  });

  // ── Select All ────────────────────────────────────────────────────────────

  it('calls handleSelectAll with true when Select All is checked', async () => {
    const user = userEvent.setup();
    const handleSelectAll = jest.fn();

    render(
      <UsecaseListPanel {...defaultProps} handleSelectAll={handleSelectAll} />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases'}),
    );

    expect(handleSelectAll).toHaveBeenCalledWith(true);
  });

  it('calls handleSelectAll with false when Select All is unchecked', async () => {
    const user = userEvent.setup();
    const handleSelectAll = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        handleSelectAll={handleSelectAll}
        selectedUsecases={['Speaker_Mic', 'HFP_Rx_Playback']}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases'}),
    );

    expect(handleSelectAll).toHaveBeenCalledWith(false);
  });

  // ── Category-level ────────────────────────────────────────────────────────

  it('calls handleSelectCategory with all item names when category checkbox is checked', async () => {
    const user = userEvent.setup();
    const handleSelectCategory = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        handleSelectCategory={handleSelectCategory}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases in Default'}),
    );

    expect(handleSelectCategory).toHaveBeenCalledWith(
      ['Speaker_Mic', 'HFP_Rx_Playback'],
      true,
    );
  });

  // ── Subsystem group-level ─────────────────────────────────────────────────

  it('calls handleSelectCategory with child names when subsystem group checkbox is checked', async () => {
    const user = userEvent.setup();
    const handleSelectCategory = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        expandedCategories={['Subsystem Filtered Usecases']}
        handleSelectCategory={handleSelectCategory}
        usecaseData={mockSubsystemData}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {name: 'Select all in StreamPP_RX'}),
    );

    expect(handleSelectCategory).toHaveBeenCalledWith(
      ['Speaker_Mic', 'HFP_Rx_Playback'],
      true,
    );
  });
});

describe('UsecaseListPanel — toolbar actions', () => {
  it('calls onExpandAll when Expand All button is clicked', async () => {
    const user = userEvent.setup();
    const onExpandAll = jest.fn();

    render(<UsecaseListPanel {...defaultProps} onExpandAll={onExpandAll} />);

    await user.click(screen.getByRole('button', {name: 'Expand All'}));

    expect(onExpandAll).toHaveBeenCalledTimes(1);
  });

  it('calls onCollapseAll when Collapse All button is clicked', async () => {
    const user = userEvent.setup();
    const onCollapseAll = jest.fn();

    render(
      <UsecaseListPanel {...defaultProps} onCollapseAll={onCollapseAll} />,
    );

    await user.click(screen.getByRole('button', {name: 'Collapse All'}));

    expect(onCollapseAll).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Done button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();

    render(<UsecaseListPanel {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', {name: /done/i}));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls toggleCategoryExpansion with category name when chevron is clicked', async () => {
    const user = userEvent.setup();
    const toggleCategoryExpansion = jest.fn();

    render(
      <UsecaseListPanel
        {...defaultProps}
        toggleCategoryExpansion={toggleCategoryExpansion}
      />,
    );

    await user.click(screen.getByRole('button', {name: 'Collapse Default'}));

    expect(toggleCategoryExpansion).toHaveBeenCalledWith('Default');
  });
});

describe('UsecaseListPanel — Select All checkbox state', () => {
  it('shows Select All as unchecked when nothing is selected', () => {
    render(<UsecaseListPanel {...defaultProps} selectedUsecases={[]} />);

    const checkbox = screen.getByRole('checkbox', {
      name: 'Select all usecases',
    });
    expect(checkbox).not.toBeChecked();
  });

  it('shows Select All as checked when all visible usecases are selected', () => {
    render(
      <UsecaseListPanel
        {...defaultProps}
        selectedUsecases={['Speaker_Mic', 'HFP_Rx_Playback']}
      />,
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'Select all usecases',
    });
    expect(checkbox).toBeChecked();
  });

  it('shows Select All as indeterminate when some usecases are selected', () => {
    render(
      <UsecaseListPanel {...defaultProps} selectedUsecases={['Speaker_Mic']} />,
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'Select all usecases',
    });
    expect(checkbox).toHaveAttribute('data-indeterminate', 'true');
  });
});
