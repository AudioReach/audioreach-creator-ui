/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';
import {PanelTabEntity, useProjectLayoutStore} from '~shared/store';
import {PanelId} from '~shared/store/project-layout.types';

import LogViewPanel from './log-view-panel';

// Unique ID for the log view panel
const LOG_VIEW_PANEL_ID = 'log-view-panel';
const LOG_VIEW_PANEL_TITLE = 'Log View';

/**
 * Search for a panel with specific ID in FlexLayout JSON structure
 */
function findPanelInLayout(layoutData: any, panelId: string): boolean {
  if (!layoutData) {
    return false;
  }

  // Search in center layout
  const searchInNode = (node: any): boolean => {
    if (node.id === panelId) {
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (searchInNode(child)) {
          return true;
        }
      }
    }
    return false;
  };

  // Search in center panel
  if (layoutData.layout && searchInNode(layoutData.layout)) {
    return true;
  }

  // Search in borders
  if (layoutData.borders) {
    for (const border of layoutData.borders) {
      if (border.children) {
        for (const tab of border.children) {
          if (tab.id === panelId) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Hook to manage log view panel visibility
 */
export function useLogView() {
  const store = useProjectLayoutStore();

  /**
   * Check if log view is currently open in the active project tab
   */
  const isLogViewOpen = (): boolean => {
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    const layoutJson = store.getLayoutConfig(mainTabId);
    if (layoutJson) {
      try {
        const layoutData = JSON.parse(layoutJson);
        return findPanelInLayout(layoutData, LOG_VIEW_PANEL_ID);
      } catch (error) {
        logger.error(`Error parsing layout JSON:${error}`);
        return false;
      }
    }

    return false;
  };

  /**
   * Show the log view panel
   */
  const showLogView = (): boolean => {
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot show log view.');
      return false;
    }

    const mainTabId = activeProjectGroup.mainTab.id;

    if (isLogViewOpen()) {
      logger.info('[LOG VIEW] Already open, skipping');
      return true;
    }

    const layoutConfig = store.getLayoutConfig(mainTabId);
    if (!layoutConfig) {
      logger.error(`[LOG VIEW] Main tab not found:${mainTabId}`);
      return false;
    }

    const logViewPanel = new PanelTabEntity(
      LOG_VIEW_PANEL_TITLE,
      <LogViewPanel />,
      (_tabId: string, _tabName: string) => {
        return true;
      },
      (_tabId: string, _tabName: string) => {
        logger.info('Log view cleaned up due to project close');
      },
    );

    // Force a stable, well-known tab ID so we can detect/remove correctly
    (logViewPanel as any).id = LOG_VIEW_PANEL_ID;

    const result = store.addPanelTab(
      mainTabId,
      PanelId.BottomPanel,
      logViewPanel,
    );
    return result;
  };

  /**
   * Hide the log view panel
   */
  const hideLogView = (): boolean => {
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot hide log view.');
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    // Check if log view is open
    if (!isLogViewOpen()) {
      return true;
    }

    // Remove the panel
    return store.removePanelTab(mainTabId, LOG_VIEW_PANEL_ID);
  };

  /**
   * Toggle log view visibility
   */
  const toggleLogView = (): boolean => {
    if (isLogViewOpen()) {
      return hideLogView();
    } else {
      return showLogView();
    }
  };

  return {
    hideLogView,
    isLogViewOpen,
    showLogView,
    toggleLogView,
  };
}
