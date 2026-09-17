/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import type {
  ChangeInfoDto,
  ParameterDetailDto,
} from '~entities/spf-module-data';
import type {TreeViewData, TreeViewItem} from '~features/generic-tree-view';

interface ParamContainerDto {
  changeInfo: ChangeInfoDto;
  parameters: ParameterDetailDto[];
  systemId: string;
}

interface ParamUpdateRequest {
  data: ParameterDetailDto[];
}

function paramToTreeViewItem(param: ParameterDetailDto): TreeViewItem {
  return {
    deprecated: param.deprecated,
    description: param.description,
    elements: param.elements,
    id: param.naturalId,
    isHidden: param.isHidden,
    isNeuralNet: param.isNeuralNet,
    isOffloaded: param.isOffloaded,
    isReadOnly: param.isReadOnly,
    name: param.name,
  };
}

export function paramContainerToTreeViewData(
  dto: ParamContainerDto,
  source?: 'get' | 'set',
): TreeViewData {
  return {
    changeInfo: dto.changeInfo,
    items: dto.parameters.map(paramToTreeViewItem),
    source,
    systemId: dto.systemId,
  };
}

export function dirtyItemsToParamUpdateRequest(
  dirtyItems: TreeViewItem[],
  originalParams: ParameterDetailDto[],
): ParamUpdateRequest {
  const byId = new Map(originalParams.map((p) => [p.naturalId, p]));
  return {
    data: dirtyItems.map((item) => {
      const original = byId.get(item.id);
      return {
        systemId: item.id,
        ...original,
        elements: item.elements,
        name: item.name,
        naturalId: item.id,
      };
    }),
  };
}
