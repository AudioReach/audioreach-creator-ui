/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto} from '~entities/spf-module-data';

import {elementKey} from './element-key';

/**
 * Recursively patch elements with updated values from elementValues / arrayCounts.
 */
export function patchElements(
  elems: AnyElementDto[],
  itemId: string,
  prefix: string[],
  elementValues: Map<string, string>,
  arrayCounts: Map<string, number>,
): AnyElementDto[] {
  return elems.map((elem) => {
    if (elem.type === 'CONFIG_ELEMENT') {
      const key = elementKey(itemId, ...prefix, elem.name);
      const newValue = elementValues.get(key) ?? elem.value;
      return newValue !== elem.value ? {...elem, value: newValue} : elem;
    }
    if (elem.type === 'STRUCT') {
      const patched = patchElements(
        elem.value,
        itemId,
        [...prefix, elem.name],
        elementValues,
        arrayCounts,
      );
      return patched.every((p, i) => p === elem.value[i])
        ? elem
        : {...elem, value: patched};
    }
    if (elem.type === 'ELEMENT_TEMPLATE_ARRAY') {
      const arrayPath = elementKey(itemId, ...prefix, elem.name);
      const count = arrayCounts.get(arrayPath) ?? elem.value.length;
      const instances = elem.value.slice(0, count).map((inst) => {
        if (inst.type === 'STRUCT') {
          const patched = patchElements(
            inst.value,
            itemId,
            [...prefix, inst.name],
            elementValues,
            arrayCounts,
          );
          return patched.every((p, i) => p === inst.value[i])
            ? inst
            : {...inst, value: patched};
        }
        if (inst.type === 'CONFIG_ELEMENT') {
          const key = elementKey(itemId, ...prefix, inst.name);
          const newValue = elementValues.get(key) ?? inst.value;
          return newValue !== inst.value ? {...inst, value: newValue} : inst;
        }
        return inst;
      });
      return {...elem, value: instances};
    }
    return elem;
  });
}
