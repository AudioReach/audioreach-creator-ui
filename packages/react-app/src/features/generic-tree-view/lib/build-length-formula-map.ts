/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  type AnyElementDto,
  getArrayTemplateElements,
  getArrayValueElements,
  getStructValueElements,
} from '~entities/spf-module-data';

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

  function walk(
    elems: AnyElementDto[],
    itemId: string,
    prefix: Array<string | undefined>,
  ) {
    for (const elem of elems) {
      if (elem.type === 'ElementTemplateArray' && elem.lengthFormula) {
        const controllerName = elem.lengthFormula;
        const controllerPath = elementKey(itemId, ...prefix, controllerName);
        const arrayPath = elementKey(itemId, ...prefix, elem.name);
        const existing = map.get(controllerPath) ?? [];
        map.set(controllerPath, [
          ...existing,
          {
            arrayName: elem.name ?? '',
            arrayPath,
            template: getArrayTemplateElements(elem),
          },
        ]);
      }
      if (elem.type === 'Struct') {
        walk(getStructValueElements(elem), itemId, [...prefix, elem.name]);
      }
      if (elem.type === 'ElementTemplateArray') {
        for (const inst of getArrayValueElements(elem)) {
          if (inst.type === 'Struct') {
            walk(getStructValueElements(inst), itemId, [...prefix, inst.name]);
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
