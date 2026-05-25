/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {StoreApi} from 'zustand';

import {logger} from '~shared/lib/logger';

import type {SliceStatus} from '../global-store.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubsystemBrowserTreeNode {
  children: SubsystemBrowserTreeNode[];
  id: number;
  name: string;
  subgraphIds: string[];
}

export interface SubsystemSlice {
  addSubsystem: (node: SubsystemBrowserTreeNode, parentId?: number) => void;
  loadSubsystems: () => Promise<void>;
  removeSubsystem: (id: number) => void;
  renameSubsystem: (id: number, newName: string) => void;
  setSubsystemData: (data: SubsystemBrowserTreeNode[]) => void;
  subsystemData: SubsystemBrowserTreeNode[];
  subsystemStatus: SliceStatus;
}

type SetState<T> = StoreApi<T>['setState'];
type GetState<T> = StoreApi<T>['getState'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addNodeToTree(
  tree: SubsystemBrowserTreeNode[],
  node: SubsystemBrowserTreeNode,
  parentId: number,
): SubsystemBrowserTreeNode[] {
  return tree.map((n) => {
    if (n.id === parentId) {
      return {...n, children: [...n.children, node]};
    }
    return {...n, children: addNodeToTree(n.children, node, parentId)};
  });
}

function removeNodeFromTree(
  tree: SubsystemBrowserTreeNode[],
  id: number,
): SubsystemBrowserTreeNode[] {
  return tree
    .filter((n) => n.id !== id)
    .map((n) => ({
      ...n,
      children: removeNodeFromTree(n.children, id),
    }));
}

function renameNodeInTree(
  tree: SubsystemBrowserTreeNode[],
  id: number,
  newName: string,
): SubsystemBrowserTreeNode[] {
  return tree.map((n) => {
    if (n.id === id) {
      return {...n, name: newName};
    }
    return {...n, children: renameNodeInTree(n.children, id, newName)};
  });
}

// ---------------------------------------------------------------------------
// Slice creator
// ---------------------------------------------------------------------------

/**
 * Creates the subsystem slice for composing into a tab store.
 * Used in GraphDesignerStore only.
 *
 * subsystemData and subsystemStatus are managed by loadGraphData (graph-data-slice),
 * which builds the subsystem tree from the same getUsecaseComponents response it
 * already fetches. loadSubsystems is kept for interface compatibility but is a no-op.
 *
 * @param set - Zustand set function bound to the parent store state.
 * @param get - Zustand get function bound to the parent store state.
 * @returns The initial state and actions for the subsystem slice.
 */
export function createSubsystemSlice<S extends SubsystemSlice>(
  set: SetState<S>,
  get: GetState<S>,
): SubsystemSlice {
  const setSlice = set as SetState<SubsystemSlice>;
  const getSlice = get as GetState<SubsystemSlice>;
  return {
    addSubsystem: (node: SubsystemBrowserTreeNode, parentId?: number) => {
      logger.debug('subsystemSlice: addSubsystem', {
        action: 'addSubsystem',
        component: 'subsystemSlice',
      });

      const {subsystemData} = getSlice();

      if (parentId === undefined) {
        setSlice({subsystemData: [...subsystemData, node]});
      } else {
        setSlice({subsystemData: addNodeToTree(subsystemData, node, parentId)});
      }
    },

    loadSubsystems: async () => {
      logger.debug(
        'subsystemSlice: loadSubsystems — no-op, data is loaded by loadGraphData',
        {
          action: 'loadSubsystems',
          component: 'subsystemSlice',
        },
      );
    },

    removeSubsystem: (id: number) => {
      logger.debug('subsystemSlice: removeSubsystem', {
        action: 'removeSubsystem',
        component: 'subsystemSlice',
      });

      const {subsystemData} = getSlice();
      setSlice({subsystemData: removeNodeFromTree(subsystemData, id)});
    },

    renameSubsystem: (id: number, newName: string) => {
      logger.debug('subsystemSlice: renameSubsystem', {
        action: 'renameSubsystem',
        component: 'subsystemSlice',
      });

      const {subsystemData} = getSlice();
      setSlice({subsystemData: renameNodeInTree(subsystemData, id, newName)});
    },

    setSubsystemData: (data: SubsystemBrowserTreeNode[]) => {
      logger.debug('subsystemSlice: setSubsystemData', {
        action: 'setSubsystemData',
        component: 'subsystemSlice',
      });
      setSlice({subsystemData: data});
    },

    subsystemData: [],

    subsystemStatus: 'uninitialized',
  };
}
