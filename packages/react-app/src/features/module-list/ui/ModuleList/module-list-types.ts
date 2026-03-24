/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

// categories
export enum Category {
  Subsystems = 'subsystems',
  Modules = 'modules',
  Subgraphs = 'subgraphs',
}

export enum FilterType {
  Dsp = 'dsp',
  Module = 'module',
}

export enum SubgraphType {
  Stream = 'stream',
  Device = 'device',
  StreamDevice = 'stream-device',
  StreamPp = 'stream-pp',
  DevicePp = 'device-pp',
}

export interface BranchNode {
  id?: string;
  name: string;
  nodes: TreeNode[];
}

// Base interface for all leaf nodes
interface BaseLeafNode {
  id?: string;
  name: string;
  nodes?: TreeNode[];
  tooltip: string;
}

// interface for Modules
export interface ModuleLeafNode extends BaseLeafNode {
  category: 'modules';
  group?: string; // Module Type filtering (3-level hierarchy)
  isCustomModule?: boolean;
  moduleType: 'dsp' | 'module';
}

// interface for subsystems
export interface SubsystemLeafNode extends BaseLeafNode {
  category: 'subsystems';
}

// interface for subgraphs
export interface SubgraphLeafNode extends Omit<BaseLeafNode, 'tooltip'> {
  category: 'subgraphs';
  subgraphId: string;
  subgraphName: string;
  subgraphType: SubgraphType;
}

// Union type for all leaf nodes
export type LeafNode = ModuleLeafNode | SubsystemLeafNode | SubgraphLeafNode;

// Union type for all nodes (branches and leaves)
export type TreeNode = BranchNode | LeafNode;

// Type guards for specific leaf node types
export function isModuleLeafNode(node: TreeNode): node is ModuleLeafNode {
  return 'category' in node && node.category === 'modules';
}

export function isSubsystemLeafNode(node: TreeNode): node is SubsystemLeafNode {
  return 'category' in node && node.category === 'subsystems';
}

export function isSubgraphLeafNode(node: TreeNode): node is SubgraphLeafNode {
  return 'category' in node && node.category === 'subgraphs';
}

export interface ItemListStore {
  addItem: (itemData: TreeNode) => boolean;
  // Tracks which branch nodes are expanded
  expandedValue: string[];
  // Tracks which module types are visible (DSP/Module checkboxes)
  filterState: ModuleFilterState;
  // Controls whether modules can be dragged
  isDragEnabled: boolean;
  // Stores the complete tree structure (branches and leaves)
  items: TreeNode[];
  // Tracks which project has been loaded to prevent re-fetching
  loadedProjectId: string | null;
  // Stores the current search text from the TextInput
  query: string;
  setDragEnabled: (enabled: boolean) => boolean;
  setExpandedValue: (value: string[]) => boolean;
  setFilterState: (filterState: ModuleFilterState) => boolean;
  setItems: (items: TreeNode[]) => boolean;
  setLoadedProjectId: (projectId: string | null) => boolean;
  setSearchString: (query: string) => boolean;
}

export interface ModuleFilterState {
  [FilterType.Dsp]: boolean;
  [FilterType.Module]: boolean;
}

// Interface for drag data
export interface DragData {
  category?: string;
  group?: string;
  id: string;
  isCustomModule?: boolean;
  moduleType?: string;
  name: string;
  subgraphId?: string;
  subgraphName?: string;
  subgraphType?: SubgraphType;
  tooltip?: string;
}
