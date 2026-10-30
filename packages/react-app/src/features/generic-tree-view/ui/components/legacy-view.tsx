/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo, useState} from 'react';

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
  compact?: boolean;
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
  compact = false,
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
  const [selectedValue, setSelectedValue] = useState<string[]>([]);

  const filteredItems = matchSets
    ? items.filter((p) => matchSets.paramIds.has(p.id))
    : items;

  const rootNode: LegacyNode = useMemo(() => {
    const itemNodes = filteredItems.map((p) => ({
      children: [],
      id: p.id,
      name: p.name,
    }));
    return {
      children: compact
        ? itemNodes
        : [{children: itemNodes, id: '__module__', name: moduleName}],
      id: '__legacy_root__',
      name: '',
    };
  }, [compact, filteredItems, moduleName]);

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
        : [
            ...(compact ? [] : ['__module__']),
            ...filteredItems.map((p) => p.id),
          ],
    [compact, expandedKeys, filteredItems],
  );

  const renderElementTree = (item: TreeViewItem, reduceLeafIndent = false) => (
    <ElementTree
      arrayCounts={arrayCounts}
      committedValues={committedValues}
      compactLabel={compact}
      dirtyPaths={dirtyPaths}
      elementValues={elementValues}
      expandAll={expandAll}
      invalidPaths={invalidPaths}
      item={item}
      matchSets={matchSets}
      onAutoCommit={onAutoCommit}
      onSelectedValueChange={compact ? setSelectedValue : undefined}
      onValueChange={onValueChange}
      paramReadOnly={readOnly || (item.isReadOnly ?? false)}
      policyFilter={policyFilter}
      portalTooltip={compact}
      reduceLeafIndent={reduceLeafIndent}
      resetKey={resetKey}
      selectedValue={compact ? selectedValue : undefined}
      setPaths={setPaths}
      showRanges={showRanges}
    />
  );

  const renderItem = (
    item: TreeViewItem,
    indexPath: number[],
    parent: LegacyNode,
  ) => {
    if (compact && item.elements.length === 1) {
      return (
        <div key={item.id} className="-ml-4 py-1">
          {renderElementTree(item, true)}
        </div>
      );
    }
    const branch = (
      <Tree.NodeProvider
        key={item.id}
        indexPath={indexPath}
        node={parent.children[indexPath[indexPath.length - 1]]}
      >
        <Tree.Branch>
          <Tree.BranchNode style={compact ? {paddingLeft: 4} : undefined}>
            <Tree.NodeIndicator />
            <Tree.BranchTrigger />
            <Tree.NodeText>{item.name}</Tree.NodeText>
          </Tree.BranchNode>
          <Tree.BranchContent>
            <div className="py-2 pl-4">{renderElementTree(item, compact)}</div>
          </Tree.BranchContent>
        </Tree.Branch>
      </Tree.NodeProvider>
    );
    return compact ? (
      <div key={item.id} className="-ml-4">
        {branch}
      </div>
    ) : (
      branch
    );
  };

  const dirtyCount = itemIdsFromPaths(dirtyPaths).size;
  const setCount = itemIdsFromPaths(setPaths).size;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={`flex-1 p-4 ${compact ? 'overflow-auto' : 'overflow-y-auto'}`}
      >
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
            onSelectedValueChange={
              compact
                ? (details) => setSelectedValue(details.selectedValue)
                : undefined
            }
            selectedValue={compact ? selectedValue : undefined}
          >
            {compact ? (
              filteredItems.map((item, i) => renderItem(item, [i], rootNode))
            ) : (
              <Tree.NodeProvider indexPath={[0]} node={rootNode.children[0]}>
                <Tree.Branch>
                  <Tree.BranchNode>
                    <Tree.NodeIndicator />
                    <Tree.BranchTrigger />
                    <Tree.NodeText>{moduleName}</Tree.NodeText>
                  </Tree.BranchNode>
                  <Tree.BranchContent>
                    <Tree.BranchIndentGuide />
                    {filteredItems.map((item, i) =>
                      renderItem(item, [0, i], rootNode.children[0]),
                    )}
                  </Tree.BranchContent>
                </Tree.Branch>
              </Tree.NodeProvider>
            )}
          </Tree.Root>
        )}
      </div>

      {!compact && (
        <StatusStrip
          dirtyCount={dirtyCount}
          paramCount={filteredItems.length}
          setCount={setCount}
          totalParamCount={items.length}
        />
      )}
    </div>
  );
}
