/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import type {IJsonModel} from 'flexlayout-react';

import {startSession} from '~entities/edit-session';
import {type ProjectInfo, ProjectService, SessionMode} from '~entities/project';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import {LogViewPanel} from '~features/log-view';
import {ModuleList} from '~features/module-list';
import type {
  ProjectLoadingState,
  ProjectOpenerHook,
} from '~features/project-operations';
import {useArcRecentProjects} from '~features/recent-projects';
import {SubgraphList} from '~features/subgraph-list';
import {SubsystemBrowser} from '~features/subsystem-browser';
import {ValidationResultPanel} from '~features/validation-result-view';
import {ConfigFileManager} from '~shared/config/config-manager';
import {
  GetFlexLayoutConfig,
  GRAPH_DESIGNER_COMPONENT_NAME,
  KEY_CONFIGURATOR_COMPONENT_NAME,
  LOG_VIEW_COMPONENT_NAME,
  MAIN_TAB_TITLE,
  migrateFlexLayoutConfig,
  MODULE_LIST_COMPONENT_NAME,
  PROPERTIES_PANEL_COMPONENT_NAME,
  SUBGRAPH_LIST_COMPONENT_NAME,
  SUBSYSTEM_BROWSER_COMPONENT_NAME,
  VALIDATION_RESULTS_COMPONENT_NAME,
} from '~shared/config/utils';
import {getIssueMessage, hasBlockingIssues} from '~shared/api';
import {showToast} from '~shared/controls/global-toaster';
import {logEventEmitter, logger, LogLevel} from '~shared/lib/logger';
import {
  createProjectStore,
  ProjectStoreContext,
  projectStoreRegistry,
  useProjectLayoutStore,
} from '~shared/store';
import {useGlobalStore} from '~shared/store/global-store';
import {tabStoreRegistry} from '~shared/store/tab-store-registry';
import {KeyConfiguratorPanel} from '~widgets/key-configurator-panel';
import {PropertiesPanelHost} from '~widgets/graph-designer/ui/properties-panel-host';
import {tabLayoutService} from '~widgets/project-layout/project-layout-manager';

interface UseProjectOpenerOptions {
  /** Callback for handling project close */
  onProjectClose: (projectId: string, projectName: string) => Promise<boolean>;
  /** Callback when project is successfully opened */
  onProjectOpened?: (project: ProjectInfo) => void;
  /** Screenshot registry for GraphDesigner */
  screenshotRegistry: Map<string, () => Promise<string | null>>;
}

/**
 * Hook for managing project opening operations
 * Handles both workspace file picker and recent project opening
 */
export function useProjectOpener({
  onProjectClose,
  onProjectOpened,
  screenshotRegistry,
}: UseProjectOpenerOptions): ProjectOpenerHook {
  const [loadingState, setLoadingState] = useState<ProjectLoadingState>({
    isLoading: false,
    message: '',
  });

  const {addToRecent} = useArcRecentProjects();

  const ensureInitialSessionMode = async (
    project: ProjectInfo,
  ): Promise<SessionMode | null> => {
    if (
      project.sessionMode === SessionMode.Designer ||
      project.sessionMode === SessionMode.Tuning
    ) {
      return project.sessionMode;
    }

    if (project.sessionMode !== SessionMode.Readonly) {
      // TODO: handle additional session modes (DiffMerge, Simulation, etc.)
      // as they gain real Graph Designer support.
      logger.warn('Project open rejected due to unsupported session mode', {
        action: 'open_project',
        component: 'useProjectOpener',
        projectId: project.id,
        tag: project.sessionMode,
      });
      showToast('Project is already open in another session mode', 'danger');
      return null;
    }

    const result = await startSession(project.id, SessionMode.Tuning);
    if (hasBlockingIssues(result) || !result.data) {
      logger.error('Failed to start tuning session for opened project', {
        action: 'start_tuning_session',
        component: 'useProjectOpener',
        projectId: project.id,
      });
      showToast(
        getIssueMessage(result, 'Failed to start tuning session'),
        'danger',
      );
      return null;
    }

    if (result.data.sessionMode !== SessionMode.Tuning) {
      logger.error('Tuning session started with unexpected session mode', {
        action: 'start_tuning_session',
        component: 'useProjectOpener',
        projectId: project.id,
        tag: result.data.sessionMode,
      });
      showToast('Failed to start tuning session', 'danger');
      return null;
    }

    return result.data.sessionMode;
  };

  /**
   * Common logic to handle successful project opening
   * Creates layout, loads GraphDesigner, and notifies callbacks
   */
  const handleProjectOpenSuccess = async (project: ProjectInfo) => {
    const layoutStore = useProjectLayoutStore.getState();
    const existingGroup = layoutStore.isProjectGroupAlreadyOpen(
      project.filepath,
    );
    if (existingGroup) {
      layoutStore.switchToProjectGroup(existingGroup.id);
      return;
    }

    const initialSessionMode = await ensureInitialSessionMode(project);
    if (!initialSessionMode) {
      return;
    }
    const openedProject = {...project, sessionMode: initialSessionMode};

    // Use saved layout if available (restores user's panel positions), otherwise
    // use default
    const savedLayout = ConfigFileManager.instance.getProjectConfigData(
      openedProject.id,
      'layout.flexLayout',
    );
    const isValidFlexLayout = (v: unknown): v is IJsonModel =>
      !!v && typeof v === 'object' && 'layout' in v;
    // Reconciles a saved layout against the current default — adds tabs the
    // developer added since the layout was last saved, and drops tabs whose
    // component the app no longer recognizes.
    const flexLayoutConfig = isValidFlexLayout(savedLayout)
      ? migrateFlexLayoutConfig(savedLayout)
      : GetFlexLayoutConfig();
    if (flexLayoutConfig !== savedLayout) {
      ConfigFileManager.instance.setProjectConfigData(
        openedProject.id,
        'layout.flexLayout',
        flexLayoutConfig,
      );
    }

    // mainTab.id is deterministically `project_${project.id}`, so both stores
    // can be created before registering the FlexLayout render callback — the
    // callback will therefore always receive fully-initialised contexts.
    const GraphDesigner = (
      await import('~widgets/graph-designer/ui/graph-designer')
    ).default;
    const mainTabId = `project_${openedProject.id}`;
    const tabStore = tabStoreRegistry.createTabStore<GraphDesignerStore>(
      mainTabId,
      'graph-designer',
      openedProject.id,
    );
    const projectStore = createProjectStore(openedProject.id);
    projectStoreRegistry.register(openedProject.id, projectStore);

    if (openedProject.sessionMode === SessionMode.Designer) {
      const resumed = await tabStore.getState().enterEditMode({resume: true});
      if (!resumed) {
        tabStoreRegistry.destroyTabStore(mainTabId);
        projectStoreRegistry.remove(openedProject.id);
        showToast("Couldn't resume designer mode", 'danger');
        return;
      }
    }

    // Add to recent projects
    addToRecent(openedProject);

    logger.info('Project opened successfully', {
      action: 'open_project',
      component: 'useProjectOpener',
      projectId: openedProject.id,
    });

    // Unsubscribe function for log event listener — called on project close
    let unsubscribeLogEvents: (() => void) | null = null;

    const mainTab = tabLayoutService.createProjectMainTab(
      openedProject.id,
      openedProject.filepath,
      MAIN_TAB_TITLE,
      openedProject.name,
      flexLayoutConfig,
      () => {
        unsubscribeLogEvents?.();
        tabStoreRegistry.destroyTabStore(mainTabId);
        projectStoreRegistry.remove(openedProject.id);
        return true;
      },
      (node: any) => {
        const component = node.getComponent();
        if (component === GRAPH_DESIGNER_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <GraphDesigner
                  projectId={openedProject.id}
                  screenshotRegistry={screenshotRegistry}
                  tabId={mainTab.id}
                />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === MODULE_LIST_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <ModuleList />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === SUBGRAPH_LIST_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <SubgraphList />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === SUBSYSTEM_BROWSER_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <SubsystemBrowser />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === LOG_VIEW_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <LogViewPanel />
            </ProjectStoreContext.Provider>
          );
        }
        if (component === KEY_CONFIGURATOR_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <KeyConfiguratorPanel />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === PROPERTIES_PANEL_COMPONENT_NAME) {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <GraphDesignerStoreContext.Provider value={tabStore}>
                <PropertiesPanelHost projectId={openedProject.id} />
              </GraphDesignerStoreContext.Provider>
            </ProjectStoreContext.Provider>
          );
        }
        if (component === VALIDATION_RESULTS_COMPONENT_NAME) {
          return (
            <GraphDesignerStoreContext.Provider value={tabStore}>
              <ValidationResultPanel />
            </GraphDesignerStoreContext.Provider>
          );
        }
        return null;
      },
      openedProject.description,
      onProjectClose,
    );

    // Route logger events into the project store so the log view panel
    // displays messages emitted via logger.info/warn/error.
    unsubscribeLogEvents = logEventEmitter.subscribe((event) => {
      if (event.projectId && event.projectId !== openedProject.id) {
        return;
      }
      let type: 'info' | 'warn' | 'error' = 'info';
      if (event.level === LogLevel.Warn) {
        type = 'warn';
      } else if (
        event.level === LogLevel.Error ||
        event.level === LogLevel.Critical
      ) {
        type = 'error';
      }
      projectStore.getState().addLog({
        detail: event.context ? JSON.stringify(event.context) : undefined,
        message: event.message,
        timestamp: event.timestamp.getTime(),
        type,
      });
    });

    // Register the project in the global store and set it as active so
    // components that read useGlobalStore(s => s.activeProjectId) work.
    useGlobalStore
      .getState()
      .registerProjectGroup(openedProject.id, openedProject.filepath);
    useGlobalStore.getState().setActiveProject(openedProject.id);

    // Notify parent component
    onProjectOpened?.(openedProject);

    showToast('Project opened successfully', 'success');
  };

  /**
   * Opens a recent project by project info
   */
  const openRecentProject = async (project: ProjectInfo) => {
    setLoadingState({
      isLoading: true,
      message: `Opening project: ${project.name}`,
    });

    try {
      const result = await ProjectService.openRecentProject(project);

      if (result.success && result.project) {
        setLoadingState({
          isLoading: true,
          message: 'Loading project data...',
        });
        await handleProjectOpenSuccess(result.project);
      } else {
        showToast(result.message || 'Failed to open project', 'danger');
      }
    } catch (error) {
      logger.error('Error in openRecentProject', {
        action: 'open_recent_project',
        component: 'useProjectOpener',
        error: error instanceof Error ? error.message : String(error),
      });
      showToast('Failed to open project', 'danger');
    } finally {
      setLoadingState({
        isLoading: false,
        message: '',
      });
    }
  };

  /**
   * Opens a workspace project using file picker
   */
  const openWorkspaceProject = async () => {
    setLoadingState({
      isLoading: true,
      message: 'Opening file picker...',
    });

    try {
      const result = await ProjectService.openWorkspaceProjectFromFile();

      // User cancelled - not an error
      if (!result.success && result.message === 'File selection cancelled') {
        setLoadingState({
          isLoading: false,
          message: '',
        });
        return;
      }

      if (result.success && result.project) {
        setLoadingState({
          isLoading: true,
          message: 'Processing AWSP/ACDB files in the project ...',
        });

        // Small delay to show the processing message
        await new Promise((resolve) => setTimeout(resolve, 100));

        setLoadingState({
          isLoading: true,
          message: 'Loading project data...',
        });

        await handleProjectOpenSuccess(result.project);
      } else {
        showToast(result.message || 'Failed to open project', 'danger');
      }
    } catch (error) {
      logger.error('Error in openWorkspaceProject', {
        action: 'open_workspace_project',
        component: 'useProjectOpener',
        error: error instanceof Error ? error.message : String(error),
      });
      showToast('Failed to open workspace project', 'danger');
    } finally {
      setLoadingState({
        isLoading: false,
        message: '',
      });
    }
  };

  return {
    loadingState,
    openRecentProject,
    openWorkspaceProject,
  };
}
