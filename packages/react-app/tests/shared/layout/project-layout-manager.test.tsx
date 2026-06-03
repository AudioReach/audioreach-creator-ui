/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {render} from '@testing-library/react';

let capturedOnModelChange: ((model: any) => void) | null = null;

const mockLayout = ({onModelChange}: any) => {
  capturedOnModelChange = onModelChange;
  return null;
};

jest.mock('flexlayout-react', () => ({
  Actions: {
    addNode: jest.fn(),
    deleteTab: jest.fn(),
    updateNodeAttributes: jest.fn(),
  },
  DockLocation: {BOTTOM: 'bottom', LEFT: 'left', RIGHT: 'right'},
  Layout: (props: any) => mockLayout(props),
  Model: {
    fromJson: jest.fn(() => ({
      doAction: jest.fn(),
      getNodeById: jest.fn(() => null),
      getRoot: jest.fn(() => ({getId: jest.fn(() => 'root')})),
      setOnAllowDrop: jest.fn(),
      toJson: jest.fn(() => ({layout: {children: [], type: 'row'}})),
    })),
  },
}));

const mockSaveLayoutConfig = jest.fn();

jest.mock('~shared/store/use-project-layout-store', () => ({
  ProjectMainTabEntity: jest.fn().mockImplementation((title: string) => ({
    id: `main-tab-${title}`,
    title,
  })),
  ProjectTabEntity: jest.fn().mockImplementation((title: string) => ({
    id: `tab-${title}`,
    title,
  })),
  useProjectLayoutStore: Object.assign(
    jest.fn((selector: any) =>
      selector({getActiveProjectGroup: jest.fn(() => null)}),
    ),
    {
      getState: jest.fn(() => ({
        componentRegistry: {},
        getActiveProjectGroup: jest.fn(() => null),
        getLayoutConfig: jest.fn(() => null),
        panelTabRegistry: {},
        saveLayoutConfig: mockSaveLayoutConfig,
      })),
      subscribe: jest.fn(() => jest.fn()),
    },
  ),
}));

jest.mock('~features/panel-collapse', () => ({
  createPanelCollapseLogic: jest.fn(() => jest.fn()),
  removeSidePlaceholdersIfNeeded: jest.fn(),
  syncPanelStateFromModel: jest.fn(),
  usePanelCollapseStore: {
    getState: jest.fn(() => ({panelStates: {}, savedWeights: {}})),
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock('~shared/config/config-manager', () => ({
  ConfigFileManager: {
    instance: {setProjectConfigData: jest.fn()},
  },
}));

import {PanelIntegration} from '~shared/layout/project-layout-manager';

describe('project-layout-manager — save debounce', () => {
  beforeEach(() => {
    capturedOnModelChange = null;
    jest.useFakeTimers();
    jest.clearAllMocks();

    PanelIntegration.setManager({
      createFlexLayoutModel: jest.fn(() => ({
        doAction: jest.fn(),
        getNodeById: jest.fn(() => null),
        getRoot: jest.fn(),
        setOnAllowDrop: jest.fn(),
        toJson: jest.fn(() => ({layout: {children: [], type: 'row'}})),
      })),
      factory: jest.fn(() => null),
    } as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllTimers();
  });

  // Rapid onModelChange calls during a splitter drag should coalesce into one save
  it('calls saveLayoutConfig only once when onModelChange fires rapidly', () => {
    const mainTab = PanelIntegration.createProjectMainTab(
      'project.json',
      'Test Project',
      jest.fn(),
      jest.fn(() => null),
      {layout: {children: [], type: 'row'}},
    );

    render((mainTab as any).reactiveComponent);
    expect(capturedOnModelChange).not.toBeNull();

    // Clear the initial save that happens during createProjectMainTab
    mockSaveLayoutConfig.mockClear();

    const mockModel = {
      getNodeById: jest.fn(() => null),
      getRoot: jest.fn(),
      toJson: jest.fn(() => ({layout: {children: [], type: 'row'}})),
    };

    // Simulate splitter drag — 5 rapid firings, each resetting the 300ms debounce
    for (let i = 0; i < 5; i++) {
      capturedOnModelChange!(mockModel);
    }

    // Flush all pending timers — debounce fires exactly once despite 5 calls
    jest.runAllTimers();
    expect(mockSaveLayoutConfig).toHaveBeenCalledTimes(1);
  });
});
