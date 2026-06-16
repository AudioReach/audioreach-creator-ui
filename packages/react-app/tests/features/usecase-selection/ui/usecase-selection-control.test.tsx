/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDeleteUsecases = jest.fn();
const mockSetSelectedUsecases = jest.fn();
const mockShowToast = jest.fn();
let mockSelectedUsecases: string[] = [];

jest.mock('~entities/usecases/api/usecases-api', () => ({
  deleteUsecases: (...args: any[]) => mockDeleteUsecases(...args),
}));

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: (...args: any[]) => mockShowToast(...args),
}));

jest.mock('@qualcomm-ui/react/text-input', () => ({
  TextInput: ({inputProps, onValueChange, placeholder}: any) => (
    <input
      data-testid="search-input"
      onChange={(e) => onValueChange?.(e.target.value)}
      onFocus={inputProps?.onFocus}
      placeholder={placeholder}
    />
  ),
}));

jest.mock('@qualcomm-ui/react/button', () => ({
  Button: ({children, onClick}: any) => (
    <button onClick={onClick}>{children}</button>
  ),
  IconButton: ({'aria-label': ariaLabel, onClick}: any) => (
    <button aria-label={ariaLabel} onClick={onClick} />
  ),
}));

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({'aria-label': ariaLabel, checked, onCheckedChange}: any) => (
    <input
      aria-label={ariaLabel}
      checked={checked ?? false}
      onChange={(e) => onCheckedChange(e.target.checked)}
      type="checkbox"
    />
  ),
}));

// Stateful Dialog mock — dialog starts closed; Trigger opens it; CloseTrigger closes it
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

// Render createPortal inline so portal content is accessible in tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: any) => node,
}));

jest.mock('lucide-react', () => ({
  ChevronDown: () => <span />,
  ChevronRight: () => <span />,
  PanelTopClose: () => <span />,
  PanelTopOpen: () => <span />,
  Search: () => <span />,
  Settings: () => <span />,
  Trash2: () => <span />,
}));

import UsecaseSelectionControl from '~features/usecase-selection/ui/usecase-selection-control';

// ── Test data ─────────────────────────────────────────────────────────────────

const PROJECT_ID = 'project-1';

const mockUsecaseData = [
  {
    expanded: true,
    name: 'Default',
    usecases: [
      {
        keyValueCollection: [
          {
            keyInfo: {keyLabel: 'DeviceTX'},
            valueInfo: {valueLabel: 'Speaker_Mic'},
          },
        ],
        systemId: 'UC_001',
      },
      {
        keyValueCollection: [
          {
            keyInfo: {keyLabel: 'StreamRX'},
            valueInfo: {valueLabel: 'HFP_Rx_Playback'},
          },
        ],
        systemId: 'UC_002',
      },
    ],
  },
] as any;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Opens the dropdown by focusing the search input */
async function openDropdown(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('search-input'));
}

/**
 * Opens the confirmation dialog then clicks the Delete button inside it.
 * Step 1: click trash icon (only button with name "Delete" before dialog opens)
 * Step 2: click dialog Delete button (text "Delete" visible after dialog opens)
 */
async function clickDialogDelete(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', {name: 'Delete'}));
  await user.click(screen.getByText('Delete'));
}

function renderControl(selectedUsecases = mockSelectedUsecases) {
  return render(
    <UsecaseSelectionControl
      onSelectedUsecasesChange={mockSetSelectedUsecases}
      projectId={PROJECT_ID}
      selectedUsecases={selectedUsecases}
      usecaseData={mockUsecaseData}
    />,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UsecaseSelectionControl — handleDeleteSelected', () => {
  beforeEach(() => {
    mockDeleteUsecases.mockResolvedValue({success: true});
    mockSelectedUsecases = ['Speaker_Mic'];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. API called with correct projectGroupId and systemIds ───────────────

  // deleteUsecases must receive the project ID and the backend IDs of selected items
  it('calls deleteUsecases with correct projectGroupId and systemIds', async () => {
    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockDeleteUsecases).toHaveBeenCalledWith(PROJECT_ID, ['UC_001']);
    });
  });

  // ── 2. UI updates and store cleared on success ────────────────────────────

  // On success: deleted item removed from list AND store selection cleared
  it('removes deleted item from list and clears store selection on success', async () => {
    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.queryAllByText('Speaker_Mic')).toHaveLength(0);
      expect(mockSetSelectedUsecases).toHaveBeenCalledWith([]);
    });
  });

  // ── 3. Dropdown closes on success ────────────────────────────────────────

  // On success: dropdown closes automatically
  it('closes dropdown after successful deletion', async () => {
    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    expect(screen.getByText('Done')).toBeInTheDocument();

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.queryByText('Done')).not.toBeInTheDocument();
    });
  });

  // ── 4. Singular error toast on 1 item failure ─────────────────────────────

  // On failure: showToast called with singular message for 1 item
  it('shows singular error toast when 1 usecase fails to delete', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    const user = userEvent.setup();

    renderControl();

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

  // On failure with 2+ items: showToast called with plural message
  it('shows plural error toast when multiple usecases fail to delete', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    mockSelectedUsecases = ['Speaker_Mic', 'HFP_Rx_Playback'];
    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    await clickDialogDelete(user);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Failed to delete usecases.',
        'danger',
      );
    });
  });

  // ── 6. Progress UI visible while in flight, clears after resolution ───────

  // Deferred promise keeps delete in-flight so mid-flight state can be asserted
  it('shows progress UI while delete is in flight and removes it after resolution', async () => {
    let resolveDelete!: (value: {success: boolean}) => void;
    mockDeleteUsecases.mockReturnValue(
      new Promise<{success: boolean}>((resolve) => {
        resolveDelete = resolve;
      }),
    );

    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    await clickDialogDelete(user);

    // Progress UI visible while in flight
    expect(screen.getByTestId('progress-ring')).toBeInTheDocument();
    expect(screen.getByText('Deleting Usecase...')).toBeInTheDocument();
    expect(screen.getByText('Please wait...')).toBeInTheDocument();

    // API called exactly once — overlay prevents duplicate submissions
    expect(mockDeleteUsecases).toHaveBeenCalledTimes(1);

    // Resolve and assert progress UI is gone
    await act(async () => {
      resolveDelete({success: true});
    });

    await waitFor(() => {
      expect(screen.queryByTestId('progress-ring')).not.toBeInTheDocument();
    });
  });

  // ── 7. UI unchanged on failure ────────────────────────────────────────────

  // On failure: list stays the same and store is not updated
  it('leaves list and selection unchanged when backend returns failure', async () => {
    mockDeleteUsecases.mockResolvedValue({success: false});
    const user = userEvent.setup();

    renderControl();

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);

    await clickDialogDelete(user);

    await waitFor(() => {
      expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
      expect(mockSetSelectedUsecases).not.toHaveBeenCalled();
    });
  });
});

describe('UsecaseSelectionControl — usecase selection', () => {
  beforeEach(() => {
    mockDeleteUsecases.mockResolvedValue({success: true});
    mockSelectedUsecases = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
});

describe('UsecaseSelectionControl — search filtering', () => {
  beforeEach(() => {
    mockSelectedUsecases = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows only matching usecases when search term is typed', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HFP_Rx_Playback').length).toBeGreaterThan(0);

    await user.type(screen.getByTestId('search-input'), 'Speaker');

    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('HFP_Rx_Playback')).toHaveLength(0);
  });

  it('restores all usecases when search is cleared', async () => {
    const user = userEvent.setup();
    renderControl([]);

    await openDropdown(user);
    await user.type(screen.getByTestId('search-input'), 'Speaker');
    expect(screen.queryAllByText('HFP_Rx_Playback')).toHaveLength(0);

    await user.clear(screen.getByTestId('search-input'));

    expect(screen.getAllByText('Speaker_Mic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HFP_Rx_Playback').length).toBeGreaterThan(0);
  });
});
