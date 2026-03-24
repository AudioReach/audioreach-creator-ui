/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';
import {PanelTabEntity, useProjectLayoutStore} from '~shared/store';
import {PanelId} from '~shared/store/project-layout.types';

import ModuleListPanel from './module-list-panel';

// Unique ID for the module list panel
const MODULE_LIST_PANEL_ID = 'module-list-panel';
const MODULE_LIST_PANEL_TITLE = 'Module List';

// Type definitions for FlexLayout structure
interface LayoutNode {
  children?: LayoutNode[];
  id?: string;
}

interface LayoutBorder {
  children?: Array<{id?: string}>;
}

interface LayoutData {
  borders?: LayoutBorder[];
  layout?: LayoutNode;
}

/**
 * Recursively search for a panel ID in a layout node tree
 */
function searchInNode(node: LayoutNode, panelId: string): boolean {
  if (node.id === panelId) {
    return true;
  }
  if (node.children) {
    return node.children.some((child) => searchInNode(child, panelId));
  }
  return false;
}

/**
 * Search for a panel ID in layout borders
 */
function searchInBorders(borders: LayoutBorder[], panelId: string): boolean {
  return borders.some(
    (border) =>
      border.children?.some((tab) => tab.id === panelId) ?? false,
  );
}

/**
 * Search for a panel with specific ID in FlexLayout JSON structure
 */
function findPanelInLayout(layoutData: LayoutData, panelId: string): boolean {
  if (!layoutData) {
    return false;
  }

  // Search in center panel
  if (layoutData.layout && searchInNode(layoutData.layout, panelId)) {
    return true;
  }

  // Search in borders
  if (layoutData.borders && searchInBorders(layoutData.borders, panelId)) {
    return true;
  }

  return false;
}

/**
 * Hook to manage module list panel visibility
 */
export function useModuleList() {
  const store = useProjectLayoutStore();

  /**
   * Check if module list is currently open in the active project tab
   */
  const isModuleListOpen = (): boolean => {
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    const layoutJson = store.getLayoutConfig(mainTabId);
    if (layoutJson) {
      try {
        const layoutData = JSON.parse(layoutJson) as LayoutData;
        return findPanelInLayout(layoutData, MODULE_LIST_PANEL_ID);
      } catch (error) {
        logger.error(`Error parsing layout JSON:${String(error)}`);
        return false;
      }
    }

    return false;
  };

  /**
   * Show the module list panel
   */
  const showModuleList = (): boolean => {
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot show module list.');
      return false;
    }

    const mainTabId = activeProjectGroup.mainTab.id;
    // Check if Already Open
    if (isModuleListOpen()) {
      logger.info('[MODULE LIST] Already open, skipping');
      return true;
    }
    // Validate Layout Exists
    const layoutConfig = store.getLayoutConfig(mainTabId);
    if (!layoutConfig) {
      logger.error(`[MODULE LIST] Main tab not found:${mainTabId}`);
      return false;
    }
    // Ensure we have a valid layout to add panel to
    const moduleListPanel = new PanelTabEntity(
      MODULE_LIST_PANEL_TITLE,
      <ModuleListPanel />,
      (_tabId: string, _tabName: string) => {
        return true;
      },
      (_tabId: string, _tabName: string) => {
        logger.info('Module list cleaned up due to project close');
      },
    );

    // Force a stable, well-known tab ID so we can detect/remove correctly
    (moduleListPanel as PanelTabEntity & {id: string}).id =
      MODULE_LIST_PANEL_ID;

    const result = store.addPanelTab(
      mainTabId,
      PanelId.LeftPanel,
      moduleListPanel,
    );
    return result;
  };

  /**
   * Hide the module list panel
   */
  const hideModuleList = (): boolean => {
    // Check if Project Exists
    const activeProjectGroup = store.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot hide module list.');
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    // Check if module list is open
    if (!isModuleListOpen()) {
      return true;
    }

    // Remove the panel
    return store.removePanelTab(mainTabId, MODULE_LIST_PANEL_ID);
  };

  /**
   * Toggle module list visibility
   */
  const toggleModuleList = (): boolean => {
    if (isModuleListOpen()) {
      return hideModuleList();
    } else {
      return showModuleList();
    }
  };

  return {
    hideModuleList,
    isModuleListOpen,
    showModuleList,
    toggleModuleList,
  };
}
