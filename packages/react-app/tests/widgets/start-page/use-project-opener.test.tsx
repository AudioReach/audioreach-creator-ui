/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

const mockAddToRecent = jest.fn();
const mockCreateProjectStore = jest.fn(() => ({}));
const mockRegisterProjectStore = jest.fn();
const mockRegisterProjectGroup = jest.fn();
const mockSetActiveProject = jest.fn();
const mockIsProjectGroupAlreadyOpen = jest.fn(() => null);
const mockSwitchToProjectGroup = jest.fn();
const mockPublishValidationResults = jest.fn();

jest.mock('~shared/lib/logger', () => ({
  logEventEmitter: {
    subscribe: jest.fn(() => jest.fn()),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    verbose: jest.fn(),
    warn: jest.fn(),
  },
  LogLevel: {
    Critical: 'critical',
    Error: 'error',
    Info: 'info',
    Warn: 'warn',
  },
}));
jest.mock('~entities/project', () => ({
  ProjectService: {
    openRecentProject: jest.fn(),
    openWorkspaceProjectFromFile: jest.fn(),
  },
  SessionMode: {
    Designer: 'DESIGNER',
    Readonly: 'READONLY',
    Tuning: 'TUNING',
  },
}));
jest.mock('~entities/edit-session', () => ({
  startSession: jest.fn(),
}));
jest.mock('~features/recent-projects', () => ({
  useArcRecentProjects: () => ({addToRecent: mockAddToRecent}),
}));
jest.mock('~shared/controls/global-toaster', () => ({
  showToast: jest.fn(),
}));
jest.mock('~features/graph-designer', () => {
  const React = jest.requireActual('react');
  return {
    GraphDesignerStoreContext: React.createContext(null),
    mapIssueToValidationResult: jest.fn((issue) => ({
      errorCode: issue.code,
      message: issue.message,
      severity: issue.severity === 'WARNING' ? 'warning' : 'error',
    })),
    publishValidationResults: mockPublishValidationResults,
  };
});
jest.mock('~widgets/graph-designer/ui/graph-designer', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('~features/log-view', () => ({LogViewPanel: () => null}));
jest.mock('~features/module-list', () => ({ModuleList: () => null}));
jest.mock('~features/subgraph-list', () => ({SubgraphList: () => null}));
jest.mock('~features/subsystem-browser', () => ({
  SubsystemBrowser: () => null,
}));
jest.mock('~features/validation-result-view', () => ({
  ValidationResultPanel: () => null,
}));
jest.mock('~widgets/key-configurator-panel', () => ({
  KeyConfiguratorPanel: () => null,
}));
jest.mock('~widgets/graph-designer/ui/properties-panel-host', () => ({
  PropertiesPanelHost: () => null,
}));
jest.mock('~shared/config/config-manager', () => ({
  ConfigFileManager: {
    instance: {
      getProjectConfigData: jest.fn(() => null),
      setProjectConfigData: jest.fn(),
    },
  },
}));
jest.mock('~widgets/project-layout/project-layout-manager', () => ({
  tabLayoutService: {
    createProjectMainTab: jest.fn(() => ({id: 'project_project-1'})),
  },
}));
jest.mock('~shared/store/tab-store-registry', () => ({
  tabStoreRegistry: {
    createTabStore: jest.fn(),
    destroyTabStore: jest.fn(),
  },
}));
jest.mock('~shared/store/global-store', () => ({
  useGlobalStore: {
    getState: jest.fn(() => ({
      registerProjectGroup: mockRegisterProjectGroup,
      setActiveProject: mockSetActiveProject,
    })),
  },
}));
jest.mock('~shared/store', () => {
  const React = jest.requireActual('react');
  return {
    createProjectStore: mockCreateProjectStore,
    ProjectStoreContext: React.createContext(null),
    projectStoreRegistry: {
      register: mockRegisterProjectStore,
      remove: jest.fn(),
    },
    useProjectLayoutStore: {
      getState: jest.fn(() => ({
        isProjectGroupAlreadyOpen: mockIsProjectGroupAlreadyOpen,
        switchToProjectGroup: mockSwitchToProjectGroup,
      })),
    },
  };
});

import {act, renderHook} from '@testing-library/react';

import {startSession} from '~entities/edit-session';
import {ProjectService} from '~entities/project';
import {publishValidationResults} from '~features/graph-designer';
import {tabStoreRegistry} from '~shared/store/tab-store-registry';
import {useProjectOpener} from '~widgets/start-page/use-project-opener';

const mockOpenWorkspaceProjectFromFile = jest.mocked(
  ProjectService.openWorkspaceProjectFromFile,
);
const mockedPublishValidationResults = jest.mocked(publishValidationResults);
const mockCreateTabStore = jest.mocked(tabStoreRegistry.createTabStore);
const mockStartSession = jest.mocked(startSession);

describe('useProjectOpener workspace open validation issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsProjectGroupAlreadyOpen.mockReturnValue(null);
    mockStartSession.mockResolvedValue({
      data: {projectId: 'project-1', sessionMode: 'TUNING', summary: ''},
    });
  });

  it('publishes successful workspace-open issues after creating the tab store', async () => {
    const store = {getState: jest.fn()} as never;
    mockCreateTabStore.mockReturnValue(store);
    mockOpenWorkspaceProjectFromFile.mockResolvedValue({
      issues: [
        {
          code: 'OPEN_WARN_001',
          message: 'Opened with warning',
          severity: 'WARNING',
        },
      ],
      project: {
        description: 'Project description',
        filepath: '/tmp/project.awsp',
        id: 'project-1',
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        name: 'Project 1',
        sessionMode: 'READONLY',
      },
      success: true,
    });

    const {result} = renderHook(() =>
      useProjectOpener({
        onProjectClose: jest.fn(),
        screenshotRegistry: new Map(),
      }),
    );

    await act(async () => {
      await result.current.openWorkspaceProject();
    });

    expect(mockedPublishValidationResults).toHaveBeenCalledWith(store, [
      {
        errorCode: 'OPEN_WARN_001',
        message: 'Opened with warning',
        severity: 'warning',
      },
    ]);
  });

  it('does not publish validation rows when workspace open fails', async () => {
    mockOpenWorkspaceProjectFromFile.mockResolvedValue({
      message: 'Failed to open project',
      success: false,
    });

    const {result} = renderHook(() =>
      useProjectOpener({
        onProjectClose: jest.fn(),
        screenshotRegistry: new Map(),
      }),
    );

    await act(async () => {
      await result.current.openWorkspaceProject();
    });

    expect(mockedPublishValidationResults).not.toHaveBeenCalled();
  });
});
