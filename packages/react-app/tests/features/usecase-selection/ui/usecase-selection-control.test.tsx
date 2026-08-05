/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDeleteUsecases = jest.fn();
const mockSetSelectedUsecases = jest.fn();
const mockShowToast = jest.fn();
const mockUseUsecaseSearch = jest.fn();

jest.mock('~entities/usecases/api/usecases-api', () => ({
  deleteUsecases: (...args: any[]) => mockDeleteUsecases(...args),
}));

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: (...args: any[]) => mockShowToast(...args),
}));

jest.mock('~shared/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock useUsecaseSearch so tests don't trigger real API calls.
// Default: no search active (searchData = null).
jest.mock('~features/usecase-selection/hooks/use-usecase-search', () => ({
  useUsecaseSearch: (...args: any[]) => mockUseUsecaseSearch(...args),
}));

jest.mock('~shared/controls/arc-combobox', () => ({
  ArcCombobox: () => <div data-testid="arc-combobox" />,
}));

jest.mock('@qualcomm-ui/react/text-input', () => {
  const React = jest.requireActual('react');
  // Context passes onValueChange + value from Root down to Input
  const Ctx = React.createContext({
    onValueChange: undefined as ((v: string) => void) | undefined,
    value: undefined as string | undefined,
  });

  return {
    TextInput: {
      ClearTrigger: () => null,
      Input: ({
        'aria-label': ariaLabel,
        onBlur,
        onFocus,
        onKeyDown,
        placeholder,
      }: any) => {
        const {onValueChange, value} = React.useContext(Ctx);
        return (
          <input
            aria-label={ariaLabel}
            data-testid="search-input"
            onBlur={onBlur}
            onChange={(e) => onValueChange?.(e.target.value)}
            onFocus={onFocus}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            value={value ?? ''}
          />
        );
      },
      InputGroup: ({children}: any) => <>{children}</>,
      Root: ({children, onValueChange, value}: any) => (
        <Ctx.Provider value={{onValueChange, value}}>{children}</Ctx.Provider>
      ),
    },
  };
});

jest.mock('@qualcomm-ui/react/inline-icon-button', () => ({
  InlineIconButton: ({'aria-label': ariaLabel}: any) => (
    <button aria-label={ariaLabel} type="button" />
  ),
}));

// Tooltip renders trigger + content so tooltip content is always accessible in tests
jest.mock('@qualcomm-ui/react/tooltip', () => ({
  Tooltip: ({children, trigger}: any) => (
    <>
      {trigger}
      <div data-testid="tooltip-content">{children}</div>
    </>
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, onClick, onMouseDown}: any) => (
    <button onClick={onClick} onMouseDown={onMouseDown}>
      {children}
    </button>
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

jest.mock('@qualcomm-ui/react/progress-ring', () => ({
  ProgressRing: () => <div data-testid="progress-ring" />,
}));

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

// Render Portal inline so its content is accessible in tests
jest.mock('@qualcomm-ui/react-core/portal', () => ({
  Portal: ({children}: any) => <div>{children}</div>,
}));

// Render createPortal inline so portal content is accessible in tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: any) => node,
}));

jest.mock('lucide-react', () => ({
  ChevronDown: () => <span />,
  ChevronRight: () => <span />,
  ChevronsDown: () => <span />,
  ChevronsUp: () => <span />,
  Clock: () => <span />,
  Loader2: () => <span />,
  Search: () => <span />,
  SearchX: () => <span />,
  Settings: () => <span />,
  Trash2: () => <span />,
}));

import {useUsecaseSelectionControlStore} from '~features/usecase-selection';
import {UsecaseSelectionControl} from '~features/usecase-selection/ui/usecase-selection-control';

// ── Test data ─────────────────────────────────────────────────────────────────

const PROJECT_ID = 'project-1';

/** Leaf item: Speaker_Mic */
const ITEM_SPEAKER: any = {
  expanded: false,
  keyValueCollection: [
    {
      keyInfo: {keyId: 1, keyLabel: 'DeviceTX', keySystemId: 'k1'},
      valueInfo: {valueId: 1, valueLabel: 'Speaker_Mic', valueSystemId: 'v1'},
    },
  ],
  name: 'Speaker_Mic',
  systemId: 'UC_001',
};

/** Leaf item: HFP_Rx_Playback */
const ITEM_HFP: any = {
  expanded: false,
  keyValueCollection: [
    {
      keyInfo: {keyId: 2, keyLabel: 'StreamRX', keySystemId: 'k2'},
      valueInfo: {
        valueId: 2,
        valueLabel: 'HFP_Rx_Playback',
        valueSystemId: 'v2',
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

/** Grouped category (subsystem-level) — one subsystem group with two children */
const mockSubsystemData: any[] = [
  {
    expanded: true,
    items: [
      {
        children: [ITEM_SPEAKER, ITEM_HFP],
        expanded: true,
        keyValueCollection: [
          {
            keyInfo: {keyId: 3, keyLabel: 'StreamPP_RX', keySystemId: 'k3'},
            valueInfo: {
              valueId: 3,
              valueLabel: 'StreamPP_RX',
              valueSystemId: 'v3',
            },
          },
        ],
        name: 'StreamPP_RX',
      },
    ],
    name: 'Subsystem Filtered Usecases',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Opens the dropdown by focusing the search input */
async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('search-input'));
}

/**
 * Opens the confirmation dialog then clicks the Delete button inside it.
 * Step 1: click trash icon (button with aria-label "Delete")
 * Step 2: click dialog Delete button (text "Delete" visible after dialog opens)
 */
async function clickDialogDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', {name: 'Delete'}));
  await user.click(screen.getByText('Delete'));
}

function renderControl(
  selectedUsecases: string[] = [],
  usecaseData: any[] = mockUsecaseData,
  extraProps: Record<string, any> = {},
) {
  return render(
    <UsecaseSelectionControl
      onSelectedUsecasesChange={mockSetSelectedUsecases}
      projectId={PROJECT_ID}
      selectedUsecases={selectedUsecases}
      usecaseData={usecaseData}
      {...extraProps}
    />,
  );
}

// ── Global setup ──────────────────────────────────────────────────────────────

// ResizeObserver is not available in JSDOM — mock it for the autosuggestion
// popup positioning effect.
Object.defineProperty(window, 'ResizeObserver', {
  value: jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
  })),
  writable: true,
});

beforeEach(() => {
  // Reset Zustand store so each test starts with a clean slate
  useUsecaseSelectionControlStore.setState({stateByProject: {}});
  // Default: no search active
  mockUseUsecaseSearch.mockReturnValue({isSearching: false, searchData: null});
  mockDeleteUsecases.mockResolvedValue({success: true});
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsecaseSelectionControl — handleDeleteSelected', () => {
  // ── 1. API called with correct args ──────────────────────────────────────

  it('calls deleteUsecases with correct projectGroupId and systemIds', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockDeleteUsecases).toHaveBeenCalledWith(PROJECT_ID, ['UC_001']);
    });
  });

  // ── 2. UI updates and store cleared on success ────────────────────────────

  it('removes deleted item from list and clears store selection on success', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.queryAllByText('Speaker_Mic')).toHaveLength(0);
      expect(mockSetSelectedUsecases).toHaveBeenCalledWith([]);
    });
  });

  // ── 3. Dropdown closes on success ────────────────────────────────────────

  it('closes dropdown after successful deletion', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    expect(screen.getByText('Done')).toBeInTheDocument();

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  // ── 4. Singular error toast on 1 item failure ─────────────────────────────

  it('shows singular error toast when 1 usecase fails to delete', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Failed to delete usecase.',
        'danger',
      );
    });
  });

  // ── 5. Plural error toast on multiple items failure ───────────────────────

  it('shows plural error toast when multiple usecases fail to delete', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    const user = userEvent.setup();
    renderControl(['Speaker_Mic', 'HFP_Rx_Playback']);

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Failed to delete usecases.',
        'danger',
      );
    });
  });

  // ── 6. Progress UI visible while in flight ────────────────────────────────

  it('shows progress UI while delete is in flight and removes it after resolution', async () => {
    let resolveDelete!: (value: {success: boolean}) => void;
    mockDeleteUsecases.mockReturnValue(
      new Promise<{success: boolean}>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    await clickDialogDelete(user);

    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
    expect(screen.getByText('Deleting Usecase...')).toBeInTheDocument();
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(mockDeleteUsecases).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveDelete({success: true});
    });

    await waitFor(() => {
      expect(screen.queryByTestId('progress-ring')).not.toBeInTheDocument();
    });
  });

  // ── 7. UI unchanged on failure ────────────────────────────────────────────

  it('leaves list and selection unchanged when backend returns failure', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
      expect(mockSetSelectedUsecases).not.toHaveBeenCalled();
    });
  });

  // ── 8. Recursive delete removes nested usecases (A1 fix) ─────────────────

  it('removes a usecase nested inside a subsystem group after successful deletion', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic'], mockSubsystemData);

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockDeleteUsecases).toHaveBeenCalledWith(PROJECT_ID, ['UC_001']);
      expect(screen.queryAllByText('Speaker_Mic')).toHaveLength(0);
    });
  });

  // ── 9. Deleted usecases removed from recentlySelected cache ──────────────

  it('removes deleted usecases from the recentlySelected store cache on success', async () => {
    // Seed the store so Speaker_Mic appears in the "Recently Selected" category
    useUsecaseSelectionControlStore.setState({
      stateByProject: {
        [PROJECT_ID]: {
          expandedCategories: [],
          recentlySelected: [ITEM_SPEAKER],
          searchHistory: [],
          searchScopeOption: 'All',
          searchTerm: '',
        },
      },
    });

    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);

    // "Recently Selected" virtual category should be visible before deletion
    expect(screen.getByText('Recently Selected')).toBeInTheDocument();

    await clickDialogDelete(user);

    await waitFor(() => {
      // recentlySelected cache should no longer contain Speaker_Mic
      const storeState =
        useUsecaseSelectionControlStore.getState().stateByProject[PROJECT_ID];
      expect(storeState?.recentlySelected).toEqual([]);
    });
  });

  it('does not remove undeleted usecases from the recentlySelected cache', async () => {
    // Seed the store with both items in recentlySelected
    useUsecaseSelectionControlStore.setState({
      stateByProject: {
        [PROJECT_ID]: {
          expandedCategories: [],
          recentlySelected: [ITEM_SPEAKER, ITEM_HFP],
          searchHistory: [],
          searchScopeOption: 'All',
          searchTerm: '',
        },
      },
    });

    const user = userEvent.setup();
    // Only select Speaker_Mic for deletion
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      const storeState =
        useUsecaseSelectionControlStore.getState().stateByProject[PROJECT_ID];
      // Speaker_Mic deleted → removed from cache
      expect(
        storeState?.recentlySelected.find((u) => u.name === 'Speaker_Mic'),
      ).toBeUndefined();
      // HFP_Rx_Playback not deleted → still in cache
      expect(
        storeState?.recentlySelected.find((u) => u.name === 'HFP_Rx_Playback'),
      ).toBeDefined();
    });
  });
});

describe('UsecaseSelectionControl — usecase selection', () => {
  // ── Individual usecase toggle ─────────────────────────────────────────────

  it('calls onSelectedUsecasesChange with usecase added when checked', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select Speaker_Mic'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith(['Speaker_Mic']);
  });

  it('calls onSelectedUsecasesChange with usecase removed when unchecked', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic']);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select Speaker_Mic'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([]);
  });

  // ── Select All ────────────────────────────────────────────────────────────

  it('calls onSelectedUsecasesChange with all usecases when Select All checked', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([
      'Speaker_Mic',
      'HFP_Rx_Playback',
    ]);
  });

  it('calls onSelectedUsecasesChange with empty array when Select All unchecked', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic', 'HFP_Rx_Playback']);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([]);
  });

  // ── Category-level selection ──────────────────────────────────────────────

  it('selects all usecases in a category when category checkbox is checked', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases in Default'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([
      'Speaker_Mic',
      'HFP_Rx_Playback',
    ]);
  });

  it('deselects all usecases in a category when category checkbox is unchecked', async () => {
    const user = userEvent.setup();
    renderControl(['Speaker_Mic', 'HFP_Rx_Playback']);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select all usecases in Default'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([]);
  });
});

describe('UsecaseSelectionControl — search filtering', () => {
  // ── Search results from hook ──────────────────────────────────────────────

  it('shows full list when searchData is null (no active search)', async () => {
    mockUseUsecaseSearch.mockReturnValue({
      isSearching: false,
      searchData: null,
    });

    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HFP_Rx_Playback').length).toBeGreaterThan(0);
  });

  it('shows loading spinner while search is in flight', async () => {
    mockUseUsecaseSearch.mockReturnValue({isSearching: true, searchData: null});

    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('shows "No usecases match" when search returns empty results', async () => {
    mockUseUsecaseSearch.mockReturnValue({isSearching: false, searchData: []});

    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    expect(screen.getByText('No usecases match')).toBeInTheDocument();
  });
});

describe('UsecaseSelectionControl — placeholder text', () => {
  it('shows "No usecases selected" when nothing is selected and dropdown is closed', () => {
    renderControl([]);
    expect(
      screen.getByPlaceholderText('No usecases selected'),
    ).toBeInTheDocument();
  });

  it('shows selection count with category name when usecases are selected and dropdown is closed', () => {
    renderControl(['Speaker_Mic']);
    expect(
      screen.getByPlaceholderText(
        '1 of 2 usecases selected from category: Default',
      ),
    ).toBeInTheDocument();
  });

  it('shows "Search for usecases..." when dropdown is open', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    expect(
      screen.getByPlaceholderText('Search for usecases...'),
    ).toBeInTheDocument();
  });

  it('deduplicates total count when same usecase appears in base and subsystem categories', () => {
    // System Workflow: base (2 usecases) + subsystem group (1 duplicate)
    const systemWorkflowData: any[] = [
      {expanded: true, items: [ITEM_SPEAKER, ITEM_HFP], name: 'Default'},
      {
        expanded: true,
        items: [
          {
            children: [ITEM_SPEAKER], // duplicate of Speaker_Mic
            expanded: true,
            keyValueCollection: [],
            name: 'SubGroup',
          },
        ],
        name: 'Subsystem Filtered Usecases',
      },
    ];

    renderControl(['Speaker_Mic'], systemWorkflowData);
    // Should show "1 of 2" not "1 of 3" (deduplication applied)
    // Category suffix shows both categories that contain the selection
    expect(
      screen.getByPlaceholderText(
        '1 of 2 usecases selected from categories: Default, Subsystem Filtered Usecases',
      ),
    ).toBeInTheDocument();
  });
});

describe('UsecaseSelectionControl — selectAll prop', () => {
  it('auto-selects all usecases when selectAll=true', async () => {
    renderControl([], mockUsecaseData, {selectAll: true});

    await waitFor(() => {
      expect(mockSetSelectedUsecases).toHaveBeenCalledWith([
        'Speaker_Mic',
        'HFP_Rx_Playback',
      ]);
    });
  });

  it('deduplicates when selectAll=true and same usecase appears in multiple categories', async () => {
    const duplicateData: any[] = [
      {expanded: true, items: [ITEM_SPEAKER], name: 'Cat A'},
      {expanded: true, items: [ITEM_SPEAKER, ITEM_HFP], name: 'Cat B'}, // Speaker_Mic duplicated
    ];

    renderControl([], duplicateData, {selectAll: true});

    await waitFor(() => {
      const call = mockSetSelectedUsecases.mock.calls[0][0] as string[];
      // Should not contain duplicates
      expect(call).toEqual(['Speaker_Mic', 'HFP_Rx_Playback']);
      expect(new Set(call).size).toBe(call.length);
    });
  });

  it('does not auto-select when selectAll=false', () => {
    renderControl([], mockUsecaseData, {selectAll: false});
    expect(mockSetSelectedUsecases).not.toHaveBeenCalled();
  });
});

describe('UsecaseSelectionControl — grouped categories (subsystem)', () => {
  it('renders subsystem group header and its child usecases when expanded', async () => {
    const user = userEvent.setup();
    renderControl([], mockSubsystemData);

    await openDropdown(user);

    expect(screen.getByText('Subsystem Filtered Usecases')).toBeInTheDocument();
    expect(screen.getByText('StreamPP_RX')).toBeInTheDocument();
    // Children visible because group has expanded: true
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HFP_Rx_Playback').length).toBeGreaterThan(0);
  });

  it('selects all usecases in a subsystem group when group checkbox is checked', async () => {
    const user = userEvent.setup();
    renderControl([], mockSubsystemData);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select all in StreamPP_RX'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith([
      'Speaker_Mic',
      'HFP_Rx_Playback',
    ]);
  });

  it('selects individual usecase inside a subsystem group', async () => {
    const user = userEvent.setup();
    renderControl([], mockSubsystemData);

    await openDropdown(user);
    await user.click(
      screen.getByRole('checkbox', {name: 'Select Speaker_Mic'}),
    );

    expect(mockSetSelectedUsecases).toHaveBeenCalledWith(['Speaker_Mic']);
  });
});

describe('UsecaseSelectionControl — disabled prop', () => {
  it('does not open dropdown when disabled and input is focused', async () => {
    const user = userEvent.setup();
    renderControl([], mockUsecaseData, {disabled: true});

    await user.click(screen.getByTestId('search-input'));

    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });
});

describe('UsecaseSelectionControl — search syntax tooltip', () => {
  // ── Info icon visibility ──────────────────────────────────────────────────

  it('shows Info icon (Search syntax help) when dropdown is open', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    expect(
      screen.getByRole('button', {name: 'Search syntax help'}),
    ).toBeInTheDocument();
  });

  it('does not show Info icon when dropdown is closed', () => {
    renderControl([]);
    expect(
      screen.queryByRole('button', {name: 'Search syntax help'}),
    ).not.toBeInTheDocument();
  });

  // ── Tooltip content ───────────────────────────────────────────────────────

  it('shows search syntax hints in tooltip content when dropdown is open', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    // All five hint labels are present
    expect(screen.getByText(/Search all usecases/)).toBeInTheDocument();
    expect(screen.getByText(/Search subgraphs/)).toBeInTheDocument();
    expect(screen.getByText(/Search containers/)).toBeInTheDocument();
    expect(screen.getByText(/Search modules/)).toBeInTheDocument();
    expect(screen.getByText(/Search subsystems/)).toBeInTheDocument();
  });

  it('does not show tooltip content when dropdown is closed', () => {
    renderControl([]);
    // Tooltip content is only rendered when isDropdownOpen is true
    expect(screen.queryByText('Speaker+HFP_Sink')).not.toBeInTheDocument();
  });
});

describe('UsecaseSelectionControl — autosuggestion popup', () => {
  // ── Suggestion applies and dropdown stays open ────────────────────────────

  it('applies suggestion text and keeps dropdown open when a suggestion is clicked', async () => {
    // Seed search history so suggestions appear when the user types a prefix
    useUsecaseSelectionControlStore.setState({
      stateByProject: {
        [PROJECT_ID]: {
          expandedCategories: [],
          recentlySelected: [],
          searchHistory: ['BT_Rx', 'HFP_Sink'],
          searchScopeOption: 'All',
          searchTerm: '',
        },
      },
    });

    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);

    // Fire a change event to simulate typing 'BT' (controlled input)
    const input = screen.getByTestId('search-input');
    await user.click(input);
    fireEvent.change(input, {target: {value: 'BT'}});

    // Suggestion should be visible
    expect(screen.getByText('BT_Rx')).toBeInTheDocument();

    // Click the suggestion
    await user.click(screen.getByText('BT_Rx'));

    // Dropdown must still be open after clicking the suggestion
    expect(screen.getByText('Done')).toBeInTheDocument();

    // Search input must show the applied suggestion
    expect(screen.getByTestId('search-input')).toHaveValue('BT_Rx');
  });

  it('does not show suggestions when search history is empty', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    fireEvent.change(screen.getByTestId('search-input'), {
      target: {value: 'BT'},
    });

    // No history → no suggestions
    expect(screen.queryByText('BT_Rx')).not.toBeInTheDocument();
  });

  it('shows only matching suggestions (prefix match)', async () => {
    useUsecaseSelectionControlStore.setState({
      stateByProject: {
        [PROJECT_ID]: {
          expandedCategories: [],
          recentlySelected: [],
          searchHistory: ['BT_Rx', 'HFP_Sink', 'BT_SCO'],
          searchScopeOption: 'All',
          searchTerm: '',
        },
      },
    });

    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    fireEvent.change(screen.getByTestId('search-input'), {
      target: {value: 'BT'},
    });

    // Only BT-prefixed entries should appear
    expect(screen.getByText('BT_Rx')).toBeInTheDocument();
    expect(screen.getByText('BT_SCO')).toBeInTheDocument();
    expect(screen.queryByText('HFP_Sink')).not.toBeInTheDocument();
  });
});
