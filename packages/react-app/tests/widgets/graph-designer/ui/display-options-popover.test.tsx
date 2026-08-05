/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {Children, isValidElement} from 'react';

import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {ConfigFileManager} from '~shared/config/config-manager';
import {useUserPreferences} from '~shared/config/hooks';
import {DEFAULT_USER_PREFERENCES} from '~shared/config/user-preferences-types';
import {showToast} from '~shared/controls/global-toaster';
import {createProjectStore, ProjectStoreContext} from '~shared/store';
import {DisplayOptionsPopover} from '~widgets/graph-designer/ui/display-options-popover';

jest.mock('~shared/lib/logger');

jest.mock('@qualcomm-ui/react/checkbox', () => ({
  Checkbox: ({
    checked,
    disabled,
    label,
    onCheckedChange,
  }: {
    checked: boolean;
    disabled?: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <label>
      <input
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        type="checkbox"
      />
      {label}
    </label>
  ),
}));

jest.mock('@qualcomm-ui/react/radio', () => ({
  Radio: ({label, value}: {label: string; value: string}) => (
    <label>
      <input aria-label={label} readOnly type="radio" value={value} />
      {label}
    </label>
  ),
  RadioGroup: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => (
    <div>
      {Children.map(children, (child) => {
        if (!isValidElement<{value: string}>(child)) {
          return child;
        }
        return (
          <div
            data-testid={`q-radio-select-${child.props.value}`}
            onClick={() => onValueChange(child.props.value)}
            role="button"
          >
            {child}
          </div>
        );
      })}
    </div>
  ),
}));

jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));

const mockLoadConfigData = jest.fn();
const mockSaveConfigData = jest.fn();

beforeAll(() => {
  Object.defineProperty(window, 'configApi', {
    configurable: true,
    value: {
      loadConfigData: mockLoadConfigData,
      saveConfigData: mockSaveConfigData,
    },
    writable: true,
  });
});

const PROJECT_ID = 'project-1';

function seedProjectConfig() {
  // @ts-expect-error accessing private map for test setup
  ConfigFileManager.instance.projectConfigMap.set(PROJECT_ID, {
    arcconfig: {
      userPreferences: JSON.parse(JSON.stringify(DEFAULT_USER_PREFERENCES)),
    },
  });
}

/**
 * Renders DisplayOptionsPopover wrapped in ProjectStoreContext.Provider.
 * The project store is created after seedProjectConfig() so the
 * UserPreferencesSlice picks up the seeded ConfigFileManager data.
 * An inner Wrapper calls useUserPreferences() and passes the result down
 * as props, mirroring how GraphDesigner renders the popover in production.
 */
function renderPopover(projectId: string = PROJECT_ID) {
  function Wrapper() {
    const {preferences, updatePreference} = useUserPreferences();
    return (
      <DisplayOptionsPopover
        preferences={preferences}
        projectId={projectId}
        updatePreference={updatePreference}
      />
    );
  }
  const store = createProjectStore(projectId);
  return render(
    <ProjectStoreContext.Provider value={store}>
      <Wrapper />
    </ProjectStoreContext.Provider>,
  );
}

describe('DisplayOptionsPopover', () => {
  beforeEach(() => {
    // @ts-expect-error reset singleton between tests
    ConfigFileManager._instance = undefined;
    seedProjectConfig();
    mockSaveConfigData.mockResolvedValue({status: true});
    jest.clearAllMocks();
  });

  // Graph View checkboxes should reflect whatever is in DEFAULT_USER_PREFERENCES
  it('renders all Graph View checkboxes with current preference values', () => {
    renderPopover(PROJECT_ID);

    expect(
      screen.getByRole('checkbox', {name: 'Highlight PP Modules'}),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', {name: 'Show Control Links'}),
    ).toBeChecked();
    expect(
      screen.getByRole('checkbox', {name: 'Show Dangling Links'}),
    ).toBeChecked();
  });

  // Toggling a checkbox should update the in-memory preferences store
  it('calls updatePreference with the correct path and value when a checkbox is toggled', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(
      screen.getByRole('checkbox', {name: 'Show Control Links'}),
    );

    const saved = ConfigFileManager.instance.getUserPreferences(PROJECT_ID);
    expect(saved.visualization.showControlLinks).toBe(false);
  });

  // The debounced disk write should still fire after the debounce window
  it('persists the change to disk via ConfigFileManager.save', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByRole('checkbox', {name: 'Show MDF Modules'}));

    await waitFor(() => expect(mockSaveConfigData).toHaveBeenCalled());
  });

  // Closing the popover before the debounce fires must not drop the change
  it('flushes a pending debounced save immediately when the popover unmounts', async () => {
    const user = userEvent.setup();
    const {unmount} = renderPopover(PROJECT_ID);

    await user.click(screen.getByRole('checkbox', {name: 'Show MDF Modules'}));
    // Unmount immediately, well within the debounce window — simulates the
    // user toggling a control and closing the Popover (unmountOnExit) right
    // after, before the debounced save would otherwise have fired.
    unmount();

    await waitFor(() => expect(mockSaveConfigData).toHaveBeenCalled());
  });

  // A failed on-disk save should surface as a danger toast to the user
  it('shows a danger toast when the on-disk save fails', async () => {
    mockSaveConfigData.mockResolvedValue({
      message: 'disk error',
      status: false,
    });
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByRole('checkbox', {name: 'Show MDF Modules'}));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith(
        'Failed to save display option',
        'danger',
      ),
    );
  });

  // A failed in-memory preference write should also surface as a danger toast
  it('shows a danger toast when the in-memory preference write fails', async () => {
    // No project config seeded under this ID — setUserPreference returns false
    const user = userEvent.setup();
    renderPopover('unseeded-project');

    await user.click(screen.getByRole('checkbox', {name: 'Show MDF Modules'}));

    expect(showToast).toHaveBeenCalledWith(
      'Failed to save display option',
      'danger',
    );
    expect(mockSaveConfigData).not.toHaveBeenCalled();
  });

  // Both Workflow radios must always be present, regardless of which is selected
  it('always renders both Usecase Workflow and System Workflow radios', () => {
    renderPopover(PROJECT_ID);

    expect(screen.getByText('Usecase Workflow')).toBeInTheDocument();
    expect(screen.getByText('System Workflow')).toBeInTheDocument();
  });

  // The nested level radios are only meaningful under Usecase Workflow
  it('shows the Subsystem/Usecase level radios when Usecase Workflow is selected', () => {
    renderPopover(PROJECT_ID);

    expect(screen.getByText('Subsystem level')).toBeInTheDocument();
    expect(screen.getByText('Usecase level')).toBeInTheDocument();
  });

  // Selecting System Workflow should hide the now-irrelevant level radios
  it('hides the Subsystem/Usecase level radios after selecting System Workflow', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-system-workflow'));

    expect(screen.queryByText('Subsystem level')).not.toBeInTheDocument();
    expect(screen.queryByText('Usecase level')).not.toBeInTheDocument();
  });

  // Switching back to Usecase Workflow should bring the level radios back
  it('reveals the Subsystem/Usecase level radios again after switching back to Usecase Workflow', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-system-workflow'));
    await user.click(screen.getByTestId('q-radio-select-usecase-workflow'));

    expect(screen.getByText('Subsystem level')).toBeInTheDocument();
    expect(screen.getByText('Usecase level')).toBeInTheDocument();
  });

  // The three ID checkboxes only make sense once IDs are actually shown
  it('hides the detailed-view-only ID checkboxes in Compact View', () => {
    renderPopover(PROJECT_ID);

    expect(screen.queryByText('Show Subgraph IDs')).not.toBeInTheDocument();
    expect(screen.queryByText('Show Container IDs')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Show Module Instance IDs'),
    ).not.toBeInTheDocument();
  });

  // Switching to Detailed View should reveal all three ID checkboxes
  it('reveals the detailed-view-only ID checkboxes after switching to Detailed View', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-detailed'));

    expect(screen.getByText('Show Subgraph IDs')).toBeInTheDocument();
    expect(screen.getByText('Show Container IDs')).toBeInTheDocument();
    expect(screen.getByText('Show Module Instance IDs')).toBeInTheDocument();
  });

  // The default combination (Usecase Workflow + Usecase level) disables the control
  it('disables Simplified Subsystems for the default Usecase Workflow + Usecase level combination', () => {
    renderPopover(PROJECT_ID);

    expect(
      screen.getByRole('checkbox', {name: 'Simplified Subsystems'}),
    ).toBeDisabled();
  });

  // Subsystem level (still under Usecase Workflow) is an enabling combination
  it('enables Simplified Subsystems after selecting Subsystem level under Usecase Workflow', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-subsystem-level'));

    expect(
      screen.getByRole('checkbox', {name: 'Simplified Subsystems'}),
    ).not.toBeDisabled();
  });

  // System Workflow is the other enabling combination, regardless of level
  it('enables Simplified Subsystems after switching to System Workflow', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-system-workflow'));

    expect(
      screen.getByRole('checkbox', {name: 'Simplified Subsystems'}),
    ).not.toBeDisabled();
  });

  // No Workflow transition should ever overwrite the user's own checked value
  it('does not force the checked value when enabling or disabling Simplified Subsystems', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    // Enable it (Subsystem level), check it manually, then switch through
    // every combination — the user's checked value must never be reset.
    await user.click(screen.getByTestId('q-radio-select-subsystem-level'));
    await user.click(
      screen.getByRole('checkbox', {name: 'Simplified Subsystems'}),
    );
    await user.click(screen.getByTestId('q-radio-select-system-workflow'));
    await user.click(screen.getByTestId('q-radio-select-usecase-workflow'));
    await user.click(screen.getByTestId('q-radio-select-usecase-level'));

    const checkbox = screen.getByRole('checkbox', {
      name: 'Simplified Subsystems',
    });
    expect(checkbox).toBeDisabled();
    expect(checkbox).toBeChecked();
  });

  // Show all ports is unchecked since portVisibilityMode defaults to 'active'
  it('reflects the current Port Visibility Mode preference on the checkbox', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-detailed'));

    expect(
      screen.getByRole('checkbox', {name: 'Show all ports'}),
    ).not.toBeChecked();
  });

  // Checking Show all ports should save portVisibilityMode as 'all'
  it('saves display.portVisibilityMode as "all" when Show all ports is checked', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByTestId('q-radio-select-detailed'));
    await user.click(screen.getByRole('checkbox', {name: 'Show all ports'}));

    const saved = ConfigFileManager.instance.getUserPreferences(PROJECT_ID);
    expect(saved.display.portVisibilityMode).toBe('all');
  });

  // Expand Subgraphs is unchecked since expandSubgraphs defaults to false
  it('reflects the current expandSubgraphs preference on the checkbox', () => {
    renderPopover(PROJECT_ID);

    expect(
      screen.getByRole('checkbox', {name: 'Expand Subgraphs'}),
    ).not.toBeChecked();
  });

  // Checking Expand Subgraphs should save expandSubgraphs as true
  it('saves visualization.expandSubgraphs as true when Expand Subgraphs is checked', async () => {
    const user = userEvent.setup();
    renderPopover(PROJECT_ID);

    await user.click(screen.getByRole('checkbox', {name: 'Expand Subgraphs'}));

    const saved = ConfigFileManager.instance.getUserPreferences(PROJECT_ID);
    expect(saved.visualization.expandSubgraphs).toBe(true);
  });
});
