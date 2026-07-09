/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto} from '~entities/spf-module-data';

import type {TreeViewData} from '../model/tree-view-data';

import {elementKey} from './element-key';

function seedFromElements(
  elems: AnyElementDto[],
  itemId: string,
  pathPrefix: string[],
  elementValues: Map<string, string>,
  arrayCounts: Map<string, number>,
): void {
  for (const elem of elems) {
    if (elem.type === 'CONFIG_ELEMENT') {
      const key = elementKey(itemId, ...pathPrefix, elem.name);
      elementValues.set(key, elem.value);
    } else if (elem.type === 'STRUCT') {
      seedFromElements(
        elem.value,
        itemId,
        [...pathPrefix, elem.name],
        elementValues,
        arrayCounts,
      );
    } else if (elem.type === 'ELEMENT_TEMPLATE_ARRAY') {
      const arrayPath = elementKey(itemId, ...pathPrefix, elem.name);
      arrayCounts.set(arrayPath, elem.value.length);
      for (const inst of elem.value) {
        const instPrefix =
          inst.type === 'STRUCT' ? [...pathPrefix, inst.name] : [...pathPrefix];
        if (inst.type === 'STRUCT') {
          seedFromElements(
            inst.value,
            itemId,
            instPrefix,
            elementValues,
            arrayCounts,
          );
        } else if (inst.type === 'CONFIG_ELEMENT') {
          const key = elementKey(itemId, ...pathPrefix, inst.name);
          elementValues.set(key, inst.value);
        }
      }
    }
  }
}

export function seedFromData(data: TreeViewData): {
  arrayCounts: Map<string, number>;
  elementValues: Map<string, string>;
} {
  const elementValues = new Map<string, string>();
  const arrayCounts = new Map<string, number>();
  for (const item of data.items) {
    seedFromElements(item.elements, item.id, [], elementValues, arrayCounts);
  }
  return {arrayCounts, elementValues};
}
