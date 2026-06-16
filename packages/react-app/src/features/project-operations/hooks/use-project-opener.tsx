/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useState} from 'react';

import type {IJsonModel} from 'flexlayout-react';

import type ProjectInfo from '~entities/project/model/project-info.types';
import {ProjectService} from '~entities/project/services/project-service';
import {
  type GraphDesignerStore,
  GraphDesignerStoreContext,
} from '~features/graph-designer';
import {LogViewPanel} from '~features/log-view';
import {ModuleList} from '~features/module-list/ui/module-list';
import useArcRecentProjects from '~features/recent-projects/hooks/use-recent-projects';
import {SubgraphList} from '~features/subgraph-list/ui/subgraph-list';
import {ConfigFileManager} from '~shared/config/config-manager';
import {
  GetFlexLayoutConfig,
  GRAPH_DESIGNER_COMPONENT_NAME,
} from '~shared/config/utils';
import {showToast} from '~shared/controls/global-toaster';
import {PanelIntegration} from '~shared/layout/project-layout-manager';
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

import type {ProjectLoadingState, ProjectOpenerHook} from '../model/types';

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

  /**
   * Common logic to handle successful project opening
   * Creates layout, loads GraphDesigner, and notifies callbacks
   */
  const handleProjectOpenSuccess = async (
    project: ProjectInfo,
    usecaseData: any[],
  ) => {
    // If the project file is already open, just activate its tab.
    const existingProject = useGlobalStore
      .getState()
      .openProjects.find((pg) => pg.filePath === project.filepath);
    if (existingProject) {
      useGlobalStore.getState().setActiveProject(existingProject.projectId);
      return;
    }

    // Add to recent projects
    addToRecent(project);

    logger.info('Project opened successfully', {
      action: 'open_project',
      component: 'useProjectOpener',
      projectId: project.id,
    });

    // Create project group in the ProjectLayoutStore
    const layoutStore = useProjectLayoutStore.getState();

    // Use saved layout if available (restores user's panel positions), otherwise
    // use default
    const savedLayout = ConfigFileManager.instance.getProjectConfigData(
      project.filepath,
      'layout.flexLayout',
    );
    const isValidFlexLayout = (v: unknown): v is IJsonModel =>
      !!v && typeof v === 'object' && 'layout' in v;
    const flexLayoutConfig = isValidFlexLayout(savedLayout)
      ? savedLayout
      : GetFlexLayoutConfig();

    // mainTab.id is deterministically `project_${project.id}`, so both stores
    // can be created before registering the FlexLayout render callback — the
    // callback will therefore always receive fully-initialised contexts.
    const GraphDesigner = (
      await import('~widgets/graph-designer/ui/graph-designer')
    ).default;
    const mainTabId = `project_${project.id}`;
    const tabStore = tabStoreRegistry.createTabStore<GraphDesignerStore>(
      mainTabId,
      'graph-designer',
      project.id,
    );
    const projectStore = createProjectStore(project.id);
    projectStoreRegistry.register(project.id, projectStore);

    // Unsubscribe function for log event listener — called on project close
    let unsubscribeLogEvents: (() => void) | null = null;

    const mainTab = PanelIntegration.createProjectMainTab(
      project.filepath,
      mainTabId,
      () => {
        unsubscribeLogEvents?.();
        tabStoreRegistry.destroyTabStore(mainTabId);
        projectStoreRegistry.remove(project.id);
        return true;
      },
      (node: any) => {
        const component = node.getComponent();
        const name =
          typeof node.getName === 'function' ? node.getName() : undefined;
        if (
          component === GRAPH_DESIGNER_COMPONENT_NAME ||
          name === 'Graph Designer'
        ) {
          return (
            <GraphDesignerStoreContext.Provider value={tabStore}>
              <GraphDesigner
                projectGroupId={project.id}
                screenshotRegistry={screenshotRegistry}
                tabId={mainTab.id}
                usecaseData={usecaseData}
              />
            </GraphDesignerStoreContext.Provider>
          );
        }
        if (component === 'module-list' || name === 'Module List') {
          return (
            <GraphDesignerStoreContext.Provider value={tabStore}>
              <ModuleList />
            </GraphDesignerStoreContext.Provider>
          );
        }
        if (component === 'subgraph-list' || name === 'Subgraph List') {
          return (
            <GraphDesignerStoreContext.Provider value={tabStore}>
              <SubgraphList />
            </GraphDesignerStoreContext.Provider>
          );
        }
        if (component === 'log-view' || name === 'Log View') {
          return (
            <ProjectStoreContext.Provider value={projectStore}>
              <LogViewPanel />
            </ProjectStoreContext.Provider>
          );
        }
        if (component === 'key-configurator' || name === 'Key Configurator') {
          return (
            <GraphDesignerStoreContext.Provider value={tabStore}>
              <KeyConfiguratorPanel />
            </GraphDesignerStoreContext.Provider>
          );
        }
        return null;
      },
      flexLayoutConfig,
    );

    // Route logger events into the project store so the log view panel
    // displays messages emitted via logger.info/warn/error.
    unsubscribeLogEvents = logEventEmitter.subscribe((event) => {
      if (event.projectId && event.projectId !== project.id) {
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
      .registerProjectGroup(project.id, project.filepath);
    useGlobalStore.getState().setActiveProject(project.id);

    // Create the project group in layout store with screenshot callback
    layoutStore.createProjectGroup(
      project.id,
      project.filepath,
      project.name,
      mainTab,
      project.description,
      onProjectClose, // onClose callback - captures screenshot before unmount
    );

    // Notify parent component
    onProjectOpened?.(project);

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
        await handleProjectOpenSuccess(
          result.project,
          result.usecaseData || [],
        );
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

        await handleProjectOpenSuccess(
          result.project,
          result.usecaseData || [],
        );
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
