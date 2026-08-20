/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

jest.mock('~shared/lib/logger');

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
    selectTab: jest.fn((nodeId: string) => ({
      data: {tabNode: nodeId},
      type: 'FlexLayout_SelectTab',
    })),
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
const mockCreateProjectGroup = jest.fn(() => true);
const mockAddPanelTab = jest.fn(() => true);

jest.mock('~shared/store/use-project-layout-store', () => ({
  PanelTabEntity: jest.fn().mockImplementation((title: string) => ({
    id: `panel-tab-${title}`,
    title,
  })),
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
        addPanelTab: mockAddPanelTab,
        componentRegistry: {},
        createProjectGroup: mockCreateProjectGroup,
        getActiveProjectGroup: jest.fn(() => null),
        getLayoutConfig: jest.fn(() => null),
        isProjectGroupAlreadyOpen: jest.fn(() => null),
        panelTabRegistry: {},
        saveLayoutConfig: mockSaveLayoutConfig,
        switchToProjectGroup: jest.fn(),
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

import {tabFocusRegistry} from '~shared/store';
import {PanelId} from '~shared/store/project-layout.types';
import {
  PanelTabEntity,
  useProjectLayoutStore,
} from '~shared/store/use-project-layout-store';
import ProjectLayoutManager, {
  tabLayoutService,
  TabLayoutService,
} from '~widgets/project-layout/project-layout-manager';

const mockManager = {
  createFlexLayoutModel: jest.fn(() => ({
    doAction: jest.fn(),
    getNodeById: jest.fn(() => null),
    getRoot: jest.fn(),
    setOnAllowDrop: jest.fn(),
    toJson: jest.fn(() => ({layout: {children: [], type: 'row'}})),
  })),
  factory: jest.fn(() => null),
} as any;

describe('TabLayoutService — createProjectMainTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tabLayoutService.setManager(mockManager);
  });

  // createProjectMainTab must register the project group in the store with the
  // correct args
  it('calls createProjectGroup with correct projectId, filePath, groupTitle and description', () => {
    const onTabClose = jest.fn(() => true);
    const factory = jest.fn(() => null);
    const layout = {layout: {children: [], type: 'row'}};

    tabLayoutService.createProjectMainTab(
      'project-1',
      '/path/to/project.json',
      'project_1',
      'My Project',
      layout,
      onTabClose,
      factory,
      'A test project',
      undefined,
    );

    expect(mockCreateProjectGroup).toHaveBeenCalledWith(
      'project-1',
      '/path/to/project.json',
      'My Project',
      expect.objectContaining({title: 'project_1'}),
      'A test project',
      undefined,
    );
  });

  // createProjectMainTab must return the ProjectMainTab created for the project
  it('returns a ProjectMainTab with the correct title', () => {
    const layout = {layout: {children: [], type: 'row'}};

    const mainTab = tabLayoutService.createProjectMainTab(
      'project-2',
      '/path/to/project2.json',
      'project_2',
      'Project Two',
      layout,
      jest.fn(() => true),
      jest.fn(() => null),
    );

    expect(mainTab).toMatchObject({title: 'project_2'});
  });

  // switchToProjectGroup collapses all app groups when switching to a project group
  it('collapses all app groups when switching to an existing project group', () => {
    const existingMainTab = {id: 'main-tab-existing', title: 'Existing Tab'};
    const existingGroup = {id: 'group-existing', mainTab: existingMainTab};
    const mockSwitch = jest.fn();

    (useProjectLayoutStore.getState as jest.Mock).mockReturnValueOnce({
      addPanelTab: mockAddPanelTab,
      componentRegistry: {},
      createProjectGroup: mockCreateProjectGroup,
      getActiveProjectGroup: jest.fn(() => null),
      getLayoutConfig: jest.fn(() => null),
      isProjectGroupAlreadyOpen: jest.fn(() => existingGroup),
      panelTabRegistry: {},
      saveLayoutConfig: mockSaveLayoutConfig,
      switchToProjectGroup: mockSwitch,
    });

    tabLayoutService.createProjectMainTab(
      'project-dup',
      '/existing.json',
      'tab-title',
      'Group Title',
      {layout: {children: [], type: 'row'}},
      jest.fn(() => true),
      jest.fn(() => null),
    );

    // switchToProjectGroup must be called — it handles app group collapsing
    // internally
    expect(mockSwitch).toHaveBeenCalledWith('group-existing');
  });

  // duplicate project open — returns existing mainTab, skips group creation
  it('returns existing mainTab and switches to group when project is already open', () => {
    const existingMainTab = {id: 'main-tab-existing', title: 'Existing Tab'};
    const existingGroup = {id: 'group-existing', mainTab: existingMainTab};
    const mockSwitch = jest.fn();

    (useProjectLayoutStore.getState as jest.Mock).mockReturnValueOnce({
      addPanelTab: mockAddPanelTab,
      componentRegistry: {},
      createProjectGroup: mockCreateProjectGroup,
      getActiveProjectGroup: jest.fn(() => null),
      getLayoutConfig: jest.fn(() => null),
      isProjectGroupAlreadyOpen: jest.fn(() => existingGroup),
      panelTabRegistry: {},
      saveLayoutConfig: mockSaveLayoutConfig,
      switchToProjectGroup: mockSwitch,
    });

    const result = tabLayoutService.createProjectMainTab(
      'project-dup',
      '/existing.json',
      'tab-title',
      'Group Title',
      {layout: {children: [], type: 'row'}},
      jest.fn(() => true),
      jest.fn(() => null),
    );

    expect(mockSwitch).toHaveBeenCalledWith('group-existing');
    expect(mockCreateProjectGroup).not.toHaveBeenCalled();
    expect(result).toBe(existingMainTab);
  });

  // failed group creation — throws without writing layout (saveLayoutConfig only
  // called on success)
  it('throws when createProjectGroup returns false without writing layout', () => {
    mockCreateProjectGroup.mockReturnValueOnce(false);

    expect(() =>
      tabLayoutService.createProjectMainTab(
        'project-fail',
        '/fail.json',
        'fail-tab',
        'Fail Group',
        {layout: {children: [], type: 'row'}},
        jest.fn(() => true),
        jest.fn(() => null),
      ),
    ).toThrow('Failed to create project group for: Fail Group');

    // saveLayoutConfig must NOT have been called — nothing written before failure
    expect(mockSaveLayoutConfig).not.toHaveBeenCalled();
  });

  // undefined description must be passed through as-is (null → undefined conversion
  // happens in caller)
  it('passes undefined description when not provided', () => {
    const layout = {layout: {children: [], type: 'row'}};

    tabLayoutService.createProjectMainTab(
      'project-3',
      '/path/to/project3.json',
      'project_3',
      'Project Three',
      layout,
      jest.fn(() => true),
      jest.fn(() => null),
    );

    expect(mockCreateProjectGroup).toHaveBeenCalledWith(
      'project-3',
      '/path/to/project3.json',
      'Project Three',
      expect.anything(),
      undefined,
      undefined,
    );
  });
});

describe('TabLayoutService — addPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tabLayoutService.setManager(mockManager);
  });

  // addPanel must construct PanelTabEntity with all three args: title, component,
  // onTabClose
  it('constructs PanelTabEntity with title, component, and onTabClose', () => {
    const manager = new TabLayoutService();
    const component = <div />;
    const onTabClose = jest.fn(() => true);

    manager.addPanel(
      'tab-1',
      PanelId.LeftPanel,
      'Module List',
      component,
      onTabClose,
    );

    expect(PanelTabEntity).toHaveBeenCalledWith(
      'Module List',
      component,
      onTabClose,
    );
  });

  // addPanel must forward tabId, panelId and a PanelTabEntity to the store
  it('calls addPanelTab with correct tabId, panelId and panel entity', () => {
    mockAddPanelTab.mockReturnValue(true);
    const manager = new TabLayoutService();
    const component = <div />;

    manager.addPanel('tab-1', PanelId.LeftPanel, 'Module List', component);

    expect(mockAddPanelTab).toHaveBeenCalledWith(
      'tab-1',
      PanelId.LeftPanel,
      expect.objectContaining({title: 'Module List'}),
    );
  });

  // addPanel must return true when the store reports success
  it('returns true when addPanelTab succeeds', () => {
    mockAddPanelTab.mockReturnValue(true);
    const manager = new TabLayoutService();

    const result = manager.addPanel(
      'tab-1',
      PanelId.BottomPanel,
      'Log View',
      <div />,
    );

    expect(result).toBe(true);
  });

  // addPanel must return false when the store reports failure
  it('returns false when addPanelTab fails', () => {
    mockAddPanelTab.mockReturnValue(false);
    const manager = new TabLayoutService();

    const result = manager.addPanel(
      'tab-1',
      PanelId.RightPanel,
      'Subgraph List',
      <div />,
    );

    expect(result).toBe(false);
  });
});

describe('project-layout-manager — save debounce', () => {
  beforeEach(() => {
    capturedOnModelChange = null;
    jest.useFakeTimers();
    jest.clearAllMocks();

    tabLayoutService.setManager({
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
    const mainTab = tabLayoutService.createProjectMainTab(
      'project-debounce',
      'project.json',
      'Test Project',
      'Test Group',
      {layout: {children: [], type: 'row'}},
      jest.fn(() => true),
      jest.fn(() => null),
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

describe('ProjectLayoutManager — group colors', () => {
  it('uses brand colors for the default Start group only', () => {
    (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
      activeTab: {id: 'start-tab'},
      activeTabGroup: null,
      appGroups: [
        {
          appTabs: [{id: 'start-tab', title: 'Start'}],
          colorId: 1,
          id: 'default-app-group',
          isCollapsed: false,
          title: 'Application',
        },
        {
          appTabs: [{id: 'other-tab', title: 'Other'}],
          colorId: 2,
          id: 'other-app-group',
          isCollapsed: false,
          title: 'Other',
        },
      ],
      projectGroups: [],
    });

    const manager = new (ProjectLayoutManager as any)({});
    const tabs =
      manager.buildFlexLayoutModelFromStore().layout.children[0].children;

    expect(tabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className:
            'group-label-tab !bg-brand-primary',
          id: 'app-group-label-default-app-group',
        }),
        expect.objectContaining({
          className:
            'border-t-2 border-brand-primary',
          id: 'start-tab',
        }),
        expect.objectContaining({
          className:
            'group-label-tab text-persistent-white !bg-category-green-strong',
          id: 'app-group-label-other-app-group',
        }),
      ]),
    );
  });

  it('does not paint the default Start label with a category color', () => {
    (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
      appGroups: [
        {
          colorId: 1,
          id: 'default-app-group',
          isCollapsed: false,
        },
      ],
      expandTabGroup: jest.fn(),
      projectGroups: [],
      showGroupTitle: true,
    });
    const renderValues = {content: null};
    const manager = new (ProjectLayoutManager as any)({});

    manager.onRenderTab(
      {
        getComponent: () => 'group-label',
        getId: () => 'app-group-label-default-app-group',
        getName: () => 'Application',
      },
      renderValues,
    );

    expect(renderValues.content.props.className).not.toContain(
      '!bg-category-blue-strong',
    );
    expect(renderValues.content.props.className).toContain(
      'text-persistent-white',
    );
  });
});

describe('ProjectLayoutManager — onAction FlexLayout_DeleteTab', () => {
  const mockRemoveProjectTab = jest.fn(() => true);

  function makeManagerWithProjectTab(onTabClose: jest.Mock) {
    const projectTab = {
      component: null,
      id: 'tab-1',
      onProjectClose: jest.fn(),
      onTabClose,
      tabType: 0,
      title: 'Module A',
    };
    const project = {
      colorId: 1,
      description: null,
      id: 'project-1',
      mainTab: {id: 'main-1'},
      projectKey: 'key-1',
      projectTabs: [projectTab],
      title: 'Project',
    };

    (useProjectLayoutStore.getState as jest.Mock).mockReturnValue({
      appGroups: [],
      projectGroups: [project],
      removeProjectTab: mockRemoveProjectTab,
    });

    const manager = new (ProjectLayoutManager as any)({});
    return {manager, projectTab};
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('removes the tab immediately when onTabClose returns true synchronously', () => {
    const onTabClose = jest.fn(() => true);
    const {manager} = makeManagerWithProjectTab(onTabClose);

    manager.onAction({
      data: {node: 'tab-1'},
      type: 'FlexLayout_DeleteTab',
    });

    expect(mockRemoveProjectTab).toHaveBeenCalledWith('project-1', 'tab-1');
  });

  it('does not remove the tab when onTabClose returns false synchronously', () => {
    const onTabClose = jest.fn(() => false);
    const {manager} = makeManagerWithProjectTab(onTabClose);

    manager.onAction({
      data: {node: 'tab-1'},
      type: 'FlexLayout_DeleteTab',
    });

    expect(mockRemoveProjectTab).not.toHaveBeenCalled();
  });

  it('waits for a Promise-returning onTabClose before removing the tab', async () => {
    let resolveConfirm: (value: boolean) => void = () => {};
    const onTabClose = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const {manager, projectTab} = makeManagerWithProjectTab(onTabClose);

    manager.onAction({
      data: {node: 'tab-1'},
      type: 'FlexLayout_DeleteTab',
    });

    // Must not close before the promise resolves
    expect(mockRemoveProjectTab).not.toHaveBeenCalled();
    expect(projectTab.onProjectClose).not.toHaveBeenCalled();

    resolveConfirm(true);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveProjectTab).toHaveBeenCalledWith('project-1', 'tab-1');
    expect(projectTab.onProjectClose).toHaveBeenCalledWith('tab-1', 'Module A');
  });

  it('does not remove the tab when a Promise-returning onTabClose resolves false', async () => {
    let resolveConfirm: (value: boolean) => void = () => {};
    const onTabClose = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    const {manager} = makeManagerWithProjectTab(onTabClose);

    manager.onAction({
      data: {node: 'tab-1'},
      type: 'FlexLayout_DeleteTab',
    });

    resolveConfirm(false);
    await Promise.resolve();
    await Promise.resolve();

    expect(mockRemoveProjectTab).not.toHaveBeenCalled();
  });
});

describe('TabLayoutService — focusTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls doAction with Actions.selectTab(nodeId) when a model is present', () => {
    const mockDoAction = jest.fn();
    const mockManagerWithModel = {
      state: {model: {doAction: mockDoAction}},
    } as any;
    const manager = new TabLayoutService();
    manager.setManager(mockManagerWithModel);

    manager.focusTab('some-node-id');

    expect(mockDoAction).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockDoAction.mock.calls[0][0])).toBe(
      JSON.stringify({
        data: {tabNode: 'some-node-id'},
        type: 'FlexLayout_SelectTab',
      }),
    );
  });

  it('does not throw when no manager is set', () => {
    const manager = new TabLayoutService();

    expect(() => manager.focusTab('some-node-id')).not.toThrow();
  });
});

describe('tabLayoutService registration', () => {
  it('registers the module-level tabLayoutService with tabFocusRegistry', () => {
    const mockDoAction = jest.fn();
    tabLayoutService.setManager({
      state: {model: {doAction: mockDoAction}},
    } as any);

    tabFocusRegistry.focusTab('some-node-id');

    expect(mockDoAction).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockDoAction.mock.calls[0][0])).toBe(
      JSON.stringify({
        data: {tabNode: 'some-node-id'},
        type: 'FlexLayout_SelectTab',
      }),
    );
  });
});
