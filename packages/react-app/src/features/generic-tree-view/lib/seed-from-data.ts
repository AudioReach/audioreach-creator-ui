/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type AnyElementDto,
  getArrayValueElements,
  getStructValueElements,
} from '~entities/spf-module-data';

import type {TreeViewData} from '../model/tree-view-data';

import {elementKey} from './element-key';

function seedFromElements(
  elems: AnyElementDto[],
  itemId: string,
  pathPrefix: Array<string | undefined>,
  elementValues: Map<string, string>,
  arrayCounts: Map<string, number>,
): void {
  for (const elem of elems) {
    if (elem.type === 'ConfigElement') {
      const key = elementKey(itemId, ...pathPrefix, elem.name);
      elementValues.set(key, elem.value);
    } else if (elem.type === 'Struct') {
      seedFromElements(
        getStructValueElements(elem),
        itemId,
        [...pathPrefix, elem.name],
        elementValues,
        arrayCounts,
      );
    } else if (elem.type === 'ElementTemplateArray') {
      const arrayPath = elementKey(itemId, ...pathPrefix, elem.name);
      const valueElements = getArrayValueElements(elem);
      arrayCounts.set(arrayPath, valueElements.length);
      for (const inst of valueElements) {
        const instPrefix =
          inst.type === 'Struct' ? [...pathPrefix, inst.name] : [...pathPrefix];
        if (inst.type === 'Struct') {
          seedFromElements(
            getStructValueElements(inst),
            itemId,
            instPrefix,
            elementValues,
            arrayCounts,
          );
        } else if (inst.type === 'ConfigElement') {
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
