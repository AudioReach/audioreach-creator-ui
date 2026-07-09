/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {useMemo} from 'react';

import {createTreeCollection} from '@qualcomm-ui/core/tree';
import {Tree} from '@qualcomm-ui/react/tree';

import type {AnyElementDto} from '~entities/spf-module-data';

import {elementKey} from '../../lib/element-key';
import type {TreeViewItem} from '../../model/tree-view-data';

import {renderElement, type RenderElementContext} from './render-element';

interface ElementTreeProps {
  arrayCounts: Map<string, number>;
  committedValues: Map<string, string>;
  dirtyPaths: Set<string>;
  elementValues: Map<string, string>;
  expandAll?: boolean;
  invalidPaths: Set<string>;
  item: TreeViewItem;
  matchSets?: {elementIds: Set<string>; paramIds: Set<string>} | null;
  onAutoCommit?: () => void;
  onValueChange: (key: string, value: string) => void;
  paramReadOnly: boolean;
  policyFilter: Set<'BASIC' | 'ADVANCED'>;
  resetKey: number;
  setPaths: Set<string>;
  showRanges: boolean;
}

function collectBranchKeys(
  elems: AnyElementDto[],
  itemId: string,
  prefix: string[],
  arrayCounts: Map<string, number>,
): string[] {
  const keys: string[] = [];
  for (const elem of elems) {
    if (elem.type === 'CONFIG_ELEMENT') {
      if (elem.displayType === 'BIT_FIELD' && elem.allowedValues?.length) {
        keys.push(elementKey(itemId, ...prefix, elem.name));
      }
    } else if (elem.type === 'STRUCT') {
      const k = elementKey(itemId, ...prefix, elem.name);
      keys.push(k);
      keys.push(
        ...collectBranchKeys(
          elem.value,
          itemId,
          [...prefix, elem.name],
          arrayCounts,
        ),
      );
    } else if (elem.type === 'ELEMENT_TEMPLATE_ARRAY') {
      const arrayPath = elementKey(itemId, ...prefix, elem.name);
      if (elem.length !== undefined && !elem.lengthFormula) {
        continue;
      }
      keys.push(arrayPath);
      const count = arrayCounts.get(arrayPath) ?? elem.value.length;
      for (let i = 0; i < count; i++) {
        const inst = i < elem.value.length ? elem.value[i] : elem.template[0];
        if (!inst) {
          continue;
        }
        const instName =
          inst.type === 'STRUCT' ? inst.name : `${elem.name}[${i}]`;
        if (inst.type === 'STRUCT') {
          const instKey = elementKey(itemId, ...prefix, instName);
          keys.push(instKey);
          keys.push(
            ...collectBranchKeys(
              inst.value,
              itemId,
              [...prefix, instName],
              arrayCounts,
            ),
          );
        }
      }
    }
  }
  return keys;
}

export function ElementTree({
  arrayCounts,
  committedValues,
  dirtyPaths,
  elementValues,
  expandAll,
  invalidPaths,
  item,
  matchSets,
  onAutoCommit,
  onValueChange,
  paramReadOnly,
  policyFilter,
  resetKey,
  setPaths,
  showRanges,
}: ElementTreeProps) {
  interface FlatNode {
    children: FlatNode[];
    id: string;
    name: string;
  }

  const rootNode: FlatNode = useMemo(
    () => ({
      children: [],
      id: item.id,
      name: item.name,
    }),
    [item.id, item.name],
  );

  const collection = useMemo(
    () =>
      createTreeCollection<FlatNode>({
        nodeChildren: 'children',
        nodeText: 'name',
        nodeValue: 'id',
        rootNode,
      }),
    [rootNode],
  );

  const allBranchKeys = useMemo(
    () => collectBranchKeys(item.elements, item.id, [], arrayCounts),
    [item.elements, item.id, arrayCounts],
  );

  const ctx: RenderElementContext = {
    arrayCounts,
    committedValues,
    dirtyPaths,
    elementValues,
    invalidPaths,
    matchElementKeys: matchSets?.elementIds,
    onAutoCommit,
    onValueChange,
    parameterId: item.id,
    paramReadOnly,
    pathPrefix: [],
    policyFilter,
    setPaths,
    showRanges,
  };

  return (
    <div className="h-full overflow-y-auto">
      <Tree.Root
        key={`${item.id}-${resetKey}-${expandAll ? 'expand' : 'default'}`}
        collection={collection}
        defaultExpandedValue={expandAll ? allBranchKeys : undefined}
      >
        {item.elements.map((elem, i) => renderElement(elem, ctx, [i]))}
      </Tree.Root>
    </div>
  );
}
