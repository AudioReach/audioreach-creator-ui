/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type AnyElementDto,
  getArrayValueElements,
  getStructValueElements,
} from '~entities/spf-module-data';

import {elementKey} from './element-key';

/**
 * Recursively patch elements with updated values from elementValues / arrayCounts.
 */
export function patchElements(
  elems: AnyElementDto[],
  itemId: string,
  prefix: Array<string | undefined>,
  elementValues: Map<string, string>,
  arrayCounts: Map<string, number>,
): AnyElementDto[] {
  return elems.map((elem) => {
    if (elem.type === 'ConfigElement') {
      const key = elementKey(itemId, ...prefix, elem.name);
      const newValue = elementValues.get(key) ?? elem.value;
      return newValue !== elem.value ? {...elem, value: newValue} : elem;
    }
    if (elem.type === 'Struct') {
      const valueElements = getStructValueElements(elem);
      const patched = patchElements(
        valueElements,
        itemId,
        [...prefix, elem.name],
        elementValues,
        arrayCounts,
      );
      return patched.every((p, i) => p === valueElements[i])
        ? elem
        : {...elem, value: patched};
    }
    if (elem.type === 'ElementTemplateArray') {
      const arrayPath = elementKey(itemId, ...prefix, elem.name);
      const valueElements = getArrayValueElements(elem);
      const count = arrayCounts.get(arrayPath) ?? valueElements.length;
      const instances = valueElements.slice(0, count).map((inst) => {
        if (inst.type === 'Struct') {
          const instValueElements = getStructValueElements(inst);
          const patched = patchElements(
            instValueElements,
            itemId,
            [...prefix, inst.name],
            elementValues,
            arrayCounts,
          );
          return patched.every((p, i) => p === instValueElements[i])
            ? inst
            : {...inst, value: patched};
        }
        if (inst.type === 'ConfigElement') {
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
