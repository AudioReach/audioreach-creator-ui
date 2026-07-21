/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  AnyElementDto,
  CalDataDto,
  ConfigElementDto,
  ParameterDetailDto,
  StructDto,
  UpdateSpfModuleCalDataRequest,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';

import {
  dirtyItemsToParamUpdateRequest,
  paramContainerToTreeViewData,
} from './param-tree-view-adapter';

export function calDataDtoToTreeViewData(
  dto: CalDataDto,
  source?: 'get' | 'set',
): TreeViewData {
  return paramContainerToTreeViewData(dto, source);
}

export function dirtyItemsToCalDataRequest(
  dirtyItems: TreeViewItem[],
  originalDto: CalDataDto,
): UpdateSpfModuleCalDataRequest {
  return dirtyItemsToParamUpdateRequest(dirtyItems, originalDto.parameters);
}

function isConfigElement(el: AnyElementDto): el is ConfigElementDto {
  return el.type === 'CONFIG_ELEMENT';
}

export function buildGroupedTreeViewData(
  params: ParameterDetailDto[],
  systemId: string,
): TreeViewData {
  const groupOrder = new Set<string>();
  const subgroupOrderByGroup = new Map<string, Set<string>>();
  const ungroupedElementsByGroup = new Map<string, ConfigElementDto[]>();
  const elementsByGroupAndSubgroup = new Map<string, ConfigElementDto[]>();

  for (const param of params) {
    for (const el of param.elements) {
      if (!isConfigElement(el) || !el.group) {
        continue;
      }

      groupOrder.add(el.group);

      if (!el.subgroup) {
        const existing = ungroupedElementsByGroup.get(el.group) ?? [];
        existing.push(el);
        ungroupedElementsByGroup.set(el.group, existing);
        continue;
      }

      const subgroupOrder = subgroupOrderByGroup.get(el.group) ?? new Set();
      subgroupOrder.add(el.subgroup);
      subgroupOrderByGroup.set(el.group, subgroupOrder);

      const key = `${el.group} ${el.subgroup}`;
      const existing = elementsByGroupAndSubgroup.get(key) ?? [];
      existing.push(el);
      elementsByGroupAndSubgroup.set(key, existing);
    }
  }

  const items: TreeViewItem[] = [...groupOrder].map((group) => {
    const structs: StructDto[] = [
      ...(subgroupOrderByGroup.get(group) ?? []),
    ].map((subgroup) => ({
      isReadOnly: false,
      name: subgroup,
      structType: subgroup,
      type: 'STRUCT',
      value: elementsByGroupAndSubgroup.get(`${group} ${subgroup}`) ?? [],
    }));

    return {
      elements: [...(ungroupedElementsByGroup.get(group) ?? []), ...structs],
      id: group,
      name: group,
    };
  });

  return {items, systemId};
}
