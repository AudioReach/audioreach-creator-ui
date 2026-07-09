/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto} from '~entities/spf-module-data';

import type {TreeViewItem} from '../model/tree-view-data';

import {elementKey} from './element-key';

export function buildLengthFormulaMap(
  items: TreeViewItem[],
): Map<
  string,
  {arrayName: string; arrayPath: string; template: AnyElementDto[]}[]
> {
  const map = new Map<
    string,
    {arrayName: string; arrayPath: string; template: AnyElementDto[]}[]
  >();

  function walk(elems: AnyElementDto[], itemId: string, prefix: string[]) {
    for (const elem of elems) {
      if (elem.type === 'ELEMENT_TEMPLATE_ARRAY' && elem.lengthFormula) {
        const controllerName = elem.lengthFormula;
        const controllerPath = elementKey(itemId, ...prefix, controllerName);
        const arrayPath = elementKey(itemId, ...prefix, elem.name);
        const existing = map.get(controllerPath) ?? [];
        map.set(controllerPath, [
          ...existing,
          {arrayName: elem.name, arrayPath, template: elem.template},
        ]);
      }
      if (elem.type === 'STRUCT') {
        walk(elem.value, itemId, [...prefix, elem.name]);
      }
      if (elem.type === 'ELEMENT_TEMPLATE_ARRAY') {
        for (const inst of elem.value) {
          if (inst.type === 'STRUCT') {
            walk(inst.value, itemId, [...prefix, inst.name]);
          }
        }
      }
    }
  }

  for (const item of items) {
    walk(item.elements, item.id, []);
  }
  return map;
}
