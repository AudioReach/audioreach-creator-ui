/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {AnyElementDto, ConfigElementDto} from '~entities/spf-module-data';

import {elementKey} from './element-key';

/**
 * Walk the element tree for a TreeViewItem and return the ConfigElementDto
 * whose elementKey matches the given key, or null if not found.
 */
export function findElementByKey(
  elems: AnyElementDto[],
  itemId: string,
  prefix: Array<string | undefined>,
  targetKey: string,
): ConfigElementDto | null {
  for (const elem of elems) {
    if (elem.type === 'ConfigElement') {
      if (elementKey(itemId, ...prefix, elem.name) === targetKey) {
        return elem;
      }
    } else if (elem.type === 'Struct') {
      const found = findElementByKey(
        elem.value,
        itemId,
        [...prefix, elem.name],
        targetKey,
      );
      if (found) {
        return found;
      }
    } else if (elem.type === 'ElementTemplateArray') {
      for (const inst of elem.value) {
        if (inst.type === 'Struct') {
          const found = findElementByKey(
            inst.value,
            itemId,
            [...prefix, inst.name],
            targetKey,
          );
          if (found) {
            return found;
          }
        } else if (inst.type === 'ConfigElement') {
          if (elementKey(itemId, ...prefix, inst.name) === targetKey) {
            return inst;
          }
        }
      }
    }
  }
  return null;
}
