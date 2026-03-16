/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';
import {useProjectLayoutStore} from '~shared/store';

// Module list panel constants
export const MODULE_LIST_PANEL_ID = 'module-list-panel';
export const MODULE_LIST_PANEL_TITLE = 'Module List';

/**
 * Check if the Module List panel is currently open in the active tab
 * @returns true if Module List is open, false otherwise
 */
export const isModuleListOpen = (): boolean => {
  const store = useProjectLayoutStore.getState();
  const activeProjectGroup = store.getActiveProjectGroup();

  if (!activeProjectGroup) {
    return false;
  }

  // Check in the currently active tab
  const activeTab = store.activeTab;
  const targetTabId = activeTab?.id || activeProjectGroup.mainTab.id;
  const layoutJson = store.getLayoutConfig(targetTabId);

  if (layoutJson) {
    try {
      const layoutData = JSON.parse(layoutJson);

      // Search for module list panel ID in layout
      const findPanel = (node: any): boolean => {
        if (node.id === MODULE_LIST_PANEL_ID) {
          return true;
        }
        if (node.children) {
          return node.children.some((child: any) => findPanel(child));
        }
        return false;
      };

      // Check in center panel
      if (layoutData.layout && findPanel(layoutData.layout)) {
        return true;
      }

      // Check in borders
      if (layoutData.borders) {
        return layoutData.borders.some((border: any) =>
          border.children?.some((tab: any) => tab.id === MODULE_LIST_PANEL_ID),
        );
      }
    } catch (error) {
      logger.error(`Error parsing layout JSON: ${String(error)}`);
    }
  }

  return false;
};
