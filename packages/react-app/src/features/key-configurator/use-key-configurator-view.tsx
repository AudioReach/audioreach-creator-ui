/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {logger} from '~shared/lib/logger';
import {PanelId} from '~shared/store/project-layout.types';
import {
  PanelTabEntity,
  useProjectLayoutStore,
} from '~shared/store/use-project-layout-store';
import {KeyConfiguratorPanel} from '~widgets/key-configurator-panel';

// Unique ID for the Key Configurator view panel
const KEY_CONFIGURATOR_VIEW_PANEL_ID = 'key-configurator-view-panel';
const KEY_CONFIGURATOR_VIEW_PANEL_TITLE = 'Key Configurator';

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

export function useKeyConfiguratorView() {
  const projectLayoutStore = useProjectLayoutStore();

  const isKeyConfiguratorViewOpen = (): boolean => {
    const activeProjectGroup = projectLayoutStore.getActiveProjectGroup();
    if (!activeProjectGroup) {
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    const layoutJson = projectLayoutStore.getLayoutConfig(mainTabId);
    if (layoutJson) {
      try {
        const layoutData = JSON.parse(layoutJson);
        return findPanelInLayout(layoutData, KEY_CONFIGURATOR_VIEW_PANEL_ID);
      } catch (error) {
        logger.error(`Error parsing layout JSON:${error}`);
        return false;
      }
    }

    return false;
  };

  /**
   * Show the key configurator view panel
   */
  const showKeyConfiguratorView = (): boolean => {
    const activeProjectGroup = projectLayoutStore.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot show log view.');
      return false;
    }

    const mainTabId = activeProjectGroup.mainTab.id;

    if (isKeyConfiguratorViewOpen()) {
      logger.info('[KEY CONFIGURATOR VIEW] Already open, skipping');
      return true;
    }

    const layoutConfig = projectLayoutStore.getLayoutConfig(mainTabId);
    if (!layoutConfig) {
      logger.error(`[KEY CONFIGURATOR VIEW] Main tab not found:${mainTabId}`);
      return false;
    }

    const keyConfiguratorViewPanel = new PanelTabEntity(
      KEY_CONFIGURATOR_VIEW_PANEL_TITLE,
      <KeyConfiguratorPanel />,
      (_tabId: string, _tabName: string) => {
        return true;
      },
      (_tabId: string, _tabName: string) => {
        logger.info('Key configurator view cleaned up due to project close');
      },
    );

    // Force a stable, well-known tab ID so we can detect/remove correctly
    (keyConfiguratorViewPanel as any).id = KEY_CONFIGURATOR_VIEW_PANEL_ID;

    const result = projectLayoutStore.addPanelTab(
      mainTabId,
      PanelId.RightPanel,
      keyConfiguratorViewPanel,
    );
    return result;
  };

  /**
   * Hide the key configurator view panel
   */
  const hideKeyConfiguratorView = (): boolean => {
    const activeProjectGroup = projectLayoutStore.getActiveProjectGroup();
    if (!activeProjectGroup) {
      logger.warn('No active project group found. Cannot hide log view.');
      return false;
    }

    // Use main tab ID which has the FlexLayout
    const mainTabId = activeProjectGroup.mainTab.id;

    // Check if key configurator view is open
    if (!isKeyConfiguratorViewOpen()) {
      return true;
    }

    // Remove the panel
    return projectLayoutStore.removePanelTab(
      mainTabId,
      KEY_CONFIGURATOR_VIEW_PANEL_ID,
    );
  };

  /**
   * Toggle key configurator view visibility
   */
  const toggleKeyConfiguratorView = (): boolean => {
    if (isKeyConfiguratorViewOpen()) {
      return hideKeyConfiguratorView();
    } else {
      return showKeyConfiguratorView();
    }
  };

  return {
    hideKeyConfiguratorView,
    isKeyConfiguratorViewOpen,
    showKeyConfiguratorView,
    toggleKeyConfiguratorView,
  };
}
