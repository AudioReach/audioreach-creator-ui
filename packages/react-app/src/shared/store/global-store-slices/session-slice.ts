/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {AppTab, SessionSlice} from '../global-store.types';

function generateTabId(tabType: string): string {
  return `app-tab-${tabType}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createSessionSlice(
  set: (partial: Partial<SessionSlice>) => void,
  get: () => SessionSlice,
): SessionSlice {
  return {
    activeAppTabId: null,

    appTabs: [],

    closeAppTab: (tabId: string): void => {
      const state = get();
      const remaining = state.appTabs.filter((t) => t.id !== tabId);
      const newActiveId =
        state.activeAppTabId === tabId
          ? (remaining[remaining.length - 1]?.id ?? null)
          : state.activeAppTabId;
      set({activeAppTabId: newActiveId, appTabs: remaining});
      logger.debug('App tab closed', {
        action: 'close_app_tab',
        component: 'SessionSlice',
      });
    },

    openAppTab: (tabType: string, title: string, tabId?: string): string => {
      const existing = get().appTabs.find((t) => t.tabType === tabType);
      if (existing) {
        set({activeAppTabId: existing.id});
        return existing.id;
      }
      const id = tabId ?? generateTabId(tabType);
      const newTab: AppTab = {id, tabType, title};
      set({
        activeAppTabId: id,
        appTabs: [...get().appTabs, newTab],
      });
      logger.debug('App tab opened', {
        action: 'open_app_tab',
        component: 'SessionSlice',
      });
      return id;
    },

    setActiveAppTab: (tabId: string): void => {
      set({activeAppTabId: tabId});
    },
  };
}
