/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto} from '~entities/spf-module-data';

import type {TreeViewData} from '../model/tree-view-data';

import {elementKey} from './element-key';

export interface MatchSets {
  elementIds: Set<string>;
  paramIds: Set<string>;
}

export function buildMatchSets(data: TreeViewData, search: string): MatchSets {
  const paramIds = new Set<string>();
  const elementIds = new Set<string>();
  const lower = search.toLowerCase();

  function walkElems(
    elems: AnyElementDto[],
    itemId: string,
    prefix: Array<string | undefined>,
  ): boolean {
    let anyMatch = false;
    for (const elem of elems) {
      const name =
        elem.type === 'ConfigElement' ||
        elem.type === 'Struct' ||
        elem.type === 'ElementTemplateArray'
          ? (elem.name ?? '')
          : '';
      const selfMatch = name.toLowerCase().includes(lower);
      let childMatch = false;
      if (elem.type === 'Struct') {
        childMatch = walkElems(elem.value, itemId, [...prefix, elem.name]);
      } else if (elem.type === 'ElementTemplateArray') {
        for (const inst of elem.value) {
          if (inst.type === 'Struct') {
            if (walkElems(inst.value, itemId, [...prefix, inst.name])) {
              childMatch = true;
            }
          }
        }
      }
      if (selfMatch || childMatch) {
        const key = elementKey(itemId, ...prefix, name);
        elementIds.add(key);
        anyMatch = true;
      }
    }
    return anyMatch;
  }

  for (const item of data.items) {
    if (item.isHidden) {
      continue;
    }
    const nameMatch = item.name.toLowerCase().includes(lower);
    const idMatch = item.id.toLowerCase().includes(lower);
    const elemMatch = walkElems(item.elements, item.id, []);
    if (nameMatch || idMatch || elemMatch) {
      paramIds.add(item.id);
    }
  }

  return {elementIds, paramIds};
}
