/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {AppSlice, Preferences} from '../global-store.types';

const DEFAULT_PREFERENCES: Preferences = {
  maxOpenProjects: 5,
  showModuleIds: false,
  showSubgraphIds: false,
  theme: 'light',
};

export function createAppSlice(
  set: (partial: Partial<AppSlice>) => void,
  get: () => AppSlice,
): AppSlice {
  return {
    activeProjectId: null,
    preferences: DEFAULT_PREFERENCES,
    selectedUsecaseIds: [],

    setActiveProject: (projectId: string | null) => {
      set({activeProjectId: projectId});
      logger.debug('Active project set', {
        action: 'set_active_project',
        component: 'AppSlice',
        projectId,
      });
    },

    setSelectedUsecaseIds: (ids: string[]) => {
      set({selectedUsecaseIds: ids});
      logger.debug('Selected usecase IDs updated', {
        action: 'set_selected_usecase_ids',
        component: 'AppSlice',
      });
    },

    updatePreferences: (prefs: Partial<Preferences>) => {
      const current = get().preferences;
      const updated = {...current, ...prefs};
      set({preferences: updated});
      logger.debug('Preferences updated', {
        action: 'update_preferences',
        component: 'AppSlice',
      });
    },
  };
}
