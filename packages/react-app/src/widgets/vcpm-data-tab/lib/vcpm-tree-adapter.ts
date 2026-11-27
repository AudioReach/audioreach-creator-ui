/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';

import type {
  UpdateVcpmCalDataRequestDto,
  VcpmParameterCalDataDto,
} from '~entities/vcpm';

export function vcpmCalDataToTreeViewData(
  parameters: VcpmParameterCalDataDto[],
  systemId: string,
): TreeViewData {
  return {
    items: parameters.map((parameter) => ({
      elements: parameter.elements,
      id: parameter.systemId,
      name: parameter.name,
    })),
    systemId,
  };
}

export function dirtyItemsToVcpmUpdateRequests(
  dirtyItems: TreeViewItem[],
): UpdateVcpmCalDataRequestDto[] {
  return dirtyItems.map((item) => ({
    elements: item.elements,
    name: item.name,
    systemId: item.id,
  }));
}
