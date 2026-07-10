/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {createTreeCollection} from '@qualcomm-ui/core/tree';
import {StatusBadge} from '@qualcomm-ui/react/badge';
import {Tooltip} from '@qualcomm-ui/react/tooltip';
import {Tree} from '@qualcomm-ui/react/tree';

import {
  ConvertNumberToHexString,
  ConvertStringToNumber,
} from '~shared/utils/converter-utils';

import type {TreeViewItem} from '../../model/tree-view-data';

import {StatusStrip} from './status-strip';

/**
 * Format an item id for display as a hex PID with a 0x prefix.
 * Falls back to the raw value if it is not a parseable number.
 */
function formatPid(id: string): string {
  const asNumber = ConvertStringToNumber(id);
  if (asNumber === null) {
    return id;
  }
  return ConvertNumberToHexString(asNumber) ?? id;
}

interface ParameterListPanelProps {
  dirtyItemIds: Set<string>;
  items: TreeViewItem[];
  matchSets: {elementIds: Set<string>; paramIds: Set<string>} | null;
  moduleName: string;
  onSelectionChange: (ids: string[], expandNew?: boolean) => void;
  selectedIds: string[];
  setItemIds: Set<string>;
  showPids: boolean;
}

interface ParamListNode {
  children: ParamListNode[];
  id: string;
  name: string;
}

export function ParameterListPanel({
  dirtyItemIds,
  items,
  matchSets,
  moduleName,
  onSelectionChange,
  selectedIds,
  setItemIds,
  showPids,
}: ParameterListPanelProps) {
  const filteredItems = matchSets
    ? items.filter((p) => matchSets.paramIds.has(p.id))
    : items;

  const dirtyCount = dirtyItemIds.size;
  const setCount = setItemIds.size;

  const rootNode: ParamListNode = useMemo(
    () => ({
      children: filteredItems.map((p) => ({
        children: [],
        id: p.id,
        name: p.name,
      })),
      id: '__module__',
      name: moduleName,
    }),
    [filteredItems, moduleName],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<ParamListNode>({
        nodeChildren: 'children',
        nodeText: 'name',
        nodeValue: 'id',
        rootNode,
      }),
    [rootNode],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden border-r">
      <div className="flex-1 overflow-y-auto">
        <Tree.Root
          key={moduleName}
          collection={collection}
          onSelectedValueChange={(details) => {
            const expandNew = details.selectedValue.length < items.length;
            onSelectionChange(details.selectedValue, expandNew);
          }}
          selectedValue={selectedIds}
          selectionMode="multiple"
          style={{'--indent-spacing': '0px'} as React.CSSProperties}
        >
          <Tree.Label
            className="flex cursor-pointer items-center gap-2 truncate border-b px-4 py-2.5 text-sm font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              if (e.ctrlKey || e.metaKey) {
                const allSelected = filteredItems.every((p) =>
                  selectedIds.includes(p.id),
                );
                onSelectionChange(
                  allSelected ? [] : filteredItems.map((p) => p.id),
                  false,
                );
              } else {
                onSelectionChange(
                  filteredItems.map((p) => p.id),
                  false,
                );
              }
            }}
          >
            {moduleName}
          </Tree.Label>

          {filteredItems.map((item, index) => {
            const isDirty = dirtyItemIds.has(item.id);
            const isSet = setItemIds.has(item.id);

            const tooltipLines: string[] = [];
            tooltipLines.push(`PID: ${formatPid(item.id)}`);
            if (item.description) {
              tooltipLines.push(item.description);
            }

            return (
              <Tree.NodeProvider
                key={item.id}
                indexPath={[index]}
                node={rootNode.children[index]}
              >
                <Tooltip.Root positioning={{placement: 'right'}}>
                  <Tooltip.Trigger>
                    <Tree.LeafNode>
                      <Tree.NodeIndicator />
                      <ItemRowContent
                        isDirty={isDirty}
                        isSet={isSet}
                        item={item}
                        showPids={showPids}
                      />
                    </Tree.LeafNode>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner style={{zIndex: 50}}>
                    <Tooltip.Content>
                      <Tooltip.Arrow>
                        <Tooltip.ArrowTip />
                      </Tooltip.Arrow>
                      <div className="max-w-[260px] whitespace-pre-line text-xs">
                        {tooltipLines.join('\n')}
                      </div>
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              </Tree.NodeProvider>
            );
          })}
        </Tree.Root>
      </div>

      <StatusStrip
        dirtyCount={dirtyCount}
        paramCount={matchSets ? matchSets.paramIds.size : items.length}
        setCount={setCount}
        totalParamCount={matchSets ? items.length : undefined}
      />
    </div>
  );
}

function ItemRowContent({
  isDirty,
  isSet,
  item,
  showPids,
}: {
  isDirty: boolean;
  isSet: boolean;
  item: TreeViewItem;
  showPids: boolean;
}) {
  return (
    <>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{width: 12}}
      >
        {isDirty ? (
          <StatusBadge className="dirty-pulse" emphasis="warning" size="xs" />
        ) : isSet ? (
          <StatusBadge emphasis="success" size="xs" />
        ) : null}
      </div>
      <Tree.NodeText className="flex-1 text-sm">{item.name}</Tree.NodeText>
      {showPids && (
        <span
          className="ml-auto shrink-0 pl-2 font-mono text-xs"
          style={{opacity: 0.45}}
        >
          {formatPid(item.id)}
        </span>
      )}
    </>
  );
}
