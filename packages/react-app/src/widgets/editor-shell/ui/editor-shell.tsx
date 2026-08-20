/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useEffect, useRef} from 'react';

import {createPortal} from 'react-dom';

import {ProgressRing} from '@qualcomm-ui/react/progress-ring';

import {PanelIconBar} from '~features/panel-collapse';
import {useProjectSaver} from '~features/project-operations';
import {ConfigFileManager} from '~shared/config/config-manager';
import {ArcSideNav} from '~shared/controls/arc-side-nav';
import {GlobalToaster} from '~shared/controls/global-toaster';
import {
  SideNavProvider,
  useSideNavContext,
} from '~shared/controls/side-nav-provider';
import {logger} from '~shared/lib/logger';
import {useKeyboardShortcuts} from '~shared/lib/side-nav';
import {Theme} from '~entities/appearance';
import {useTheme} from '~shared/providers/theme-provider';
import {AppTabEntity, useProjectLayoutStore} from '~shared/store';
import {useGlobalStore} from '~shared/store/global-store';
import {TabGroupType} from '~shared/store/project-layout.types';
import {projectStoreRegistry} from '~shared/store/project-store-registry';
import ProjectLayoutManager from '~widgets/project-layout/project-layout-manager';
import ArcStartPage from '~widgets/start-page/ui/arc-start-page';

import {releaseUsecaseEditLocks} from '../lib/release-usecase-edit-locks';

const EditorShellContent: React.FC = () => {
  const {keyboardShortcuts} = useSideNavContext();
  const [theme] = useTheme();
  const flexLayoutThemeClass =
    theme === Theme.DARK ? 'flexlayout__theme_dark' : 'flexlayout__theme_light';

  // Enable keyboard shortcuts for the active tab
  useKeyboardShortcuts(keyboardShortcuts, true);

  return (
    <div
      className={`flex h-screen flex-col ${flexLayoutThemeClass} bg-primary`}
    >
      <GlobalToaster />
      <div className="border-neutral-02 text-neutral-primary flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <div className="text-neutral-primary text-lg font-semibold">
            AudioReach™ Creator
          </div>
        </div>
        <PanelIconBar />
      </div>

      <div className="bg-primary relative flex flex-1">
        <div className="relative z-10">
          <ArcSideNav />
        </div>
        <div className="relative z-0 flex-1">
          <ProjectLayoutManager />
        </div>
      </div>
    </div>
  );
};

export const EditorShell: React.FC = () => {
  const store = useProjectLayoutStore();
  const initializedRef = useRef(false);
  const {isSaving, saveAllProjects, saveProject, saveProjectAs} =
    useProjectSaver();

  // Set up IPC listeners for Save, Save As, and Save All
  useEffect(() => {
    if (!window.saveFileApi) {
      return;
    }

    const getActiveProject = () => {
      const state = useGlobalStore.getState();
      const activeId = state.activeProjectId;
      if (!activeId) {
        return null;
      }
      const projectGroup = state.openProjects.find(
        (p) => p.projectId === activeId,
      );
      return projectGroup ? {activeId, projectGroup} : null;
    };

    const unsubscribeSaveProject = window.saveFileApi.onSaveProject(() => {
      const active = getActiveProject();
      if (!active) {
        return;
      }
      void saveProject(active.activeId, active.projectGroup.filePath);
    });

    const unsubscribeSaveProjectAs = window.saveFileApi.onSaveProjectAs(() => {
      const active = getActiveProject();
      if (!active) {
        return;
      }
      void saveProjectAs(active.activeId, active.projectGroup.filePath);
    });

    const unsubscribeSaveAll = window.saveFileApi.onSaveAll(
      () => void saveAllProjects(),
    );

    return () => {
      unsubscribeSaveProject();
      unsubscribeSaveProjectAs();
      unsubscribeSaveAll();
    };
  }, [saveProject, saveProjectAs, saveAllProjects]);

  // Monitor active tab group and update menu state accordingly
  useEffect(() => {
    if (!window.projectContextApi) {
      return;
    }

    const activeTabGroup = store.activeTabGroup;

    // Check if we're currently viewing a project tab (not Start page)
    const isViewingProject =
      activeTabGroup?.groupType === TabGroupType.ProjectGroup;

    // Update project context in menu
    if (isViewingProject) {
      window.projectContextApi
        .setProjectContext(true)
        .catch((error: unknown) => {
          logger.error('Failed to set project context', {
            action: 'set_project_context',
            component: 'EditorShell',
            error: error instanceof Error ? error.message : String(error),
          });
        });
    } else {
      // We're on Start page or no active group - hide menu
      window.projectContextApi
        .setProjectContext(false)
        .catch((error: unknown) => {
          logger.error('Failed to clear project context', {
            action: 'clear_project_context',
            component: 'EditorShell',
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }
  }, [store.activeTabGroup]);

  // Initialize with a default app group and Start tab
  useEffect(() => {
    // Ensure initialization happens only once (important for React 18 Strict Mode)
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    // Check if default app group already exists
    const defaultAppGroup = store.appGroups.find(
      (ag) => ag.id === 'default-app-group',
    );

    if (!defaultAppGroup) {
      // Create Start tab
      const startTab = new AppTabEntity('Start', <ArcStartPage />);

      // Clone the component with the actual tab ID
      startTab.component = <ArcStartPage tabId={startTab.id} />;

      // Create default app group with Start tab
      store.createAppGroup('default-app-group', 'Application', [startTab]);
    }
  }, [store]);

  // Save configuration on app exit
  useEffect(() => {
    const handleBeforeUnload = () => {
      releaseUsecaseEditLocks(projectStoreRegistry);

      // beforeunload is synchronous, so we can't reliably await async operations
      // Just trigger the save without waiting
      ConfigFileManager.instance.save().catch((error) => {
        logger.error('Failed to save configuration on exit', {
          action: 'save_config_on_exit',
          component: 'EditorShell',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Also save on component unmount
      ConfigFileManager.instance.save().catch((error) => {
        logger.error('Failed to save configuration on unmount', {
          action: 'save_config_on_unmount',
          component: 'EditorShell',
          error: error instanceof Error ? error.message : String(error),
        });
      });
    };
  }, []);

  return (
    <SideNavProvider>
      {isSaving &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-sm"
            style={{
              backgroundColor:
                'color-mix(in oklab, var(--color-surface-overlay) 50%, transparent)',
            }}
          >
            <div className="bg-raised rounded-lg p-8 shadow-xl">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <ProgressRing />
                </div>
                <div className="text-neutral-primary mb-2 text-lg font-semibold">
                  Saving...
                </div>
                <div className="text-neutral-secondary text-sm">
                  Please wait...
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      <EditorShellContent />
    </SideNavProvider>
  );
};
