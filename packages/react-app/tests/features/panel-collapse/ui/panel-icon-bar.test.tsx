/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('flexlayout-react', () => ({
  Actions: {
    addNode: jest.fn(),
    deleteTab: jest.fn(),
    updateNodeAttributes: jest.fn(),
  },
  DockLocation: {BOTTOM: 'bottom', LEFT: 'left', RIGHT: 'right'},
}));

jest.mock('@qualcomm-ui/react/inline-icon-button', () => ({
  InlineIconButton: ({'aria-label': ariaLabel, icon: Icon, onClick}: any) => (
    <button
      aria-label={ariaLabel}
      data-testid="inline-icon-button"
      onClick={onClick}
    >
      {Icon ? <Icon /> : null}
    </button>
  ),
}));

import {
  DEFAULT_PANEL_STATE,
  PanelIconBar,
  usePanelCollapseStore,
} from '~features/panel-collapse';

const PROJECT_ID = 'test-project';

const mockGetActiveProjectGroup = jest.fn<any, any>(() => ({
  mainTab: {id: PROJECT_ID},
}));

// Mock useProjectLayoutStore to control the active project
jest.mock('~shared/store/use-project-layout-store', () => ({
  useProjectLayoutStore: jest.fn((selector: any) =>
    selector({getActiveProjectGroup: mockGetActiveProjectGroup}),
  ),
}));

// Mock lucide-react icons — render as simple spans so we can check aria-labels
jest.mock('lucide-react', () => ({
  PanelBottomClose: () => <span data-testid="icon-bottom-close" />,
  PanelBottomOpen: () => <span data-testid="icon-bottom-open" />,
  PanelLeftClose: () => <span data-testid="icon-left-close" />,
  PanelLeftOpen: () => <span data-testid="icon-left-open" />,
  PanelRightClose: () => <span data-testid="icon-right-close" />,
  PanelRightOpen: () => <span data-testid="icon-right-open" />,
}));

describe('PanelIconBar', () => {
  beforeEach(() => {
    mockGetActiveProjectGroup.mockReturnValue({mainTab: {id: PROJECT_ID}});
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {...DEFAULT_PANEL_STATE}},
      savedWeights: {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. Renders nothing when no active project ──────────────────────────────

  // Component should return null when no project is open
  it('renders nothing when there is no active project', () => {
    mockGetActiveProjectGroup.mockReturnValue(null);

    const {container} = render(<PanelIconBar />);
    expect(container.firstChild).toBeNull();
  });

  // ── 2. Renders 3 toggle buttons when a project is open ────────────────────

  // One button per panel (left, bottom, right) should be present
  it('renders 3 toggle buttons when a project is open', () => {
    render(<PanelIconBar />);

    expect(
      screen.getByRole('button', {name: 'Toggle Left Panel'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Toggle Bottom Panel'}),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'Toggle Right Panel'}),
    ).toBeInTheDocument();
  });

  // ── 3. Buttons reflect panel visibility state ─────────────────────────────

  // All 3 buttons are always rendered regardless of panel state
  it('renders all 3 buttons when all panels are visible', () => {
    render(<PanelIconBar />);

    // All 3 buttons present — one per panel
    const buttons = screen.getAllByTestId('inline-icon-button');
    expect(buttons).toHaveLength(3);
  });

  // Collapsing a panel hides the content but keeps the toggle button
  it('still renders all 3 buttons when left panel is collapsed', () => {
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: false, right: true}},
      savedWeights: {},
    });

    render(<PanelIconBar />);

    // Buttons are always rendered regardless of panel state
    const buttons = screen.getAllByTestId('inline-icon-button');
    expect(buttons).toHaveLength(3);
  });

  // ── 4. Icon swaps based on panel visibility ───────────────────────────────

  // Collapsed panel shows the "close" icon (panel is hidden, click to open)
  it('shows close icon when left panel is collapsed', () => {
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: false, right: true}},
      savedWeights: {},
    });

    render(<PanelIconBar />);

    expect(screen.getByTestId('icon-left-close')).toBeInTheDocument();
  });

  // Visible panel shows the "open" icon (panel is shown, click to hide)
  it('shows open icon when left panel is visible', () => {
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: true, right: true}},
      savedWeights: {},
    });

    render(<PanelIconBar />);

    expect(screen.getByTestId('icon-left-open')).toBeInTheDocument();
  });

  // Clicking toggle swaps the icon — open→close (interaction-driven swap)
  it('swaps left panel icon from open to close after clicking toggle', async () => {
    const user = userEvent.setup();

    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {bottom: true, left: true, right: true}},
      savedWeights: {},
    });

    render(<PanelIconBar />);

    // Panel is visible — open icon shown
    expect(screen.getByTestId('icon-left-open')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-left-close')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Toggle Left Panel'}));

    // Panel collapsed — close icon shown
    expect(screen.getByTestId('icon-left-close')).toBeInTheDocument();
    expect(screen.queryByTestId('icon-left-open')).not.toBeInTheDocument();
  });

  // ── 5. Calls togglePanel when button is clicked ───────────────────────────

  // Clicking a button should call togglePanel with the right panel name and project ID
  it('calls togglePanel with correct panel and project ID when left button is clicked', async () => {
    const user = userEvent.setup();
    const togglePanel = jest.fn();
    usePanelCollapseStore.setState({
      panelStates: {[PROJECT_ID]: {...DEFAULT_PANEL_STATE}},
      savedWeights: {},
      togglePanel,
    } as any);

    render(<PanelIconBar />);

    await user.click(screen.getByRole('button', {name: 'Toggle Left Panel'}));

    expect(togglePanel).toHaveBeenCalledWith('left', PROJECT_ID);
  });
});
