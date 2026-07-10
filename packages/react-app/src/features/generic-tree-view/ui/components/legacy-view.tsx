/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {createTreeCollection} from '@qualcomm-ui/core/tree';
import {Tree} from '@qualcomm-ui/react/tree';

import {itemIdsFromPaths} from '../../lib/item-ids-from-paths';
import {NO_MATCH_MESSAGE} from '../../lib/messages';
import type {TreeViewItem} from '../../model/tree-view-data';

import {ElementTree} from './element-tree';
import {StatusStrip} from './status-strip';

interface LegacyViewProps {
  arrayCounts: Map<string, number>;
  committedValues: Map<string, string>;
  dirtyPaths: Set<string>;
  elementValues: Map<string, string>;
  expandAll?: boolean;
  expandedKeys: string[];
  invalidPaths: Set<string>;
  items: TreeViewItem[];
  matchSets: {elementIds: Set<string>; paramIds: Set<string>} | null;
  moduleName: string;
  onAutoCommit?: () => void;
  onExpandedChange: (keys: string[]) => void;
  onValueChange: (key: string, value: string) => void;
  policyFilter: Set<'BASIC' | 'ADVANCED'>;
  readOnly: boolean;
  resetKey: number;
  setPaths: Set<string>;
  showRanges: boolean;
}

interface LegacyNode {
  children: LegacyNode[];
  id: string;
  name: string;
}

export function LegacyView({
  arrayCounts,
  committedValues,
  dirtyPaths,
  elementValues,
  expandAll,
  expandedKeys,
  invalidPaths,
  items,
  matchSets,
  moduleName,
  onAutoCommit,
  onExpandedChange,
  onValueChange,
  policyFilter,
  readOnly,
  resetKey,
  setPaths,
  showRanges,
}: LegacyViewProps) {
  const filteredItems = matchSets
    ? items.filter((p) => matchSets.paramIds.has(p.id))
    : items;

  const rootNode: LegacyNode = useMemo(
    () => ({
      children: [
        {
          children: filteredItems.map((p) => ({
            children: [],
            id: p.id,
            name: p.name,
          })),
          id: '__module__',
          name: moduleName,
        },
      ],
      id: '__legacy_root__',
      name: '',
    }),
    [filteredItems, moduleName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<LegacyNode>({
        nodeChildren: 'children',
        nodeText: 'name',
        nodeValue: 'id',
        rootNode,
      }),
    [rootNode],
  );

  const moduleDefaultExpanded = useMemo(
    () =>
      expandedKeys.length > 0
        ? expandedKeys
        : ['__module__', ...filteredItems.map((p) => p.id)],
    [expandedKeys, filteredItems],
  );

  const dirtyCount = itemIdsFromPaths(dirtyPaths).size;
  const setCount = itemIdsFromPaths(setPaths).size;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {matchSets && filteredItems.length === 0 ? (
          <p className="text-neutral-secondary p-4 text-sm">
            {NO_MATCH_MESSAGE}
          </p>
        ) : (
          <Tree.Root
            key={moduleName}
            collection={collection}
            defaultExpandedValue={moduleDefaultExpanded}
            expandedValue={expandedKeys}
            onExpandedValueChange={(details) =>
              onExpandedChange(details.expandedValue)
            }
          >
            <Tree.NodeProvider indexPath={[0]} node={rootNode.children[0]}>
              <Tree.Branch>
                <Tree.BranchNode>
                  <Tree.NodeIndicator />
                  <Tree.BranchTrigger />
                  <Tree.NodeText>{moduleName}</Tree.NodeText>
                </Tree.BranchNode>
                <Tree.BranchContent>
                  <Tree.BranchIndentGuide />
                  {filteredItems.map((item, i) => (
                    <Tree.NodeProvider
                      key={item.id}
                      indexPath={[0, i]}
                      node={rootNode.children[0].children[i]}
                    >
                      <Tree.Branch>
                        <Tree.BranchNode>
                          <Tree.NodeIndicator />
                          <Tree.BranchTrigger />
                          <Tree.NodeText>{item.name}</Tree.NodeText>
                        </Tree.BranchNode>
                        <Tree.BranchContent>
                          <div className="py-2 pl-4">
                            <ElementTree
                              arrayCounts={arrayCounts}
                              committedValues={committedValues}
                              dirtyPaths={dirtyPaths}
                              elementValues={elementValues}
                              expandAll={expandAll}
                              invalidPaths={invalidPaths}
                              item={item}
                              matchSets={matchSets}
                              onAutoCommit={onAutoCommit}
                              onValueChange={onValueChange}
                              paramReadOnly={
                                readOnly || (item.isReadOnly ?? false)
                              }
                              policyFilter={policyFilter}
                              resetKey={resetKey}
                              setPaths={setPaths}
                              showRanges={showRanges}
                            />
                          </div>
                        </Tree.BranchContent>
                      </Tree.Branch>
                    </Tree.NodeProvider>
                  ))}
                </Tree.BranchContent>
              </Tree.Branch>
            </Tree.NodeProvider>
          </Tree.Root>
        )}
      </div>

      <StatusStrip
        dirtyCount={dirtyCount}
        paramCount={filteredItems.length}
        setCount={setCount}
        totalParamCount={items.length}
      />
    </div>
  );
}
