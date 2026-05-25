/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {openWorkspaceProject} from '~entities/project/api/projects-api';
import {logger} from '~shared/lib/logger';

import {useGlobalStore} from './global-store';
import type {ProjectStore} from './project-store.types';
import {generateId} from './tab-entities';

// ── Types ──────────────────────────────────────────────────────────────────

// App-level tabs (Start, Settings, etc.) that live outside any project.
// No ReactNode stored here — the renderer resolves the component from tabType.
export interface AppTab {
  id: string;
  tabType: string;
  title: string;
}

export interface ProjectGroup {
  // Assigned once on creation, cycles 1–20. Used as a color indicator so all
  // tabs belonging to the same project share a consistent visual identity.
  colorId: number;
  filePath: string;
  projectId: string;
  // The full ProjectStore instance — wired by the project-opening flow.
  store: ProjectStore | null;
}

interface SessionStore {
  activeAppTabId: string | null;
  // App-level tabs shared across all projects (LLD §5.1).
  appTabs: AppTab[];

  closeAppTab: (tabId: string) => void;
  createProjectGroup: (
    acdbFile: File,
    workspaceFile: File,
    filePath: string,
    projectName?: string,
    projectDescription?: string,
  ) => Promise<void>;

  // ── App tab actions ──────────────────────────────────────────────────────

  // Cycles 1–20 to assign distinct color IDs to each new project group.
  nextColorId: number;
  // Opens a tab of the given type. Idempotent: if a tab with the same tabType
  // already exists it is activated rather than duplicated.
  // tabId — callers can supply a pre-generated ID to share with AppTabEntity.
  openAppTab: (tabType: string, title: string, tabId?: string) => string;
  // Open project groups.
  projectGroups: ProjectGroup[];

  // ── Project group actions ────────────────────────────────────────────────

  // Used by the project-opening flow (which already has the projectId from the
  // backend) to register a project group without going through the full
  // createProjectGroup flow.
  registerProjectGroup: (
    projectId: string,
    filePath: string,
    projectStore: ProjectStore,
  ) => void;

  removeProjectGroup: (projectId: string) => void;
  setActiveAppTab: (tabId: string) => void;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  activeAppTabId: null,
  appTabs: [],
  closeAppTab: (tabId: string): void => {
    set((state) => {
      const remaining = state.appTabs.filter((t) => t.id !== tabId);
      const newActiveId =
        state.activeAppTabId === tabId
          ? (remaining[remaining.length - 1]?.id ?? null)
          : state.activeAppTabId;

      return {activeAppTabId: newActiveId, appTabs: remaining};
    });

    logger.debug('App tab closed', {
      action: 'close_app_tab',
      component: 'SessionStore',
    });
  },
  createProjectGroup: async (
    acdbFile: File,
    workspaceFile: File,
    filePath: string,
    projectName?: string,
    projectDescription?: string,
  ): Promise<void> => {
    const existing = get().projectGroups.find((pg) => pg.filePath === filePath);

    if (existing) {
      useGlobalStore.getState().setActiveProject(existing.projectId);
      logger.debug('Project already open — switching to existing', {
        action: 'create_project_group',
        component: 'SessionStore',
        projectId: existing.projectId,
      });
      return;
    }

    const result = await openWorkspaceProject(
      acdbFile,
      workspaceFile,
      projectName,
      projectDescription,
    );

    if (!result.success || !result.data) {
      logger.error('Failed to open project via backend', {
        action: 'create_project_group',
        component: 'SessionStore',
        error: result.message,
      });
      throw new Error(result.message ?? 'Failed to open project');
    }

    const projectId = result.data.projectId;

    set((state) => {
      const assignedColorId = state.nextColorId;
      return {
        nextColorId: (assignedColorId % 20) + 1,
        projectGroups: [
          ...state.projectGroups,
          {colorId: assignedColorId, filePath, projectId, store: null},
        ],
      };
    });

    useGlobalStore.getState().setActiveProject(projectId);
    useGlobalStore.getState().upsertRecentProject({
      filePath,
      lastOpenedAt: Date.now(),
      projectId,
      projectName: result.data.name ?? projectName ?? filePath,
    });

    logger.debug('Project group created', {
      action: 'create_project_group',
      component: 'SessionStore',
      projectId,
    });
  },

  nextColorId: 1,

  openAppTab: (tabType: string, title: string, tabId?: string): string => {
    const existing = get().appTabs.find((t) => t.tabType === tabType);
    if (existing) {
      set({activeAppTabId: existing.id});
      return existing.id;
    }

    const id = tabId ?? generateId(`app-tab-${tabType}`);
    const newTab: AppTab = {id, tabType, title};

    set((state) => ({
      activeAppTabId: id,
      appTabs: [...state.appTabs, newTab],
    }));

    logger.debug('App tab opened', {
      action: 'open_app_tab',
      component: 'SessionStore',
    });

    return id;
  },

  projectGroups: [],

  registerProjectGroup: (
    projectId: string,
    filePath: string,
    projectStore: ProjectStore,
  ): void => {
    const existing = get().projectGroups.find(
      (pg) => pg.projectId === projectId,
    );
    if (existing) {
      return;
    }

    set((state) => {
      const assignedColorId = state.nextColorId;
      return {
        nextColorId: (assignedColorId % 20) + 1,
        projectGroups: [
          ...state.projectGroups,
          {colorId: assignedColorId, filePath, projectId, store: projectStore},
        ],
      };
    });

    logger.debug('Project group registered', {
      action: 'register_project_group',
      component: 'SessionStore',
      projectId,
    });
  },

  removeProjectGroup: (projectId: string): void => {
    const wasActive = useGlobalStore.getState().activeProjectId === projectId;

    const group = get().projectGroups.find((pg) => pg.projectId === projectId);
    group?.store?.closeProject();

    set((prev) => ({
      projectGroups: prev.projectGroups.filter(
        (pg) => pg.projectId !== projectId,
      ),
    }));

    if (wasActive) {
      const remaining = get().projectGroups;
      const nextId =
        remaining.length > 0
          ? (remaining[remaining.length - 1]?.projectId ?? null)
          : null;
      useGlobalStore.getState().setActiveProject(nextId);
    }

    logger.debug('Project group removed', {
      action: 'remove_project_group',
      component: 'SessionStore',
      projectId,
    });
  },

  setActiveAppTab: (tabId: string): void => {
    set({activeAppTabId: tabId});
  },
}));
