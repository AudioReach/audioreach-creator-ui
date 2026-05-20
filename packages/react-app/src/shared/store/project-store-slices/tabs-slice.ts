/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';

import type {TabType} from '../global-store.types';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TabEntry {
  tabId: string;
  tabType: TabType;
  title: string;
}

export interface TabsSlice {
  activeTabId: string | null;
  closeTab: (tabId: string) => void;

  // tabId is optional — callers can supply a pre-generated ID to share it with
  // the inner panel layout (PanelIntegration). When omitted, one is generated.
  openTab: (type: TabType, title: string, tabId?: string) => string;

  renameTab: (tabId: string, title: string) => void;
  setActiveTab: (tabId: string) => void;
  // Stack of previously active tab IDs.
  // Used to restore the previously active tab when the active tab is closed.
  tabHistory: string[];
  tabs: TabEntry[];
}

// ── Slice creator ──────────────────────────────────────────────────────────

export function createTabsSlice(
  set: (partial: Partial<TabsSlice>) => void,
  get: () => TabsSlice,
): TabsSlice {
  return {
    activeTabId: null,
    closeTab: (tabId: string): void => {
      logger.debug('Closing tab', {
        action: 'close_tab',
        component: 'TabsSlice',
      });

      const current = get();
      const isActive = current.activeTabId === tabId;
      const filteredHistory = current.tabHistory.filter((id) => id !== tabId);

      let newActiveTabId: string | null = current.activeTabId;
      let newHistory = filteredHistory;

      if (isActive) {
        newActiveTabId =
          filteredHistory.length > 0
            ? (filteredHistory[filteredHistory.length - 1] ?? null)
            : null;
        newHistory = filteredHistory.slice(0, -1);
      }

      set({
        activeTabId: newActiveTabId,
        tabHistory: newHistory,
        tabs: current.tabs.filter((t) => t.tabId !== tabId),
      });

      logger.debug('Tab closed', {
        action: 'close_tab',
        component: 'TabsSlice',
      });
    },
    openTab: (type: TabType, title: string, tabId?: string): string => {
      const id =
        tabId ??
        `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const currentActiveTabId = get().activeTabId;

      logger.debug('Opening tab', {
        action: 'open_tab',
        component: 'TabsSlice',
      });

      const newTab: TabEntry = {
        tabId: id,
        tabType: type,
        title,
      };

      const current = get();
      set({
        activeTabId: id,
        tabHistory: currentActiveTabId
          ? [...current.tabHistory, currentActiveTabId]
          : current.tabHistory,
        tabs: [...current.tabs, newTab],
      });

      logger.debug('Tab opened', {
        action: 'open_tab',
        component: 'TabsSlice',
      });

      return id;
    },

    renameTab: (tabId: string, title: string): void => {
      logger.debug('Renaming tab', {
        action: 'rename_tab',
        component: 'TabsSlice',
      });

      set({
        tabs: get().tabs.map((t) => (t.tabId === tabId ? {...t, title} : t)),
      });
    },

    setActiveTab: (tabId: string): void => {
      const currentActiveTabId = get().activeTabId;

      logger.debug('Setting active tab', {
        action: 'set_active_tab',
        component: 'TabsSlice',
      });

      set({
        activeTabId: tabId,
        tabHistory: currentActiveTabId
          ? [...get().tabHistory, currentActiveTabId]
          : get().tabHistory,
      });
    },

    tabHistory: [],

    tabs: [],
  };
}
