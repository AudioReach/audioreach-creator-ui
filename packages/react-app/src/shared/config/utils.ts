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

export type JSONDataMap = {
  [key: string]: any;
};

export const GRAPH_DESIGNER_COMPONENT_NAME = 'usecase';
/**
 * Constant representing an invalid/undefined project ID
 */
export const INVALID_PROJECT_ID = 'project_undefined';

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
    component: 'module-list',
    enableClose: false,
    id: 'module-list-panel',
    name: 'Module List',
    type: 'tab',
  };

  const graphDesignerTab: IJsonTabNode = {
    component: GRAPH_DESIGNER_COMPONENT_NAME,
    id: 'usecase-main',
    name: 'Graph Designer',
    type: 'tab',
  };

  const logViewTab: IJsonTabNode = {
    component: 'log-view',
    enableClose: false,
    id: 'log-view-panel',
    name: 'Log View',
    type: 'tab',
  };

  const subgraphListTab: IJsonTabNode = {
    component: 'subgraph-list',
    enableClose: false,
    id: 'subgraph-list-panel',
    name: 'Subgraph List',
    type: 'tab',
  };

  // Tabset nodes
  const leftTabset: IJsonTabSetNode = {
    children: [moduleListTab],
    type: 'tabset',
    weight: 20,
  };

  const centerTabset: IJsonTabSetNode = {
    children: [graphDesignerTab],
    enableDivide: false,
    enableDrop: false,
    enableTabStrip: false,
    id: 'center-panel',
    type: 'tabset',
    weight: 80,
  };

  const bottomTabset: IJsonTabSetNode = {
    children: [logViewTab],
    type: 'tabset',
    weight: 20,
  };

  const rightTabset: IJsonTabSetNode = {
    children: [subgraphListTab],
    type: 'tabset',
    weight: 20,
  };

  const centerColumn: IJsonRowNode = {
    children: [centerTabset, bottomTabset],
    type: 'column',
    weight: 60,
  };

  const flexLayoutConfig: IJsonModel = {
    borders: [],
    layout: {
      children: [leftTabset, centerColumn, rightTabset],
      id: 'root',
      type: 'row',
    },
  };

  return flexLayoutConfig;
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
