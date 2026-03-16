/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {create} from 'zustand';

import {logger} from '~shared/lib/logger';

import {
  FilterType,
  isModuleLeafNode,
  isSubgraphLeafNode,
  isSubsystemLeafNode,
  type ItemListStore,
  type TreeNode,
} from './module-list-types';

export const useItemListStore = create<ItemListStore>((set) => ({
  addItem: (itemData: TreeNode) => {
    try {
      const generateModuleWithIds = (data: TreeNode): TreeNode => {
        const id =
          data.id || `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

        if (isModuleLeafNode(data)) {
          // ModuleLeafNode -  module properties
          return {
            category: data.category,
            group: data.group,
            id,
            isCustomModule: data.isCustomModule,
            moduleType: data.moduleType,
            name: data.name,
            tooltip: data.tooltip,
          };
        } else if (isSubgraphLeafNode(data)) {
          // SubgraphLeafNode - subgraph properties
          return {
            category: data.category,
            id,
            name: data.name,
            subgraphId:
              data.subgraphId ||
              `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
            subgraphName: data.subgraphName,
            subgraphType: data.subgraphType,
          };
        } else if (isSubsystemLeafNode(data)) {
          // SubsystemLeafNode - basic properties
          return {
            category: data.category,
            id,
            name: data.name,
            tooltip: data.tooltip,
          };
        } else {
          // ModuleBranchNode - has nodes property
          return {
            id,
            name: data.name,
            nodes: data.nodes?.map((child: TreeNode) =>
              generateModuleWithIds(child),
            ),
          };
        }
      };

      set((state) => ({
        items: [...state.items, generateModuleWithIds(itemData)],
      }));
      return true;
    } catch (error) {
      logger.error(`Failed to add module: ${error}`);
      return false;
    }
  },
  expandedValue: [],
  filterState: {
    [FilterType.Dsp]: true,
    [FilterType.Module]: false,
  },
  // Drag control - disabled by default
  isDragEnabled: true,
  items: [],
  loadedProjectId: null,
  query: '',
  setDragEnabled: (enabled) => {
    try {
      set({isDragEnabled: enabled});
      return true;
    } catch (error) {
      logger.error(`Failed to set drag enabled state: ${error}`);
      return false;
    }
  },

  setExpandedValue: (value) => {
    try {
      set({expandedValue: value});
      return true;
    } catch (error) {
      logger.error(`Failed to set expanded value: ${error}`);
      return false;
    }
  },

  setFilterState: (filterState) => {
    try {
      set({filterState});
      return true;
    } catch (error) {
      logger.error(`Failed to set filter state: ${error}`);
      return false;
    }
  },

  setItems: (items: TreeNode[]) => {
    try {
      set({items});
      return true;
    } catch (error) {
      logger.error(`Failed to set items: ${error}`);
      return false;
    }
  },
  setLoadedProjectId: (projectId: string | null) => {
    try {
      set({loadedProjectId: projectId});
      return true;
    } catch (error) {
      logger.error(`Failed to set loaded project ID: ${error}`);
      return false;
    }
  },
  setSearchString: (query: string) => {
    try {
      set({query});
      return true;
    } catch (error) {
      logger.error(`Failed to set query: ${error}`);
      return false;
    }
  },
}));
