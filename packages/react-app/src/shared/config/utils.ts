/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  IJsonModel,
  IJsonRowNode,
  IJsonTabNode,
  IJsonTabSetNode,
} from 'flexlayout-react';

import {logger} from '~shared/lib/logger';

export type JSONDataMap = {
  [key: string]: any;
};

export const GRAPH_DESIGNER_COMPONENT_NAME = 'graph-designer';
export const MODULE_LIST_COMPONENT_NAME = 'module-list';
export const LOG_VIEW_COMPONENT_NAME = 'log-view';
export const SUBGRAPH_LIST_COMPONENT_NAME = 'subgraph-list';
export const KEY_CONFIGURATOR_COMPONENT_NAME = 'key-configurator';
export const VALIDATION_RESULTS_COMPONENT_NAME = 'validation-results';
export const PLACEHOLDER_COMPONENT_NAME = 'placeholder';
export const MAIN_TAB_TITLE = 'Graph Designer';
export const MODULE_LIST_TAB_TITLE = 'Module List';
export const LOG_VIEW_TAB_TITLE = 'Log View';
export const SUBGRAPH_LIST_TAB_TITLE = 'Subgraph List';
export const KEY_CONFIGURATOR_TAB_TITLE = 'Key Configurator';
export const VALIDATION_RESULTS_TAB_TITLE = 'Validation Results';
export const LEFT_TABSET_ID = 'left-tabset';
export const CENTER_TABSET_ID = 'center-tabset';
export const BOTTOM_TABSET_ID = 'bottom-tabset';
export const RIGHT_TABSET_ID = 'right-tabset';
export const ROOT_LAYOUT_ID = 'root';
export const TOP_ROW_ID = 'top-row';
export const BOTTOM_ROW_ID = 'bottom-row';
/**
 * Constant representing an invalid/undefined project ID
 */
export const INVALID_PROJECT_ID = 'project_undefined';

export function getFlexLayoutGlobalConfig(
  global: IJsonModel['global'] = {},
): NonNullable<IJsonModel['global']> {
  return {
    ...global,
    tabSetEnableClose: true,
    tabSetEnableCloseButton: false,
    tabSetEnableDeleteWhenEmpty: true,
  };
}

/**
 * Check if a project ID is valid
 * @param projectId - The project ID to validate
 * @returns true if the project ID is valid, false otherwise
 */
export function isValidProjectId(
  projectId: string | undefined,
): projectId is string {
  return !!projectId && projectId !== INVALID_PROJECT_ID;
}

export const graphDesignerLayout = {
  component: GRAPH_DESIGNER_COMPONENT_NAME,
  position: {
    area: 'center',
    weight: 100,
  },
};

/**
 * Creates the complete FlexLayout JSON configuration for a project
 * This includes the main tab (GraphDesigner) and border panels
 * @returns Complete IJsonModel ready to use with FlexLayout
 */
export function GetFlexLayoutConfig(): IJsonModel {
  // Tab nodes
  const moduleListTab: IJsonTabNode = {
    component: MODULE_LIST_COMPONENT_NAME,
    enableClose: false,
    id: MODULE_LIST_COMPONENT_NAME,
    name: MODULE_LIST_TAB_TITLE,
    type: 'tab',
  };

  const graphDesignerTab: IJsonTabNode = {
    component: GRAPH_DESIGNER_COMPONENT_NAME,
    id: GRAPH_DESIGNER_COMPONENT_NAME,
    name: MAIN_TAB_TITLE,
    type: 'tab',
  };

  const logViewTab: IJsonTabNode = {
    component: LOG_VIEW_COMPONENT_NAME,
    enableClose: false,
    id: LOG_VIEW_COMPONENT_NAME,
    name: LOG_VIEW_TAB_TITLE,
    type: 'tab',
  };

  const subgraphListTab: IJsonTabNode = {
    component: SUBGRAPH_LIST_COMPONENT_NAME,
    enableClose: false,
    id: SUBGRAPH_LIST_COMPONENT_NAME,
    name: SUBGRAPH_LIST_TAB_TITLE,
    type: 'tab',
  };

  const keyConfiguratorTab: IJsonTabNode = {
    component: KEY_CONFIGURATOR_COMPONENT_NAME,
    enableClose: false,
    id: KEY_CONFIGURATOR_COMPONENT_NAME,
    name: KEY_CONFIGURATOR_TAB_TITLE,
    type: 'tab',
  };

  const validationResultTab: IJsonTabNode = {
    component: VALIDATION_RESULTS_COMPONENT_NAME,
    enableClose: false,
    id: VALIDATION_RESULTS_COMPONENT_NAME,
    name: VALIDATION_RESULTS_TAB_TITLE,
    type: 'tab',
  };

  // Tabset nodes
  const leftModuleTabset: IJsonTabSetNode = {
    children: [moduleListTab],
    id: LEFT_TABSET_ID,
    type: 'tabset',
    weight: 50,
  };

  const leftSubgraphTabset: IJsonTabSetNode = {
    children: [subgraphListTab],
    type: 'tabset',
    weight: 50,
  };

  const leftColumn: IJsonRowNode = {
    children: [leftModuleTabset, leftSubgraphTabset],
    type: 'row',
    weight: 20,
  };

  const centerTabset: IJsonTabSetNode = {
    children: [graphDesignerTab],
    enableDivide: false,
    enableDrag: false,
    enableDrop: false,
    enableTabStrip: false,
    id: CENTER_TABSET_ID,
    type: 'tabset',
    weight: 80,
  };

  const bottomTabset: IJsonTabSetNode = {
    children: [logViewTab, validationResultTab],
    id: BOTTOM_TABSET_ID,
    type: 'tabset',
    weight: 20,
  };

  const rightTabset: IJsonTabSetNode = {
    children: [keyConfiguratorTab],
    id: RIGHT_TABSET_ID,
    type: 'tabset',
    weight: 20,
  };

  const topRow: IJsonRowNode = {
    children: [leftColumn, centerTabset, rightTabset],
    id: TOP_ROW_ID,
    type: 'row',
    weight: 80,
  };

  const bottomRow: IJsonRowNode = {
    children: [bottomTabset],
    id: BOTTOM_ROW_ID,
    type: 'row',
    weight: 20,
  };

  const flexLayoutConfig: IJsonModel = {
    borders: [],
    global: getFlexLayoutGlobalConfig({
      rootOrientationVertical: true,
    }),
    layout: {
      children: [topRow, bottomRow],
      id: ROOT_LAYOUT_ID,
      type: 'row',
    },
  };

  return flexLayoutConfig;
}

type LayoutTreeNode = IJsonRowNode | IJsonTabSetNode;

const isTabSet = (node: LayoutTreeNode): node is IJsonTabSetNode =>
  node.type === 'tabset';

// Every tabset in a layout tree, flattened.
function collectTabsets(node: LayoutTreeNode, into: IJsonTabSetNode[]): void {
  if (isTabSet(node)) {
    into.push(node);
    return;
  }
  for (const child of node.children ?? []) {
    collectTabsets(child, into);
  }
}

// Every tab id anywhere in a set of tabsets.
function collectTabIds(tabsets: IJsonTabSetNode[]): Set<string> {
  const ids = new Set<string>();
  for (const tabset of tabsets) {
    for (const tab of tabset.children ?? []) {
      if (tab.id) {
        ids.add(tab.id);
      }
    }
  }
  return ids;
}

// Finds center's parent row — its siblings there are left (before) and right
// (after) center.
function findCenterParent(node: LayoutTreeNode): IJsonRowNode | null {
  if (isTabSet(node)) {
    return null;
  }
  if ((node.children ?? []).some((child) => child.id === CENTER_TABSET_ID)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findCenterParent(child);
    if (found) {
      return found;
    }
  }
  return null;
}

// Finds the direct child of root that contains CENTER_TABSET_ID at any depth —
// the "top area" node. Bottom is whichever root children this is not.
function findTopAreaNode(root: IJsonRowNode): LayoutTreeNode | null {
  const containsCenter = (node: LayoutTreeNode): boolean => {
    if (node.id === CENTER_TABSET_ID) {
      return true;
    }
    return !isTabSet(node) && (node.children ?? []).some(containsCenter);
  };
  return (root.children ?? []).find(containsCenter) ?? null;
}

type TabPosition = 'bottom' | 'left' | 'right';

// Maps every default tab id to its position, derived from GetFlexLayoutConfig()
// itself so this can never drift out of sync with the actual default layout.
function getDefaultTabPositions(
  defaultLayout: IJsonRowNode,
): Map<string, TabPosition> {
  const positions = new Map<string, TabPosition>();

  const assignPositions = (nodes: LayoutTreeNode[], position: TabPosition) => {
    const tabsets: IJsonTabSetNode[] = [];
    nodes.forEach((node) => collectTabsets(node, tabsets));
    tabsets.forEach((tabset) =>
      (tabset.children ?? []).forEach((tab) => {
        if (tab.id) {
          positions.set(tab.id, position);
        }
      }),
    );
  };

  const centerParent = findCenterParent(defaultLayout);
  if (centerParent) {
    const centerIndex = (centerParent.children ?? []).findIndex(
      (child) => child.id === CENTER_TABSET_ID,
    );
    assignPositions(
      (centerParent.children ?? []).slice(0, centerIndex),
      'left',
    );
    assignPositions(
      (centerParent.children ?? []).slice(centerIndex + 1),
      'right',
    );
  }

  const topAreaNode = findTopAreaNode(defaultLayout);
  assignPositions(
    (defaultLayout.children ?? []).filter((child) => child !== topAreaNode),
    'bottom',
  );

  return positions;
}

// Pushes into the first tabset found among candidateNodes, or inserts a
// fresh tabset via insertFallback when none exist yet.
function insertIntoFirstTabsetOrCreate(
  candidateNodes: LayoutTreeNode[],
  tab: IJsonTabNode,
  insertFallback: () => void,
): void {
  const tabsets: IJsonTabSetNode[] = [];
  candidateNodes.forEach((node) => collectTabsets(node, tabsets));
  if (tabsets.length > 0) {
    (tabsets[0].children ??= []).push(tab);
  } else {
    insertFallback();
  }
}

// Inserts a tab into the saved tree at the given position, reusing an
// existing tabset there if one exists, or creating a fresh one otherwise.
function insertTabAtPosition(
  savedRoot: IJsonRowNode,
  tab: IJsonTabNode,
  position: TabPosition,
): void {
  if (position === 'bottom') {
    const topAreaNode = findTopAreaNode(savedRoot);
    insertIntoFirstTabsetOrCreate(
      (savedRoot.children ?? []).filter((child) => child !== topAreaNode),
      tab,
      () =>
        (savedRoot.children ??= []).push({children: [tab], type: 'tabset'}),
    );
    return;
  }

  // Search only within the top area, so bottom (also a root child) isn't mistaken
  // for a right sibling of center.
  const topAreaNode = findTopAreaNode(savedRoot);
  const centerParent = topAreaNode ? findCenterParent(topAreaNode) : null;
  if (!centerParent) {
    return;
  }
  const centerIndex = (centerParent.children ?? []).findIndex(
    (child) => child.id === CENTER_TABSET_ID,
  );
  const siblingRange =
    position === 'left'
      ? (centerParent.children ?? []).slice(0, centerIndex)
      : (centerParent.children ?? []).slice(centerIndex + 1);

  insertIntoFirstTabsetOrCreate(siblingRange, tab, () => {
    const insertIndex = position === 'left' ? centerIndex : centerIndex + 1;
    (centerParent.children ??= []).splice(insertIndex, 0, {
      children: [tab],
      type: 'tabset',
    });
  });
}

// Adds missing default tabs and removes any tab the app doesn't create.
// Matches by tab id, since a tab's id stays fixed no matter where it's dragged to.
export function migrateFlexLayoutConfig(savedLayout: IJsonModel): IJsonModel {
  const defaultLayout = GetFlexLayoutConfig().layout;
  const defaultTabsets: IJsonTabSetNode[] = [];
  collectTabsets(defaultLayout, defaultTabsets);

  const defaultTabs: IJsonTabNode[] = [];
  defaultTabsets.forEach((tabset) =>
    (tabset.children ?? []).forEach((tab) => defaultTabs.push(tab)),
  );
  const defaultTabIds = collectTabIds(defaultTabsets);

  const savedTabsets: IJsonTabSetNode[] = [];
  collectTabsets(savedLayout.layout, savedTabsets);
  const savedTabIds = collectTabIds(savedTabsets);

  const missingTabs = defaultTabs.filter(
    (tab) =>
      tab.id &&
      tab.id !== GRAPH_DESIGNER_COMPONENT_NAME &&
      !savedTabIds.has(tab.id),
  );

  // A tab is stale unless its id matches a real default tab, or it's a placeholder
  // tab.
  const isStaleTab = (tab: IJsonTabNode): boolean =>
    tab.component !== PLACEHOLDER_COMPONENT_NAME &&
    (!tab.id || !defaultTabIds.has(tab.id));
  const hasStaleTab = savedTabsets.some((tabset) =>
    (tabset.children ?? []).some(isStaleTab),
  );

  if (missingTabs.length === 0 && !hasStaleTab) {
    return savedLayout;
  }

  const migrated = JSON.parse(JSON.stringify(savedLayout)) as IJsonModel;

  if (missingTabs.length > 0) {
    const positions = getDefaultTabPositions(defaultLayout);
    missingTabs.forEach((tab) => {
      const position = tab.id ? positions.get(tab.id) : undefined;
      if (!position) {
        return;
      }
      logger.info(
        `migrateFlexLayoutConfig: tab "${tab.id}" missing from saved layout, reinserting at ${position}`,
      );
      insertTabAtPosition(migrated.layout, tab, position);
    });
  }

  if (hasStaleTab) {
    const migratedTabsets: IJsonTabSetNode[] = [];
    collectTabsets(migrated.layout, migratedTabsets);
    migratedTabsets.forEach((tabset) => {
      tabset.children = (tabset.children ?? []).filter(
        (tab) => !isStaleTab(tab),
      );
      // Removing the selected tab can leave `selected` invalid, showing a blank tab
      // area until the user clicks another tab.
      if (
        tabset.children.length > 0 &&
        (tabset.selected === undefined ||
          tabset.selected >= tabset.children.length)
      ) {
        tabset.selected = 0;
      }
    });
  }

  return migrated;
}

/* returns either a primitive value (like true, 42, "bottom") or
 * an object (like the usecase object) or even undefined if the path doesn't
 * exist. To reflect that this function can return any value found at the path,
 * not just an object we use any
 */
export function getConfigData(
  jsonData: JSONDataMap,
  path: string,
  rootKey?: string,
): any {
  const data = rootKey ? jsonData[rootKey] : jsonData;
  return path
    .split('.')
    .reduce(
      (accumulator, currentValue) => accumulator && accumulator[currentValue],
      data,
    );
}

/*
This function will overwrite primitives.
Example:
const jsonData = { arcconfig: { project1: 'data' } };
setConfigData(jsonData, 'project1.modified', true);
Output:{ arcconfig: { project1: { modified: true } } };
*/
export function setConfigData(
  jsonData: JSONDataMap,
  path: string,
  newValue: any,
  rootKey?: string,
): void {
  let presentData = rootKey ? jsonData[rootKey] : jsonData;
  const pathArray = path.split('.');
  pathArray.forEach((currentElement, index) => {
    if (index === pathArray.length - 1) {
      // Set the value at the final path element
      presentData[currentElement] = newValue;
    } else {
      // If the next element doesn't exist or is not an object, overwrite with an
      // empty object
      if (
        typeof presentData[currentElement] !== 'object' ||
        presentData[currentElement] === null
      ) {
        presentData[currentElement] = {};
      }
      presentData = presentData[currentElement];
    }
  });
}
