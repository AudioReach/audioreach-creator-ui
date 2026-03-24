/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {type ReactElement, useMemo} from 'react';

import {ListFilter, Search} from 'lucide-react';

import {createTreeCollection} from '@qualcomm-ui/core/tree';
import {InlineIconButton} from '@qualcomm-ui/react/inline-icon-button';
import {Menu} from '@qualcomm-ui/react/menu';
import {TextInput} from '@qualcomm-ui/react/text-input';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Tree} from '@qualcomm-ui/react/tree';
import {Portal} from '@qualcomm-ui/react-core/portal';
import {matchSorter} from '@qualcomm-ui/utils/match-sorter';

import {logger} from '~shared/lib/logger';

import {useItemListStore} from './module-list-store';
import {
  type DragData,
  FilterType,
  isModuleLeafNode,
  isSubgraphLeafNode,
  isSubsystemLeafNode,
  SubgraphType,
  type TreeNode,
} from './module-list-types';

// Counter for generating unique IDs
let idCounter = 0;

/**
 * Generate a unique ID for tree nodes
 * Uses timestamp + counter
 */
function generateUniqueId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

/**
 * Dispatch a custom event safely 
 */
function dispatchCustomEvent(eventName: string, detail?: unknown): void {
  // Only dispatch events in browser environment
  // Check if we're in a browser by verifying window exists and has dispatchEvent
  if ('window' in globalThis && globalThis.dispatchEvent) {
    // Create a simple Event and attach detail as a property
    const event = new Event(eventName);
    // Attach detail to the event object
    Object.defineProperty(event, 'detail', {
      value: detail,
      writable: false,
    });
    globalThis.dispatchEvent(event);
  }
}

/**
 * Handle drag start event for tree nodes
 */
function handleDragStart(node: TreeNode, event: React.DragEvent): void {
  // Create appropriate drag data based on node type
  let dragData: DragData;

  if (isModuleLeafNode(node)) {
    dragData = {
      category: node.category,
      group: node.group,
      id: node.id || generateUniqueId(),
      isCustomModule: node.isCustomModule,
      moduleType: node.moduleType,
      name: node.name,
      // Generate subgraph info for modules
      subgraphId: generateUniqueId(),
      subgraphName: node.name,
      subgraphType: SubgraphType.Stream,
      tooltip: node.tooltip,
    };
  } else if (isSubgraphLeafNode(node)) {
    // For subgraphs, use existing subgraph properties
    dragData = {
      category: node.category,
      id: node.id || generateUniqueId(),
      name: node.name,
      subgraphId: node.subgraphId,
      subgraphName: node.subgraphName,
      subgraphType: node.subgraphType,
    };
  } else if (isSubsystemLeafNode(node)) {
    // For subsystems, create basic drag data + generated subgraph info
    dragData = {
      category: node.category,
      id: node.id || generateUniqueId(),
      name: node.name,
      // Generate subgraph info for subsystems
      subgraphId: generateUniqueId(),
      subgraphName: node.name,
      subgraphType: SubgraphType.Device,
      tooltip: node.tooltip,
    };
  } else {
    // For branch nodes, create basic drag data
    dragData = {
      id: node.id || generateUniqueId(),
      name: node.name,
      tooltip: node.name,
    };
  }

  /*
   * Enables dragging between different panels/components using browser's built-in
   * drag/drop API. Set drag data for browser drag/drop API.
   * "application/json" is a MIME type (data format identifier) used in the browser's drag-and-drop API
   */
  event.dataTransfer.setData('application/json', JSON.stringify(dragData));
  // Sets drag cursor to "copy"
  event.dataTransfer.effectAllowed = 'copy';

  // Notifies other components about drag operations
  dispatchCustomEvent('module-drag-start', dragData);

  logger.info('Module drag started');
}

/**
 * Handle drag end event
 */
function handleDragEnd(): void {
  // Trigger drag end event
  dispatchCustomEvent('module-drag-end');
  logger.info('Module drag ended');
}

/**
 * Render a module leaf node
 */
function renderModuleLeaf(
  module: TreeNode,
  moduleIdx: number,
  index: number,
  branchIdx: number,
  isDragEnabled: boolean,
): ReactElement {
  const leafModule = isModuleLeafNode(module) ? module : null;
  return (
    <Tree.NodeProvider
      key={module.id}
      indexPath={[index, branchIdx, moduleIdx]}
      node={module}
    >
      <Tree.LeafNode
        render={
          isDragEnabled ? (
            <div
              className="cursor-grab select-none"
              draggable="true"
              onDragEnd={handleDragEnd}
              onDragStart={(e) => handleDragStart(module, e)}
            />
          ) : (
            <div />
          )
        }
      >
        <Tree.NodeIndicator />
        {leafModule?.isCustomModule && (
          <Tooltip trigger={<span className="mr-1">*</span>}>
            Custom Module
          </Tooltip>
        )}
        <Tooltip
          trigger={
            <span className="min-w-0 truncate">
              <Tree.NodeText>{module.name}</Tree.NodeText>
            </span>
          }
        >
          {leafModule?.tooltip || module.name}
        </Tooltip>
      </Tree.LeafNode>
    </Tree.NodeProvider>
  );
}

/**
 * Render a grouped module leaf node
 */
function renderGroupedModuleLeaf(
  module: TreeNode,
  moduleIdx: number,
  index: number,
  branchIdx: number,
  groupIdx: number,
  isDragEnabled: boolean,
): ReactElement {
  const leafModule = isModuleLeafNode(module) ? module : null;
  return (
    <Tree.NodeProvider
      key={module.id}
      indexPath={[index, branchIdx, groupIdx, moduleIdx]}
      node={module}
    >
      <Tree.LeafNode
        render={
          isDragEnabled ? (
            <div
              className="cursor-grab select-none"
              draggable="true"
              onDragEnd={handleDragEnd}
              onDragStart={(e) => handleDragStart(module, e)}
            />
          ) : (
            <div />
          )
        }
      >
        <Tree.NodeIndicator />
        {leafModule?.isCustomModule && (
          <Tooltip trigger={<span className="mr-1">*</span>}>Custom Module</Tooltip>
        )}
        <Tooltip
          trigger={
            <span className="min-w-0 truncate">
              <Tree.NodeText>{module.name}</Tree.NodeText>
            </span>
          }
        >
          {leafModule?.tooltip || module.name}
        </Tooltip>
      </Tree.LeafNode>
    </Tree.NodeProvider>
  );
}

/**
 * Render a default leaf node (for subsystems and subgraphs)
 */
function renderDefaultLeaf(node: TreeNode, isDragEnabled: boolean): ReactElement {
  const isSubgraph = isSubgraphLeafNode(node);
  const isModule = isModuleLeafNode(node);
  const isSubsystem = isSubsystemLeafNode(node);

  return (
    <Tree.LeafNode
      render={
        isDragEnabled ? (
          <div
            className="cursor-grab select-none"
            draggable="true"
            onDragEnd={handleDragEnd}
            onDragStart={(e) => handleDragStart(node, e)}
          />
        ) : (
          <div />
        )
      }
    >
      <Tree.NodeIndicator />
      {isModule && node.isCustomModule && (
        <Tooltip trigger={<span className="mr-1">*</span>}>
          Custom Module
        </Tooltip>
      )}
      {isSubgraph ? (
        // Subgraph items: no tooltip, just text with truncation
        <span className="min-w-0 truncate">
          <Tree.NodeText>{node.name}</Tree.NodeText>
        </span>
      ) : (
        // Other items: with tooltip
        <Tooltip
          trigger={
            <span className="min-w-0 truncate">
              <Tree.NodeText>{node.name}</Tree.NodeText>
            </span>
          }
        >
          {isModule || isSubsystem ? node.tooltip : node.name}
        </Tooltip>
      )}
    </Tree.LeafNode>
  );
}

/**
 * Render grouped modules branch
 */
function renderGroupedModulesBranch(
  branchNode: TreeNode,
  filteredModules: TreeNode[],
  index: number,
  branchIdx: number,
  isDragEnabled: boolean,
): ReactElement {
  const groups: Record<string, TreeNode[]> = {};
  for (const node of filteredModules) {
    if (isModuleLeafNode(node)) {
      const groupKey = node.group || 'UNKNOWN';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(node);
    }
  }

  return (
    <Tree.NodeProvider
      key={branchNode.id}
      indexPath={[index, branchIdx]}
      node={branchNode}
    >
      <Tree.Branch>
        <Tree.BranchNode>
          <Tree.NodeIndicator />
          <Tree.BranchTrigger />
          <Tree.NodeText>{branchNode.name}</Tree.NodeText>
        </Tree.BranchNode>
        <Tree.BranchContent>
          {Object.entries(groups).map(([groupName, groupModules], groupIdx) => (
            <Tree.NodeProvider
              key={groupName}
              indexPath={[index, branchIdx, groupIdx]}
              node={
                {
                  id: groupName,
                  name: groupName,
                } as TreeNode
              }
            >
              <Tree.Branch>
                <Tree.BranchNode>
                  <Tree.NodeIndicator />
                  <Tree.BranchTrigger />
                  <span className="min-w-0 truncate">
                    <Tree.NodeText>{groupName}</Tree.NodeText>
                  </span>
                </Tree.BranchNode>
                <Tree.BranchContent>
                  {groupModules.map((module, moduleIdx) =>
                    renderGroupedModuleLeaf(
                      module,
                      moduleIdx,
                      index,
                      branchIdx,
                      groupIdx,
                      isDragEnabled,
                    ),
                  )}
                </Tree.BranchContent>
              </Tree.Branch>
            </Tree.NodeProvider>
          ))}
        </Tree.BranchContent>
      </Tree.Branch>
    </Tree.NodeProvider>
  );
}

export function ModuleTree(): ReactElement {
  // The complete module tree data
  const items = useItemListStore((state) => state.items);
  // Array of expanded branch node IDs
  const expandedValue = useItemListStore((state) => state.expandedValue);
  const setExpandedValue = useItemListStore((state) => state.setExpandedValue);
  // Current search text
  const query = useItemListStore((state) => state.query);
  const setSearchString = useItemListStore((state) => state.setSearchString);
  // Which module types are visible (DSP/Module)
  const filterState = useItemListStore((state) => state.filterState);
  const setFilterState = useItemListStore((state) => state.setFilterState);
  // Controls whether modules can be dragged
  const isDragEnabled = useItemListStore((state) => state.isDragEnabled);

  // Transforms  flat modules array into a TreeCollection object that QUI's Tree component can consume.
  const initialCollection = useMemo(
    () =>
      // Factory function from QUI that transforms your raw data into TreeCollection object.
      createTreeCollection<TreeNode>({
        nodeChildren: 'nodes',
        nodeText: (node) => node.name,
        nodeValue: (node) => node.id || node.name,
        rootNode: {
          // Creates an invisible root container that wraps  actual module data.
          // The Tree API expects a single root node with children
          id: 'ROOT',
          name: '',
          nodes: items,
        },
      }),
    [items],
  );

  /*
   * Creates a filtered view of the tree based on:
   * Search: Uses matchSorter to find nodes matching the search query
   * Type filters: Filters by DSP/Module type while always showing "Subsystems" and subsystem-category nodes
   */
  const collection = useMemo(() => {
    let filteredCollection = initialCollection;

    if (query) {
      // searches all descendant nodes by their name property
      const matchedNodes = matchSorter(
        initialCollection.getDescendantNodes(),
        query,
        {
          keys: ['name'],
        },
      );
      // Keeps only nodes whose id appears in the search results
      // filteredCollection now contains only nodes matching the search term
      filteredCollection = initialCollection.filter((node) =>
        matchedNodes.some((n) => n.id === node.id),
      );
    }

    // Always apply type filter (one is always selected with radio buttons)
    filteredCollection = filteredCollection.filter((node) => {
      if (node.name === 'Subsystems') {
        return true;
      }
      if (node.name === 'Subgraph') {
        return true;
      }

      // For leaf nodes, apply the filter based on their type
      if (isSubsystemLeafNode(node)) {
        return true; // Don't filter subsystem nodes
      }
      if (isSubgraphLeafNode(node)) {
        return true; // Don't filter subgraph nodes
      }
      if (isModuleLeafNode(node)) {
        // Apply filter only to actual modules
        if (node.moduleType === 'dsp' && !filterState[FilterType.Dsp]) {
          return false;
        }
        if (node.moduleType === 'module' && !filterState[FilterType.Module]) {
          return false;
        }
      }
      return true;
    });

    return filteredCollection;
  }, [initialCollection, query, filterState]);

  /*
   * When user types in search:
   * Updates the search query in store
   * Expands all branches to show search results
   */
  const handleSearch = (value: string) => {
    setSearchString(value);
    if (value) {
      // Get all branch node IDs from the collection
      const branchValues = collection.getBranchValues();

      // In Module Type view, also need to expand dynamically created group nodes
      // Extract all unique group names from modules to ensure they're expanded
      const groupNames = new Set<string>();
      for (const node of initialCollection.getDescendantNodes()) {
        if (isModuleLeafNode(node) && node.group) {
          groupNames.add(node.group);
        }
      }

      // Combine branch values with group names for complete expansion
      setExpandedValue([...branchValues, ...groupNames]);
    }
  };

  // Fixed search bar at top
  return (
    <>
      <div>
        <TextInput
          aria-label="Search"
          onValueChange={handleSearch}
          placeholder="Search"
          size="sm"
          startIcon={Search}
          value={query}
        />
      </div>

      <div style={{overflow: 'auto'}}>
        <Tree.Root
          collection={collection}
          expandedValue={expandedValue}
          onExpandedValueChange={({expandedValue}) =>
            setExpandedValue(expandedValue)
          }
          size="sm"
        >
          {/* iterates over the top-level children of tree's root node. */}
          {collection.rootNode.nodes?.map(
            (parentNode: TreeNode, index: number) => {
              /*
               * Checks if this is the "Modules" node AND it has children
               * This applies special rendering only to the "Modules" branch.
               */
              if (
                parentNode.name === 'Modules' &&
                'nodes' in parentNode &&
                parentNode.nodes
              ) {
                return (
                  <Tree.NodeProvider
                    key={parentNode.id}
                    indexPath={[index]}
                    node={parentNode}
                  >
                    <Tree.Branch>
                      <Tree.BranchNode>
                        <Tree.NodeIndicator />
                        <Tree.BranchTrigger />
                        <Tree.NodeText>{parentNode.name}</Tree.NodeText>
                        <div
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <Menu.Root>
                            <Menu.Trigger>
                              <InlineIconButton
                                aria-label="Filter modules"
                                icon={ListFilter}
                                size="sm"
                              />
                            </Menu.Trigger>
                            <Portal>
                              <Menu.Positioner>
                                <Menu.Content>
                                  {/* Filter Menu Radio Group */}
                                  <Menu.RadioItemGroup
                                    onValueChange={(value) => {
                                      setFilterState({
                                        [FilterType.Dsp]: value === 'dsp',
                                        [FilterType.Module]: value === 'module',
                                      });
                                    }}
                                    value={
                                      filterState[FilterType.Dsp]
                                        ? FilterType.Dsp
                                        : FilterType.Module
                                    }
                                  >
                                    <Menu.RadioItem value={FilterType.Dsp}>
                                      <Menu.RadioItemControl />
                                      <Menu.ItemLabel>DSP Type</Menu.ItemLabel>
                                    </Menu.RadioItem>
                                    <Menu.RadioItem value={FilterType.Module}>
                                      <Menu.RadioItemControl />
                                      <Menu.ItemLabel>
                                        Module Type
                                      </Menu.ItemLabel>
                                    </Menu.RadioItem>
                                  </Menu.RadioItemGroup>
                                </Menu.Content>
                              </Menu.Positioner>
                            </Portal>
                          </Menu.Root>
                        </div>
                      </Tree.BranchNode>
                      <Tree.BranchContent>
                        {/* Iterates through processor types (ADSP/MDSP) and filters their modules based on:
                      Category check: Only include actual modules (exclude subsystems/subgraphs)
                      Type filter: Show only DSP or Module type based on the active filter */}
                        {parentNode.nodes?.map(
                          (branchNode: TreeNode, branchIdx: number) => {
                            if (!('nodes' in branchNode) || !branchNode.nodes) {
                              return null;
                            }

                            const leafModules = branchNode.nodes.filter(
                              (node: TreeNode) =>
                                isModuleLeafNode(node) &&
                                node.category === 'modules',
                            );

                            const filteredModules = leafModules.filter(
                              (node: TreeNode) => {
                                if (!isModuleLeafNode(node)) {
                                  return false;
                                }
                                if (filterState[FilterType.Module]) {
                                  return node.moduleType === 'module';
                                }
                                if (filterState[FilterType.Dsp]) {
                                  return node.moduleType === 'dsp';
                                }
                                return false;
                              },
                            );

                            if (filteredModules.length === 0) {
                              return null;
                            }

                            if (filterState[FilterType.Dsp]) {
                              // DSP Type: Modules → ADSP/MDSP → modules directly (2 levels)
                              return (
                                <Tree.NodeProvider
                                  key={branchNode.id}
                                  indexPath={[index, branchIdx]}
                                  node={branchNode}
                                >
                                  <Tree.Branch>
                                    <Tree.BranchNode>
                                      <Tree.NodeIndicator />
                                      <Tree.BranchTrigger />
                                      <Tree.NodeText>
                                        {branchNode.name}
                                      </Tree.NodeText>
                                    </Tree.BranchNode>
                                    <Tree.BranchContent>
                                      {filteredModules.map((module, moduleIdx) =>
                                        renderModuleLeaf(
                                          module,
                                          moduleIdx,
                                          index,
                                          branchIdx,
                                          isDragEnabled,
                                        ),
                                      )}
                                    </Tree.BranchContent>
                                  </Tree.Branch>
                                </Tree.NodeProvider>
                              );
                            }
                            // Module Type: Modules → ADSP/MDSP → group → modules (3 levels)
                            return renderGroupedModulesBranch(
                              branchNode,
                              filteredModules,
                              index,
                              branchIdx,
                              isDragEnabled,
                            );
                          },
                        )}
                      </Tree.BranchContent>
                    </Tree.Branch>
                  </Tree.NodeProvider>
                );
              } else {
                // Default handling for other nodes (Subsystems and other
                // non-Modules nodes)
                return (
                  <Tree.Nodes
                    key={parentNode.id}
                    indexPath={[index]}
                    node={parentNode}
                    renderBranch={({node}) => (
                      <Tree.BranchNode>
                        <Tree.NodeIndicator />
                        <Tree.BranchTrigger />
                        <Tree.NodeText>{node.name}</Tree.NodeText>
                      </Tree.BranchNode>
                    )}
                    renderLeaf={({node}) => renderDefaultLeaf(node, isDragEnabled)}
                  />
                );
              }
            },
          )}
        </Tree.Root>
      </div>
    </>
  );
}
